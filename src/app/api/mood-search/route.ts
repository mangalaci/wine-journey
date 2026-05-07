import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { WINE_REFERENCE } from "@/lib/wineReference";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const wineList = WINE_REFERENCE.map((w) => `- ${w.name}: ${w.description}`).join("\n");

export async function POST(req: Request) {
  const { query } = await req.json() as { query: string };

  if (!query?.trim()) {
    return NextResponse.json({ error: "Empty query" }, { status: 400 });
  }

  const prompt = `You are a sommelier. A user is looking for a wine for this mood or occasion: "${query}"

Pick the 2-3 best matching wines from this list:
${wineList}

Return ONLY a valid JSON array like this:
[
  { "name": "exact wine name from the list", "reason": "one short sentence why it fits" },
  ...
]

No markdown, no explanation — just the raw JSON array.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    const text = (result.text ?? "").trim();
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const picks = JSON.parse(clean) as { name: string; reason: string }[];

    const enriched = picks.map((pick) => {
      const ref = WINE_REFERENCE.find((w) => w.name === pick.name);
      return {
        name: pick.name,
        reason: pick.reason,
        tags: ref?.tags ?? [],
      };
    });

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
