require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const { verifyConnectivity } = require("./config/neo4j");
const { getSocketOrigins } = require("./config/socketOrigins");
const { initMessagingSocket } = require("./socket/messagingSocket");

const PORT = process.env.PORT || 5000;

const bootstrap = async () => {
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: getSocketOrigins(),
      credentials: true,
    },
  });

  app.set("io", io);
  initMessagingSocket(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("[Socket] Messaging realtime enabled");
  });

  // Neo4j is only needed for GraphRAG — do not block HTTP startup on it.
  verifyConnectivity()
    .then((neo4j) => {
      if (neo4j.ok) {
        console.log(`Neo4j connected (${neo4j.uri}) — GraphRAG engine ready`);
      } else {
        console.warn(`Neo4j unavailable (${neo4j.error}) — GraphRAG will use in-memory fallback`);
      }
    })
    .catch((error) => {
      console.warn(`Neo4j connectivity check failed: ${error.message}`);
    });
};

bootstrap().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
