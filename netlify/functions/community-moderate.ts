import type { Config } from "@netlify/functions";
import { json, error, parseBody } from "./utils";
import { withAuth } from "./lib/auth";
import { moderateTextContent } from "./lib/moderation/text";

export const config: Config = {
  path: "/api/community/moderate",
};

async function callGeminiModeration(imageBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Image moderation is unavailable. Try again later.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are a strict family-friendly content moderator for an all-ages community chat app.

Analyze this image for ANY content that is inappropriate, including but not limited to:
- Nudity, sexual content, or suggestive poses
- Violence, gore, weapons used threateningly
- Hate symbols, extremist imagery, or slurs in text
- Drugs, alcohol promotion, or illegal activity
- Profanity or offensive text in the image
- Shock content, disturbing imagery, or anything not suitable for children

Be strict. When in doubt, mark as unsafe.

Return ONLY valid JSON with no markdown:
{"safe":true}
or
{"safe":false,"reason":"brief user-facing explanation"}`;

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
        temperature: 0,
        maxOutputTokens: 256,
      },
    }),
  });

  if (!res.ok) {
    console.error("Moderation provider error", await res.text());
    throw new Error("Could not verify image safety. Please try a different image.");
  }

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? ""
  );
}

function parseModerationJson(text: string): { safe: boolean; reason?: string } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { safe: false, reason: "Image could not be verified." };
  try {
    const obj = JSON.parse(match[0]) as { safe?: boolean; reason?: string };
    return {
      safe: Boolean(obj.safe),
      reason: obj.reason ? String(obj.reason) : undefined,
    };
  } catch {
    return { safe: false, reason: "Image could not be verified." };
  }
}

export default withAuth(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "POST") return error("Method not allowed", 405);

  const body = await parseBody<{
    type: "text" | "image";
    text?: string;
    image?: string;
    mediaType?: string;
    extraKeywords?: string[];
  }>(request);

  if (body.type === "text") {
    if (!body.text?.trim()) return error("text is required", 400);
    const result = moderateTextContent(body.text, body.extraKeywords ?? []);
    if (!result.allowed) {
      return json({ safe: false, reason: result.reason }, 200);
    }
    return json({ safe: true });
  }

  if (body.type === "image") {
    if (!body.image) return error("image is required", 400);
    const mediaType = body.mediaType ?? "image/jpeg";
    if (mediaType === "image/gif") {
      return json({ safe: false, reason: "GIF uploads are not allowed." }, 200);
    }

    const base64 = body.image.replace(/^data:image\/\w+;base64,/, "");
    const raw = await callGeminiModeration(base64, mediaType);
    const verdict = parseModerationJson(raw);
    if (!verdict.safe) {
      return json(
        {
          safe: false,
          reason: verdict.reason || "Image blocked: inappropriate content is not allowed.",
        },
        200,
      );
    }
    return json({ safe: true });
  }

  return error("type must be text or image", 400);
});
