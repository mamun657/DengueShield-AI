/** Nav-critical labels — used when i18n bundle is not ready yet. */
export const NAV_LABELS = {
  en: {
    appName: "DengueShield AI",
    langToggle: "বাংলা",
    dashboard: "Dashboard",
    admin: "Admin",
    logout: "Logout",
    login: "Login",
    aiHealthProtection: "AI HEALTH PROTECTION",
  },
  bn: {
    appName: "ডেঙ্গুশিল্ড এআই",
    langToggle: "English",
    dashboard: "ড্যাশবোর্ড",
    admin: "অ্যাডমিন",
    logout: "লগআউট",
    login: "লগইন",
    aiHealthProtection: "এআই স্বাস্থ্য সুরক্ষা",
  },
};

export const getNavLang = (language) => {
  const lng = String(language || "en").split("-")[0].toLowerCase();
  return lng === "bn" ? "bn" : "en";
};

export const navLabel = (key, language) => {
  const lng = getNavLang(language);
  return NAV_LABELS[lng]?.[key] || NAV_LABELS.en[key] || key;
};

/** Prefer i18n translation; fall back to bundled nav labels if key is returned untranslated. */
export const resolveT = (t, key, language) => {
  const translated = t(key, { defaultValue: navLabel(key, language) });
  if (translated && translated !== key) return translated;
  return navLabel(key, language);
};
