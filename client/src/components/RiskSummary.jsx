import { useMemo, useState } from "react";
import { formatClinicalRisk } from "../utils/clinicalRisk";
import {
  getRiskTier,
  humanizeWarning,
  buildActionChecklist,
  simplifySeverityLabel,
} from "../utils/clinicalCopy";
import GuidanceAccordion from "./clinical/GuidanceAccordion";

const RiskSummary = ({
  riskScore,
  riskLevel,
  translatedRiskLevel,
  assessment = null,
  warnings = [],
  actions = [],
  emergencyAdvice = null,
  onFindHospital,
  onDownloadReport,
  showGuidance = true,
}) => {
  const [showGuidanceAccordion, setShowGuidanceAccordion] = useState(false);

  const clinical = useMemo(() => {
    if (assessment && assessment.riskScore != null) return formatClinicalRisk(assessment);
    if (riskScore != null && riskLevel) {
      return formatClinicalRisk({
        riskScore,
        riskLevel,
        severityLabel: riskLevel,
        labPending: true,
      });
    }
    return null;
  }, [assessment, riskScore, riskLevel]);

  if (!clinical) return null;

  const score = clinical.score;
  const tier = getRiskTier(score);
  const severity = simplifySeverityLabel(
    translatedRiskLevel || clinical.severityLabel || clinical.riskLevel
  );

  const warningItems = (Array.isArray(warnings) ? warnings : [])
    .map(humanizeWarning)
    .filter(Boolean)
    .slice(0, 6);

  const checklist = buildActionChecklist(actions, 4);
  const isCritical = score >= 76;
  const scoreFactors =
    assessment?.scoreBreakdown ||
    assessment?.triggeredFactors ||
    assessment?.explainability?.whoAlignedFactors?.map((f) => f.explanation) ||
    [];

  return (
    <div className="space-y-4">
      {/* Hero — action first */}
      <section
        className={`clinical-text relative overflow-hidden rounded-3xl border p-6 md:p-8 ${tier.bg} ${tier.border} ${tier.ring}`}
      >
        {isCritical && (
          <>
            <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${tier.banner}`}>
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-white" />
              Emergency evaluation recommended
            </div>
          </>
        )}

        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Estimated risk
        </p>
        <p className={`mt-1 text-4xl font-bold tabular-nums md:text-5xl ${tier.scoreText}`}>
          {score}/100
          <span className="ml-2 text-2xl font-semibold md:text-3xl">— {severity}</span>
        </p>
        <p className={`mt-2 flex items-center gap-2 text-base font-semibold ${tier.scoreText}`}>
          {isCritical && <span aria-hidden>⚠</span>}
          {tier.actionLine}
        </p>
        <p className="mt-3 max-w-xl text-sm text-slate-300">{tier.oneLiner}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onFindHospital}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              isCritical
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            Find nearby hospital
          </button>
          {onDownloadReport && (
            <button
              type="button"
              onClick={onDownloadReport}
              className="rounded-xl border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Download report
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Warning signs — compact */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
          <p className="text-sm font-semibold text-white">⚠ Warning signs</p>
          {warningItems.length > 0 ? (
            <ul className="clinical-text mt-3 space-y-2 text-sm text-slate-200">
              {warningItems.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">None detected right now.</p>
          )}
        </div>

        {/* Actions — checklist */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
          <p className="text-sm font-semibold text-white">What to do now</p>
          <ul className="clinical-text mt-3 space-y-2 text-sm text-slate-200">
            {checklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                {item}
              </li>
            ))}
          </ul>
          {showGuidance && (
            <button
              type="button"
              onClick={() => setShowGuidanceAccordion((v) => !v)}
              className="mt-4 text-sm font-medium text-cyan-400 hover:text-cyan-300"
            >
              {showGuidanceAccordion ? "Hide full guide" : "View full WHO guidance"}
            </button>
          )}
        </div>
      </div>

      {showGuidanceAccordion && <GuidanceAccordion />}

      <p className="text-center text-xs text-slate-500">
        AI risk estimate only — not a diagnosis. See a doctor for confirmation.
      </p>
    </div>
  );
};

export default RiskSummary;
