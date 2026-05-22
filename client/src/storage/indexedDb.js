import { openDB } from "idb";

export const DB_NAME = "dengueShieldOfflineDB";
export const DB_VERSION = 1;

const STORES = {
  SYMPTOM_RECORDS: "symptom_records",
  PENDING_SYNC: "pending_sync",
  CACHED_REPORTS: "cached_reports",
  APP_STATE: "app_state",
};

let dbPromise = null;

const createStores = (db) => {
  if (!db.objectStoreNames.contains(STORES.SYMPTOM_RECORDS)) {
    const symptomStore = db.createObjectStore(STORES.SYMPTOM_RECORDS, { keyPath: "localId" });
    symptomStore.createIndex("createdAt", "createdAt");
    symptomStore.createIndex("synced", "synced");
    symptomStore.createIndex("userId", "userId");
  }
  if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
    const syncStore = db.createObjectStore(STORES.PENDING_SYNC, { keyPath: "localId" });
    syncStore.createIndex("createdAt", "createdAt");
    syncStore.createIndex("type", "type");
    syncStore.createIndex("status", "status");
  }
  if (!db.objectStoreNames.contains(STORES.CACHED_REPORTS)) {
    const reportStore = db.createObjectStore(STORES.CACHED_REPORTS, { keyPath: "localId" });
    reportStore.createIndex("createdAt", "createdAt");
    reportStore.createIndex("serverId", "serverId");
    reportStore.createIndex("offlineAvailable", "offlineAvailable");
  }
  if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
    db.createObjectStore(STORES.APP_STATE, { keyPath: "key" });
  }
};

export const getDb = async () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        createStores(db);
      },
      blocked() {
        console.warn("[OfflineDB] Upgrade blocked — close other tabs.");
      },
    }).catch(async (err) => {
      dbPromise = null;
      console.error("[OfflineDB] open failed, attempting recovery:", err);
      try {
        const { deleteDB } = await import("idb");
        await deleteDB(DB_NAME);
        dbPromise = openDB(DB_NAME, DB_VERSION, {
          upgrade(db) {
            createStores(db);
          },
        });
        return dbPromise;
      } catch (recoveryErr) {
        dbPromise = null;
        throw recoveryErr;
      }
    });
  }
  return dbPromise;
};

export const resetDatabase = async () => {
  dbPromise = null;
  const { deleteDB } = await import("idb");
  await deleteDB(DB_NAME);
  return getDb();
};

export const sanitizeString = (value, maxLen = 2000) => {
  if (value == null) return "";
  return String(value)
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .trim()
    .slice(0, maxLen);
};

export const sanitizeSymptomPayload = (payload = {}) => {
  const symptoms = Array.isArray(payload.symptoms)
    ? payload.symptoms.map((s) => sanitizeString(s, 80).toLowerCase()).filter(Boolean)
    : [];
  const plateletRaw = payload.plateletCount ?? payload.labData?.plateletCount;
  const plateletCount =
    plateletRaw != null && plateletRaw !== "" ? Number(plateletRaw) : null;

  return {
    temperature: Number(payload.temperature) || 0,
    dayOfIllness: Math.max(1, Number(payload.dayOfIllness) || 1),
    fluidIntakeLiters: Number(payload.fluidIntakeLiters) || 0,
    pregnancyStatus: !!payload.pregnancyStatus,
    symptoms,
    plateletCount: Number.isFinite(plateletCount) ? plateletCount : null,
    labData:
      payload.labData ||
      (Number.isFinite(plateletCount) ? { plateletCount } : null),
  };
};

export const generateLocalId = () =>
  `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

// ——— Symptom records ———

export const saveSymptomRecord = async (record) => {
  const db = await getDb();
  const safe = {
    ...record,
    localId: record.localId || generateLocalId(),
    createdAt: record.createdAt || new Date().toISOString(),
    synced: !!record.synced,
    payload: sanitizeSymptomPayload(record.payload || record),
  };
  await db.put(STORES.SYMPTOM_RECORDS, safe);
  return safe;
};

export const getSymptomRecords = async (userId) => {
  const db = await getDb();
  const all = await db.getAll(STORES.SYMPTOM_RECORDS);
  const filtered = userId ? all.filter((r) => r.userId === userId) : all;
  return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export const markSymptomRecordSynced = async (localId, serverRecord) => {
  const db = await getDb();
  const existing = await db.get(STORES.SYMPTOM_RECORDS, localId);
  if (!existing) return null;
  const updated = {
    ...existing,
    synced: true,
    serverId: serverRecord?._id || serverRecord?.id,
    serverRecord,
    syncedAt: new Date().toISOString(),
  };
  await db.put(STORES.SYMPTOM_RECORDS, updated);
  return updated;
};

// ——— Pending sync queue ———

export const enqueuePendingSync = async (item) => {
  const db = await getDb();
  const entry = {
    localId: item.localId || generateLocalId(),
    type: item.type,
    payload: item.payload,
    status: "pending",
    retries: item.retries || 0,
    createdAt: item.createdAt || new Date().toISOString(),
    idempotencyKey: item.idempotencyKey || item.localId || generateLocalId(),
  };
  await db.put(STORES.PENDING_SYNC, entry);
  return entry;
};

export const getPendingSyncItems = async () => {
  const db = await getDb();
  const items = await db.getAll(STORES.PENDING_SYNC);
  return items
    .filter((i) => i.status === "pending" || i.status === "failed")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export const updatePendingSyncStatus = async (localId, status, meta = {}) => {
  const db = await getDb();
  const existing = await db.get(STORES.PENDING_SYNC, localId);
  if (!existing) return null;
  const updated = { ...existing, status, ...meta, updatedAt: new Date().toISOString() };
  await db.put(STORES.PENDING_SYNC, updated);
  return updated;
};

export const removePendingSyncItem = async (localId) => {
  const db = await getDb();
  await db.delete(STORES.PENDING_SYNC, localId);
};

// ——— Cached reports ———

export const cacheReport = async (report, options = {}) => {
  const db = await getDb();
  const localId = report.localId || report._id || generateLocalId();
  const entry = {
    ...report,
    localId,
    serverId: report._id || report.serverId || null,
    offlineAvailable: true,
    cachedAt: new Date().toISOString(),
    pdfBlobKey: options.pdfBlobKey || report.pdfBlobKey || null,
  };
  await db.put(STORES.CACHED_REPORTS, entry);
  return entry;
};

export const getCachedReports = async () => {
  const db = await getDb();
  const reports = await db.getAll(STORES.CACHED_REPORTS);
  return reports.sort((a, b) => new Date(b.createdAt || b.cachedAt) - new Date(a.createdAt || a.cachedAt));
};

export const getCachedReport = async (localId) => {
  const db = await getDb();
  return db.get(STORES.CACHED_REPORTS, localId);
};

// ——— App state (dashboard cache, rural mode, etc.) ———

export const setAppState = async (key, value) => {
  const db = await getDb();
  await db.put(STORES.APP_STATE, { key, value, updatedAt: new Date().toISOString() });
};

export const getAppState = async (key, fallback = null) => {
  try {
    const db = await getDb();
    const row = await db.get(STORES.APP_STATE, key);
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
};

export const cacheDashboardSnapshot = async (userId, snapshot) => {
  await setAppState(`dashboard_${userId}`, {
    ...snapshot,
    cachedAt: new Date().toISOString(),
  });
};

export const getDashboardSnapshot = async (userId) => {
  return getAppState(`dashboard_${userId}`, null);
};

export { STORES };
