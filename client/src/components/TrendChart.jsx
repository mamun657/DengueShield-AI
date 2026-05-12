import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useTranslation } from "react-i18next";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const toFahrenheit = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric <= 45 ? (numeric * 9) / 5 + 32 : numeric;
};

const formatTemperatureLabel = (value) => `${Math.round(value)}°F`;

const TrendChart = ({ trend = [], records = [] }) => {
  const { t, i18n } = useTranslation();
  const source = records.length > 0 ? records : trend;
  const labels = source.map((item) =>
    new Date(item.date).toLocaleDateString(i18n.language === "bn" ? "bn-BD" : "en-US")
  );
  const riskSeries = source.map((item) => item.risk_score ?? item.riskScore ?? 0);
  const smoothedRisk = riskSeries.map((value, index, array) =>
    index === 0 ? value : (array[index - 1] + value) / 2
  );
  const data = {
    labels,
    datasets: [
      {
        label: t("temperature"),
        data: source.map((item) => toFahrenheit(item.temperature)),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        tension: 0.35,
      },
      {
        label: t("riskScore"),
        data: smoothedRisk,
        borderColor: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.15)",
        tension: 0.35,
      },
    ],
  };
  const options = {
    plugins: {
      legend: {
        labels: { color: "#e2e8f0" },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            if (label === t("temperature")) {
              return `${label}: ${formatTemperatureLabel(value)}`;
            }
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8" },
        grid: { color: "rgba(148, 163, 184, 0.1)" },
      },
      y: {
        ticks: { color: "#94a3b8" },
        grid: { color: "rgba(148, 163, 184, 0.1)" },
      },
    },
  };
  return <Line data={data} options={options} />;
};

export default TrendChart;
