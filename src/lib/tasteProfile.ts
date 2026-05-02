export type LikedWine = {
  name: string;
  tags: string[];
};

export function buildTasteProfile(likedWines: LikedWine[]): string {
  if (likedWines.length === 0) {
    return "You're still exploring your taste";
  }

  const likedTags = likedWines.flatMap((wine) => wine.tags);
  const weight = likedTags.reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] ?? 0) + 1;
    return acc;
  }, {});

  const top = Object.entries(weight)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([tag]) => tag);

  if (top.includes("light") && top.includes("fruity")) {
    return "You seem to prefer light, fruity wines";
  }

  if (top.includes("bold") || top.includes("intense")) {
    return "You enjoy bold, intense wines";
  }

  if (top.length === 0) {
    return "You're still exploring your taste";
  }

  return `You seem to prefer ${top.join(", ")} wines`;
}
