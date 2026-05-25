import api from "../api";

export const fetchConversations = () => api.get("/messaging/conversations");
export const fetchPatientConversation = () => api.get("/messaging/conversations/patient/me");
export const openConversationWithPatient = (patientId) =>
  api.get(`/messaging/conversations/with/${patientId}`);
export const fetchMessages = (conversationId) =>
  api.get(`/messaging/conversations/${conversationId}/messages`);
export const sendMessage = (payload) => api.post("/messaging/send", payload);
export const markConversationRead = (conversationId) =>
  api.patch(`/messaging/conversations/${conversationId}/read`);
export const fetchNotifications = () => api.get("/messaging/notifications");
export const markNotificationsRead = (notificationIds) =>
  api.patch("/messaging/notifications/read", { notificationIds });
