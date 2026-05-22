import { useMemo, useState } from "react";
import { DISTRICTS, searchHospitals } from "../../offline/hospitalsData";

const OfflineHospitalDirectory = () => {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");

  const hospitals = useMemo(
    () => searchHospitals(query, district),
    [query, district]
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-teal-400/80">Emergency facilities</p>
      <h3 className="text-lg font-semibold text-white">Offline Hospital Directory</h3>
      <p className="text-sm text-slate-400">Search by name or district — no internet required</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search hospitals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

      <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
        {hospitals.slice(0, 20).map((h) => (
          <li
            key={h.name}
            className="rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2 text-sm"
          >
            <p className="font-medium text-slate-100">{h.name}</p>
            <p className="text-xs text-slate-400">
              {h.district} · {h.type.replace(/_/g, " ")}
              {h.emergency && (
                <span className="ml-2 text-teal-300">☎ {h.emergency}</span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default OfflineHospitalDirectory;
