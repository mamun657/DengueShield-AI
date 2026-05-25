import { useAuth } from "../../context/AuthContext";

const severityColor = {
  High: "from-rose-500/20 to-orange-500/10 border-rose-400/40 text-rose-100",
  "High Risk Suspicion": "from-rose-500/20 to-orange-500/10 border-rose-400/40 text-rose-100",
  "High WHO Warning Risk": "from-orange-500/20 to-yellow-500/10 border-orange-400/40 text-orange-100",
  Moderate: "from-amber-500/15 to-yellow-500/10 border-amber-400/35 text-amber-100",
  "Moderate Suspicion": "from-amber-500/15 to-yellow-500/10 border-amber-400/35 text-amber-100",
  Mild: "from-cyan-500/15 to-blue-500/10 border-cyan-400/35 text-cyan-100",
  "Mild Suspicion": "from-cyan-500/15 to-blue-500/10 border-cyan-400/35 text-cyan-100",
  "Low Suspicion": "from-emerald-500/15 to-teal-500/10 border-emerald-400/35 text-emerald-100",
  Low: "from-emerald-500/15 to-teal-500/10 border-emerald-400/35 text-emerald-100",
  Critical: "from-rose-500/25 to-red-500/10 border-rose-400/50 text-rose-100",
  "Critical Severe Dengue Risk": "from-rose-500/25 to-red-500/10 border-rose-400/50 text-rose-100",
  "Severe Dengue Risk": "from-rose-500/25 to-red-500/10 border-rose-400/50 text-rose-100",
};

