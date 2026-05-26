const hospitals = require("../data/hospitals");
const { calculateDistance } = require("../utils/distance");

// Validate hospital data integrity
const validateHospitalData = (hospital) => {
  return (
    hospital &&
    hospital.name &&
    typeof hospital.name === 'string' &&
    hospital.name.trim().length > 0 &&
    typeof hospital.lat === 'number' &&
    typeof hospital.lng === 'number' &&
    !isNaN(hospital.lat) &&
    !isNaN(hospital.lng) &&
    hospital.lat >= -90 &&
    hospital.lat <= 90 &&
    hospital.lng >= -180 &&
    hospital.lng <= 180
  );
};

const getNearbyHospitals = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ message: "Invalid latitude or longitude" });
    }

    // Log user location
    console.log("🏥 Finding hospitals for user location:", { userLat, userLng });

    // Filter and validate hospital data
    const validHospitals = hospitals.filter((hospital) => {
      const isValid = validateHospitalData(hospital);
      if (!isValid) {
        console.warn("⚠️ Invalid hospital data:", hospital);
      }
      return isValid;
    });

    console.log(`✅ Valid hospitals count: ${validHospitals.length}/${hospitals.length}`);

    // Calculate distance for all hospitals
    const hospitalsWithDistance = validHospitals.map((hospital, idx) => {
      const distance = calculateDistance(userLat, userLng, hospital.lat, hospital.lng);
      const result = {
        ...hospital,
        distanceKm: Number(distance.toFixed(2)),
        distance: `${Number(distance.toFixed(1))} km`,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name)}`,
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`,
      };
      
      console.log(`📍 Hospital ${idx + 1}:`, {
        name: hospital.name,
        lat: hospital.lat,
        lng: hospital.lng,
        distance: result.distanceKm,
        address: hospital.address || "N/A"
      });
      
      return result;
    });

    // Sort by distance (nearest first)
    hospitalsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    // Return top 5 nearest hospitals
    const top5Hospitals = hospitalsWithDistance.slice(0, 5);

    console.log(`✅ Returning top 5 nearest hospitals`);

    return res.status(200).json({
      userLocation: { lat: userLat, lng: userLng },
      hospitals: top5Hospitals,
    });
  } catch (error) {
    console.error("❌ Error finding nearby hospitals:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getNearbyHospitals };
