import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatClinicalRisk, MEDICAL_DISCLAIMER } from "../utils/clinicalRisk";

const RiskSummary = ({
  riskScore,
  riskLevel,
  translatedRiskLevel,
  assessment = null,
  warnings = [],
  actions = [],
  emergencyAdvice = null,
  advancedReasoning = {},
}) => {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const clinical = useMemo(() => {
    if (assessment && assessment.riskScore != null) return formatClinicalRisk(assessment);
    if (riskScore != null && riskLevel) {
      return formatClinicalRisk({
        riskScore,
        riskLevel,
        severityLabel: riskLevel,
        labPending: true,
        aiConfidenceLabel: "Moderate",
        clinicalSubtitle: "Estimated dengue risk based on symptom analysis and WHO warning signs.",
      });
    }
    return null;
  }, [assessment, riskScore, riskLevel]);

  if (!clinical) return null;

  const {
    styles,
    scoreLine,
    displayTitle,
    clinicalSubtitle,
    aiConfidenceLabel,
    score,
  } = clinical;

  const isCritical = score >= 80;
  const warningItems = Array.isArray(warnings) ? warnings.filter(Boolean).slice(0, 6) : [];
  const actionItems = Array.isArray(actions) ? actions.filter(Boolean).slice(0, 6) : [];

  const prioritizedActions = [...actionItems].sort((a, b) => {
    const priority = (text) => {
      const value = String(text || "").toLowerCase();
      if (/hospital|urgent|emergency|immediate|care|refer/.test(value)) return 0;
      return 1;
    };
    return priority(a) - priority(b) || String(a).localeCompare(String(b));
  });

  const dotClass = isCritical ? "bg-red-400" : "bg-cyan-400";
  const actionDotClass = isCritical ? "bg-red-300" : "bg-emerald-400";

  const detailSections = [
    {
      title: t("graphTraversal", { defaultValue: "Graph traversal" }),
      items: Array.isArray(advancedReasoning.graphReasoning)
        ? advancedReasoning.graphReasoning.slice(0, 5)
        : [],
    },
    {
      title: t("whoLogic", { defaultValue: "WHO logic" }),
      items: advancedReasoning.whoGuidance ? [advancedReasoning.whoGuidance] : [],
    },
    {
      title: t("confidenceBreakdown", { defaultValue: "Confidence" }),
      items: advancedReasoning.confidence ? [advancedReasoning.confidence] : [`AI confidence: ${aiConfidenceLabel}`],
    },
    {
      title: t("diseaseOverlap", { defaultValue: "Disease overlap" }),
      items: advancedReasoning.diseaseOverlap ? [advancedReasoning.diseaseOverlap] : [],
    },
  ].filter((section) => section.items.length > 0);

  return (
    <section className={`relative overflow-hidden rounded-[28px] border p-6 shadow-[0_30px_60px_rgba(15,23,42,0.30)] ${isCritical ? "border-red-500/40 bg-gradient-to-br from-rose-950 via-[#5d101d] to-slate-950 shadow-[0_0_70px_rgba(244,63,94,0.28)]" : "border-white/10 bg-[#111827]/95"}`}>
      {isCritical && <div className="absolute inset-x-0 top-0 h-1.5 bg-red-500/90" />}

      <div className={`rounded-[22px] border p-6 ${isCritical ? "border-red-500/30 bg-slate-950/95" : "border-white/10 bg-slate-950/90"}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] ${isCritical ? "bg-red-500/15 text-red-100" : "bg-slate-800/70 text-slate-200"}`}>
                {isCritical ? "🚨" : "⚕️"}
                {isCritical ? t("criticalDengueRisk", { defaultValue: "CRITICAL DENGUE RISK" }) : t("estimatedDengueRisk", { defaultValue: "Estimated Dengue Risk" })}
              </span>
              {isCritical && (
                <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-200">
                  <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse shadow-[0_0_12px_rgba(248,113,113,0.35)]" />
                  Immediate attention required
                </span>
              )}
            </div>

            <p className="mt-4 text-5xl font-semibold tracking-tight text-white sm:text-6xl">{scoreLine}</p>
            <p className={isCritical ? "mt-3 text-lg font-semibold text-rose-200" : "mt-3 text-lg font-semibold text-slate-200"}>{displayTitle}</p>
            <p className={isCritical ? "mt-4 max-w-2xl text-base leading-8 text-rose-100" : "mt-4 max-w-2xl text-base leading-8 text-slate-300"}>
              {emergencyAdvice || t("immediateClinicAdvice", { defaultValue: "Immediate clinical evaluation recommended." })}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <span className={`rounded-full px-4 py-2 text-sm font-semibold ${styles.badge}`}>{translatedRiskLevel || clinical.severityLabel}</span>
            <span className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">{clinicalSubtitle}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${isCritical ? "border-red-500/30 bg-red-950/80" : "border-white/10 bg-[#0f172a]/90"}`}>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("warningSigns", { defaultValue: "Warning signs detected" })}</p>
          {warningItems.length > 0 ? (
            <ul className={isCritical ? "mt-3 space-y-2 text-sm text-rose-100" : "mt-3 space-y-2 text-sm text-slate-200"}>
              {warningItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className={`mt-1 h-2 w-2 rounded-full ${dotClass}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">{t("noWarningSignsDetected", { defaultValue: "No urgent warning signs detected." })}</p>
          )}
        </div>

        <div className={`rounded-2xl border p-4 ${isCritical ? "border-red-500/30 bg-slate-950/85" : "border-white/10 bg-[#0f172a]/90"}`}>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("recommendedAction", { defaultValue: "Recommended action" })}</p>
          {prioritizedActions.length > 0 ? (
            <ul className={`mt-3 space-y-2 text-sm ${isCritical ? "text-rose-100" : "text-slate-200"}`}>
              {prioritizedActions.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className={`mt-1 h-2 w-2 rounded-full ${actionDotClass}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">{t("defaultActionNote", { defaultValue: "Monitor symptoms, keep hydrated, and seek care if conditions worsen." })}</p>
          )}
        </div>
      </div>

      <p className="mt-5 text-sm text-slate-500">{t("medicalNote", { defaultValue: "This is an AI-assisted clinical risk estimation and not a confirmed diagnosis." })}</p>

      {detailSections.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails
              ? t("hideDetailedAiReasoning", { defaultValue: "Hide detailed AI reasoning" })
              : t("viewDetailedAiReasoning", { defaultValue: "View detailed AI reasoning" })}
          </button>

          {showDetails && (
            <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-[#111827]/90 p-4 text-sm text-slate-300">
              {detailSections.map((section) => (
                <div key={section.title}>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{section.title}</p>
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item, idx) => (
                      <li key={`${section.title}-${idx}`} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-slate-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default RiskSummary;
