import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import DashboardNavbar from "../components/DashboardNavbar";
import RiskSummary from "../components/RiskSummary";
import TrendChart from "../components/TrendChart";
import MedicalReportDownload from "../components/MedicalReportDownload";

const demoReport = {
  riskScore: 81,
  riskLevel: "HIGH",
  symptoms: ["Headache", "Vomiting", "Bleeding"],
  summary: "High risk dengue clinical assessment. Monitor closely and follow recommended actions.",
  reportText:
    "Assessment Summary: High risk dengue clinical assessment.\nDetected Warning Signs: Headache, Vomiting, Bleeding\nAI Risk Score: 81/100 (HIGH)\nRecommended Action: Immediate CBC monitoring advised.\nWHO Guidance: Maintain hydration and seek clinical care if symptoms worsen.\nWHO Guidance (Bangla): WHO মির্দেশনা: পানি ও বিশ্রাম, প্রয়োজন হলে দ্রুত চিকিৎসা নিন।\nEmergency Advice: Seek urgent care for persistent vomiting, bleeding, severe abdominal pain.",
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  nearestHospitals: [{ name: "Demo Hospital A" }, { name: "Demo Hospital B" }, { name: "Demo Hospital C" }],
};

const demoPatient = {
  name: "Demo Patient",
  email: "demo@patient.local",
  pregnancyStatus: false,
  dayOfIllness: 4,
  updatedAt: new Date().toISOString(),
};

const demoTracking = [
  { date: new Date(Date.now() - 2 * 86400000).toISOString(), temperature: 103, risk_score: 35, fluid: 0.8, dayOfIllness: 3, symptoms: ["Headache"] },
  { date: new Date(Date.now() - 1 * 86400000).toISOString(), temperature: 101, risk_score: 68, fluid: 0.9, dayOfIllness: 4, symptoms: ["Vomiting"] },
  { date: new Date().toISOString(), temperature: 99, risk_score: 91, fluid: 1.0, dayOfIllness: 5, symptoms: ["Bleeding"] },
];

