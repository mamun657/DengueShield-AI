const express = require("express");
const multer = require("multer");
const {
  createHealthRecord,
  getMyDashboard,
  uploadRashImageMock,
  getFamilyShareLink,
  getFamilyView,
} = require("../controllers/healthController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/dashboard", protect, getMyDashboard);
router.post("/records", protect, createHealthRecord);
router.post("/records/:recordId/rash", protect, upload.single("rashImage"), uploadRashImageMock);
router.post("/family/share-link", protect, getFamilyShareLink);
router.get("/family/:token", getFamilyView);

module.exports = router;
