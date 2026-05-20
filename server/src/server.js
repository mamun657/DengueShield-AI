require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { verifyConnectivity } = require("./config/neo4j");

const PORT = process.env.PORT || 5000;

const bootstrap = async () => {
  await connectDB();
  const neo4j = await verifyConnectivity();
  if (neo4j.ok) {
    console.log(`Neo4j connected (${neo4j.uri}) — GraphRAG engine ready`);
  } else {
    console.warn(`Neo4j unavailable (${neo4j.error}) — GraphRAG will use in-memory fallback`);
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
