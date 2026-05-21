export const MEDICAL_DISCLAIMER =
  "This AI system provides early clinical risk estimation and does not replace licensed medical diagnosis.";

const SYMPTOM_ELEVATED_MIN = 61;
const LAB_CRITICAL_MIN = 90;

const confidenceStyles = {
  Low: "border-slate-400/40 bg-slate-500/15 text-slate-200",
  Moderate: "border-cyan-400/40 bg-cyan-500/15 text-cyan-100",
  High: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
};

const severityStyles = {
  Low: { bg: "bg-emerald-500/10", badge: "bg-emerald-600/90 text-white", text: "text-emerald-200" },
  Moderate: { bg: "bg-amber-500/10", badge: "bg-amber-500/90 text-slate-900", text: "text-amber-200" },
  "High Risk Suspicion": { bg: "bg-orange-500/10", badge: "bg-orange-600/90 text-white", text: "text-orange-200" },
  High: { bg: "bg-orange-500/10", badge: "bg-orange-600/90 text-white", text: "text-orange-200" },
  "Severe Dengue Risk": { bg: "bg-rose-500/10", badge: "bg-rose-600/90 text-white", text: "text-rose-200" },
  Critical: { bg: "bg-rose-500/10", badge: "bg-rose-600/90 text-white", text: "text-rose-200" },
};

/** Format server assessment for UI (dashboard, reports, graph, PDF). */
export const formatClinicalRisk = (assessment) => {
  if (!assessment || (assessment.riskScore == null && assessment.riskScore !== 0)) {
    return null;
  }

  const score = Math.round(Number(assessment.riskScore));
  const severityLabel =
    assessment.severityLabel || assessment.riskLevel || assessment.severity || "Low";
  const styles = severityStyles[severityLabel] || severityStyles.Low;
  const labPending = assessment.labPending ?? assessment.riskMode === "symptom-only";

  const normalizeTriggeredFactor = (factor) => {
    const value = String(factor || "")
      .replace(/\u200B|\u200C|\u200D|\uFEFF/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*→\s*/g, " → ")
      .trim();
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
  };

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
