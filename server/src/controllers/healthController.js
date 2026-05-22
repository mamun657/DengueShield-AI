const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const HealthRecord = require("../models/HealthRecord");
const User = require("../models/User");
const { calculateClinicalRisk } = require("../services/riskEngine");
const {
  analyzeSymptomsGraph,
  detectCriticalPhase,
  getWHOGuidance,
  getRiskPathways,
} = require("../services/graphRagService");

const symptomAllowList = [
  "headache",
  "body pain",
  "vomiting",
  "abdominal pain",
  "bleeding",
  "fatigue",
  "rash",
  "eye pain",
  "appetite loss",
  "restlessness",
];

const buildPredictPayload = (record) => {
  const symptoms = new Set((record.symptoms || []).map((s) => String(s).toLowerCase()));
  const day = Number(record.dayOfIllness || 1);
  const temp = Number(record.temperature || 0);

  return {
    day,
    temp,
    days_high_fever: day,
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

const fetchMlRisk = async (record) => {
  const payload = buildPredictPayload(record);
  const base = String(getMlBaseUrl()).replace(/\/$/, "");
  const response = await axios.post(`${base}/predict`, payload, { timeout: 8000 });
  return response?.data || {};
};

const createHealthRecord = async (req, res) => {
  try {
    const payload = req.body || {};
    const rawSymptoms = payload.symptoms || [];
    const symptoms = rawSymptoms
      .map((s) => String(s || "").toLowerCase())
      .filter((s) => symptomAllowList.includes(s));

    const previous = await HealthRecord.findOne({ user: req.user._id }).sort({ date: -1 });

    const dayOfIllness = Math.max(1, Number(payload.dayOfIllness) || 1);
    const temperature = Number(payload.temperature) || 0;
    const fluidIntakeLiters = Number(payload.fluidIntakeLiters) || 0;

    const plateletFromPayload =
      payload.plateletCount ?? payload.labData?.plateletCount ?? payload.labs?.plateletCount;
    let labData =
      payload.labData || payload.labs ? { ...(payload.labData || payload.labs) } : null;
    if (plateletFromPayload != null && plateletFromPayload !== "") {
      labData = { ...(labData || {}), plateletCount: Number(plateletFromPayload) };
    }

    const current = {
      temperature,
      dayOfIllness,
      symptoms,
      fluidIntakeLiters,
      pregnancyStatus: !!payload.pregnancyStatus,
      labData,
    };

    let mlResult = null;
    try {
      mlResult = await fetchMlRisk(current);
    } catch (error) {
      console.warn("[RiskEngine] ML unavailable, using fallback:", error.message);
    }

    const graphAnalysis = await analyzeSymptomsGraph(symptoms, dayOfIllness);
    const critical = detectCriticalPhase(symptoms, dayOfIllness, graphAnalysis.paths);
    const whoGuidance = getWHOGuidance(graphAnalysis.paths);
    const pathways = getRiskPathways(graphAnalysis.paths);

    const graphSignals = {
      engine: graphAnalysis.engine,
      day: dayOfIllness,
      criticalPhase: critical,
      whoGuidance,
      pathways,
    };

    const computed = calculateClinicalRisk({
      current,
      previous,
      mlResult,
      graphSignals,
    });

    const record = await HealthRecord.create({
      user: req.user._id,
      dayOfIllness,
      temperature,
      symptoms,
      fluidIntakeLiters,
      pregnancyStatus: !!payload.pregnancyStatus,
      labData: labData || undefined,
      computed,
    });

    console.log(
      "[RiskEngine] latestRecord",
      record._id,
      "riskScore",
      computed.riskScore,
      "riskLevel",
      computed.riskLevel,
      "source",
      computed.riskSource
    );

    return res.status(201).json(record);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getMyDashboard = async (req, res) => {
  const records = await HealthRecord.find({ user: req.user._id }).sort({ date: -1 }).limit(7);
  const ordered = [...records].reverse();
  const latest = ordered[ordered.length - 1] || null;
  return res.json({
    profile: req.user,
    records: ordered,
    latestAssessment: latest?.computed || null,
    latestRecordId: latest?._id || null,
    trend: ordered.map((r) => ({
      date: r.date,
      temperature: r.temperature,
      riskScore: r.computed.riskScore,
      symptoms: r.symptoms.length,
    })),
  });
};

const uploadRashImageMock = async (req, res) => {
  const record = await HealthRecord.findById(req.params.recordId);
  if (!record || String(record.user) !== String(req.user._id)) {
    return res.status(404).json({ message: "Record not found" });
  }
  record.rashImageUrl = `/uploads/${req.file?.filename || "mock-image.png"}`;
  record.rashImageAssessment = "Mock AI result: rash pattern requires physician review.";
  await record.save();
  return res.json(record);
};

const getFamilyShareLink = async (req, res) => {
  const token = uuidv4();
  await User.findByIdAndUpdate(req.user._id, { familyShareToken: token });
  return res.json({ shareUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/family/${token}` });
};

const getFamilyView = async (req, res) => {
  const user = await User.findOne({ familyShareToken: req.params.token }).select("-password");
  if (!user) return res.status(404).json({ message: "Invalid link" });
  const records = await HealthRecord.find({ user: user._id }).sort({ date: -1 }).limit(7);
  return res.json({ user, records: records.reverse() });
};

module.exports = {
  createHealthRecord,
  getMyDashboard,
  uploadRashImageMock,
  getFamilyShareLink,
  getFamilyView,
};
