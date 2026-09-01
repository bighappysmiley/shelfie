export {
  moderateTextContent,
  normalizeForModeration,
  isBlockedImageFile,
  type TextModerationResult,
} from "./text";

import { supabase } from "../supabase";

export async function moderateImageContent(
  imageDataUrl: string,
  mediaType: string,
): Promise<{ safe: boolean; reason?: string }> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Sign in to upload images");

  const res = await fetch("/api/community/moderate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: "image",
      image: imageDataUrl,
      mediaType,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    safe?: boolean;
    reason?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(payload.error || "Could not verify image safety");
  }

  return {
    safe: Boolean(payload.safe),
    reason: payload.reason,
  };
}
