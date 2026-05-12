const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getNearbyHospitals } = require("../controllers/hospitalController");

const router = express.Router();

router.get("/nearby", protect, getNearbyHospitals);

module.exports = router;