const ReportsPage = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const [latestReport, setLatestReport] = useState(null);
  const [trackingRecords, setTrackingRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        // Backend contracts in this repo:
        // - GET /reports returns "top reports" array (DashboardPage uses it).
        // - GET /reports/history returns full history.
        // Tracking records are stored/handled by DashboardPage; fallback to demo.
        const [reportsRes, historyRes] = await Promise.all([
          api.get("/reports"),
          api.get("/reports/history"),
        ]);

        const reports = Array.isArray(reportsRes?.data) ? reportsRes.data : [];
        setLatestReport(reports[0] || null);
        setHistory(Array.isArray(historyRes?.data) ? historyRes.data : []);

        // If backend also returns tracking data embedded in report/history, attempt best-effort extraction.
        // Otherwise, keep demo/fallback.
        const maybeTracking = reports[0]?.trackingRecords || reports[0]?.tracking || [];
        setTrackingRecords(Array.isArray(maybeTracking) ? maybeTracking : []);
      } catch (e) {
        setError(e?.response?.data?.message || "Unable to load reports.");
        setLatestReport(null);
        setTrackingRecords([]);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const resolvedLatestReport = latestReport || demoReport;
  const resolvedPatient = useMemo(
    () => ({
      name: user?.name || demoPatient.name,
      email: user?.email || user?.id || user?._id || demoPatient.email,
      pregnancyStatus: resolvedLatestReport?.pregnancyStatus ?? resolvedLatestReport?.pregnancy_status ?? demoPatient.pregnancyStatus,
      dayOfIllness:
        resolvedLatestReport?.dayOfIllness ?? resolvedLatestReport?.day_of_illness ?? demoPatient.dayOfIllness,
      updatedAt: resolvedLatestReport?.updatedAt ?? demoPatient.updatedAt,
    }),
    [user, resolvedLatestReport]
  );

  const resolvedTracking = trackingRecords && trackingRecords.length > 0 ? trackingRecords : demoTracking;

  // Console debug to confirm click behavior + rendering.
  useEffect(() => {
    console.log("ReportsPage mounted. latestReport:", latestReport);
  }, [latestReport]);

  const riskScore = resolvedLatestReport?.riskScore ?? resolvedLatestReport?.risk_score ?? 0;
  const riskLevel = resolvedLatestReport?.riskLevel ?? resolvedLatestReport?.risk_level ?? "LOW";

  const isEmergency = Number(riskScore) > 85;

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <DashboardNavbar
        userName={user?.name}
        userRole={user?.role}
        onLogout={logout}
        onOpenSmartDoctor={() => console.log("Open Smart Doctor from ReportsPage")}
      />

      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white">{t("reportsTitle", { defaultValue: "AI Medical Reports" })}</h1>
            <p className="text-sm text-gray-300 mt-1">
              {t("reportsSubtitle", { defaultValue: "Personalized clinical risk summary and downloadable PDF" })}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-2 md:mt-0">
            <div className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded">
              {t("patient", { defaultValue: "Patient" })}: <span className="text-white/90">{resolvedPatient.name}</span>
            </div>
          </div>
        </div>

        {isEmergency && (
          <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-300">Emergency Mode</p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  
de9 SEEK IMMEDIATE MEDICAL CARE
                </h2>
                <p className="mt-2 text-sm text-red-200">
                  Risk score indicates a critical phase. Proceed to nearest hospital now.
                </p>
              </div>
              <div className="text-3xl font-semibold">
                {Math.round(Number(riskScore) || 0)}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-600/40 bg-red-600/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#1e293b] p-6 shadow-md">
            <RiskSummary
              riskScore={riskScore}
              riskLevel={riskLevel}
              translatedRiskLevel={riskLevel}
              alerts={isEmergency ? ["Emergency risk detected"] : []}
            />

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{t("aiClinicalSummary", { defaultValue: "AI clinical summary" })}</h2>
                <div className="text-xs text-gray-400">
                  {resolvedLatestReport?.createdAt ? new Date(resolvedLatestReport.createdAt).toLocaleDateString() : ""}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-gray-200">
                  {resolvedLatestReport?.summary || resolvedLatestReport?.reportText || "Clinical summary unavailable."}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{t("whoGuidance", { defaultValue: "WHO guidance" })}</p>
              <p className="mt-2 text-sm text-slate-200">
                {(resolvedLatestReport?.whoGuidance || resolvedLatestReport?.who_guidance || "Maintain hydration, monitor symptoms, and seek clinical care if worsening.")}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#1e293b] p-6 shadow-md">
            <h2 className="text-xl font-semibold text-white">{t("trendTitle", { defaultValue: "3-day trend" })}</h2>
            <p className="text-sm text-gray-300 mt-1">{t("trendSubtitle", { defaultValue: "Temperature & risk progression" })}</p>
            <div className="mt-4">
              <TrendChart records={resolvedTracking} />
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold text-white">{t("symptomTimeline", { defaultValue: "Symptom timeline" })}</h2>
              <div className="mt-3 space-y-2">
                {(resolvedTracking || []).slice(-3).map((r, idx) => (
                  <div key={idx} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-slate-400">
                      {r?.dayOfIllness || r?.day || idx + 1 ? `Day ${r.dayOfIllness || r.day || idx + 1}` : "Day"}
                      {r?.date ? ` • ${new Date(r.date).toLocaleDateString()}` : ""}
                    </p>
                    <p className="text-sm text-slate-200">
                      Symptoms: {Array.isArray(r?.symptoms) ? r.symptoms.join(", ") : r?.symptoms || "None"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-[#1e293b] p-6 shadow-md relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{t("downloadTitle", { defaultValue: "Download medical report" })}</h2>
              <p className="text-sm text-gray-300 mt-1">{t("downloadHint", { defaultValue: "Generate a PDF of this AI report" })}</p>
            </div>

            <div className="relative z-10">
              <MedicalReportDownload
                report={resolvedLatestReport}
                patient={resolvedPatient}
                trackingRecords={resolvedTracking}
                history={history}
              />
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            {loading ? "Loading report data..." : ""}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReportsPage;

