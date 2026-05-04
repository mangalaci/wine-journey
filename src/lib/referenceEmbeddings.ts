import { getEmbedding } from "@/lib/embedding";
import { type EmbeddedReference } from "@/lib/similarity";
import { type ReferenceWine, WINE_REFERENCE } from "@/lib/wineReference";

let referenceEmbeddingCache: Promise<EmbeddedReference<ReferenceWine>[]> | null = null;

function buildReferenceText(wine: ReferenceWine): string {
  return `${wine.name}. ${wine.description}. Tags: ${wine.tags.join(", ")}`;
}

export function getReferenceEmbeddings(): Promise<EmbeddedReference<ReferenceWine>[]> {
  if (!referenceEmbeddingCache) {
    referenceEmbeddingCache = Promise.all(
      WINE_REFERENCE.map(async (wine) => ({
        item: wine,
        embedding: await getEmbedding(buildReferenceText(wine)),
      })),
    );
  }
  return referenceEmbeddingCache;
}
