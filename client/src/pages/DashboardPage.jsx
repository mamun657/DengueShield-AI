import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import api from "../api";
import { API_BASE_URL } from "../config/apiBase";
import {
  loadDashboardData,
  submitSymptomRecord,
  generateReport,
  getOfflineNearbyHospitals,
  isNetworkOnline,
} from "../services/offlineApi";
import { useAuth } from "../context/AuthContext";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import OfflineStatusBanner from "../components/offline/OfflineStatusBanner";
import RuralModeToggle from "../components/offline/RuralModeToggle";
import OfflineLiteBadge from "../components/offline/OfflineLiteBadge";
import CompactHospitalSection from "../components/clinical/CompactHospitalSection";
import { generateMedicalReportPdf } from "../utils/reportPdf";
import DashboardNavbar from "../components/DashboardNavbar";
import RiskSummary from "../components/RiskSummary";
import SymptomForm from "../components/SymptomForm";
import TrendChart from "../components/TrendChart";
import ChatBox from "../components/ChatBox";
import MedicalReportDownload from "../components/MedicalReportDownload";
import { normalizeTrackingRecords } from "../utils/tracking";
import { useClinicalStore } from "../store/useClinicalStore.jsx";
import { resolveUnifiedAssessment, logPreviousReportRender } from "../utils/assessment";
import {
  formatClinicalRisk,
  shouldShowElevatedCare,
} from "../utils/clinicalRisk";

