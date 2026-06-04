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
  markNotificationsRead,
  openConversationWithPatient,
  sendMessage as sendMessageApi,
} from "../api/messagingApi";

const MessagingContext = createContext(null);
const SOCKET_SEND_TIMEOUT_MS = 12000;
const REFRESH_DEBOUNCE_MS = 2000;
const POLL_INTERVAL_MS = 30000;

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
  const activeConversationRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const isPanelOpenRef = useRef(false);

  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    isPanelOpenRef.current = isPanelOpen;
  }, [isPanelOpen]);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchNotifications();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } catch (error) {
      const status = error?.response?.status;
      if (status !== 429) {
        console.warn("[Messaging] notifications refresh failed", error.message);
      }
    }
  }, [user]);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchConversations();
      setConversations(res.data?.conversations || []);
    } catch (error) {
      const status = error?.response?.status;
      if (status !== 429) {
        console.warn("[Messaging] conversations refresh failed", error.message);
      }
    }
  }, [user]);

  const scheduleBackgroundRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshNotifications();
      refreshConversations();
    }, REFRESH_DEBOUNCE_MS);
  }, [refreshConversations, refreshNotifications]);

  const markNotificationAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId || !user) return;

      const target = notifications.find((n) => String(n._id) === String(notificationId));
      const wasUnread = Boolean(target && !target.read);

      if (wasUnread) {
        setNotifications((prev) =>
          prev.map((n) =>
            String(n._id) === String(notificationId) ? { ...n, read: true } : n
          )
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }

      try {
        const res = await markNotificationsRead([notificationId]);
        if (res.data?.unreadCount != null) {
          setUnreadCount(Number(res.data.unreadCount));
        }
      } catch (error) {
        console.warn("[Messaging] mark notification read failed", error.message);
        scheduleBackgroundRefresh();
        return;
      }

      setNotifications((prev) =>
        prev.map((n) =>
          String(n._id) === String(notificationId) ? { ...n, read: true } : n
        )
      );
    },
    [user, notifications, scheduleBackgroundRefresh]
  );

  const applyNotificationReadSync = useCallback((payload) => {
    const myId = user?.id || user?._id;
    if (payload?.userId && String(payload.userId) !== String(myId)) return;

    const ids = (payload?.notificationIds || []).map(String);
    if (ids.length) {
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(String(n._id)) ? { ...n, read: true } : n))
      );
    }

    if (payload?.unreadCount != null) {
      setUnreadCount(Number(payload.unreadCount));
    }
  }, [user]);

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      try {
        const res = await fetchMessages(conversationId);
        setMessages(res.data?.messages || []);
        if (res.data?.conversation) {
          setActiveConversation(res.data.conversation);
        }
        await markConversationRead(conversationId);
        scheduleBackgroundRefresh();
      } catch (error) {
        console.error("[Messaging] load messages failed", error.message);
        throw error;
      }
    },
    [scheduleBackgroundRefresh]
  );

  const openChat = useCallback(
    async ({ conversation, conversationId, patientId } = {}) => {
      if (!user) return;
      setIsPanelOpen(true);
      setIsSending(false);
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
    setIsSending(false);
  }, []);

  const appendMessage = useCallback((message) => {
    if (!message?._id) return;
    setMessages((prev) => {
      const exists = prev.some((m) => String(m._id) === String(message._id));
      return exists ? prev : [...prev, message];
    });
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = String(text || "").trim();
      const conversation = activeConversationRef.current;
      if (!trimmed || !conversation?._id) {
        throw new Error("Conversation is not ready. Close and reopen chat.");
      }

      setIsSending(true);
      const peerId = isAdmin
        ? conversation.patientId?._id || conversation.patientId
        : conversation.adminId?._id || conversation.adminId;

      try {
        if (socketRef.current?.connected) {
          const ack = await Promise.race([
            new Promise((resolve, reject) => {
              socketRef.current.emit(
                "send_message",
                { receiverId: peerId, text: trimmed },
                (response) => {
                  if (response?.success) resolve(response);
                  else reject(new Error(response?.message || "Socket send failed"));
                }
              );
            }),
            new Promise((_, reject) => {
              setTimeout(
                () => reject(new Error("Message send timed out. Please try again.")),
                SOCKET_SEND_TIMEOUT_MS
              );
            }),
          ]);

          if (ack?.message) {
            appendMessage(ack.message);
          }
          if (ack?.conversation) {
            setActiveConversation(ack.conversation);
            setConversations((prev) => {
              const id = ack.conversation._id;
              const rest = prev.filter((c) => String(c._id) !== String(id));
              return [ack.conversation, ...rest];
            });
          }
        } else {
          const res = await sendMessageApi({
            conversationId: conversation._id,
            receiverId: peerId,
            text: trimmed,
          });
          if (res.data?.message) appendMessage(res.data.message);
          await loadMessages(conversation._id);
        }
      } catch (error) {
        console.error("[Messaging] send failed", error.message);
        throw error;
      } finally {
        setIsSending(false);
      }

      scheduleBackgroundRefresh();
    },
    [isAdmin, loadMessages, appendMessage, scheduleBackgroundRefresh]
  );

  const emitTyping = useCallback((isTyping) => {
    const conversation = activeConversationRef.current;
    if (!socketRef.current?.connected || !conversation?._id) return;
    socketRef.current.emit("typing", {
      conversationId: conversation._id,
      isTyping,
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setNotifications([]);
      setUnreadCount(0);
      setActiveConversation(null);
      setMessages([]);
      setIsSending(false);
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
          const rest = prev.filter((c) => String(c._id) !== String(id));
          return [payload.conversation, ...rest];
        });
      }

      const activeId = activeConversationRef.current?._id;
      if (
        activeId &&
        payload?.message &&
        String(payload.message.conversationId) === String(activeId)
      ) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m._id) === String(payload.message._id));
          return exists ? prev : [...prev, payload.message];
        });
      }

      if (payload?.notification) {
        setNotifications((prev) => [payload.notification, ...prev].slice(0, 50));
      }
    });

    socket.on("notification", (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
    });

    socket.on("notification_read", (payload) => {
      applyNotificationReadSync(payload);
    });

    socket.on("typing", (payload) => {
      const activeId = activeConversationRef.current?._id;
      if (!activeId || payload?.conversationId !== activeId) return;
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
        scheduleBackgroundRefresh();
        const activeId = activeConversationRef.current?._id;
        if (isPanelOpenRef.current && activeId) {
          loadMessages(activeId).catch(() => {});
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollId);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [
    user,
    refreshNotifications,
    refreshConversations,
    scheduleBackgroundRefresh,
    loadMessages,
    applyNotificationReadSync,
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
      markNotificationAsRead,
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
      markNotificationAsRead,
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
