const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");

const countUnreadForUser = async (user) => {
  const notificationUnread = await Notification.countDocuments({
    userId: user._id,
    read: false,
  });

  const conversations = await Conversation.find(
    user.role === "admin" ? { adminId: user._id } : { patientId: user._id }
  ).lean();

  const messageUnread = conversations.reduce((sum, conversation) => {
    return sum + (user.role === "admin" ? conversation.unreadForAdmin : conversation.unreadForPatient);
  }, 0);

  return {
    notificationUnread,
    messageUnread,
    unreadCount: Math.max(notificationUnread, messageUnread),
  };
};

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
  if (!record?.user) return null;

  const { dispatchImmediateRiskNotifications } = require("./riskNotificationService");
  return dispatchImmediateRiskNotifications(record, io);
};

module.exports = {
  getDefaultAdmin,
  getOrCreateConversation,
  createNotification,
  sendMessage,
  evaluateRiskNotifications,
  emitToUser,
  countUnreadForUser,
};
