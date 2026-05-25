const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["message", "critical_alert", "admin_reply", "emergency", "high_risk"],
      default: "message",
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: null },
    relatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    read: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
