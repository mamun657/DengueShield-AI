import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { initAutoSync, runSync, subscribeSyncEvents } from "../services/syncEngine";
import { getQueueStats } from "../sync/syncQueue";
import { getAppState, setAppState, getDb } from "../storage/indexedDb";

export const OfflineContext = createContext(null);

const RURAL_MODE_KEY = "rural_mode";

export const OfflineProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncMessage, setLastSyncMessage] = useState("");
  const [ruralMode, setRuralModeState] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDb()
      .then(() => setDbReady(true))
      .catch(() => setDbReady(false));
    getAppState(RURAL_MODE_KEY, false).then((v) => setRuralModeState(!!v));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("rural-mode", ruralMode);
    if (dbReady) setAppState(RURAL_MODE_KEY, ruralMode);
  }, [ruralMode, dbReady]);

  const refreshPending = useCallback(async () => {
    const stats = await getQueueStats();
    setPendingCount(stats.pending + stats.failed);
  }, []);

  useEffect(() => {
    const updateConnectivity = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      setSyncStatus(online ? "online" : "offline");
      if (!online) {
        setLastSyncMessage("Offline mode active — data saved locally");
      }
    };

    updateConnectivity();
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);

    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, []);

  useEffect(() => {
    refreshPending();
  }, [refreshPending, isOnline]);

  useEffect(() => {
    const unsub = subscribeSyncEvents((event) => {
      if (event.type === "syncing") {
        setSyncStatus("syncing");
        setLastSyncMessage("Syncing offline data…");
      }
      if (event.type === "complete") {
        setSyncStatus(isOnline ? "synced" : "offline");
        setLastSyncMessage(
          event.synced > 0
            ? `Data synced successfully (${event.synced} item${event.synced > 1 ? "s" : ""})`
            : "All data up to date"
        );
        refreshPending();
        setTimeout(() => setLastSyncMessage(""), 8000);
      }
      if (event.type === "partial") {
        setSyncStatus("online");
        setLastSyncMessage(
          `Partial sync: ${event.synced} synced, ${event.failed} failed — will retry`
        );
        refreshPending();
      }
    });
    return unsub;
  }, [isOnline, refreshPending]);

  useEffect(() => {
    if (!userId || !dbReady) return undefined;
    return initAutoSync(() => userId);
  }, [userId, dbReady]);

  useEffect(() => {
    if (isOnline && userId && pendingCount > 0) {
      runSync(userId).then(refreshPending);
    }
  }, [isOnline, userId, pendingCount, refreshPending]);

  const setRuralMode = useCallback((value) => {
    setRuralModeState(!!value);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!userId || !isOnline) return null;
    setSyncStatus("syncing");
    const result = await runSync(userId);
    await refreshPending();
    return result;
  }, [userId, isOnline, refreshPending]);

  const value = useMemo(
    () => ({
      isOnline,
      syncStatus,
      ruralMode,
      pendingCount,
      lastSyncMessage,
      dbReady,
      userId,
      setRuralMode,
      triggerSync,
    }),
    [
      isOnline,
      syncStatus,
      ruralMode,
      pendingCount,
      lastSyncMessage,
      dbReady,
      userId,
      setRuralMode,
      triggerSync,
    ]
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
};

export default OfflineProvider;
