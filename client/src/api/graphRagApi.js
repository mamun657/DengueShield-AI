import api from "../api";

export const analyzeGraphRag = async ({ symptoms, day, extras }) => {
  const response = await api.post("/graphrag/analyze", { symptoms, day, extras });
  return response.data;
};

export const fetchGraphRagHealth = async () => {
  const response = await api.get("/graphrag/health");
  return response.data;
};

export const fetchKnowledgeGraph = async () => {
  const response = await api.get("/graphrag/graph");
  return response.data;
};

export const ALLOWED_GRAPH_SYMPTOMS = [
  "fever_drop",
  "abdominal_pain",
  "vomiting",
  "bleeding",
  "rash",
  "dehydration",
  "headache",
  "eye_pain",
  "fatigue",
];
