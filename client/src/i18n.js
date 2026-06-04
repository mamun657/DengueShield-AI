import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./translations/en.json";
import bn from "./translations/bn.json";

const STORAGE_KEY = "dengue_lang";

const savedLanguage =
  typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, bn: { translation: bn } },
  lng: savedLanguage === "bn" ? "bn" : "en",
  fallbackLng: "en",
  supportedLngs: ["en", "bn"],
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
  react: {
    useSuspense: false,
    bindI18n: "languageChanged loaded",
    bindI18nStore: "added removed",
  },
});

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lng);
  }
});

export default i18n;
