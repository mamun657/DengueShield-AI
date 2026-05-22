import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
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
        const [reportsRes, historyRes, dashboardRes] = await Promise.all([
          api.get("/reports"),
          api.get("/reports/history"),
          api.get("/health/dashboard"),
        ]);

        const reports = Array.isArray(reportsRes?.data) ? reportsRes.data : [];
        setLatestReport(reports[0] || null);
        setHistory(Array.isArray(historyRes?.data) ? historyRes.data : []);

        const records = Array.isArray(dashboardRes?.data?.records) ? dashboardRes.data.records : [];
        const latest = records[records.length - 1] || null;
        setLatestRecord(latest);
        const assessment =
          dashboardRes?.data?.latestAssessment || latest?.computed || null;
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

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[28px] border border-white/10 bg-[#111827]/95 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.25)]">
            <RiskSummary
              assessment={{
                riskScore,
                riskLevel,
                severityLabel: resolvedLatestReport?.severityLabel || riskLevel,
                displayTitle: resolvedLatestReport?.displayTitle,
                aiConfidenceLabel: resolvedLatestReport?.aiConfidenceLabel,
                labPending: resolvedLatestReport?.labPending,
                clinicalSubtitle: resolvedLatestReport?.clinicalSubtitle,
                triggeredFactors: resolvedLatestReport?.triggeredFactors,
                recommendations: resolvedLatestReport?.recommendations,
                medicalDisclaimer: resolvedLatestReport?.medicalDisclaimer || MEDICAL_DISCLAIMER,
              }}
              riskScore={riskScore}
              riskLevel={riskLevel}
              translatedRiskLevel={resolvedLatestReport?.severityLabel || riskLevel}
              warnings={warnings}
              actions={actions}
              emergencyAdvice={emergencyAdvice}
              advancedReasoning={advancedReasoning}
            />
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#111827]/95 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{t("reportOverview", { defaultValue: "Report overview" })}</h2>
                <p className="text-sm text-slate-400 mt-1">{t("latestReport", { defaultValue: "Latest AI medical report" })}</p>
              </div>
              <div className="text-xs text-slate-500">
                {resolvedLatestReport?.createdAt ? new Date(resolvedLatestReport.createdAt).toLocaleDateString() : ""}
              </div>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-slate-100">{t("reportSummary", { defaultValue: "Report summary" })}</p>
                <p className="mt-2 leading-7 text-slate-300">
                  {snapshot?.clinicalSummary || resolvedLatestReport?.summary || "A concise clinical overview is not available."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-slate-100">{t("recommendedCare", { defaultValue: "Recommended care" })}</p>
                <p className="mt-2 leading-7 text-slate-300">
                  {emergencyAdvice}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <MedicalReportDownload latestReport={resolvedLatestReport} />
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#111827]/95 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.15)]">
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

        {history.length > 1 && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-[#1e293b] p-6 shadow-md">
            <h2 className="text-xl font-semibold text-white">Report history</h2>
            <p className="mt-1 text-sm text-slate-400">Immutable snapshots — scores never change retroactively.</p>
            <div className="mt-4 space-y-3">
              {history.map((report) => {
                logPreviousReportRender(report);
                return (
                  <div
                    key={report._id}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-white">
                        {new Date(report.createdAt).toLocaleString()} — Day {report.dayOfIllness ?? "—"}
                      </p>
                      <p className="text-sm font-semibold text-cyan-200">
                        {Math.round(report.riskScore ?? 0)}/100 · {report.riskLevel}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Symptoms: {(report.symptoms || []).join(", ") || "None"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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

