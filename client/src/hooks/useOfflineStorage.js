import { useCallback, useEffect, useState } from "react";
import {
  getSymptomRecords,
  getCachedReports,
  getDashboardSnapshot,
} from "../storage/indexedDb";
import { useOfflineStatus } from "./useOfflineStatus";

export const useOfflineStorage = () => {
  const { userId } = useOfflineStatus();
  const [records, setRecords] = useState([]);
  const [reports, setReports] = useState([]);
  const [dashboardCache, setDashboardCache] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRecords([]);
      setReports([]);
      setDashboardCache(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [localRecords, cachedReports, dash] = await Promise.all([
        getSymptomRecords(userId),
        getCachedReports(),
        getDashboardSnapshot(userId),
      ]);
      setRecords(localRecords);
      setReports(cachedReports);
      setDashboardCache(dash);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unsyncedCount = records.filter((r) => !r.synced).length;

  return {
    records,
    reports,
    dashboardCache,
    loading,
    unsyncedCount,
    refresh,
  };
};

export default useOfflineStorage;
