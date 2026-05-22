import { useOfflineStatus } from "../../hooks/useOfflineStatus";
import { useSyncQueue } from "../../hooks/useSyncQueue";

const OfflineStatusBanner = () => {
  const { isOnline, syncStatus, lastSyncMessage, pendingCount, triggerSync } =
    useOfflineStatus();
  const { syncing, triggerSync: queueSync } = useSyncQueue();

  let icon = "🟢";
  let label = "Telehealth synced";
  let barClass = "border-emerald-500/25 bg-emerald-950/30";

  if (syncing) {
    icon = "🔄";
    label = "Syncing records…";
    barClass = "border-cyan-500/30 bg-cyan-950/30";
  } else if (!isOnline) {
    icon = "🟠";
    label = "Offline mode active";
    barClass = "border-amber-500/35 bg-amber-950/40";
  } else if (syncStatus === "synced" && lastSyncMessage.includes("synced")) {
    icon = "✅";
    label = "Data synced successfully";
    barClass = "border-emerald-500/25 bg-emerald-950/30";
  } else if (!isOnline) {
    icon = "🟠";
    label = "Offline mode active";
  }

  const subtext = !isOnline
    ? "Working offline — data will sync automatically"
    : pendingCount > 0
    ? `${pendingCount} record${pendingCount > 1 ? "s" : ""} waiting to sync`
    : null;

  const handleSync = () => {
    triggerSync?.();
    queueSync?.();
  };

  return (
    <div
      className={`clinical-text flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${barClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span>{icon}</span>
        <span className="font-medium text-slate-100">{label}</span>
        {subtext && <span className="text-xs text-slate-400">{subtext}</span>}
      </div>
      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-50"
        >
          Sync now
        </button>
      )}
    </div>
  );
};

export default OfflineStatusBanner;
