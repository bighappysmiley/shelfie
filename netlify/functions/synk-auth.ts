import type { Config } from "@netlify/functions";
import { json, error, handleOptions, parseBody } from "./utils";
import { getBearerToken, requireUser, AuthError } from "./lib/auth";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseForToken } from "./lib/supabase";
import { exchangeSynkPass, SynkError, type SynkProfile } from "./lib/synk";

function siteOrigin(req: Request): string {
  const fromEnv = (process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.APP_URL || "").replace(
    /\/$/,
    "",
  );
  if (fromEnv) return fromEnv;
  try {
    return new URL(req.url).origin;
  } catch {
    return "http://localhost:8888";
  }
}

async function mintSessionViaEdge(profile: SynkProfile, redirectTo: string) {
  const bridge = (process.env.SYNK_BRIDGE_SECRET || "").trim();
  if (!bridge) {
    throw new Error("Server missing SYNK_BRIDGE_SECRET");
  }

  const endpoint = `${SUPABASE_URL}/functions/v1/synk-mint-session`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      "x-synk-bridge-secret": bridge,
    },
    body: JSON.stringify({
      profile: {
        id: profile.id,
        synkCode: profile.synkCode || null,
        name: profile.name || null,
        photoUrl: profile.photoUrl || null,
      },
      redirectTo,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    token_hash?: string;
    email?: string;
    user_id?: string;
  };

  if (!res.ok || !data.ok || !data.token_hash) {
    throw new Error(data.error || "Could not mint Synk session");
  }

  return {
    token_hash: data.token_hash,
    email: data.email || null,
    user_id: data.user_id || null,
  };
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method === "GET") {
      const user = await requireUser(req);
      const token = getBearerToken(req)!;
      const client = supabaseForToken(token);
      const { data } = await client
        .from("synk_identities")
        .select("synk_profile_id, synk_code, display_name, photo_url, linked_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return json({
        linked: Boolean(data),
        identity: data
          ? {
              synkProfileId: data.synk_profile_id,
              synkCode: data.synk_code,
              displayName: data.display_name,
              photoUrl: data.photo_url,
              linkedAt: data.linked_at,
            }
          : null,
      });
    }

    if (req.method === "DELETE") {
      const user = await requireUser(req);
      const token = getBearerToken(req)!;
      const client = supabaseForToken(token);
      const { error: delError } = await client.from("synk_identities").delete().eq("user_id", user.id);
      if (delError) throw delError;
      return json({ ok: true, linked: false });
    }

    if (req.method !== "POST") return error("Method not allowed", 405);

    const body = await parseBody<{
      action?: string;
      synk_pass?: string;
      pass?: string;
      synk_assertion?: string;
      assertion?: string;
    }>(req);

    const action = (body.action || "signin").toLowerCase();
    const pass = String(body.synk_pass || body.pass || "").trim();
    const assertion = String(body.synk_assertion || body.assertion || "").trim() || undefined;
    if (!pass && !assertion) return error("Missing synk_pass", 400);

    const exchanged = await exchangeSynkPass(pass, assertion);
    const profile = exchanged.profile;

    if (action === "link") {
      const user = await requireUser(req);
      const token = getBearerToken(req)!;
      const client = supabaseForToken(token);

      const { error: upsertError } = await client.from("synk_identities").upsert(
        {
          user_id: user.id,
          synk_profile_id: profile.id,
          synk_code: profile.synkCode || null,
          display_name: profile.name || null,
          photo_url: profile.photoUrl || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (upsertError) {
        if (upsertError.code === "23505") {
          return error("This Synk ID is already linked to another account", 409);
        }
        throw upsertError;
      }

      await client.auth.updateUser({
        data: {
          full_name: profile.name || user.user_metadata?.full_name,
          avatar_url: profile.photoUrl || user.user_metadata?.avatar_url,
          synk_profile_id: profile.id,
          synk_code: profile.synkCode || undefined,
        },
      });

      return json({
        ok: true,
        linked: true,
        identity: {
          synkProfileId: profile.id,
          synkCode: profile.synkCode || null,
          displayName: profile.name || null,
          photoUrl: profile.photoUrl || null,
        },
      });
    }

    const session = await mintSessionViaEdge(profile, `${siteOrigin(req)}/auth/callback`);
    return json({
      ok: true,
      token_hash: session.token_hash,
      email: session.email,
      user_id: session.user_id,
      profile: {
        id: profile.id,
        synkCode: profile.synkCode || null,
        name: profile.name || null,
        photoUrl: profile.photoUrl || null,
      },
      redirectTo: `${siteOrigin(req)}/auth/callback`,
    });
  } catch (err) {
    if (err instanceof AuthError) return error(err.message, err.status);
    if (err instanceof SynkError) return error(err.message, err.status);
    const message = err instanceof Error ? err.message : "Synk auth failed";
    console.error("synk-auth error:", message);
    return error(message, 500);
  }
};

export const config: Config = {
  path: "/api/synk-auth",
};
