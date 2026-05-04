export type LikedWine = {
  name: string;
  tags: string[];
};

export function buildTasteProfile(likedWines: LikedWine[]): string {
  if (likedWines.length === 0) {
    return "You're still exploring your taste";
  }

  // Weighted frequency: each tag occurrence across liked wines contributes +1.
  const tagFrequency = likedWines.reduce<Record<string, number>>((acc, wine) => {
    for (const tag of wine.tags) {
      acc[tag] = (acc[tag] ?? 0) + 1;
    }
    return acc;
  }, {});

  const rankedTags = Object.entries(tagFrequency).sort((a, b) => b[1] - a[1]);
  if (rankedTags.length === 0) {
    return "You're still exploring your taste";
  }

  const [[topTag, topCount], [, secondCount = 0] = []] = rankedTags;
  const clearlyHigher = topCount >= secondCount + 2;

  if (clearlyHigher) {
    const alsoStrong = rankedTags
      .slice(1)
      .filter(([, count]) => topCount - count <= 1)
      .slice(0, 1)
      .map(([tag]) => tag);
    const strongTags = [topTag, ...alsoStrong];
    return `You strongly prefer ${strongTags.join(", ")} wines`;
  }

  const highTags = rankedTags
    .filter(([, count]) => count >= topCount - 1)
    .slice(0, 2)
    .map(([tag]) => tag);

  if (highTags.length > 1) {
    return `You lean towards ${highTags.join(", ")} wines`;
  }

  return `You lean towards ${topTag} wines`;
}
