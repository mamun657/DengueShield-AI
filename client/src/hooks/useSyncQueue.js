import { useCallback, useEffect, useState } from "react";
import { getQueueStats } from "../sync/syncQueue";
import { runSync, subscribeSyncEvents } from "../services/syncEngine";
import { useOfflineStatus } from "./useOfflineStatus";

export const useSyncQueue = () => {
  const { isOnline, userId } = useOfflineStatus();
  const [stats, setStats] = useState({ pending: 0, failed: 0, total: 0, items: [] });
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getQueueStats();
    setStats(next);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = subscribeSyncEvents((event) => {
      if (event.type === "syncing") setSyncing(true);
      if (event.type === "complete" || event.type === "partial") {
        setSyncing(false);
        refresh();
      }
    });
    const interval = setInterval(refresh, 15000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  const triggerSync = useCallback(async () => {
    if (!isOnline || !userId) return null;
    setSyncing(true);
    try {
      return await runSync(userId);
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [isOnline, userId, refresh]);

  return {
    ...stats,
    syncing,
    refresh,
    triggerSync,
  };
};

export default useSyncQueue;
