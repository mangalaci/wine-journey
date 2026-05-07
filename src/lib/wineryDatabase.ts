export type WineryEntry = {
  region: string;
  country: string;
};

export const WINERY_DATABASE: Record<string, WineryEntry> = {
  // Badacsony
  "jakab pince":         { region: "Badacsony", country: "Hungary" },
  "jakab winery":        { region: "Badacsony", country: "Hungary" },
  "jakab pinot":         { region: "Badacsony", country: "Hungary" },
  "jakab":               { region: "Badacsony", country: "Hungary" },
  "laposa":              { region: "Badacsony", country: "Hungary" },
  "szeremley":           { region: "Badacsony", country: "Hungary" },
  "villa tolnay":        { region: "Badacsony", country: "Hungary" },

  // Tokaj
  "royal tokaji":        { region: "Tokaj", country: "Hungary" },
  "oremus":              { region: "Tokaj", country: "Hungary" },
  "disznókő":            { region: "Tokaj", country: "Hungary" },
  "disznoko":            { region: "Tokaj", country: "Hungary" },
  "szepsy":              { region: "Tokaj", country: "Hungary" },
  "gróf degenfeld":      { region: "Tokaj", country: "Hungary" },
  "grof degenfeld":      { region: "Tokaj", country: "Hungary" },
  "demeter zoltán":      { region: "Tokaj", country: "Hungary" },
  "demeter zoltan":      { region: "Tokaj", country: "Hungary" },
  "sauska tokaj":        { region: "Tokaj", country: "Hungary" },

  // Eger
  "gál tibor":           { region: "Eger", country: "Hungary" },
  "gal tibor":           { region: "Eger", country: "Hungary" },
  "tűzkő":               { region: "Eger", country: "Hungary" },
  "tuzko":               { region: "Eger", country: "Hungary" },
  "juhász testvérek":    { region: "Eger", country: "Hungary" },
  "juhasz testverek":    { region: "Eger", country: "Hungary" },
  "juhász":              { region: "Eger", country: "Hungary" },
  "juhasz":              { region: "Eger", country: "Hungary" },
  "bolyki":              { region: "Eger", country: "Hungary" },
  "thummerer":           { region: "Eger", country: "Hungary" },
  "St. andrea":          { region: "Eger", country: "Hungary" },
  "st andrea":           { region: "Eger", country: "Hungary" },

  // Villány
  "sauska villány":      { region: "Villány", country: "Hungary" },
  "bock":                { region: "Villány", country: "Hungary" },
  "gere attila":         { region: "Villány", country: "Hungary" },
  "gere tamás":          { region: "Villány", country: "Hungary" },
  "gere tamas":          { region: "Villány", country: "Hungary" },
  "vylyan":              { region: "Villány", country: "Hungary" },
  "malatinszky":         { region: "Villány", country: "Hungary" },
  "csányi":              { region: "Villány", country: "Hungary" },
  "csanyi":              { region: "Villány", country: "Hungary" },
  "tiffán":              { region: "Villány", country: "Hungary" },
  "tiffan":              { region: "Villány", country: "Hungary" },
  "jackfall":            { region: "Villány", country: "Hungary" },

  // Szekszárd
  "heimann":             { region: "Szekszárd", country: "Hungary" },
  "vesztergombi":        { region: "Szekszárd", country: "Hungary" },
  "sebestyén":           { region: "Szekszárd", country: "Hungary" },
  "sebestyen":           { region: "Szekszárd", country: "Hungary" },
  "takler":              { region: "Szekszárd", country: "Hungary" },
  "planta familia":      { region: "Szekszárd", country: "Hungary" },
  "planta":              { region: "Szekszárd", country: "Hungary" },

  // Somló
  "kolonics":            { region: "Somló", country: "Hungary" },
  "fekete pince":        { region: "Somló", country: "Hungary" },
  "inhauser":            { region: "Somló", country: "Hungary" },

  // Etyek-Buda
  "etyeki kúria":        { region: "Etyek-Buda", country: "Hungary" },
  "etyeki kuria":        { region: "Etyek-Buda", country: "Hungary" },
  "haraszthy":           { region: "Etyek-Buda", country: "Hungary" },

  // Balaton-felvidék / Balatonfüred-Csopak
  "figula":              { region: "Balatonfüred-Csopak", country: "Hungary" },
  "lőrincz":             { region: "Balatonfüred-Csopak", country: "Hungary" },
  "lorincz":             { region: "Balatonfüred-Csopak", country: "Hungary" },

  // Sopron
  "pfneiszl":            { region: "Sopron", country: "Hungary" },
  "taschner":            { region: "Sopron", country: "Hungary" },
  "luka":                { region: "Sopron", country: "Hungary" },

  // Mátra
  "mátra":               { region: "Mátraalja", country: "Hungary" },
  "matra":               { region: "Mátraalja", country: "Hungary" },
};

export function lookupWinery(producerName: string): WineryEntry | null {
  const normalized = producerName.toLowerCase().trim();
  const sortedKeys = Object.keys(WINERY_DATABASE).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (normalized.includes(key.toLowerCase())) {
      return WINERY_DATABASE[key]!;
    }
  }
  return null;
}
