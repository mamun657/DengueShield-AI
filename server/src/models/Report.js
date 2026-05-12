const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    latestRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HealthRecord",
      required: true,
    },
    reportText: { type: String, required: true },
    riskLevel: { type: String, required: true },
    riskScore: { type: Number, default: 0 },
    symptoms: [{ type: String }],
    summary: { type: String },
    nearestHospitals: [
      {
        name: { type: String },
        distance: { type: String }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
