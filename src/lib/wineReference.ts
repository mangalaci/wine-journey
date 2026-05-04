export type ReferenceWine = {
  name: string;
  description: string;
  tags: string[];
};

export const WINE_REFERENCE: ReferenceWine[] = [
  {
    name: "Tokaji Aszu 5 Puttonyos",
    description:
      "Luscious sweet Tokaj dessert wine with apricot jam, orange peel, and vivid acidity.",
    tags: ["sweet", "fruity", "acidic", "mineral"],
  },
  {
    name: "Tokaji Dry Furmint",
    description:
      "Dry Hungarian white showing citrus, quince, and volcanic minerality with crisp finish.",
    tags: ["dry", "acidic", "mineral", "light"],
  },
  {
    name: "Balaton Olaszrizling",
    description:
      "Light to medium-bodied white with almond notes, gentle citrus, and easy weeknight drinkability.",
    tags: ["dry", "light", "acidic", "mineral"],
  },
  {
    name: "Sauvignon Blanc",
    description:
      "Fresh aromatic white with gooseberry, lime zest, and grassy lift; bright and zippy.",
    tags: ["dry", "light", "fruity", "acidic"],
  },
  {
    name: "Oaked Chardonnay",
    description:
      "Richer white style layered with vanilla, baked apple, and creamy oak spice.",
    tags: ["dry", "bold", "fruity", "mineral"],
  },
  {
    name: "Pinot Noir",
    description:
      "Elegant lighter red with sour cherry, forest floor, and silky tannins.",
    tags: ["light", "fruity", "dry", "acidic"],
  },
  {
    name: "Kadarka",
    description:
      "Spicy Hungarian red with red berry fruit, soft body, and lively peppery character.",
    tags: ["light", "spicy", "fruity", "dry"],
  },
  {
    name: "Egri Bikaver",
    description:
      "Traditional Hungarian blend with dark berry, black pepper, and medium-bodied structure.",
    tags: ["spicy", "bold", "dry", "fruity"],
  },
  {
    name: "Cabernet Sauvignon",
    description:
      "Bold full-bodied red driven by blackcurrant, cedar, and firm tannins.",
    tags: ["bold", "dry", "spicy", "fruity"],
  },
  {
    name: "Merlot",
    description:
      "Smooth medium-full red with plum, cocoa, and round soft texture.",
    tags: ["fruity", "dry", "bold", "spicy"],
  },
  {
    name: "Kekfrankos",
    description:
      "Vibrant Hungarian red with sour cherry fruit, brisk acidity, and subtle spice.",
    tags: ["acidic", "spicy", "fruity", "dry"],
  },
  {
    name: "Rose (Kunsag)",
    description:
      "Dry pink wine with strawberry and watermelon notes, served cold and refreshing.",
    tags: ["light", "dry", "fruity", "acidic"],
  },
];
