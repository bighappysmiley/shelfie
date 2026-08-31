import type { Config } from "@netlify/functions";
import { json, error, parseBody } from "./utils";
import { withAuth } from "./lib/auth";
import { supabaseForToken } from "./lib/supabase";
import { loadData, saveData } from "./lib/store";

export const config: Config = {
  path: "/api/libraries",
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.trim();
}

async function ensureDefaultLibrary(
  accessToken: string,
  userId: string,
): Promise<void> {
  const supabase = supabaseForToken(accessToken);

  const { error: rpcErr } = await supabase.rpc("ensure_default_library");
  if (rpcErr) {
    // Fallback to direct inserts if RPC unavailable
    const { data: memberships } = await supabase
      .from("library_members")
      .select("library_id")
      .eq("user_id", userId)
      .limit(1);

    if (memberships && memberships.length > 0) return;

    const { data: library, error: libErr } = await supabase
      .from("libraries")
      .insert({ name: "My Library", owner_id: userId })
      .select("id")
      .single();

    if (libErr || !library) {
      throw new Error(libErr?.message || "Could not create default library");
    }

    const { error: memberErr } = await supabase.from("library_members").insert({
      library_id: library.id,
      user_id: userId,
      role: "owner",
    });

    if (memberErr) {
      throw new Error(memberErr.message);
    }
  }

  const { data: memberships } = await supabase
    .from("library_members")
    .select("library_id")
    .eq("user_id", userId)
    .limit(1);

  const libraryId = memberships?.[0]?.library_id as string | undefined;
  if (!libraryId) return;

  const legacy = await loadData(libraryId, userId);
  if (legacy.books.length || legacy.borrowers.length || legacy.loans.length) {
    await saveData(libraryId, legacy);
  }
}

