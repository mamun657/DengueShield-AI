import { motion } from "framer-motion";

const reportSignals = [
  { label: "Risk Score", value: "78 / 100" },
  { label: "Model Confidence", value: "92.4%" },
  { label: "WHO Escalation", value: "Recommended" },
];

const reportHighlights = [
  { title: "Primary Drivers", value: "High fever, rash, persistent fatigue" },
  { title: "Clinical Window", value: "Day 4-6 monitoring required" },
  { title: "Family Guidance", value: "Hydration, rest, warning sign watch" },
];

const LiveReportSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#08162a] px-6 py-24 md:px-10 lg:px-14">
      <style>{`
        @keyframes reportSweep {
          0% { transform: translateX(-40%); opacity: 0; }
          20% { opacity: 0.4; }
          80% { opacity: 0.4; }
          100% { transform: translateX(140%); opacity: 0; }
        }
        @keyframes reportPulse {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes reportShimmer {
          0% { transform: translateX(-120%); opacity: 0; }
          15% { opacity: 0.35; }
          70% { opacity: 0.35; }
          100% { transform: translateX(120%); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-24 top-8 h-[22rem] w-[22rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-[26rem] w-[26rem] rounded-full bg-teal-400/15 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <motion.div
          className="max-w-xl"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="inline-flex w-fit items-center rounded-full border border-cyan-200/30 bg-cyan-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Live AI Report
          </span>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
            Real-time clinical report generation that feels human
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            DengueShield AI compiles a clinician-ready report in seconds, blending model outputs, WHO guidance, and
            explainable drivers into one premium, shareable narrative.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {reportSignals.map((signal) => (
              <div key={signal.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">{signal.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{signal.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 px-6 py-3 text-sm font-semibold text-[#05202f] shadow-[0_12px_32px_rgba(45,212,191,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_52px_rgba(45,212,191,0.55)]">
              View Live Report
            </button>
            <button className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-1 hover:bg-white/20">
              Export Sample PDF
            </button>
          </div>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <motion.div
            className="relative overflow-hidden rounded-[30px] border border-white/15 bg-white/10 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                style={{ animation: "reportShimmer 11s linear infinite" }}
              />
            </div>
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">AI Clinical Report</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Patient Summary - Day 5</h3>
                  <p className="mt-1 text-xs text-slate-300">Updated 2 minutes ago</p>
                </div>
                <div className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  Active
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {reportSignals.map((signal) => (
                  <div key={signal.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{signal.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{signal.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Live Signal Waveform</p>
                  <span className="text-xs text-cyan-100">Streaming</span>
                </div>
                <div className="relative mt-4 h-16 overflow-hidden rounded-xl bg-[#0b1b34]">
                  <svg viewBox="0 0 300 64" className="h-full w-full" fill="none">
                    <defs>
                      <linearGradient id="report-wave" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(34,211,238,0.25)" />
                        <stop offset="50%" stopColor="rgba(34,211,238,0.85)" />
                        <stop offset="100%" stopColor="rgba(45,212,191,0.35)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M8 38 L30 42 L52 28 L74 36 L96 22 L118 32 L140 20 L162 36 L184 26 L206 40 L228 30 L250 42 L272 34 L292 38"
                      stroke="url(#report-wave)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div
                    className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent"
                    style={{ animation: "reportSweep 7.5s ease-in-out infinite" }}
                  />
                  <div
                    className="absolute right-6 top-4 h-2.5 w-2.5 rounded-full bg-cyan-300/90"
                    style={{ animation: "reportPulse 2.8s ease-in-out infinite" }}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {reportHighlights.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.title}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-100">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">AI Summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Persistent fever and rash progression suggest elevated risk. Recommend hydration, close monitoring,
                  and escalation if warning signs appear.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-20 h-28 bg-gradient-to-b from-[#08162a] via-[#08162a]/70 to-transparent blur-2xl" />
    </section>
  );
};

export default LiveReportSection;
