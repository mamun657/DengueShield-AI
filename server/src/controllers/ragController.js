const axios = require("axios");
const Groq = require("groq-sdk");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
};

const getMlBaseUrl = () =>
  process.env.ML_API_URL ||
  process.env.PYTHON_API_URL ||
  process.env.VITE_ML_API_URL ||
  "http://127.0.0.1:5001";

const buildMlUrl = (path) => {
  const base = String(getMlBaseUrl()).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

const buildChatPrompt = (text, patient_data) => {
  const patientInfo = patient_data && Object.keys(patient_data).length
    ? JSON.stringify(patient_data)
    : "No additional patient data provided.";

  return [
    {
      role: "system",
      content:
        "You are a professional dengue clinical assistant. Provide clear, safe guidance without making definitive diagnoses. Use WHO-aligned, evidence-based language and avoid personal names.",
    },
    {
      role: "user",
      content: `Patient query: ${text}\n\nPatient info: ${patientInfo}`,
    },
  ];
};

const askGroqDirect = async (text, patient_data) => {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured for direct chat fallback.");
  }

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.1,
    max_tokens: 520,
    messages: buildChatPrompt(text, patient_data),
  });

  const reply = completion?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("Received empty reply from Groq chat service.");
  }

  return reply;
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
    console.log("CHAT REQUEST RECEIVED", {
      path: req.path,
      body: req.body,
      headers: {
        origin: req.headers.origin,
        host: req.headers.host,
        "content-type": req.headers["content-type"],
      },
    });
    const { question, message, patient_data } = req.body;
    const text = question || message;
    console.log("[CHAT ENV] ML_API_URL", process.env.ML_API_URL, "PYTHON_API_URL", process.env.PYTHON_API_URL, "VITE_ML_API_URL", process.env.VITE_ML_API_URL);
    
    if (!text) {
      return res.status(400).json({ success: false, answer: "Question is required" });
    }

    const hasExternalMlService = Boolean(
      process.env.ML_API_URL || process.env.PYTHON_API_URL || process.env.VITE_ML_API_URL
    );

    if (hasExternalMlService) {
      const externalMlUrl = buildMlUrl("/chat");
      console.log("CALLING EXTERNAL ML SERVICE", { url: externalMlUrl, payload: { message: text, patient_data } });
      const response = await axios.post(
        externalMlUrl,
        {
          message: text,
          patient_data: patient_data || {},
        },
        { timeout: 8000 }
      );

      console.log("[EXTERNAL ML RESPONSE]", { status: response.status, data: response.data });

      if (response.status >= 200 && response.status < 300) {
        return res.json({
          success: true,
          answer: response.data.reply || response.data.answer || "Not found in guideline",
          context: response.data.rag_scores || [],
        });
      }

      console.warn("External ML service returned non-2xx status, falling back to direct Groq chat.", {
        status: response.status,
        data: response.data,
      });
    }

    const directReply = await askGroqDirect(text, patient_data);
    return res.json({ success: true, answer: directReply, context: [] });
  } catch (error) {
    console.error("CHAT ERROR:", error.response?.data || error.message || error);
    try {
      const directReply = await askGroqDirect(text, patient_data);
      return res.json({ success: true, answer: directReply, context: [] });
    } catch (fallbackError) {
      console.error("DIRECT GROQ CHAT ERROR:", fallbackError.message || fallbackError);
      return res.json({
        success: true,
        answer: buildLocalChatReply(text),
        context: [],
        warning: "AI service unavailable. Returned safe fallback response.",
      });
    }
  }
};

module.exports = {
  askMedicalQuestion,
};
