import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { lookupWinery } from "@/lib/wineryDatabase";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const PROMPT = `You are a wine expert. Analyze this wine label photo and identify the wine.

Use the label to identify the producer and wine name, then rely on your knowledge to fill in accurate details — the label text may be partially obscured or misread, so prefer your own knowledge about the producer over what you literally see on the label.

Return ONLY a valid JSON object with these fields:
{
  "name": "full wine name including the winery/producer name (e.g. 'Jakab Pince Pinot Noir', 'Gere Attila Villányi Cabernet')",
  "region": "accurate region and country based on your knowledge of the producer",
  "description": "1-2 sentence tasting note based on the grape variety and region, approachable style",
  "tags": ["pick 2-3 from: red, white, rosé, sparkling, sweet, dry, light, full-bodied, fruity, tannic, mineral, oaky, fresh"]
}

If the label is not a wine bottle or is unreadable, return:
{ "error": "Could not identify wine from this image" }

No markdown, no explanation — just the raw JSON object.`;

export async function POST(req: Request) {
  try {
    const { image } = await req.json() as { image: string };

    // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,")
    const base64 = image.includes(",") ? image.split(",")[1] : image;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { inlineData: { data: base64, mimeType: "image/jpeg" } },
            { text: PROMPT },
          ],
        },
      ],
    });

    const text = (result.text ?? "").trim();

    // Strip markdown code fences if Gemini wraps the JSON anyway
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    const wine = JSON.parse(clean) as {
      name?: string;
      region?: string;
      description?: string;
      tags?: string[];
      error?: string;
    };

    if (wine.error) {
      return NextResponse.json({ error: wine.error }, { status: 422 });
    }

    if (wine.name) {
      const match = lookupWinery(wine.name);
      if (match) {
        wine.region = `${match.region}, ${match.country}`;
      }
    }

    return NextResponse.json(wine);
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
