import axios from "axios";
import { API_BASE_URL } from "./config/apiBase";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log("[API Request]", {
    method: config.method,
    url: `${config.baseURL || ""}${config.url}`,
    headers: config.headers,
  });
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log("[API Response]", {
      status: response.status,
      url: response.config && `${response.config.baseURL || ""}${response.config.url}`,
      data: response.data,
    });
    return response;
  },
  (error) => {
    if (!error.response && typeof navigator !== "undefined" && !navigator.onLine) {
      error.offline = true;
      error.message = "Network unavailable — data will sync when connection returns.";
    }
    console.error("[API Error]", {
      message: error.message,
      url: error.config && `${error.config.baseURL || ""}${error.config.url}`,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export default api;
