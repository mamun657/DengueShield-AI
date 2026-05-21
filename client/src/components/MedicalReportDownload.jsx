import { useMemo, useState } from "react";
import { generateMedicalReportPdf } from "../utils/reportPdf";

const LoadingOverlay = ({ isLoading }) =>
  isLoading ? (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/20">
      <span className="text-sm text-white">Generating PDF…</span>
    </div>
  ) : null;

/**
 * Download button that generates a PDF from an immutable report snapshot.
 * Does NOT refresh or overwrite scores from live/global assessment state.
 */
const MedicalReportDownload = ({
  report,
  patient,
  trackingRecords = [],
  history = [],
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const resolvedPatient = useMemo(() => {
    return (
      patient || {
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

      console.log(
        "[PDF SNAPSHOT]",
        "reportId:",
        report._id,
        "riskScore:",
        report.riskScore,
        "createdAt:",
        report.createdAt
      );

      const doc = generateMedicalReportPdf({
        patient: resolvedPatient,
        latestReport: report,
        trackingRecords,
        history,
      });

      doc.save(
        `dengueshield-medical-report-${String(resolvedPatient?.email || resolvedPatient?.name || "patient").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${report._id}.pdf`
      );

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
