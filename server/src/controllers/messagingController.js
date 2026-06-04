const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  getDefaultAdmin,
  getOrCreateConversation,
  sendMessage,
} = require("../services/messagingService");

const getSocketIo = (req) => req.app.get("io");

const listConversations = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const filter = isAdmin ? { adminId: req.user._id } : { patientId: req.user._id };

    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .populate("patientId", "name email role photoUrl")
      .populate("adminId", "name email role photoUrl")
      .lean();

    return res.json({ success: true, conversations });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isParticipant =
      String(conversation.patientId) === String(req.user._id) ||
      String(conversation.adminId) === String(req.user._id);

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .populate("senderId", "name email role")
      .populate("receiverId", "name email role")
      .lean();

    return res.json({ success: true, messages, conversation });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const postSendMessage = async (req, res) => {
  try {
    const { receiverId, text, conversationId } = req.body || {};
    const io = getSocketIo(req);

    if (conversationId) {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
      }
      const peerId =
        String(conversation.patientId) === String(req.user._id)
          ? conversation.adminId
          : conversation.patientId;
      const result = await sendMessage({
        sender: req.user,
        receiverId: peerId,
        text,
        io,
      });
      return res.status(201).json({ success: true, ...result });
    }

    const result = await sendMessage({
      sender: req.user,
      receiverId: req.user.role === "admin" ? receiverId : undefined,
      text,
      io,
    });
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    const status = error.message.includes("required") ? 400 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

const markConversationRead = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isPatient = String(conversation.patientId) === String(req.user._id);
    const isAdminParticipant = String(conversation.adminId) === String(req.user._id);

    if ((isAdmin && !isAdminParticipant) || (!isAdmin && !isPatient)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await Message.updateMany(
      {
        conversationId: conversation._id,
        receiverId: req.user._id,
        read: false,
      },
      { $set: { read: true, readAt: new Date() } }
    );

    if (isAdmin) {
      conversation.unreadForAdmin = 0;
    } else {
      conversation.unreadForPatient = 0;
    }
    await conversation.save();

    await Notification.updateMany(
      { userId: req.user._id, conversationId: conversation._id, read: false },
      { $set: { read: true } }
    );

    return res.json({ success: true, conversation });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const counts = await countUnreadForUser(req.user);

    return res.json({
      success: true,
      notifications,
      unreadCount: counts.unreadCount,
      messageUnread: counts.messageUnread,
      notificationUnread: counts.notificationUnread,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const countUnreadForUser = async (user) => {
  const notificationUnread = await Notification.countDocuments({
    userId: user._id,
    read: false,
  });

  const conversations = await Conversation.find(
    user.role === "admin" ? { adminId: user._id } : { patientId: user._id }
  ).lean();

  const messageUnread = conversations.reduce((sum, c) => {
    return sum + (user.role === "admin" ? c.unreadForAdmin : c.unreadForPatient);
  }, 0);

  return {
    notificationUnread,
    messageUnread,
    unreadCount: Math.max(notificationUnread, messageUnread),
  };
};

const markNotificationsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body || {};
    const filter = { userId: req.user._id, read: false };

    if (Array.isArray(notificationIds) && notificationIds.length) {
      filter._id = { $in: notificationIds };
    }

    await Notification.updateMany(filter, { $set: { read: true } });

    const counts = await countUnreadForUser(req.user);
    const io = getSocketIo(req);
    const markedIds = Array.isArray(notificationIds) ? notificationIds : [];

    if (io) {
      io.to(`user:${req.user._id}`).emit("notification_read", {
        notificationIds: markedIds,
        unreadCount: counts.unreadCount,
        userId: String(req.user._id),
      });
    }

    return res.json({ success: true, ...counts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const openConversationWithPatient = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const patient = await User.findById(req.params.patientId).select("_id name email role");
    if (!patient || patient.role === "admin") {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const conversation = await getOrCreateConversation(patient._id, req.user._id);
    const populated = await Conversation.findById(conversation._id)
      .populate("patientId", "name email role")
      .populate("adminId", "name email role")
      .lean();

    return res.json({ success: true, conversation: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPatientConversation = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ success: false, message: "Patients only" });
    }
    let conversation = await Conversation.findOne({ patientId: req.user._id }).sort({
      lastMessageAt: -1,
    });
    if (!conversation) {
      const admin = await getDefaultAdmin();
      conversation = await getOrCreateConversation(req.user._id, admin._id);
    }
    const populated = await Conversation.findById(conversation._id)
      .populate("patientId", "name email role")
      .populate("adminId", "name email role")
      .lean();
    return res.json({ success: true, conversation: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listConversations,
  getMessages,
  postSendMessage,
  markConversationRead,
  listNotifications,
  markNotificationsRead,
  openConversationWithPatient,
  getPatientConversation,
};
