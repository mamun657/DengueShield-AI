import { enrichHospitalRecord } from "../../utils/hospitalMaps";

const openMaps = (hospital, mode = "directions") => {
  const enriched = enrichHospitalRecord(hospital);
  const url =
    mode === "search"
      ? enriched.mapsUrl
      : enriched.directionsUrl || enriched.mapsUrl;
  if (url) window.open(url, "_blank", "noopener,noreferrer");
};

const CompactHospitalSection = ({ hospitals = [], onFindNearby, loading }) => {
  const showList = hospitals.length > 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">🏥 Nearby hospitals</h2>
        <button
          type="button"
          onClick={onFindNearby}
          disabled={loading}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] disabled:opacity-50"
        >
          {loading ? "Finding…" : "Find nearby"}
        </button>
      </div>

      {!showList && (
        <p className="mt-3 text-sm text-slate-400">
          Tap find nearby to see hospitals with distance and Google Maps directions.
        </p>
      )}

      {showList && (
        <ul className="mt-4 space-y-3">
          {hospitals.slice(0, 5).map((raw) => {
            const h = enrichHospitalRecord(raw);
            return (
              <li
                key={h.name}
                className="clinical-text group rounded-xl border border-white/10 bg-slate-950/70 p-4 transition hover:border-cyan-500/30 hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-start gap-2 font-medium text-slate-100">
                      <span className="text-cyan-400" aria-hidden>
                        📍
                      </span>
                      <span className="break-words">{h.name}</span>
                    </p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {h.district || "—"}
                      {h.distance ? ` · ${h.distance}` : ""}
                      {h.distanceKm != null && !h.distance
                        ? ` · ${h.distanceKm} km`
                        : ""}
                    </p>
                    {h.emergency && (
                      <p className="mt-1 text-xs text-teal-300">
                        Emergency: {h.emergency}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openMaps(h, "directions")}
                    className="shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition group-hover:bg-cyan-500/20 hover:text-white"
                  >
                    Open in Maps
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default CompactHospitalSection;
