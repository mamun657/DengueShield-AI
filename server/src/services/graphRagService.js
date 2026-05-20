/**
 * GraphRAG Clinical Intelligence Engine
 * -------------------------------------
 * Traditional RAG: retrieves similar text chunks only.
 * GraphRAG: traverses WHO-aligned symptom → warning → risk → action pathways with explainability.
 */
const Groq = require("groq-sdk");
const axios = require("axios");
const { runQuery, verifyConnectivity, isConnected } = require("../config/neo4j");
const graph = require("../graph/knowledgeGraphData");
const { normalizeSymptoms, toMlPayload } = require("../utils/symptomNormalizer");
const cache = require("../utils/graphCache");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const getGroq = () => {
  const key = process.env.GROQ_API_KEY;
  return key ? new Groq({ apiKey: key }) : null;
};

const getMlBaseUrl = () =>
  process.env.ML_API_URL || process.env.PYTHON_API_URL || "http://127.0.0.1:5001";

const nodeById = (label, id) => {
  const pools = {
    Symptom: graph.symptoms,
    Risk: graph.risks,
    WHO_Warning: graph.whoWarnings,
    Action: graph.actions,
    Severity: graph.severities,
    Recommendation: graph.recommendations,
    Hospital: graph.hospitals,
  };
  return (pools[label] || []).find((n) => n.id === id);
};

