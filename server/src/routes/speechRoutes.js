const express = require("express");
const multer = require("multer");
const { transcribeAudio } = require("../controllers/speechController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith("audio/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only audio uploads are allowed"));
  },
});

router.post("/transcribe", (req, res, next) => {
  upload.single("audio")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message || "Invalid audio upload." });
    }
    return next();
  });
}, transcribeAudio);

module.exports = router;
