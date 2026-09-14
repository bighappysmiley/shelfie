import { supabase } from "./supabase";

export type StaffLinkedAccount = {
  id: string;
  label: string;
  linkedUserId: string | null;
  /** Internal only — never show in the UI for alt accounts. */
  email: string;
  isAltPersona: boolean;
};

export function isAltUser(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.app_metadata?.is_alt || user.user_metadata?.is_alt) return true;
  const email = (user.email || "").toLowerCase();
  return email.endsWith("@pine.alt");
}

export function altLabel(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
} | null | undefined): string | null {
  if (!user) return null;
  const label =
    (typeof user.app_metadata?.alt_label === "string" && user.app_metadata.alt_label) ||
    (typeof user.user_metadata?.alt_label === "string" && user.user_metadata.alt_label) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    null;
  return label?.trim() || null;
}

/** Public account email for UI — alts have none. */
export function displayAccountEmail(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
} | null | undefined): string | null {
  if (!user || isAltUser(user)) return null;
  return user.email?.trim() || null;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in required");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function listStaffLinkedAccounts(): Promise<StaffLinkedAccount[]> {
  const { data, error } = await supabase
    .from("staff_linked_accounts")
    .select("id, linked_email, label, linked_user_id")
    .order("created_at");
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => {
    const email = (r.linked_email as string) || "";
    const isAltPersona = email.endsWith("@pine.alt");
    return {
      id: r.id as string,
      email,
      label: (r.label as string) || (isAltPersona ? "Alt" : email),
      linkedUserId: (r.linked_user_id as string | null) ?? null,
      isAltPersona,
    };
  });
}

export async function createAltAccount(label: string): Promise<StaffLinkedAccount> {
  const res = await fetch("/api/alt-accounts", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ action: "create", label }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    account?: { id: string; label: string; linkedUserId: string | null };
  };
  if (!res.ok || !payload.account) {
    throw new Error(payload.error || "Could not create alt account");
  }
  return {
    id: payload.account.id,
    label: payload.account.label,
    linkedUserId: payload.account.linkedUserId,
    email: "",
    isAltPersona: true,
  };
}

export async function removeStaffLinkedAccount(id: string): Promise<void> {
  const res = await fetch("/api/alt-accounts", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ action: "delete", id }),
  });
  if (res.ok) return;

  const { error } = await supabase.from("staff_linked_accounts").delete().eq("id", id);
  if (error) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || error.message || "Could not remove account");
  }
}

export async function switchToAltAccount(id: string): Promise<{ tokenHash: string; label: string }> {
  const res = await fetch("/api/alt-accounts", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ action: "switch", id }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    token_hash?: string;
    label?: string;
  };
  if (!res.ok || !payload.token_hash) {
    throw new Error(payload.error || "Could not switch accounts");
  }
  return { tokenHash: payload.token_hash, label: payload.label || "Alt" };
}

export async function returnToMainAccount(): Promise<{ tokenHash: string }> {
  const res = await fetch("/api/alt-accounts", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ action: "return" }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    token_hash?: string;
  };
  if (!res.ok || !payload.token_hash) {
    throw new Error(payload.error || "Could not return to main account");
  }
  return { tokenHash: payload.token_hash };
}

/** Apply a minted session and wipe library/offline state so the app feels brand new. */
export async function applyAltSession(tokenHash: string): Promise<void> {
  const { clearLibraryContext } = await import("./library-storage");
  const { clearOfflineCache } = await import("./offline");
  const { clearPendingInvite } = await import("./pending-invite");
  clearLibraryContext();
  clearPendingInvite();
  await clearOfflineCache().catch(() => undefined);

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (error) throw error;
}
