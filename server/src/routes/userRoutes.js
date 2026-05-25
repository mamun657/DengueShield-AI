const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/authMiddleware");
const { getUserProfile, updateUserProfile, getUserReports, uploadProfilePhoto } = require("../controllers/userController");

const router = express.Router();
const { UPLOADS_DIR: uploadDir } = require("../config/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt =
      ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp"
        ? ext === ".jpeg"
          ? ".jpg"
          : ext
        : file.mimetype === "image/png"
          ? ".png"
          : ".jpg";
    cb(null, `profile_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Only JPG, PNG or WEBP allowed"));
  },
});

router.route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Upload profile photo
router.post('/profile/photo', protect, upload.single('photo'), uploadProfilePhoto);

router.route("/reports")
  .get(protect, getUserReports);

module.exports = router;
