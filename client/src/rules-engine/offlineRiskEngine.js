/**
 * Offline AI Lite — WHO-aligned local clinical scoring (no external APIs).
 */

const LOW_SPECIFICITY_WEIGHTS = {
  headache: 5,
  body_pain: 5,
  fatigue: 4,
  rash: 4,
  eye_pain: 6,
  appetite_loss: 4,
};

const WHO_WARNING_SIGNS = {
  vomiting: 15,
  abdominal_pain: 20,
  restlessness: 18,
  bleeding: 30,
};

const PREGNANCY_MONITORING_BOOST = 5;
const SYMPTOM_ONLY_MAX = 75;

const hasSymptom = (symptoms, key) => {
  const variants = [key, key.replace(/_/g, " ")];
  return variants.some((v) => symptoms.includes(v));
};

const formatFactor = (weight, label) => `+${weight} ${label}`;

const celsiusFromPayload = (temp) => {
  const t = Number(temp);
  if (!Number.isFinite(t) || t <= 0) return null;
  return t > 60 ? t : ((t - 32) * 5) / 9;
};

const fahrenheitFromCelsius = (c) => (c * 9) / 5 + 32;

const feverWeight = (tempC) => {
  if (tempC == null) return { weight: 0, label: null };
  const tempF = fahrenheitFromCelsius(tempC);
  if (tempF < 99) return { weight: 0, label: null };
  if (tempF < 100) return { weight: 3, label: `Fever ${tempF.toFixed(1)}°F` };
  if (tempF < 102) return { weight: 8, label: `Fever ${tempF.toFixed(1)}°F` };
  return { weight: 15, label: `High fever ${tempF.toFixed(1)}°F` };
};

const dayWeight = (day) => {
  if (day <= 2) return { weight: 2, label: `Day ${day} early illness` };
  if (day <= 5) return { weight: 10, label: `Day ${day} critical phase window` };
  return { weight: 5, label: `Day ${day} late phase` };
};

const countWhoWarnings = (symptoms) =>
  Object.keys(WHO_WARNING_SIGNS).filter((k) => hasSymptom(symptoms, k)).length;

const applySafetyCaps = (score, { symptoms, plateletCount, hasPlateletLab }) => {
  let s = score;
  const whoCount = countWhoWarnings(symptoms);
  const hasBleeding = hasSymptom(symptoms, "bleeding");

  if (!hasPlateletLab && whoCount === 0) s = Math.min(s, 50);
  else if (!hasPlateletLab) s = Math.min(s, SYMPTOM_ONLY_MAX);

  const canBeCritical =
    hasBleeding ||
    whoCount >= 2 ||
    (hasPlateletLab && plateletCount < 50000) ||
    (whoCount >= 1 && hasPlateletLab && plateletCount < 100000);

  if (!canBeCritical) s = Math.min(s, 75);

  return Math.max(0, Math.min(100, Math.round(s)));
};

const mapScore = (score) => {
  if (score <= 25) return { riskLevel: "Low Suspicion", severityLabel: "Low", displayTitle: "Low Dengue Suspicion (Offline)" };
  if (score <= 50) return { riskLevel: "Moderate Suspicion", severityLabel: "Moderate", displayTitle: "Moderate Suspicion (Offline)" };
  if (score <= 75) return { riskLevel: "High WHO Warning Risk", severityLabel: "High", displayTitle: "High Risk Suspicion (Offline)" };
  return { riskLevel: "Critical Severe Dengue Risk", severityLabel: "Critical", displayTitle: "Critical Risk (Offline)" };
};

