# DengueShield GraphRAG Architecture

## Mission

Enterprise-grade AI-native dengue clinical intelligence with **GraphRAG** (graph retrieval-augmented generation) and WHO-aligned knowledge graphs.

## Why GraphRAG > Traditional RAG

| Traditional RAG | GraphRAG (DengueShield) |
|-----------------|-------------------------|
| Retrieves similar text chunks | Traverses clinical **relationships** |
| Weak explainability | Full pathway audit (`Symptom → WHO Warning → Risk → Action`) |
| Static documents | Machine-readable WHO rules in Neo4j |
| Black-box risk | XGBoost + graph + Groq narrative |

## Hybrid AI Pipeline

```
User Symptoms
    ↓
XGBoost Risk Prediction (Python /predict)
    ↓
Neo4j Graph Traversal (WHO knowledge graph)
    ↓
WHO Knowledge Graph Retrieval
    ↓
Existing RAG Retrieval (Python /chat + rag_data.pkl)
    ↓
Groq LLM Clinical Reasoning (llama-3.1-8b-instant)
    ↓
Final AI Medical Intelligence Report
```

## Stack Additions

- **neo4j-driver** — graph database client
- **server/src/config/neo4j.js** — connection helper
- **server/src/graph/** — schema data + seed scripts
- **server/src/services/graphRagService.js** — GraphRAG engine
- **POST /api/graphrag/analyze** — main intelligence API
- **client** — `/graphrag` dashboard with `react-force-graph-2d`

## Neo4j Setup

### 1. Environment (`server/.env`)

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j
GROQ_API_KEY=<existing>
GROQ_MODEL=llama-3.1-8b-instant
GRAPHRAG_CACHE_TTL_MS=300000
```

### 2. Start Neo4j (Docker)

```bash
docker compose up neo4j -d
```

Browser: http://localhost:7474 (user `neo4j`, password from `.env`)

### 3. Seed knowledge graph

```bash
cd server
npm run graph:seed
```

### 4. Start services

```bash
# Terminal 1 — Python ML + RAG
cd server && python app.py

# Terminal 2 — Node API
cd server && npm run dev

# Terminal 3 — React
cd client && npm run dev
```

## API Reference

### `POST /api/graphrag/analyze`

**Request**

```json
{
  "symptoms": ["fever_drop", "abdominal_pain", "vomiting"],
  "day": 4
}
```

**Response**

```json
{
  "success": true,
  "risk": "Critical Phase",
  "severity": "High",
  "warning": "WHO Warning Sign Detected",
  "recommendation": "Immediate hospital observation recommended",
  "confidence": 0.94,
  "reasoning": ["..."],
  "graphPath": ["Symptom", "WHO Warning Sign", "Critical Phase", "Hospitalization Recommendation"],
  "narrative": "...",
  "graph": { "nodes": [], "links": [], "paths": [] },
  "ml": { "risk_score": 91, "risk_level": "HIGH" }
}
```

### Other routes

- `GET /api/graphrag/health` — Neo4j + Groq status
- `GET /api/graphrag/graph` — full graph for visualization
- `POST /api/graphrag/seed` — re-seed Neo4j (dev)

## Graph Schema

**Nodes:** `Patient`, `Symptom`, `Risk`, `WHO_Warning`, `Action`, `Hospital`, `Severity`, `Recommendation`

**Relationships:** `HAS_SYMPTOM`, `INDICATES`, `REQUIRES`, `CLASSIFIED_AS`, `RELATED_TO`, `NEEDS`, `REFER_TO`, `HAS_RISK`, `TRIGGERS`

## Testing

```bash
curl -X POST http://localhost:5000/api/graphrag/analyze \
  -H "Content-Type: application/json" \
  -d "{\"symptoms\":[\"fever_drop\",\"abdominal_pain\",\"vomiting\"],\"day\":4}"
```

Open http://localhost:5173/graphrag for the live graph demo.

## Fallback Mode

If Neo4j is offline, the engine uses an **in-memory mirror** of the same WHO-aligned edges so demos and development continue without Docker.

## Disclaimer

AI outputs are decision-support only and do not replace licensed clinical judgment.
