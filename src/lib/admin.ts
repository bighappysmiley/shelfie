import { supabase } from "./supabase";
import { normalizeTier, type SubscriptionTier, getTierLimits } from "./tiers";

export type AdminUserRow = {
  userId: string;
  email: string | null;
  displayName: string | null;
  communityUsername: string | null;
  subscriptionTier: SubscriptionTier;
  proEnabled: boolean;
  bookLimitOverride: number | null;
  shelfScanLimitOverride: number | null;
  bannedAt: string | null;
  banReason: string | null;
  createdAt: string | null;
};

export type AdminLibraryRow = {
  id: string;
  name: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  memberCount: number;
  createdAt: string | null;
};

export type EnterpriseLead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  teamSize: string | null;
  message: string;
  status: "new" | "contacted" | "closed";
  createdAt: string;
};

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type LibraryAccessCodeResult = {
  id: string;
  code: string;
  libraryId: string;
  ownerUserId: string;
  expiresAt: string;
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Sign in required");

  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body as T;
}

export async function searchAdminUsers(query: string): Promise<AdminUserRow[]> {
  const q = query.trim();
  if (!q) return [];
  const result = await adminFetch<{ users: AdminUserRow[] }>(
    `/api/admin/users?q=${encodeURIComponent(q)}`,
  );
  return result.users;
}

export async function setUserTier(
  userId: string,
  tier: SubscriptionTier,
  bookLimitOverride?: number | null,
  shelfScanLimitOverride?: number | null,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_tier", {
    p_user_id: userId,
    p_tier: tier,
    p_book_override: bookLimitOverride ?? null,
    p_scan_override: shelfScanLimitOverride ?? null,
  });
  if (error) throw error;
}

export async function banUser(userId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("admin_ban_user", {
    p_user_id: userId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

export async function unbanUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_unban_user", {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function listAdminLibraries(query = ""): Promise<AdminLibraryRow[]> {
  const result = await adminFetch<{ libraries: AdminLibraryRow[] }>(
    `/api/admin/libraries?q=${encodeURIComponent(query)}`,
  );
  return result.libraries;
}

export async function requestLibraryAccessCode(
  libraryId: string,
): Promise<LibraryAccessCodeResult> {
  const { data, error } = await supabase.rpc("request_library_access_code", {
    p_library_id: libraryId,
  });
  if (error) throw error;
  const row = data as LibraryAccessCodeResult;
  return row;
}

export async function redeemLibraryAccessCode(code: string): Promise<{
  sessionId: string;
  libraryId: string;
  expiresAt: string;
}> {
  const { data, error } = await supabase.rpc("redeem_library_access_code", {
    p_code: code.trim(),
  });
  if (error) throw error;
  return data as { sessionId: string; libraryId: string; expiresAt: string };
}

export async function listEnterpriseLeads(): Promise<EnterpriseLead[]> {
  const { data, error } = await supabase
    .from("enterprise_leads")
    .select("id, name, email, company, team_size, message, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    company: (r.company as string | null) ?? null,
    teamSize: (r.team_size as string | null) ?? null,
    message: r.message as string,
    status: r.status as EnterpriseLead["status"],
    createdAt: r.created_at as string,
  }));
}

export async function updateEnterpriseLeadStatus(
  id: string,
  status: EnterpriseLead["status"],
): Promise<void> {
  const { error } = await supabase
    .from("enterprise_leads")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function submitEnterpriseLead(input: {
  name: string;
  email: string;
  company?: string;
  teamSize?: string;
  message: string;
}): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase.from("enterprise_leads").insert({
    name: input.name.trim(),
    email: input.email.trim(),
    company: input.company?.trim() || null,
    team_size: input.teamSize?.trim() || null,
    message: input.message.trim(),
    created_by: session.session?.user?.id ?? null,
  });
  if (error) throw error;
}

export async function listMyNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("app_notifications")
    .select("id, kind, title, body, payload, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    kind: r.kind as string,
    title: r.title as string,
    body: r.body as string,
    payload: (r.payload as Record<string, unknown>) ?? {},
    readAt: (r.read_at as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function notifyUser(input: {
  userId: string;
  title: string;
  body: string;
  kind?: string;
}): Promise<void> {
  const { error } = await supabase.from("app_notifications").insert({
    user_id: input.userId,
    kind: input.kind ?? "admin_message",
    title: input.title,
    body: input.body,
  });
  if (error) throw error;
}

export function describeUserLimits(user: AdminUserRow) {
  return getTierLimits(user.subscriptionTier, {
    bookLimitOverride: user.bookLimitOverride,
    shelfScanLimitOverride: user.shelfScanLimitOverride,
  });
}

export { normalizeTier };
