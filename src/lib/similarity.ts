export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return -1;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return -1;
  return dot / denom;
}

export type EmbeddedReference<T> = {
  item: T;
  embedding: number[];
};

export function getMostSimilar<T>(
  inputEmbedding: number[],
  referenceEmbeddings: EmbeddedReference<T>[],
): { item: T; score: number } | null {
  if (inputEmbedding.length === 0 || referenceEmbeddings.length === 0) return null;

  let bestIndex = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < referenceEmbeddings.length; i += 1) {
    const score = cosineSimilarity(inputEmbedding, referenceEmbeddings[i].embedding);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex < 0) return null;
  return { item: referenceEmbeddings[bestIndex].item, score: bestScore };
}
