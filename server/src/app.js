const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const healthRoutes = require("./routes/healthRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const { askMedicalQuestion } = require("./controllers/ragController");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://dengueshield-ai.onrender.com",
  "https://dengueshield-ui.onrender.com",
];

if (process.env.CLIENT_URL) {
  const configuredOrigin = process.env.CLIENT_URL.trim();
  if (configuredOrigin && !allowedOrigins.includes(configuredOrigin)) {
    allowedOrigins.push(configuredOrigin);
  }
}

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

console.log("[CORS] Allowed origins:", allowedOrigins);
console.log("[ENV] CLIENT_URL:", process.env.CLIENT_URL || "<not set>");

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "..", "..", "uploads")));
app.use(morgan("dev"));

app.use((req, _res, next) => {
  console.log("[REQUEST]", {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    origin: req.headers.origin,
    host: req.headers.host,
  });
  next();
});
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 150,
  })
);

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
app.get("/api/test-ai", (_req, res) => res.json({ success: true, message: "AI route works" }));
app.post("/api/chat", askMedicalQuestion);
app.post("/api/smart-doctor", askMedicalQuestion);
app.use("/api/auth", authRoutes);
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/rash", require("./routes/rashRoutes"));
app.use("/api/health", healthRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/rag", require("./routes/ragRoutes"));
app.use("/api/speech", require("./routes/speechRoutes"));
app.use("/api/graphrag", require("./routes/graphRagRoutes"));




app.use((err, _req, res, _next) => {
  return res.status(500).json({
    message: "Server error",
    detail: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = app;
