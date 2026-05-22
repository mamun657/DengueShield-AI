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

const SYMPTOM_ONLY_MAX = 85;  // Symptoms alone cannot produce clinical certainty
const LAB_CRITICAL_MIN = 90;  // Lab evidence can escalate to critical range

/**
 * WEIGHTED SYMPTOM SCORES (Low Specificity Category)
 * Generic viral symptoms - present in many febrile illnesses
 */
const LOW_SPECIFICITY_WEIGHTS = {
  headache: 4,           // Generic viral symptom
  body_pain: 5,          // Myalgia in many viral illnesses
  fatigue: 4,            // Non-specific
  appetite_loss: 3,      // Non-specific
  eye_pain: 6,           // Retrobulbar pain, slightly more specific
  rash: 6,               // Rash present in dengue but also in measles, chikungunya, others
};

/**
 * FEVER TEMPERATURE WEIGHTS
 * Calibrated to dengue fever patterns (typically 38-41°C)
 */
const FEVER_TEMP_WEIGHTS = {
  // Below 99°F (37.2°C)
  "below_99": 0,
  // 99-100°F (37.2-37.8°C)
  "99_100": 3,
  // 100-101°F (37.8-38.3°C)
  "100_101": 6,
  // 101-102°F (38.3-38.9°C)
  "101_102": 8,
  // Above 102°F (38.9°C)
  "above_102": 10,
};

/**
 * DAY OF ILLNESS WEIGHTS
 * Dengue critical phase typically appears days 3-7
 * Day 1: Initial febrile phase - lower suspicion
 * Days 2-3: Fever peak phase
 * Days 3-7: CRITICAL PHASE WINDOW (WHO guideline)
 * Day 7+: Defervescence phase - recovery
 */
const ILLNESS_DAY_WEIGHTS = {
  1: 1,    // Day 1: Early phase
  2: 3,    // Day 2: Fever escalating
  3: 7,    // Day 3: Critical phase begins
  4: 12,   // Day 4: Peak critical risk
  5: 12,   // Day 5: Peak critical risk
  6: 10,   // Day 6: Still in critical window
  7: 6,    // Day 7: Approaching recovery
  8: 3,    // Day 8+: Post-critical phase
};

/**
 * WHO WARNING SIGN WEIGHTS
 * Strong associations with severe dengue progression
 * Source: WHO dengue clinical management guidelines
 */
const WHO_WARNING_SIGNS = {
  vomiting: 12,                    // Dehydration pathway
  persistent_vomiting: 18,         // Severe dehydration risk
  abdominal_pain: 18,              // Severe plasma leakage sign
  restlessness: 15,                // CNS/circulatory compromise indicator
  bleeding: 25,                    // CRITICAL: hemorrhagic progression
};

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

/**
 * Calculate fever contribution based on temperature in Celsius
 */
const calculateFeverWeight = (tempCelsius) => {
  const temp = Number(tempCelsius);
  if (!Number.isFinite(temp)) return 0;
  
  if (temp < 37.2) return FEVER_TEMP_WEIGHTS["below_99"];
  if (temp < 37.8) return FEVER_TEMP_WEIGHTS["99_100"];
  if (temp < 38.3) return FEVER_TEMP_WEIGHTS["100_101"];
  if (temp < 38.9) return FEVER_TEMP_WEIGHTS["101_102"];
  return FEVER_TEMP_WEIGHTS["above_102"];
};

/**
 * Calculate illness day contribution
 */
