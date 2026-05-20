const express = require("express");
const { analyze, getGraph, health, seed } = require("../controllers/graphRagController");
const { validateAnalyze } = require("../middleware/validateGraphRag");

const router = express.Router();

router.get("/health", health);
router.get("/graph", getGraph);
router.post("/analyze", validateAnalyze, analyze);
router.post("/seed", seed);

module.exports = router;
