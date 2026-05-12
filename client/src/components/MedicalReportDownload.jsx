import { useMemo, useState } from "react";
import api from "../api";
import { generateMedicalReportPdf } from "../utils/reportPdf";

const LoadingOverlay = ({ isLoading }) =>
  isLoading ? (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/20">
      <span className="text-sm text-white">Generating PDF…</span>
    </div>
  ) : null;

/**
 * Download button that generates a REAL PDF using jsPDF.
 *
 * Props:
 * - report: latest report object (from /reports)
 * - patient: patient profile object (optional)
 * - trackingRecords: 3-day tracking records (optional)
 * - history: monitoring history (optional)
 */
const MedicalReportDownload = ({ report, patient, trackingRecords = [], history = [], hospitals = [] }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const resolvedPatient = useMemo(() => {
    // DashboardPage doesn't have a full patient object; pass what we can.
    // Server report payload often doesn't include patient; fallback to report's fields.
    return (
      patient ||
      report ||
      // Minimal fallback
      {
        name: "Unknown Patient",
        email: "No email",
        pregnancyStatus: report?.pregnancyStatus ?? report?.pregnancy_status,
        dayOfIllness: report?.dayOfIllness ?? report?.day_of_illness,
      }
    );
  }, [patient, report]);

  const handleDownload = async () => {
    if (!report) return;
    try {
      setIsDownloading(true);

      // If report is incomplete, try fetching latest report details.
      // (No-op if backend doesn't support it.)
      let latestReport = report;
      if (report?._id) {
        try {
          const res = await api.get(`/reports/${report._id}`);
          if (res?.data) latestReport = res.data;
        } catch {
          // ignore
        }
      }

      if (!latestReport.nearestHospitals || latestReport.nearestHospitals.length === 0) {
        if (hospitals && hospitals.length > 0) {
          latestReport.nearestHospitals = hospitals.map(h => ({
            name: h.name,
            distance: h.distanceKm ? `${h.distanceKm} km` : h.distance
          }));
        }
      }

      const doc = generateMedicalReportPdf({
        patient: resolvedPatient,
        latestReport,
        trackingRecords,
        history,
      });

      doc.save(
        `dengueshield-medical-report-${String(resolvedPatient?.email || resolvedPatient?.name || "patient").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`
      );

      // UX requirement: success toast/message.
      // No toast library in repo; use alert for guaranteed UX.
      window.alert("Medical report downloaded successfully");
    } catch (e) {
      console.error("PDF generation failed", e);
      window.alert("Failed to generate medical report PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <LoadingOverlay isLoading={isDownloading} />
      <button
        type="button"
        className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleDownload}
        disabled={isDownloading || !report}
      >
        <span className="inline-flex items-center gap-1.5">
          <img
            src="https://img.icons8.com/?size=100&id=108642&format=png&color=60A5FA"
            alt="Download icon"
            className="h-3.5 w-3.5"
          />
          <span>{isDownloading ? "Preparing…" : "Download Medical Report"}</span>
        </span>
      </button>
    </div>
  );
};

export default MedicalReportDownload;

