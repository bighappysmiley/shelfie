import type { Config } from "@netlify/functions";
import { json, error, handleOptions, parseBody } from "./utils";

export const config: Config = {
  path: "/api/vision",
};

interface VisionResult {
  title: string;
  author: string;
  confidence: number;
}

async function callClaude(
  imageBase64: string,
  mediaType: string,
  prompt: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const data = await res.json();
  const text = data.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";
  return text;
}

function parseJsonArray(text: string): VisionResult[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]) as VisionResult[];
  } catch {
    return [];
  }
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();
  if (request.method !== "POST") return error("Method not allowed", 405);

  try {
    const body = await parseBody<{
      image: string;
      mediaType?: string;
      mode: "cover" | "shelf";
    }>(request);

    if (!body.image || !body.mode) return error("image and mode are required");

    const mediaType = body.mediaType ?? "image/jpeg";
    const base64 = body.image.replace(/^data:image\/\w+;base64,/, "");

    if (body.mode === "cover") {
      const prompt = `Identify the book from this cover photo. Return ONLY a JSON object with these fields:
{"title": "book title", "author": "author name(s)", "confidence": 0.0-1.0}
No other text.`;

      const text = await callClaude(base64, mediaType, prompt);
      const objMatch = text.match(/\{[\s\S]*\}/);
      if (!objMatch) return json({ found: false });

      const result = JSON.parse(objMatch[0]) as VisionResult;
      return json({ ...result, found: true });
    }

    const prompt = `Analyze this photo of a bookshelf. Extract every visible book spine.
Return ONLY a JSON array. Each item: {"title": "...", "author": "...", "confidence": 0.0-1.0}
Include all readable spines, even partial ones. Sort left to right. No other text.`;

    const text = await callClaude(base64, mediaType, prompt);
    const books = parseJsonArray(text);
    return json({ books, count: books.length });
  } catch (e) {
    console.error(e);
    return error(e instanceof Error ? e.message : "Vision error", 500);
  }
};
