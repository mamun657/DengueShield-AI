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

const buildLocalChatReply = (message) => {
  const text = String(message || "").toLowerCase();

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
    // Route through Node.js -> Python /chat for proper RAG pipeline
    const response = await api.post("/rag/ask", { message, history, patient_data });

    if (response.data?.success === false) {
      return { reply: response.data.answer || "AI service error. Please try again." };
    }

    const reply = String(response.data?.answer || "").trim();
    if (!reply) {
      return { reply: buildLocalChatReply(message) };
    }

    if (reply.includes("Groq client not initialized") || reply.includes("Groq error")) {
      return { reply: buildLocalChatReply(message) };
    }

    return {
      reply,
      context: response.data.context || [],
    };
  } catch (err) {
    const errorMsg = err?.response?.data?.answer || err?.response?.data?.message || err.message || "Chat API failed";
    console.error("[Chat API Error]:", errorMsg);
    // Safe medical fallback
    return { reply: "AI service is temporarily unavailable. If you have severe symptoms like bleeding, high fever, or persistent vomiting, please seek medical care immediately." };
  }
};
