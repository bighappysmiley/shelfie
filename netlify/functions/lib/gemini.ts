import { GoogleGenAI } from "@google/genai";

/**
 * Gemini via Netlify AI Gateway (injected GEMINI_API_KEY / GOOGLE_GEMINI_BASE_URL)
 * or a project-level GEMINI_API_KEY. Prefer the SDK so gateway base URL is honored.
 */
export function getGeminiClient(): GoogleGenAI {
  // Gateway injects credentials at function runtime after a production deploy.
  // Prefer provider vars; fall back to the always-injected gateway pair.
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.NETLIFY_AI_GATEWAY_KEY?.trim() ||
    "";
  const hasGatewayBase = Boolean(
    process.env.GOOGLE_GEMINI_BASE_URL?.trim() ||
      process.env.NETLIFY_AI_GATEWAY_BASE_URL?.trim(),
  );
  if (!apiKey && !hasGatewayBase) {
    throw new Error("Image moderation is unavailable. Try again later.");
  }
  // Empty constructor lets the SDK read GEMINI_API_KEY + GOOGLE_GEMINI_BASE_URL.
  return new GoogleGenAI(apiKey ? { apiKey } : {});
}

export function geminiModel(fallback = "gemini-2.5-flash"): string {
  return (process.env.GEMINI_MODEL || fallback).trim() || fallback;
}

export async function geminiGenerateText(opts: {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  unavailableMessage?: string;
}): Promise<string> {
  let client: GoogleGenAI;
  try {
    client = getGeminiClient();
  } catch (err) {
    if (opts.unavailableMessage) throw new Error(opts.unavailableMessage);
    throw err;
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: opts.prompt },
  ];
  if (opts.imageBase64 && opts.mimeType) {
    parts.push({
      inlineData: {
        mimeType: opts.mimeType,
        data: opts.imageBase64,
      },
    });
  }

  const response = await client.models.generateContent({
    model: geminiModel(),
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0,
      maxOutputTokens: 256,
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw new Error("Could not verify image safety. Please try a different image.");
  }
  return text;
}
