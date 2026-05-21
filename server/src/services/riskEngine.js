const MEDICAL_DISCLAIMER =
  "This AI system provides early clinical risk estimation and does not replace licensed medical diagnosis.";

const SYMPTOM_ONLY_MAX = 85;
const LAB_CRITICAL_MIN = 90;

const warningSigns = [
  "vomiting",
  "abdominal pain",
  "bleeding",
  "restlessness",
  "appetite loss",
];

const symptomFactorMap = {
  "abdominal pain": "abdominal pain → WHO warning sign",
  vomiting: "vomiting → dehydration pathway",
  bleeding: "bleeding → emergency sign pattern",
  headache: "headache → monitored symptom",
  fatigue: "fatigue → monitored symptom",
  rash: "rash → monitored symptom",
  "eye pain": "eye pain → monitored symptom",
  restlessness: "restlessness → WHO warning sign",
  "appetite loss": "appetite loss → WHO warning sign",
  "body pain": "body pain → monitored symptom",
  fever_drop: "fever drop → possible critical phase transition",
};

const normalizeRiskScore = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const detectLabEvidence = (current = {}, mlResult = null) => {
  const lab = current.labData || current.labs || mlResult?.lab_data || mlResult?.labs || {};
  const plateletRaw = lab.plateletCount ?? lab.platelet_count ?? lab.platelets;
  const platelet = Number(plateletRaw);
  const hasPlatelet = Number.isFinite(platelet) && platelet > 0;
  const cbcAvailable = Boolean(lab.cbcAvailable ?? lab.cbc_available ?? hasPlatelet);
  const severeBleeding = Boolean(
    lab.severeBleeding ?? lab.severe_bleeding ?? (current.symptoms || []).includes("bleeding")
  );
  const systolic = Number(lab.systolicBP ?? lab.systolic_bp ?? lab.bloodPressureSystolic);
  const hypotension = Boolean(lab.hypotension ?? (Number.isFinite(systolic) && systolic < 90));
  const spo2 = Number(lab.oxygenSaturation ?? lab.oxygen_saturation ?? lab.spo2);
  const vitalInstability = Boolean(
    lab.vitalInstability ?? lab.vital_instability ?? (Number.isFinite(spo2) && spo2 < 92)
  );

  const factors = [];
  if (hasPlatelet) factors.push(`Platelet count recorded (${platelet})`);
  if (cbcAvailable) factors.push("CBC / laboratory data available");
  if (severeBleeding) factors.push("Severe bleeding indicator present");
  if (hypotension) factors.push("Hypotension indicator present");
  if (vitalInstability) factors.push("Vital instability / low oxygen saturation");

  const hasLab =
    hasPlatelet ||
    cbcAvailable ||
    severeBleeding ||
    hypotension ||
    vitalInstability;

  const severeLabIndicators =
    hasLab &&
    (severeBleeding ||
      hypotension ||
      vitalInstability ||
      (Number.isFinite(platelet) && platelet < 100000));

  return { hasLab, factors, severeLabIndicators, platelet, cbcAvailable };
};

const mapSymptomOnlySeverity = (score) => {
  if (score <= 30) {
    return {
      riskLevel: "Low",
      severity: "Low",
      severityLabel: "Low",
      displayTitle: "Low Clinical Suspicion",
    };
  }
  if (score <= 60) {
    return {
      riskLevel: "Moderate",
      severity: "Moderate",
      severityLabel: "Moderate",
      displayTitle: "Moderate Clinical Suspicion",
    };
  }
  return {
    riskLevel: "High Risk Suspicion",
    severity: "High",
    severityLabel: "High Risk Suspicion",
    displayTitle: "Estimated Severe Dengue Risk",
  };
};

const mapLabEnhancedSeverity = (score) => {
  if (score >= 95) {
    return {
      riskLevel: "Critical",
      severity: "Critical",
      severityLabel: "Severe Dengue Risk",
      displayTitle: "Severe Dengue Risk",
    };
  }
  if (score >= LAB_CRITICAL_MIN) {
    return {
      riskLevel: "Severe Dengue Risk",
      severity: "Critical",
      severityLabel: "Severe Dengue Risk",
      displayTitle: "Severe Dengue Risk",
    };
  }
  if (score <= 30) {
    return { riskLevel: "Low", severity: "Low", severityLabel: "Low", displayTitle: "Low" };
  }
  if (score <= 60) {
    return {
      riskLevel: "Moderate",
      severity: "Moderate",
      severityLabel: "Moderate",
      displayTitle: "Moderate",
    };
  }
  return {
    riskLevel: "High Risk Suspicion",
    severity: "High",
    severityLabel: "High Risk Suspicion",
    displayTitle: "High Risk Suspicion",
  };
};