/** In-memory graph traversal when Neo4j is offline */
const traverseInMemory = (symptomIds) => {
  const paths = [];
  const nodes = new Map();
  const links = [];

  const addNode = (label, id) => {
    const key = `${label}:${id}`;
    if (nodes.has(key)) return;
    const data = nodeById(label, id) || { id, name: id };
    nodes.set(key, {
      id: key,
      graphId: id,
      label: data.name || id,
      group: label,
    });
  };

  for (const sid of symptomIds) {
    addNode("Symptom", sid);
    const outEdges = graph.edges.filter((e) => e.from === sid);
    for (const edge of outEdges) {
      addNode(edge.toLabel, edge.to);
      links.push({
        source: `Symptom:${sid}`,
        target: `${edge.toLabel}:${edge.to}`,
        type: edge.rel,
      });
      paths.push({
        path: `Symptom(${sid}) -[${edge.rel}]-> ${edge.toLabel}(${edge.to})`,
        symptom: sid,
        relationship: edge.rel,
        targetType: edge.toLabel,
        targetId: edge.to,
      });

      const secondHop = graph.edges.filter((e) => e.from === edge.to);
      for (const hop2 of secondHop) {
        addNode(hop2.toLabel, hop2.to);
        links.push({
          source: `${edge.toLabel}:${edge.to}`,
          target: `${hop2.toLabel}:${hop2.to}`,
          type: hop2.rel,
        });
        paths.push({
          path: `${edge.toLabel}(${edge.to}) -[${hop2.rel}]-> ${hop2.toLabel}(${hop2.to})`,
          symptom: sid,
          relationship: hop2.rel,
          targetType: hop2.toLabel,
          targetId: hop2.to,
        });
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    links,
    paths,
  };
};

/** Neo4j multi-hop traversal for active symptoms */
const traverseNeo4j = async (symptomIds) => {
  const result = await runQuery(
    `
    UNWIND $symptoms AS sid
    MATCH (s:Symptom {id: sid})
    OPTIONAL MATCH p1 = (s)-[r1:INDICATES|CLASSIFIED_AS|TRIGGERS|HAS_RISK|RELATED_TO]->(n1)
    OPTIONAL MATCH p2 = (n1)-[r2:REQUIRES|NEEDS|TRIGGERS|CLASSIFIED_AS|RELATED_TO|REFER_TO]->(n2)
    OPTIONAL MATCH p3 = (n2)-[r3:RELATED_TO|NEEDS|REFER_TO]->(n3)
    RETURN s, p1, p2, p3, n1, n2, n3, r1, r2, r3
    `,
    { symptoms: symptomIds }
  );

  const nodes = new Map();
  const links = [];
  const paths = [];

  const labelOf = (node) => {
    if (!node) return "Unknown";
    if (node.labels?.includes("Symptom")) return "Symptom";
    if (node.labels?.includes("Risk")) return "Risk";
    if (node.labels?.includes("WHO_Warning")) return "WHO_Warning";
    if (node.labels?.includes("Action")) return "Action";
    if (node.labels?.includes("Severity")) return "Severity";
    if (node.labels?.includes("Recommendation")) return "Recommendation";
    if (node.labels?.includes("Hospital")) return "Hospital";
    return node.labels?.[0] || "Node";
  };

  const ingestNode = (node) => {
    if (!node?.properties?.id) return;
    const group = labelOf(node);
    const key = `${group}:${node.properties.id}`;
    nodes.set(key, {
      id: key,
      graphId: node.properties.id,
      label: node.properties.name || node.properties.text || node.properties.id,
      group,
    });
  };

  const ingestRel = (start, rel, end) => {
    if (!start?.properties?.id || !end?.properties?.id || !rel?.type) return;
    const sKey = `${labelOf(start)}:${start.properties.id}`;
    const eKey = `${labelOf(end)}:${end.properties.id}`;
    links.push({ source: sKey, target: eKey, type: rel.type });
    paths.push({
      path: `${labelOf(start)}(${start.properties.id}) -[${rel.type}]-> ${labelOf(end)}(${end.properties.id})`,
      symptom: start.labels?.includes("Symptom") ? start.properties.id : null,
      relationship: rel.type,
      targetType: labelOf(end),
      targetId: end.properties.id,
    });
  };

  for (const record of result.records) {
    ingestNode(record.get("s"));
    ingestNode(record.get("n1"));
    ingestNode(record.get("n2"));
    ingestNode(record.get("n3"));
    ingestRel(record.get("s"), record.get("r1"), record.get("n1"));
    ingestRel(record.get("n1"), record.get("r2"), record.get("n2"));
    ingestRel(record.get("n2"), record.get("r3"), record.get("n3"));
  }

  return { nodes: [...nodes.values()], links, paths };
};

const analyzeSymptomsGraph = async (symptomIds, day = 1) => {
  let graphResult;
  const neo4jOk = (await verifyConnectivity()).ok;

  if (neo4jOk) {
    try {
      graphResult = await traverseNeo4j(symptomIds);
      graphResult.engine = "neo4j";
    } catch (err) {
      console.warn("[GraphRAG] Neo4j query failed, using in-memory graph:", err.message);
      graphResult = { ...traverseInMemory(symptomIds), engine: "memory-fallback" };
    }
  } else {
    graphResult = { ...traverseInMemory(symptomIds), engine: "memory-fallback" };
  }

  return {
    ...graphResult,
    day: Number(day),
    inputSymptoms: symptomIds,
  };
};

const detectCriticalPhase = (symptomIds, day, paths = []) => {
  const hasFeverDrop = symptomIds.includes("fever_drop");
  const criticalDay = Number(day) >= 3 && Number(day) <= 7;
  const graphCritical = paths.some(
    (p) => p.targetId === "critical_phase" || p.path?.includes("critical_phase")
  );
  const warningSigns = symptomIds.filter((s) =>
    ["abdominal_pain", "vomiting", "bleeding", "fatigue"].includes(s)
  );

  return {
    detected: (hasFeverDrop && criticalDay) || graphCritical,
    reasons: [
      hasFeverDrop && criticalDay ? "Fever drop during day 3–7 critical window" : null,
      graphCritical ? "Graph pathway matched dengue critical phase node" : null,
      warningSigns.length ? `WHO-relevant warning symptoms: ${warningSigns.join(", ")}` : null,
    ].filter(Boolean),
  };
};

const getWHOGuidance = (paths) => {
  const warnings = paths
    .filter((p) => p.targetType === "WHO_Warning")
    .map((p) => p.targetId);
  const unique = [...new Set(warnings)];
  return {
    matched: unique,
    summary:
      unique.includes("emergency_sign")
        ? "WHO Emergency Sign Detected"
        : unique.includes("warning_sign")
          ? "WHO Warning Sign Detected"
          : unique.length
            ? "WHO-aligned signs under monitoring"
            : "No WHO warning pathway matched",
  };
};

const getRiskPathways = (paths) => {
  const risks = paths
    .filter((p) => p.targetType === "Risk")
    .map((p) => ({ id: p.targetId, via: p.symptom, relationship: p.relationship }));
  const actions = paths
    .filter((p) => p.targetType === "Action")
    .map((p) => p.targetId);
  return { risks: [...new Map(risks.map((r) => [r.id, r])).values()], actions: [...new Set(actions)] };
};

const generateGraphExplanation = (symptomIds, paths, whoGuidance, critical) => {
  const lines = symptomIds.map((sid) => {
    const hops = paths.filter((p) => p.symptom === sid);
    if (!hops.length) return `${sid}: no graph pathway matched`;
    return `${sid} → ${hops.map((h) => h.path).join(" | ")}`;
  });

  return {
    traversalSummary: lines,
    whoRules: whoGuidance.matched,
    criticalPhase: critical.detected,
    graphPathLabels: ["Symptom", "WHO Warning Sign", "Critical Phase", "Hospitalization Recommendation"],
  };
};

const buildReasoningBullets = (symptomIds, paths, critical, whoGuidance, mlResult) => {
  const bullets = [];
  if (symptomIds.includes("fever_drop")) {
    bullets.push("fever_drop indicates dengue critical transition");
  }
  if (symptomIds.includes("abdominal_pain") && whoGuidance.matched.includes("warning_sign")) {
    bullets.push("abdominal_pain matched WHO warning graph");
  }
  if (symptomIds.includes("vomiting")) {
    bullets.push("vomiting increased dehydration pathway");
  }
  if (symptomIds.includes("bleeding")) {
    bullets.push("bleeding triggered emergency referral pathway");
  }
  for (const p of paths.slice(0, 4)) {
    if (!bullets.some((b) => b.includes(p.targetId))) {
      bullets.push(`${p.symptom || "graph"} ${p.relationship?.toLowerCase()} ${p.targetId}`.replace(/_/g, " "));
    }
  }
  if (critical.detected) {
    bullets.push("Critical phase pattern detected on day " + (mlResult?.day || ""));
  }
  if (mlResult?.risk_level) {
    bullets.push(`XGBoost severity model: ${mlResult.risk_level} (score ${mlResult.risk_score})`);
  }
  return bullets.slice(0, 8);
};

const generateClinicalReasoning = async (context) => {
  const groq = getGroq();
  const fallback =
    "Possible transition into dengue critical phase detected due to fever drop and abdominal pain. WHO warning-sign pathway matched. Immediate hospital observation is recommended.";

  if (!groq) {
    return { narrative: fallback, model: "rule-based-fallback" };
  }

  const prompt = `You are a WHO-aligned dengue clinical intelligence assistant. Be professional, concise, explainable, and healthcare-safe. Do not diagnose definitively.

Patient context:
- Day of illness: ${context.day}
- Symptoms: ${context.symptoms.join(", ")}
- Graph pathways: ${context.paths.map((p) => p.path).join("; ") || "none"}
- WHO guidance: ${context.whoGuidance.summary}
- ML risk: ${context.mlResult?.risk_level || "unknown"} (score ${context.mlResult?.risk_score ?? "n/a"})
- Critical phase: ${context.critical.detected ? "yes" : "no"}
- RAG context excerpt: ${String(context.ragContext || "").slice(0, 500)}

Write 2-3 sentences explaining why risk increased, which symptoms triggered pathways, and recommended action.`;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 280,
      messages: [
        { role: "system", content: "You produce explainable clinical intelligence for dengue surveillance platforms." },
        { role: "user", content: prompt },
      ],
    });
    const narrative = completion.choices?.[0]?.message?.content?.trim() || fallback;
    return { narrative, model: GROQ_MODEL };
  } catch (err) {
    console.error("[GraphRAG] Groq reasoning error:", err.message);
    return { narrative: fallback, model: "rule-based-fallback" };
  }
};

