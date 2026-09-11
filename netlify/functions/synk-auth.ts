import type { Config } from "@netlify/functions";
import { json, error, handleOptions, parseBody } from "./utils";
import { getBearerToken, AuthError } from "./lib/auth";
import { supabaseAdmin, hasServiceRole } from "./lib/supabase-admin";
import {
  exchangeSynkPass,
  synkSyntheticEmail,
  SynkError,
  type SynkProfile,
} from "./lib/synk";

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

async function requireUserFromBearer(req: Request) {
  const token = getBearerToken(req);
  if (!token) throw new AuthError("Sign in to continue", 401);
  const admin = supabaseAdmin();
  const { data, error: authError } = await admin.auth.getUser(token);
  if (authError || !data.user) throw new AuthError("Session expired. Please sign in again.", 401);
  return data.user;
}

async function findUserIdBySynk(synkProfileId: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("synk_identities")
    .select("user_id")
    .eq("synk_profile_id", synkProfileId)
    .maybeSingle();
  return data?.user_id as string | undefined;
}

async function upsertSynkIdentity(userId: string, profile: SynkProfile) {
  const admin = supabaseAdmin();
  const { error: upsertError } = await admin.from("synk_identities").upsert(
    {
      user_id: userId,
      synk_profile_id: profile.id,
      synk_code: profile.synkCode || null,
      display_name: profile.name || null,
      photo_url: profile.photoUrl || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (upsertError) throw upsertError;
}

async function issueSessionForUser(userId: string, email: string) {
  const admin = supabaseAdmin();
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${siteOriginFromEnv()}/auth/callback`,
    },
  });
  if (linkError) throw linkError;
  const props = data.properties as { hashed_token?: string } | undefined;
  const tokenHash = props?.hashed_token;
  if (!tokenHash) throw new Error("Could not create Synk session token");
  return { token_hash: tokenHash, email, user_id: data.user?.id || userId };
}

function siteOriginFromEnv(): string {
  return (process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.APP_URL || "").replace(/\/$/, "");
}

async function resolveOrCreateUser(profile: SynkProfile) {
  const admin = supabaseAdmin();
  const existingId = await findUserIdBySynk(profile.id);
  if (existingId) {
    const { data } = await admin.auth.admin.getUserById(existingId);
    const email = data.user?.email || synkSyntheticEmail(profile.id);
    return { userId: existingId, email };
  }

  const email = synkSyntheticEmail(profile.id);
  const display = (profile.name || "").trim() || "Synk member";
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: display,
      avatar_url: profile.photoUrl || undefined,
      synk_profile_id: profile.id,
      synk_code: profile.synkCode || undefined,
      auth_provider: "synk",
    },
  });

  if (!createError && created.user) {
    await upsertSynkIdentity(created.user.id, profile);
    return { userId: created.user.id, email };
  }

  // Email already exists — attach identity and continue.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !linkData.user) {
    throw createError || linkError || new Error("Failed to create Synk user");
  }
  await upsertSynkIdentity(linkData.user.id, profile);
  return { userId: linkData.user.id, email };
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (!hasServiceRole()) {
      return error("Server missing SUPABASE_SERVICE_ROLE_KEY", 503);
    }

    if (req.method === "GET") {
      const user = await requireUserFromBearer(req);
      const admin = supabaseAdmin();
      const { data } = await admin
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
      const user = await requireUserFromBearer(req);
      const admin = supabaseAdmin();
      const { error: delError } = await admin.from("synk_identities").delete().eq("user_id", user.id);
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
      const user = await requireUserFromBearer(req);
      const takenBy = await findUserIdBySynk(profile.id);
      if (takenBy && takenBy !== user.id) {
        return error("This Synk ID is already linked to another account", 409);
      }

      await upsertSynkIdentity(user.id, profile);
      await supabaseAdmin().auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
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

    const { userId, email } = await resolveOrCreateUser(profile);
    const session = await issueSessionForUser(userId, email);
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
