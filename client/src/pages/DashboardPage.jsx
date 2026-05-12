import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import api from "../api";
import { predictRisk } from "../mlApi";
import { useAuth } from "../context/AuthContext";
import DashboardNavbar from "../components/DashboardNavbar";
import RiskSummary from "../components/RiskSummary";
import SymptomForm from "../components/SymptomForm";
import TrendChart from "../components/TrendChart";
import ChatBox from "../components/ChatBox";
import MedicalReportDownload from "../components/MedicalReportDownload";

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
    "Detected Warning Signs": (report?.symptoms || []).join(", ") || "None reported.",
    "AI Risk Score": Number.isFinite(report?.riskScore)
      ? `${report.riskScore}/100 (${report.riskLevel})`
      : "Not available",
    "Recommended Action": "Continue hydration, monitor temperature, and recheck symptoms every 12-24 hours.",
    "WHO Guidance": "Maintain hydration, monitor platelet count, and seek immediate clinical care if bleeding or abdominal pain develops.",
    "WHO Guidance (Bangla)": "WHO নির্দেশনা: পর্যাপ্ত পানি পান করুন এবং রক্তক্ষরণ বা পেটব্যথা দেখা দিলে দ্রুত হাসপাতালে যোগাযোগ করুন।",
    "Emergency Advice": "Seek urgent care for persistent vomiting, bleeding, severe abdominal pain, or drowsiness.",
    "Disclaimer": "This AI-generated report is informational and does not replace a licensed physician.",
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

  if (report?.riskScore > 85) {
    ordered.push({
      title: "Emergency Advice (Bangla)",
      content: "রোগীর অবস্থা বর্তমানে ঝুঁকিপূর্ণ। তাৎক্ষণিক হাসপাতালে যোগাযোগ করুন।",
    });
  }

  return ordered;
};

