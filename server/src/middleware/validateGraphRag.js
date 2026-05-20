const { ALLOWED_SYMPTOMS, normalizeSymptoms } = require("../utils/symptomNormalizer");

const validateAnalyze = (req, res, next) => {
  const body = req.body || {};
  const rawSymptoms = body.symptoms;

  if (!Array.isArray(rawSymptoms) || rawSymptoms.length === 0) {
    return res.status(400).json({
      success: false,
      error: "symptoms must be a non-empty array",
      allowedSymptoms: ALLOWED_SYMPTOMS,
    });
  }

  const symptoms = normalizeSymptoms(rawSymptoms);
  if (!symptoms.length) {
    return res.status(400).json({
      success: false,
      error: "No valid symptoms provided",
      allowedSymptoms: ALLOWED_SYMPTOMS,
    });
  }

  const day = Number(body.day);
  if (!Number.isFinite(day) || day < 1 || day > 21) {
    return res.status(400).json({
      success: false,
      error: "day must be a number between 1 and 21",
    });
  }

  req.graphRagInput = {
    symptoms,
    day,
    extras: body.extras || {},
  };
  return next();
};

module.exports = { validateAnalyze };
