const mongoose = require("mongoose");

const HealthRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now, index: true },
    dayOfIllness: { type: Number, required: true, min: 1 },
    temperature: { type: Number, required: true },
    symptoms: [{ type: String }],
    fluidIntakeLiters: { type: Number, default: 0 },
    pregnancyStatus: { type: Boolean, default: false },
    rashImageUrl: { type: String, default: null },
    rashImageAssessment: { type: String, default: null },
    adminNotes: { type: String, default: "" },
    adminStatus: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MODERATE", "LOW", "RECOVERED", "FLAGGED"],
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    computed: {
      feverTrend: { type: String, default: "stable" },
      symptomCountChange: { type: Number, default: 0 },
      riskScore: { type: Number, default: 0 },
      riskLevel: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        default: "Low",
      },
      explainability: {
        feverContribution: { type: Number, default: 0 },
        durationContribution: { type: Number, default: 0 },
        symptomsContribution: { type: Number, default: 0 },
        reasons: [{ type: String }],
      },
      criticalPhaseAlert: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HealthRecord", HealthRecordSchema);
