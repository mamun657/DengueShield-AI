const warningSigns = [
  "vomiting",
  "abdominal pain",
  "bleeding",
  "restlessness",
  "appetite loss",
];

const getRiskLevel = (score) => {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 35) return "Medium";
  return "Low";
};

const calculateRisk = ({ current, previous }) => {
  const symptomsCount = current.symptoms.length;
  const feverScore = Math.min(Math.max((current.temperature - 37) * 18, 0), 45);
  const durationScore = Math.min(current.dayOfIllness * 5, 30);
  const symptomScore = Math.min(symptomsCount * 3, 25);

  let trendPenalty = 0;
  let feverTrend = "stable";
  let symptomCountChange = 0;

  if (previous) {
    const tempDiff = Number((current.temperature - previous.temperature).toFixed(2));
    symptomCountChange = symptomsCount - previous.symptoms.length;
    if (tempDiff > 0.4) {
      feverTrend = "rising";
      trendPenalty += 8;
    } else if (tempDiff < -0.4) {
      feverTrend = "dropping";
      trendPenalty += 3;
    }
    if (symptomCountChange > 2) trendPenalty += 10;
  }

  const hasWarningSign = current.symptoms.some((symptom) =>
    warningSigns.includes(symptom)
  );
  const inCriticalWindow = current.dayOfIllness >= 3 && current.dayOfIllness <= 7;
  const criticalPhaseAlert = inCriticalWindow && feverTrend === "dropping" && hasWarningSign;
  if (criticalPhaseAlert) trendPenalty += 30;

  const riskScore = Math.min(
    Math.round(feverScore + durationScore + symptomScore + trendPenalty),
    100
  );
  const riskLevel = getRiskLevel(riskScore);

  const reasons = [];
  if (feverScore > 20) reasons.push("High fever increased risk.");
  if (durationScore > 12) reasons.push("Illness duration is within higher-risk period.");
  if (symptomScore > 12) reasons.push("Multiple symptoms are currently reported.");
  if (criticalPhaseAlert) reasons.push("Possible critical phase pattern detected (day 3-7 + fever drop + warning sign).");

  return {
    riskScore,
    riskLevel,
    feverTrend,
    symptomCountChange,
    criticalPhaseAlert,
    explainability: {
      feverContribution: Math.round(feverScore),
      durationContribution: Math.round(durationScore),
      symptomsContribution: Math.round(symptomScore + trendPenalty),
      reasons,
    },
  };
};

module.exports = { calculateRisk };
