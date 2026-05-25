import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../api";
import { useMessaging } from "../context/MessagingContext";
import NotificationBell from "../components/messaging/NotificationBell";

const STATUS_COLORS = {
  CRITICAL: "bg-red-500/20 text-red-300 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  MODERATE: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  LOW: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  RECOVERED: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  FLAGGED: "bg-rose-500/20 text-rose-200 border-rose-500/30",
};

const STAT_CARD_STYLES = {
  users: "from-slate-900/60 via-blue-900/30 to-slate-900/60",
  records: "from-slate-900/60 via-cyan-900/30 to-slate-900/60",
  critical: "from-slate-900/60 via-rose-900/30 to-slate-900/60",
  high: "from-slate-900/60 via-orange-900/30 to-slate-900/60",
  pregnant: "from-slate-900/60 via-pink-900/30 to-slate-900/60",
};

const ADMIN_CARD_BASE =
  "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";

const hasSevereSymptoms = (symptoms = []) => {
  const values = symptoms.map((symptom) => String(symptom).toLowerCase());
  return ["bleeding", "abdominal pain", "vomiting", "restlessness", "fatigue", "eye pain"].some(
    (symptom) => values.includes(symptom)
  );
};

const resolveStatus = (record) => {
  if (record?.adminStatus) return record.adminStatus;
  const score = Number(record?.computed?.riskScore || 0);
  const day = Number(record?.dayOfIllness || 0);
  const severe = hasSevereSymptoms(record?.symptoms || []);

  if (score >= 85 && day >= 3 && severe) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
};

const truncateSymptoms = (symptoms = []) => {
  if (!symptoms.length) return "No warning signs";
  const displayed = symptoms.slice(0, 3);
  const remaining = symptoms.length - displayed.length;
  return remaining > 0
    ? `${displayed.join(", ")} +${remaining} more`
    : displayed.join(", ");
};

const formatTemperature = (temp) => {
  const value = Number(temp);
  if (!Number.isFinite(value)) return "N/A";
  const fahrenheit = value <= 45 ? (value * 9) / 5 + 32 : value;
  const clamped = Math.min(104, Math.max(98, fahrenheit));
  return `${Math.round(clamped)}°F`;
};

const formatDateLabel = (value) => new Date(value).toLocaleDateString();
const formatDateTime = (value) => new Date(value).toLocaleString();
const toFahrenheitValue = (temp) => {
  const value = Number(temp);
  if (!Number.isFinite(value)) return 0;
  const fahrenheit = value <= 45 ? (value * 9) / 5 + 32 : value;
  return Math.min(104, Math.max(98, fahrenheit));
};

const demoOverview = {
  totalUsers: 128,
  totalRecords: 135,
  criticalCases: 12,
  highRiskCases: 31,
  pregnantHighRisk: 5,
};

