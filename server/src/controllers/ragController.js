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

const isLoopbackMlUrl = (url) => /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/i.test(String(url || ""));

const shouldCallExternalMl = () => {
  const configured = Boolean(
    process.env.ML_API_URL || process.env.PYTHON_API_URL || process.env.VITE_ML_API_URL
  );
  if (!configured) return false;

  const base = getMlBaseUrl();
  if (process.env.NODE_ENV === "production" && isLoopbackMlUrl(base)) {
    console.warn(
      "[CHAT] Skipping external ML in production because ML_API_URL points to localhost:",
      base
    );
    return false;
  }

  return true;
};

// @desc    Ask a medical question to the AI using RAG
// @route   POST /api/rag/ask
// @access  Public
const askMedicalQuestion = async (req, res) => {
  const { question, message, patient_data } = req.body || {};
  const text = String(question || message || "").trim();

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
    console.log(
      "[CHAT ENV]",
      "ML_API_URL",
      process.env.ML_API_URL,
      "PYTHON_API_URL",
      process.env.PYTHON_API_URL,
      "GROQ",
      Boolean(process.env.GROQ_API_KEY)
    );

    if (!text) {
      return res.status(400).json({ success: false, answer: "Question is required" });
    }

    if (shouldCallExternalMl()) {
      const externalMlUrl = buildMlUrl("/chat");
      try {
        console.log("CALLING EXTERNAL ML SERVICE", {
          url: externalMlUrl,
          payload: { message: text, patient_data },
        });
        const response = await axios.post(
          externalMlUrl,
          {
            message: text,
            patient_data: patient_data || {},
          },
          { timeout: 8000, validateStatus: () => true }
        );

        console.log("[EXTERNAL ML RESPONSE]", { status: response.status, data: response.data });

        if (response.status >= 200 && response.status < 300) {
          const answer = response.data?.reply || response.data?.answer;
          if (answer) {
            return res.json({
              success: true,
              answer,
              context: response.data?.rag_scores || [],
            });
          }
        }

        console.warn("External ML service unavailable or empty, falling back to Groq.", {
          status: response.status,
          data: response.data,
        });
      } catch (mlError) {
        console.warn(
          "External ML service request failed, falling back to Groq.",
          mlError.response?.status || mlError.message
        );
      }
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
