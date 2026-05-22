/**
 * WHO-Aligned Clinical Dengue Risk Scoring Engine
 * ===================================================
 * 
 * IMPORTANT: This system does NOT diagnose dengue.
 * It estimates dengue RISK probability based on:
 * - Weighted symptom specificity
 * - Fever severity and progression
 * - Illness day critical phase windows
 * - WHO warning sign escalation
 * - Laboratory evidence (when available)
 * 
 * Symptoms overlap with COVID-19, influenza, malaria, typhoid, chikungunya.
 * Laboratory confirmation (CBC, NS1, physician evaluation) is REQUIRED for diagnosis.
 * 
 * Research basis:
 * - WHO dengue warning signs from clinical guidelines
 * - Published meta-analysis on symptom specificity
 * - Clinical risk estimation principles for probabilistic triage
 */

const MEDICAL_DISCLAIMER = 
  "This AI system provides early clinical risk ESTIMATION and does not diagnose dengue. " +
  "Symptoms may overlap with COVID-19, influenza, malaria, typhoid, and other febrile illnesses. " +
  "Laboratory confirmation via CBC, Platelet count, NS1 test, or physician evaluation is REQUIRED.";

const SYMPTOM_ONLY_MAX = 75;  // Low-specificity symptoms alone cannot reach CRITICAL
const LAB_CRITICAL_MIN = 76;

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

const hasSymptom = (symptoms, key) => {
  const list = Array.isArray(symptoms) ? symptoms : [];
  const variants = [key, key.replace(/_/g, " ")];
  return variants.some((v) => list.includes(v));
};

const formatFactorExplanation = (weight, label) => `+${weight} ${label}`;

/**
 * LABORATORY INDICATORS
 * Confirm or escalate risk based on objective findings
 */
const LABORATORY_WEIGHTS = {
  platelet_drop: 25,               // Thrombocytopenia (critical in dengue)
  hematocrit_rise: 20,             // Plasma leakage marker
  fluid_accumulation: 30,          // Pleural effusion / ascites (severe)
  shock: 40,                        // EMERGENCY: circulatory collapse
  severe_bleeding: 40,             // EMERGENCY: hemorrhagic manifestation
  ast_alt_abnormal: 20,            // Hepatic dysfunction
};

const calculateFeverWeight = (tempCelsius) => {
  const temp = Number(tempCelsius);
  if (!Number.isFinite(temp) || temp <= 0) return { weight: 0, label: null };
  const tempF = temp > 60 ? temp : (temp * 9) / 5 + 32;
  if (tempF < 99) return { weight: 0, label: null };
  if (tempF < 100) return { weight: 3, label: `Fever ${tempF.toFixed(1)}°F` };
  if (tempF < 102) return { weight: 8, label: `Fever ${tempF.toFixed(1)}°F` };
  if (tempF < 104) return { weight: 15, label: `High fever ${tempF.toFixed(1)}°F` };
  return { weight: 15, label: `High fever ${tempF.toFixed(1)}°F` };
};

const calculateDayWeight = (dayOfIllness) => {
  const day = Math.max(1, Number(dayOfIllness) || 1);
  if (day <= 2) return { weight: 2, label: `Day ${day} early illness` };
  if (day <= 5) return { weight: 10, label: `Day ${day} critical phase window` };
  return { weight: 5, label: `Day ${day} late phase` };
};

const countWhoWarningSigns = (symptoms) =>
  Object.keys(WHO_WARNING_SIGNS).filter((key) => hasSymptom(symptoms, key)).length;

const applyClinicalSafetyCaps = (score, { symptoms, labData, hasLab }) => {
  let finalScore = score;
  const whoCount = countWhoWarningSigns(symptoms);
  const hasBleeding = hasSymptom(symptoms, "bleeding");
  const platelet = labData?.plateletCount != null ? Number(labData.plateletCount) : null;
  const hasPlateletLab = platelet != null && Number.isFinite(platelet);

  if (!hasLab && whoCount === 0) {
    finalScore = Math.min(finalScore, 50);
  } else if (!hasLab) {
    finalScore = Math.min(finalScore, SYMPTOM_ONLY_MAX);
  }

  const canBeCritical =
    hasBleeding ||
    whoCount >= 2 ||
    (hasPlateletLab && platelet < 50000) ||
    (whoCount >= 1 && hasPlateletLab && platelet < 100000);

  if (!canBeCritical) {
    finalScore = Math.min(finalScore, 75);
  }

  return normalizeScore(finalScore);
};

/**
 * Normalize score to 0-100 range
 */
const normalizeScore = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

/**
 * Build explainable reasoning for each factor
 */
