const fs = require("fs");
const os = require("os");
const path = require("path");
const { unlink, writeFile } = require("fs/promises");
const Groq = require("groq-sdk");

const WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
};

const normalizeLang = (raw) => {
  const value = String(raw || "").toLowerCase();
  if (value.startsWith("bn")) return "bn";
  if (value.startsWith("en")) return "en";
  return undefined;
};

// @desc    Transcribe recorded audio (multipart field: audio)
// @route   POST /api/speech/transcribe
// @access  Public
const transcribeAudio = async (req, res) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ success: false, error: "Audio file is required." });
    }

    const groq = getGroqClient();
    if (!groq) {
      return res.status(503).json({
        success: false,
        error: "Speech service not configured. Add GROQ_API_KEY to server/.env and restart.",
      });
    }

    const ext = path.extname(req.file.originalname || "") || ".webm";
    const tmpPath = path.join(os.tmpdir(), `dengueshield-speech-${Date.now()}${ext}`);

    await writeFile(tmpPath, req.file.buffer);

    try {
      const language = normalizeLang(req.body?.lang);
      const options = {
        file: fs.createReadStream(tmpPath),
        model: WHISPER_MODEL,
        response_format: "json",
        temperature: 0,
      };
      if (language) options.language = language;

      const result = await groq.audio.transcriptions.create(options);
      const transcript = String(result?.text || "").trim();

      if (!transcript) {
        return res.status(422).json({
          success: false,
          error: "No speech detected. Please speak clearly and try again.",
        });
      }

      return res.json({ success: true, transcript });
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  } catch (error) {
    console.error("[Speech Error]:", error.message);
    const status = error?.status || 500;
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      error: "Could not transcribe audio. Please try again.",
    });
  }
};

module.exports = { transcribeAudio };
