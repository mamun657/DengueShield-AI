const HIGH_RISK_MIN = 75;
const CRITICAL_MIN = 90;

const normalizeSymptoms = (symptoms = []) =>
  (symptoms || []).map((symptom) => String(symptom).toLowerCase().trim()).filter(Boolean);

const getClinicalExceptions = (record = {}) => {
  const symptoms = normalizeSymptoms(record.symptoms);
  const bleeding = symptoms.includes("bleeding");
  const whoEmergency =
    symptoms.includes("bleeding") && symptoms.includes("restlessness");
  const severeWarningCombo =
    symptoms.filter((symptom) =>
      ["bleeding", "restlessness", "vomiting", "abdominal pain", "rash"].includes(symptom)
    ).length >= 3 ||
    (symptoms.includes("bleeding") && symptoms.includes("restlessness"));

  return {
    hasException: bleeding || whoEmergency || severeWarningCombo,
    reasons: [
      bleeding ? "Active bleeding reported" : null,
      whoEmergency ? "Bleeding combined with restlessness" : null,
      severeWarningCombo ? "Severe WHO warning sign combination" : null,
    ].filter(Boolean),
  };
};

export const resolveLocalRiskAlertLevel = (record) => {
  const riskScore = Number(record?.computed?.riskScore || 0);
  const clinical = getClinicalExceptions(record);

  if (clinical.hasException || riskScore >= CRITICAL_MIN) {
    return "CRITICAL";
  }
  if (riskScore >= HIGH_RISK_MIN) {
    return "HIGH_RISK";
  }
  return null;
};

export const buildLocalRiskAlert = (record) => {
  const level = resolveLocalRiskAlertLevel(record);
  if (!level) return null;

  const riskScore = Number(record?.computed?.riskScore || 0);
  const recordId = record?._id || record?.localId || record?.serverId;
  const isCritical = level === "CRITICAL";

  return {
    _id: `local-risk-${recordId}-${level}`,
    type: isCritical ? "patient_critical_alert" : "patient_risk_warning",
    title: isCritical ? "🚨 Critical Dengue Risk Detected" : "⚠ High Dengue Risk Detected",
    body: isCritical
      ? "Your symptoms indicate a critical dengue risk. Please seek medical attention immediately."
      : "Your recent symptoms indicate increasing dengue risk. Please monitor symptoms closely and seek medical attention if symptoms worsen.",
    read: false,
    metadata: {
      riskScore,
      notificationLevel: level,
      recordId,
      source: "local_risk_engine",
    },
    createdAt: new Date().toISOString(),
  };
};

export const isRiskAlertNotification = (notification) =>
  ["patient_critical_alert", "patient_risk_warning"].includes(notification?.type);
