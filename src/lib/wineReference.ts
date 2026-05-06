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
    tags: ["dry", "acidic", "mineral", "fresh"],
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
    tags: ["dry", "fresh", "fruity", "acidic"],
  },
  {
    name: "Oaked Chardonnay",
    description:
      "Richer white style layered with vanilla, baked apple, and creamy oak spice.",
    tags: ["dry", "bold", "fruity", "spicy"],
  },
  {
    name: "Pinot Noir",
    description:
      "Elegant lighter red with sour cherry, forest floor, and silky tannins.",
    tags: ["light", "fruity", "dry", "tannic"],
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
    tags: ["spicy", "bold", "dry", "tannic"],
  },
  {
    name: "Cabernet Sauvignon",
    description:
      "Bold full-bodied red driven by blackcurrant, cedar, and firm tannins.",
    tags: ["bold", "dry", "tannic", "spicy"],
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
    tags: ["light", "dry", "fruity", "fresh"],
  },

  // Magyar fehérek
  {
    name: "Hárslevelű",
    description:
      "Aromatic Tokaj white with linden blossom, ripe peach, and honeyed minerality; dry to off-dry.",
    tags: ["fruity", "mineral", "acidic", "fresh"],
  },
  {
    name: "Irsai Olivér",
    description:
      "Light, exuberant Hungarian white bursting with muscat-like grape and peach aromas; ideal as an aperitif.",
    tags: ["light", "fruity", "fresh", "sweet"],
  },
  {
    name: "Cserszegi Fűszeres",
    description:
      "Aromatic Hungarian white with rose petal, spice, and tropical fruit; lively and distinctive character.",
    tags: ["fruity", "spicy", "light", "fresh"],
  },
  {
    name: "Szürkebarát",
    description:
      "Badacsony Pinot Gris with volcanic minerality, ripe pear, and rich textured palate.",
    tags: ["dry", "mineral", "bold", "fruity"],
  },
  {
    name: "Juhfark",
    description:
      "Rare Somló white with fierce acidity, green apple, and stony volcanic mineral grip; age-worthy.",
    tags: ["dry", "acidic", "mineral", "light"],
  },
  {
    name: "Tramini",
    description:
      "Aromatic Hungarian white with rose, lychee, and spice; off-dry with a perfumed, lingering finish.",
    tags: ["spicy", "fruity", "sweet", "light"],
  },
  {
    name: "Egri Leányka",
    description:
      "Delicate Eger white with soft floral notes, gentle acidity, and easy-drinking elegance.",
    tags: ["light", "dry", "fresh", "fruity"],
  },
  {
    name: "Tokaji Late Harvest",
    description:
      "Semi-sweet Tokaj white with apricot, honey, and lively acidity; lighter and more refreshing than Aszú.",
    tags: ["sweet", "fruity", "acidic", "light"],
  },

  // Magyar vörösök
  {
    name: "Zweigelt",
    description:
      "Juicy, easy-drinking red with bright cherry, light body, and smooth approachable tannins.",
    tags: ["light", "fruity", "dry", "acidic"],
  },
  {
    name: "Portugieser",
    description:
      "Simple light Hungarian red with soft red berry fruit, low tannin, and refreshing drinkability.",
    tags: ["light", "fruity", "dry", "fresh"],
  },
  {
    name: "Villányi Syrah",
    description:
      "Spicy, full-bodied Villány red with dark plum, black pepper, and smoky depth.",
    tags: ["bold", "spicy", "dry", "tannic"],
  },

  // Nemzetközi klasszikusok
  {
    name: "Riesling",
    description:
      "Crisp dry white with lime, green apple, and steely minerality; high acidity and long finish.",
    tags: ["dry", "acidic", "mineral", "fresh"],
  },
  {
    name: "Sangiovese",
    description:
      "Italian classic with sour cherry, dried herbs, and rustic tannins; food-friendly and lively.",
    tags: ["acidic", "dry", "fruity", "tannic"],
  },
  {
    name: "Tempranillo",
    description:
      "Spanish red with dried cherry, leather, and vanilla oak; medium-bodied with good structure.",
    tags: ["dry", "fruity", "tannic", "spicy"],
  },
  {
    name: "Grenache",
    description:
      "Medium-bodied red with ripe red berry, gentle spice, and herbal warmth; silky and approachable.",
    tags: ["fruity", "spicy", "dry", "light"],
  },
];
