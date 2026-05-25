const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  listConversations,
  getMessages,
  postSendMessage,
  markConversationRead,
  listNotifications,
  markNotificationsRead,
  openConversationWithPatient,
  getPatientConversation,
} = require("../controllers/messagingController");

const router = express.Router();

router.get("/conversations", protect, listConversations);
router.get("/conversations/patient/me", protect, getPatientConversation);
router.get("/conversations/with/:patientId", protect, openConversationWithPatient);
router.get("/conversations/:id/messages", protect, getMessages);
router.patch("/conversations/:id/read", protect, markConversationRead);
router.post("/send", protect, postSendMessage);
router.get("/notifications", protect, listNotifications);
router.patch("/notifications/read", protect, markNotificationsRead);

module.exports = router;
