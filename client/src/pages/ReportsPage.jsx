import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { loadReportsHistory, loadDashboardData } from "../services/offlineApi";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import OfflineStatusBanner from "../components/offline/OfflineStatusBanner";
import { useAuth } from "../context/AuthContext";
import DashboardNavbar from "../components/DashboardNavbar";
import RiskSummary from "../components/RiskSummary";
import TrendChart from "../components/TrendChart";
import MedicalReportDownload from "../components/MedicalReportDownload";
import { normalizeTrackingRecords } from "../utils/tracking";
import { useClinicalStore } from "../store/useClinicalStore.jsx";
import { getReportSnapshot, logPreviousReportRender } from "../utils/assessment";
import { formatClinicalRisk, MEDICAL_DISCLAIMER, shouldShowElevatedCare } from "../utils/clinicalRisk";


const ReportsPage = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { userId: offlineUserId } = useOfflineStatus();
  const {
    latestAssessment,
    latestTracking,
    latestRecord,
    latestReport,
    setLatestAssessment,
    setLatestTracking,
    setLatestRecord,
    setLatestReport,
  } = useClinicalStore();

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
        // - GET /health/dashboard returns health records for trends.
        const uid = offlineUserId || user?._id || user?.id;
        const { reports, history, offline } = await loadReportsHistory();
        const { dashboard: dashboardData } = await loadDashboardData(uid);

        setLatestReport(reports[0] || null);
        setHistory(history);
        if (offline) setError("");

        const records = Array.isArray(dashboardData?.records) ? dashboardData.records : [];
        const latest = records[records.length - 1] || null;
        setLatestRecord(latest);
        const assessment =
          dashboardData?.latestAssessment || latest?.computed || null;
        setLatestAssessment(assessment);
        setLatestTracking(normalizeTrackingRecords(records, records.length || 1));
      } catch (e) {
        setError(e?.response?.data?.message || "Unable to load reports.");
        setLatestReport(null);
        setLatestRecord(null);
        setLatestAssessment(null);
        setLatestTracking([]);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const resolvedLatestReport = latestReport || null;
  const resolvedPatient = useMemo(
    () => ({
      name: user?.name || latestRecord?.user?.name || "Unknown Patient",
      email: user?.email || user?.id || user?._id || latestRecord?.user?.email || "No email",
      pregnancyStatus:
        latestRecord?.pregnancyStatus ??
        resolvedLatestReport?.pregnancyStatus ??
        resolvedLatestReport?.pregnancy_status ??
        false,
      dayOfIllness:
        latestRecord?.dayOfIllness ??
        resolvedLatestReport?.dayOfIllness ??
        resolvedLatestReport?.day_of_illness ??
        "-",
      updatedAt:
        resolvedLatestReport?.updatedAt ??
        latestRecord?.updatedAt ??
        latestRecord?.createdAt,
    }),
    [user, latestRecord, resolvedLatestReport]
  );

  const resolvedTracking = Array.isArray(latestTracking) ? latestTracking : [];

  const snapshot = getReportSnapshot(resolvedLatestReport);
  const riskScore = snapshot?.riskScore ?? null;
  const riskLevel = snapshot?.riskLevel ?? "Low";
  const warnings = snapshot?.detectedWarnings || resolvedLatestReport?.detectedWarnings || [];
  const actions = snapshot?.recommendations || resolvedLatestReport?.recommendations || [];
  const emergencyAdvice =
    snapshot?.emergencyAdvice ||
    resolvedLatestReport?.emergencyAdvice ||
    (riskScore >= 90
      ? "Immediate clinical evaluation recommended."
      : "Monitor symptoms, stay hydrated, and seek care if conditions worsen.");
  const advancedReasoning = {
    graphReasoning: resolvedLatestReport?.graphReasoning,
    whoGuidance: snapshot?.whoGuidance || resolvedLatestReport?.whoGuidance,
    confidence: resolvedLatestReport?.aiConfidenceLabel,
  };

  useEffect(() => {
    if (!resolvedLatestReport) return;
    console.log(
      "[REPORT RENDER]",
      "rendering report:",
      resolvedLatestReport._id,
      "riskScore:",
      resolvedLatestReport.riskScore,
      "createdAt:",
      resolvedLatestReport.createdAt
    );
  }, [resolvedLatestReport]);

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
            <h1 className="text-2xl font-semibold text-white md:text-3xl">{t("reportsTitle", { defaultValue: "Your health report" })}</h1>
            <p className="text-sm text-slate-400 mt-1">Risk · actions · download PDF</p>
          </div>

          <div className="flex items-center gap-3 mt-2 md:mt-0">
            <div className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded">
              {t("patient", { defaultValue: "Patient" })}: <span className="text-white/90">{resolvedPatient.name}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <OfflineStatusBanner />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-600/40 bg-red-600/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !resolvedLatestReport && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No clinical reports yet. Generate a report from the dashboard after saving today’s symptoms.
          </div>
        )}

        <div className="mt-6 space-y-6">
          <RiskSummary
            assessment={{
              riskScore,
              riskLevel,
              severityLabel: resolvedLatestReport?.severityLabel || riskLevel,
              recommendations: resolvedLatestReport?.recommendations,
            }}
            riskScore={riskScore}
            riskLevel={riskLevel}
            translatedRiskLevel={resolvedLatestReport?.severityLabel || riskLevel}
            warnings={warnings}
            actions={actions}
            showGuidance
          />

          <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Report file</h2>
                {(resolvedLatestReport?.offlineAvailable || resolvedLatestReport?.offlineGenerated) && (
                  <span className="mt-1 inline-flex rounded-full border border-teal-500/40 bg-teal-950/50 px-2 py-0.5 text-[10px] font-medium text-teal-200">
                    Available offline
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">
                {resolvedLatestReport?.createdAt
                  ? new Date(resolvedLatestReport.createdAt).toLocaleDateString()
                  : ""}
              </p>
            </div>
            {resolvedLatestReport && (
              <div className="mt-4">
                <MedicalReportDownload
                  report={resolvedLatestReport}
                  patient={resolvedPatient}
                />
              </div>
            )}
          </section>

          {history.length > 1 && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
            <h2 className="text-lg font-semibold text-white">Past reports</h2>
            <ul className="clinical-text mt-3 space-y-2 text-sm text-slate-300">
              {history.slice(1, 6).map((r) => (
                <li key={r._id || r.localId} className="flex justify-between border-b border-white/5 py-2">
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  <span className="font-medium text-white">{r.riskScore}/100</span>
                </li>
              ))}
            </ul>
          </section>
          )}
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{t("trendTitle", {
                defaultValue: `${resolvedTracking.length} day${resolvedTracking.length === 1 ? "" : "s"} trend`,
              })}</h2>
              <p className="text-sm text-slate-400 mt-1">{t("trendSubtitle", { defaultValue: "Temperature & risk progression" })}</p>
            </div>
          </div>
          <div className="mt-4">
            {resolvedTracking.length > 0 ? (
              <TrendChart records={resolvedTracking} />
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-slate-400">
                No tracking history yet. Save daily records to build a real trend line.
              </div>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-white">{t("symptomTimeline", { defaultValue: "Symptom timeline" })}</h2>
            <div className="mt-3 space-y-2">
              {resolvedTracking.length > 0 ? (
                resolvedTracking.slice(-3).map((r, idx) => (
                    <div key={idx} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p className="text-xs text-slate-400">
                        {r?.dayOfIllness || r?.day || idx + 1 ? `Day ${r.dayOfIllness || r.day || idx + 1}` : "Day"}
                        {r?.date ? ` • ${new Date(r.date).toLocaleDateString()}` : ""}
                      </p>
                      <p className="text-sm text-slate-200">
                        Symptoms: {Array.isArray(r?.symptoms) ? r.symptoms.join(", ") : r?.symptoms || "None"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                    No symptom timeline yet.
                  </div>
                )}
              </div>
            </div>
          </section>

      </div>
    </div>
  );
};

export default ReportsPage;

