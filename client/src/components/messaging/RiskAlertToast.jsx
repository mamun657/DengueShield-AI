import { useEffect } from "react";
import { useMessaging } from "../../context/MessagingContext";

const AUTO_DISMISS_MS = 12000;

const RiskAlertToast = () => {
  const { activeRiskAlert, dismissRiskAlert } = useMessaging();

  useEffect(() => {
    if (!activeRiskAlert) return undefined;
    const timer = setTimeout(() => dismissRiskAlert(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [activeRiskAlert, dismissRiskAlert]);

  if (!activeRiskAlert) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] w-[min(360px,92vw)]">
      <div
        role="alert"
        aria-live="assertive"
        className="pointer-events-auto rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.65)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white">{activeRiskAlert.title}</p>
            <p className="mt-1 text-xs text-slate-400">{activeRiskAlert.body}</p>
          </div>
          <button
            type="button"
            onClick={dismissRiskAlert}
            className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10"
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiskAlertToast;
