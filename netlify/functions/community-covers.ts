import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { json, error, parseBody, corsHeaders } from "./utils";

export const config: Config = {
  path: "/api/community/covers",
};

function coversStore() {
  return getStore({ name: "shelfie-covers", consistency: "strong" });
}

function communityCoverKey(userId: string, id: string) {
  return `community/${userId}/${id}`;
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") {
    const { handleOptions } = await import("./utils");
    return handleOptions();
  }

  try {
    const { requireUser } = await import("./lib/auth");
    const user = await requireUser(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (request.method === "GET") {
      if (!id) return error("Cover id required");
      const store = coversStore();
      const key = communityCoverKey(user.id, id);
      const meta = await store.getMetadata(key);
      if (!meta) return error("Cover not found", 404);
      const bytes = await store.get(key, { type: "arrayBuffer" });
      if (!bytes) return error("Cover not found", 404);
      const contentType =
        (meta.metadata?.contentType as string | undefined) ?? "image/jpeg";
      return new Response(bytes, {
        headers: corsHeaders({
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=31536000, immutable",
        }),
      });
    }

    if (request.method === "POST") {
      const body = await parseBody<{ image: string; mediaType?: string }>(request);
      if (!body.image) return error("image is required");

      const mediaType = body.mediaType ?? "image/jpeg";
      const base64 = body.image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      if (buffer.byteLength > 4_500_000) {
        return error("Image too large (max ~4MB). Try a smaller photo.");
      }

      const coverId = randomUUID();
      await coversStore().set(communityCoverKey(user.id, coverId), buffer, {
        metadata: { contentType: mediaType, userId: user.id },
      });
      return json({ id: coverId, url: `/api/community/covers?id=${coverId}` }, 201);
    }

    return error("Method not allowed", 405);
  } catch (err) {
    const { authErrorResponse } = await import("./lib/auth");
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error(err);
    return error(err instanceof Error ? err.message : "Something went wrong", 500);
  }
};