const buildAiConfidenceLabel = ({ hasLab, symptomCount, graphPathCount }) => {
  if (hasLab) return "High";
  if (symptomCount >= 2 || graphPathCount > 0) return "Moderate";
  return "Low";
};

const buildTriggeredFactors = (symptoms = [], graphSignals = {}, labInfo = {}) => {
  const factors = [];
  (symptoms || []).forEach((symptom) => {
    const key = String(symptom || "").toLowerCase();
    if (symptomFactorMap[key]) factors.push(symptomFactorMap[key]);
  });

  const whoMatched = graphSignals?.whoGuidance?.matched || [];
  if (whoMatched.includes("warning_sign")) {
    factors.push("WHO warning signs identified");
  }
  if (whoMatched.includes("emergency_sign")) {
    factors.push("WHO emergency sign pattern identified");
  }
  if (graphSignals?.criticalPhase?.detected) {
    factors.push("Possible severe dengue progression detected (symptom pattern)");
  }

  labInfo.factors?.forEach((f) => factors.push(f));

  if (!labInfo.hasLab) {
    factors.push("No laboratory data available");
    factors.push("Assessment generated without laboratory confirmation.");
  }

  return [...new Set(factors)].slice(0, 12);
};

const calculateBaselineRisk = ({ current, previous }) => {
  const symptoms = current.symptoms || [];
  const symptomsCount = symptoms.length;
  const feverScore = Math.min(Math.max((current.temperature - 37) * 18, 0), 45);
  const durationScore = Math.min(current.dayOfIllness * 5, 30);
  const symptomScore = Math.min(symptomsCount * 3, 25);

  let trendPenalty = 0;
  let feverTrend = "stable";
  let symptomCountChange = 0;

  if (previous) {
    const tempDiff = Number((current.temperature - previous.temperature).toFixed(2));
    symptomCountChange = symptomsCount - (previous.symptoms || []).length;
    if (tempDiff > 0.4) {
      feverTrend = "rising";
      trendPenalty += 8;
    } else if (tempDiff < -0.4) {
      feverTrend = "dropping";
      trendPenalty += 3;
    }
    if (symptomCountChange > 2) trendPenalty += 10;
  }

  const hasWarningSign = symptoms.some((symptom) => warningSigns.includes(symptom));
  const inCriticalWindow = current.dayOfIllness >= 3 && current.dayOfIllness <= 7;
  const criticalPhaseAlert = inCriticalWindow && feverTrend === "dropping" && hasWarningSign;
  if (criticalPhaseAlert) trendPenalty += 22;

  const riskScore = normalizeRiskScore(feverScore + durationScore + symptomScore + trendPenalty);

  const reasons = [];
  if (feverScore > 20) reasons.push("Elevated temperature contribution");
  if (durationScore > 12) reasons.push("Illness duration within higher-risk window");
  if (symptomScore > 12) reasons.push("Multiple symptoms reported");
  if (criticalPhaseAlert) {
    reasons.push("Possible transition toward dengue critical phase detected");
  }

  return {
    riskScore,
    feverTrend,
    symptomCountChange,
    criticalPhaseAlert,
    explainability: {
      feverContribution: Math.round(feverScore),
      durationContribution: Math.round(durationScore),
      symptomsContribution: Math.round(symptomScore + trendPenalty),
      reasons,
    },
  };
};

const computeGraphBoost = (graphSignals) => {
  if (!graphSignals) return 0;
  let boost = 0;
  if (graphSignals.criticalPhase?.detected) boost += 10;
  if (graphSignals.whoGuidance?.matched?.includes("emergency_sign")) boost += 14;
  if (graphSignals.whoGuidance?.matched?.includes("warning_sign")) boost += 6;
  if (graphSignals.pathways?.actions?.includes("emergency_referral")) boost += 8;
  if (graphSignals.pathways?.actions?.includes("hospitalization")) boost += 5;
  return boost;
};

const buildRecommendations = ({ severityLabel, graphSignals, hasLab }) => {
  const list = [];
  if (graphSignals?.recommendation) list.push(graphSignals.recommendation);

  if (!hasLab) {
    list.push("Clinical confirmation recommended");
    list.push("CBC / Platelet test advised");
  }

  if (severityLabel === "Severe Dengue Risk" || severityLabel === "Critical") {
    list.push("Urgent clinical evaluation recommended with laboratory monitoring");
  } else if (severityLabel === "High Risk Suspicion") {
    list.push("Seek clinical review within 12–24 hours and monitor WHO warning signs");
  } else if (severityLabel === "Moderate") {
    list.push("Continue hydration and recheck symptoms every 12–24 hours");
  } else {
    list.push("Maintain hydration and continue daily symptom tracking");
  }

  return [...new Set(list)];
};