export const calculateOfflineRisk = (payload = {}, previous = null) => {
  const symptoms = (payload.symptoms || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean);
  const tempC = celsiusFromPayload(payload.temperature);
  const day = Math.max(1, Number(payload.dayOfIllness) || 1);
  const plateletRaw = payload.plateletCount ?? payload.labData?.plateletCount;
  const plateletCount =
    plateletRaw != null && plateletRaw !== "" && Number.isFinite(Number(plateletRaw))
      ? Number(plateletRaw)
      : null;
  const hasPlateletLab = plateletCount != null;

  const factors = [];
  const detectedWarnings = [];
  const recommendations = [];
  let score = 0;

  Object.entries(LOW_SPECIFICITY_WEIGHTS).forEach(([symptom, weight]) => {
    if (hasSymptom(symptoms, symptom)) {
      const label = symptom.replace(/_/g, " ");
      score += weight;
      factors.push(formatFactor(weight, label.charAt(0).toUpperCase() + label.slice(1)));
    }
  });

  Object.entries(WHO_WARNING_SIGNS).forEach(([sign, weight]) => {
    if (hasSymptom(symptoms, sign)) {
      const label = sign.replace(/_/g, " ");
      factors.push(formatFactor(weight, label.charAt(0).toUpperCase() + label.slice(1)));
      detectedWarnings.push(label.charAt(0).toUpperCase() + label.slice(1));
      score += weight;
    }
  });

  const fever = feverWeight(tempC);
  if (fever.weight > 0) {
    score += fever.weight;
    factors.push(formatFactor(fever.weight, fever.label));
  }

  const dayInfo = dayWeight(day);
  score += dayInfo.weight;
  factors.push(formatFactor(dayInfo.weight, dayInfo.label));

  if (hasPlateletLab) {
    if (plateletCount < 50000) {
      score += 35;
      factors.push(formatFactor(35, "Platelet count very low"));
    } else if (plateletCount < 100000) {
      score += 25;
      factors.push(formatFactor(25, "Low platelet count"));
    }
  }

  if (payload.pregnancyStatus) {
    score += PREGNANCY_MONITORING_BOOST;
    factors.push(formatFactor(PREGNANCY_MONITORING_BOOST, "Pregnancy monitoring"));
  }

  score = applySafetyCaps(score, { symptoms, plateletCount: plateletCount ?? 0, hasPlateletLab });

  const mapping = mapScore(score);
  const uniqueFactors = [...new Set(factors)];

  if (hasSymptom(symptoms, "bleeding")) {
    recommendations.push("EMERGENCY: Seek immediate hospital care for bleeding");
  }
  if (!recommendations.length) {
    recommendations.push("Drink ORS / fluids and monitor symptoms");
    recommendations.push("Laboratory confirmation when online");
  }
  recommendations.push("Clinical confirmation required — offline estimate only");

  return {
    riskScore: score,
    ...mapping,
    detectedWarnings,
    triggeredFactors: uniqueFactors,
    scoreBreakdown: uniqueFactors,
    recommendations: [...new Set(recommendations)],
    aiConfidence: 0.55,
    aiConfidenceLabel: "Low",
    labPending: !hasPlateletLab,
    riskMode: "offline-lite",
    riskSource: "offline-who-rules-engine",
    offlineMode: true,
    clinicalSubtitle: "Offline AI Lite Mode — WHO-aligned estimate. Not a diagnosis.",
    medicalDisclaimer:
      "Offline clinical risk ESTIMATION only. Laboratory confirmation and physician evaluation are REQUIRED.",
    whoGuidance:
      "Continue oral hydration. Seek urgent care if vomiting, abdominal pain, bleeding, or lethargy develops.",
    emergencyAdvice:
      "Seek immediate hospital care for persistent vomiting, severe abdominal pain, bleeding, restlessness, or drowsiness.",
  };
};

export const buildOfflineHealthRecord = (payload, userId, previous = null) => {
  const safe = {
    temperature: Number(payload.temperature) || 0,
    dayOfIllness: Math.max(1, Number(payload.dayOfIllness) || 1),
    fluidIntakeLiters: Number(payload.fluidIntakeLiters) || 0,
    pregnancyStatus: !!payload.pregnancyStatus,
    symptoms: (payload.symptoms || []).map((s) => String(s).toLowerCase()),
    plateletCount: payload.plateletCount ?? null,
  };
  const computed = calculateOfflineRisk(safe, previous);
  const localId = payload.localId || `local_${Date.now()}`;
  const now = new Date().toISOString();

  return {
    localId,
    _id: localId,
    userId,
    ...safe,
    date: now,
    createdAt: now,
    computed,
    offlineGenerated: true,
  };
};

export default calculateOfflineRisk;
