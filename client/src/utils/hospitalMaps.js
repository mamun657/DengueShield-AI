/**
 * Google Maps URLs for hospital navigation.
 */
export const buildHospitalMapsUrls = (hospital) => {
  const lat = Number(hospital?.lat);
  const lng = Number(hospital?.lng);
  const name = encodeURIComponent(hospital?.name || "Hospital");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${name}`,
      directionsUrl: null,
    };
  }

  return {
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${name},${lat},${lng}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  };
};

export const enrichHospitalRecord = (hospital) => {
  const { mapsUrl, directionsUrl } = buildHospitalMapsUrls(hospital);
  const distanceKm = hospital.distanceKm ?? hospital.distance_km;
  return {
    ...hospital,
    mapsUrl: hospital.mapsUrl || mapsUrl,
    directionsUrl: hospital.directionsUrl || directionsUrl,
    distance:
      hospital.distance ||
      (distanceKm != null ? `${Number(distanceKm).toFixed(1)} km` : null),
    distanceKm: distanceKm != null ? Number(distanceKm) : hospital.distanceKm,
  };
};
