import axios from "axios";
import api from "./api";

const mlBaseUrl = import.meta.env.VITE_ML_API_URL || "http://127.0.0.1:5001";

console.log("[ML] Base URL:", mlBaseUrl);

const mlApi = axios.create({
  baseURL: mlBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  validateStatus: () => true,
});

const WHO_WARNING_SIGNS_REPLY =
  "According to the WHO guideline, dengue warning signs include:\n" +
  "1. Persistent vomiting\n" +
  "2. Severe abdominal pain\n" +
  "3. Mucosal bleed (gums, nose, or easy bruising)\n" +
  "4. Restlessness or lethargy\n" +
  "5. Liver enlargement (> 2 cm)\n" +
  "6. Clinical fluid accumulation (ascites, pleural effusion)\n" +
  "7. Rapid decrease in platelet count with rising hematocrit\n\n" +
  "If any warning sign appears, seek urgent medical care immediately. This is guidance only, not a diagnosis.";

const buildLocalChatReply = (message) => {
  const text = String(message || "").toLowerCase();

  if (/(warning sign|warning signs|who warning)/.test(text)) {
    return WHO_WARNING_SIGNS_REPLY;
  }

  if (/(^|\b)(hi|hello|hey|hola|assalam|salam|yo|good morning|good afternoon)(\b|$)/.test(text)) {
    return "Hi! Tell me your symptoms or ask about dengue.";
  }

  if (/(how are you|how r you|how are u|fine|okay|ok|thanks|thank you|uhu|uii|hmm|huh)/.test(text)) {
    return "I am here to help. Tell me your symptoms, and I will guide you.";
  }

  if (/(fever|rash|bleeding|vomit|vomiting|headache|dengue|pain|sore|weakness|nausea)/.test(text)) {
    return "If you have high fever, severe headache, rash, bleeding, or persistent vomiting, seek medical care promptly. Stay hydrated and rest.";
  }

  return "Please describe your symptoms, like fever, rash, headache, bleeding, or vomiting.";
};

const requestWithRetry = async (payload, retries = 1) => {
  const endpoint = "/rag/ask";
  try {
    console.log("[Chat API Request]", {
      url: `${api.defaults.baseURL || ""}${endpoint}`,
      payload,
    });

    const response = await api.post(endpoint, payload);

    console.log("[Chat API Response]", {
      status: response.status,
      url: `${response.config.baseURL || ""}${response.config.url}`,
      data: response.data,
    });

    if (response.status < 200 || response.status >= 300) {
      const errorMessage = response.data?.message || response.data?.answer || `HTTP status ${response.status}`;
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const isTimeout = error.code === "ECONNABORTED" || message?.toLowerCase().includes("timeout");
    const isNetworkError = !error.response;

    console.error("[Chat API Error]", {
      status,
      message,
      url: `${api.defaults.baseURL || ""}${endpoint}`,
      isTimeout,
      isNetworkError,
      responseData: error.response?.data,
    });

    if (retries > 0) {
      console.warn("[Chat API Retry] retrying once after delay", { retriesLeft: retries });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return requestWithRetry(payload, retries - 1);
    }

    throw error;
  }
};

export const predictRisk = async (payload) => {
  console.log("[ML] Sending payload:", payload);

  const response = await mlApi.post("/predict", payload);
  console.log("[ML] Response:", response.status, response.data);

  if (response.status < 200 || response.status >= 300) {
    const message = response.data?.error || response.data?.message || "ML API failed";
    throw new Error(message);
  }

  return response.data;
};

export const sendChatMessage = async ({ message, history, patient_data }) => {
  try {
    const response = await requestWithRetry({ message, history, patient_data }, 1);

    if (response.data?.success === false) {
      return {
        reply: response.data.answer || "AI service error. Please try again.",
        warning: true,
      };
    }

    const reply = String(response.data?.answer || "").trim();
    if (!reply) {
      return { reply: buildLocalChatReply(message), warning: true };
    }

    if (reply.includes("Groq client not initialized") || reply.includes("Groq error")) {
      return { reply: buildLocalChatReply(message), warning: true };
    }

    return {
      reply,
      context: response.data.context || [],
      warning: Boolean(response.data?.warning),
    };
  } catch (err) {
    const errorMsg = err?.response?.data?.answer || err?.response?.data?.message || err.message || "Chat API failed";
    console.error("[Chat API Fatal Error]:", errorMsg);
    return {
      reply:
        "AI service is temporarily unavailable. Please try again in a moment. If you have severe symptoms like bleeding, high fever, or persistent vomiting, seek medical care immediately.",
      warning: true,
    };
  }
};
