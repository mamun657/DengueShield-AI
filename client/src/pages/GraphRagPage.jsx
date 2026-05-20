import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import GraphVisualization from "../components/graphrag/GraphVisualization";
import GraphRagPanels from "../components/graphrag/GraphRagPanels";
import { analyzeGraphRag, ALLOWED_GRAPH_SYMPTOMS, fetchGraphRagHealth } from "../api/graphRagApi";
import { useAuth } from "../context/AuthContext";

const DEMO = {
  day: 4,
  symptoms: ["fever_drop", "abdominal_pain", "vomiting"],
};

const SYMPTOM_LABELS = {
  fever_drop: "Fever Drop",
  abdominal_pain: "Abdominal Pain",
  vomiting: "Vomiting",
  bleeding: "Bleeding",
  rash: "Rash",
  dehydration: "Dehydration",
  headache: "Headache",
  eye_pain: "Eye Pain",
  fatigue: "Fatigue",
};

const GraphRagPage = () => {
  const { user, logout } = useAuth();
  const [day, setDay] = useState(DEMO.day);
  const [selected, setSelected] = useState(DEMO.symptoms);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);

  const runAnalysis = useCallback(async (symptoms, illnessDay) => {
    setLoading(true);
    setError("");
    try {
      const data = await analyzeGraphRag({ symptoms, day: illnessDay });
      if (data.success === false) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "GraphRAG analysis failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphRagHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    runAnalysis(DEMO.symptoms, DEMO.day);
  }, [runAnalysis]);

  const toggleSymptom = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleAnalyze = () => {
    if (!selected.length) {
      setError("Select at least one symptom");
      return;
    }
    runAnalysis(selected, day);
  };

  const loadDemo = () => {
    setDay(DEMO.day);
    setSelected(DEMO.symptoms);
    runAnalysis(DEMO.symptoms, DEMO.day);
  };

  return (
    <div className="min-h-screen bg-[#061120] text-slate-100">
      <DashboardNavbar userName={user?.name} userRole={user?.role} onLogout={logout} />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
              GraphRAG Clinical Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
              WHO-Aligned Dengue Knowledge Graph
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Relationship-aware medical reasoning — not just document retrieval. Machine-readable WHO
              pathways make symptom progression explainable for clinicians and public-health teams.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
            >
              ← Dashboard
            </Link>
            <button
              type="button"
              onClick={loadDemo}
              className="rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Live Demo (Day 4)
            </button>
          </div>
        </div>

        {health && (
          <div className="mb-4 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>
              Neo4j:{" "}
              <span className={health.neo4j?.ok ? "text-emerald-400" : "text-amber-400"}>
                {health.neo4j?.ok ? "connected" : "fallback mode"}
              </span>
            </span>
            <span>Engine: {result?.engine || "—"}</span>
            {result?.cached && <span className="text-cyan-400">cached</span>}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-cyan-300/15 bg-gradient-to-r from-cyan-500/5 via-transparent to-teal-500/5 p-4 text-xs leading-relaxed text-slate-400">
          <strong className="text-cyan-200">Why GraphRAG beats traditional RAG:</strong> classic RAG returns
          similar text chunks only. GraphRAG traverses <em>INDICATES → CLASSIFIED_AS → REQUIRES</em> edges so
          fever drop on day 4 can be linked to critical phase, WHO warnings, and hospitalization — with a full
          audit trail for judges and investors.
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-white/10 bg-[#0f172a]/80 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-slate-400">Symptom Input</p>
              <label className="mt-3 block text-xs text-slate-500">
                Day of illness
                <input
                  type="number"
                  min={1}
                  max={21}
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {ALLOWED_GRAPH_SYMPTOMS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleSymptom(id)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      selected.includes(id)
                        ? "border-cyan-300/50 bg-cyan-500/20 text-cyan-100"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-cyan-300/30"
                    }`}
                  >
                    {SYMPTOM_LABELS[id] || id}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 py-2.5 text-sm font-semibold text-[#062036] transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Running hybrid pipeline…" : "Run GraphRAG Analysis"}
              </button>
              {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
            </div>

            <div className="hidden rounded-2xl border border-white/10 bg-[#0f172a]/60 p-4 text-xs text-slate-500 lg:block">
              <p className="font-semibold text-slate-300">Hybrid pipeline</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                {(result?.meta?.pipeline || []).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-cyan-300/20 bg-[#0b1220] p-4">
              <p className="mb-3 text-xs uppercase tracking-wider text-cyan-200/80">Live Knowledge Graph</p>
              <div className="flex justify-center">
                <GraphVisualization
                  graphData={result?.graph}
                  width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 80 : 720)}
                  height={380}
                  highlightIds={selected}
                />
              </div>
            </div>

            <div className="mt-4">
              <GraphRagPanels result={result} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphRagPage;
