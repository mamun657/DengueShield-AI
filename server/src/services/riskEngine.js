const { 
  calculateWhoAlignedRisk, 
  MEDICAL_DISCLAIMER,
  SYMPTOM_ONLY_MAX,
  LAB_CRITICAL_MIN,
} = require("./whoAlignedRiskEngine");

// Legacy reference - importing constants from WHO engine
const LEGACY_MEDICAL_DISCLAIMER = MEDICAL_DISCLAIMER;



/**
 * Centralized WHO-aligned probabilistic clinical risk estimation.
 * Uses new weighted scoring system based on clinical research.
 * Symptom-only mode caps at SYMPTOM_ONLY_MAX; lab-enhanced mode may reach LAB_CRITICAL_MIN.
 */
const calculateClinicalRisk = ({ current, previous, mlResult, graphSignals }) => {
  // Use WHO-aligned scoring system
  const whoAssessment = calculateWhoAlignedRisk({ current, previous });
  
  let finalScore = whoAssessment.riskScore;
  let aiConfidence = 0.65;
  
  // Apply GraphRAG confidence boost if available
  if (graphSignals?.criticalPhase?.detected) {
    aiConfidence += 0.12;
  }
  if (graphSignals?.whoGuidance?.matched?.includes("emergency_sign")) {
    aiConfidence += 0.1;
  }
  
  // Apply ML model score if available (as advisory signal, not overriding)
  const xgboostScore = Number(mlResult?.risk_score);
  if (Number.isFinite(xgboostScore) && xgboostScore > finalScore + 5) {
    // ML model suggests higher risk - may indicate pattern recognition
    finalScore = Math.min(finalScore + 5, 100);
    aiConfidence += 0.08;
  }
  
  aiConfidence = Math.min(aiConfidence, whoAssessment.labPending ? 0.80 : 0.92);
  
  const aiConfidenceLabel = aiConfidence >= 0.85 ? "High" : aiConfidence >= 0.70 ? "Moderate" : "Low";
  
  // Build detected warnings from symptoms and graph signals
  const detectedWarnings = [];
  (current.symptoms || []).forEach(symptom => {
    if (["vomiting", "abdominal pain", "bleeding", "restlessness"].includes(symptom)) {
      detectedWarnings.push(`WHO warning sign: ${symptom}`);
    }
  });
  if (graphSignals?.whoGuidance?.matched) {
    graphSignals.whoGuidance.matched.forEach(warning => {
      if (!detectedWarnings.includes(warning)) {
        detectedWarnings.push(warning);
      }
    });
  }
  
  // Build triggered factors with explanations
  const triggeredFactors = [];
  whoAssessment.explainableFactors?.forEach(f => {
    triggeredFactors.push(f.explanation);
  });
  
  const clinicalSubtitle = whoAssessment.labPending
    ? "Based on symptom analysis, fever patterns, and WHO critical phase indicators. Laboratory confirmation pending."
    : "Based on symptom analysis, fever patterns, WHO warning signs, and laboratory evidence.";
  
  return {
    // Core scoring
    riskScore: finalScore,
    severity: whoAssessment.clinicalCategory?.split("-")[0] || "low",
    riskLevel: whoAssessment.riskLevel,
    severityLabel: whoAssessment.severityLabel,
    displayTitle: whoAssessment.displayTitle,
    
    // Confidence and mode
    aiConfidence: Math.round(aiConfidence * 100) / 100,
    aiConfidenceLabel,
    
    // Clinical details
    detectedWarnings,
    recommendations: whoAssessment.recommendations || [],
    triggeredFactors,
    
    // Metadata
    graphSignals: graphSignals || {},
    xgboostScore: Number.isFinite(xgboostScore) ? Math.round(xgboostScore) : null,
    graphBoost: 0,
    finalReasoning: whoAssessment.factorsSummary || [],
    riskSource: "WHO-aligned-scoring-engine",
    riskMode: whoAssessment.riskMode,
    labPending: whoAssessment.labPending,
    clinicalSubtitle,
    medicalDisclaimer: whoAssessment.medicalDisclaimer,
    
    // Explainability
    explainability: {
      triggeredFactors,
      whoAlignedFactors: whoAssessment.explainableFactors,
      reasons: whoAssessment.factorsSummary,
    },
  };
};

const calculateFinalRisk = calculateClinicalRisk;

module.exports = {
  MEDICAL_DISCLAIMER,
  SYMPTOM_ONLY_MAX,
  LAB_CRITICAL_MIN,
  calculateClinicalRisk,
  calculateFinalRisk,
};
