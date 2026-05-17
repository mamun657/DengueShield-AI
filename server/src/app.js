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

const app = express();

const parseOrigins = (value) =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://dengueshield-ai.onrender.com",
];
const envOrigins = parseOrigins(process.env.CLIENT_URL || "");
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const isLocalhostDevOrigin = (origin) =>
  /^http:\/\/localhost:5\d{3}$/.test(origin || "");

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || isLocalhostDevOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 150,
  })
);

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/health", healthRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/rag", require("./routes/ragRoutes"));
app.use("/api/speech", require("./routes/speechRoutes"));




app.use((err, _req, res, _next) => {
  return res.status(500).json({
    message: "Server error",
    detail: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = app;
