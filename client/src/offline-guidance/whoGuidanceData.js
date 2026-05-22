/**
 * Locally cached WHO dengue management guidance — available without network.
 */

export const WHO_EMERGENCY_SIGNS = [
  { id: "vomiting", label: "Persistent vomiting", severity: "emergency" },
  { id: "abdominal_pain", label: "Severe abdominal pain", severity: "emergency" },
  { id: "bleeding", label: "Bleeding from gums, nose, or skin", severity: "emergency" },
  { id: "restlessness", label: "Restlessness or lethargy", severity: "emergency" },
  { id: "liver_enlargement", label: "Liver enlargement > 2 cm", severity: "emergency" },
  { id: "plasma_leakage", label: "Plasma leakage signs", severity: "emergency" },
];

export const HYDRATION_GUIDANCE = {
  title: "WHO Hydration Protocol",
  sections: [
    {
      heading: "Mild / outpatient",
      points: [
        "Oral rehydration solution (ORS) — 2–3 L per 24 hours for adults",
        "Small frequent sips if nausea present",
        "Monitor urine output — pale yellow indicates adequate hydration",
        "Avoid NSAIDs (ibuprofen, aspirin) — paracetamol only for fever",
      ],
    },
    {
      heading: "Moderate / monitored",
      points: [
        "Increase fluid intake if hematocrit rises",
        "Daily clinical review during days 3–7 (critical phase)",
        "Watch for warning signs every 4–6 hours",
      ],
    },
    {
      heading: "Severe / hospital",
      points: [
        "IV crystalloid per WHO fluid management protocol",
        "Serial hematocrit and platelet monitoring",
        "Urgent referral if shock or severe bleeding",
      ],
    },
  ],
};

export const ESCALATION_RULES = [
  {
    trigger: "Any WHO warning sign",
    action: "Seek emergency hospital care immediately",
    priority: 1,
  },
  {
    trigger: "Fever day 3–6 with worsening symptoms",
    action: "Urgent clinical review within 12 hours",
    priority: 2,
  },
  {
    trigger: "Platelet count below 100,000",
    action: "Hospital admission for monitoring",
    priority: 1,
  },
  {
    trigger: "Bleeding or restlessness",
    action: "Call emergency services / go to nearest dengue-capable hospital",
    priority: 1,
  },
];

export const PREGNANCY_GUIDANCE = {
  title: "Pregnancy — WHO Special Considerations",
  points: [
    "Pregnant patients with dengue require expedited obstetric and medical review",
    "Higher risk of plasma leakage — monitor closely days 3–7",
    "Avoid NSAIDs throughout pregnancy",
    "Refer to facility with obstetric emergency capability",
    "Fetal monitoring if admitted",
  ],
};

export const PEDIATRIC_GUIDANCE = {
  title: "Pediatric — WHO Considerations",
  points: [
    "Children dehydrate faster — prioritize ORS and small frequent fluids",
    "Weight-based fluid calculation for IV therapy if hospitalized",
    "Watch for irritability, cold extremities, or reduced urine",
    "Lower threshold for hospital referral in infants",
  ],
};

export const OFFLINE_GUIDANCE_SECTIONS = [
  { id: "hydration", ...HYDRATION_GUIDANCE },
  { id: "emergency", title: "WHO Emergency Warning Signs", items: WHO_EMERGENCY_SIGNS },
  { id: "escalation", title: "Escalation Rules", items: ESCALATION_RULES },
  { id: "pregnancy", ...PREGNANCY_GUIDANCE },
  { id: "pediatric", ...PEDIATRIC_GUIDANCE },
];

export const searchGuidance = (query) => {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return OFFLINE_GUIDANCE_SECTIONS;

  const matches = [];
  OFFLINE_GUIDANCE_SECTIONS.forEach((section) => {
    const blob = JSON.stringify(section).toLowerCase();
    if (blob.includes(q)) matches.push(section);
  });
  return matches;
};

export default OFFLINE_GUIDANCE_SECTIONS;
