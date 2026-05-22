import { useOfflineStatus } from "../../hooks/useOfflineStatus";

const RuralModeToggle = () => {
  const { ruralMode, setRuralMode } = useOfflineStatus();

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
      <input
        type="checkbox"
        className="accent-teal-500"
        checked={ruralMode}
        onChange={(e) => setRuralMode(e.target.checked)}
      />
      <span>Rural Mode</span>
      <span className="text-xs text-slate-500">Low bandwidth · minimal UI</span>
    </label>
  );
};

export default RuralModeToggle;
