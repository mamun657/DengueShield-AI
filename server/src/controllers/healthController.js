const { v4: uuidv4 } = require("uuid");
const HealthRecord = require("../models/HealthRecord");
const User = require("../models/User");
const { calculateRisk } = require("../services/riskEngine");

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

    const computed = calculateRisk({
      current: {
        temperature,
        dayOfIllness,
        symptoms,
      },
      previous,
    });

    const record = await HealthRecord.create({
      user: req.user._id,
      dayOfIllness,
      temperature,
      symptoms,
      fluidIntakeLiters,
      pregnancyStatus: !!payload.pregnancyStatus,
      computed,
    });

    return res.status(201).json(record);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getMyDashboard = async (req, res) => {
  const records = await HealthRecord.find({ user: req.user._id }).sort({ date: -1 }).limit(7);
  const ordered = [...records].reverse();
  return res.json({
    profile: req.user,
    records: ordered,
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
