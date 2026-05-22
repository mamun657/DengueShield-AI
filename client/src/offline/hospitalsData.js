/**
 * Offline hospital directory — Bangladesh dengue-capable facilities.
 */

const withDistrict = (hospital) => {
  const name = hospital.name.toLowerCase();
  let district = hospital.district || "Dhaka";
  if (name.includes("chittagong") || name.includes("chattogram")) district = "Chittagong";
  else if (name.includes("sylhet")) district = "Sylhet";
  else if (name.includes("rajshahi")) district = "Rajshahi";
  else if (name.includes("khulna")) district = "Khulna";
  else if (name.includes("barisal")) district = "Barisal";
  else if (name.includes("rangpur")) district = "Rangpur";
  else if (name.includes("mymensingh")) district = "Mymensingh";
  return { ...hospital, district };
};

const RAW_HOSPITALS = [
  { name: "Dhaka Medical College Hospital (DMCH)", lat: 23.7261, lng: 90.3976, type: "medical_college", emergency: "+880-2-9661551" },
  { name: "Square Hospitals Ltd.", lat: 23.7533, lng: 90.3815, type: "private", emergency: "+880-10666-155555" },
  { name: "United Hospital Limited", lat: 23.8052, lng: 90.4158, type: "private", emergency: "+880-10666-106000" },
  { name: "Evercare Hospital Dhaka", lat: 23.8105, lng: 90.4312, type: "private", emergency: "+880-10678-464464" },
  { name: "Labaid Specialized Hospital", lat: 23.7417, lng: 90.3833, type: "private", emergency: "+880-10666-106666" },
  { name: "Ibn Sina Hospital", lat: 23.7508, lng: 90.3705, type: "private", emergency: "+880-96100-01010" },
  { name: "BIRDEM General Hospital", lat: 23.7389, lng: 90.3956, type: "specialized", emergency: "+880-2-9661551" },
  { name: "Kurmitola General Hospital", lat: 23.8189, lng: 90.4042, type: "general", emergency: "+880-2-55001234" },
  { name: "Sir Salimullah Medical College Hospital", lat: 23.7126, lng: 90.3986, type: "medical_college", emergency: "+880-2-7320081" },
  { name: "Holy Family Red Crescent Medical College", lat: 23.7455, lng: 90.4025, type: "medical_college", emergency: "+880-2-7122247" },
  { name: "Bangladesh Specialized Hospital", lat: 23.7716, lng: 90.3663, type: "private", emergency: "+880-10666-106666" },
  { name: "Shaheed Suhrawardy Medical College", lat: 23.7634, lng: 90.3734, type: "medical_college", emergency: "+880-2-58156080" },
  { name: "Mugda Medical College and Hospital", lat: 23.7335, lng: 90.4284, type: "medical_college", emergency: "+880-2-7219201" },
  { name: "Dhaka Shishu (Children) Hospital", lat: 23.7725, lng: 90.3686, type: "pediatric", emergency: "+880-2-9111509" },
  { name: "Chittagong Medical College Hospital", lat: 22.3614, lng: 91.8315, type: "medical_college", emergency: "+880-31-619900" },
  { name: "Evercare Hospital Chattogram", lat: 22.3853, lng: 91.8102, type: "private", emergency: "+880-10678-464464" },
  { name: "Max Hospital & Diagnostics", lat: 22.3591, lng: 91.8213, type: "private", emergency: "+880-31-2850000" },
  { name: "Sylhet MAG Osmani Medical College", lat: 24.9015, lng: 91.8541, type: "medical_college", emergency: "+880-821-716537" },
  { name: "Mount Adora Hospital", lat: 24.8973, lng: 91.8672, type: "private", emergency: "+880-821-725666" },
  { name: "Rajshahi Medical College Hospital", lat: 24.3721, lng: 88.5866, type: "medical_college", emergency: "+880-721-774001" },
  { name: "Khulna Medical College Hospital", lat: 22.8256, lng: 89.5312, type: "medical_college", emergency: "+880-41-760300" },
  { name: "Sher-e-Bangla Medical College Hospital", lat: 22.6874, lng: 90.3523, type: "medical_college", emergency: "+880-431-2850123" },
  { name: "Rangpur Medical College Hospital", lat: 25.7601, lng: 89.2425, type: "medical_college", emergency: "+880-521-63251" },
  { name: "Mymensingh Medical College Hospital", lat: 24.7423, lng: 90.4075, type: "medical_college", emergency: "+880-91-66700" },
];

export const OFFLINE_HOSPITALS = RAW_HOSPITALS.map(withDistrict);

export const DISTRICTS = [...new Set(OFFLINE_HOSPITALS.map((h) => h.district))].sort();

export const searchHospitals = (query, districtFilter = "") => {
  const q = String(query || "").toLowerCase().trim();
  return OFFLINE_HOSPITALS.filter((h) => {
    if (districtFilter && h.district !== districtFilter) return false;
    if (!q) return true;
    return (
      h.name.toLowerCase().includes(q) ||
      h.district.toLowerCase().includes(q) ||
      h.type.toLowerCase().includes(q)
    );
  });
};

export const getHospitalsByDistrict = (district) =>
  OFFLINE_HOSPITALS.filter((h) => h.district === district);

export const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const withMapsUrls = (h, distanceKm) => {
  const lat = h.lat;
  const lng = h.lng;
  const name = encodeURIComponent(h.name);
  const distance =
    distanceKm != null ? `${Number(distanceKm).toFixed(1)} km` : "—";
  return {
    ...h,
    distanceKm: distanceKm ?? null,
    distance,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${name},${lat},${lng}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  };
};

export const getNearestHospitals = (lat, lng, limit = 5) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return OFFLINE_HOSPITALS.slice(0, limit).map((h) =>
      withMapsUrls(h, null)
    );
  }
  return OFFLINE_HOSPITALS.map((h) => ({
    ...withMapsUrls(h, haversineKm(lat, lng, h.lat, h.lng)),
  }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
};

export default OFFLINE_HOSPITALS;
