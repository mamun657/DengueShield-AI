const isTemperatureValid = (value) => {
  const temp = Number(value);
  return Number.isFinite(temp) && temp >= 35 && temp <= 43;
};

const toFahrenheit = (celsius) => Math.round((Number(celsius) * 9) / 5 + 32);

const buildAssessmentSummary = (record) => {
  const dayOfIllness = Number(record.dayOfIllness);
  const dayText = Number.isFinite(dayOfIllness)
    ? `on day ${dayOfIllness} of illness`
    : "in the current stage of illness";

  if (isTemperatureValid(record.temperature)) {
    const feverF = toFahrenheit(record.temperature);
    return `Patient is ${dayText} with recorded fever of ${feverF}°F.`;
  }

  const symptoms = Array.isArray(record.symptoms)
    ? record.symptoms.filter(Boolean).map(String)
    : [];

  if (symptoms.length) {
    const symptomText = symptoms.length === 1 ? symptoms[0] : `${symptoms.slice(0, -1).join(", ")} and ${symptoms.slice(-1)}`;
    return `Patient reports ${symptomText} ${dayText}.`;
  }

  return `Patient is ${dayText}. Temperature not recorded.`;
};

const generateDoctorReport = ({ record, assessment }) => {
  const warningSigns = Array.isArray(record.symptoms)
    ? record.symptoms.filter((s) =>
        ["vomiting", "abdominal pain", "bleeding", "restlessness"].includes(String(s).toLowerCase())
      )
    : [];

  const warningText = warningSigns.length ? warningSigns.join(", ") : "None reported.";
  const resolved = assessment || record.computed || {};
  const scoreText = `${resolved.riskScore ?? 0}/100`;
  const levelText = resolved.riskLevel || "Low";

  return [
    `Assessment Summary: ${buildAssessmentSummary(record)}`,
    `Detected Warning Signs: ${warningText}`,
    `AI Risk Score: ${scoreText} (${levelText}).`,
    "Recommended Action: Continue hydration and monitor temperature and symptoms every 12-24 hours.",
    "WHO Guidance: Maintain oral rehydration and rest. Seek clinical evaluation if warning signs emerge.",
    "Emergency Advice: Persistent vomiting, bleeding, severe abdominal pain, drowsiness, or very low urine output.",
    "Disclaimer: This AI-generated report is informational and does not replace a licensed physician.",
  ].join("\n");
};

module.exports = { generateDoctorReport };
