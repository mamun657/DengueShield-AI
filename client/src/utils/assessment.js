/**

 * Live clinical assessment resolver (dashboard / current monitoring only).

 * Historical reports MUST use stored snapshot fields — never this helper.

 */

export const resolveUnifiedAssessment = ({

  latestAssessment,

  currentRisk,

  latestRecord,

} = {}) => {

  const fromRecord = latestRecord?.computed || null;



  const assessment = fromRecord || latestAssessment || currentRisk || null;



  if (assessment) {

    console.log(

      "[Assessment] live unified",

      "riskScore",

      assessment.riskScore,

      "riskLevel",

      assessment.riskLevel,

      "source",

      assessment.riskSource || assessment.source || "unknown"

    );

  }



  return assessment;

};



/** Read immutable values from a saved report snapshot. */

export const getReportSnapshot = (report) => {

  if (!report) return null;

  return {

    riskScore: report.riskScore ?? report.risk_score ?? null,

    riskLevel: report.riskLevel ?? report.risk_level ?? null,

    severity: report.severity ?? null,

    dayOfIllness: report.dayOfIllness ?? report.day_of_illness ?? null,

    detectedWarnings: report.detectedWarnings || report.symptoms || [],

    recommendations: report.recommendations || [],

    whoGuidance: report.whoGuidance || report.who_guidance || null,

    clinicalSummary: report.clinicalSummary || report.summary || null,

    emergencyAdvice: report.emergencyAdvice || null,

    createdAt: report.createdAt,

    reportId: report._id,

  };

};



export const logPreviousReportRender = (report) => {

  console.log(

    "[PREVIOUS REPORT RENDER]",

    "rendering report:",

    report?._id,

    "riskScore:",

    report?.riskScore,

    "createdAt:",

    report?.createdAt

  );

};



export const graphResultToAssessment = (result) => {
  if (!result?.riskScore && result?.riskScore !== 0) return null;
  return {
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    severity: result.severity,
    severityLabel: result.severityLabel,
    displayTitle: result.displayTitle,
    aiConfidence: result.aiConfidence ?? result.confidence,
    aiConfidenceLabel: result.aiConfidenceLabel,
    labPending: result.labPending,
    riskMode: result.riskMode,
    clinicalSubtitle: result.clinicalSubtitle,
    medicalDisclaimer: result.medicalDisclaimer,
    triggeredFactors: result.triggeredFactors,
    detectedWarnings: result.reasoning || [],
    recommendations:
      result.recommendations || (result.recommendation ? [result.recommendation] : []),
    graphSignals: result.graph,
    riskSource: "graphrag",
    finalReasoning: result.finalReasoning || result.reasoning,
  };
};


