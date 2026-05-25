import { API_BASE_URL } from "../config/apiBase";

export const getSocketUrl = () => API_BASE_URL.replace(/\/api\/?$/i, "");