const buildExplainableFactors = (symptoms, tempCelsius, dayOfIllness, labData, pregnancyStatus = false) => {
  const factors = [];
  const explanations = {};
  
  Object.entries(LOW_SPECIFICITY_WEIGHTS).forEach(([symptom, weight]) => {
    if (hasSymptom(symptoms, symptom)) {
      const key = symptom.replace(/_/g, " ");
      factors.push({
        factor: key,
        weight,
        category: "low-specificity",
        explanation: formatFactorExplanation(weight, key.charAt(0).toUpperCase() + key.slice(1)),
      });
    }
  });

  const fever = calculateFeverWeight(tempCelsius);
  if (fever.weight > 0) {
    factors.push({
      factor: fever.label,
      weight: fever.weight,
      category: "fever-severity",
      explanation: formatFactorExplanation(fever.weight, fever.label),
    });
  }

  const dayInfo = calculateDayWeight(dayOfIllness);
  factors.push({
    factor: dayInfo.label,
    weight: dayInfo.weight,
    category: "illness-progression",
    explanation: formatFactorExplanation(dayInfo.weight, dayInfo.label),
  });

  Object.entries(WHO_WARNING_SIGNS).forEach(([warning, weight]) => {
    if (hasSymptom(symptoms, warning)) {
      const key = warning.replace(/_/g, " ");
      factors.push({
        factor: key,
        weight,
        category: "who-warning-sign",
        explanation: formatFactorExplanation(weight, key.charAt(0).toUpperCase() + key.slice(1)),
      });
    }
  });
  
  if (labData && labData.plateletCount != null && Number.isFinite(Number(labData.plateletCount))) {
    const pc = Number(labData.plateletCount);
    if (pc < 50000) {
      factors.push({
        factor: `platelet ${pc}`,
        weight: 35,
        category: "laboratory-critical",
        explanation: formatFactorExplanation(35, "Platelet count very low"),
      });
    } else if (pc < 100000) {
      factors.push({
        factor: `platelet ${pc}`,
        weight: 25,
        category: "laboratory-critical",
        explanation: formatFactorExplanation(25, "Low platelet count"),
      });
    }
  }

  if (labData?.hematocritRise > 20) {
    factors.push({
      factor: `hematocrit rise (${labData.hematocritRise}%)`,
      weight: LABORATORY_WEIGHTS.hematocrit_rise,
      category: "laboratory-critical",
      explanation: formatFactorExplanation(LABORATORY_WEIGHTS.hematocrit_rise, "Hematocrit rise"),
    });
  }
  if (labData?.fluidAccumulation) {
    factors.push({
      factor: "fluid accumulation",
      weight: LABORATORY_WEIGHTS.fluid_accumulation,
      category: "laboratory-critical",
      explanation: formatFactorExplanation(LABORATORY_WEIGHTS.fluid_accumulation, "Fluid accumulation"),
    });
  }
  if (labData?.shock) {
    factors.push({
      factor: "shock",
      weight: LABORATORY_WEIGHTS.shock,
      category: "laboratory-emergency",
      explanation: formatFactorExplanation(LABORATORY_WEIGHTS.shock, "Shock"),
    });
  }
  if (labData?.severeBleeding) {
    factors.push({
      factor: "severe bleeding",
      weight: LABORATORY_WEIGHTS.severe_bleeding,
      category: "laboratory-emergency",
      explanation: formatFactorExplanation(LABORATORY_WEIGHTS.severe_bleeding, "Severe bleeding"),
    });
  }
  if (labData?.astAltAbnormal) {
    factors.push({
      factor: "liver dysfunction",
      weight: LABORATORY_WEIGHTS.ast_alt_abnormal,
      category: "laboratory-critical",
      explanation: formatFactorExplanation(LABORATORY_WEIGHTS.ast_alt_abnormal, "Liver dysfunction"),
    });
  }

  if (pregnancyStatus) {
    factors.push({
      factor: "pregnancy",
      weight: PREGNANCY_MONITORING_BOOST,
      category: "pregnancy-monitoring",
      explanation: formatFactorExplanation(PREGNANCY_MONITORING_BOOST, "Pregnancy monitoring"),
    });
  }

  return { factors, explanations };
};

/**
 * Calculate WHO-aligned clinical risk score
 * 
 * @param {Object} current - Current clinical state
 * @param {Array<string>} current.symptoms - List of symptoms present
 * @param {number} current.temperature - Temperature in Celsius
 * @param {number} current.dayOfIllness - Day of illness (1-based)
 * @param {Object} current.labData - Laboratory findings (optional)
 * @param {Object} previous - Previous clinical state (for trend analysis)
 * @returns {Object} Risk assessment with explainability
 */