export default withAuth(async (request, user) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const accessToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  if (!accessToken) return error("Sign in to continue", 401);

  const supabase = supabaseForToken(accessToken);

  if (request.method === "GET" && !action) {
    await ensureDefaultLibrary(accessToken, user.id);

    const { data: rows, error: listErr } = await supabase
      .from("library_members")
      .select("role, libraries(id, name, owner_id, created_at, updated_at)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true });

    if (listErr) return error(listErr.message, 500);

    const libraries = (rows ?? [])
      .map((row) => {
        const lib = row.libraries as {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        } | null;
        if (!lib) return null;
        return {
          id: lib.id,
          name: lib.name,
          ownerId: lib.owner_id,
          role: row.role,
          createdAt: lib.created_at,
          updatedAt: lib.updated_at,
        };
      })
      .filter((lib): lib is NonNullable<typeof lib> => lib != null);

    return json({ libraries });
  }

  if (request.method === "POST" && !action) {
    const body = await parseBody<{ name?: string }>(request);
    const name = (body.name ?? "New Library").trim() || "New Library";

    const { data: library, error: createErr } = await supabase
      .from("libraries")
      .insert({ name, owner_id: user.id })
      .select("id, name, owner_id, created_at, updated_at")
      .single();

    if (createErr || !library) return error(createErr?.message || "Create failed", 500);

    const { error: memberErr } = await supabase.from("library_members").insert({
      library_id: library.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberErr) return error(memberErr.message, 500);

    return json(
      {
        id: library.id,
        name: library.name,
        ownerId: library.owner_id,
        role: "owner",
        createdAt: library.created_at,
        updatedAt: library.updated_at,
      },
      201,
    );
  }

  if (request.method === "PATCH" && !action) {
    const id = url.searchParams.get("id");
    if (!id) return error("Library id required");

    const body = await parseBody<{ name: string }>(request);
    const name = body.name?.trim();
    if (!name) return error("Name is required");

    const { data, error: updateErr } = await supabase
      .from("libraries")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, owner_id, created_at, updated_at")
      .single();

    if (updateErr || !data) return error(updateErr?.message || "Update failed", 403);

    return json({
      id: data.id,
      name: data.name,
      ownerId: data.owner_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }

  const libraryId = url.searchParams.get("libraryId") ?? url.searchParams.get("id");

  if (action === "members" && request.method === "GET") {
    if (!libraryId) return error("libraryId required");

    const { data: membership } = await supabase
      .from("library_members")
      .select("role")
      .eq("library_id", libraryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) return error("Access denied", 403);

    const { data: members, error: membersErr } = await supabase
      .from("library_members")
      .select("user_id, role, joined_at")
      .eq("library_id", libraryId)
      .order("joined_at", { ascending: true });

    if (membersErr) return error(membersErr.message, 500);

    return json({
      members: (members ?? []).map((m) => ({
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
      })),
    });
  }

  if (action === "invite" && request.method === "POST") {
    const body = await parseBody<{ libraryId?: string; email?: string; phone?: string }>(request);
    const inviteLibraryId = body.libraryId ?? libraryId;
    if (!inviteLibraryId) return error("libraryId required");
    const email = body.email?.trim().toLowerCase() || null;
    const phone = body.phone ? normalizePhone(body.phone) : null;

    if (!email && !phone) return error("Email or phone is required");

    const { data: membership } = await supabase
      .from("library_members")
      .select("role")
      .eq("library_id", inviteLibraryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership?.role !== "owner") return error("Only the library owner can invite members", 403);

    const { data: invite, error: inviteErr } = await supabase
      .from("library_invites")
      .insert({
        library_id: inviteLibraryId,
        email,
        phone,
        invited_by: user.id,
        status: "pending",
      })
      .select("id, library_id, email, phone, status, created_at")
      .single();

    if (inviteErr || !invite) return error(inviteErr?.message || "Invite failed", 500);

    return json(
      {
        id: invite.id,
        libraryId: invite.library_id,
        email: invite.email,
        phone: invite.phone,
        status: invite.status,
        createdAt: invite.created_at,
      },
      201,
    );
  }

  if (action === "invites" && request.method === "GET") {
    const scope = url.searchParams.get("scope");

    if (scope === "sent" && libraryId) {
      const { data: membership } = await supabase
        .from("library_members")
        .select("role")
        .eq("library_id", libraryId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership?.role !== "owner") return error("Access denied", 403);

      const { data: invites, error: invitesErr } = await supabase
        .from("library_invites")
        .select("id, library_id, email, phone, status, created_at")
        .eq("library_id", libraryId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (invitesErr) return error(invitesErr.message, 500);

      return json({
        invites: (invites ?? []).map((i) => ({
          id: i.id,
          libraryId: i.library_id,
          email: i.email,
          phone: i.phone,
          status: i.status,
          createdAt: i.created_at,
        })),
      });
    }

    const { data: invites, error: receivedErr } = await supabase
      .from("library_invites")
      .select("id, library_id, email, phone, status, created_at, libraries(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (receivedErr) return error(receivedErr.message, 500);

    return json({
      invites: (invites ?? []).map((i) => ({
        id: i.id,
        libraryId: i.library_id,
        libraryName: (i.libraries as { name: string } | null)?.name ?? "Library",
        email: i.email,
        phone: i.phone,
        status: i.status,
        createdAt: i.created_at,
      })),
    });
  }

  if (action === "accept" && request.method === "POST") {
    const body = await parseBody<{ inviteId: string }>(request);
    if (!body.inviteId) return error("inviteId required");

    const { data: invite, error: inviteErr } = await supabase
      .from("library_invites")
      .select("id, library_id, status")
      .eq("id", body.inviteId)
      .eq("status", "pending")
      .maybeSingle();

    if (inviteErr || !invite) return error("Invite not found", 404);

    const { error: memberErr } = await supabase.from("library_members").insert({
      library_id: invite.library_id,
      user_id: user.id,
      role: "member",
    });

    if (memberErr) return error(memberErr.message, 500);

    await supabase
      .from("library_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    return json({ ok: true, libraryId: invite.library_id });
  }

  if (action === "revoke" && request.method === "POST") {
    const body = await parseBody<{ inviteId: string }>(request);
    if (!body.inviteId) return error("inviteId required");

    const { error: revokeErr } = await supabase
      .from("library_invites")
      .update({ status: "revoked" })
      .eq("id", body.inviteId);

    if (revokeErr) return error(revokeErr.message, 500);
    return json({ ok: true });
  }

  if (action === "remove-member" && request.method === "POST") {
    const body = await parseBody<{ libraryId?: string; userId: string }>(request);
    const memberLibraryId = body.libraryId ?? libraryId;
    if (!memberLibraryId) return error("libraryId required");
    if (!body.userId) return error("userId required");

    const { data: membership } = await supabase
      .from("library_members")
      .select("role")
      .eq("library_id", memberLibraryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership?.role !== "owner") return error("Only the owner can remove members", 403);
    if (body.userId === user.id) return error("Use leave instead of removing yourself", 400);

    const { error: removeErr } = await supabase
      .from("library_members")
      .delete()
      .eq("library_id", memberLibraryId)
      .eq("user_id", body.userId);

    if (removeErr) return error(removeErr.message, 500);
    return json({ ok: true });
  }

  if (action === "leave" && request.method === "POST") {
    const body = await parseBody<{ libraryId?: string }>(request);
    const leaveLibraryId = body.libraryId ?? libraryId;
    if (!leaveLibraryId) return error("libraryId required");

    const { data: membership } = await supabase
      .from("library_members")
      .select("role")
      .eq("library_id", leaveLibraryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) return error("Not a member", 404);
    if (membership.role === "owner") {
      return error("Owners cannot leave — transfer ownership or delete the library first", 400);
    }

    const { error: leaveErr } = await supabase
      .from("library_members")
      .delete()
      .eq("library_id", leaveLibraryId)
      .eq("user_id", user.id);

    if (leaveErr) return error(leaveErr.message, 500);
    return json({ ok: true });
  }

  return error("Method not allowed", 405);
});
