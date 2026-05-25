import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getSocketUrl } from "../utils/socketUrl";
import {
  fetchConversations,
  fetchMessages,
  fetchNotifications,
  fetchPatientConversation,
  markConversationRead,
  openConversationWithPatient,
  sendMessage as sendMessageApi,
} from "../api/messagingApi";

const MessagingContext = createContext(null);

export const MessagingProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchNotifications();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } catch (error) {
      console.warn("[Messaging] notifications refresh failed", error.message);
    }
  }, [user]);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchConversations();
      setConversations(res.data?.conversations || []);
    } catch (error) {
      console.warn("[Messaging] conversations refresh failed", error.message);
    }
  }, [user]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    const res = await fetchMessages(conversationId);
    setMessages(res.data?.messages || []);
    if (res.data?.conversation) {
      setActiveConversation(res.data.conversation);
    }
    await markConversationRead(conversationId);
    await refreshNotifications();
    await refreshConversations();
  }, [refreshConversations, refreshNotifications]);

  const openChat = useCallback(
    async ({ conversation, conversationId, patientId, patientName } = {}) => {
      if (!user) return;
      setIsPanelOpen(true);
      try {
        if (conversation) {
          setActiveConversation(conversation);
          await loadMessages(conversation._id);
          return;
        }
        if (conversationId) {
          await loadMessages(conversationId);
          return;
        }
        if (isAdmin && patientId) {
          const res = await openConversationWithPatient(patientId);
          const conv = res.data?.conversation;
          setActiveConversation(conv);
          await loadMessages(conv._id);
          return;
        }
        if (!isAdmin) {
          const res = await fetchPatientConversation();
          const conv = res.data?.conversation;
          setActiveConversation(conv);
          await loadMessages(conv._id);
        }
      } catch (error) {
        console.error("[Messaging] open chat failed", error.message);
      }
    },
    [user, isAdmin, loadMessages]
  );

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setTypingUser("");
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = String(text || "").trim();
      if (!trimmed || !activeConversation) return;

      setIsSending(true);
      const peerId = isAdmin
        ? activeConversation.patientId?._id || activeConversation.patientId
        : activeConversation.adminId?._id || activeConversation.adminId;

      try {
        if (socketRef.current?.connected) {
          await new Promise((resolve, reject) => {
            socketRef.current.emit(
              "send_message",
              { receiverId: peerId, text: trimmed },
              (ack) => {
                if (ack?.success) resolve(ack);
                else reject(new Error(ack?.message || "Socket send failed"));
              }
            );
          });
        } else {
          await sendMessageApi({
            conversationId: activeConversation._id,
            receiverId: peerId,
            text: trimmed,
          });
          await loadMessages(activeConversation._id);
        }
        await refreshConversations();
        await refreshNotifications();
      } catch (error) {
        console.error("[Messaging] send failed", error.message);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [activeConversation, isAdmin, loadMessages, refreshConversations, refreshNotifications]
  );

  const emitTyping = useCallback(
    (isTyping) => {
      if (!socketRef.current?.connected || !activeConversation?._id) return;
      socketRef.current.emit("typing", {
        conversationId: activeConversation._id,
        isTyping,
      });
    },
    [activeConversation]
  );

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setNotifications([]);
      setUnreadCount(0);
      setActiveConversation(null);
      setMessages([]);
      return undefined;
    }

    refreshNotifications();
    refreshConversations();

    const token = localStorage.getItem("token");
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("[Socket] connected for messaging");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("receive_message", (payload) => {
      if (payload?.conversation) {
        setConversations((prev) => {
          const id = payload.conversation._id;
          const rest = prev.filter((c) => c._id !== id);
          return [payload.conversation, ...rest];
        });
      }
      if (
        activeConversation?._id &&
        String(payload?.message?.conversationId) === String(activeConversation._id)
      ) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === payload.message._id);
          return exists ? prev : [...prev, payload.message];
        });
      }
      refreshNotifications();
      refreshConversations();
    });

    socket.on("notification", (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      refreshNotifications();
    });

    socket.on("typing", (payload) => {
      if (payload?.conversationId !== activeConversation?._id) return;
      const myId = user?.id || user?._id;
      if (String(payload.userId) === String(myId)) return;
      setTypingUser(payload.isTyping ? payload.userName || "Someone" : "");
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (payload.isTyping) {
        typingTimerRef.current = setTimeout(() => setTypingUser(""), 2500);
      }
    });

    const pollId = setInterval(() => {
      if (!socket.connected) {
        refreshNotifications();
        refreshConversations();
        if (isPanelOpen && activeConversation?._id) {
          loadMessages(activeConversation._id);
        }
      }
    }, 5000);

    return () => {
      clearInterval(pollId);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    user,
    refreshNotifications,
    refreshConversations,
    activeConversation?._id,
    isPanelOpen,
    loadMessages,
  ]);

  useEffect(() => {
    if (activeConversation?._id && socketRef.current?.connected) {
      socketRef.current.emit("join_room", activeConversation._id);
    }
  }, [activeConversation?._id, socketConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPanelOpen, typingUser]);

  const value = useMemo(
    () => ({
      conversations,
      notifications,
      unreadCount,
      activeConversation,
      messages,
      isPanelOpen,
      isSending,
      typingUser,
      socketConnected,
      isAdmin,
      messagesEndRef,
      openChat,
      closePanel,
      setIsPanelOpen,
      sendMessage,
      emitTyping,
      refreshNotifications,
      refreshConversations,
      loadMessages,
    }),
    [
      conversations,
      notifications,
      unreadCount,
      activeConversation,
      messages,
      isPanelOpen,
      isSending,
      typingUser,
      socketConnected,
      isAdmin,
      openChat,
      closePanel,
      sendMessage,
      emitTyping,
      refreshNotifications,
      refreshConversations,
      loadMessages,
    ]
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
};

export const useMessaging = () => {
  const ctx = useContext(MessagingContext);
  if (!ctx) {
    throw new Error("useMessaging must be used within MessagingProvider");
  }
  return ctx;
};
