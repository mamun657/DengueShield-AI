const express = require("express");
const { askMedicalQuestion } = require("../controllers/ragController");

const router = express.Router();

router.post("/ask", askMedicalQuestion);

module.exports = router;
