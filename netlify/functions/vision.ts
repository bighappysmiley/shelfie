import type { Config } from "@netlify/functions";
import { json, error, handleOptions, parseBody } from "./utils";

export const config: Config = {
  path: "/api/vision",
};

interface VisionBook {
  title: string;
  author: string;
  confidence: number;
}

/**
 * Free-tier Gemini vision (Google AI Studio).
 * Get a key at https://aistudio.google.com/apikey — set GEMINI_API_KEY in Netlify.
 */
async function callGemini(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey and add it in Netlify → Environment variables.",
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
    "";
  return text;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseJsonArray(text: string): VisionBook[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]) as VisionBook[];
    return Array.isArray(arr) ? arr : [];
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
      const prompt = `Identify the book from this cover photo. Return ONLY a JSON object:
{"title":"book title","author":"author name(s)","confidence":0.0-1.0}
No markdown, no other text.`;

      const text = await callGemini(base64, mediaType, prompt);
      const obj = parseJsonObject(text);
      if (!obj?.title) return json({ found: false });

      return json({
        found: true,
        title: String(obj.title),
        author: String(obj.author ?? ""),
        confidence: Number(obj.confidence ?? 0.7),
      });
    }

    const prompt = `Analyze this bookshelf photo. Extract every visible book spine.
Return ONLY a JSON array. Each item:
{"title":"...","author":"...","confidence":0.0-1.0}
Include all readable spines, left to right. No markdown, no other text.`;

    const text = await callGemini(base64, mediaType, prompt);
    const books = parseJsonArray(text).map((b) => ({
      title: String(b.title ?? "").trim(),
      author: String(b.author ?? "").trim(),
      confidence: Number(b.confidence ?? 0.5),
    })).filter((b) => b.title);

    return json({ books, count: books.length });
  } catch (e) {
    console.error(e);
    return error(e instanceof Error ? e.message : "Vision error", 500);
  }
};
