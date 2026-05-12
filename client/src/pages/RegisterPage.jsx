import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/register", form);
      login(data);
      navigate("/dashboard");
    } catch (err) {
      const message = err?.response?.data?.message || "Registration failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:bg-white/10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">{t("createAccount")}</h1>
          <p className="mt-1 text-sm text-gray-300">{t("registerSubtitle")}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-300">
              {t("name")}
            </label>
            <input
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-300">
              {t("email")}
            </label>
            <input
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-300">
              {t("password")}
            </label>
            <input
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              placeholder={t("createPassword")}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <button
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("creating") : t("createAccountButton")}
          </button>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </form>
        <p className="mt-6 text-sm text-gray-300">
          {t("alreadyHaveAccount")} <Link className="text-blue-300 hover:text-blue-200" to="/login">{t("login")}</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
