const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");

const getDefaultAdmin = async () => {
  const admin = await User.findOne({ role: "admin", isActive: { $ne: false } }).select(
    "_id name email role"
  );
  if (!admin) throw new Error("No admin account available for messaging");
  return admin;
};

const getOrCreateConversation = async (patientId, adminId) => {
  let conversation = await Conversation.findOne({ patientId, adminId });
  if (!conversation) {
    conversation = await Conversation.create({
      patientId,
      adminId,
      lastMessage: "",
      lastMessageAt: new Date(),
    });
  }
  return conversation;
};

const createNotification = async ({
  userId,
  type,
  title,
  body,
  conversationId,
  relatedUserId,
  metadata,
}) => {
  return Notification.create({
    userId,
    type,
    title,
    body: body || "",
    conversationId: conversationId || null,
    relatedUserId: relatedUserId || null,
    metadata: metadata || {},
  });
};

const emitToUser = (io, userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
};

const sendMessage = async ({ sender, receiverId, text, io }) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("Message text is required");

  const senderRole = sender.role === "admin" ? "admin" : "user";
  let patientId;
  let adminId;

  if (senderRole === "admin") {
    if (!receiverId) throw new Error("receiverId is required for admin messages");
    const patient = await User.findById(receiverId).select("_id role name email");
    if (!patient || patient.role === "admin") {
      throw new Error("Invalid patient recipient");
    }
    patientId = patient._id;
    adminId = sender._id;
  } else {
    patientId = sender._id;
    const existing = await Conversation.findOne({ patientId: sender._id }).sort({
      lastMessageAt: -1,
    });
    if (existing) {
      adminId = existing.adminId;
    } else if (receiverId) {
      adminId = receiverId;
    } else {
      const admin = await getDefaultAdmin();
      adminId = admin._id;
    }
  }

  const conversation = await getOrCreateConversation(patientId, adminId);
  const receiver =
    senderRole === "admin"
      ? await User.findById(patientId).select("_id name email role")
      : await User.findById(adminId).select("_id name email role");

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: sender._id,
    receiverId: receiver._id,
    senderRole,
    text: trimmed,
    read: false,
  });

  const unreadForAdmin = senderRole === "user" ? conversation.unreadForAdmin + 1 : 0;
  const unreadForPatient = senderRole === "admin" ? conversation.unreadForPatient + 1 : 0;

  conversation.lastMessage = trimmed;
  conversation.lastMessageAt = message.createdAt;
  if (senderRole === "user") {
    conversation.unreadForAdmin = unreadForAdmin;
  } else {
    conversation.unreadForPatient = unreadForPatient;
  }
  await conversation.save();

  const populated = await Message.findById(message._id)
    .populate("senderId", "name email role")
    .populate("receiverId", "name email role")
    .lean();

  const notificationType = senderRole === "admin" ? "admin_reply" : "message";
  const notification = await createNotification({
    userId: receiver._id,
    type: notificationType,
    title: senderRole === "admin" ? "Message from care team" : "New patient message",
    body: trimmed.slice(0, 160),
    conversationId: conversation._id,
    relatedUserId: sender._id,
  });

  const payload = {
    message: populated,
    conversation: await Conversation.findById(conversation._id)
      .populate("patientId", "name email role")
      .populate("adminId", "name email role")
      .lean(),
    notification,
  };

  emitToUser(io, String(receiver._id), "receive_message", payload);
  emitToUser(io, String(sender._id), "receive_message", payload);
  emitToUser(io, String(receiver._id), "notification", notification);

  return payload;
};

const evaluateRiskNotifications = async (record, io) => {
  if (!record?.user) return;

  const patient = await User.findById(record.user).select("name email");
  if (!patient) return;

  const admin = await getDefaultAdmin().catch(() => null);
  if (!admin) return;

  const score = Number(record.computed?.riskScore || 0);
  const level = String(record.computed?.riskLevel || "").toUpperCase();
  const temp = Number(record.temperature || 0);
  const symptoms = (record.symptoms || []).map((s) => String(s).toLowerCase());
  const emergencySymptoms = ["bleeding", "restlessness", "vomiting", "abdominal pain"];
  const hasEmergency = emergencySymptoms.some((s) => symptoms.includes(s));

  const triggers = [];

  if (level === "CRITICAL" || score >= 80) {
    triggers.push({
      type: "critical_alert",
      title: "Critical patient alert",
      body: `${patient.name || "Patient"} risk is CRITICAL (${score}/100). Immediate review recommended.`,
    });
  } else if (level === "HIGH" || score >= 65) {
    triggers.push({
      type: "high_risk",
      title: "High-risk patient alert",
      body: `${patient.name || "Patient"} entered HIGH risk (${score}/100).`,
    });
  }

  if (temp >= 39.5) {
    triggers.push({
      type: "critical_alert",
      title: "High fever alert",
      body: `${patient.name || "Patient"} reported fever ${temp}°C.`,
    });
  }

  if (hasEmergency) {
    triggers.push({
      type: "emergency",
      title: "Emergency signs detected",
      body: `${patient.name || "Patient"} reported warning signs: ${symptoms.join(", ")}.`,
    });
  }

  const conversation = await getOrCreateConversation(patient._id, admin._id);

  for (const trigger of triggers) {
    const notification = await createNotification({
      userId: admin._id,
      type: trigger.type,
      title: trigger.title,
      body: trigger.body,
      conversationId: conversation._id,
      relatedUserId: patient._id,
      metadata: { recordId: record._id, riskScore: score, riskLevel: level },
    });
    emitToUser(io, String(admin._id), "notification", notification);
  }
};

module.exports = {
  getDefaultAdmin,
  getOrCreateConversation,
  createNotification,
  sendMessage,
  evaluateRiskNotifications,
  emitToUser,
};
