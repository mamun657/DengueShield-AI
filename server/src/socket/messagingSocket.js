const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendMessage } = require("../services/messagingService");

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

    socket.on("disconnect", () => {
      console.log("[Socket] disconnected", userId);
    });
  });
};

module.exports = { initMessagingSocket };
