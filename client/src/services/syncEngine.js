import api from "../api";
import {
  getPendingSyncItems,
  getSymptomRecords,
  cacheReport,
  cacheDashboardSnapshot,
  sanitizeSymptomPayload,
} from "../storage/indexedDb";
import {
  markQueueItemSyncing,
  markQueueItemSynced,
  markQueueItemFailed,
  linkSyncedRecord,
  SYNC_TYPES,
} from "../sync/syncQueue";

let syncInProgress = false;
const listeners = new Set();

export const subscribeSyncEvents = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const emit = (event) => {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (e) {
      console.error("[SyncEngine] listener error", e);
    }
  });
};

const isOnline = () =>
  typeof navigator !== "undefined" && navigator.onLine && !!localStorage.getItem("token");

const syncedRecordIds = new Set();

export const runSync = async (userId) => {
  if (!isOnline() || syncInProgress) {
    return { synced: 0, failed: 0, skipped: true };
  }

  syncInProgress = true;
  emit({ type: "syncing" });

  let synced = 0;
  let failed = 0;

  try {
    const items = await getPendingSyncItems();
    const recordIdMap = new Map();

    for (const item of items) {
      if (item.type !== SYNC_TYPES.HEALTH_RECORD) continue;

      if (syncedRecordIds.has(item.idempotencyKey)) {
        await markQueueItemSynced(item.localId);
        continue;
      }

      try {
        await markQueueItemSyncing(item.localId);
        const payload = sanitizeSymptomPayload(item.payload);
        const { data: serverRecord } = await api.post("/health/records", payload);
        recordIdMap.set(item.localId, serverRecord);
        await linkSyncedRecord(item.localId, serverRecord);
        await markQueueItemSynced(item.localId);
        syncedRecordIds.add(item.idempotencyKey);
        synced += 1;
      } catch (err) {
        await markQueueItemFailed(item.localId, err);
        failed += 1;
      }
    }

    for (const item of items) {
      if (item.type !== SYNC_TYPES.REPORT) continue;

      const dependsOn = item.dependsOn;
      if (dependsOn && !recordIdMap.has(dependsOn)) {
        const records = await getSymptomRecords(userId);
        const parent = records.find((r) => r.localId === dependsOn && r.synced);
        if (!parent?.serverId) continue;
      }

      try {
        await markQueueItemSyncing(item.localId);
        const { data: report } = await api.post("/reports", item.payload || {});
        await cacheReport({ ...report, offlineAvailable: true });
        await markQueueItemSynced(item.localId);
        synced += 1;
      } catch (err) {
        await markQueueItemFailed(item.localId, err);
        failed += 1;
      }
    }

    if (userId && synced > 0) {
      try {
        const [dashRes, reportRes] = await Promise.all([
          api.get("/health/dashboard"),
          api.get("/reports"),
        ]);
        await cacheDashboardSnapshot(userId, {
          dashboard: dashRes.data,
          reports: reportRes.data,
        });
        reportRes.data?.forEach?.((r) => cacheReport({ ...r, offlineAvailable: true }));
      } catch {
        // non-fatal
      }
    }

    emit({
      type: failed > 0 ? "partial" : "complete",
      synced,
      failed,
    });

    return { synced, failed };
  } finally {
    syncInProgress = false;
  }
};

export const initAutoSync = (getUserId) => {
  const trigger = () => {
    const userId = getUserId?.();
    if (userId && isOnline()) {
      runSync(userId);
    }
  };

  window.addEventListener("online", trigger);
  const interval = setInterval(trigger, 60000);

  if (isOnline()) trigger();

  return () => {
    window.removeEventListener("online", trigger);
    clearInterval(interval);
  };
};

export const getSyncInProgress = () => syncInProgress;

export default { runSync, initAutoSync, subscribeSyncEvents, getSyncInProgress };
