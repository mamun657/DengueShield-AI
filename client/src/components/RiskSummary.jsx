import { useTranslation } from "react-i18next";
import { formatClinicalRisk, MEDICAL_DISCLAIMER } from "../utils/clinicalRisk";

const RiskSummary = ({
  riskScore,
  riskLevel,
  translatedRiskLevel,
  assessment = null,
  alerts = [],
}) => {
  const { t } = useTranslation();
  const clinical = formatClinicalRisk(assessment) || (riskScore != null && riskLevel
    ? formatClinicalRisk({
        riskScore,
        riskLevel,
        severityLabel: riskLevel,
        labPending: true,
        aiConfidenceLabel: "Moderate",
        clinicalSubtitle: "Based on symptom progression and WHO warning signs.",
      })
    : null);

  if (!clinical) return null;

  const { styles, score, scoreLine, severityLabel, displayTitle, clinicalSubtitle, labPending, aiConfidenceLabel, triggeredFactors, recommendations, medicalDisclaimer, confidenceStyle } = clinical;
  const hasTriggeredFactors = Array.isArray(triggeredFactors) && triggeredFactors.length > 0;

  return (
    <section className={`rounded-2xl border border-white/10 ${styles.bg} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 max-w-xl">
          <p className="text-sm font-medium text-gray-300">{t("currentRiskSummary", { defaultValue: "Current Risk Summary" })}</p>
          <h2 className="text-2xl font-semibold text-white">{displayTitle}</h2>
          <p className="text-3xl font-bold text-white tabular-nums">{scoreLine}</p>
          <p className={`text-sm font-medium ${styles.text}`}>{clinicalSubtitle}</p>
          {labPending && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100">
              Lab pending · CBC / Platelet test advised
            </span>
          )}
          <p className="text-xs text-slate-400">Clinical confirmation recommended.</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={`rounded-full px-4 py-2 text-sm font-semibold ${styles.badge}`}>
            {translatedRiskLevel || severityLabel}
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${confidenceStyle}`}>
            AI Confidence: {aiConfidenceLabel}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-wider text-slate-400">Triggered factors</p>
        {hasTriggeredFactors ? (
          <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
            {triggeredFactors.map((factor) => (
              <li key={factor} className="flex gap-2">
                <span className="text-cyan-400">▸</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-300">No significant WHO warning pathways detected.</p>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-gray-300">Recommendations</p>
          <ul className="space-y-1 text-sm text-slate-300">
            {recommendations.slice(0, 4).map((rec) => (
              <li key={rec}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-gray-300">{t("clinicalAlerts", { defaultValue: "Clinical alerts" })}</p>
          <ul className="space-y-2 text-sm">
            {alerts.map((alert) => (
              <li key={alert} className="flex items-start gap-2 text-amber-200">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current" />
                <span>{alert}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-slate-500">
        {medicalDisclaimer || MEDICAL_DISCLAIMER}
      </p>
    </section>
  );
};

export default RiskSummary;
