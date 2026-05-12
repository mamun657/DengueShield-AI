const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getUserProfile, updateUserProfile, getUserReports } = require("../controllers/userController");

const router = express.Router();

router.route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route("/reports")
  .get(protect, getUserReports);

module.exports = router;
