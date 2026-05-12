const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createReport, getMyReports, deleteReport, getAllHistory } = require("../controllers/reportController");

const router = express.Router();

router.post("/", protect, createReport);
router.get("/", protect, getMyReports);
router.get("/history", protect, getAllHistory);
router.delete("/:id", protect, deleteReport);

module.exports = router;
