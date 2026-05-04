import { getEmbedding } from "@/lib/embedding";
import { getReferenceEmbeddings } from "@/lib/referenceEmbeddings";
import { getMostSimilar } from "@/lib/similarity";

export type SemanticWineMatch = {
  name: string;
  tags: string[];
  score: number;
} | null;

export async function matchWine(description: string): Promise<SemanticWineMatch> {
  const inputEmbedding = await getEmbedding(description);
  const referenceEmbeddings = await getReferenceEmbeddings();
  const best = getMostSimilar(inputEmbedding, referenceEmbeddings);
  if (!best) return null;

  return {
    name: best.item.name,
    tags: best.item.tags,
    score: best.score,
  };
}
