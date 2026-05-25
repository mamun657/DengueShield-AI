const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const resolveMlBase = () => {
  const raw = process.env.ML_API_URL || process.env.ML_API_BASE_URL || "http://127.0.0.1:5001";
  return raw.replace(/\/$/, "");
};

router.post("/predict", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "Image file is required" });
  }

  const mlBase = resolveMlBase();
  if (!mlBase) {
    return res.status(503).json({ success: false, error: "ML service is not configured" });
  }

  try {
    const formData = new FormData();
    formData.append("image", req.file.buffer, {
      filename: req.file.originalname || "rash.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    const response = await axios.post(`${mlBase}/api/rash/predict`, formData, {
      headers: formData.getHeaders(),
      timeout: 60000,
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 502;
    const payload =
      error.response?.data ||
      ({ success: false, error: "Rash prediction failed" });
    return res.status(status).json(payload);
  }
});

module.exports = router;
