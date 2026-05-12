const HealthRecord = require("../models/HealthRecord");
const Report = require("../models/Report");
const axios = require("axios");
const { generateDoctorReport } = require("../services/reportGenerator");

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

/**
 * SINGLE SOURCE OF TRUTH: Always fetch risk from Python ML API.
 * Dashboard, Report, and Chatbot all use the same /predict endpoint.
 */
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
  console.log("[Report] Sending to ML API:", JSON.stringify(payload).slice(0, 200));

  const response = await axios.post(buildMlUrl("/predict"), payload, {
    timeout: 8000,
  });

  const data = response?.data || {};
  console.log("[Report] ML API risk_score:", data.risk_score, "risk_level:", data.risk_level);
  console.log("[Report] RAG context preview:", String(data?.rag_context || "").slice(0, 160));
  console.log("[Report] Report preview:", String(data?.report || "").slice(0, 160));

  return data;
};

const createReport = async (req, res) => {
  try {
    const latestRecord = await HealthRecord.findOne({ user: req.user._id }).sort({ date: -1 });
    if (!latestRecord) return res.status(404).json({ message: "No records found" });

    const symptoms = latestRecord.symptoms || [];

    // SINGLE SOURCE OF TRUTH: Get risk from Python ML API (same source as dashboard)
    let reportText = null;
    let riskScore = 0;
    let riskLevel = "Low";

    try {
      const aiResult = await fetchAiReport(latestRecord);
      reportText = String(aiResult?.report || "").trim();
      riskScore = Number(aiResult?.risk_score ?? 0);
      riskLevel = String(aiResult?.risk_level || "LOW");
    } catch (error) {
      console.error("[Report] AI service error:", error.message);
      // Fallback: use Node-computed values only if Python is unreachable
      riskScore = latestRecord.computed?.riskScore || 0;
      riskLevel = latestRecord.computed?.riskLevel || "Low";
      console.log("[Report] Using fallback Node risk:", riskScore, riskLevel);
    }

    // Duplicate prevention using ML API score (single source)
    const lastReport = await Report.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (lastReport) {
      const isSameScore = lastReport.riskScore === riskScore;
      const isSameSymptoms = JSON.stringify([...lastReport.symptoms].sort()) === JSON.stringify([...symptoms].sort());

      if (isSameScore && isSameSymptoms) {
        return res.status(200).json({ message: "Duplicate report prevented", report: lastReport });
      }
    }

    // Fallback report text if AI didn't return one
    if (!reportText) {
      reportText = generateDoctorReport({
        userName: req.user.name,
        record: latestRecord,
      });
    }

    // Create a short summary from the first few lines of the text
    const cleanText = reportText.replace(/\n/g, ' ').trim();
    const summary = cleanText.substring(0, 120) + (cleanText.length > 120 ? "..." : "");

    const nearestHospitals = req.body.nearestHospitals || [];

    const report = await Report.create({
      user: req.user._id,
      latestRecord: latestRecord._id,
      reportText,
      riskLevel,
      riskScore,
      symptoms,
      summary,
      nearestHospitals: nearestHospitals.map(h => ({
        name: h.name,
        distance: h.distanceKm ? `${h.distanceKm} km` : h.distance
      }))
    });

    console.log("[Report] Created report:", report._id, "risk:", riskScore, riskLevel);
    return res.status(201).json(report);
  } catch (error) {
    console.error("Report generation error:", error);
    return res.status(500).json({ message: "Failed to generate report", error: error.message });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);
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
  try {
    const userId = req.body.userId || req.user._id;
    console.log("Generating report for user:", userId);

    const record = await HealthRecord.findOne({ user: userId }).sort({ date: -1 });
    if (!record) {
      console.log("No health record found for user:", userId);
      return res.status(404).json({ error: "No health data found. Please save a record first." });
    }

    console.log("Latest record found:");
    console.log(record);

    const mlBaseUrl = process.env.VITE_ML_API_URL || "http://127.0.0.1:5001";
    const pythonResponse = await axios.post(`${mlBaseUrl.replace(/\/$/, "")}/report`, {
      data: record
    });

    const reportContent = pythonResponse.data.report;

    // Use SAME riskScore from database, DO NOT recalculate
    const nearestHospitals = req.body.nearestHospitals || [];

    const savedReport = await Report.create({
      user: userId,
      latestRecord: record._id,
      reportText: reportContent,
      riskScore: record.computed.riskScore,
      riskLevel: record.computed.riskLevel,
      symptoms: record.symptoms,
      summary: reportContent.substring(0, 150) + "...",
      nearestHospitals: nearestHospitals.map(h => ({
        name: h.name,
        distance: h.distanceKm ? `${h.distanceKm} km` : h.distance
      }))
    });

    res.status(201).json(savedReport);
  } catch (error) {
    console.error("Report generation error:", error.message);
    res.status(500).json({ error: "Failed to generate report", details: error.message });
  }
};

module.exports = { createReport, getMyReports, deleteReport, getAllHistory, generateReport };