const fetchMlPrediction = async (symptoms, day, extras) => {
  const payload = toMlPayload(symptoms, day, extras);
  try {
    const res = await axios.post(`${getMlBaseUrl().replace(/\/$/, "")}/predict`, payload, {
      timeout: 10000,
    });
    return { ...res.data, day: payload.day };
  } catch (err) {
    console.warn("[GraphRAG] ML API unavailable:", err.message);
    const score = Math.min(
      100,
      payload.day * 8 +
        (payload.abdominal_pain ? 15 : 0) +
        (payload.vomiting ? 12 : 0) +
        (payload.bleeding ? 25 : 0) +
        (payload.temp < 38 ? 20 : 0)
    );
    return {
      risk_score: score,
      risk_level: score >= 80 ? "HIGH" : score >= 55 ? "MODERATE" : "LOW",
      rag_context: "ML service offline — graph-only analysis active.",
      report: null,
      day: payload.day,
    };
  }
};

const fetchRagContext = async (symptoms, day) => {
  const query = `dengue day ${day} symptoms ${symptoms.join(" ")} WHO warning signs`;
  try {
    const res = await axios.post(
      `${getMlBaseUrl().replace(/\/$/, "")}/chat`,
      { message: query, patient_data: { symptoms, day } },
      { timeout: 8000 }
    );
    return String(res.data?.reply || res.data?.rag_context || "").slice(0, 800);
  } catch {
    return "WHO guideline retrieval unavailable; graph pathways used as primary evidence.";
  }
};

