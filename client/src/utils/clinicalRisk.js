export const MEDICAL_DISCLAIMER =
  "This AI system provides early clinical risk ESTIMATION and does not diagnose dengue. " +
  "Symptoms may overlap with COVID-19, influenza, malaria, typhoid, and other febrile illnesses. " +
  "Laboratory confirmation via CBC, Platelet count, NS1 test, or physician evaluation is REQUIRED for diagnosis.";

const SYMPTOM_ELEVATED_MIN = 61;
const LAB_CRITICAL_MIN = 90;

const confidenceStyles = {
  Low: "border-slate-400/40 bg-slate-500/15 text-slate-200",
  Moderate: "border-cyan-400/40 bg-cyan-500/15 text-cyan-100",
  High: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
};

const getSeverityCategory = (score) => {
  if (score >= 80) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Moderate";
  return "Low";
};

const severityStyles = {
  Low: { bg: "bg-emerald-500/10", badge: "bg-emerald-600/90 text-white", text: "text-emerald-200" },
  "Low Suspicion": { bg: "bg-emerald-500/10", badge: "bg-emerald-600/90 text-white", text: "text-emerald-200" },
  Moderate: { bg: "bg-amber-500/10", badge: "bg-amber-600/90 text-slate-900", text: "text-amber-200" },
  "Moderate Suspicion": { bg: "bg-amber-500/10", badge: "bg-amber-600/90 text-slate-900", text: "text-amber-200" },
  High: { bg: "bg-orange-500/10", badge: "bg-orange-600/90 text-white", text: "text-orange-200" },
  "High WHO Warning Risk": { bg: "bg-orange-500/10", badge: "bg-orange-600/90 text-white", text: "text-orange-200" },
  "High Risk Suspicion": { bg: "bg-orange-500/10", badge: "bg-orange-600/90 text-white", text: "text-orange-200" },
  Critical: { bg: "bg-rose-500/10", badge: "bg-rose-600/90 text-white", text: "text-rose-200" },
  "Severe Dengue Risk": { bg: "bg-rose-500/10", badge: "bg-rose-600/90 text-white", text: "text-rose-200" },
  "Critical Severe Dengue Risk": { bg: "bg-rose-500/10", badge: "bg-rose-600/90 text-white", text: "text-rose-200" },
};

const dedupeConsecutiveWords = (input) => {
  let s = String(input);
  let prev;
  do {
    prev = s;
    s = s.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");
  } while (s !== prev);
  return s;
};

const normalizeTriggeredFactor = (factor) => {
  const value = dedupeConsecutiveWords(
    String(factor || "")
      .normalize("NFKC")
      .replace(/[\u200B-\u200F\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*→\s*/g, " — ")
      .replace(/["'‘’“”]/g, "")
      .replace(/!+|\?+/g, "")
      .replace(/\s*WHO\s*(?:EMERGENCY\s+)?warning\s*signs?/gi, "WHO warning sign")
      .replace(/\s*-\s*/g, " — ")
      .replace(/\bLow\s+Low\b/g, "Low")
      .trim()
  );
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
};

/** Format server assessment for UI (dashboard, reports, graph, PDF). */
export const formatClinicalRisk = (assessment) => {
  if (!assessment || (assessment.riskScore == null && assessment.riskScore !== 0)) {
    return null;
  }

  const score = Math.round(Number(assessment.riskScore));
  const scoreSeverity = getSeverityCategory(score);
  const severityLabel =
    assessment.severityLabel || assessment.riskLevel || assessment.severity || scoreSeverity;
  const styleKey = severityStyles[severityLabel] ? severityLabel : scoreSeverity;
  const styles = severityStyles[styleKey] || severityStyles.Low;
  const labPending = assessment.labPending ?? assessment.riskMode === "symptom-only";

  const triggeredFactors = Array.isArray(assessment.triggeredFactors)
    ? assessment.triggeredFactors
        .map(normalizeTriggeredFactor)
        .filter(Boolean)
    : Array.isArray(assessment.explainability?.triggeredFactors)
    ? assessment.explainability.triggeredFactors
        .map(normalizeTriggeredFactor)
        .filter(Boolean)
    : [];

  return {
    score,
    displayScore: `${score}/100`,
    scoreLine: `${score}/100 — ${severityLabel}`,
    severityLabel,
    displayTitle: assessment.displayTitle || severityLabel,
    riskLevel: assessment.riskLevel,
    aiConfidenceLabel: assessment.aiConfidenceLabel || (labPending ? "Moderate" : "High"),
    aiConfidence: assessment.aiConfidence,
    clinicalSubtitle:
      assessment.clinicalSubtitle ||
      "Based on symptom progression and WHO warning signs.",
    labPending,
    riskMode: assessment.riskMode || (labPending ? "symptom-only" : "lab-enhanced"),
    triggeredFactors: Array.from(new Set(triggeredFactors)),
    recommendations: assessment.recommendations || [],
    medicalDisclaimer: assessment.medicalDisclaimer || MEDICAL_DISCLAIMER,
    showElevatedBanner: labPending && score >= SYMPTOM_ELEVATED_MIN,
    showLabCriticalBanner: !labPending && score >= LAB_CRITICAL_MIN,
    styles,
    confidenceStyle: confidenceStyles[assessment.aiConfidenceLabel] || confidenceStyles.Moderate,
  };
};

export const shouldShowElevatedCare = (assessment) => {
  const score = Number(assessment?.riskScore);
  if (!Number.isFinite(score)) return false;
  const labPending = assessment?.labPending ?? assessment?.riskMode !== "lab-enhanced";
  if (labPending) return score >= 61;
  return score >= 90;
};

export const shouldShowLabCritical = (assessment) => {
  const score = Number(assessment?.riskScore);
  return (
    assessment?.riskMode === "lab-enhanced" &&
    Number.isFinite(score) &&
    score >= 90
  );
};
