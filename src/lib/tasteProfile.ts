export function buildTasteProfile(likedTraits: string[]): string {
  if (likedTraits.length === 0) {
    return "";
  }

  const weight = likedTraits.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const ranked = Object.entries(weight).sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, 2).map(([k]) => k);

  if (top.includes("light") && top.includes("fruity")) {
    return "You seem to prefer light, fruity wines";
  }
  if (top.includes("light") || top.includes("crisp")) {
    return "You seem to prefer fresh, easy-drinking wines";
  }
  if (top.includes("fruity")) {
    return "You seem to prefer fruity, aromatic wines";
  }
  if (top.includes("bold") || top.includes("rich")) {
    return "You seem to prefer fuller-bodied wines";
  }

  return `You seem to enjoy ${top.join(" & ")} styles`;
}
