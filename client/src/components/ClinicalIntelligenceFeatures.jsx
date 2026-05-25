import whyImage from "../assets/why.png";
import why1Image from "../assets/why1.png";
import why2Image from "../assets/why2.png";

const storySections = [
  {
    key: "doctor-report",
    title: "Explainable AI Doctor Reports for Early Clinical Action",
    description:
      "DengueShield AI transforms symptom patterns into WHO-aligned clinical intelligence reports with bilingual recommendations, emergency guidance, and transparent risk reasoning.",
    bullets: [
      "WHO-aligned medical guidance",
      "Bangla + English clinical recommendations",
      "Explainable risk scoring",
      "Emergency escalation alerts",
      "AI-generated physician-style summaries",
    ],
    badges: ["Explainable AI", "WHO-aligned", "Clinical Intelligence", "Bengali Healthcare"],
    cta: "View Clinical Assessment",
    visualLabel: "AI Clinical Report Engine",
    layout: "text-left",
    variant: "report",
  },
  {
    key: "rash-detection",
    title: "Computer Vision Rash Analysis with Explainable Attention Mapping",
    description:
      "AI-powered rash screening uses explainable computer vision and GradCAM overlays to support early dengue risk assessment.",
    bullets: [
      "AI rash image analysis",
      "GradCAM explainability overlays",
      "Visual attention mapping",
      "Risk-focused detection",
      "Upload from mobile camera",
    ],
    badges: ["Computer Vision", "Explainable AI", "GradCAM", "Mobile-first"],
    cta: "Analyze Rash Image",
    visualLabel: "AI Vision Screening",
    layout: "text-right",
    variant: "vision",
  },
  {
    key: "smart-doctor",
    title: "Smart Doctor Assistant in Bangla and English",
    description:
      "Families can interact with DengueShield AI through voice and multilingual chat to receive symptom guidance, prevention advice, and clinical recommendations.",
    bullets: [
      "Bangla voice interaction",
      "English clinical guidance",
      "Symptom discussion support",
      "Family-centered healthcare assistance",
      "Real-time conversational AI",
    ],
    badges: ["Voice AI", "Bangla-first", "Family Care", "Conversational Intelligence"],
    cta: "Talk to Smart Doctor",
    visualLabel: "Conversational Clinical AI",
    layout: "text-left",
    variant: "chat",
  },
];

const ClinicalIntelligenceFeatures = () => {
  const IntelligenceIcon = () => (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4m-2-2h4" />
      <path d="M8 6c-1.5 1.5-2 3-2 6s.5 4.5 2 6m8-12c1.5 1.5 2 3 2 6s-.5 4.5-2 6" />
    </svg>
  );

  return (
    <section id="clinical-intelligence" className="relative overflow-hidden bg-[#071324] px-6 py-24 md:px-10 lg:px-14">
      <style>{`
        @keyframes softFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes scanLine {
          0% { transform: translateX(-120%); opacity: 0; }
          20% { opacity: 0.5; }
          80% { opacity: 0.5; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes pulseRing {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes waveform {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -120; }
        }
        @keyframes gridShift {
          0% { background-position: 0 0; }
          100% { background-position: 120px 120px; }
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 top-16 h-[24rem] w-[24rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-[28rem] w-[28rem] rounded-full bg-teal-400/15 blur-3xl" />
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            key={`ambient-${index}`}
            className="absolute h-1.5 w-1.5 rounded-full bg-cyan-200/30 shadow-[0_0_8px_rgba(56,189,248,0.35)]"
            style={{
              left: `${12 + index * 13}%`,
              top: `${10 + (index % 3) * 28}%`,
              animation: `softFloat ${10 + index}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl space-y-24 font-[Manrope]">
        {storySections.map((section) => {
          const isTextLeft = section.layout === "text-left";
          const textColumn = (
            <div className="space-y-6">
              <span className="relative inline-flex w-fit items-center rounded-full border border-cyan-200/25 bg-cyan-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                <IntelligenceIcon />
                <span className="ml-2">Clinical Intelligence</span>
                <span className="absolute -right-2 -top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#071324]" />
              </span>
              <h2 className="text-3xl font-semibold text-white md:text-4xl">{section.title}</h2>
              <p className="text-sm leading-7 text-slate-300 md:text-base">{section.description}</p>

              <ul className="grid gap-2 sm:grid-cols-2">
                {section.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                {section.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-100"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <button className="rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 px-6 py-3 text-sm font-semibold text-[#05202f] shadow-[0_12px_32px_rgba(45,212,191,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_52px_rgba(45,212,191,0.55)]">
                {section.cta}
              </button>
            </div>
          );

          const visualColumn = (
            <div className="relative">
              <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-cyan-300/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
                <div
                  className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  style={{ animation: "scanLine 10s linear infinite" }}
                />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{section.visualLabel}</p>
                    <span className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                      Active
                    </span>
                  </div>

                  {section.variant === "report" && (
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/20 shadow-[0_20px_60px_rgba(6,182,212,0.12)] backdrop-blur-sm bg-gradient-to-br from-white/10 via-white/5 to-transparent">
                        <img
                          src={whyImage}
                          alt="AI clinical intelligence dashboard"
                          className="w-full h-auto object-cover transition-transform duration-700 ease-out hover:scale-[1.015]"
                        />
                      </div>
                    </div>
                  )}

                  {section.variant === "vision" && (
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/20 shadow-[0_20px_60px_rgba(6,182,212,0.12)] backdrop-blur-sm bg-gradient-to-br from-white/10 via-white/5 to-transparent">
                        <img
                          src={why1Image}
                          alt="AI vision screening dashboard"
                          className="w-full h-auto object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
                        />
                      </div>
                    </div>
                  )}

                  {section.variant === "chat" && (
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/20 shadow-[0_20px_60px_rgba(6,182,212,0.12)] backdrop-blur-sm bg-gradient-to-br from-white/10 via-white/5 to-transparent">
                        <img
                          src={why2Image}
                          alt="AI assistant dashboard"
                          className="w-full h-auto object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
                        />
                      </div>
                    </div>
                  )}

                  {section.variant === "monitor" && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Risk Progression</p>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cyan-200/10">
                          <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-cyan-300/80 to-teal-300/80" />
                        </div>
                      </div>
                      <div
                        className="relative overflow-hidden rounded-2xl border border-cyan-200/20 bg-gradient-to-r from-[#0b1b34] via-[#0f2240] to-[#0b1b34] p-2.5"
                        style={{
                          boxShadow:
                            "inset 0 0 18px rgba(8,47,73,0.65), 0 0 18px rgba(34,211,238,0.12)",
                        }}
                      >
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent"
                          style={{ animation: "scanLine 9s ease-in-out infinite" }}
                        />
                        <div className="relative h-[80px] w-full rounded-2xl bg-slate-800 opacity-80" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-teal-300" />
                        Live monitoring alert stream
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );

          return (
            <div
              key={section.key}
              className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]"
            >
              {isTextLeft ? (
                <>
                  {textColumn}
                  {visualColumn}
                </>
              ) : (
                <>
                  {visualColumn}
                  {textColumn}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-20 h-28 bg-gradient-to-b from-[#071324] via-[#071324]/70 to-transparent blur-2xl" />
    </section>
  );
};

export default ClinicalIntelligenceFeatures;
