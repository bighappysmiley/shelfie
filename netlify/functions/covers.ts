import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { json, error, parseBody, corsHeaders } from "./utils";
import { withLibraryAuth } from "./lib/library-auth";
import { supabaseForToken } from "./lib/supabase";

export const config: Config = {
  path: "/api/covers",
};

function coversStore() {
  return getStore({ name: "shelfie-covers", consistency: "strong" });
}

function coverKey(libraryId: string, id: string) {
  return `${libraryId}/${id}`;
}

async function listUserLibraryIds(userId: string, accessToken: string): Promise<string[]> {
  const supabase = supabaseForToken(accessToken);
  const { data } = await supabase
    .from("library_members")
    .select("library_id")
    .eq("user_id", userId);
  return (data ?? []).map((row) => row.library_id as string);
}

async function resolveCover(
  libraryId: string,
  legacyUserId: string,
  accessToken: string,
  id: string,
): Promise<{ key: string; bytes: ArrayBuffer; contentType: string } | null> {
  const store = coversStore();
  const keysToTry: string[] = [coverKey(libraryId, id)];

  if (legacyUserId !== libraryId) {
    keysToTry.push(coverKey(legacyUserId, id));
  }

  const libraryIds = await listUserLibraryIds(legacyUserId, accessToken);
  for (const memberLibraryId of libraryIds) {
    const key = coverKey(memberLibraryId, id);
    if (!keysToTry.includes(key)) keysToTry.push(key);
  }

  for (const key of keysToTry) {
    const meta = await store.getMetadata(key);
    if (!meta) continue;

    const bytes = await store.get(key, { type: "arrayBuffer" });
    if (!bytes) continue;

    const contentType =
      (meta.metadata?.contentType as string | undefined) ?? "image/jpeg";

    return { key, bytes, contentType };
  }

  return null;
}

export default withLibraryAuth(async (request, ctx) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (request.method === "GET") {
    if (!id) return error("Cover id required");
    const resolved = await resolveCover(ctx.libraryId, ctx.user.id, ctx.accessToken, id);
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
    const blobMeta = { metadata: { contentType: mediaType, libraryId: ctx.libraryId } };
    const store = coversStore();
    await store.set(coverKey(ctx.libraryId, coverId), buffer, blobMeta);
    if (ctx.user.id !== ctx.libraryId) {
      await store.set(coverKey(ctx.user.id, coverId), buffer, blobMeta);
    }

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
