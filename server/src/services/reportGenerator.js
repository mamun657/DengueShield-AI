const generateDoctorReport = ({ userName, record }) => {
  const warningSigns = record.symptoms.filter((s) =>
    ["vomiting", "abdominal pain", "bleeding", "restlessness"].includes(s)
  );

  const warningText = warningSigns.length ? warningSigns.join(", ") : "None reported.";
  const scoreText = `${record.computed.riskScore}/100`;
  const levelText = record.computed.riskLevel;

  return [
    `Assessment Summary: ${userName} is on day ${record.dayOfIllness} with temperature ${record.temperature}C.`,
    `Detected Warning Signs: ${warningText}`,
    `AI Risk Score: ${scoreText} (${levelText}).`,
    "Recommended Action: Continue hydration and monitor temperature and symptoms every 12-24 hours.",
    "WHO Guidance: Maintain oral rehydration and rest. Seek clinical evaluation if warning signs emerge.",
    "Emergency Advice: Persistent vomiting, bleeding, severe abdominal pain, drowsiness, or very low urine output.",
    "Disclaimer: This AI-generated report is informational and does not replace a licensed physician.",
  ].join("\n");
};

module.exports = { generateDoctorReport };
