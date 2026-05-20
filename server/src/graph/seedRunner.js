/**
 * Programmatic seed runner (used by API + CLI).
 */
require("dotenv").config();
const { getDriver, verifyConnectivity, closeDriver } = require("../config/neo4j");
const graph = require("./knowledgeGraphData");

const seedKnowledgeGraph = async () => {
  const status = await verifyConnectivity();
  if (!status.ok) {
    throw new Error(`Neo4j unreachable: ${status.error}. Run: docker compose up neo4j -d`);
  }

  const driver = getDriver();
  const session = driver.session();
  let nodeCount = 0;

  try {
    await session.run(`
      MATCH (n)
      WHERE n:Symptom OR n:Risk OR n:WHO_Warning OR n:Action OR n:Severity
         OR n:Recommendation OR n:Hospital OR n:Patient
      DETACH DELETE n
    `);

    await session.run("CREATE CONSTRAINT symptom_id IF NOT EXISTS FOR (s:Symptom) REQUIRE s.id IS UNIQUE");
    await session.run("CREATE CONSTRAINT risk_id IF NOT EXISTS FOR (r:Risk) REQUIRE r.id IS UNIQUE");
    await session.run("CREATE CONSTRAINT who_warning_id IF NOT EXISTS FOR (w:WHO_Warning) REQUIRE w.id IS UNIQUE");
    await session.run("CREATE CONSTRAINT action_id IF NOT EXISTS FOR (a:Action) REQUIRE a.id IS UNIQUE");

    const mergeNodes = async (label, rows) => {
      for (const row of rows) {
        await session.run(`MERGE (n:${label} {id: $id}) SET n += $props`, {
          id: row.id,
          props: row,
        });
        nodeCount += 1;
      }
    };

    await mergeNodes("Symptom", graph.symptoms);
    await mergeNodes("Risk", graph.risks);
    await mergeNodes("WHO_Warning", graph.whoWarnings);
    await mergeNodes("Action", graph.actions);
    await mergeNodes("Severity", graph.severities);
    await mergeNodes("Recommendation", graph.recommendations);
    await mergeNodes("Hospital", graph.hospitals);

    await session.run(`
      MERGE (p:Patient {id: 'template_patient'})
      SET p.name = 'Template Patient'
    `);

    let edgeCount = 0;
    for (const edge of graph.edges) {
      await session.run(
        `
        MATCH (a {id: $fromId})
        MATCH (b {id: $toId})
        MERGE (a)-[r:${edge.rel}]->(b)
        SET r.source = 'WHO-aligned-dengue-v1'
        `,
        { fromId: edge.from, toId: edge.to }
      );
      edgeCount += 1;
    }

    return { nodeCount, edgeCount, message: "Knowledge graph seeded successfully" };
  } finally {
    await session.close();
  }
};

module.exports = { seedKnowledgeGraph };
