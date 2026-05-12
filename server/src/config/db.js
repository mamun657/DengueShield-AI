const mongoose = require("mongoose");

const DEFAULT_DB_NAME = "dengueshield";
const MAX_RETRIES = Number(process.env.MONGODB_MAX_RETRIES || 5);
const RETRY_DELAY_MS = Number(process.env.MONGODB_RETRY_DELAY_MS || 2000);

const buildOptions = () => ({
  dbName: process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME,
  serverSelectionTimeoutMS: 5000,
});

const shouldFallbackToNonSrv = (error) => {
  const message = error?.message || "";
  return (
    message.includes("querySrv") ||
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED")
  );
};

const connectOnce = async (uri) => {
  await mongoose.connect(uri, buildOptions());
  console.log("MongoDB connected");
};

const connectWithRetry = async (uri, attempt = 1) => {
  try {
    console.log(`MongoDB connection attempt ${attempt}/${MAX_RETRIES}`);
    await connectOnce(uri);
  } catch (error) {
    console.error("MongoDB connection failed", error.message);

    const nonSrvUri = process.env.MONGODB_URI_NON_SRV;
    if (nonSrvUri && uri !== nonSrvUri && shouldFallbackToNonSrv(error)) {
      console.warn("Falling back to non-SRV MongoDB URI");
      return connectWithRetry(nonSrvUri, attempt);
    }

    if (attempt >= MAX_RETRIES) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectWithRetry(uri, attempt + 1);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment.");
  }

  await connectWithRetry(uri);
};

module.exports = connectDB;
