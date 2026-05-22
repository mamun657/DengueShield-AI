import { useState } from "react";
import {
  HYDRATION_GUIDANCE,
  WHO_EMERGENCY_SIGNS,
  ESCALATION_RULES,
  PREGNANCY_GUIDANCE,
  PEDIATRIC_GUIDANCE,
} from "../../offline-guidance/whoGuidanceData";
import { DISTRICTS, searchHospitals } from "../../offline/hospitalsData";

const AccordionItem = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="clinical-text border-b border-white/5 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 py-3.5 text-left text-sm font-medium text-slate-100 transition hover:text-white"
      >
        <span>{open ? "▼" : "▶"} {title}</span>
      </button>
      {open && <div className="clinical-text pb-4 text-sm text-slate-300">{children}</div>}
    </div>
  );
};

const GuidanceAccordion = () => {
  const [hospitalQuery, setHospitalQuery] = useState("");
  const [district, setDistrict] = useState("");
  const hospitals = searchHospitals(hospitalQuery, district).slice(0, 12);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:p-5">
      <h3 className="text-base font-semibold text-white">Health guide</h3>
      <p className="mt-1 text-xs text-slate-400">Tap to expand · works offline</p>

      <div className="mt-3 divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-950/50 px-3">
        <AccordionItem title="⚠ Emergency signs">
          <ul className="space-y-1.5">
            {WHO_EMERGENCY_SIGNS.map((s) => (
              <li key={s.id}>• {s.label}</li>
            ))}
          </ul>
        </AccordionItem>

        <AccordionItem title="💧 Fluid guidance">
          {HYDRATION_GUIDANCE.sections.map((block) => (
            <div key={block.heading} className="mb-3">
              <p className="text-xs font-medium text-cyan-300/90">{block.heading}</p>
              <ul className="mt-1 space-y-1">
                {block.points.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </AccordionItem>

        <AccordionItem title="🤰 Pregnancy safety">
          <ul className="space-y-1.5">
            {PREGNANCY_GUIDANCE.points.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </AccordionItem>

        <AccordionItem title="👶 Child safety tips">
          <ul className="space-y-1.5">
            {PEDIATRIC_GUIDANCE.points.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </AccordionItem>

        <AccordionItem title="⚠ When to go hospital">
          <ul className="space-y-2">
            {ESCALATION_RULES.map((r) => (
              <li key={r.trigger}>
                <span className="text-slate-200">{r.trigger}</span>
                <br />
                <span className="text-cyan-200/90">→ {r.action}</span>
              </li>
            ))}
          </ul>
        </AccordionItem>

        <AccordionItem title="🏥 Offline hospitals">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              placeholder="Search…"
              value={hospitalQuery}
              onChange={(e) => setHospitalQuery(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="">All districts</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {hospitals.map((h) => (
              <li
                key={h.name}
                className="rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2"
              >
                <p className="font-medium text-slate-100">{h.name}</p>
                <p className="text-xs text-slate-400">
                  {h.district}
                  {h.emergency && <span className="ml-2 text-teal-300">☎ {h.emergency}</span>}
                </p>
              </li>
            ))}
          </ul>
        </AccordionItem>
      </div>
    </section>
  );
};

export default GuidanceAccordion;