const buildDetectedWarnings = (symptoms = [], graphSignals) => {
  const warnings = new Set(
    (symptoms || []).filter((symptom) => warningSigns.includes(symptom))
  );
  (graphSignals?.whoGuidance?.matched || []).forEach((warning) => warnings.add(warning));
  return [...warnings];
};

/**
 * Centralized probabilistic clinical risk estimation.
 * Symptom-only mode caps at 85; lab-enhanced mode may reach 90–100.
 */
const calculateClinicalRisk = ({ current, previous, mlResult, graphSignals }) => {
  const baseline = calculateBaselineRisk({ current, previous });
  const xgboostScore = Number(mlResult?.risk_score);
  const baseScore = Number.isFinite(xgboostScore) ? xgboostScore : baseline.riskScore;
  const graphBoost = computeGraphBoost(graphSignals);
  let rawScore = normalizeRiskScore(baseScore + graphBoost);

  const labInfo = detectLabEvidence(current, mlResult);
  const hasLab = labInfo.hasLab;
  const riskMode = hasLab ? "lab-enhanced" : "symptom-only";

  if (!hasLab) {
    rawScore = Math.min(rawScore, SYMPTOM_ONLY_MAX);
  } else if (labInfo.severeLabIndicators) {
    rawScore = Math.max(rawScore, LAB_CRITICAL_MIN);
  }

  const severityMapping = hasLab
    ? mapLabEnhancedSeverity(rawScore)
    : mapSymptomOnlySeverity(rawScore);

  const pathCount = graphSignals?.pathways?.risks?.length || 0;
  const aiConfidenceLabel = buildAiConfidenceLabel({
    hasLab,
    symptomCount: (current.symptoms || []).length,
    graphPathCount: pathCount,
  });

  const confidenceBase = Number.isFinite(mlResult?.confidence) ? mlResult.confidence : 0.55;
  const aiConfidence = Math.min(
    hasLab ? 0.92 : 0.78,
    Number(
      (
        confidenceBase +
        (hasLab ? 0.12 : 0) +
        (graphSignals?.criticalPhase?.detected ? 0.06 : 0)
      ).toFixed(2)
    )
  );

  const detectedWarnings = buildDetectedWarnings(current.symptoms, graphSignals);
  const triggeredFactors = buildTriggeredFactors(current.symptoms, graphSignals, labInfo);
  const recommendations = buildRecommendations({
    severityLabel: severityMapping.severityLabel,
    graphSignals,
    hasLab,
  });

  const clinicalSubtitle = hasLab
    ? "Based on symptom progression, WHO warning signs, and available laboratory indicators."
    : "Based on symptom progression and WHO warning signs.";

  const finalReasoning = [
    `Risk mode: ${riskMode}`,
    `Risk source: ${Number.isFinite(xgboostScore) ? "ML + clinical rules" : "Rule-based"}`,
    `Raw model score: ${normalizeRiskScore(baseScore)}`,
    graphBoost ? `Clinical intelligence adjustment: +${graphBoost}` : "Clinical intelligence adjustment: +0",
    !hasLab ? `Symptom-only cap applied (max ${SYMPTOM_ONLY_MAX}/100)` : "Laboratory data included in assessment",
    ...baseline.explainability.reasons,
  ].filter(Boolean);

  return {
    riskScore: rawScore,
    severity: severityMapping.severity,
    riskLevel: severityMapping.riskLevel,
    severityLabel: severityMapping.severityLabel,
    displayTitle: severityMapping.displayTitle,
    aiConfidence,
    aiConfidenceLabel,
    detectedWarnings,
    recommendations,
    triggeredFactors,
    graphSignals: graphSignals || {},
    xgboostScore: Number.isFinite(xgboostScore) ? normalizeRiskScore(xgboostScore) : null,
    graphBoost,
    finalReasoning,
    riskSource: Number.isFinite(xgboostScore) ? "ml" : "fallback",
    riskMode,
    labPending: !hasLab,
    clinicalSubtitle,
    medicalDisclaimer: MEDICAL_DISCLAIMER,
    feverTrend: baseline.feverTrend,
    symptomCountChange: baseline.symptomCountChange,
    criticalPhaseAlert: baseline.criticalPhaseAlert,
    explainability: {
      ...baseline.explainability,
      triggeredFactors,
    },
  };
};

const calculateFinalRisk = calculateClinicalRisk;

module.exports = {
  MEDICAL_DISCLAIMER,
  SYMPTOM_ONLY_MAX,
  LAB_CRITICAL_MIN,
  calculateBaselineRisk,
  calculateClinicalRisk,
  calculateFinalRisk,
  normalizeRiskScore,
  detectLabEvidence,
};