const demoRecords = [
  {
    _id: "demo-1",
    user: { name: "Salma Rahman", email: "salma.rahman@dengue.org" },
    temperature: 39.8,
    dayOfIllness: 5,
    symptoms: ["bleeding", "abdominal pain", "vomiting", "restlessness"],
    pregnancyStatus: false,
    computed: { riskScore: 92 },
    date: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "demo-2",
    user: { name: "Imran Hossain", email: "imran.h@dengue.org" },
    temperature: 38.6,
    dayOfIllness: 4,
    symptoms: ["vomiting", "fatigue", "eye pain"],
    pregnancyStatus: false,
    computed: { riskScore: 84 },
    date: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: "demo-3",
    user: { name: "Raihana Begum", email: "raihana.b@dengue.org" },
    temperature: 38.2,
    dayOfIllness: 3,
    symptoms: ["abdominal pain", "fatigue"],
    pregnancyStatus: true,
    computed: { riskScore: 76 },
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    _id: "demo-4",
    user: { name: "Anik Das", email: "anik.d@dengue.org" },
    temperature: 38.9,
    dayOfIllness: 2,
    symptoms: ["headache", "rash", "fatigue"],
    pregnancyStatus: false,
    computed: { riskScore: 61 },
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    _id: "demo-5",
    user: { name: "Sadia Karim", email: "sadia.k@dengue.org" },
    temperature: 37.9,
    dayOfIllness: 6,
    symptoms: ["fatigue", "headache"],
    pregnancyStatus: true,
    computed: { riskScore: 45 },
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    _id: "demo-6",
    user: { name: "Mehedi Hasan", email: "mehedi.h@dengue.org" },
    temperature: 37.2,
    dayOfIllness: 7,
    symptoms: ["rash"],
    pregnancyStatus: false,
    computed: { riskScore: 23 },
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

const demoAlerts = demoRecords
  .filter((record) => record.computed.riskScore >= 70)
  .map((record) => ({
    id: record._id,
    patientName: record.user?.name || "Unknown",
    riskScore: record.computed.riskScore,
    symptoms: record.symptoms || [],
    timestamp: record.date,
    status: resolveStatus(record),
  }));

const regionalSurveillance = [
  { region: "Chattogram", status: "HIGH" },
  { region: "Dhaka", status: "MODERATE" },
  { region: "Sylhet", status: "LOW" },
  { region: "Khulna", status: "MODERATE" },
];

const progressionTrend = [
  { day: "Day 1", fever: 102, risk: 20 },
  { day: "Day 3", fever: 101, risk: 52 },
  { day: "Day 5", fever: 99, risk: 90 },
  { day: "Day 7", fever: 98, risk: 35 },
];

const groupRecordsByPatient = (records = []) => {
  const grouped = new Map();

  records.forEach((record) => {
    const email = record?.user?.email ? String(record.user.email).toLowerCase() : "";
    const userId = record?.user?._id || record?.user || record?.userId || record?.user_id;
    const key = email || String(userId || record._id);

    if (!grouped.has(key)) {
      grouped.set(key, { key, history: [] });
    }
    grouped.get(key).history.push(record);
  });

  return Array.from(grouped.values()).map((entry) => {
    const history = entry.history.sort(
      (a, b) => new Date(b.date || b.updatedAt) - new Date(a.date || a.updatedAt)
    );
    const latest = history[0];
    return {
      key: entry.key,
      latest,
      history,
      patient: latest?.user || {},
    };
  });
};

const buildSymptomTimeline = (history = []) => {
  const timelineMap = new Map();
  history.forEach((record) => {
    const day = Number(record.dayOfIllness || 0);
    const symptoms = record.symptoms || [];
    if (!timelineMap.has(day)) {
      timelineMap.set(day, new Set());
    }
    symptoms.forEach((symptom) => timelineMap.get(day).add(symptom));
  });

  return Array.from(timelineMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, symptomSet]) => ({
      day,
      symptoms: Array.from(symptomSet),
    }));
};

const buildProgressionData = (history = []) =>
  history
    .slice()
    .reverse()
    .map((record) => ({
      label: `Day ${record.dayOfIllness || "?"}`,
      fever: toFahrenheitValue(record.temperature),
      risk: Number(record?.computed?.riskScore || 0),
    }));

const detectCriticalPhase = (record, previousRecord) => {
  if (!record) return false;
  const day = Number(record.dayOfIllness || 0);
  if (day < 3) return false;

  const symptoms = (record.symptoms || []).map((symptom) => String(symptom).toLowerCase());
  const hasPrimarySigns = ["bleeding", "abdominal pain", "restlessness"].some((symptom) =>
    symptoms.includes(symptom)
  );
  const highRiskSymptoms = hasSevereSymptoms(symptoms);
  const feverDrop =
    previousRecord && Number(record.temperature) < Number(previousRecord.temperature);

  return hasPrimarySigns && (feverDrop || highRiskSymptoms);
};

