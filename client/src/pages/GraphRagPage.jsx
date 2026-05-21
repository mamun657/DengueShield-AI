import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import DashboardNavbar from "../components/DashboardNavbar";
import GraphVisualization from "../components/graphrag/GraphVisualization";
import GraphRagPanels from "../components/graphrag/GraphRagPanels";
import { analyzeGraphRag, ALLOWED_GRAPH_SYMPTOMS, fetchGraphRagHealth } from "../api/graphRagApi";
import { useAuth } from "../context/AuthContext";
import { normalizeTrackingRecords } from "../utils/tracking";
import { useClinicalStore } from "../store/useClinicalStore.jsx";
import { graphResultToAssessment } from "../utils/assessment";

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
  const {
    latestRecord,
    setLatestRecord,
    setLatestAssessment,
    setLatestTracking,
  } = useClinicalStore();
  const [day, setDay] = useState(1);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);

  const runAnalysis = useCallback(async (symptoms, illnessDay, record) => {
    setLoading(true);
    setError("");
    try {
      const data = await analyzeGraphRag({
        symptoms,
        day: illnessDay,
        temperature: record?.temperature,
        extras: {
          fluid: record?.fluidIntakeLiters,
          pregnant: record?.pregnancyStatus,
        },
      });
      if (data.success === false) throw new Error(data.error || "Analysis failed");
      console.log(
        "[Clinical Intelligence] result",
        "riskScore",
        data?.riskScore,
        "riskLevel",
        data?.riskLevel,
        "engine",
        data?.engine
      );
      setResult(data);
      const mapped = graphResultToAssessment(data);
      if (record?.computed) {
        setLatestAssessment(record.computed);
      } else if (mapped) {
        setLatestAssessment(mapped);
      }
      console.log(
        "[Clinical Intelligence] synced assessment riskScore",
        record?.computed?.riskScore ?? mapped?.riskScore
      );
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Clinical intelligence analysis failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphRagHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateLatest = async () => {
      if (latestRecord) return;
      try {
        const { data } = await api.get("/health/dashboard");
        const records = Array.isArray(data?.records) ? data.records : [];
        const record = records[records.length - 1] || null;
        if (!active) return;
        if (record) {
          setLatestRecord(record);
          setLatestAssessment(record?.computed || null);
        }
        setLatestTracking(normalizeTrackingRecords(records, records.length || 1));
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Unable to load latest assessment.");
      }
    };

    hydrateLatest();
    return () => {
      active = false;
    };
  }, [latestRecord, setLatestRecord, setLatestAssessment, setLatestTracking]);

  useEffect(() => {
    if (!latestRecord) return;
    const recordDay = Number(latestRecord.dayOfIllness || 1);
    const mapSymptom = (symptom) => {
      const key = String(symptom || "").toLowerCase();
      const map = {
        headache: "headache",
        vomiting: "vomiting",
        bleeding: "bleeding",
        rash: "rash",
        fatigue: "fatigue",
        dehydration: "dehydration",
        "abdominal pain": "abdominal_pain",
        "eye pain": "eye_pain",
        "fever drop": "fever_drop",
        fever_drop: "fever_drop",
      };
      return map[key] || null;
    };

    const recordSymptoms = (latestRecord.symptoms || [])
      .map(mapSymptom)
      .filter((id) => id && ALLOWED_GRAPH_SYMPTOMS.includes(id));

    setDay(recordDay);
    setSelected(recordSymptoms);

    if (recordSymptoms.length > 0) {
      runAnalysis(recordSymptoms, recordDay);
    }
  }, [latestRecord, runAnalysis]);

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

  const loadLatest = () => {
    if (!latestRecord) return;
    const recordDay = Number(latestRecord.dayOfIllness || 1);
    const recordSymptoms = (latestRecord.symptoms || [])
      .map((symptom) => String(symptom || "").toLowerCase())
      .map((symptom) =>
        symptom === "abdominal pain"
          ? "abdominal_pain"
          : symptom === "eye pain"
            ? "eye_pain"
            : symptom
      )
      .filter((id) => ALLOWED_GRAPH_SYMPTOMS.includes(id));

    setDay(recordDay);
    setSelected(recordSymptoms);
    if (recordSymptoms.length > 0) {
      runAnalysis(recordSymptoms, recordDay, latestRecord);
    }
  };

  return (
    <div className="min-h-screen bg-[#061120] text-slate-100">
      <DashboardNavbar userName={user?.name} userRole={user?.role} onLogout={logout} />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
              AI Clinical Intelligence Engine
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
              WHO-Aligned Clinical Intelligence Engine
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Relationship-aware clinical intelligence — not just document retrieval. WHO-aligned pathways
              make symptom progression explainable for care teams and public-health leadership.
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
              onClick={loadLatest}
              className="rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Live Analysis (Day {latestRecord?.dayOfIllness || day})
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
          <strong className="text-cyan-200">Why Clinical Intelligence beats traditional RAG:</strong> classic
          RAG returns similar text chunks only. The clinical intelligence engine traverses WHO-aligned
          pathways so fever drop may link to possible critical phase transition, WHO warnings, and escalation guidance — with
          a clear audit trail for clinicians and stakeholders.
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
                {loading ? "Running hybrid pipeline…" : "Run Clinical Intelligence Analysis"}
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
              <p className="mb-3 text-xs uppercase tracking-wider text-cyan-200/80">
                Live Clinical Intelligence Map
              </p>
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
