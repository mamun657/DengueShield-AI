import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import heroHealthcareImage from "../assets/hero-healthcare.png";

const HeroSection = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const startCheckHref = user ? "/dashboard" : "/login";
  const trustBadges = [
    "WHO-Grade Guidance",
    "Enterprise AI Security",
    "Family-Centered Care",
    "Bangladesh Health Focus",
  ];

  return (
    <section
      id="features"
      className="relative min-h-screen overflow-hidden bg-[#061120] px-6 py-[120px] md:px-10 lg:px-14"
    >
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${heroHealthcareImage})`,
            backgroundPosition: "center right",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(2,6,23,0.96) 8%, rgba(2,6,23,0.82) 35%, rgba(2,6,23,0.52) 58%, rgba(2,6,23,0.18) 100%)",
          }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute -right-32 top-24 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-cyan-400/35 via-sky-400/10 to-teal-400/30 blur-3xl"
          animate={{ opacity: [0.25, 0.55, 0.25], x: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute -left-24 bottom-20 h-[22rem] w-[22rem] rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-teal-400/20 blur-3xl"
          animate={{ opacity: [0.2, 0.45, 0.2], y: [0, 24, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl items-center">
        <div className="grid w-full gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div
            className="max-w-[650px]"
            style={{ paddingLeft: "clamp(24px, 6vw, 96px)" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-flex w-fit items-center rounded-full border border-cyan-200/25 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 shadow-[0_0_24px_rgba(45,212,191,0.18)] backdrop-blur">
              {t("aiHealthProtection")}
            </span>

            <h1 className="mt-6 max-w-[580px] text-4xl font-semibold leading-tight text-slate-50 md:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              AI-Powered Dengue Detection Before Symptoms Become Critical
            </h1>

            <p className="mt-6 text-base leading-8 text-slate-200 md:text-lg">
              Bangladesh-first clinical intelligence built for families and care teams. Track daily symptoms,
              receive explainable risk alerts, and act early with WHO-grade recommendations guided by
              real-time AI monitoring.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 px-7 py-3.5 text-sm font-semibold text-[#05202f] shadow-[0_12px_32px_rgba(45,212,191,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_52px_rgba(45,212,191,0.6)]"
                to={startCheckHref}
              >
                Start Health Check
              </Link>
              <a
                className="rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-slate-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-[0_10px_30px_rgba(15,23,42,0.35)]"
                href="#how-it-works"
              >
                See How It Works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-slate-100 backdrop-blur"
                >
                  {badge}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative flex min-h-[420px] items-center justify-start lg:min-h-[520px] lg:justify-end"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          >
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

