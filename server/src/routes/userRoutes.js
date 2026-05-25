const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/authMiddleware");
const { getUserProfile, updateUserProfile, getUserReports, uploadProfilePhoto } = require("../controllers/userController");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

router.route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Upload profile photo
router.post('/profile/photo', protect, upload.single('photo'), uploadProfilePhoto);

router.route("/reports")
  .get(protect, getUserReports);

module.exports = router;
