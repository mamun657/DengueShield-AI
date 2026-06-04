const HealthRecord = require("../models/HealthRecord");

/** WHO-aligned warning sign symptom keys (existing HealthRecord.symptoms vocabulary). */
const WHO_WARNING_SYMPTOM_KEYS = [
  "bleeding",
  "restlessness",
  "vomiting",
  "abdominal pain",
  "rash",
];

const PERSISTENT_FEVER_THRESHOLD_C = 38.5;

const normalizeSymptoms = (symptoms = []) =>
  (symptoms || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean);

/**
 * OBSERVATION: Load recent patient records and assemble monitoring context.
 * Uses existing HealthRecord storage only — no duplicate patient data.
 */
const fetchPatientMonitoringContext = async (patientId, currentRecord) => {
  const history = await HealthRecord.find({ user: patientId })
    .sort({ date: -1 })
    .limit(14)
    .lean();

  const ordered = [...history].reverse();
  const current =
    currentRecord?.toObject?.() ||
    currentRecord ||
    ordered[ordered.length - 1] ||
    null;

  return {
    current,
    history: ordered,
    previous: ordered.length >= 2 ? ordered[ordered.length - 2] : null,
  };
};

/**
 * OBSERVATION: Build chronological risk trend from stored computed scores.
 */
const buildRiskTrend = (records = []) =>
  records
    .map((record) => ({
      dayOfIllness: Number(record.dayOfIllness || 0),
      riskScore: Number(record.computed?.riskScore ?? 0),
      date: record.date || record.createdAt,
      symptoms: normalizeSymptoms(record.symptoms),
    }))
    .filter((entry) => Number.isFinite(entry.riskScore));

/**
 * OBSERVATION: Extract WHO warning signs from symptom list and graph signals.
 */
const detectWarningSigns = (symptoms = [], graphSignals = {}, temperature = 0) => {
  const normalized = normalizeSymptoms(symptoms);
  const detected = WHO_WARNING_SYMPTOM_KEYS.filter((key) => normalized.includes(key));

  if (Number(temperature) >= PERSISTENT_FEVER_THRESHOLD_C && !detected.includes("persistent fever")) {
    detected.push("persistent fever");
  }

  const graphMatched = graphSignals?.whoGuidance?.matched || [];
  if (graphMatched.includes("warning_sign") && !detected.includes("WHO warning sign (graph)")) {
    detected.push("WHO warning sign (graph)");
  }
  if (graphMatched.includes("emergency_sign") && !detected.includes("WHO emergency sign (graph)")) {
    detected.push("WHO emergency sign (graph)");
  }

  return detected;
};

/**
 * REASONING: Determine if risk scores increased for N consecutive days/entries.
 */
const hasConsecutiveRiskIncrease = (trend = [], consecutiveDays = 3) => {
  if (trend.length < consecutiveDays) return false;
  const recent = trend.slice(-consecutiveDays);
  for (let i = 1; i < recent.length; i += 1) {
    if (recent[i].riskScore <= recent[i - 1].riskScore) return false;
  }
  return true;
};

/**
 * REASONING: Classify overall trend direction from recent scores.
 */
const classifyTrendDirection = (trend = []) => {
  if (trend.length < 2) return "insufficient_data";
  const recent = trend.slice(-3);
  const first = recent[0].riskScore;
  const last = recent[recent.length - 1].riskScore;
  if (last > first + 5) return "increasing";
  if (last < first - 5) return "decreasing";
  return "stable";
};

/**
 * REASONING: Detect WHO emergency criteria from symptoms and graph pathways.
 */
const detectEmergencySigns = (symptoms = [], graphSignals = {}) => {
  const normalized = normalizeSymptoms(symptoms);
  const graphEmergency = (graphSignals?.whoGuidance?.matched || []).includes("emergency_sign");
  const bleedingRestlessness =
    normalized.includes("bleeding") && normalized.includes("restlessness");

  const reasons = [];
  if (graphEmergency) reasons.push("WHO emergency sign detected (clinical graph)");
  if (bleedingRestlessness) reasons.push("Bleeding combined with restlessness");

  return {
    hasEmergency: graphEmergency || bleedingRestlessness,
    reasons,
  };
};

/**
 * REASONING: Mild symptom progression — more warning signs than prior entry.
 */
const hasMildSymptomProgression = (currentSymptoms = [], previousSymptoms = []) => {
  const currentWarnings = detectWarningSigns(currentSymptoms);
  const previousWarnings = detectWarningSigns(previousSymptoms);
  return currentWarnings.length > previousWarnings.length;
};

module.exports = {
  WHO_WARNING_SYMPTOM_KEYS,
  fetchPatientMonitoringContext,
  buildRiskTrend,
  detectWarningSigns,
  hasConsecutiveRiskIncrease,
  classifyTrendDirection,
  detectEmergencySigns,
  hasMildSymptomProgression,
  normalizeSymptoms,
};
