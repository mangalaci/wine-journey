import { NextResponse } from "next/server";
import OpenAI from "openai";

const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string };
    const input = (text ?? "").trim();
    if (!input) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY");
      return new Response(JSON.stringify({ error: "Missing API key" }), { status: 500 });
    }

    const client = new OpenAI({ apiKey });
    const result = await client.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input,
    });

    const embedding = result.data[0]?.embedding ?? [];

    return NextResponse.json({ embedding });
  } catch (err) {
    console.error("OpenAI embedding route error:", err);
    return NextResponse.json({ error: "Embedding failed" }, { status: 500 });
  }
}
