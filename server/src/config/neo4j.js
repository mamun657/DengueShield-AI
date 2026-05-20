/**
 * Neo4j connection helper — singleton driver for GraphRAG medical knowledge graph.
 * Traditional RAG retrieves flat text; GraphRAG traverses WHO-aligned clinical relationships.
 */
const neo4j = require("neo4j-driver");

let driver = null;
let connectivityVerified = false;

const getConfig = () => ({
  uri: process.env.NEO4J_URI || "bolt://localhost:7687",
  username: process.env.NEO4J_USERNAME || "neo4j",
  password: process.env.NEO4J_PASSWORD || "password",
  database: process.env.NEO4J_DATABASE || "neo4j",
});

const getDriver = () => {
  if (driver) return driver;
  const { uri, username, password } = getConfig();
  driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 15000,
  });
  return driver;
};

const getSession = (mode = neo4j.session.WRITE) => {
  const { database } = getConfig();
  return getDriver().session({ database, defaultAccessMode: mode });
};

const verifyConnectivity = async () => {
  try {
    const d = getDriver();
    await d.verifyConnectivity();
    connectivityVerified = true;
    return { ok: true, uri: getConfig().uri };
  } catch (error) {
    connectivityVerified = false;
    return { ok: false, error: error.message, uri: getConfig().uri };
  }
};

const runQuery = async (cypher, params = {}, mode = neo4j.session.READ) => {
  const session = getSession(mode);
  try {
    const result = await session.run(cypher, params);
    return result;
  } finally {
    await session.close();
  }
};

const closeDriver = async () => {
  if (driver) {
    await driver.close();
    driver = null;
    connectivityVerified = false;
  }
};

const isConnected = () => connectivityVerified;

module.exports = {
  getDriver,
  getSession,
  getConfig,
  verifyConnectivity,
  runQuery,
  closeDriver,
  isConnected,
  neo4j,
};