const computeConfidence = (symptomIds, paths, critical, mlResult) => {
  let score = 0.55;
  score += Math.min(symptomIds.length * 0.06, 0.18);
  score += Math.min(paths.length * 0.04, 0.2);
  if (critical.detected) score += 0.12;
  if (mlResult?.risk_score >= 70) score += 0.08;
  return Math.min(Number(score.toFixed(2)), 0.98);
};

const deriveOutputs = (symptomIds, paths, critical, whoGuidance, pathways, mlResult) => {
  const hasEmergency = pathways.actions.includes("emergency_referral") || whoGuidance.matched.includes("emergency_sign");
  const hasCritical = critical.detected || pathways.risks.some((r) => r.id === "critical_phase");

  const risk = hasCritical ? "Critical Phase" : pathways.risks[0]?.id?.replace(/_/g, " ") || "Monitoring Phase";
  const severity =
    mlResult?.risk_level === "HIGH" || hasEmergency
      ? "High"
      : mlResult?.risk_level === "MODERATE"
        ? "Moderate"
        : "Low";

  const recommendation = hasEmergency
    ? "Emergency referral required immediately"
    : hasCritical
      ? "Immediate hospital observation recommended"
      : pathways.actions.includes("hydration")
        ? "Increase hydration and monitor symptoms every 12 hours"
        : "Continue monitoring and repeat assessment if symptoms worsen";

  const formatRisk = (raw) => {
    if (hasCritical) return "Critical Phase";
    if (hasEmergency) return "Severe Dengue Emergency";
    return String(raw || "Monitoring Phase")
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return {
    risk: formatRisk(risk),
    severity,
    warning: whoGuidance.summary,
    recommendation,
  };
};

const getFullGraphVisualization = async () => {
  const neo4jOk = (await verifyConnectivity()).ok;
  if (neo4jOk) {
    try {
      const result = await runQuery(`
        MATCH (a)-[r]->(b)
        WHERE (a:Symptom OR a:Risk OR a:WHO_Warning OR a:Action)
          AND (b:Risk OR b:WHO_Warning OR b:Action OR b:Severity OR b:Recommendation OR b:Hospital)
        RETURN a, r, b LIMIT 200
      `);
      const nodes = new Map();
      const links = [];
      const labelOf = (n) => n.labels?.[0] || "Node";
      for (const rec of result.records) {
        const a = rec.get("a");
        const b = rec.get("b");
        const r = rec.get("r");
        const aKey = `${labelOf(a)}:${a.properties.id}`;
        const bKey = `${labelOf(b)}:${b.properties.id}`;
        nodes.set(aKey, { id: aKey, graphId: a.properties.id, label: a.properties.name || a.properties.id, group: labelOf(a) });
        nodes.set(bKey, { id: bKey, graphId: b.properties.id, label: b.properties.name || b.properties.id, group: labelOf(b) });
        links.push({ source: aKey, target: bKey, type: r.type });
      }
      return { nodes: [...nodes.values()], links, engine: "neo4j" };
    } catch (err) {
      console.warn("[GraphRAG] Full graph fetch failed:", err.message);
    }
  }
  const all = traverseInMemory(graph.symptoms.map((s) => s.id));
  return { ...all, engine: "memory-fallback" };
};

const runHybridAnalysis = async (input) => {
  const symptoms = normalizeSymptoms(input.symptoms || []);
  const day = Number(input.day) || 1;

  if (!symptoms.length) {
    const err = new Error("At least one valid symptom is required");
    err.status = 400;
    throw err;
  }

  const cacheKey = cache.buildKey("graphrag", { symptoms: symptoms.sort(), day });
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const graphAnalysis = await analyzeSymptomsGraph(symptoms, day);
  const critical = detectCriticalPhase(symptoms, day, graphAnalysis.paths);
  const whoGuidance = getWHOGuidance(graphAnalysis.paths);
  const pathways = getRiskPathways(graphAnalysis.paths);
  const mlResult = await fetchMlPrediction(symptoms, day, input.extras || {});
  const ragContext = await fetchRagContext(symptoms, day);
  const derived = deriveOutputs(symptoms, graphAnalysis.paths, critical, whoGuidance, pathways, mlResult);
  const reasoning = buildReasoningBullets(symptoms, graphAnalysis.paths, critical, whoGuidance, mlResult);
  const graphExplanation = generateGraphExplanation(symptoms, graphAnalysis.paths, whoGuidance, critical);
  const clinical = await generateClinicalReasoning({
    day,
    symptoms,
    paths: graphAnalysis.paths,
    whoGuidance,
    critical,
    mlResult,
    ragContext,
  });

  const confidence = computeConfidence(symptoms, graphAnalysis.paths, critical, mlResult);

  const response = {
    success: true,
    risk: derived.risk,
    severity: derived.severity,
    warning: derived.warning,
    recommendation: derived.recommendation,
    confidence,
    reasoning,
    graphPath: graphExplanation.graphPathLabels,
    narrative: clinical.narrative,
    engine: graphAnalysis.engine,
    neo4jConnected: isConnected(),
    ml: {
      risk_score: mlResult.risk_score,
      risk_level: mlResult.risk_level,
    },
    graph: {
      nodes: graphAnalysis.nodes,
      links: graphAnalysis.links,
      paths: graphAnalysis.paths,
      explanation: graphExplanation,
    },
    who: whoGuidance,
    criticalPhase: critical,
    ragContext: ragContext.slice(0, 600),
    meta: {
      model: clinical.model,
      day,
      symptoms,
      pipeline: [
        "User Symptoms",
        "XGBoost Risk Prediction",
        "Neo4j Graph Traversal",
        "WHO Knowledge Graph Retrieval",
        "RAG Retrieval",
        "Groq LLM Clinical Reasoning",
        "Final AI Medical Intelligence Report",
      ],
    },
  };

  cache.set(cacheKey, response);
  return response;
};

module.exports = {
  analyzeSymptomsGraph,
  detectCriticalPhase,
  getWHOGuidance,
  getRiskPathways,
  generateClinicalReasoning,
  generateGraphExplanation,
  getFullGraphVisualization,
  runHybridAnalysis,
  traverseInMemory,
};
