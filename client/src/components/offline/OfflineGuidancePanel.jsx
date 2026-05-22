import { useMemo, useState } from "react";
import {
  OFFLINE_GUIDANCE_SECTIONS,
  searchGuidance,
  WHO_EMERGENCY_SIGNS,
} from "../../offline-guidance/whoGuidanceData";

const OfflineGuidancePanel = () => {
  const [query, setQuery] = useState("");
  const sections = useMemo(() => searchGuidance(query), [query]);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400/80">WHO Guidance</p>
          <h3 className="text-lg font-semibold text-white">Offline Clinical Reference</h3>
          <p className="text-sm text-slate-400">Available without internet · searchable</p>
        </div>
        <input
          type="search"
          placeholder="Search guidance…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4">
          <p className="text-sm font-semibold text-red-200">Emergency warning signs</p>
          <ul className="mt-2 space-y-1 text-sm text-red-100/90">
            {WHO_EMERGENCY_SIGNS.map((s) => (
              <li key={s.id} className="flex gap-2">
                <span className="text-red-400">•</span>
                {s.label}
              </li>
            ))}
          </ul>
        </div>

        {sections.map((section) => (
          <div
            key={section.id}
            className="rounded-xl border border-white/10 bg-slate-900/50 p-4"
          >
            <p className="font-semibold text-slate-100">{section.title}</p>
            {section.sections?.map((block) => (
              <div key={block.heading} className="mt-3">
                <p className="text-xs font-medium uppercase text-cyan-300/80">{block.heading}</p>
                <ul className="mt-1 space-y-1 text-sm text-slate-300">
                  {block.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-cyan-500">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {section.points?.map((p) => (
              <p key={p} className="mt-2 text-sm text-slate-300">
                • {p}
              </p>
            ))}
            {section.items?.map((item) => (
              <p key={item.id || item.trigger} className="mt-2 text-sm text-slate-300">
                • {item.label || item.trigger}: {item.action}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

export default OfflineGuidancePanel;
