import { useState } from "react";
import { useTranslation } from "react-i18next";

const symptomOptions = [
  "headache",
  "body pain",
  "vomiting",
  "abdominal pain",
  "bleeding",
  "fatigue",
  "rash",
  "eye pain",
  "appetite loss",
  "restlessness",
];

const SymptomForm = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    temperature: "",
    dayOfIllness: "",
    fluidIntakeLiters: "",
    plateletCount: "",
    pregnancyStatus: false,
    symptoms: [],
  });

  const toggleSymptom = (symptom) => {
    setForm((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm text-gray-300">
          <span>{t("temperature")}</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            type="number"
            step="0.1"
            placeholder={t("temperature")}
            onChange={(e) => setForm({ ...form, temperature: e.target.value })}
          />
        </label>
        <label className="space-y-2 text-sm text-gray-300">
          <span>{t("dayOfIllness")}</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            type="number"
            placeholder={t("dayOfIllness")}
            onChange={(e) => setForm({ ...form, dayOfIllness: e.target.value })}
          />
        </label>
        <label className="space-y-2 text-sm text-gray-300">
          <span>{t("fluidIntake")}</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            type="number"
            step="0.1"
            placeholder={t("fluidIntake")}
            onChange={(e) => setForm({ ...form, fluidIntakeLiters: e.target.value })}
          />
        </label>
        <label className="space-y-2 text-sm text-gray-300">
          <span>Platelet count (optional, offline/CBC)</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            type="number"
            placeholder="e.g. 85000"
            onChange={(e) => setForm({ ...form, plateletCount: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-gray-300">
          <input
            type="checkbox"
            className="accent-blue-600"
            checked={form.pregnancyStatus}
            onChange={(e) => setForm({ ...form, pregnancyStatus: e.target.checked })}
          />
          {t("pregnancyStatus")}
        </label>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-gray-300">{t("symptoms")}</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {symptomOptions.map((symptom) => (
          <label key={symptom} className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-gray-300">
            <input type="checkbox" className="accent-blue-600" onChange={() => toggleSymptom(symptom)} />
            {t(`symptom.${symptom}`, { defaultValue: symptom })}
          </label>
        ))}
        </div>
      </div>
      <button
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        type="submit"
      >
        {t("saveRecord")}
      </button>
    </form>
  );
};

export default SymptomForm;
