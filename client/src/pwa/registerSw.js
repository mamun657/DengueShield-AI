import { registerSW } from "virtual:pwa-register";

export const registerServiceWorker = () => {
  if (import.meta.env.DEV) return null;

  const updateSW = registerSW({
    immediate: true,
    onRegistered(registration) {
      console.info("[PWA] Service worker registered", registration?.scope);
    },
    onRegisterError(error) {
      console.error("[PWA] Service worker registration failed", error);
    },
    onOfflineReady() {
      console.info("[PWA] App ready for offline use");
    },
    onNeedRefresh() {
      if (window.confirm("New version available. Reload to update?")) {
        updateSW(true);
      }
    },
  });

  return updateSW;
};

export default registerServiceWorker;
