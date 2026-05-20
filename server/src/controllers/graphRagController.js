const { verifyConnectivity } = require("../config/neo4j");
const graphRagService = require("../services/graphRagService");
const { seedKnowledgeGraph } = require("../graph/seedRunner");
const { ALLOWED_SYMPTOMS } = require("../utils/symptomNormalizer");
const cache = require("../utils/graphCache");

/**
 * GraphRAG API — relationship-aware dengue clinical intelligence.
 * @see docs/GRAPHRAG_ARCHITECTURE.md
 */

const analyze = async (req, res) => {
  try {
    const result = await graphRagService.runHybridAnalysis(req.graphRagInput);
    return res.json(result);
  } catch (error) {
    console.error("[GraphRAG Analyze]", error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: error.message || "GraphRAG analysis failed",
    });
  }
};

const getGraph = async (_req, res) => {
  try {
    const graph = await graphRagService.getFullGraphVisualization();
    return res.json({ success: true, ...graph });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const health = async (_req, res) => {
  const neo4j = await verifyConnectivity();
  return res.json({
    success: true,
    service: "graphrag",
    neo4j,
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    allowedSymptoms: ALLOWED_SYMPTOMS,
  });
};

const seed = async (_req, res) => {
  try {
    const result = await seedKnowledgeGraph();
    cache.del("graphrag");
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { analyze, getGraph, health, seed };
