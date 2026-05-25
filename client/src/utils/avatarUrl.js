import { API_BASE_URL } from "../config/apiBase";

export const getApiOrigin = () => API_BASE_URL.replace(/\/api\/?$/i, "");

export const resolveAvatarUrl = (photoUrl) => {
  if (!photoUrl) return "";

  if (/^https?:\/\//i.test(photoUrl)) {
    try {
      const parsed = new URL(photoUrl);
      if (parsed.pathname.startsWith("/uploads/")) {
        const resolved = `${getApiOrigin()}${parsed.pathname}`;
        console.log("[Avatar] remapped absolute URL to API origin", {
          input: photoUrl,
          output: resolved,
        });
        return resolved;
      }
    } catch {
      return photoUrl;
    }
    return photoUrl;
  }

  const path = photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`;
  const resolved = `${getApiOrigin()}${path}`;
  console.log("[Avatar] resolved relative URL", { input: photoUrl, output: resolved });
  return resolved;
};
