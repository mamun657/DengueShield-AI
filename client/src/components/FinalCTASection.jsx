import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const FinalCTASection = () => {
  const { user } = useAuth();
  const startCheckHref = user ? "/dashboard" : "/login";

  return (
    <section className="relative overflow-hidden bg-[#08162a] px-6 py-20 md:px-10 lg:px-14">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-24 top-6 h-[22rem] w-[22rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-[26rem] w-[26rem] rounded-full bg-teal-400/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl rounded-[34px] border border-white/10 bg-gradient-to-r from-[#0f2039] via-[#102a3f] to-[#0f2237] p-8 shadow-[0_24px_60px_rgba(2,6,23,0.45)] md:p-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-200">Clinical Readiness</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              Bring WHO-grade dengue intelligence to every family and clinic
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              DengueShield AI delivers explainable risk detection, bilingual guidance, and proactive monitoring in one
              premium clinical platform designed for real-world healthcare operations.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to={startCheckHref}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 px-6 py-3 text-sm font-semibold text-[#05202f] shadow-[0_12px_32px_rgba(45,212,191,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_52px_rgba(45,212,191,0.55)]"
              >
                Start Clinical Assessment
              </Link>
              <a
                href="#contact"
                className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-1 hover:bg-white/20"
              >
                Request Demo
              </a>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Clinical Outcomes</p>
            <div className="mt-4 grid gap-3">
              {[
                "Early warning detection in days 3-7",
                "Explainable, clinician-readable risk signals",
                "Bilingual family-ready guidance",
                "WHO-aligned escalation pathways",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
