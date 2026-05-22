import { Link } from "react-router-dom";

const OfflineFallbackPage = () => (
  <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
    <div className="max-w-md rounded-2xl border border-amber-500/30 bg-amber-950/30 p-8">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-300">No connection</p>
      <h1 className="mt-3 text-2xl font-semibold text-white">You are offline</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        DengueShield AI is running in offline telehealth mode. Cached pages, WHO guidance,
        symptom tracking, and local risk estimates remain available.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/dashboard"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Open Dashboard
        </Link>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          Retry connection
        </button>
      </div>
    </div>
  </div>
);

export default OfflineFallbackPage;
