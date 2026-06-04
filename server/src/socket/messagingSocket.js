const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const { sendMessage } = require("../services/messagingService");

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

  return Math.max(notificationUnread, messageUnread);
};

const initMessagingSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);
    console.log("[Socket] connected", userId, socket.user.role);

    socket.on("join_room", (roomId) => {
      if (roomId) socket.join(String(roomId));
    });

    socket.on("send_message", async (payload, ack) => {
      try {
        const result = await sendMessage({
          sender: socket.user,
          receiverId: payload?.receiverId,
          text: payload?.text,
          io,
        });
        if (typeof ack === "function") ack({ success: true, ...result });
      } catch (error) {
        if (typeof ack === "function") ack({ success: false, message: error.message });
      }
    });

    socket.on("typing", (payload) => {
      const { conversationId, isTyping } = payload || {};
      if (!conversationId) return;
      io.to(String(conversationId)).emit("typing", {
        conversationId,
        userId,
        userName: socket.user.name,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on("notification_read", async (payload) => {
      try {
        const { notificationId, notificationIds } = payload || {};
        const ids = [
          ...(notificationId ? [notificationId] : []),
          ...(Array.isArray(notificationIds) ? notificationIds : []),
        ].filter(Boolean);

        if (!ids.length) return;

        await Notification.updateMany(
          { _id: { $in: ids }, userId: socket.user._id, read: false },
          { $set: { read: true } }
        );

        const unreadCount = await countUnreadForUser(socket.user);

        io.to(`user:${userId}`).emit("notification_read", {
          notificationIds: ids.map(String),
          unreadCount,
          userId,
        });
      } catch (error) {
        console.warn("[Socket] notification_read failed:", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] disconnected", userId);
    });
  });
};

module.exports = { initMessagingSocket };
