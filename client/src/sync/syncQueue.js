import {
  enqueuePendingSync,
  getPendingSyncItems,
  updatePendingSyncStatus,
  removePendingSyncItem,
  markSymptomRecordSynced,
  generateLocalId,
} from "../storage/indexedDb";

export const SYNC_TYPES = {
  HEALTH_RECORD: "health_record",
  REPORT: "report",
};

export const queueHealthRecord = async (payload, meta = {}) => {
  const localId = meta.localId || generateLocalId();
  await enqueuePendingSync({
    localId,
    type: SYNC_TYPES.HEALTH_RECORD,
    payload,
    idempotencyKey: `health_${localId}`,
    ...meta,
  });
  return localId;
};

export const queueReportGeneration = async (payload, meta = {}) => {
  const localId = meta.localId || generateLocalId();
  await enqueuePendingSync({
    localId,
    type: SYNC_TYPES.REPORT,
    payload,
    idempotencyKey: `report_${meta.recordLocalId || localId}`,
    dependsOn: meta.recordLocalId,
    ...meta,
  });
  return localId;
};

export const getQueueStats = async () => {
  const items = await getPendingSyncItems();
  return {
    pending: items.filter((i) => i.status === "pending").length,
    failed: items.filter((i) => i.status === "failed").length,
    total: items.length,
    items,
  };
};

export const markQueueItemSyncing = (localId) =>
  updatePendingSyncStatus(localId, "syncing");

export const markQueueItemSynced = async (localId, result = {}) => {
  await updatePendingSyncStatus(localId, "synced", { result });
  await removePendingSyncItem(localId);
};

export const markQueueItemFailed = async (localId, error) => {
  const items = await getPendingSyncItems();
  const item = items.find((i) => i.localId === localId);
  const retries = (item?.retries || 0) + 1;
  await updatePendingSyncStatus(localId, retries >= 5 ? "failed" : "pending", {
    retries,
    lastError: String(error?.message || error || "Sync failed"),
  });
};

export const linkSyncedRecord = async (localId, serverRecord) => {
  await markSymptomRecordSynced(localId, serverRecord);
};

export default {
  queueHealthRecord,
  queueReportGeneration,
  getQueueStats,
  markQueueItemSyncing,
  markQueueItemSynced,
  markQueueItemFailed,
  linkSyncedRecord,
};
