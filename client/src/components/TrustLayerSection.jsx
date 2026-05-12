const trustMetrics = [
  { title: "24/7 Monitoring", value: "Continuous Care", detail: "Daily symptom and fever trends tracked in real time." },
  { title: "10+ Symptoms Tracked", value: "Clinical Inputs", detail: "From headache and rash to bleeding warning signs." },
  { title: "Explainable AI", value: "Transparent Decisions", detail: "Clear reasons behind every risk score increase." },
  { title: "WHO-Aligned Guidance", value: "Medical Protocol", detail: "Evidence-based care guidance for dengue progression." },
  { title: "Family Alerts", value: "Protection Network", detail: "Shared monitoring keeps caregivers informed quickly." },
];

const TrustLayerSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#071121] px-6 py-16 md:px-10 lg:px-14">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 top-10 h-[20rem] w-[20rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-[22rem] w-[22rem] rounded-full bg-teal-400/15 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-5 rounded-[28px] border border-white/10 bg-[#0b1a33]/70 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.32)] backdrop-blur-xl md:grid-cols-2 xl:grid-cols-5">
          {trustMetrics.map((metric) => (
            <article
              key={metric.title}
              className="medical-card rounded-3xl border border-white/10 p-5 transition duration-300 hover:-translate-y-1 hover:border-teal-200/45"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-teal-200">{metric.value}</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{metric.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{metric.detail}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-16 h-24 bg-gradient-to-b from-[#071121] via-[#071121]/70 to-transparent blur-2xl" />
    </section>
  );
};

export default TrustLayerSection;
