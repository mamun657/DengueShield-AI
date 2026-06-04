const CriticalAlert = require("../models/CriticalAlert");
const User = require("../models/User");
const {
  fetchPatientMonitoringContext,
  buildRiskTrend,
  detectWarningSigns,
  hasConsecutiveRiskIncrease,
  classifyTrendDirection,
  detectEmergencySigns,
  hasMildSymptomProgression,
} = require("../services/patientMonitoringService");
const {
  notifyAdminCriticalPatient,
  notifyPatientCritical,
  notifyPatientHighRisk,
  resolveDefaultAdmin,
} = require("../services/notificationDeliveryService");
const { resolvePatientNotificationPolicy } = require("../services/notificationPolicyService");
const { getOrCreateConversation } = require("../services/messagingService");

const CLASSIFICATION = {
  NORMAL: "normal",
  WATCHLIST: "watchlist",
  CRITICAL: "critical",
};

const RECOMMENDED_ACTIONS = {
  [CLASSIFICATION.NORMAL]: "Continue daily symptom monitoring.",
  [CLASSIFICATION.WATCHLIST]: "Increase monitoring frequency; schedule clinical review within 24 hours.",
  [CLASSIFICATION.CRITICAL]: "Immediate Clinical Follow-up",
};

/**
 * REASONING + DECISION: Apply agent rules on top of existing risk engine output.
 * Does not recalculate risk — consumes record.computed.riskScore only.
 */
const decideClassification = ({
  riskScore,
  warningSigns,
  trend,
  emergency,
  previousSymptoms,
  currentSymptoms,
}) => {
  const reasons = [];
  const score = Number(riskScore || 0);

  if (score >= 80) {
    reasons.push(`Risk score ${score} ≥ 80`);
  }
  if (hasConsecutiveRiskIncrease(trend, 3)) {
    reasons.push("Risk increased for 3 consecutive monitoring entries");
  }
  if (emergency.hasEmergency) {
    reasons.push(...emergency.reasons);
  }
  if (warningSigns.length >= 3) {
    reasons.push(`Multiple WHO warning signs (${warningSigns.length})`);
  }

  const isCritical =
    score >= 80 ||
    hasConsecutiveRiskIncrease(trend, 3) ||
    emergency.hasEmergency ||
    warningSigns.length >= 3;

  if (isCritical) {
    return { classification: CLASSIFICATION.CRITICAL, reasons };
  }

  const mildProgression = hasMildSymptomProgression(currentSymptoms, previousSymptoms);
  const isWatchlist = (score >= 50 && score <= 79) || mildProgression;

  if (isWatchlist) {
    if (score >= 50 && score <= 79) reasons.push(`Risk score ${score} in watchlist band (50–79)`);
    if (mildProgression) reasons.push("Mild symptom progression detected");
    return { classification: CLASSIFICATION.WATCHLIST, reasons };
  }

  const isNormal = score < 50 && warningSigns.length === 0;
  if (isNormal) {
    reasons.push(`Risk score ${score} < 50 with no major warning signs`);
    return { classification: CLASSIFICATION.NORMAL, reasons };
  }

  reasons.push("Default watchlist: elevated signs without critical threshold");
  return { classification: CLASSIFICATION.WATCHLIST, reasons };
};

/**
 * ACTION: Persist critical alert and dispatch admin + patient notifications.
 */
const executeCriticalActions = async ({
  patient,
  record,
  riskScore,
  warningSigns,
  riskTrend,
  decisionReasons,
  io,
}) => {
  const alertDoc = await CriticalAlert.create({
    type: "critical_patient",
    patientId: patient._id,
    healthRecordId: record._id,
    riskScore,
    classification: CLASSIFICATION.CRITICAL,
    status: "critical",
    warningSigns,
    riskTrend,
    recommendedAction: RECOMMENDED_ACTIONS[CLASSIFICATION.CRITICAL],
    decisionReasons,
    resolved: false,
  });

  const admin = await resolveDefaultAdmin();
  let conversation = null;
  if (admin) {
    conversation = await getOrCreateConversation(patient._id, admin._id);
    await notifyAdminCriticalPatient({
      adminId: admin._id,
      patient,
      alertDoc,
      conversationId: conversation._id,
      io,
    });
  }

  // CRITICAL: notify patient + admin (care team channel linked on critical alerts)
  await notifyPatientCritical({
    patientId: patient._id,
    record,
    alertDoc,
    io,
    conversationId: conversation?._id || null,
  });

  console.log(
    "[CriticalPatientAgent] ACTION: critical alert",
    alertDoc._id,
    "patient",
    patient._id,
    "risk",
    riskScore
  );

  return alertDoc;
};

