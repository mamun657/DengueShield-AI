const getPublicBaseUrl = (req) => {
  const configured =
    process.env.API_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_API_URL;

  if (configured) {
    return String(configured).replace(/\/$/, "").replace(/\/api$/i, "");
  }

  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`.replace(/\/$/, "");
};

const toStoredPhotoPath = (filename) => `/uploads/${filename}`;

const resolvePhotoUrl = (req, photoUrl) => {
  if (!photoUrl) return "";

  if (/^https?:\/\//i.test(photoUrl)) {
    try {
      const parsed = new URL(photoUrl);
      if (parsed.pathname.startsWith("/uploads/")) {
        return `${getPublicBaseUrl(req)}${parsed.pathname}`;
      }
    } catch {
      return photoUrl;
    }
    return photoUrl;
  }

  const normalized = photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`;
  if (normalized.startsWith("/uploads/")) {
    return `${getPublicBaseUrl(req)}${normalized}`;
  }

  return photoUrl;
};

module.exports = {
  getPublicBaseUrl,
  toStoredPhotoPath,
  resolvePhotoUrl,
};
