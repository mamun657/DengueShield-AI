import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import TrendChart from "../components/TrendChart";

const AdminPage = () => {
  const { t } = useTranslation();
  const [overview, setOverview] = useState({ usersCount: 0, recordsCount: 0, highRiskPatients: [], analytics: [] });
  const translateRiskLevel = (level) => t(`riskLevel${level}`, { defaultValue: level });

  useEffect(() => {
    api.get("/admin/overview").then((res) => setOverview(res.data));
  }, []);

  const cardClass = "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:bg-white/10";

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <h1 className="text-3xl font-semibold text-white">{t("adminPanel")}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cardClass}>{t("totalUsers")}: <span className="text-white">{overview.usersCount}</span></div>
        <div className={cardClass}>{t("totalRecords")}: <span className="text-white">{overview.recordsCount}</span></div>
      </div>
      <section className={cardClass}>
        <h2 className="mb-2 text-xl font-semibold text-white">{t("highRiskPatients")}</h2>
        <ul className="space-y-1 text-sm text-gray-300">
          {overview.highRiskPatients.map((r) => (
            <li key={r._id}>{r.user?.name} - {translateRiskLevel(r.computed.riskLevel)} ({r.computed.riskScore})</li>
          ))}
        </ul>
      </section>
      <section className={cardClass}>
        <h2 className="mb-2 text-xl font-semibold text-white">{t("analytics")}</h2>
        <TrendChart trend={overview.analytics.map((a) => ({ ...a, temperature: a.riskScore }))} />
      </section>
    </div>
  );
};

export default AdminPage;
