import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { json, error, parseBody, corsHeaders } from "./utils";
import { withAuth } from "./lib/auth";

export const config: Config = {
  path: "/api/covers",
};

function coversStore() {
  return getStore({ name: "shelfie-covers", consistency: "strong" });
}

function coverKey(userId: string, id: string) {
  return `${userId}/${id}`;
}

export default withAuth(async (request, user) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (request.method === "GET") {
    if (!id) return error("Cover id required");
    const store = coversStore();
    const key = coverKey(user.id, id);
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
    const body = await parseBody<{
      image: string;
      mediaType?: string;
    }>(request);

    if (!body.image) return error("image is required");

    const mediaType = body.mediaType ?? "image/jpeg";
    const base64 = body.image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    if (buffer.byteLength > 4_500_000) {
      return error("Image too large (max ~4MB). Try a smaller photo.");
    }

    const coverId = randomUUID();
    await coversStore().set(coverKey(user.id, coverId), buffer, {
      metadata: { contentType: mediaType, userId: user.id },
    });

    return json({ id: coverId, url: `/api/covers?id=${coverId}` }, 201);
  }

  if (request.method === "DELETE") {
    if (!id) return error("Cover id required");
    await coversStore().delete(coverKey(user.id, id));
    return json({ ok: true });
  }

  return error("Method not allowed", 405);
});
