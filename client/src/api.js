import axios from "axios";

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${baseUrl}/api`,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response && !navigator.onLine) {
      error.offline = true;
      error.message = "Network unavailable — data will sync when connection returns.";
    }
    return Promise.reject(error);
  }
);

export default api;
