import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const PROMPT = `You are a wine expert. Analyze this wine label photo and identify the wine.

Return ONLY a valid JSON object with these fields:
{
  "name": "full wine name (producer + wine name)",
  "region": "region, country",
  "description": "1-2 sentence tasting note, approachable style",
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

    return NextResponse.json(wine);
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
