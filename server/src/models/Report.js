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
    riskScore: { type: Number, required: true },
    symptoms: [{ type: String }],
    summary: { type: String },
    dayOfIllness: { type: Number },
    temperature: { type: Number },
    pregnancyStatus: { type: Boolean, default: false },
    severity: { type: String },
    aiConfidence: { type: Number },
    detectedWarnings: [{ type: String }],
    recommendations: [{ type: String }],
    whoGuidance: { type: String },
    graphReasoning: [{ type: String }],
    graphPath: [{ type: String }],
    clinicalSummary: { type: String },
    emergencyAdvice: { type: String },
    xgboostScore: { type: Number },
    graphBoost: { type: Number },
    finalAssessment: { type: mongoose.Schema.Types.Mixed },
    severityLabel: { type: String },
    displayTitle: { type: String },
    riskMode: { type: String, default: "symptom-only" },
    labPending: { type: Boolean, default: true },
    clinicalSubtitle: { type: String },
    medicalDisclaimer: { type: String },
    aiConfidenceLabel: { type: String, default: "Moderate" },
    triggeredFactors: [{ type: String }],
    nearestHospitals: [
      {
        name: { type: String },
        distance: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
