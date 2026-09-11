import { supabase } from "./supabase";

export async function listStaffLinkedAccounts(): Promise<
  { id: string; email: string; label: string; linkedUserId: string | null }[]
> {
  const { data, error } = await supabase
    .from("staff_linked_accounts")
    .select("id, linked_email, label, linked_user_id")
    .order("created_at");
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    email: r.linked_email as string,
    label: (r.label as string) || (r.linked_email as string),
    linkedUserId: (r.linked_user_id as string | null) ?? null,
  }));
}

export async function addStaffLinkedAccount(email: string, label: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const ownerId = session.session?.user?.id;
  if (!ownerId) throw new Error("Sign in required");
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Enter a valid email");

  const { error } = await supabase.from("staff_linked_accounts").upsert(
    {
      owner_user_id: ownerId,
      linked_email: normalized,
      label: label.trim() || normalized,
    },
    { onConflict: "owner_user_id,linked_email" },
  );
  if (error) throw error;
}

export async function removeStaffLinkedAccount(id: string): Promise<void> {
  const { error } = await supabase.from("staff_linked_accounts").delete().eq("id", id);
  if (error) throw error;
}