const calculateDayWeight = (dayOfIllness) => {
  const day = Number(dayOfIllness);
  if (!Number.isFinite(day) || day < 1) return ILLNESS_DAY_WEIGHTS[1];
  if (day > 8) return ILLNESS_DAY_WEIGHTS[8];
  return ILLNESS_DAY_WEIGHTS[day] || ILLNESS_DAY_WEIGHTS[8];
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
const buildExplainableFactors = (symptoms, tempCelsius, dayOfIllness, labData) => {
  const factors = [];
  const explanations = {};
  
  // Low specificity symptoms
  Object.entries(LOW_SPECIFICITY_WEIGHTS).forEach(([symptom, weight]) => {
    if ((symptoms || []).includes(symptom)) {
      const key = symptom.replace(/_/g, " ");
      factors.push({
        factor: key,
        weight,
        category: "low-specificity",
        explanation: `${key} → low-specificity viral symptom (also seen in COVID-19, influenza, malaria, typhoid)`
      });
    }
  });
  
  // Fever weight
  const feverWeight = calculateFeverWeight(tempCelsius);
  if (feverWeight > 0) {
    const temp = Number(tempCelsius);
    factors.push({
      factor: `fever (${temp.toFixed(1)}°C)`,
      weight: feverWeight,
      category: "fever-severity",
      explanation: `fever ${temp.toFixed(1)}°C → temperature severity factor (dengue typically 38-41°C)`
    });
  }
  
  // Illness day weight
  const dayWeight = calculateDayWeight(dayOfIllness);
  const day = Number(dayOfIllness);
  factors.push({
    factor: `day ${day} of illness`,
    weight: dayWeight,
    category: "illness-progression",
    explanation: `day ${day} → ${day >= 3 && day <= 7 ? "WHO CRITICAL PHASE WINDOW" : "non-critical phase"}`
  });
  
  // WHO warning signs
  Object.entries(WHO_WARNING_SIGNS).forEach(([warning, weight]) => {
    if ((symptoms || []).includes(warning.replace(/_/g, " "))) {
      factors.push({
        factor: warning.replace(/_/g, " "),
        weight,
        category: "who-warning-sign",
        explanation: `${warning.replace(/_/g, " ")} → WHO EMERGENCY WARNING SIGN (severe dengue progression indicator)`
      });
    }
  });
  
  // Laboratory indicators
  if (labData) {
    if (labData.plateletCount < 100000) {
      factors.push({
        factor: `low platelets (${labData.plateletCount})`,
        weight: LABORATORY_WEIGHTS.platelet_drop,
        category: "laboratory-critical",
        explanation: `platelet count ${labData.plateletCount} → dengue-specific thrombocytopenia`
      });
    }
    if (labData.hematocritRise > 20) {
      factors.push({
        factor: `hematocrit rise (${labData.hematocritRise}%)`,
        weight: LABORATORY_WEIGHTS.hematocrit_rise,
        category: "laboratory-critical",
        explanation: `hematocrit rise → plasma leakage / dengue hemorrhagic fever marker`
      });
    }
    if (labData.fluidAccumulation) {
      factors.push({
        factor: "fluid accumulation",
        weight: LABORATORY_WEIGHTS.fluid_accumulation,
        category: "laboratory-critical",
        explanation: `pleural effusion / ascites → severe dengue indicator`
      });
    }
    if (labData.shock) {
      factors.push({
        factor: "shock",
        weight: LABORATORY_WEIGHTS.shock,
        category: "laboratory-emergency",
        explanation: `dengue shock syndrome → MEDICAL EMERGENCY`
      });
    }
    if (labData.severeBleeding) {
      factors.push({
        factor: "severe bleeding",
        weight: LABORATORY_WEIGHTS.severe_bleeding,
        category: "laboratory-emergency",
        explanation: `severe hemorrhage → dengue hemorrhagic fever / dengue shock syndrome`
      });
    }
    if (labData.astAltAbnormal) {
      factors.push({
        factor: "liver dysfunction",
        weight: LABORATORY_WEIGHTS.ast_alt_abnormal,
        category: "laboratory-critical",
        explanation: `elevated AST/ALT → hepatic dysfunction in dengue`
      });
    }
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
  const { factors } = buildExplainableFactors(symptoms, tempCelsius, dayOfIllness, labData);
  
  // Sum all weighted factors
  let totalScore = factors.reduce((sum, f) => sum + f.weight, 0);
  
  // Apply trend analysis
  let trendBonus = 0;
  if (previous) {
    const tempTrend = Number(current.temperature) - Number(previous.temperature);
    const symptomTrend = symptoms.length - (previous.symptoms?.length || 0);
    
    // Fever rising during critical phase = concerning
    if (dayOfIllness >= 3 && dayOfIllness <= 7 && tempTrend > 0.5) {
      trendBonus += 5;
    }
    
    // Fever dropping during critical phase with warning signs = CRITICAL
    if (dayOfIllness >= 3 && dayOfIllness <= 7 && tempTrend < -0.5) {
      const hasWarnings = symptoms.some(s => Object.keys(WHO_WARNING_SIGNS).includes(s));
      if (hasWarnings) {
        trendBonus += 15;
        factors.push({
          factor: "fever drop during critical phase with warning signs",
          weight: trendBonus,
          category: "critical-phase-transition",
          explanation: "Fever drop during WHO critical window with warning signs → SEVERE DENGUE PROGRESSION RISK"
        });
      }
    }
    
    // Rapidly worsening symptom count = concerning
    if (symptomTrend > 2) {
      trendBonus += 8;
    }
  }
  
  totalScore += trendBonus;
  
  // Apply caps
  let finalScore = normalizeScore(totalScore);
  
  // Symptom-only assessment caps at SYMPTOM_ONLY_MAX
  const hasLab = Boolean(labData && (labData.plateletCount || labData.hematocritRise || labData.astAltAbormal));
  if (!hasLab) {
    finalScore = Math.min(finalScore, SYMPTOM_ONLY_MAX);
  } else {
    // Lab evidence of severe indicators should reach critical range
    const hasSevereLabIndicators = labData && (
      labData.shock || 
      labData.severeBleeding || 
      (labData.plateletCount < 50000) ||
      (labData.hematocritRise > 25)
    );
    if (hasSevereLabIndicators) {
      finalScore = Math.max(finalScore, LAB_CRITICAL_MIN);
    }
  }
  
  // Map score to severity level
  const severityMapping = mapScoreToSeverity(finalScore, hasLab);
  
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
const mapScoreToSeverity = (score, hasLab) => {
  if (score <= 20) {
    return {
      riskLevel: "Low Suspicion",
      severityLabel: "Low",
      displayTitle: "Low Dengue Risk Suspicion",
      category: "low-risk",
    };
  }
  
  if (score <= 40) {
    return {
      riskLevel: "Mild Suspicion",
      severityLabel: "Mild",
      displayTitle: "Mild Dengue Risk Suspicion",
      category: "mild-risk",
    };
  }
  
  if (score <= 60) {
    return {
      riskLevel: "Moderate Suspicion",
      severityLabel: "Moderate",
      displayTitle: "Moderate Dengue Risk Suspicion",
      category: "moderate-risk",
    };
  }
  
  if (score <= 80) {
    return {
      riskLevel: "High WHO Warning Risk",
      severityLabel: "High",
      displayTitle: "High Dengue Risk Suspicion with WHO Warning Signs",
      category: "high-risk",
    };
  }
  
  return {
    riskLevel: "Critical Severe Dengue Risk",
    severityLabel: "Critical",
    displayTitle: "Critical Severe Dengue Risk - Immediate Clinical Evaluation Required",
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
