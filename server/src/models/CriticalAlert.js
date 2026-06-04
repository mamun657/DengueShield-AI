const mongoose = require("mongoose");

/**
 * Persistent critical-patient alerts produced by the Critical Patient Agent.
 * Supports alert history and resolution workflow for administrators.
 */
const CriticalAlertSchema = new mongoose.Schema(
  {
    type: { type: String, default: "critical_patient", index: true },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    healthRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HealthRecord",
      default: null,
    },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    classification: {
      type: String,
      enum: ["normal", "watchlist", "critical"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["critical", "watchlist", "normal", "resolved"],
      default: "critical",
      index: true,
    },
    warningSigns: { type: [String], default: [] },
    riskTrend: {
      type: [
        {
          dayOfIllness: Number,
          riskScore: Number,
          date: Date,
        },
      ],
      default: [],
    },
    recommendedAction: { type: String, default: "" },
    decisionReasons: { type: [String], default: [] },
    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

CriticalAlertSchema.index({ patientId: 1, resolved: 1, createdAt: -1 });

module.exports = mongoose.model("CriticalAlert", CriticalAlertSchema);
