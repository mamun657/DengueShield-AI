import { useContext } from "react";
import { OfflineContext } from "../offline/OfflineProvider";

export const useOfflineStatus = () => {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    return {
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      syncStatus: "online",
      ruralMode: false,
      pendingCount: 0,
      lastSyncMessage: "",
      setRuralMode: () => {},
      triggerSync: async () => {},
    };
  }
  return ctx;
};

export default useOfflineStatus;
