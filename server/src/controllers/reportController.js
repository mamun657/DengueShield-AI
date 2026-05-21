const HealthRecord = require("../models/HealthRecord");

const Report = require("../models/Report");

const axios = require("axios");

const { generateDoctorReport } = require("../services/reportGenerator");

const { calculateClinicalRisk, MEDICAL_DISCLAIMER } = require("../services/riskEngine");

const {

  analyzeSymptomsGraph,

  detectCriticalPhase,

  getWHOGuidance,

  getRiskPathways,

  generateGraphExplanation,

  buildReasoningBullets,

} = require("../services/graphRagService");



const buildPredictPayload = (record) => {

  const symptoms = new Set((record.symptoms || []).map((s) => String(s).toLowerCase()));



  return {

    day: Number(record.dayOfIllness || 1),

    temp: Number(record.temperature || 0),

    days_high_fever: Number(record.dayOfIllness || 1),

    fluid: Number(record.fluidIntakeLiters || 0),

    headache: symptoms.has("headache"),

    vomiting: symptoms.has("vomiting"),

    abdominal_pain: symptoms.has("abdominal pain"),

    bleeding: symptoms.has("bleeding"),

    fatigue: symptoms.has("fatigue"),

    rash: symptoms.has("rash"),

    eye_pain: symptoms.has("eye pain"),

    appetite_loss: symptoms.has("appetite loss"),

    restlessness: symptoms.has("restlessness"),

    pregnant: !!record.pregnancyStatus,

  };

};



const getMlBaseUrl = () =>

  process.env.ML_API_URL ||

  process.env.PYTHON_API_URL ||

  process.env.VITE_ML_API_URL ||

  "http://127.0.0.1:5001";



const buildMlUrl = (path) => {

  const base = String(getMlBaseUrl()).replace(/\/$/, "");

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;

};



const fetchAiReport = async (record) => {

  const payload = buildPredictPayload(record);

  const response = await axios.post(buildMlUrl("/predict"), payload, { timeout: 8000 });

  return response?.data || {};

};



const cloneAssessment = (assessment) =>

  JSON.parse(

    JSON.stringify({

      riskScore: assessment.riskScore,

      severity: assessment.severity,

      riskLevel: assessment.riskLevel,

      aiConfidence: assessment.aiConfidence,

      detectedWarnings: assessment.detectedWarnings || [],

      recommendations: assessment.recommendations || [],

      graphSignals: assessment.graphSignals || {},

      xgboostScore: assessment.xgboostScore,

      graphBoost: assessment.graphBoost,

      finalReasoning: assessment.finalReasoning || [],

      riskSource: assessment.riskSource,

      severityLabel: assessment.severityLabel,

      displayTitle: assessment.displayTitle,

      riskMode: assessment.riskMode,

      labPending: assessment.labPending,

      aiConfidenceLabel: assessment.aiConfidenceLabel,

      triggeredFactors: assessment.triggeredFactors,

      clinicalSubtitle: assessment.clinicalSubtitle,

      medicalDisclaimer: assessment.medicalDisclaimer,

      feverTrend: assessment.feverTrend,

      criticalPhaseAlert: assessment.criticalPhaseAlert,

    })

  );



const buildReportSnapshot = ({

  userId,

  latestRecord,

  assessment,

  mlResult,

  graphAnalysis,

  critical,

  whoGuidance,

  graphExplanation,

  reasoning,

  reportText,

  summary,

  nearestHospitals,

}) => {

  const symptoms = [...(latestRecord.symptoms || [])];

  const detectedWarnings = [...(assessment.detectedWarnings || [])];

  const recommendations = [...(assessment.recommendations || [])];

  const graphPath = [

    ...(graphExplanation?.graphPathLabels || []),

    ...(graphExplanation?.traversalSummary || []),

  ];

  const graphReasoning = [...(reasoning || []), ...(assessment.finalReasoning || [])];

  const whoText =

    whoGuidance?.summary ||

    (whoGuidance?.matched?.length ? whoGuidance.matched.join(", ") : "No WHO warning pathway matched");



  const emergencyAdvice =

    assessment.riskMode === "lab-enhanced" && assessment.riskScore >= 90

      ? "Urgent clinical evaluation recommended. Laboratory indicators suggest severe dengue risk."

      : assessment.riskScore >= 61

        ? "Elevated dengue risk suspicion based on symptoms. Clinical confirmation and CBC/platelet testing recommended."

        : recommendations[0] ||

          "Monitor symptoms, maintain hydration, and seek clinical care if warning signs develop.";



  return {

    user: userId,

    latestRecord: latestRecord._id,

    reportText,

    summary,

    riskLevel: assessment.riskLevel,

    riskScore: assessment.riskScore,

    symptoms,

    dayOfIllness: Number(latestRecord.dayOfIllness || 1),

    temperature: Number(latestRecord.temperature || 0),

    pregnancyStatus: !!latestRecord.pregnancyStatus,

    severity: assessment.severity,

    aiConfidence: assessment.aiConfidence,

    detectedWarnings,

    recommendations,

    whoGuidance: whoText,

    graphReasoning,

    graphPath,

    clinicalSummary: summary,

    emergencyAdvice,

    xgboostScore: assessment.xgboostScore ?? null,

    graphBoost: assessment.graphBoost ?? 0,

    finalAssessment: cloneAssessment(assessment),

    severityLabel: assessment.severityLabel,

    displayTitle: assessment.displayTitle,

    riskMode: assessment.riskMode,

    labPending: assessment.labPending,

    clinicalSubtitle: assessment.clinicalSubtitle,

    medicalDisclaimer: assessment.medicalDisclaimer || MEDICAL_DISCLAIMER,

    aiConfidenceLabel: assessment.aiConfidenceLabel,

    triggeredFactors: assessment.triggeredFactors || [],

    nearestHospitals: nearestHospitals.map((h) => ({

      name: h.name,

      distance: h.distanceKm ? `${h.distanceKm} km` : h.distance,

    })),

  };

};



