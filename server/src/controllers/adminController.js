const User = require("../models/User");
const HealthRecord = require("../models/HealthRecord");
const Report = require("../models/Report");

const getAdminOverview = async (_req, res) => {
  const [totalUsers, totalRecords, riskCounts] = await Promise.all([
    User.countDocuments(),
    HealthRecord.countDocuments(),
    HealthRecord.aggregate([
      {
        $facet: {
          criticalCases: [
            {
              $match: {
                "computed.riskScore": { $gte: 85 },
                dayOfIllness: { $gte: 3 },
                symptoms: { $in: ["bleeding", "abdominal pain", "restlessness"] },
              },
            },
            { $count: "count" },
          ],
          highRiskCases: [
            { $match: { "computed.riskScore": { $gte: 70 } } },
            { $count: "count" },
          ],
          pregnantHighRisk: [
            {
              $match: {
                pregnancyStatus: true,
                "computed.riskScore": { $gte: 50 },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]),
  ]);

  const counts = riskCounts?.[0] || {};
  const getCount = (bucket) => (bucket?.[0]?.count ? bucket[0].count : 0);

  return res.json({
    totalUsers,
    totalRecords,
    criticalCases: getCount(counts.criticalCases),
    highRiskCases: getCount(counts.highRiskCases),
    pregnantHighRisk: getCount(counts.pregnantHighRisk),
  });
};

const getAdminAlerts = async (_req, res) => {
  const alerts = await HealthRecord.find({ "computed.riskScore": { $gte: 70 } })
    .populate("user", "name email")
    .sort({ "computed.riskScore": -1, date: -1 })
    .limit(12)
    .lean();

  return res.json(
    alerts.map((record) => ({
      id: record._id,
      patientName: record.user?.name || "Unknown",
      riskScore: record.computed?.riskScore || 0,
      symptoms: record.symptoms || [],
      timestamp: record.date,
      status: record.computed?.riskScore >= 85 ? "CRITICAL" : "HIGH",
    }))
  );
};

const getAllUsers = async (_req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
};

const getAllHealthRecords = async (_req, res) => {
  const records = await HealthRecord.find()
    .populate("user", "name email role isActive pregnancyStatus emergencyContact")
    .sort({ date: -1 });
  res.json(records);
};

const updateUserByAdmin = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (req.body.name !== undefined) user.name = String(req.body.name).trim();
  if (req.body.role !== undefined) user.role = String(req.body.role).toLowerCase();
  if (req.body.isActive !== undefined) {
    user.isActive = Boolean(req.body.isActive);
    user.disabledAt = user.isActive ? null : new Date();
  }

  if (req.body.pregnancyStatus !== undefined) {
    user.pregnancyStatus = Boolean(req.body.pregnancyStatus);
  }

  const updated = await user.save();
  return res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    isActive: updated.isActive,
    disabledAt: updated.disabledAt,
  });
};

const deleteUserByAdmin = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  await Promise.all([
    HealthRecord.deleteMany({ user: user._id }),
    Report.deleteMany({ user: user._id }),
  ]);

  await user.deleteOne();
  return res.json({ message: "User deleted" });
};

const resetMonitoringByAdmin = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const [recordsResult, reportsResult] = await Promise.all([
    HealthRecord.deleteMany({ user: user._id }),
    Report.deleteMany({ user: user._id }),
  ]);

  return res.json({
    message: "Monitoring reset",
    recordsDeleted: recordsResult.deletedCount || 0,
    reportsDeleted: reportsResult.deletedCount || 0,
  });
};

const updateRecordByAdmin = async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Record not found" });

  if (req.body.adminNotes !== undefined) {
    record.adminNotes = String(req.body.adminNotes || "");
  }
  if (req.body.adminStatus !== undefined) {
    record.adminStatus = req.body.adminStatus || null;
  }
  record.reviewedAt = new Date();
  record.reviewedBy = req.user?._id || null;

  const updated = await record.save();
  return res.json(updated);
};

const deleteRecordByAdmin = async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Record not found" });
  await record.deleteOne();
  return res.json({ message: "Record deleted" });
};

const flagRecordCritical = async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Record not found" });
  record.adminStatus = "CRITICAL";
  record.reviewedAt = new Date();
  record.reviewedBy = req.user?._id || null;
  await record.save();
  return res.json({ message: "Record flagged critical" });
};

const markRecordRecovered = async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Record not found" });
  record.adminStatus = "RECOVERED";
  record.reviewedAt = new Date();
  record.reviewedBy = req.user?._id || null;
  await record.save();
  return res.json({ message: "Record marked recovered" });
};

module.exports = {
  getAdminOverview,
  getAdminAlerts,
  getAllUsers,
  getAllHealthRecords,
  updateUserByAdmin,
  deleteUserByAdmin,
  resetMonitoringByAdmin,
  updateRecordByAdmin,
  deleteRecordByAdmin,
  flagRecordCritical,
  markRecordRecovered,
};
