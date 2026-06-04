/**
 * Patient/admin notification thresholds (does not alter risk engine scores).
 *
 * NORMAL:     0–49   — dashboard only
 * WATCHLIST:  50–74  — monitoring only, no notifications
 * HIGH RISK:  75–89  — patient high-risk notification
 * CRITICAL:   90–100 — patient critical + admin + MCP escalation
 *
 * Clinical exceptions can escalate to CRITICAL below score 75.
 */

const { detectEmergencySigns, detectWarningSigns } = require("./patientMonitoringService");

const TIERS = {
  NORMAL: "NORMAL",
  WATCHLIST: "WATCHLIST",
  HIGH_RISK: "HIGH_RISK",
  CRITICAL: "CRITICAL",
};

const SCORE = {
  WATCHLIST_MIN: 50,
  HIGH_RISK_MIN: 75,
  CRITICAL_MIN: 90,
};

const normalizeSymptoms = (symptoms = []) =>
  (symptoms || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean);

/**
 * Score band for display/monitoring (risk engine output unchanged).
 */
const getScoreTier = (riskScore) => {
  const score = Number(riskScore || 0);
  if (score >= SCORE.CRITICAL_MIN) return TIERS.CRITICAL;
  if (score >= SCORE.HIGH_RISK_MIN) return TIERS.HIGH_RISK;
  if (score >= SCORE.WATCHLIST_MIN) return TIERS.WATCHLIST;
  return TIERS.NORMAL;
};

/**
 * Clinical exceptions that escalate to CRITICAL notifications even when score < 75.
 */
const getClinicalExceptions = (record = {}) => {
  const symptoms = normalizeSymptoms(record.symptoms);
  const graphSignals = record.computed?.graphSignals || {};
  const warningSigns = detectWarningSigns(
    symptoms,
    graphSignals,
    record.temperature
  );
  const emergency = detectEmergencySigns(symptoms, graphSignals);

  const bleeding = symptoms.includes("bleeding");
  const whoEmergency = emergency.hasEmergency;
  const severeWarningCombo =
    warningSigns.length >= 3 ||
    (symptoms.includes("bleeding") && symptoms.includes("restlessness"));

  const reasons = [];
  if (bleeding) reasons.push("Active bleeding reported");
  if (whoEmergency) reasons.push(...(emergency.reasons || []));
  if (severeWarningCombo) reasons.push("Severe WHO warning sign combination");

  return {
    bleeding,
    whoEmergency,
    severeWarningCombo,
    warningSigns,
    hasException: bleeding || whoEmergency || severeWarningCombo,
    reasons,
  };
};

/**
 * Resolve patient notification level from score + clinical exceptions + agent outcome.
 */
const resolvePatientNotificationPolicy = ({
  record,
  agentClassification = null,
}) => {
  const riskScore = Number(record?.computed?.riskScore || 0);
  const scoreTier = getScoreTier(riskScore);
  const clinical = getClinicalExceptions(record);
  const agentCritical = String(agentClassification || "").toLowerCase() === "critical";

  if (clinical.hasException) {
    // CRITICAL: notify patient + admin + MCP (e.g. bleeding at score 54)
    return {
      tier: TIERS.CRITICAL,
      patientLevel: "CRITICAL",
      shouldNotifyPatient: true,
      shouldNotifyAdmin: true,
      escalateMcp: true,
      reasons: [
        ...clinical.reasons,
        agentCritical ? "MCP agent classified patient as CRITICAL" : null,
      ].filter(Boolean),
    };
  }

  if (agentCritical && riskScore < SCORE.HIGH_RISK_MIN) {
    // CRITICAL: MCP escalation below 75 (e.g. consecutive risk trend)
    return {
      tier: TIERS.CRITICAL,
      patientLevel: "CRITICAL",
      shouldNotifyPatient: true,
      shouldNotifyAdmin: true,
      escalateMcp: true,
      reasons: ["MCP agent classified patient as CRITICAL"],
    };
  }

  if (riskScore >= SCORE.CRITICAL_MIN) {
    // CRITICAL: notify patient + admin + MCP
    return {
      tier: TIERS.CRITICAL,
      patientLevel: "CRITICAL",
      shouldNotifyPatient: true,
      shouldNotifyAdmin: true,
      escalateMcp: true,
      reasons: [`Risk score ${riskScore} ≥ ${SCORE.CRITICAL_MIN}`],
    };
  }

  if (riskScore >= SCORE.HIGH_RISK_MIN) {
    // HIGH RISK: notify patient only
    return {
      tier: TIERS.HIGH_RISK,
      patientLevel: "HIGH_RISK",
      shouldNotifyPatient: true,
      shouldNotifyAdmin: false,
      escalateMcp: false,
      reasons: [`Risk score ${riskScore} in high-risk band (${SCORE.HIGH_RISK_MIN}–89)`],
    };
  }

  // WATCHLIST: monitoring only — no patient or admin notifications
  return {
    tier: scoreTier,
    patientLevel: null,
    shouldNotifyPatient: false,
    shouldNotifyAdmin: false,
    escalateMcp: false,
    reasons: [`Risk score ${riskScore} < ${SCORE.HIGH_RISK_MIN} — dashboard monitoring only`],
  };
};

/**
 * Admin notification policy (care team / dashboard alerts).
 */
const resolveAdminNotificationPolicy = ({ record, agentClassification = null }) => {
  const patientPolicy = resolvePatientNotificationPolicy({ record, agentClassification });
  if (!patientPolicy.shouldNotifyAdmin) {
    return { shouldNotify: false, level: null, reasons: patientPolicy.reasons };
  }
  return {
    shouldNotify: true,
    level: "CRITICAL",
    reasons: patientPolicy.reasons,
  };
};

module.exports = {
  TIERS,
  SCORE,
  getScoreTier,
  getClinicalExceptions,
  resolvePatientNotificationPolicy,
  resolveAdminNotificationPolicy,
};