/**
 * Critical Patient Agent — Observe → Reason → Decide → Act
 * Invoked after the existing risk engine persists a new HealthRecord.
 */
const runCriticalPatientAgent = async (record, io = null) => {
  if (!record?.user || !record?.computed) return null;

  try {
    // OBSERVATION:
    // Retrieved latest patient symptoms and risk history from existing HealthRecord data.
    const patient = await User.findById(record.user).select("name email role");
    if (!patient || patient.role === "admin") return null;

    const context = await fetchPatientMonitoringContext(patient._id, record);
    const riskTrend = buildRiskTrend(context.history);
    const currentSymptoms = record.symptoms || [];
    const previousSymptoms = context.previous?.symptoms || [];
    const graphSignals = record.computed?.graphSignals || {};

    const warningSigns = detectWarningSigns(
      currentSymptoms,
      graphSignals,
      record.temperature
    );
    const riskScore = Number(record.computed.riskScore || 0);
    const emergency = detectEmergencySigns(currentSymptoms, graphSignals);
    const trendDirection = classifyTrendDirection(riskTrend);

    // REASONING:
    // Trend analysis and WHO warning sign evaluation on top of stored risk scores.
    const trendSummary =
      riskTrend.length >= 2
        ? riskTrend.map((t) => t.riskScore).join(" → ")
        : String(riskScore);
    console.log("[CriticalPatientAgent] REASONING:", {
      patientId: patient._id,
      riskScore,
      trendDirection,
      trendSummary,
      warningSigns,
      emergency: emergency.hasEmergency,
    });

    // DECISION:
    // Classify monitoring state without altering risk engine output.
    const { classification, reasons: decisionReasons } = decideClassification({
      riskScore,
      warningSigns,
      trend: riskTrend,
      emergency,
      previousSymptoms,
      currentSymptoms,
    });

    console.log("[CriticalPatientAgent] DECISION:", classification, decisionReasons);

    const notifyPolicy = resolvePatientNotificationPolicy({
      record,
      agentClassification: classification,
    });

    console.log("[CriticalPatientAgent] NOTIFICATION POLICY:", notifyPolicy);

    // WATCHLIST: monitoring only — no patient or admin notifications.
    if (!notifyPolicy.shouldNotifyPatient && !notifyPolicy.escalateMcp) {
      return {
        classification,
        alert: null,
        riskTrend,
        warningSigns,
        trendDirection,
        decisionReasons,
        notifyPolicy,
      };
    }

    // HIGH RISK: notify patient only (score 75–89, no MCP/admin escalation).
    if (notifyPolicy.patientLevel === "HIGH_RISK") {
      await notifyPatientHighRisk({ patientId: patient._id, record, io });
      return {
        classification,
        alert: null,
        riskTrend,
        warningSigns,
        trendDirection,
        decisionReasons,
        notifyPolicy,
      };
    }

    // CRITICAL: notify patient + admin + MCP escalation (score ≥ 90 or clinical/MCP exception).
    if (notifyPolicy.escalateMcp) {
      const alertDoc = await executeCriticalActions({
        patient,
        record,
        riskScore,
        warningSigns,
        riskTrend,
        decisionReasons: [...decisionReasons, ...notifyPolicy.reasons],
        io,
      });

      return {
        classification,
        alert: alertDoc,
        riskTrend,
        warningSigns,
        trendDirection,
        decisionReasons,
        notifyPolicy,
      };
    }

    return {
      classification,
      alert: null,
      riskTrend,
      warningSigns,
      trendDirection,
      decisionReasons,
      notifyPolicy,
    };
  } catch (error) {
    console.warn("[CriticalPatientAgent] run failed:", error.message);
    return null;
  }
};

module.exports = {
  runCriticalPatientAgent,
  CLASSIFICATION,
  decideClassification,
};
