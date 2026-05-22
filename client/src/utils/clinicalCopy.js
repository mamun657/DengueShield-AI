/**
 * Rural-friendly, action-first clinical copy helpers.
 */

export const getRiskTier = (score) => {
  const n = Math.round(Number(score) || 0);
  if (n >= 76) {
    return {
      tier: "critical",
      label: "CRITICAL",
      shortLabel: "Critical",
      actionLine: "Emergency evaluation recommended",
      oneLiner: "Go to a hospital now if you feel worse.",
      ring: "ring-2 ring-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.35)]",
      bg: "bg-gradient-to-br from-red-950/90 via-rose-950/80 to-slate-950",
      border: "border-red-500/50",
      scoreText: "text-red-100",
      badge: "bg-red-500/20 text-red-100 border-red-400/40",
      banner: "bg-red-600 text-white",
    };
  }
  if (n >= 51) {
    return {
      tier: "high",
      label: "HIGH RISK",
      shortLabel: "High",
      actionLine: "Immediate clinical review recommended",
      oneLiner: "Monitor closely and seek care if symptoms worsen.",
      ring: "ring-1 ring-orange-500/40",
      bg: "bg-gradient-to-br from-orange-950/40 to-slate-950",
      border: "border-orange-500/35",
      scoreText: "text-orange-100",
      badge: "bg-orange-500/15 text-orange-100 border-orange-400/30",
      banner: "bg-orange-600 text-white",
    };
  }
  if (n >= 26) {
    return {
      tier: "moderate",
      label: "MODERATE",
      shortLabel: "Moderate",
      actionLine: "Doctor review within 24 hours",
      oneLiner: "Rest, hydrate, and watch for new symptoms.",
      ring: "",
      bg: "bg-gradient-to-br from-amber-950/30 to-slate-950",
      border: "border-amber-500/25",
      scoreText: "text-amber-100",
      badge: "bg-amber-500/15 text-amber-100 border-amber-400/25",
      banner: "bg-amber-600 text-slate-900",
    };
  }
  return {
    tier: "low",
    label: "LOW RISK",
    shortLabel: "Low",
    actionLine: "Continue home monitoring",
    oneLiner: "Stay hydrated and track symptoms daily.",
    ring: "",
    bg: "bg-gradient-to-br from-emerald-950/25 to-slate-950",
    border: "border-emerald-500/20",
    scoreText: "text-emerald-100",
    badge: "bg-emerald-500/15 text-emerald-100 border-emerald-400/25",
    banner: "bg-emerald-600 text-white",
  };
};

export const humanizeWarning = (raw) => {
  let s = String(raw || "").trim();
  s = s.replace(/^who\s*warning\s*sign:\s*/i, "");
  s = s.replace(/who\s*(emergency\s*)?warning\s*sign/gi, "");
  s = s.replace(/severe\s*dengue\s*progression\s*indicator/gi, "");
  s = s.replace(/\s*—\s*.*$/, "");
  s = s.replace(/[_]+/g, " ");
  s = s.trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const ACTION_SHORT_MAP = [
  [/hydrat/i, "Drink ORS / fluids often"],
  [/ors|oral rehydration/i, "Drink ORS"],
  [/nsaid|ibuprofen|aspirin/i, "Avoid ibuprofen & aspirin"],
  [/paracetamol|acetaminophen/i, "Use paracetamol only for fever"],
  [/monitor|track|daily/i, "Monitor fever & symptoms"],
  [/hospital|urgent|emergency|immediate|admission/i, "Go to hospital if worse"],
  [/12\s*hour|within 12/i, "See a doctor within 12 hours"],
  [/24\s*hour|within 24/i, "See a doctor within 24 hours"],
  [/cbc|platelet|lab|laboratory|ns1/i, "Get CBC / platelet test"],
  [/rest/i, "Rest and sleep"],
];

export const shortenAction = (raw) => {
  const text = String(raw || "").trim();
  if (!text) return null;
  for (const [pattern, short] of ACTION_SHORT_MAP) {
    if (pattern.test(text)) return short;
  }
  if (text.length > 48) return `${text.slice(0, 45)}…`;
  return text;
};

export const buildActionChecklist = (actions = [], max = 4) => {
  const defaults = [
    "Drink ORS / fluids",
    "Monitor fever daily",
    "Avoid ibuprofen & aspirin",
    "See a doctor if worse",
  ];
  const fromServer = (Array.isArray(actions) ? actions : [])
    .map(shortenAction)
    .filter(Boolean);
  const merged = [...new Set([...fromServer, ...defaults])];
  return merged.slice(0, max);
};

export const simplifySeverityLabel = (label) => {
  const l = String(label || "").toUpperCase();
  if (l.includes("CRITICAL") || l.includes("SEVERE")) return "CRITICAL";
  if (l.includes("HIGH")) return "HIGH RISK";
  if (l.includes("MODERATE") || l.includes("MILD")) return l.includes("MILD") ? "MILD" : "MODERATE";
  if (l.includes("LOW")) return "LOW RISK";
  return label || "—";
};
