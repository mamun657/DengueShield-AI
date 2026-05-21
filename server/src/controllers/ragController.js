const axios = require("axios");

const getMlBaseUrl = () =>
  process.env.ML_API_URL ||
  process.env.PYTHON_API_URL ||
  process.env.VITE_ML_API_URL ||
  "http://127.0.0.1:5001";

const buildMlUrl = (path) => {
  const base = String(getMlBaseUrl()).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

const buildLocalChatReply = (message) => {
  const text = String(message || "").toLowerCase();

  if (/(^|\b)(hi|hello|hey|hola|assalam|salam|good morning|good afternoon)(\b|$)/.test(text)) {
    return "Hi! Tell me your symptoms or ask about dengue.";
  }

  if (/(how are you|how r you|how are u|thanks|thank you|ok|okay)/.test(text)) {
    return "I am here to help. Tell me your symptoms, and I will guide you.";
  }

  if (/(fever|rash|bleeding|vomit|vomiting|headache|dengue|pain|weakness|nausea)/.test(text)) {
    return "Your symptoms may indicate elevated dengue risk based on WHO warning patterns. I cannot confirm a diagnosis without clinical and laboratory evaluation. Please seek medical care if you have high fever, rash, bleeding, or persistent vomiting. Stay hydrated and rest.";
  }

  return "Please describe your symptoms (fever, rash, headache, bleeding, vomiting). I provide probabilistic risk guidance, not a definitive diagnosis.";
};

// @desc    Ask a medical question to the AI using RAG
// @route   POST /api/rag/ask
// @access  Public
const askMedicalQuestion = async (req, res) => {
  try {
    const { question, message, patient_data } = req.body;
    const text = question || message;
    
    if (!text) {
      return res.status(400).json({ success: false, answer: "Question is required" });
    }

    const response = await axios.post(
      buildMlUrl("/chat"),
      {
        message: text,
        patient_data: patient_data || {},
      },
      { timeout: 8000 }
    );

    // Return structured JSON
    return res.json({
      success: true,
      answer: response.data.reply || response.data.answer || "Not found in guideline",
      context: response.data.rag_scores || []
    });

  } catch (error) {
    console.error("[Chatbot Error]:", error.message);
    return res.json({
      success: true,
      answer: buildLocalChatReply(text),
      context: [],
      warning: "AI service unavailable. Returned safe fallback response.",
    });
  }
};

module.exports = {
  askMedicalQuestion,
};