const buildUnifiedAssessment = async (latestRecord, previous) => {

  let mlResult = null;

  try {

    mlResult = await fetchAiReport(latestRecord);

  } catch (error) {

    console.warn("[Report] ML unavailable:", error.message);

  }



  const symptoms = latestRecord.symptoms || [];

  const dayOfIllness = Number(latestRecord.dayOfIllness || 1);

  const graphAnalysis = await analyzeSymptomsGraph(symptoms, dayOfIllness);

  const critical = detectCriticalPhase(symptoms, dayOfIllness, graphAnalysis.paths);

  const whoGuidance = getWHOGuidance(graphAnalysis.paths);

  const pathways = getRiskPathways(graphAnalysis.paths);

  const graphExplanation = generateGraphExplanation(symptoms, graphAnalysis.paths, whoGuidance, critical);

  const reasoning = buildReasoningBullets(symptoms, graphAnalysis.paths, critical, whoGuidance, mlResult);



  const assessment = calculateClinicalRisk({

    current: {

      temperature: latestRecord.temperature,

      dayOfIllness,

      symptoms,

      fluidIntakeLiters: latestRecord.fluidIntakeLiters || 0,

      pregnancyStatus: latestRecord.pregnancyStatus,

      labData: latestRecord.labData,

    },

    previous,

    mlResult,

    graphSignals: {

      engine: graphAnalysis.engine,

      day: dayOfIllness,

      criticalPhase: critical,

      whoGuidance,

      pathways,

    },

  });



  latestRecord.computed = assessment;

  await latestRecord.save();



  return {

    assessment,

    mlResult,

    graphAnalysis,

    critical,

    whoGuidance,

    graphExplanation,

    reasoning,

  };

};



const normalizeReportText = (reportText, assessment) => {

  if (!reportText) return reportText;

  const score = assessment?.riskScore;

  const level = assessment?.riskLevel;

  if (!Number.isFinite(score) || !level) return reportText;



  const riskLine = `AI Risk Score: ${score}/100 (${level}).`;

  if (/AI Risk Score:/i.test(reportText)) {

    return reportText.replace(/AI Risk Score:.*$/im, riskLine);

  }

  return `${reportText}\n${riskLine}`;

};



const createReport = async (req, res) => {

  try {

    const latestRecord = await HealthRecord.findOne({ user: req.user._id }).sort({ date: -1 });

    if (!latestRecord) return res.status(404).json({ message: "No records found" });



    const previous = await HealthRecord.findOne({

      user: req.user._id,

      _id: { $ne: latestRecord._id },

    }).sort({ date: -1 });



    const {

      assessment,

      mlResult,

      graphAnalysis,

      critical,

      whoGuidance,

      graphExplanation,

      reasoning,

    } = await buildUnifiedAssessment(latestRecord, previous);



    const symptoms = latestRecord.symptoms || [];



    let reportText = String(mlResult?.report || "").trim();

    reportText = normalizeReportText(reportText, assessment);



    const lastReport = await Report.findOne({ user: req.user._id }).sort({ createdAt: -1 });

    if (lastReport) {

      const isSameScore = lastReport.riskScore === assessment.riskScore;

      const isSameSymptoms =

        JSON.stringify([...(lastReport.symptoms || [])].sort()) ===

        JSON.stringify([...symptoms].sort());



      if (isSameScore && isSameSymptoms) {

        console.log("[Report] duplicate prevented", lastReport._id, assessment.riskScore);

        return res.status(200).json(lastReport);

      }

    }



    if (!reportText) {

      reportText = generateDoctorReport({

        userName: req.user.name,

        record: latestRecord,

        assessment,

      });

    }



    const cleanText = reportText.replace(/\n/g, " ").trim();

    const summary = cleanText.substring(0, 120) + (cleanText.length > 120 ? "..." : "");

    const nearestHospitals = req.body.nearestHospitals || [];



    const snapshot = buildReportSnapshot({

      userId: req.user._id,

      latestRecord,

      assessment,

      mlResult,

      graphAnalysis,

      critical,

      whoGuidance,

      graphExplanation,

      reasoning,

      reportText,

      summary,

      nearestHospitals,

    });



    const report = await Report.create(snapshot);



    console.log(

      "[REPORT SNAPSHOT CREATED]",

      "reportId:",

      report._id,

      "riskScore:",

      report.riskScore,

      "createdAt:",

      report.createdAt

    );



    return res.status(201).json(report);

  } catch (error) {

    console.error("Report generation error:", error);

    return res.status(500).json({ message: "Failed to generate report", error: error.message });

  }

};



const getMyReports = async (req, res) => {

  try {

    const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);

    return res.json(reports);

  } catch (error) {

    return res.status(500).json({ message: "Failed to fetch reports" });

  }

};



const deleteReport = async (req, res) => {

  try {

    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });

    if (!report) {

      return res.status(404).json({ message: "Report not found" });

    }

    await report.deleteOne();

    return res.json({ message: "Report deleted successfully" });

  } catch (error) {

    return res.status(500).json({ message: "Failed to delete report" });

  }

};



const getAllHistory = async (req, res) => {

  try {

    const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.json(reports);

  } catch (error) {

    return res.status(500).json({ message: "Failed to fetch full history" });

  }

};



const generateReport = async (req, res) => {

  return createReport(req, res);

};



module.exports = { createReport, getMyReports, deleteReport, getAllHistory, generateReport };

