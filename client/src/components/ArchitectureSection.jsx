import { motion } from "framer-motion";

const pipelineSteps = [
  {
    title: "Symptom Input",
    description: "Multi-language intake from families, clinics, and care teams.",
    badge: "ML",
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M3 12h4l2-5 4 10 2-5h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "WHO Rule Engine",
    description: "Clinical guardrails tuned to WHO dengue guidance.",
    badge: "ML",
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "XGBoost Severity AI",
    description: "Predictive risk scoring across symptom trajectories.",
    badge: "ML",
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M5 19V9" strokeLinecap="round" />
        <path d="M12 19V5" strokeLinecap="round" />
        <path d="M19 19v-7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "SHAP Explainability",
    description: "Transparent drivers that clinicians can trust.",
    badge: "XAI",
    priority: true,
    explainability: true,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="12" cy="18" r="2" />
        <path d="M8 7l3 9" strokeLinecap="round" />
        <path d="M16 7l-3 9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "RAG WHO Validation",
    description: "Retrieval-augmented checks against WHO guidance.",
    badge: "RAG",
    priority: true,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M6 4h9a3 3 0 013 3v11H9a3 3 0 00-3 3V4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 7h6" strokeLinecap="round" />
        <path d="M9 11h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Gemini Report Generation",
    description: "LLM summaries with clinical-grade recommendations.",
    badge: "LLM",
    priority: true,
    active: true,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M12 3l2.3 4.7L19 8.4l-3.5 3.4.8 4.8-4.3-2.2-4.3 2.2.8-4.8L5 8.4l4.7-.7L12 3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const categoryBadges = ["ML", "XAI", "RAG", "LLM", "WHO-aligned"];

const shapFactors = [
  { label: "High Fever", value: 22 },
  { label: "Vomiting", value: 14 },
  { label: "Day 5", value: 18 },
  { label: "Platelet Drop", value: 11 },
];

const ambientParticles = [
  { left: "10%", top: "18%", size: 6, delay: 0 },
  { left: "22%", top: "62%", size: 4, delay: 1.2 },
  { left: "48%", top: "12%", size: 5, delay: 2.4 },
  { left: "68%", top: "28%", size: 6, delay: 0.8 },
  { left: "78%", top: "72%", size: 4, delay: 1.6 },
  { left: "90%", top: "42%", size: 5, delay: 2.1 },
];

const ArchitectureSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#071121] px-6 py-20 md:px-10 lg:px-14">
      <style>{`
        @keyframes scanSweep {
          0% { transform: translateX(-30%); opacity: 0; }
          20% { opacity: 0.45; }
          80% { opacity: 0.45; }
          100% { transform: translateX(130%); opacity: 0; }
        }
        @keyframes softPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-120%); opacity: 0; }
          15% { opacity: 0.35; }
          70% { opacity: 0.35; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes particleFlow {
          0% { transform: translateX(-15%); opacity: 0; }
          15% { opacity: 0.7; }
          100% { transform: translateX(115%); opacity: 0; }
        }
        @keyframes verticalFlow {
          0% { transform: translateY(-10%); opacity: 0; }
          20% { opacity: 0.6; }
          100% { transform: translateY(110%); opacity: 0; }
        }
        @keyframes statusFlicker {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        @keyframes telemetryDash {
          to { stroke-dashoffset: -120; }
        }
        @keyframes shapPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
      <div className="absolute inset-0">
        <div className="absolute -left-32 top-12 h-[22rem] w-[22rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-[26rem] w-[26rem] rounded-full bg-teal-400/15 blur-3xl" />
        {ambientParticles.map((particle, index) => (
          <motion.span
            key={`particle-${index}`}
            className="absolute rounded-full bg-cyan-200/30 shadow-[0_0_8px_rgba(56,189,248,0.35)]"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
            }}
            animate={{ y: [0, -10, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, delay: particle.delay, ease: "easeInOut" }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-24 bg-gradient-to-b from-[#071121]/85 via-[#071121]/45 to-transparent blur-2xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-start">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              style={{ animation: "shimmer 12s linear infinite" }}
            />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Architecture</p>
              <h2 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
                AI-native Clinical Intelligence Pipeline
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                A streaming decision flow that blends WHO clinical rules, predictive ML, and transparent AI reasoning to
                deliver confident early-detection guidance.
              </p>
            </div>
            <div className="hidden items-center gap-3 rounded-full border border-cyan-200/30 bg-cyan-200/10 px-4 py-2 text-xs font-semibold text-cyan-100 md:flex">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-300/60" style={{ animation: "softPulse 2.8s ease-in-out infinite" }} />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
              </span>
              <span className="uppercase tracking-[0.18em]">Live AI Processing</span>
              <span
                className="h-0.5 w-12 rounded-full bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent"
                style={{ animation: "statusFlicker 2.6s ease-in-out infinite" }}
              />
            </div>
          </div>

          <div className="relative mt-10 group/flow">
            <div className="absolute left-6 right-6 top-10 hidden h-px lg:block">
              <div className="relative h-full w-full overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent opacity-60 transition duration-300 group-hover/flow:opacity-100"
                  style={{ animation: "glowPulse 5s ease-in-out infinite" }}
                />
                <div
                  className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent opacity-70 group-hover/flow:opacity-100"
                  style={{ animation: "scanSweep 9s ease-in-out infinite" }}
                />
                {Array.from({ length: 5 }).map((_, index) => (
                  <motion.span
                    key={index}
                    className="absolute -top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-300/80 shadow-[0_0_12px_rgba(56,189,248,0.55)]"
                    animate={{ x: ["-10%", "110%"], opacity: [0, 0.8, 0] }}
                    transition={{ duration: 8, repeat: Infinity, delay: index * 1.6, ease: "linear" }}
                  />
                ))}
              </div>
            </div>
            <div
              className="absolute left-6 right-6 hidden h-px lg:block"
              style={{ top: "calc(50% + 20px)" }}
            >
              <div className="relative h-full w-full overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent opacity-55 transition duration-300 group-hover/flow:opacity-95"
                  style={{ animation: "glowPulse 6s ease-in-out infinite" }}
                />
                <div
                  className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent opacity-70 group-hover/flow:opacity-100"
                  style={{ animation: "scanSweep 10s ease-in-out infinite" }}
                />
                {Array.from({ length: 4 }).map((_, index) => (
                  <motion.span
                    key={`row-2-${index}`}
                    className="absolute -top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-300/70 shadow-[0_0_12px_rgba(56,189,248,0.45)]"
                    animate={{ x: ["-10%", "110%"], opacity: [0, 0.7, 0] }}
                    transition={{ duration: 9, repeat: Infinity, delay: index * 1.9, ease: "linear" }}
                  />
                ))}
              </div>
            </div>
            <div className="absolute inset-0 hidden grid-cols-3 lg:grid">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`col-${index}`} className="relative">
                  <div
                    className="absolute left-1/2 top-12 h-[calc(100%-96px)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-300/35 to-transparent opacity-50 transition duration-300 group-hover/flow:opacity-85"
                    style={{ animation: "glowPulse 7s ease-in-out infinite" }}
                  />
                  {Array.from({ length: 2 }).map((__, particleIndex) => (
                    <span
                      key={`col-${index}-particle-${particleIndex}`}
                      className="absolute left-1/2 top-12 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300/70 shadow-[0_0_10px_rgba(56,189,248,0.45)]"
                      style={{
                        animation: "verticalFlow 7.5s linear infinite",
                        animationDelay: `${particleIndex * 2.6 + index * 0.8}s`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <motion.div
              className="absolute -top-2 left-0 hidden h-40 w-40 bg-gradient-to-r from-transparent via-cyan-300/15 to-transparent blur-2xl lg:block"
              animate={{ x: ["-20%", "120%"] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pipelineSteps.map((step, index) => {
                const isPriority = Boolean(step.priority);
                const isStaggered = index >= 3;
                const isExplainability = Boolean(step.explainability);
                const isActive = Boolean(step.active);

                return (
                  <motion.article
                    key={step.title}
                    className={`group relative rounded-2xl border p-6 backdrop-blur-lg transition duration-300 hover:-translate-y-1 hover:border-cyan-200/45 hover:shadow-[0_20px_50px_rgba(56,189,248,0.25)] ${
                      isPriority
                        ? "min-h-[230px] border-cyan-200/35 bg-white/10 shadow-[0_18px_42px_rgba(56,189,248,0.22)]"
                        : "min-h-[200px] border-white/10 bg-white/5 shadow-[0_12px_30px_rgba(2,6,23,0.28)]"
                    } ${isStaggered ? "lg:translate-y-4" : ""} ${
                      isPriority ? "lg:scale-[1.02]" : ""
                    } ${isExplainability ? "overflow-hidden" : ""}`}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -6 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                  >
                    {isPriority && (
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
                      </div>
                    )}
                    {isActive && (
                      <div
                        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-300/15 blur-2xl"
                        style={{ animation: "shapPulse 5s ease-in-out infinite" }}
                      />
                    )}
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                      {Array.from({ length: 3 }).map((_, particleIndex) => (
                        <span
                          key={`card-particle-${index}-${particleIndex}`}
                          className="absolute top-3 h-1.5 w-1.5 rounded-full bg-cyan-300/70 shadow-[0_0_10px_rgba(56,189,248,0.55)]"
                          style={{
                            left: `${18 + particleIndex * 18}%`,
                            animation: "particleFlow 6.5s linear infinite",
                            animationDelay: `${particleIndex * 1.4}s`,
                          }}
                        />
                      ))}
                    </div>
                    <motion.div
                      animate={isPriority ? { y: [0, -6, 0] } : { y: [0, -3, 0] }}
                      transition={{ duration: 10 + index, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`relative flex items-center justify-center rounded-2xl border text-cyan-100 ${
                            isPriority
                              ? "h-12 w-12 border-cyan-200/50 bg-cyan-200/15"
                              : "h-11 w-11 border-cyan-200/35 bg-cyan-200/10"
                          }`}
                        >
                          <span
                            className="absolute inset-0 rounded-2xl bg-cyan-300/15"
                            style={{ animation: "softPulse 3.2s ease-in-out infinite" }}
                          />
                          <span className="relative">
                            <step.Icon />
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/40 bg-cyan-200/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" style={{ animation: "statusFlicker 2.2s ease-in-out infinite" }} />
                              Live
                            </span>
                          )}
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                              isPriority
                                ? "border-cyan-200/40 bg-cyan-200/10 text-cyan-100"
                                : "border-white/15 bg-white/10 text-cyan-100"
                            }`}
                          >
                            {step.badge}
                          </span>
                        </div>
                      </div>
                      <h3 className={`mt-4 text-base font-semibold ${isPriority ? "text-white" : "text-slate-100"}`}>
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>

                      {isExplainability && (
                        <div className="relative mt-4 rounded-2xl border border-cyan-200/20 bg-cyan-200/5 p-4">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent" style={{ animation: "shapPulse 5.5s ease-in-out infinite" }} />
                          <div className="relative space-y-2">
                            {shapFactors.map((factor) => (
                              <div key={factor.label} className="flex items-center gap-3">
                                <span className="text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                                  {factor.label}
                                </span>
                                <div className="flex-1">
                                  <div className="h-1.5 overflow-hidden rounded-full bg-cyan-200/10">
                                    <motion.div
                                      className="h-full rounded-full bg-gradient-to-r from-cyan-300/80 to-teal-300/80"
                                      style={{ width: `${Math.min(100, factor.value * 3)}%` }}
                                      animate={{ opacity: [0.7, 1, 0.7] }}
                                      transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                  </div>
                                </div>
                                <span className="text-[11px] font-semibold text-cyan-100">+{factor.value}%</span>
                              </div>
                            ))}
                          </div>
                          <div className="relative mt-3 h-3">
                            <div className="absolute inset-x-0 top-1.5 h-px bg-cyan-200/20" />
                            <span
                              className="absolute top-0 h-2 w-2 rounded-full bg-cyan-300/80 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                              style={{ animation: "particleFlow 6s linear infinite" }}
                            />
                          </div>
                          <div className="relative mt-4 h-10 overflow-hidden rounded-xl bg-[#0b1b34]">
                            <svg viewBox="0 0 200 40" className="h-full w-full" fill="none">
                              <path
                                d="M4 24 L24 26 L44 16 L64 22 L84 14 L104 20 L124 12 L144 22 L164 16 L184 20"
                                stroke="rgba(56,189,248,0.7)"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                            <div
                              className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
                              style={{ animation: "scanSweep 8.5s ease-in-out infinite" }}
                            />
                            <div
                              className="absolute right-4 top-3 h-2 w-2 rounded-full bg-cyan-300/90"
                              style={{ animation: "softPulse 2.4s ease-in-out infinite" }}
                            />
                          </div>
                        </div>
                      )}

                      <div
                        className={`mt-4 h-1 rounded-full bg-gradient-to-r from-cyan-300/70 to-teal-300/70 transition duration-300 group-hover:opacity-100 ${
                          isPriority ? "w-14 opacity-90" : "w-10 opacity-70"
                        }`}
                      />
                    </motion.div>
                  </motion.article>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {categoryBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-100"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <aside className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl md:p-8">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300/80" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-300" />
            </span>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">AI Clinical Decision Flow</p>
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-white">Enterprise-grade pipeline observability</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Real-time signal processing, explainability controls, and WHO-aligned validation combine into a premium
            clinical intelligence layer built for healthcare operations.
          </p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Live Telemetry</p>
              <span className="text-xs text-cyan-100" style={{ animation: "statusFlicker 3s ease-in-out infinite" }}>
                Streaming
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100">
              <span className="relative inline-flex h-3.5 w-3.5">
                <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500 shadow-[0_0_14px_rgba(251,113,133,0.35)]" />
              </span>
              Active Alert
            </div>
            <div className="relative mt-4 h-16 overflow-hidden rounded-xl bg-[#0b1b34]">
              <svg viewBox="0 0 280 64" className="h-full w-full" fill="none">
                <defs>
                  <linearGradient id="telemetry-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(34,211,238,0.25)" />
                    <stop offset="50%" stopColor="rgba(34,211,238,0.8)" />
                    <stop offset="100%" stopColor="rgba(45,212,191,0.35)" />
                  </linearGradient>
                </defs>
                <path
                  d="M8 40 L32 42 L52 28 L72 38 L92 22 L112 32 L132 20 L152 36 L172 26 L192 40 L212 30 L232 42 L252 34 L272 38"
                  stroke="url(#telemetry-line)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="10 12"
                  style={{ animation: "telemetryDash 6s linear infinite" }}
                />
                <path
                  d="M14 44 L24 44 L30 24 L36 50 L44 30 L52 44"
                  stroke="rgba(56,189,248,0.8)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <div
                className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent"
                style={{ animation: "scanSweep 7s ease-in-out infinite" }}
              />
              <div
                className="absolute right-6 top-4 h-2.5 w-2.5 rounded-full bg-cyan-300/90"
                style={{ animation: "softPulse 2.6s ease-in-out infinite" }}
              />
              <div className="absolute right-6 top-8 flex items-center gap-2 rounded-full bg-red-500/10 px-2.5 py-1">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-red-100">Activity</span>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {[
              { label: "Latency", value: "< 2.1s" },
              { label: "Explainability", value: "SHAP + Rules" },
              { label: "Coverage", value: "Bangla + English" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
              >
                <span>{item.label}</span>
                <span className="font-semibold text-cyan-100">{item.value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-20 h-28 bg-gradient-to-b from-[#071121] via-[#071121]/70 to-transparent blur-2xl" />
    </section>
  );
};

export default ArchitectureSection;
