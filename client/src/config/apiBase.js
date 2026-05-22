const rawApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
const cleanedBase = rawApiBase.replace(/\/$/, "");

export const API_BASE_URL = cleanedBase
  ? cleanedBase.endsWith("/api")
    ? cleanedBase
    : `${cleanedBase}/api`
  : import.meta.env.DEV
    ? "http://localhost:5000/api"
    : "/api";

console.log("[API_BASE]", {
  API_BASE_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE,
});
