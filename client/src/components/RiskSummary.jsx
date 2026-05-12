import { useTranslation } from "react-i18next";

const RiskSummary = ({ riskScore, riskLevel, translatedRiskLevel, alerts = [] }) => {
  const { t } = useTranslation();

  if (riskScore == null || !riskLevel) {
    return null;
  }

  const riskConfig = {
    Low: {
      bg: "bg-green-500/10",
      badge: "bg-green-600 text-white",
      text: "text-green-300",
      message: t("riskMessageLow"),
    },
    Medium: {
      bg: "bg-yellow-400/10",
      badge: "bg-yellow-400 text-slate-900",
      text: "text-yellow-300",
      message: t("riskMessageMedium"),
    },
    High: {
      bg: "bg-red-500/10",
      badge: "bg-red-600 text-white",
      text: "text-red-300",
      message: t("riskMessageHigh"),
    },
    Critical: {
      bg: "bg-red-500/10",
      badge: "bg-red-600 text-white",
      text: "text-red-300",
      message: t("riskMessageHigh"),
    },
  };

  const config = riskConfig[riskLevel] || riskConfig.Low;

  return (
    <section className={`rounded-2xl border border-white/10 ${config.bg} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">{t("currentRiskSummary")}</p>
          <h2 className="text-3xl font-semibold text-white">
            {Math.round(riskScore)}/100
          </h2>
          <p className={`text-sm font-medium ${config.text}`}>{config.message}</p>
        </div>

        <div className={`rounded-full px-4 py-2 text-sm font-semibold ${config.badge}`}>
          {translatedRiskLevel}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-gray-300">{t("clinicalAlerts")}</p>
          <ul className="space-y-2 text-sm">
            {alerts.map((alert) => (
              <li key={alert} className="flex items-start gap-2 text-yellow-300">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current" />
                <span>{alert}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default RiskSummary;