const sanitizeReportText = (text) =>
  String(text || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*`]/g, "")
    .trim();

const formatTemperatureText = (text) =>
  String(text || "").replace(/(\d+(?:\.\d+)?)\s*°?C\b/g, (_match, value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return _match;
    const fahrenheit = (numeric * 9) / 5 + 32;
    return `${Math.round(fahrenheit)}°F`;
  });

const detectCriticalPhase = (record, previousRecord) => {
  if (!record) return false;
  const day = Number(record.dayOfIllness || 0);
  if (day < 3) return false;

  const symptoms = (record.symptoms || []).map((symptom) => String(symptom).toLowerCase());
  const severeSymptoms = ["bleeding", "abdominal pain", "vomiting", "restlessness", "fatigue", "eye pain"];
  const highRiskSymptoms = severeSymptoms.some((symptom) => symptoms.includes(symptom));
  const feverDrop =
    previousRecord && Number(record.temperature) < Number(previousRecord.temperature);

  const hasPrimarySigns = symptoms.includes("bleeding") || symptoms.includes("abdominal pain") || symptoms.includes("restlessness");

  return hasPrimarySigns && (feverDrop || highRiskSymptoms);
};

const extractReportSections = (report) => {
  const cleanText = sanitizeReportText(report?.reportText || "");
  const lines = cleanText.split("\n").map((line) => line.trim()).filter(Boolean);
  const sections = {
    "Assessment Summary": report?.summary || "Clinical assessment summary unavailable.",
    "Detected Warning Signs":
      (report?.detectedWarnings || report?.symptoms || []).join(", ") || "None reported.",
    "AI Risk Score": Number.isFinite(report?.riskScore)
      ? `${report.riskScore}/100 (${report.riskLevel})`
      : "Not available",
    "Recommended Action": "Maintain hydration, daily symptom monitoring, and clinical care if warning signs develop.",
    "WHO Guidance":
      report?.whoGuidance ||
      "Continue hydration and rest. Seek immediate hospital care if warning signs appear: persistent vomiting, abdominal pain, bleeding, or drowsiness.",
    "WHO Guidance (Bangla)": "ক্রমাগত হাইড্রেশন বজায় রাখুন। জরুরি লক্ষণ দেখা দিলে হাসপাতালে যান: ক্রমাগত বমি, পেটে ব্যথা, রক্তক্ষরণ বা তন্দ্রা।",
    "Emergency Advice":
      report?.emergencyAdvice ||
      "Seek urgent hospital care if: persistent vomiting, severe abdominal pain, bleeding, lethargy, or severe weakness develops.",
    "Disclaimer": "This AI system estimates dengue risk and does not diagnose. Symptoms may overlap with COVID-19, influenza, malaria, typhoid, and other febrile illnesses.",
  };

  lines.forEach((line) => {
    const [label, ...rest] = line.split(":");
    const content = rest.join(":").trim();
    if (sections[label] && content) {
      sections[label] = content;
    }
  });

  const ordered = [
    "Assessment Summary",
    "Detected Warning Signs",
    "AI Risk Score",
    "Recommended Action",
    "WHO Guidance",
    "WHO Guidance (Bangla)",
    "Emergency Advice",
    "Disclaimer",
  ].map((title) => ({ title, content: formatTemperatureText(sections[title]) }));

  if (report?.riskScore >= 61) {
    ordered.push({
      title: "Emergency Advice (Bangla)",
      content: "এখনই হাসপাতালে যান। জরুরি লক্ষণ দেখা দিলে দ্রুত চিকিৎসা প্রয়োজন।",
    });
  }

  return ordered;
};

const reportSectionMeta = {
  "Assessment Summary": {
    icon: "doc",
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  "Detected Warning Signs": {
    icon: "alert",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  "AI Risk Score": {
    icon: "shield",
    tone: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
  "Recommended Action": {
    icon: "pulse",
    tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  "WHO Guidance": {
    icon: "book",
    tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  },
  "WHO Guidance (Bangla)": {
    icon: "globe",
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  "Emergency Advice": {
    icon: "alert",
    tone: "border-red-500/30 bg-red-500/10 text-red-300",
  },
  "Emergency Advice (Bangla)": {
    icon: "alert",
    tone: "border-red-500/30 bg-red-500/10 text-red-300",
  },
  Disclaimer: {
    icon: "info",
    tone: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  },
};

const renderReportIcon = (iconKey, className) => {
  switch (iconKey) {
    case "alert":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        </svg>
      );
    case "shield":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3 19 6v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z" />
          <path d="M9.5 12h5" />
        </svg>
      );
    case "pulse":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12h4l2-4 4 8 2-4h4" />
        </svg>
      );
    case "book":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h7a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H3Z" />
          <path d="M21 6h-7a3 3 0 0 0-3 3v12a3 3 0 0 1 3-3h7Z" />
        </svg>
      );
    case "globe":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a12 12 0 0 0 0 18" />
          <path d="M12 3a12 12 0 0 1 0 18" />
        </svg>
      );
    case "info":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6" />
          <path d="M12 7h.01" />
        </svg>
      );
    case "doc":
    default:
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 4h6l3 3v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M15 4v4h4" />
          <path d="M9 13h6" />
          <path d="M9 17h4" />
        </svg>
      );
  }
};

const ReportSections = ({ report, density = "full", className = "" }) => {
  const sections = extractReportSections(report);
  const displaySections = density === "compact" ? sections.slice(0, 3) : sections;
  const isCompact = density === "compact";
  const iconSize = isCompact ? "h-7 w-7" : "h-8 w-8";
  const iconGlyph = isCompact ? "h-3.5 w-3.5" : "h-4 w-4";
  const titleClass = isCompact ? "text-[10px]" : "text-[11px]";
  const bodyClass = isCompact ? "text-xs" : "text-sm";
  const rowPadding = isCompact ? "py-2" : "py-3";

  return (
    <div className={`divide-y divide-white/10 ${className}`}>
      {displaySections.map((section) => {
        const meta = reportSectionMeta[section.title] || reportSectionMeta["Assessment Summary"];
        return (
          <div key={section.title} className={`flex gap-3 ${rowPadding}`}>
            <div
              className={`mt-0.5 flex ${iconSize} items-center justify-center rounded-lg border ${meta.tone}`}
            >
              {renderReportIcon(meta.icon, iconGlyph)}
            </div>
            <div className="min-w-0">
              <p className={`${titleClass} uppercase tracking-[0.2em] text-slate-400`}>
                {section.title}
              </p>
              <p className={`mt-1 ${bodyClass} leading-relaxed text-slate-200`}>
                {section.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isOnline, userId: offlineUserId } = useOfflineStatus();
  const [lastSubmissionOffline, setLastSubmissionOffline] = useState(false);
  const [hospitalSearchLoading, setHospitalSearchLoading] = useState(false);
  const {
    latestAssessment,
    currentRisk,
    latestTracking,
    setLatestAssessment,
    setCurrentRisk,
    setLatestTracking,
    setLatestRecord,
    setLatestReport,
    hydrateFromDashboard,
  } = useClinicalStore();
  const [dashboard, setDashboard] = useState({ profile: null, records: [], trend: [] });
  const [reports, setReports] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [predictionError, setPredictionError] = useState("");
  const [predictionNotice, setPredictionNotice] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [rashFile, setRashFile] = useState(null);
  const [rashPreviewUrl, setRashPreviewUrl] = useState("");
  const [rashResult, setRashResult] = useState(null);
  const [rashError, setRashError] = useState("");
  const [rashLoading, setRashLoading] = useState(false);
  const [rashDragActive, setRashDragActive] = useState(false);
  const [rashTimestamp, setRashTimestamp] = useState("");
  const [gradcamImageUrl, setGradcamImageUrl] = useState("");
  const [originalRashImageUrl, setOriginalRashImageUrl] = useState("");
  const rashInputRef = useRef(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraLoading, setCameraLoading] = useState(false);


  const resolvedAssessment = resolveUnifiedAssessment({
    latestAssessment,
    currentRisk,
    latestRecord: dashboard.records[dashboard.records.length - 1],
  });

  const clinicalDisplay = formatClinicalRisk(resolvedAssessment);
  const translatedRiskLevel =
    resolvedAssessment?.severityLabel || resolvedAssessment?.riskLevel || "";
  const displayRiskScore = resolvedAssessment?.riskScore ?? null;

  const rashMaxSizeMb = 5;
  const rashApiUrl = `${API_BASE_URL}/rash/predict`;
  const rashAllowedTypes = ["image/jpeg", "image/png"];

  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [fullHistory, setFullHistory] = useState([]);

  const loadFullHistory = async () => {
    setIsReportsModalOpen(true);
    try {
      const res = await api.get("/reports/history");
      setFullHistory(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const deleteReport = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await api.delete(`/reports/${id}`);
      await load(); // Reload top 5
      if (isReportsModalOpen) {
        setFullHistory((prev) => prev.filter((r) => r._id !== id));
      }
    } catch (err) {
      console.error("Failed to delete report", err);
    }
  };

  const getRiskColor = (level) => {
    const l = String(level).toUpperCase();
    if (l === "CRITICAL" || l === "HIGH") return "text-red-400";
    if (l === "MODERATE" || l === "MEDIUM") return "text-yellow-400";
    return "text-green-400";
  };

  const getRiskIcon = (level) => {
    const l = String(level).toUpperCase();
    if (l === "CRITICAL" || l === "HIGH") return "🚨";
    if (l === "MODERATE" || l === "MEDIUM") return "⚠️";
    return "📄";
  };

  const getRiskTheme = (level) => {
    const l = String(level || "").toUpperCase();
    if (l === "CRITICAL") {
      return {
        badge: "border-red-400/60 bg-red-500/20 text-red-200",
        glow: "shadow-[0_0_45px_rgba(248,113,113,0.25)]",
        hoverGlow: "hover:shadow-[0_0_60px_rgba(248,113,113,0.35)]",
        accent: "from-red-500/80 via-red-500/30 to-transparent",
      };
    }
    if (l === "HIGH") {
      return {
        badge: "border-orange-400/50 bg-orange-500/20 text-orange-200",
        glow: "shadow-[0_0_40px_rgba(251,146,60,0.22)]",
        hoverGlow: "hover:shadow-[0_0_55px_rgba(251,146,60,0.3)]",
        accent: "from-orange-500/70 via-orange-500/30 to-transparent",
      };
    }
    if (l === "MODERATE" || l === "MEDIUM") {
      return {
        badge: "border-amber-400/50 bg-amber-500/15 text-amber-200",
        glow: "shadow-[0_0_35px_rgba(251,191,36,0.2)]",
        hoverGlow: "hover:shadow-[0_0_50px_rgba(251,191,36,0.28)]",
        accent: "from-amber-400/70 via-amber-400/25 to-transparent",
      };
    }
    return {
      badge: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
      glow: "shadow-[0_0_30px_rgba(52,211,153,0.2)]",
      hoverGlow: "hover:shadow-[0_0_45px_rgba(52,211,153,0.28)]",
      accent: "from-emerald-400/60 via-emerald-400/20 to-transparent",
    };
  };

  const load = async () => {
    try {
      setError("");
      setIsLoading(true);
      const uid = offlineUserId || user?._id || user?.id;
      const { dashboard: dashboardData, reports: reportData, offline } =
        await loadDashboardData(uid);

      setDashboard(dashboardData);
      setReports(reportData);
      if (offline) {
        setPredictionNotice("Showing cached / offline data — will sync when online.");
      }

      const recordCount = dashboardData?.records?.length || 0;
      const tracking = normalizeTrackingRecords(dashboardData?.records || [], recordCount || 1);
      hydrateFromDashboard({ dashboard: dashboardData, reports: reportData, tracking });
      setLatestTracking(tracking);
      if (dashboardData?.latestAssessment) {
        setLatestAssessment(dashboardData.latestAssessment);
        setCurrentRisk(dashboardData.latestAssessment);
      }

      const latestRecord = (dashboardData?.records || []).slice(-1)[0];
      if (latestRecord) {
        console.log(
          "[Dashboard] latestRecord",
          latestRecord._id || latestRecord.localId,
          "riskScore",
          latestRecord?.computed?.riskScore,
          "source",
          latestRecord?.computed?.riskSource,
          "offline",
          !!offline
        );
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!rashFile) {
      setRashPreviewUrl("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(rashFile);
    setRashPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [rashFile]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = dashboard.records[dashboard.records.length - 1];
  const latestComputed = latest?.computed;
  const previous = dashboard.records[dashboard.records.length - 2];
  const criticalPhaseDetected = detectCriticalPhase(latest, previous);
  const handleSymptomSubmit = async (payload) => {
    setPredictionError("");
    setPredictionNotice("");
    setPredictionLoading(true);

    try {
      const uid = offlineUserId || user?._id || user?.id;
      const previous = dashboard.records[dashboard.records.length - 1];
      const { record, offline } = await submitSymptomRecord(payload, {
        userId: uid,
        previousRecord: previous,
      });
      const computed = record?.computed;

      if (computed) {
        setLatestAssessment(computed);
        setCurrentRisk(computed);
      }

      setLatestRecord(record);
      setLastSubmissionOffline(offline);

      if (offline) {
        setPredictionNotice(
          "Offline mode active — record saved locally. WHO-aligned lite risk estimate applied."
        );
      } else if (computed?.riskSource === "fallback") {
        setPredictionNotice("ML service unavailable. Saved record with baseline risk.");
      }

      console.log(
        "[Dashboard] savedRecord",
        record?._id || record?.localId,
        "riskScore",
        computed?.riskScore,
        "source",
        computed?.riskSource,
        "offline",
        offline
      );

      await load();

      try {
        const { report } = await generateReport(hospitals, {
          recordLocalId: record?.localId,
        });
        if (report) setLatestReport(report);
        await load();
      } catch (reportError) {
        console.error("Failed to auto-generate report", reportError);
      }
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to save record.";
      setPredictionError(message);
    } finally {
      setPredictionLoading(false);
    }
  };

  const resetRashOutput = () => {
    setRashResult(null);
    setRashError("");
    setRashTimestamp("");
    setGradcamImageUrl("");
    setOriginalRashImageUrl("");
  };

  const validateRashFile = (file) => {
    if (!file) {
      return t("rashFileRequired", { defaultValue: "Please select an image." });
    }
    if (!rashAllowedTypes.includes(file.type)) {
      return t("rashFileTypeError", { defaultValue: "Supported formats: JPG or PNG." });
    }
    if (file.size > rashMaxSizeMb * 1024 * 1024) {
      return t("rashFileSizeError", {
        defaultValue: `File size must be under ${rashMaxSizeMb} MB.`,
        maxSize: rashMaxSizeMb,
      });
    }
    return "";
  };

  const handleRashSelection = (file) => {
    resetRashOutput();
    const validationMessage = validateRashFile(file);
    if (validationMessage) {
      setRashError(validationMessage);
      setRashFile(null);
      return;
    }
    setRashFile(file);
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    } catch {
      // ignore
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const openCamera = async () => {
    setCameraError("");
    setCameraLoading(true);
    resetRashOutput();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera not supported. Please upload manually.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS may require play() after setting srcObject
        await videoRef.current.play().catch(() => {});
      }
      setCameraMode(true);
    } catch (err) {
      const message = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
        ? "Camera access denied. Please upload manually."
        : "Unable to access camera. Please upload manually.";
      setCameraError(message);
      setCameraMode(false);
      stopCamera();
    } finally {
      setCameraLoading(false);
    }
  };

  const captureFromCamera = async () => {
    setCameraError("");
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Failed to capture image");

      const file = new File([blob], `rash-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      handleRashSelection(file);

      // keep preview but stop live camera
      setCameraMode(false);
      stopCamera();
    } catch {
      setCameraError("Capture failed. Please upload manually.");
    }
  };

  const retake = async () => {
    setCameraError("");
    resetRashOutput();
    await openCamera();
  };

  const handleRashSubmit = async () => {
    resetRashOutput();
    const validationMessage = validateRashFile(rashFile);
    if (validationMessage) {
      setRashError(validationMessage);
      return;
    }

    setRashLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", rashFile);

      const response = await axios.post(rashApiUrl, formData, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.error || "Rash prediction failed.");
      }

      setRashResult({
        prediction: response.data.prediction,
        confidence: response.data.confidence,
      });
      setGradcamImageUrl(String(response.data.gradcam_image_url || ""));
      setOriginalRashImageUrl(String(response.data.original_image_url || ""));
      setRashTimestamp(new Date().toLocaleString());
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || "Rash prediction failed.";
      setRashError(message);
    } finally {
      setRashLoading(false);
    }
  };

  const buildRashInterpretation = (confidenceValue) => {
    const numeric = Number(confidenceValue || 0);
    if (numeric > 75) {
      return t("rashInterpretationHigh");
    }
    if (numeric >= 40) {
      return t("rashInterpretationMedium");
    }
    return t("rashInterpretationLow");
  };

  const findHospitals = () => {
    setHospitalSearchLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          if (isNetworkOnline()) {
            try {
              const { data } = await api.get(
                `/hospitals/nearby?lat=${latitude}&lng=${longitude}`
              );
              setHospitals(data.hospitals);
              return;
            } catch {
              // fall through to offline directory
            }
          }
          setHospitals(getOfflineNearbyHospitals(latitude, longitude));
        } finally {
          setHospitalSearchLoading(false);
        }
      },
      () => {
        setHospitals(getOfflineNearbyHospitals(null, null, 5));
        setHospitalSearchLoading(false);
      }
    );
  };

  const handleDownloadReport = () => {
    const report = reports[0];
    if (!report) {
      setError("No report to download yet. Save symptoms first.");
      return;
    }
    try {
      const doc = generateMedicalReportPdf({
        patient: {
          name: user?.name,
          email: user?.email,
          pregnancyStatus: latest?.pregnancyStatus,
          dayOfIllness: latest?.dayOfIllness,
        },
        latestReport: report,
      });
      doc.save(
        `dengueshield-report-${String(user?.email || "patient").replace(/[^a-z0-9]+/gi, "-")}.pdf`
      );
    } catch (e) {
      setError("Could not generate PDF.");
    }
  };

  const cardClass = "rounded-2xl border border-white/10 bg-[#1e293b] p-6 shadow-md";
  const sectionTitleClass = "mb-2 text-xl font-semibold text-white";
  const trackingSource =
    latestTracking.length > 0
      ? latestTracking
      : normalizeTrackingRecords(dashboard.records, dashboard.records?.length || 0);
  const trackingTitle = `${trackingSource.length} Day${trackingSource.length === 1 ? "" : "s"} Tracking`;

  const warnings = resolvedAssessment?.detectedWarnings || [];
  const actions = resolvedAssessment?.recommendations || [];

  const rashResultMessage = rashResult
    ? rashResult.prediction === "DENGUE"
      ? t("rashResultDengue")
      : t("rashResultNonDengue")
    : t("rashResultPending");
  const rashInterpretation = rashResult ? buildRashInterpretation(rashResult.confidence) : "";

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <DashboardNavbar
        userName={user?.name}
        userRole={user?.role}
        onLogout={logout}
        onOpenSmartDoctor={() => setIsChatOpen(true)}
      />
      <ChatBox
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        patientData={{
          risk_score: displayRiskScore,
          symptoms: latest?.symptoms?.join(", ") || "None",
          day: latest?.dayOfIllness || "N/A",
        }}
      />

      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-white md:text-3xl">{t("dashboardTitle")}</h1>
          <RuralModeToggle />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <OfflineStatusBanner />
          {(lastSubmissionOffline || resolvedAssessment?.riskMode === "offline-lite") && (
            <OfflineLiteBadge />
          )}
        </div>

        <div className="mt-6">
          <RiskSummary
            assessment={resolvedAssessment}
            riskScore={displayRiskScore}
            riskLevel={translatedRiskLevel}
            translatedRiskLevel={translatedRiskLevel}
            warnings={warnings}
            actions={actions}
            onFindHospital={findHospitals}
            onDownloadReport={reports.length > 0 ? handleDownloadReport : undefined}
            showGuidance
          />
        </div>

        <div className="mt-6">
          <CompactHospitalSection
            hospitals={hospitals}
            onFindNearby={findHospitals}
            loading={hospitalSearchLoading}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-600/40 bg-red-600/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={sectionTitleClass}>{trackingTitle}</h2>
            </div>
            {trackingSource.length === 0 && (
              <p className="text-sm text-gray-400">
                No tracking history yet. Save a daily record to start tracking.
              </p>
            )}
            <TrendChart records={trackingSource} />
          </section>

          <section className={cardClass}>
            <h2 className={sectionTitleClass}>{t("dailySymptomInput")}</h2>
            <SymptomForm onSubmit={handleSymptomSubmit} />
            <div className="mt-4 space-y-2">
              {predictionLoading && (
                <p className="text-sm text-gray-300">Calculating risk score...</p>
              )}
              {predictionError && (
                <p className="text-sm text-red-300">{predictionError}</p>
              )}
              {predictionNotice && !predictionError && (
                <p className="text-sm text-gray-300">{predictionNotice}</p>
              )}
              {clinicalDisplay && !predictionLoading && !predictionError && (
                <p className="text-sm text-slate-400">
                  Saved · Risk <span className="font-semibold text-white">{clinicalDisplay.score}/100</span>
                </p>
              )}
            </div>
          </section>

          <section className={`${cardClass} md:col-span-2 lg:col-span-1`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={sectionTitleClass}>{t("aiDoctorReport")}</h2>
              {reports.length > 0 && (
                <button onClick={loadFullHistory} className="text-xs text-blue-400 hover:text-blue-300 transition underline">
                  View All Reports
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {isLoading && reports.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6 bg-white/5 rounded-xl border border-white/10 animate-pulse">Loading reports...</p>
              )}
              {!isLoading && reports.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6 bg-white/5 rounded-xl border border-white/10">No reports generated yet.</p>
              )}

              {/* Latest Report (Big Card) */}
              {reports.length > 0 && (() => {
                const latestReport = reports[0];
                const latestTheme = getRiskTheme(latestReport?.riskLevel);
                console.log(
                  "[LATEST REPORT RENDER]",
                  "rendering report:",
                  latestReport._id,
                  "riskScore:",
                  latestReport.riskScore,
                  "createdAt:",
                  latestReport.createdAt
                );

                return (
                  <div
                    className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-slate-950/90 p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 ${latestTheme.glow} ${latestTheme.hoverGlow}`}
                  >
                    <div
                      className={`pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b ${latestTheme.accent}`}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_55%)]" />
                    <div className="relative z-10">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                            <span className="text-lg">{getRiskIcon(latestReport.riskLevel)}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">Latest Assessment</h3>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                              Clinical AI report
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-slate-300">
                            {new Date(latestReport.createdAt).toLocaleDateString()}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-wider ${latestTheme.badge}`}
                          >
                            {latestReport.riskLevel}
                          </span>
                          {latestReport.riskScore > 0 && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
                              Score: <span className="font-semibold text-white">{latestReport.riskScore}/100</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <ReportSections report={latestReport} className="mt-4" />

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                        <MedicalReportDownload
                          report={latestReport}
                          patient={{
                            name: user?.name,
                            email: user?.email || user?.id || user?._id,
                            pregnancyStatus: latest?.pregnancyStatus,
                            dayOfIllness: latest?.dayOfIllness,
                            updatedAt: latest?.updatedAt,
                          }}
                          trackingRecords={trackingSource}
                          history={dashboard.records}
                          hospitals={hospitals}
                        />
                        <button
                          onClick={() => deleteReport(latestReport._id)}
                          className="text-xs text-red-300 transition hover:text-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Previous Reports (Smaller Cards) */}
              {reports.length > 1 && (
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Previous Reports</h4>
                  {reports.slice(1, 4).map((report) => {
                    logPreviousReportRender(report);
                    return (
                    <div key={report._id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 hover:bg-white/10 transition group">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span>{getRiskIcon(report.riskLevel)}</span>
                          <p className="text-sm text-gray-300">
                            <span className={`font-semibold ${getRiskColor(report.riskLevel)}`}>{report.riskLevel}</span> Risk
                            {Number.isFinite(report.riskScore) && (
                              <span className="ml-2 text-slate-400">({Math.round(report.riskScore)}/100)</span>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <ReportSections report={report} density="compact" className="mt-2" />
                      <div className="flex justify-between items-center pt-1">
                        <button onClick={() => alert("Sharing...")} className="text-xs text-blue-400 hover:text-blue-300 transition">Share</button>
                        <button onClick={() => deleteReport(report._id)} className="text-xs text-red-400 hover:text-red-300 transition opacity-0 group-hover:opacity-100">Delete</button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={sectionTitleClass}>{t("imageUpload")}</h2>
                <p className="text-sm text-gray-300">
                  {t("imageUploadHelp", { maxSize: rashMaxSizeMb })}
                </p>
              </div>
              {rashResult && (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    rashResult.prediction === "DENGUE"
                      ? "border-red-500/40 bg-red-500/10 text-red-200"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  {rashResult.prediction}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <div
                  className={`rounded-2xl border p-6 text-center transition ${
                    rashDragActive
                      ? "border-blue-400/70 bg-blue-500/10"
                      : "border-white/10 bg-black/20"
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setRashDragActive(true);
                  }}
                  onDragLeave={() => setRashDragActive(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setRashDragActive(false);
                    const droppedFile = event.dataTransfer.files?.[0];
                    if (droppedFile) {
                      handleRashSelection(droppedFile);
                    }
                  }}
                >
                  <input
                    ref={rashInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(event) => handleRashSelection(event.target.files?.[0])}
                  />
                  <p className="text-sm font-semibold text-white">{t("rashDropTitle")}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {t("rashDropHint", { maxSize: rashMaxSizeMb })}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={openCamera}
                      disabled={cameraLoading}
                      type="button"
                    >
                      {cameraLoading ? "Opening Camera..." : "Open Camera"}
                    </button>
                    <button
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                      onClick={() => rashInputRef.current?.click()}
                      type="button"
                    >
                      {t("rashBrowse")}
                    </button>
                    {rashFile && (
                      <button
                        className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
                        onClick={() => {
                          setRashFile(null);
                          resetRashOutput();
                        }}
                        type="button"
                      >
                        {t("rashClear")}
                      </button>
                    )}
                  </div>

                  {cameraMode && (
                    <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <video
                        ref={videoRef}
                        className="h-56 w-full rounded-lg object-cover bg-black"
                        playsInline
                        autoPlay
                      />

                      <div className="flex flex-wrap gap-2 justify-center">
                        <button
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                          onClick={captureFromCamera}
                          type="button"
                        >
                          Capture
                        </button>
                        <button
                          className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
                          onClick={retake}
                          type="button"
                        >
                          Retake
                        </button>
                        <button
                          className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
                          onClick={() => {
                            setCameraMode(false);
                            stopCamera();
                          }}
                          type="button"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  {!cameraMode && cameraError && (
                    <p className="mt-3 text-sm text-red-300">{cameraError}</p>
                  )}
                  {rashFile && (
                    <p className="mt-3 text-xs text-gray-400">
                      {t("rashSelectedFile")}: {rashFile.name}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    {t("rashPreviewTitle")}
                  </p>
                  {rashPreviewUrl ? (
                    <img
                      src={rashPreviewUrl}
                      alt={t("rashPreviewAlt")}
                      className="mt-3 h-48 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <p className="mt-3 text-sm text-gray-400">{t("rashPreviewEmpty")}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleRashSubmit}
                      disabled={!rashFile || rashLoading}
                      type="button"
                    >
                      {rashLoading ? t("rashAnalyzing") : t("rashAnalyze")}
                    </button>
                    {(rashResult || rashError) && !rashLoading && (
                      <button
                        className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
                        onClick={handleRashSubmit}
                        type="button"
                      >
                        {t("rashRetry")}
                      </button>
                    )}
                  </div>

                  {rashLoading && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-blue-200">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      {t("rashAnalyzing")}
                    </div>
                  )}
                  {rashError && <p className="mt-3 text-sm text-red-300">{rashError}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    {t("rashResultTitle")}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">{rashResultMessage}</p>

                  {rashResult && (
                    <div className="mt-4 grid gap-2 text-sm text-gray-300">
                      <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <span>{t("rashConfidence")}</span>
                        <span className="font-semibold text-white">{rashResult.confidence}%</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <span>{t("rashTimestamp")}</span>
                        <span className="text-white">{rashTimestamp}</span>
                      </div>
                    </div>
                  )}

                  {rashResult && (
                    <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
                      <p className="text-xs uppercase tracking-wider text-slate-400">
                        {t("rashInterpretationLabel")}
                      </p>
                      <p className="mt-1 text-sm text-gray-200">{rashInterpretation}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    {t("rashHeatmapTitle")}
                  </p>
                  {rashLoading && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                      Generating Grad-CAM explainability map...
                    </div>
                  )}
                  {!rashLoading && gradcamImageUrl && (
                    <div className="mt-3 space-y-4">
                      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-3 shadow-[0_0_25px_rgba(34,211,238,0.15)] transition-all duration-500 hover:shadow-[0_0_35px_rgba(34,211,238,0.25)] hover:border-cyan-400/50">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                          Grad-CAM Attention
                        </p>
                        <div className="overflow-hidden rounded-lg">
                          <img
                            src={gradcamImageUrl}
                            alt="Grad-CAM heatmap overlay"
                            className="max-h-64 w-full object-cover transition-transform duration-700 hover:scale-105"
                          />
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-300">
                        Highlighted regions show where the CNN focused most while classifying this rash.
                      </p>
                    </div>
                  )}
                  {!rashLoading && !gradcamImageUrl && (
                    <div className="mt-3 flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/30 px-4 py-10 text-center text-sm text-gray-400">
                      Run analysis to view Grad-CAM explainability overlay.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Full History Modal */}
      {isReportsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📋</span> All Assessment Reports
              </h2>
              <button 
                onClick={() => setIsReportsModalOpen(false)}
                className="text-gray-400 hover:text-white transition bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {fullHistory.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No history available.</p>
              ) : (
                fullHistory.map((report) => {
                  logPreviousReportRender(report);
                  return (
                  <div key={report._id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getRiskIcon(report.riskLevel)}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {new Date(report.createdAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Risk Level: <span className={getRiskColor(report.riskLevel)}>{report.riskLevel}</span> 
                            {report.riskScore > 0 && ` • Score: ${report.riskScore}/100`}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => deleteReport(report._id)} className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded">
                        Delete
                      </button>
                    </div>
                    <ReportSections report={report} className="mt-3" />
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