const ConfidenceMeter = ({ label = "Moderate", value = 0 }) => {
  const pctMap = { Low: 45, Moderate: 68, High: 88 };
  const pct = pctMap[label] ?? Math.round((value || 0.65) * 100);
  return (
    <div className="rounded-xl border border-cyan-300/20 bg-black/25 p-4">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
        <span>AI Confidence</span>
        <span className="font-semibold text-cyan-200">{label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {label === "Moderate" && (
        <p className="mt-2 text-[10px] text-slate-500">Symptom-only mode — lab confirmation increases confidence</p>
      )}
    </div>
  );
};

const WhoAlertCard = ({ warning, matched = [] }) => (
  <div className="rounded-xl border border-amber-300/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4">
    <p className="text-xs uppercase tracking-[0.14em] text-amber-200/90">WHO Clinical Alert</p>
    <p className="mt-2 text-sm font-medium text-amber-50">{warning}</p>
    {matched.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {matched.map((id) => (
          <span key={id} className="rounded-full border border-amber-300/30 px-2 py-0.5 text-[10px] text-amber-100">
            {id.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    )}
  </div>
);

const RiskHeatmap = ({ riskScore, ml, severityLabel }) => {
  const score = Number(riskScore ?? ml?.risk_score ?? 0);
  const bands = [
    { label: "Low", max: 30, color: "bg-emerald-500/70" },
    { label: "Moderate", max: 60, color: "bg-amber-500/70" },
    { label: "High", max: 85, color: "bg-orange-500/70" },
    { label: "Lab+", max: 100, color: "bg-rose-500/80" },
  ];
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">Estimated Clinical Risk</p>
      <p className="mt-1 text-2xl font-bold text-white tabular-nums">
        {score}
        <span className="text-sm font-normal text-slate-400"> / 100</span>
      </p>
      <p className="text-xs text-cyan-200/90">{severityLabel || "—"} · symptom-only max 85 without labs</p>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {bands.map((b, idx) => (
          <div key={b.label} className="text-center">
            <div
              className={`mx-auto h-8 w-full rounded ${b.color} ${
                score <= b.max && score > (bands[idx - 1]?.max || 0) ? "ring-2 ring-cyan-300" : "opacity-40"
              }`}
            />
            <p className="mt-1 text-[9px] text-slate-500">{b.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReasoningPanel = ({ narrative, triggeredFactors = [], reasoning = [], graphPath = [], isAdmin = false }) => {
  if (!isAdmin) return null;

  return (
    <div className="rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/90">AI Clinical Summary</p>
      {narrative && <p className="mt-2 text-sm leading-relaxed text-slate-100">{narrative}</p>}
      
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {triggeredFactors.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">Key Factors</p>
            <ul className="space-y-1.5">
              {triggeredFactors.map((line) => (
                <li key={line} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {reasoning.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">Clinical Reasoning</p>
            <ul className="space-y-1.5">
              {reasoning.map((line) => (
                <li key={line} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isAdmin && graphPath.length > 0 && (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Clinical Decision Pathway (Admin Debug)</p>
          <p className="mt-1 font-mono text-[11px] text-cyan-100">{graphPath.join(" → ")}</p>
        </div>
      )}
    </div>
  );
};

const GraphTraversalPanel = ({ paths = [], isAdmin = false }) => {
  if (!isAdmin) return null;
  return (
    <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-xs uppercase tracking-wider text-slate-400">Clinical Reasoning Log (Admin Debug)</p>
      <ul className="mt-2 space-y-1">
        {(paths.slice(0, 12) || []).map((p, i) => (
          <li key={`${p.path}-${i}`} className="font-mono text-[10px] text-slate-400">
            {p.path}
          </li>
        ))}
        {!paths.length && <li className="text-xs text-slate-500">No clinical pathways recorded</li>}
      </ul>
    </div>
  );
};

const ElevatedBanner = ({ active, recommendation, scoreLine }) => {
  if (!active) return null;
  return (
    <div className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-600/20 via-orange-500/10 to-amber-500/5 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-200">Elevated Risk Suspicion</p>
      {scoreLine && <p className="mt-1 text-lg font-semibold text-white tabular-nums">{scoreLine}</p>}
      <p className="mt-1 text-sm text-amber-50">{recommendation}</p>
      <p className="mt-2 text-xs text-amber-200/80">Clinical confirmation recommended · CBC / Platelet test advised</p>
    </div>
  );
};

const GraphRagPanels = ({ result, loading }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (!result) return null;

  const scoreLine = result.riskScore != null ? `${Math.round(result.riskScore)}/100 — ${result.severityLabel || result.riskLevel}` : "";
  const isLabCritical = result.riskMode === "lab-enhanced" && Number(result.riskScore) >= 90;
  const isElevated =
    !isLabCritical &&
    (Number(result.riskScore) >= 61 || result.criticalPhase?.detected);

  return (
    <div className="space-y-3">
      <ElevatedBanner
        active={isElevated}
        scoreLine={scoreLine}
        recommendation={
          result.recommendation ||
          "Your symptoms may indicate elevated dengue risk based on WHO warning patterns."
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div
          className={`rounded-xl border bg-gradient-to-br p-4 ${
            severityColor[result.severityLabel] || severityColor[result.severity] || severityColor.Moderate
          }`}
        >
          <p className="text-xs uppercase tracking-wider opacity-80">Clinical Risk Estimate</p>
          <p className="mt-1 text-xl font-bold">{result.displayTitle || result.risk}</p>
          <p className="mt-2 text-sm opacity-90">{result.clinicalSubtitle}</p>
          {result.criticalPhase?.label && (
            <p className="mt-2 text-xs opacity-80">{result.criticalPhase.label}</p>
          )}
        </div>
        <WhoAlertCard warning={result.warning} matched={result.who?.matched} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ConfidenceMeter label={result.aiConfidenceLabel || "Moderate"} value={result.aiConfidence ?? result.confidence} />
        <RiskHeatmap
          riskScore={result.riskScore}
          ml={result.ml}
          severityLabel={result.severityLabel || result.severity}
        />
      </div>

      <ReasoningPanel
        reasoning={result.reasoning}
        narrative={result.narrative}
        graphPath={result.graphPath}
        triggeredFactors={result.triggeredFactors}
        isAdmin={isAdmin}
      />
      <GraphTraversalPanel paths={result.graph?.paths} isAdmin={isAdmin} />

      <p className="text-[11px] text-slate-500">{result.medicalDisclaimer}</p>
    </div>
  );
};

export default GraphRagPanels;
