const explainabilityFactors = [
  { label: "High Fever", value: 35, color: "from-rose-300 to-orange-300" },
  { label: "Vomiting", value: 18, color: "from-cyan-300 to-teal-300" },
  { label: "Day 5 Illness", value: 20, color: "from-teal-300 to-cyan-300" },
  { label: "Rising Symptoms", value: 12, color: "from-emerald-300 to-cyan-300" },
];

const LandingStorySections = () => {
  return (
    <div className="relative z-10 space-y-20 px-6 pb-24 pt-6 md:px-10 lg:space-y-28 lg:px-14">
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-24 bg-gradient-to-b from-[#08162a]/85 via-[#08162a]/45 to-transparent blur-2xl" />

      <section id="risk-intelligence" className="mx-auto grid max-w-7xl gap-8 rounded-[30px] bg-[#0b1a33]/64 p-6 shadow-[0_14px_30px_rgba(2,6,23,0.28)] md:p-8 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="medical-card rounded-[30px] border border-white/10 p-7">
          <p className="text-xs uppercase tracking-[0.26em] text-teal-200">AI Explainability</p>
          <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">Why Did Risk Increase?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            DengueShield does not output black-box scores. Every alert includes clinically interpretable factors that help families and clinicians act with confidence.
          </p>
          <div className="mt-8 space-y-4">
            {explainabilityFactors.map((factor) => (
              <div key={factor.label} className="soft-panel rounded-2xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-200">{factor.label}</span>
                  <span className="text-sm font-semibold text-teal-100">+{factor.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
                  <div className={`h-full rounded-full bg-gradient-to-r ${factor.color}`} style={{ width: `${factor.value * 2}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="medical-card rounded-[30px] border border-white/10 p-7">
          <h3 className="text-lg font-semibold text-white">Risk Contribution Snapshot</h3>
          <div className="mt-6 space-y-3">
            <div className="soft-panel rounded-2xl p-4">
              <p className="text-xs text-slate-400">Current Risk</p>
              <p className="mt-1 text-3xl font-bold text-rose-300">78 / 100</p>
            </div>
            <div className="soft-panel rounded-2xl p-4">
              <p className="text-xs text-slate-400">Model Confidence</p>
              <p className="mt-1 text-xl font-semibold text-teal-200">92.4%</p>
            </div>
            <div className="soft-panel rounded-2xl p-4">
              <p className="text-xs text-slate-400">Main Driver</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">Sustained fever + increasing warning symptoms</p>
            </div>
            <div className="soft-panel rounded-2xl p-4">
              <p className="text-xs text-slate-400">WHO Guidance Mapping</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">Warning signs align with escalation criteria in dengue critical phase screening.</p>
            </div>
          </div>
        </article>
      </section>

    </div>
  );
};

export default LandingStorySections;
