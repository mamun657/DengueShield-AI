const severityColor = {
  High: "from-rose-500/20 to-orange-500/10 border-rose-400/40 text-rose-100",
  Moderate: "from-amber-500/15 to-yellow-500/10 border-amber-400/35 text-amber-100",
  Low: "from-emerald-500/15 to-teal-500/10 border-emerald-400/35 text-emerald-100",
};

const ConfidenceMeter = ({ value = 0 }) => {
  const pct = Math.round(value * 100);
  return (
    <div className="rounded-xl border border-cyan-300/20 bg-black/25 p-4">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
        <span>AI Confidence</span>
        <span className="font-semibold text-cyan-200">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
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

const RiskHeatmap = ({ ml, severity }) => {
  const score = Number(ml?.risk_score ?? 0);
  const bands = [
    { label: "Low", max: 35, color: "bg-emerald-500/70" },
    { label: "Moderate", max: 60, color: "bg-amber-500/70" },
    { label: "High", max: 85, color: "bg-orange-500/70" },
    { label: "Critical", max: 100, color: "bg-rose-500/80" },
  ];
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">Risk Heatmap (XGBoost + Graph)</p>
      <p className="mt-1 text-2xl font-bold text-white">
        {score}
        <span className="text-sm font-normal text-slate-400"> / 100</span>
      </p>
      <p className="text-xs text-cyan-200/90">{severity} severity · {ml?.risk_level || "—"}</p>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {bands.map((b) => (
          <div key={b.label} className="text-center">
            <div
              className={`mx-auto h-8 w-full rounded ${b.color} ${score <= b.max && score > (bands[bands.indexOf(b) - 1]?.max || 0) ? "ring-2 ring-cyan-300" : "opacity-40"}`}
            />
            <p className="mt-1 text-[9px] text-slate-500">{b.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReasoningPanel = ({ reasoning = [], narrative, graphPath = [] }) => (
  <div className="rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-4">
    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/90">AI Clinical Reasoning</p>
    {narrative && <p className="mt-2 text-sm leading-relaxed text-slate-100">{narrative}</p>}
    <ul className="mt-3 space-y-1.5">
      {reasoning.map((line) => (
        <li key={line} className="flex gap-2 text-xs text-slate-300">
          <span className="text-cyan-400">▸</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
    {graphPath.length > 0 && (
      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Graph path</p>
        <p className="mt-1 font-mono text-[11px] text-cyan-100">{graphPath.join(" → ")}</p>
      </div>
    )}
  </div>
);

const GraphTraversalPanel = ({ paths = [] }) => (
  <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-3">
    <p className="text-xs uppercase tracking-wider text-slate-400">Graph Traversal Log</p>
    <ul className="mt-2 space-y-1">
      {(paths.slice(0, 12) || []).map((p, i) => (
        <li key={`${p.path}-${i}`} className="font-mono text-[10px] text-slate-400">
          {p.path}
        </li>
      ))}
      {!paths.length && <li className="text-xs text-slate-500">No pathways traversed</li>}
    </ul>
  </div>
);

const EmergencyBanner = ({ active, recommendation }) => {
  if (!active) return null;
  return (
    <div className="animate-pulse rounded-xl border border-rose-400/50 bg-gradient-to-r from-rose-600/25 via-red-500/15 to-orange-500/10 px-4 py-3 shadow-[0_0_24px_rgba(244,63,94,0.25)]">
      <p className="text-xs font-bold uppercase tracking-widest text-rose-200">Emergency Escalation</p>
      <p className="mt-1 text-sm text-rose-50">{recommendation}</p>
    </div>
  );
};

const GraphRagPanels = ({ result, loading }) => {
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

  const isEmergency =
    result.severity === "High" ||
    result.criticalPhase?.detected ||
    String(result.warning || "").toLowerCase().includes("emergency");

  return (
    <div className="space-y-3">
      <EmergencyBanner active={isEmergency} recommendation={result.recommendation} />

      <div className="grid gap-3 md:grid-cols-2">
        <div className={`rounded-xl border bg-gradient-to-br p-4 ${severityColor[result.severity] || severityColor.Moderate}`}>
          <p className="text-xs uppercase tracking-wider opacity-80">Clinical Risk</p>
          <p className="mt-1 text-xl font-bold">{result.risk}</p>
          <p className="mt-2 text-sm opacity-90">{result.recommendation}</p>
        </div>
        <WhoAlertCard warning={result.warning} matched={result.who?.matched} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ConfidenceMeter value={result.confidence} />
        <RiskHeatmap ml={result.ml} severity={result.severity} />
      </div>

      <ReasoningPanel reasoning={result.reasoning} narrative={result.narrative} graphPath={result.graphPath} />
      <GraphTraversalPanel paths={result.graph?.paths} />
    </div>
  );
};

export default GraphRagPanels;
