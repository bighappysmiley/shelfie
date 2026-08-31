import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { json, error, parseBody, corsHeaders } from "./utils";
import { withLibraryAuth } from "./lib/library-auth";

export const config: Config = {
  path: "/api/covers",
};

function coversStore() {
  return getStore({ name: "shelfie-covers", consistency: "strong" });
}

function coverKey(libraryId: string, id: string) {
  return `${libraryId}/${id}`;
}

async function resolveCover(
  libraryId: string,
  legacyUserId: string,
  id: string,
): Promise<{ key: string; bytes: ArrayBuffer; contentType: string } | null> {
  const store = coversStore();
  const primaryKey = coverKey(libraryId, id);
  let meta = await store.getMetadata(primaryKey);
  let key = primaryKey;

  if (!meta && legacyUserId !== libraryId) {
    const legacyKey = coverKey(legacyUserId, id);
    meta = await store.getMetadata(legacyKey);
    key = legacyKey;
  }

  if (!meta) return null;

  const bytes = await store.get(key, { type: "arrayBuffer" });
  if (!bytes) return null;

  const contentType =
    (meta.metadata?.contentType as string | undefined) ?? "image/jpeg";

  return { key, bytes, contentType };
}

export default withLibraryAuth(async (request, ctx) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (request.method === "GET") {
    if (!id) return error("Cover id required");
    const resolved = await resolveCover(ctx.libraryId, ctx.user.id, id);
    if (!resolved) return error("Cover not found", 404);

    return new Response(resolved.bytes, {
      headers: corsHeaders({
        "Content-Type": resolved.contentType,
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
    await coversStore().set(coverKey(ctx.libraryId, coverId), buffer, {
      metadata: { contentType: mediaType, libraryId: ctx.libraryId },
    });

    return json({ id: coverId, url: `/api/covers?id=${coverId}` }, 201);
  }

  if (request.method === "DELETE") {
    if (!id) return error("Cover id required");
    const store = coversStore();
    await store.delete(coverKey(ctx.libraryId, id));
    if (ctx.user.id !== ctx.libraryId) {
      await store.delete(coverKey(ctx.user.id, id));
    }
    return json({ ok: true });
  }

  return error("Method not allowed", 405);
});
