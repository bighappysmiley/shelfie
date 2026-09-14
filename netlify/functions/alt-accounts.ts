import type { Config } from "@netlify/functions";
import { randomBytes, randomUUID } from "node:crypto";
import { json, error, parseBody } from "./utils";
import { withAuth, AuthError } from "./lib/auth";
import { supabaseAdmin, hasServiceRole } from "./lib/supabase-admin";

export const config: Config = {
  path: "/api/alt-accounts",
};

const PLATFORM_OWNER_EMAIL = "hillelfrankel0@icloud.com";

async function assertAdmin(user: { id: string; email?: string | null }) {
  const email = (user.email || "").trim().toLowerCase();
  if (email === PLATFORM_OWNER_EMAIL) return;

  const admin = supabaseAdmin();
  const { data: staff, error: staffErr } = await admin
    .from("staff")
    .select("email, role")
    .ilike("email", email)
    .maybeSingle();
  if (staffErr) throw staffErr;
  if (!staff || staff.role !== "admin") {
    throw new AuthError("Only admins can manage alt accounts", 403);
  }
}

function internalAltEmail(slug: string) {
  // Internal-only address for Supabase Auth. Never shown in the Pine UI.
  return `alt-${slug}@pine.alt`;
}

async function mintTokenHashForUserId(userId: string): Promise<string> {
  const admin = supabaseAdmin();
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userData.user?.email) {
    throw new Error("Could not find account to switch into");
  }
  const { data, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });
  if (linkErr) throw linkErr;
  const props = (data as { properties?: Record<string, string> } | null)?.properties ?? {};
  const tokenHash = props.hashed_token || props.hashedToken;
  if (!tokenHash) throw new Error("Could not mint alt session");
  return tokenHash;
}

export default withAuth(async (request, user) => {
  if (request.method !== "POST") return error("Method not allowed", 405);
  if (!hasServiceRole()) {
    return error("Alt accounts are not configured on this server (missing service role).", 503);
  }

  const body = await parseBody<{
    action?: "create" | "switch" | "return" | "delete";
    label?: string;
    id?: string;
  }>(request);

  const action = (body.action || "").toLowerCase();
  const admin = supabaseAdmin();
  const isAlt = Boolean(user.app_metadata?.is_alt || user.user_metadata?.is_alt);

  if (action === "create") {
    if (isAlt) return error("Switch back to your main account to create alts.", 403);
    await assertAdmin(user);

    const label = (body.label || "").trim();
    if (!label) return error("Enter a name for this alt", 400);
    if (label.length > 40) return error("Alt name is too long", 400);

    const slug = randomUUID().replace(/-/g, "").slice(0, 16);
    const email = internalAltEmail(slug);
    const password = randomBytes(24).toString("base64url");

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        is_alt: true,
        alt_label: label,
        alt_of: user.id,
        full_name: label,
        name: label,
      },
      app_metadata: {
        is_alt: true,
        alt_of: user.id,
        alt_label: label,
      },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message || "Could not create alt account");
    }

    const { data: row, error: linkErr } = await admin
      .from("staff_linked_accounts")
      .insert({
        owner_user_id: user.id,
        linked_email: email,
        label,
        linked_user_id: created.user.id,
      })
      .select("id, label, linked_user_id")
      .single();
    if (linkErr) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      throw linkErr;
    }

    await admin.from("user_profiles").upsert({
      user_id: created.user.id,
      display_name: label,
      updated_at: new Date().toISOString(),
    });

    return json({
      ok: true,
      account: {
        id: row.id,
        label: row.label,
        linkedUserId: row.linked_user_id,
      },
    });
  }

  if (action === "switch") {
    if (isAlt) return error("Switch back to your main account first.", 403);
    await assertAdmin(user);
    const id = (body.id || "").trim();
    if (!id) return error("Missing alt id", 400);

    const { data: link, error: linkErr } = await admin
      .from("staff_linked_accounts")
      .select("id, owner_user_id, linked_user_id, label")
      .eq("id", id)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link?.linked_user_id) return error("Alt account not found", 404);

    const tokenHash = await mintTokenHashForUserId(link.linked_user_id as string);
    return json({
      ok: true,
      token_hash: tokenHash,
      label: link.label,
      linkedUserId: link.linked_user_id,
      ownerUserId: user.id,
    });
  }

  if (action === "return") {
    if (!isAlt) return error("You are already on your main account.", 400);
    const ownerId = String(user.app_metadata?.alt_of || user.user_metadata?.alt_of || "");
    if (!ownerId) return error("This alt is not linked to a main account.", 400);

    const { data: link, error: linkErr } = await admin
      .from("staff_linked_accounts")
      .select("id")
      .eq("owner_user_id", ownerId)
      .eq("linked_user_id", user.id)
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) {
      return error("Alt link was removed. Sign in to your main account with email.", 403);
    }

    const tokenHash = await mintTokenHashForUserId(ownerId);
    return json({ ok: true, token_hash: tokenHash, ownerUserId: ownerId });
  }

  if (action === "delete") {
    if (isAlt) return error("Switch back to your main account to remove alts.", 403);
    await assertAdmin(user);
    const id = (body.id || "").trim();
    if (!id) return error("Missing alt id", 400);

    const { data: link, error: linkErr } = await admin
      .from("staff_linked_accounts")
      .select("id, linked_user_id")
      .eq("id", id)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) return error("Alt account not found", 404);

    const { error: delErr } = await admin.from("staff_linked_accounts").delete().eq("id", id);
    if (delErr) throw delErr;

    if (link.linked_user_id) {
      await admin.auth.admin.deleteUser(link.linked_user_id as string).catch((err) => {
        console.warn("Could not delete alt auth user:", err);
      });
    }

    return json({ ok: true });
  }

  return error("Unknown action", 400);
});
