import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

const FAMILY_SHARE_STORAGE_KEY = "dengueShield:familyShares";

const toFahrenheit = (value) => {
  const numeric = Number(value || 0);
  return numeric <= 45 ? (numeric * 9) / 5 + 32 : numeric;
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const normalizeApiPayload = (apiData) => {
  const records = Array.isArray(apiData?.records) ? apiData.records : [];
  const latest = records[records.length - 1];
  const alerts = latest?.computed?.explainability?.reasons || [];

  return {
    createdAt: new Date().toISOString(),
    patient: {
      name: apiData?.user?.name || "Patient",
      email: apiData?.user?.email || "",
    },
    risk: {
      score: Number(latest?.computed?.riskScore || 0),
      level: String(latest?.computed?.riskLevel || "Low"),
      translatedLevel: String(latest?.computed?.riskLevel || "Low"),
    },
    criticalAlerts: Array.isArray(alerts) ? alerts : [],
    hydration: {
      intakeLiters: Number(latest?.fluidIntakeLiters || 0),
      status:
        Number(latest?.fluidIntakeLiters || 0) >= 2.5
          ? "Excellent"
          : Number(latest?.fluidIntakeLiters || 0) >= 1.5
            ? "Moderate"
            : "Needs Attention",
    },
    symptomTrends: records.map((record) => ({
      date: record.createdAt || new Date().toISOString(),
      symptoms: record.symptoms || [],
      dayOfIllness: record.dayOfIllness || 0,
    })),
    feverTrend: records.map((record) => ({
      date: record.createdAt || new Date().toISOString(),
      temperature: Number(record.temperature || 0),
      riskScore: Number(record?.computed?.riskScore || 0),
    })),
    recommendations: [
      "Continue hydration and monitor fever every 4-6 hours.",
      "Watch for bleeding, abdominal pain, and persistent vomiting.",
      "Seek emergency clinical care for escalating warning signs.",
    ],
  };
};

const FamilyViewPage = () => {
  const { token } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadFamilyData = async () => {
      setIsLoading(true);
      setError("");
      try {
        let shareMap = {};
        try {
          shareMap = JSON.parse(localStorage.getItem(FAMILY_SHARE_STORAGE_KEY) || "{}");
        } catch {
          shareMap = {};
        }

        if (shareMap[token]) {
          if (isMounted) setData(shareMap[token]);
          return;
        }

        const response = await api.get(`/health/family/${token}`);
        const normalized = normalizeApiPayload(response.data);
        if (isMounted) setData(normalized);
      } catch {
        if (isMounted) {
          setError("Invalid or expired family link.");
          setData(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFamilyData();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const sortedFeverTrend = useMemo(() => {
    const trend = Array.isArray(data?.feverTrend) ? data.feverTrend : [];
    return [...trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const maxTemp = Math.max(...sortedFeverTrend.map((item) => toFahrenheit(item.temperature)), 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#061120] px-4 py-8 text-slate-200 md:px-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="h-28 rounded-3xl border border-white/10 bg-white/5" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-32 rounded-2xl border border-white/10 bg-white/5" />
            <div className="h-32 rounded-2xl border border-white/10 bg-white/5" />
            <div className="h-32 rounded-2xl border border-white/10 bg-white/5" />
          </div>
          <div className="h-64 rounded-3xl border border-white/10 bg-white/5" />
        </div>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen bg-[#061120] px-4 py-10 text-slate-200 md:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-200">Access Error</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Family Link Not Valid</h1>
          <p className="mt-3 text-sm text-rose-100">
            {error || "This family monitoring link does not exist or has expired."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#061120] px-4 py-6 text-slate-100 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#0e223e]/90 via-[#12314b]/86 to-[#0e2744]/82 p-6 shadow-[0_20px_40px_rgba(2,6,23,0.38)] backdrop-blur-xl md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-cyan-400/20 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Family Monitoring Portal</p>
          <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Read-Only Patient Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Monitoring for <span className="font-semibold text-slate-100">{data.patient?.name || "Patient"}</span>
            {data.patient?.email ? ` (${data.patient.email})` : ""}
          </p>
          <p className="mt-2 text-xs text-slate-400">This page is view-only. Editing is disabled for caregivers.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current Risk Score</p>
            <p className="mt-2 text-4xl font-bold text-white">{Math.round(Number(data.risk?.score || 0))}/100</p>
            <p className="mt-2 text-sm text-cyan-200">{data.risk?.translatedLevel || data.risk?.level || "Low"} Risk</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Hydration</p>
            <p className="mt-2 text-xl font-semibold text-white">{data.hydration?.status || "Unknown"}</p>
            <p className="mt-1 text-sm text-slate-300">{Number(data.hydration?.intakeLiters || 0).toFixed(1)}L intake</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Critical Alerts</p>
            <p className="mt-2 text-xl font-semibold text-white">{data.criticalAlerts?.length || 0}</p>
            <p className="mt-1 text-sm text-slate-300">Active advisory signals</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Last Updated</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatDate(data.createdAt)}</p>
            <p className="mt-1 text-sm text-slate-300">Snapshot timestamp</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_30px_rgba(2,6,23,0.3)] backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white">Fever Trend Graph (°F)</h2>
            <div className="mt-4 grid h-56 grid-cols-6 items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 md:grid-cols-8">
              {sortedFeverTrend.length === 0 && (
                <p className="col-span-full text-center text-sm text-slate-400">No fever trend data available.</p>
              )}
              {sortedFeverTrend.map((point) => {
                const tempF = toFahrenheit(point.temperature);
                const height = Math.max(14, (tempF / maxTemp) * 100);
                return (
                  <div key={`${point.date}-${tempF}`} className="flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-cyan-500 to-teal-300"
                      style={{ height: `${height}%` }}
                      title={`${tempF.toFixed(1)}°F`}
                    />
                    <span className="text-[10px] text-slate-400">{formatDate(point.date)}</span>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_30px_rgba(2,6,23,0.3)] backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white">Symptom Trends</h2>
            <div className="mt-4 space-y-3">
              {(data.symptomTrends || []).slice(-5).reverse().map((entry) => (
                <div key={`${entry.date}-${entry.dayOfIllness}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    Day {entry.dayOfIllness || "N/A"} • {formatDate(entry.date)}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {entry.symptoms?.length ? entry.symptoms.join(", ") : "No symptoms reported"}
                  </p>
                </div>
              ))}
              {(!data.symptomTrends || data.symptomTrends.length === 0) && (
                <p className="text-sm text-slate-400">No symptom entries available.</p>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white">AI Recommendations</h2>
            <ul className="mt-4 space-y-2">
              {(data.recommendations || []).map((item, index) => (
                <li key={`${item}-${index}`} className="rounded-xl border border-cyan-300/20 bg-cyan-500/5 px-3 py-2 text-sm text-cyan-100">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white">Critical Alerts</h2>
            <ul className="mt-4 space-y-2">
              {(data.criticalAlerts || []).map((alert) => (
                <li key={alert} className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  {alert}
                </li>
              ))}
              {(!data.criticalAlerts || data.criticalAlerts.length === 0) && (
                <li className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                  No critical alerts right now.
                </li>
              )}
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
};

export default FamilyViewPage;
