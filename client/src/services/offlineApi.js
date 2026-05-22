import api from "../api";
import { buildOfflineHealthRecord } from "../rules-engine/offlineRiskEngine";
import {
  saveSymptomRecord,
  getSymptomRecords,
  cacheReport,
  cacheDashboardSnapshot,
  getDashboardSnapshot,
  getCachedReports,
  sanitizeSymptomPayload,
  generateLocalId,
} from "../storage/indexedDb";
import { queueHealthRecord, queueReportGeneration } from "../sync/syncQueue";
import { getNearestHospitals } from "../offline/hospitalsData";

export const isNetworkOnline = () =>
  typeof navigator !== "undefined" && navigator.onLine;

export const hasAuthToken = () => !!localStorage.getItem("token");

import { API_BASE_URL } from "../config/apiBase";

export const canReachServer = async () => {
  if (!isNetworkOnline() || !hasAuthToken()) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE_URL}/healthz`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch (error) {
    console.warn("[Offline API] healthz check failed", {
      error: error?.message,
      url: `${API_BASE_URL}/healthz`,
    });
    return false;
  }
};

export const submitSymptomRecord = async (payload, { userId, previousRecord } = {}) => {
  const safe = sanitizeSymptomPayload(payload);
  const online = await canReachServer();

  if (online) {
    const { data: record } = await api.post("/health/records", safe);
    const localId = generateLocalId();
    await saveSymptomRecord({
      localId,
      userId,
      payload: safe,
      synced: true,
      serverId: record._id,
      serverRecord: record,
      computed: record.computed,
    });
    return { record, offline: false };
  }

  const localRecord = buildOfflineHealthRecord(
    { ...safe, localId: generateLocalId() },
    userId,
    previousRecord
  );

  await saveSymptomRecord({
    ...localRecord,
    userId,
    payload: safe,
    synced: false,
    computed: localRecord.computed,
  });

  await queueHealthRecord(safe, { localId: localRecord.localId });

  return { record: localRecord, offline: true };
};

export const generateReport = async (nearestHospitals = [], { recordLocalId } = {}) => {
  const online = await canReachServer();

  if (online) {
    const { data: report } = await api.post("/reports", { nearestHospitals });
    await cacheReport({ ...report, offlineAvailable: true });
    return { report, offline: false };
  }

  const records = await getSymptomRecords();
  const latest = records[records.length - 1];
  const computed = latest?.computed || latest?.serverRecord?.computed;

  const offlineReport = {
    localId: generateLocalId(),
    _id: generateLocalId(),
    riskScore: computed?.riskScore ?? 0,
    riskLevel: computed?.riskLevel ?? "Unknown",
    severityLabel: computed?.severityLabel ?? "Unknown",
    summary:
      computed?.clinicalSubtitle ||
      "Offline-generated clinical risk estimate. Laboratory confirmation required.",
    triggeredFactors: computed?.triggeredFactors || [],
    recommendations: computed?.recommendations || [],
    detectedWarnings: computed?.detectedWarnings || [],
    whoGuidance: computed?.whoGuidance,
    emergencyAdvice: computed?.emergencyAdvice,
    nearestHospitals: nearestHospitals.length ? nearestHospitals : getNearestHospitals(null, null, 5),
    offlineGenerated: true,
    offlineAvailable: true,
    createdAt: new Date().toISOString(),
    symptoms: latest?.symptoms || latest?.payload?.symptoms || [],
    pregnancyStatus: latest?.pregnancyStatus,
    dayOfIllness: latest?.dayOfIllness,
  };

  await cacheReport(offlineReport);
  await queueReportGeneration(
    { nearestHospitals: offlineReport.nearestHospitals },
    { localId: generateLocalId(), recordLocalId: recordLocalId || latest?.localId }
  );

  return { report: offlineReport, offline: true };
};

export const loadDashboardData = async (userId) => {
  const online = await canReachServer();

  if (online) {
    try {
      const [dashRes, reportRes] = await Promise.all([
        api.get("/health/dashboard"),
        api.get("/reports"),
      ]);
      const snapshot = {
        dashboard: dashRes.data,
        reports: reportRes.data,
      };
      await cacheDashboardSnapshot(userId, snapshot);
      reportRes.data?.forEach?.((r) => cacheReport({ ...r, offlineAvailable: true }));
      return { ...snapshot, offline: false };
    } catch (err) {
      if (!err?.response && !isNetworkOnline()) {
        return loadOfflineDashboard(userId);
      }
      throw err;
    }
  }

  return loadOfflineDashboard(userId);
};

export const loadOfflineDashboard = async (userId) => {
  const cached = await getDashboardSnapshot(userId);
  const localRecords = await getSymptomRecords(userId);
  const cachedReports = await getCachedReports();

  const records = localRecords.map((r) => ({
    ...(r.serverRecord || r),
    _id: r.serverId || r.localId,
    localId: r.localId,
    computed: r.computed || r.serverRecord?.computed,
    symptoms: r.payload?.symptoms || r.symptoms,
    temperature: r.payload?.temperature ?? r.temperature,
    dayOfIllness: r.payload?.dayOfIllness ?? r.dayOfIllness,
    offlineGenerated: !r.synced,
  }));

  const mergedRecords =
    records.length > 0 ? records : cached?.dashboard?.records || [];

  const latestAssessment =
    mergedRecords[mergedRecords.length - 1]?.computed ||
    cached?.dashboard?.latestAssessment ||
    null;

  return {
    dashboard: {
      records: mergedRecords,
      latestAssessment,
      offline: true,
    },
    reports: cachedReports.length ? cachedReports : cached?.reports || [],
    offline: true,
  };
};

export const loadReportsHistory = async () => {
  const online = await canReachServer();
  if (online) {
    try {
      const [reportsRes, historyRes] = await Promise.all([
        api.get("/reports"),
        api.get("/reports/history"),
      ]);
      const reports = Array.isArray(reportsRes?.data) ? reportsRes.data : [];
      const history = Array.isArray(historyRes?.data) ? historyRes.data : [];
      [...reports, ...history].forEach((r) => cacheReport({ ...r, offlineAvailable: true }));
      return { reports, history, offline: false };
    } catch (err) {
      if (!isNetworkOnline()) return loadOfflineReports();
      throw err;
    }
  }
  return loadOfflineReports();
};

export const loadOfflineReports = async () => {
  const cached = await getCachedReports();
  return {
    reports: cached.slice(0, 5),
    history: cached,
    offline: true,
  };
};

export const getOfflineNearbyHospitals = (lat, lng) => getNearestHospitals(lat, lng, 5);

export default {
  submitSymptomRecord,
  generateReport,
  loadDashboardData,
  loadReportsHistory,
  isNetworkOnline,
  canReachServer,
  getOfflineNearbyHospitals,
};
