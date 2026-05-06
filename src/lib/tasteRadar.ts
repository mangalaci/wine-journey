import type { LikedWine } from "@/lib/tasteProfile";

export type TasteRadarScores = {
  sweetness: number;
  body: number;
  acidity: number;
  tannin: number;
};

/** Per-tag deltas toward radar dimensions (only listed tags contribute). */
const TAG_TO_RADAR: Record<string, Partial<TasteRadarScores>> = {
  sweet: { sweetness: 1 },
  dry: { sweetness: -1 },
  bold: { body: 1 },
  light: { body: -1 },
  acidic: { acidity: 1 },
  tannic: { tannin: 1 },
};

const CLAMP = 8;

function normalizeDimension(raw: number): number {
  const t = (Math.max(-CLAMP, Math.min(CLAMP, raw)) + CLAMP) / (2 * CLAMP);
  return Math.round(t * 5);
}

/** Aggregate liked and disliked wine tags into 0–5 scores per dimension.
 *  Liked wines contribute at weight +1, disliked wines at weight −0.5. */
export function buildTasteRadar(
  likedWines: LikedWine[],
  dislikedWines: LikedWine[] = [],
): TasteRadarScores {
  let sweetness = 0;
  let body = 0;
  let acidity = 0;
  let tannin = 0;

  for (const wine of likedWines) {
    for (const tag of wine.tags) {
      const delta = TAG_TO_RADAR[tag];
      if (!delta) continue;
      sweetness += delta.sweetness ?? 0;
      body += delta.body ?? 0;
      acidity += delta.acidity ?? 0;
      tannin += delta.tannin ?? 0;
    }
  }

  for (const wine of dislikedWines) {
    for (const tag of wine.tags) {
      const delta = TAG_TO_RADAR[tag];
      if (!delta) continue;
      sweetness -= (delta.sweetness ?? 0) * 0.5;
      body -= (delta.body ?? 0) * 0.5;
      acidity -= (delta.acidity ?? 0) * 0.5;
      tannin -= (delta.tannin ?? 0) * 0.5;
    }
  }

  return {
    sweetness: normalizeDimension(sweetness),
    body: normalizeDimension(body),
    acidity: normalizeDimension(acidity),
    tannin: normalizeDimension(tannin),
  };
}

export function radarToBlocks(value: number): string {
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return `${"█".repeat(n)}${"░".repeat(5 - n)}`;
}