const calculateWhoAlignedRisk = ({ current, previous }) => {
  const symptoms = (current?.symptoms || []).map(s => String(s).toLowerCase().trim()).filter(Boolean);
  const tempCelsius = Number(current?.temperature) || 36.5;
  const dayOfIllness = Math.max(1, Number(current?.dayOfIllness) || 1);
  const labData = current?.labData || null;
  
  // Build explainable factors
  const { factors } = buildExplainableFactors(
    symptoms,
    tempCelsius,
    dayOfIllness,
    labData,
    !!current?.pregnancyStatus
  );

  let totalScore = factors.reduce((sum, f) => sum + f.weight, 0);

  if (previous) {
    const tempTrend = Number(current.temperature) - Number(previous.temperature);
    if (dayOfIllness >= 3 && dayOfIllness <= 7 && tempTrend < -0.5 && countWhoWarningSigns(symptoms) > 0) {
      const bonus = 12;
      totalScore += bonus;
      factors.push({
        factor: "fever drop with warning signs",
        weight: bonus,
        category: "critical-phase-transition",
        explanation: formatFactorExplanation(bonus, "Fever drop with warning signs"),
      });
    }
  }

  const hasLab = Boolean(
    labData &&
      (labData.plateletCount != null ||
        labData.hematocritRise ||
        labData.shock ||
        labData.severeBleeding ||
        labData.astAltAbnormal)
  );

  let finalScore = applyClinicalSafetyCaps(totalScore, { symptoms, labData, hasLab });

  if (hasLab && labData && (labData.shock || labData.severeBleeding)) {
    finalScore = Math.max(finalScore, LAB_CRITICAL_MIN);
  }
  
  // Map score to severity level
  const severityMapping = mapScoreToSeverity(finalScore);
  
  return {
    riskScore: finalScore,
    riskLevel: severityMapping.riskLevel,
    severityLabel: severityMapping.severityLabel,
    displayTitle: severityMapping.displayTitle,
    clinicalCategory: severityMapping.category,
    riskMode: hasLab ? "lab-enhanced" : "symptom-only",
    labPending: !hasLab,
    explainableFactors: factors,
    factorsSummary: buildFactorsSummary(factors),
    medicalDisclaimer: MEDICAL_DISCLAIMER,
    recommendations: buildRecommendations(severityMapping, hasLab),
  };
};

/**
 * Map numeric score to clinical severity level
 */
const mapScoreToSeverity = (score) => {
  if (score <= 25) {
    return {
      riskLevel: "Low Suspicion",
      severityLabel: "Low",
      displayTitle: "Low Dengue Risk Suspicion",
      category: "low-risk",
    };
  }

  if (score <= 50) {
    return {
      riskLevel: "Moderate Suspicion",
      severityLabel: "Moderate",
      displayTitle: "Moderate Dengue Risk Suspicion",
      category: "moderate-risk",
    };
  }

  if (score <= 75) {
    return {
      riskLevel: "High WHO Warning Risk",
      severityLabel: "High",
      displayTitle: "High Dengue Risk Suspicion",
      category: "high-risk",
    };
  }

  return {
    riskLevel: "Critical Severe Dengue Risk",
    severityLabel: "Critical",
    displayTitle: "Critical Severe Dengue Risk — Immediate Evaluation Required",
    category: "critical-risk",
  };
};

/**
 * Build human-readable summary of factors
 */
const buildFactorsSummary = (factors) => {
  const summary = [];
  const byCat = {};
  
  factors.forEach(f => {
    if (!byCat[f.category]) byCat[f.category] = [];
    byCat[f.category].push(f);
  });
  
  Object.entries(byCat).forEach(([cat, items]) => {
    const weight = items.reduce((sum, f) => sum + f.weight, 0);
    summary.push(`${cat}: ${weight} points (${items.length} factors)`);
  });
  
  return summary;
};

/**
 * Build medical recommendations
 */
const buildRecommendations = (severity, hasLab) => {
  const recs = [];
  
  recs.push("Laboratory confirmation recommended: CBC, Platelet count, NS1 test, or rapid dengue test");
  
  if (!hasLab) {
    recs.push("Clinical evaluation by licensed physician required for diagnosis");
  }
  
  if (severity.category === "critical-risk") {
    recs.push("URGENT: Immediate hospital admission with intensive monitoring");
    recs.push("Continuous vital signs monitoring, IV hydration, platelet management");
  } else if (severity.category === "high-risk") {
    recs.push("Clinical review recommended within 12 hours");
    recs.push("Monitor daily for WHO warning signs: persistent vomiting, abdominal pain, bleeding, lethargy");
  } else if (severity.category === "moderate-risk") {
    recs.push("Clinical consultation within 24 hours");
    recs.push("Maintain adequate hydration, daily symptom tracking");
  } else if (severity.category === "mild-risk") {
    recs.push("Continue hydration, daily self-monitoring");
    recs.push("Seek care if warning signs develop (bleeding, severe vomiting, abdominal pain)");
  } else {
    recs.push("Maintain hydration and general supportive care");
    recs.push("No laboratory testing urgently needed unless symptoms progress");
  }
  
  return recs;
};

module.exports = {
  calculateWhoAlignedRisk,
  normalizeScore,
  MEDICAL_DISCLAIMER,
  SYMPTOM_ONLY_MAX,
  LAB_CRITICAL_MIN,
  LOW_SPECIFICITY_WEIGHTS,
  FEVER_TEMP_WEIGHTS,
  ILLNESS_DAY_WEIGHTS,
  WHO_WARNING_SIGNS,
  LABORATORY_WEIGHTS,
};
