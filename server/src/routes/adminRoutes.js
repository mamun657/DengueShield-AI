const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAdminOverview,
  getAdminAlerts,
  getCriticalPatientAlerts,
  resolveCriticalPatientAlert,
  getAllUsers,
  getAllHealthRecords,
  updateUserByAdmin,
  deleteUserByAdmin,
  resetMonitoringByAdmin,
  updateRecordByAdmin,
  deleteRecordByAdmin,
  flagRecordCritical,
  markRecordRecovered,
} = require("../controllers/adminController");

const router = express.Router();

router.get("/overview", protect, authorize("admin"), getAdminOverview);
router.get("/alerts", protect, authorize("admin"), getAdminAlerts);
router.get("/critical-patients", protect, authorize("admin"), getCriticalPatientAlerts);
router.patch(
  "/critical-patients/:id/resolve",
  protect,
  authorize("admin"),
  resolveCriticalPatientAlert
);
router.get("/users", protect, authorize("admin"), getAllUsers);
router.get("/records", protect, authorize("admin"), getAllHealthRecords);
router.patch("/users/:id", protect, authorize("admin"), updateUserByAdmin);
router.delete("/users/:id", protect, authorize("admin"), deleteUserByAdmin);
router.post("/users/:id/reset-monitoring", protect, authorize("admin"), resetMonitoringByAdmin);
router.patch("/records/:id", protect, authorize("admin"), updateRecordByAdmin);
router.delete("/records/:id", protect, authorize("admin"), deleteRecordByAdmin);
router.post("/records/:id/flag-critical", protect, authorize("admin"), flagRecordCritical);
router.post("/records/:id/mark-recovered", protect, authorize("admin"), markRecordRecovered);

module.exports = router;
