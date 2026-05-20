/**
 * Maps dashboard / free-text symptoms to graph node IDs (snake_case).
 */
const ALIASES = {
  fever_drop: ["fever_drop", "fever drop", "temperature drop", "defervescence"],
  abdominal_pain: ["abdominal_pain", "abdominal pain", "stomach pain", "belly pain"],
  vomiting: ["vomiting", "vomit", "persistent vomiting"],
  bleeding: ["bleeding", "blood", "hemorrhage", "petechiae"],
  rash: ["rash", "skin rash"],
  dehydration: ["dehydration", "dehydrated", "dry mouth"],
  headache: ["headache", "head pain"],
  eye_pain: ["eye_pain", "eye pain", "retro orbital pain"],
  fatigue: ["fatigue", "weakness", "tiredness", "lethargy"],
  restlessness: ["restlessness", "irritability"],
  appetite_loss: ["appetite_loss", "appetite loss", "no appetite"],
};

const ALLOWED_SYMPTOMS = Object.keys(ALIASES);

const normalizeSymptomId = (raw) => {
  const value = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  for (const [id, aliases] of Object.entries(ALIASES)) {
    if (id === value || aliases.some((a) => a.replace(/\s+/g, "_") === value || a === String(raw).trim().toLowerCase())) {
      return id;
    }
  }
  return ALLOWED_SYMPTOMS.includes(value) ? value : null;
};

const normalizeSymptoms = (symptoms = []) => {
  const ids = new Set();
  for (const item of symptoms) {
    const id = normalizeSymptomId(item);
    if (id) ids.add(id);
  }
  return [...ids];
};

const toMlPayload = (symptoms, day = 4, extras = {}) => {
  const ids = normalizeSymptoms(symptoms);
  return {
    day: Number(day) || 4,
    temp: Number(extras.temp ?? (ids.includes("fever_drop") ? 37.2 : 38.5)),
    days_high_fever: Number(extras.days_high_fever ?? day),
    fluid: Number(extras.fluid ?? 2),
    headache: ids.includes("headache"),
    vomiting: ids.includes("vomiting"),
    abdominal_pain: ids.includes("abdominal_pain"),
    bleeding: ids.includes("bleeding"),
    fatigue: ids.includes("fatigue"),
    rash: ids.includes("rash"),
    eye_pain: ids.includes("eye_pain"),
    appetite_loss: ids.includes("appetite_loss"),
    restlessness: ids.includes("restlessness"),
    pregnant: !!extras.pregnant,
  };
};

module.exports = {
  ALIASES,
  ALLOWED_SYMPTOMS,
  normalizeSymptomId,
  normalizeSymptoms,
  toMlPayload,
};
