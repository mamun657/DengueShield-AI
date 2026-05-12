const hospitals = require("../data/hospitals");
const { calculateDistance } = require("../utils/distance");

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

    // Calculate distance for all hospitals
    const hospitalsWithDistance = hospitals.map((hospital) => {
      const distance = calculateDistance(userLat, userLng, hospital.lat, hospital.lng);
      return {
        ...hospital,
        distanceKm: Number(distance.toFixed(2)),
        mapsUrl: `https://www.google.com/maps?q=${hospital.lat},${hospital.lng}`,
      };
    });

    // Sort by distance (nearest first)
    hospitalsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    // Return top 5 nearest hospitals
    const top5Hospitals = hospitalsWithDistance.slice(0, 5);

    return res.status(200).json({
      userLocation: { lat: userLat, lng: userLng },
      hospitals: top5Hospitals,
    });
  } catch (error) {
    console.error("Error finding nearby hospitals:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getNearbyHospitals };