const StatCard = ({ icon, label, value, trend, styleKey }) => (
  <div
    className={`${ADMIN_CARD_BASE} bg-gradient-to-br ${STAT_CARD_STYLES[styleKey]} hover:border-white/20 transition`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        <p className="mt-2 text-xs text-slate-300/80">{trend}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
        {icon}
      </div>
    </div>
  </div>
);

const AlertCard = ({ alert }) => {
  const fallbackStatus =
    alert.riskScore >= 85 ? "CRITICAL" : alert.riskScore >= 70 ? "HIGH" : "MODERATE";
  const status = alert.status || fallbackStatus;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{alert.patientName}</p>
          <p className="text-xs text-slate-300">{formatDateTime(alert.timestamp)}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            STATUS_COLORS[status]
          }`}
        >
          {status}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-200">
        <span>Risk Score</span>
        <span className="font-semibold text-white">{alert.riskScore}</span>
      </div>
      <p className="mt-2 text-xs text-slate-300">{truncateSymptoms(alert.symptoms)}</p>
    </div>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="text-slate-300">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-white">
          {entry.name || entry.dataKey}: {entry.value}
        </p>
      ))}
    </div>
  );
};

const ConfirmModal = ({ open, title, message, confirmText, onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
            onClick={onConfirm}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { openChat } = useMessaging();
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalRecords: 0,
    criticalCases: 0,
    highRiskCases: 0,
    pregnantHighRisk: 0,
  });
  const [alerts, setAlerts] = useState([]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [userForm, setUserForm] = useState({ name: "", role: "user", isActive: true });
  const [actionLog, setActionLog] = useState([
    "Patient flagged critical",
    "Emergency alert triggered",
    "Record updated",
  ]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const pageSize = 6;

  useEffect(() => {
    let isMounted = true;
    const loadAdminData = async () => {
      try {
        setIsLoading(true);
        const [overviewRes, alertsRes, recordsRes] = await Promise.all([
          api.get("/admin/overview"),
          api.get("/admin/alerts"),
          api.get("/admin/records"),
        ]);
        if (!isMounted) return;
        setOverview(overviewRes.data);
        setAlerts(alertsRes.data || []);
        setRecords(recordsRes.data || []);
      } catch (error) {
        console.error("Failed to load admin dashboard", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAdminData();
    return () => {
      isMounted = false;
    };
  }, []);

  const appendAction = (message) => {
    setActionLog((prev) => [message, ...prev].slice(0, 6));
  };

  const openPatientDetails = (patientGroup) => {
    setSelectedPatient(patientGroup);
    setAdminNotes(patientGroup?.latest?.adminNotes || "");
    setAdminStatus(patientGroup?.latest?.adminStatus || resolveStatus(patientGroup?.latest));
    setUserForm({
      name: patientGroup?.patient?.name || "",
      role: patientGroup?.patient?.role || "user",
      isActive: patientGroup?.patient?.isActive !== false,
    });
  };

  const closePatientDetails = () => setSelectedPatient(null);

  const handleUpdateUser = async () => {
    if (!selectedPatient?.patient?._id) return;
    setIsWorking(true);
    try {
      await api.patch(`/admin/users/${selectedPatient.patient._id}`, userForm);
      appendAction(`User profile updated for ${selectedPatient.patient.email}`);
      setSelectedPatient((prev) =>
        prev ? { ...prev, patient: { ...prev.patient, ...userForm } } : prev
      );
    } catch (error) {
      console.error("Failed to update user", error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleUpdateRecord = async () => {
    if (!selectedPatient?.latest?._id) return;
    setIsWorking(true);
    try {
      await api.patch(`/admin/records/${selectedPatient.latest._id}`, {
        adminNotes,
        adminStatus,
      });
      appendAction(`Record updated for ${selectedPatient.patient.email}`);
      setSelectedPatient((prev) =>
        prev
          ? {
              ...prev,
              latest: { ...prev.latest, adminNotes, adminStatus },
            }
          : prev
      );
    } catch (error) {
      console.error("Failed to update record", error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleResetMonitoring = async () => {
    if (!selectedPatient?.patient?._id) return;
    setIsWorking(true);
    try {
      await api.post(`/admin/users/${selectedPatient.patient._id}/reset-monitoring`);
      appendAction(`Monitoring reset for ${selectedPatient.patient.email}`);
    } catch (error) {
      console.error("Failed to reset monitoring", error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSuspendMonitoring = async () => {
    if (!selectedPatient?.patient?._id) return;
    setIsWorking(true);
    try {
      await api.patch(`/admin/users/${selectedPatient.patient._id}`, { isActive: false });
      setUserForm((prev) => ({ ...prev, isActive: false }));
      appendAction(`Monitoring suspended for ${selectedPatient.patient.email}`);
    } catch (error) {
      console.error("Failed to suspend monitoring", error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleFlagCritical = async () => {
    if (!selectedPatient?.latest?._id) return;
    setIsWorking(true);
    try {
      await api.post(`/admin/records/${selectedPatient.latest._id}/flag-critical`);
      setAdminStatus("CRITICAL");
      appendAction(`Patient flagged critical: ${selectedPatient.patient.email}`);
      setSelectedPatient((prev) =>
        prev ? { ...prev, latest: { ...prev.latest, adminStatus: "CRITICAL" } } : prev
      );
    } catch (error) {
      console.error("Failed to flag critical", error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleMarkRecovered = async () => {
    if (!selectedPatient?.latest?._id) return;
    setIsWorking(true);
    try {
      await api.post(`/admin/records/${selectedPatient.latest._id}/mark-recovered`);
      setAdminStatus("RECOVERED");
      appendAction(`Patient marked recovered: ${selectedPatient.patient.email}`);
      setSelectedPatient((prev) =>
        prev ? { ...prev, latest: { ...prev.latest, adminStatus: "RECOVERED" } } : prev
      );
    } catch (error) {
      console.error("Failed to mark recovered", error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleFlagSevere = async () => {
    if (!selectedPatient?.latest?._id) return;
    setIsWorking(true);
    try {
      await api.patch(`/admin/records/${selectedPatient.latest._id}`, {
        adminStatus: "FLAGGED",
      });
      setAdminStatus("FLAGGED");
      appendAction(`Severe dengue flagged for ${selectedPatient.patient.email}`);
    } catch (error) {
      console.error("Failed to flag severe dengue", error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSendReminder = () => {
    if (!selectedPatient?.patient?.email) return;
    appendAction(`Monitoring reminder sent to ${selectedPatient.patient.email}`);
  };

  const handleExportReport = (patientGroup) => {
    const target = patientGroup || selectedPatient;
    if (!target) return;
    const payload = {
      patient: target.patient,
      latest: target.latest,
      history: target.history,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dengue-report-${target.patient.email || "patient"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    appendAction(`Report exported for ${target.patient.email}`);
  };

  const requestDeleteUser = () => {
    if (!selectedPatient?.patient?._id) return;
    setConfirmDialog({
      type: "user",
      title: "Delete patient account?",
      message: "This will remove the user and all monitoring data.",
    });
  };

  const requestDeleteRecord = () => {
    if (!selectedPatient?.latest?._id) return;
    setConfirmDialog({
      type: "record",
      title: "Delete latest record?",
      message: "This will remove the latest health record from monitoring.",
    });
  };

  const confirmDelete = async () => {
    if (!confirmDialog || !selectedPatient) return;
    setIsWorking(true);
    try {
      if (confirmDialog.type === "user") {
        await api.delete(`/admin/users/${selectedPatient.patient._id}`);
        appendAction(`Patient deleted: ${selectedPatient.patient.email}`);
      }
      if (confirmDialog.type === "record") {
        await api.delete(`/admin/records/${selectedPatient.latest._id}`);
        appendAction(`Record deleted for ${selectedPatient.patient.email}`);
      }
      setConfirmDialog(null);
      setSelectedPatient(null);
    } catch (error) {
      console.error("Failed to delete", error);
    } finally {
      setIsWorking(false);
    }
  };

  const hasOverview = Object.values(overview).some((value) => Number(value) > 0);
  const displayOverview = hasOverview ? overview : demoOverview;
  const sourceRecords = records.length > 0 ? records : demoRecords;
  const displayAlerts = alerts.length > 0 ? alerts : demoAlerts;

  const patientGroups = useMemo(() => groupRecordsByPatient(sourceRecords), [sourceRecords]);

  const patientRows = useMemo(
    () =>
      patientGroups.map((group) => {
        const latest = group.latest;
        const score = Number(latest?.computed?.riskScore || 0);
        const status = resolveStatus(latest);
        return {
          key: group.key,
          patient: group.patient,
          latest,
          history: group.history,
          riskScore: score,
          status,
        };
      }),
    [patientGroups]
  );

  const filteredPatients = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return patientRows.filter((record) => {
      const matchesSearch =
        !needle ||
        record?.patient?.name?.toLowerCase().includes(needle) ||
        record?.patient?.email?.toLowerCase().includes(needle) ||
        record?.status?.toLowerCase().includes(needle);
      const matchesRisk = riskFilter === "ALL" || record.status === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [patientRows, riskFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const pagedPatients = filteredPatients.slice((page - 1) * pageSize, page * pageSize);
  const criticalPhaseDetected = selectedPatient
    ? detectCriticalPhase(selectedPatient.latest, selectedPatient.history[1])
    : false;

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const casesPerDay = useMemo(() => {
    const bucket = sourceRecords.reduce((acc, record) => {
      const key = formatDateLabel(record.date);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(bucket).map(([date, count]) => ({ date, count }));
  }, [sourceRecords]);

  const criticalTrend = useMemo(() => {
    const bucket = sourceRecords.reduce((acc, record) => {
      const key = formatDateLabel(record.date);
      const score = Number(record?.computed?.riskScore || 0);
      if (score >= 85) acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(bucket).map(([date, critical]) => ({ date, critical }));
  }, [sourceRecords]);

  const pregnancyDistribution = useMemo(() => {
    let pregnantHigh = 0;
    let pregnantOther = 0;
    let nonPregnant = 0;
    sourceRecords.forEach((record) => {
      const score = Number(record?.computed?.riskScore || 0);
      if (record.pregnancyStatus) {
        if (score >= 50) pregnantHigh += 1;
        else pregnantOther += 1;
      } else {
        nonPregnant += 1;
      }
    });
    return [
      { name: "Pregnant High Risk", value: pregnantHigh },
      { name: "Pregnant Moderate/Low", value: pregnantOther },
      { name: "Non-Pregnant", value: nonPregnant },
    ];
  }, [sourceRecords]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Admin Command Center</p>
          <h1 className="text-3xl font-semibold text-white">Hospital Monitoring Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            AI-assisted dengue surveillance across hospitals, wards, and community clinics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            Live status: {isLoading ? "Syncing" : "Operational"}
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon="👥"
          label="Total Users"
          value={displayOverview.totalUsers}
          trend="+4.2% weekly adoption"
          styleKey="users"
        />
        <StatCard
          icon="🧪"
          label="Health Records"
          value={displayOverview.totalRecords}
          trend="Realtime symptom intake"
          styleKey="records"
        />
        <StatCard
          icon="🚨"
          label="Critical Cases"
          value={displayOverview.criticalCases}
          trend="Immediate hospital escalation"
          styleKey="critical"
        />
        <StatCard
          icon="⚠️"
          label="High Risk Cases"
          value={displayOverview.highRiskCases}
          trend="Needs daily clinical monitoring"
          styleKey="high"
        />
        <StatCard
          icon="🤰"
          label="Pregnant High-Risk"
          value={displayOverview.pregnantHighRisk}
          trend="Maternal dengue watchlist"
          styleKey="pregnant"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className={ADMIN_CARD_BASE}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">🚨 Live Critical Alerts</h2>
            <span className="text-xs text-slate-400">Auto-sorted by risk score</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {displayAlerts.length === 0 && (
              <p className="text-sm text-slate-400">No active high-risk alerts.</p>
            )}
            {displayAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>

        <div className={`${ADMIN_CARD_BASE} space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Healthcare Analytics</h2>
            <span className="text-xs text-slate-400">Dark-mode clinical metrics</span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={casesPerDay}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-slate-400">Cases per day</p>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={criticalTrend}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="critical" fill="#fb7185" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-slate-400">Critical cases trend</p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pregnancyDistribution}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {pregnancyDistribution.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "Pregnant High Risk"
                          ? "#f43f5e"
                          : entry.name === "Pregnant Moderate/Low"
                            ? "#fb923c"
                            : "#38bdf8"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-slate-400">Pregnancy risk distribution</p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressionTrend}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="fever" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="risk" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-slate-400">Clinical progression (fever drop before risk peak)</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Regional Dengue Surveillance</h3>
              <span className="text-xs text-slate-400">Public health intel</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {regionalSurveillance.map((region) => (
                <div
                  key={region.region}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <p className="text-xs text-slate-300">{region.region}</p>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      STATUS_COLORS[region.status]
                    }`}
                  >
                    {region.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`${ADMIN_CARD_BASE} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Patient Monitoring Table</h2>
            <p className="text-xs text-slate-400">Clinical triage view with filters and search</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              className="w-56 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              placeholder="Search patient or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="rounded-xl border border-white/15 bg-[#111827] px-3 py-2 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-cyan-500/40 hover:bg-[#1f2937] transition"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
            >
              <option className="bg-[#111827] text-[#f9fafb]" value="ALL">All risks</option>
              <option className="bg-[#111827] text-[#f9fafb]" value="CRITICAL">Critical</option>
              <option className="bg-[#111827] text-[#f9fafb]" value="HIGH">High</option>
              <option className="bg-[#111827] text-[#f9fafb]" value="MODERATE">Moderate</option>
              <option className="bg-[#111827] text-[#f9fafb]" value="LOW">Low</option>
              <option className="bg-[#111827] text-[#f9fafb]" value="RECOVERED">Recovered</option>
              <option className="bg-[#111827] text-[#f9fafb]" value="FLAGGED">Flagged</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#0f172a] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-3">Patient</th>
                <th className="px-3 py-3">Latest Temp</th>
                <th className="px-3 py-3">Latest Risk</th>
                <th className="px-3 py-3">Current Status</th>
                <th className="px-3 py-3">Day of Illness</th>
                <th className="px-3 py-3">Last Updated</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-200">
              {pagedPatients.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-400" colSpan={7}>
                    No patient records match this filter.
                  </td>
                </tr>
              )}
              {pagedPatients.map((record) => (
                <tr
                  key={record.key}
                  className="cursor-pointer hover:bg-white/5 transition"
                  onClick={() => openPatientDetails(record)}
                >
                  <td className="px-3 py-4">
                    <div className="font-semibold text-white">{record.patient?.name || "Unknown"}</div>
                    <div className="text-xs text-slate-400">{record.patient?.email || "No email"}</div>
                  </td>
                  <td className="px-3 py-4">{formatTemperature(record.latest?.temperature)}</td>
                  <td className="px-3 py-4">{record.riskScore}</td>
                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        STATUS_COLORS[record.status]
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-3 py-4">Day {record.latest?.dayOfIllness || "-"}</td>
                  <td className="px-3 py-4 text-xs text-slate-400">
                    {formatDateTime(record.latest?.updatedAt || record.latest?.date)}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openPatientDetails(record);
                        }}
                      >
                        View
                      </button>
                      <button
                        className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleExportReport(record);
                        }}
                      >
                        Export
                      </button>
                      {(record.status === "CRITICAL" ||
                        record.status === "HIGH" ||
                        record.status === "FLAGGED") && (
                        <button
                          className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const patientId = record.patient?._id || record.patient?.id;
                            if (patientId) openChat({ patientId });
                          }}
                        >
                          Message
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {pagedPatients.length} of {filteredPatients.length} patients
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-white/10 px-3 py-1 text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span>
              Page {page} / {pageCount}
            </span>
            <button
              className="rounded-lg border border-white/10 px-3 py-1 text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
              onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
              disabled={page === pageCount}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className={`${ADMIN_CARD_BASE} space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Admin Actions</h2>
          <span className="text-xs text-slate-400">Operational log</span>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          {actionLog.map((entry, index) => (
            <li key={`${entry}-${index}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {entry}
            </li>
          ))}
        </ul>
      </section>

      {selectedPatient && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0f172a] p-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Patient Profile</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {selectedPatient.patient?.name || "Unknown patient"}
                </h2>
                <p className="text-sm text-slate-300">{selectedPatient.patient?.email || "No email"}</p>
              </div>
              <button
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                onClick={closePatientDetails}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white">Profile Snapshot</h3>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 text-sm text-slate-300">
                    <div>
                      <p className="text-xs text-slate-400">Emergency Contact</p>
                      {selectedPatient.patient?.emergencyContact ? (
                        <div className="flex items-center gap-2">
                          <p className="text-white">{selectedPatient.patient.emergencyContact}</p>
                          <a
                            href={`tel:${selectedPatient.patient.emergencyContact}`}
                            className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-400 hover:bg-rose-500/30"
                          >
                            Call
                          </a>
                        </div>
                      ) : (
                        <p className="text-white">Not provided</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Pregnancy Status</p>
                      <p className="text-white">
                        {selectedPatient.latest?.pregnancyStatus ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Current Risk</p>
                      <p className="text-white">{selectedPatient.latest?.computed?.riskScore || 0}/100</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Clinical Status</p>
                      <p className="text-white">{resolveStatus(selectedPatient.latest)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Day of Illness</p>
                      <p className="text-white">Day {selectedPatient.latest?.dayOfIllness || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white">Symptom History Timeline</h3>
                  <div className="mt-2 space-y-2 text-sm text-slate-300">
                    {buildSymptomTimeline(selectedPatient.history).map((entry) => (
                      <div key={`day-${entry.day}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <p className="text-xs text-slate-400">Day {entry.day}</p>
                        <p className="text-white">{entry.symptoms.join(", ") || "No symptoms"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white">AI Clinical Summary</h3>
                  <div className="mt-2 space-y-2 text-sm text-slate-300">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-xs text-slate-400">Detected warning signs</p>
                      <p className="text-white">
                        {truncateSymptoms(selectedPatient.latest?.symptoms || [])}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-xs text-slate-400">WHO Guidance</p>
                      <p className="text-white">
                        Maintain hydration, monitor platelet count, and seek immediate clinical care if bleeding or abdominal pain develops.
                      </p>
                      <p className="mt-2 text-white">
                        WHO নির্দেশনা: পর্যাপ্ত পানি পান করুন এবং রক্তক্ষরণ বা পেটব্যথা দেখা দিলে দ্রুত হাসপাতালে যোগাযোগ করুন।
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-xs text-slate-400">Emergency advice</p>
                      <p className="text-white">
                        Seek immediate care for persistent vomiting, bleeding, severe abdominal pain, or drowsiness.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-xs text-slate-400">Critical phase status</p>
                      <p className="text-white">
                        {criticalPhaseDetected ? "⚠️ Possible Critical Phase Detected" : "Stable monitoring"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white">Risk Progression</h3>
                  <div className="mt-2 h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={buildProgressionData(selectedPatient.history)}>

                        <CartesianGrid stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="label" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="fever" stroke="#60a5fa" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="risk" stroke="#f97316" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Fever drop preceding critical risk peak</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white">Admin Actions</h3>
                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                        placeholder="Update name"
                        value={userForm.name}
                        onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
                      />
                      <select
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                        value={userForm.role}
                        onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={userForm.isActive}
                        onChange={(event) => setUserForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                      />
                      Active account
                    </div>
                    <button
                      className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                      onClick={handleUpdateUser}
                      disabled={isWorking}
                      type="button"
                    >
                      Save user changes
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <select
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                      value={adminStatus || resolveStatus(selectedPatient.latest)}
                      onChange={(event) => setAdminStatus(event.target.value)}
                    >
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="LOW">Low</option>
                      <option value="RECOVERED">Recovered</option>
                      <option value="FLAGGED">Flagged</option>
                    </select>
                    <textarea
                      className="min-h-[90px] w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                      placeholder="Add clinical notes"
                      value={adminNotes}
                      onChange={(event) => setAdminNotes(event.target.value)}
                    />
                    <button
                      className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                      onClick={handleUpdateRecord}
                      disabled={isWorking}
                      type="button"
                    >
                      Save record changes
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      onClick={handleFlagCritical}
                      disabled={isWorking}
                      type="button"
                    >
                      Trigger emergency alert
                    </button>
                    <button
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      onClick={handleFlagSevere}
                      disabled={isWorking}
                      type="button"
                    >
                      Flag severe dengue
                    </button>
                    <button
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      onClick={handleMarkRecovered}
                      disabled={isWorking}
                      type="button"
                    >
                      Mark recovered
                    </button>
                    <button
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      onClick={handleSendReminder}
                      type="button"
                    >
                      Send reminder
                    </button>
                    <button
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      onClick={handleResetMonitoring}
                      disabled={isWorking}
                      type="button"
                    >
                      Reset monitoring
                    </button>
                    <button
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      onClick={handleSuspendMonitoring}
                      disabled={isWorking}
                      type="button"
                    >
                      Suspend monitoring
                    </button>
                    <button
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      onClick={() => handleExportReport(selectedPatient)}
                      type="button"
                    >
                      Export report
                    </button>
                    <button
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      onClick={requestDeleteRecord}
                      disabled={isWorking}
                      type="button"
                    >
                      Delete latest record
                    </button>
                    <button
                      className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
                      onClick={requestDeleteUser}
                      disabled={isWorking}
                      type="button"
                    >
                      Delete patient
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmText="Delete"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminDashboard;
