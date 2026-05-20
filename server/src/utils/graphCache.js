/**
 * Lightweight TTL cache for GraphRAG analysis results (reduces Neo4j + Groq load).
 */
const store = new Map();
const DEFAULT_TTL_MS = Number(process.env.GRAPHRAG_CACHE_TTL_MS) || 5 * 60 * 1000;

const buildKey = (prefix, payload) => {
  const normalized = JSON.stringify(payload, Object.keys(payload).sort());
  return `${prefix}:${normalized}`;
};

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const del = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

module.exports = { buildKey, get, set, del, DEFAULT_TTL_MS };
