/**
 * Calculates the cosine similarity between two vectors.
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} The similarity score between -1 and 1.
 */
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    throw new Error("Vectors must be of same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0; // Avoid division by zero
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

module.exports = { cosineSimilarity };
