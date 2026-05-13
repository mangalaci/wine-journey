export type LikedWine = {
  name: string;
  tags: string[];
};

export function buildTasteProfile(likedWines: LikedWine[]): string {
  if (likedWines.length === 0) {
    return "Még felfedezed az ízlésed";
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
    return "Még felfedezed az ízlésed";
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
    return `Erősen a ${strongTags.join(", ")} stílus felé hajlasz`;
  }

  const highTags = rankedTags
    .filter(([, count]) => count >= topCount - 1)
    .slice(0, 2)
    .map(([tag]) => tag);

  if (highTags.length > 1) {
    return `Inkább a ${highTags.join(", ")} borokat kedveled`;
  }

  return `Inkább a ${topTag} borokat kedveled`;
}
