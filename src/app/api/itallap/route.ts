import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const PROMPT = `You are a wine expert analyzing a restaurant wine list (one or more pages).
Extract ALL wines visible across all provided images — do not list duplicates.

For each wine return an object with:
- name: wine name as it appears on the list
- region: region and country (infer from producer name if not listed)
- description: 1 sentence style description
- tags: 3-5 descriptors chosen from: ["red","white","rosé","sparkling","sweet","dry","light","full-bodied","fruity","tannic","mineral","oaky","fresh","smooth","rich"]

Return ONLY a valid JSON array. No markdown, no explanation.
Example: [{"name":"Eger Bikavér","region":"Eger, Hungary","description":"Full-bodied red blend.","tags":["red","full-bodied","tannic"]}]

If the image is not a wine list, return: {"error":"Not a wine list"}`;

export async function POST(req: Request) {
  try {
    const body = await req.json() as { image?: string; images?: string[] };
    const rawImages = body.images ?? (body.image ? [body.image] : []);
    const imageParts = rawImages.map((img) => {
      const base64 = img.includes(",") ? img.split(",")[1] : img;
      return { inlineData: { data: base64, mimeType: "image/jpeg" as const } };
    });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [...imageParts, { text: PROMPT }],
        },
      ],
    });

    const text = (result.text ?? "").trim();
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean) as unknown;

    if (!Array.isArray(parsed)) {
      const err = (parsed as { error?: string }).error ?? "Nem sikerült olvasni a borlapot";
      return NextResponse.json({ error: err }, { status: 422 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Itallap error:", err);
    return NextResponse.json({ error: "Hiba a borlap feldolgozásakor" }, { status: 500 });
  }
}