const ReportSections = ({ report, density = "full" }) => {
  const sections = extractReportSections(report);
  const displaySections = density === "compact" ? sections.slice(0, 3) : sections;

  return (
    <div className="space-y-3">
      {displaySections.map((section) => (
        <div key={section.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wider text-slate-400">{section.title}</p>
          <p className="mt-1 text-sm text-slate-200">{section.content}</p>
        </div>
      ))}
    </div>
  );
};

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const maxTrackingDays = 3;
  const demoTracking = [
    { date: new Date(Date.now() - 2 * 86400000).toISOString(), temperature: 103, risk_score: 35 },
    { date: new Date(Date.now() - 1 * 86400000).toISOString(), temperature: 101, risk_score: 68 },
    { date: new Date().toISOString(), temperature: 99, risk_score: 91 },
  ];
  const storageKey = `dengueTracking:${user?.id || user?._id || "anonymous"}`;
  const [dashboard, setDashboard] = useState({ profile: null, records: [], trend: [] });
  const [trackingRecords, setTrackingRecords] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.slice(-maxTrackingDays) : [];
    } catch {
      return [];
    }
  });
  const [reports, setReports] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [riskScore, setRiskScore] = useState(null);
  const [riskLevel, setRiskLevel] = useState("");
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [ragContext, setRagContext] = useState("");
  const [ragReport, setRagReport] = useState("");
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


  const normalizeRiskLevel = (level) => {
    const value = String(level || "").toUpperCase();
    if (value === "CRITICAL") return "Critical";
    if (value === "MODERATE" || value === "MEDIUM") return "Medium";
    if (value === "HIGH") return "High";
    return value ? "Low" : "";
  };

  const riskLevelLabel = normalizeRiskLevel(riskLevel);
  const fallbackRiskLevel = normalizeRiskLevel(dashboard.records[dashboard.records.length - 1]?.computed?.riskLevel);
  const displayRiskLevel = riskLevelLabel || fallbackRiskLevel;
  const translateRiskLevel = (level) => t(`riskLevel${level}`, { defaultValue: level });
  const translatedRiskLevel = displayRiskLevel ? translateRiskLevel(displayRiskLevel) : "";
  const displayRiskScore = riskScore ?? dashboard.records[dashboard.records.length - 1]?.computed?.riskScore ?? null;

  const rashMaxSizeMb = 5;
  const rashApiBase = import.meta.env.VITE_ML_API_URL || "http://127.0.0.1:5001";
  const rashApiUrl = `${rashApiBase}/api/rash/predict`;
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

  const load = async () => {
    try {
      setError("");
      setIsLoading(true);
      const [dashRes, reportRes] = await Promise.all([
        api.get("/health/dashboard"),
        api.get("/reports"),
      ]);
      setDashboard(dashRes.data);
      setReports(reportRes.data);
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
    try {
      localStorage.setItem(storageKey, JSON.stringify(trackingRecords));
    } catch {
      // Ignore storage errors.
    }
  }, [storageKey, trackingRecords]);

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
  const isEmergency = displayRiskScore != null && displayRiskScore > 85;

  const buildPredictionPayload = (form) => {
    const symptoms = form.symptoms || [];
    const temp = Number(form.temperature || 0);
    const day = Number(form.dayOfIllness || 0);
    const has = (name) => (symptoms.includes(name) ? 1 : 0);

    const warningSign = has("bleeding") || has("abdominal pain") || has("vomiting");
    const daysHighFever = temp >= 38.5 ? day : 0;

    const patientId = Number(user?.id || user?._id || 0) || 1;

    return {
      patient_id: patientId,
      day,
      temp,
      prev_temp: temp,
      fever_change: 0,
      headache: has("headache"),
      vomiting: has("vomiting"),
      abdominal_pain: has("abdominal pain"),
      bleeding: has("bleeding"),
      fatigue: has("fatigue"),
      rash: has("rash"),
      eye_pain: has("eye pain"),
      appetite_loss: has("appetite loss"),
      restlessness: has("restlessness"),
      fluid: Number(form.fluidIntakeLiters || 0),
      pregnant: form.pregnancyStatus ? 1 : 0,
      days_high_fever: Number(daysHighFever),
      warning_sign: warningSign ? 1 : 0,
    };
  };

  const handleSymptomSubmit = async (payload) => {
    setPredictionError("");
    setPredictionNotice("");
    setPredictionLoading(true);

    let mlResult = null;
    let mlErrorMessage = "";

    try {
      const predictionPayload = buildPredictionPayload(payload);
      console.log("[ML] Prepared payload:", predictionPayload);
      mlResult = await predictRisk(predictionPayload);
      console.log("[ML] Result:", mlResult);
    } catch (err) {
      mlErrorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Prediction failed.";
    }

    try {
      const { data: record } = await api.post("/health/records", payload);
      const computed = record?.computed;

      if (mlResult) {
        const scoreValue = Number(mlResult?.risk_score);
        if (!Number.isFinite(scoreValue)) {
          throw new Error("Invalid risk score from ML API");
        }
        const levelValue = String(mlResult?.risk_level || "").toUpperCase();
        if (!levelValue) {
          throw new Error("Invalid risk level from ML API");
        }
        setRiskScore(scoreValue);
        setRiskLevel(levelValue);
        setRiskAlerts(Array.isArray(mlResult?.alerts) ? mlResult.alerts : []);
        setRagContext(String(mlResult?.rag_context || ""));
        setRagReport(String(mlResult?.report || ""));

        const nextRecord = {
          date: new Date().toISOString(),
          temperature: Number(payload.temperature || 0),
          risk_score: scoreValue,
        };
        setTrackingRecords((prev) => [...prev, nextRecord].slice(-maxTrackingDays));
      } else if (computed) {
        setRiskScore(Number(computed.riskScore || 0));
        setRiskLevel(String(computed.riskLevel || ""));
        setRiskAlerts(Array.isArray(computed.explainability?.reasons) ? computed.explainability.reasons : []);
        setRagContext("");
        setRagReport("");

        const nextRecord = {
          date: new Date().toISOString(),
          temperature: Number(payload.temperature || 0),
          risk_score: Number(computed.riskScore || 0),
        };
        setTrackingRecords((prev) => [...prev, nextRecord].slice(-maxTrackingDays));
      }

      if (mlErrorMessage) {
        setPredictionNotice("ML service unavailable. Saved record with baseline risk.");
      }

      await load();

      try {
        await api.post("/reports", { nearestHospitals: hospitals });
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
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const { data } = await api.get(`/hospitals/nearby?lat=${latitude}&lng=${longitude}`);
      setHospitals(data.hospitals);
    });
  };

  const cardClass = "rounded-2xl border border-white/10 bg-[#1e293b] p-6 shadow-md";
  const sectionTitleClass = "mb-2 text-xl font-semibold text-white";
  const trackingTitle = `${trackingRecords.length}/${maxTrackingDays} Day Tracking`;
  const trackingSource = trackingRecords.length > 0 ? trackingRecords : demoTracking;

  const alertMessages = [
    ...riskAlerts,
    displayRiskLevel === "Critical" ? t("criticalAlert") : null,
    displayRiskLevel === "High" ? t("riskMessageHigh") : null,
    displayRiskLevel === "Medium" ? t("riskMessageMedium") : null,
    displayRiskLevel === "Low" ? t("riskMessageLow") : null,
    latest?.temperature >= 38.5 ? t("alertHighFever") : null,
    (latest?.symptoms || []).includes("bleeding") ? t("alertBleeding") : null,
    latest?.dayOfIllness >= 3 && latest?.dayOfIllness <= 7 ? t("alertPlateletRisk") : null,
    criticalPhaseDetected ? "⚠️ Possible Critical Phase Detected" : null,
  ].filter(Boolean);
  const uniqueAlerts = Array.from(new Set(alertMessages));

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
          <h1 className="text-3xl font-semibold text-white">{t("dashboardTitle")}</h1>
          <div className="flex gap-3">
            <button
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              onClick={async () => {
                try {
                  setError("");
                  await api.post("/reports", { nearestHospitals: hospitals });
                  await load();
                } catch (err) {
                  setError(err?.response?.data?.message || "Failed to generate report.");
                }
              }}
            >
              {t("generateReport")}
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {isEmergency && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.35)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-300">Emergency Mode</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">🚨 SEEK IMMEDIATE MEDICAL CARE</h2>
                  <p className="mt-2 text-sm text-red-200">
                    Risk score indicates a critical phase. Proceed to the nearest hospital now.
                  </p>
                  <p className="mt-2 text-xs text-red-200">
                    Emergency hydration: Oral rehydration solution, small sips every 5-10 minutes while awaiting care.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-2xl">
                  <span className="animate-pulse">🚨</span>
                  <span className="text-3xl font-semibold text-white">{Math.round(displayRiskScore)}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                  onClick={findHospitals}
                >
                  Find nearest hospital
                </button>
                {hospitals.length > 0 && (
                  <p className="text-sm text-red-100">
                    Nearest: {hospitals[0].name} ({hospitals[0].distanceKm} km)
                  </p>
                )}
              </div>
            </div>
          )}
          <RiskSummary
            riskScore={displayRiskScore}
            riskLevel={displayRiskLevel}
            translatedRiskLevel={translatedRiskLevel}
            alerts={uniqueAlerts}
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
              {trackingRecords.length > 0 && (
                <button
                  className="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold text-gray-200 transition hover:bg-white/5"
                  onClick={() => setTrackingRecords([])}
                >
                  Clear history
                </button>
              )}
            </div>
            {trackingRecords.length === 0 && (
              <p className="text-sm text-gray-400">
                Showing a 3-day dengue progression sample (fever drops as risk increases).
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
              {riskScore != null && !predictionLoading && !predictionError && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
                  <p>
                    Risk score: <span className="font-semibold text-white">{riskScore.toFixed(2)}</span>
                  </p>
                  <p>
                    Risk level: <span className="font-semibold text-white">{translatedRiskLevel}</span>
                  </p>
                </div>
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
              {reports.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3 shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getRiskIcon(reports[0].riskLevel)}</span>
                      <h3 className="font-bold text-white">Latest Assessment</h3>
                    </div>
                    <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded border border-white/5">
                      {new Date(reports[0].createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm bg-black/20 w-fit px-3 py-1.5 rounded-lg border border-white/5">
                    <p className="text-gray-300">
                      Risk: <span className={`font-bold ${getRiskColor(reports[0].riskLevel)}`}>{reports[0].riskLevel}</span>
                    </p>
                    {reports[0].riskScore > 0 && (
                      <p className="text-gray-300 border-l border-white/10 pl-4">Score: <span className="font-bold text-white">{reports[0].riskScore}/100</span></p>
                    )}
                  </div>

                  <ReportSections report={reports[0]} />
                  
                  <div className="flex gap-2 pt-2">
                    <MedicalReportDownload
                      report={reports[0]}
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
                    <button onClick={() => deleteReport(reports[0]._id)} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded transition">
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Previous Reports (Smaller Cards) */}
              {reports.length > 1 && (
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Previous Reports</h4>
                  {reports.slice(1, 4).map((report) => (
                    <div key={report._id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 hover:bg-white/10 transition group">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span>{getRiskIcon(report.riskLevel)}</span>
                          <p className="text-sm text-gray-300">
                            <span className={`font-semibold ${getRiskColor(report.riskLevel)}`}>{report.riskLevel}</span> Risk
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <ReportSections report={report} density="compact" />
                      <div className="flex justify-between items-center pt-1">
                        <button onClick={() => alert("Sharing...")} className="text-xs text-blue-400 hover:text-blue-300 transition">Share</button>
                        <button onClick={() => deleteReport(report._id)} className="text-xs text-red-400 hover:text-red-300 transition opacity-0 group-hover:opacity-100">Delete</button>
                      </div>
                    </div>
                  ))}
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

          <section className={cardClass}>
            <h2 className={sectionTitleClass}>{t("nearbyHospitals")}</h2>
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              onClick={findHospitals}
            >
              {t("findNearby")}
            </button>
            <ul className="mt-2 space-y-1 text-sm text-gray-300">
              {hospitals.map((h) => (
                <li key={h.name}>
                  {h.name} ({h.distanceKm} km) - <a className="text-blue-300 hover:text-blue-200" href={h.mapsUrl} target="_blank" rel="noreferrer">{t("googleMaps")}</a>
                </li>
              ))}
            </ul>
          </section>

          {displayRiskScore != null && (
            <section className={`${cardClass} md:col-span-2`}>
              <h2 className="text-xl font-semibold text-white">{t("aiRiskExplainability")}</h2>
              <p className="text-sm text-gray-300">{t("riskScore")}: <strong className="text-white">{Math.round(displayRiskScore)}</strong> / 100</p>
              <p className="text-sm text-gray-300">{t("riskLevel")}: <strong className="text-white">{translatedRiskLevel}</strong></p>
              {(latestComputed?.explainability?.reasons || []).length > 0 && (
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-gray-300">
                  {latestComputed.explainability.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              )}
            </section>
          )}
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
                fullHistory.map((report) => (
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
                    <ReportSections report={report} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
