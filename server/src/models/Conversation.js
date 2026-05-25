const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    unreadForAdmin: { type: Number, default: 0 },
    unreadForPatient: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ConversationSchema.index({ patientId: 1, adminId: 1 }, { unique: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
