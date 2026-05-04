export async function getEmbedding(text: string): Promise<number[]> {
  const input = text.trim();
  if (!input) return [];

  const response = await fetch("/api/embedding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input }),
    cache: "no-store",
  });

  if (!response.ok) {
    let errorText = "";
    try {
      const data = (await response.json()) as { error?: string };
      errorText = data.error ? ` - ${data.error}` : "";
    } catch {
      // Ignore parse failure and use status text only.
    }
    throw new Error(
      `Embedding request failed: ${response.status} ${response.statusText}${errorText}`,
    );
  }

  const data = (await response.json()) as { embedding?: number[] };
  if (!Array.isArray(data.embedding)) return [];
  return data.embedding;
}
