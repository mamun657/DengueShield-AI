#!/usr/bin/env node
/**
 * Seeds WHO-aligned dengue knowledge graph into Neo4j.
 * Run: npm run graph:seed
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { closeDriver } = require("../config/neo4j");
const { seedKnowledgeGraph } = require("./seedRunner");

seedKnowledgeGraph()
  .then(async (r) => {
    console.log("[Graph Seed] Complete:", r);
    await closeDriver();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[Graph Seed] Failed:", err.message);
    await closeDriver();
    process.exit(1);
  });
