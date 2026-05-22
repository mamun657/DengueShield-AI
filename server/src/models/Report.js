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
    
    // IMMUTABLE SNAPSHOT FIELDS - These values are captured at report creation and never updated
    // These prevent report mutation when new scores are calculated
    snapshotData: {
      riskScore: { type: Number, required: true },
      riskLevel: { type: String, required: true },
      severityLabel: { type: String, required: true },
      displayTitle: { type: String, required: true },
      triggeredFactors: [{ type: String }],
      recommendations: [{ type: String }],
      clinicalSubtitle: { type: String },
      medicalDisclaimer: { type: String },
      detectedWarnings: [{ type: String }],
      whoGuidance: { type: String },
      emergencyAdvice: { type: String },
      aiConfidence: { type: Number },
      aiConfidenceLabel: { type: String },
      labPending: { type: Boolean, default: true },
      riskMode: { type: String, default: "symptom-only" },
    },
    
    // Original fields (maintained for backward compatibility)
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

// Prevent accidental mutation of snapshot after creation
ReportSchema.pre("save", function() {
  if (this.isNew && !this.snapshotData) {
    // First save - create immutable snapshot
    this.snapshotData = {
      riskScore: this.riskScore,
      riskLevel: this.riskLevel,
      severityLabel: this.severityLabel,
      displayTitle: this.displayTitle,
      triggeredFactors: this.triggeredFactors,
      recommendations: this.recommendations,
      clinicalSubtitle: this.clinicalSubtitle,
      medicalDisclaimer: this.medicalDisclaimer,
      detectedWarnings: this.detectedWarnings,
      whoGuidance: this.whoGuidance,
      emergencyAdvice: this.emergencyAdvice,
      aiConfidence: this.aiConfidence,
      aiConfidenceLabel: this.aiConfidenceLabel,
      labPending: this.labPending,
      riskMode: this.riskMode,
    };
  }
});

module.exports = mongoose.model("Report", ReportSchema);
