import { supabase } from "./supabase";
import type {
  CommunityGroup,
  CommunityGroupKind,
  CommunityMember,
  CommunityMemberRole,
  CommunityMessage,
  CommunityMessageKind,
  SuggestionStatus,
} from "./community-types";

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  kind: CommunityGroupKind;
  created_by: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  group_id: string;
  author_id: string | null;
  body: string;
  kind: CommunityMessageKind;
  suggestion_status: SuggestionStatus | null;
  author_name: string | null;
  created_at: string;
};

function mapGroup(row: GroupRow, extra?: Partial<CommunityGroup>): CommunityGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind,
    createdBy: row.created_by,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extra,
  };
}

function mapMessage(row: MessageRow): CommunityMessage {
  return {
    id: row.id,
    groupId: row.group_id,
    authorId: row.author_id,
    body: row.body,
    kind: row.kind,
    suggestionStatus: row.suggestion_status,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

export async function listCommunityGroups(userId: string): Promise<CommunityGroup[]> {
  const [{ data: memberships }, { data: groups, error }] = await Promise.all([
    supabase.from("community_group_members").select("group_id, role").eq("user_id", userId),
    supabase
      .from("community_groups")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
  ]);
  if (error) throw error;

  const roleByGroup = new Map(
    (memberships ?? []).map((m) => [m.group_id as string, m.role as CommunityMemberRole]),
  );
  const rows = (groups ?? []) as GroupRow[];

  return Promise.all(
    rows.map(async (g) => {
      const { count } = await supabase
        .from("community_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", g.id);
      return mapGroup(g, {
        myRole: roleByGroup.get(g.id) ?? null,
        memberCount: count ?? 0,
      });
    }),
  );
}

export async function createCommunityGroup(input: {
  name: string;
  description?: string;
  kind: CommunityGroupKind;
  userId: string;
}): Promise<CommunityGroup> {
  const { data, error } = await supabase
    .from("community_groups")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      kind: input.kind,
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not create group");

  const group = data as GroupRow;
  const { error: memberErr } = await supabase.from("community_group_members").insert({
    group_id: group.id,
    user_id: input.userId,
    role: "admin",
  });
  if (memberErr) throw memberErr;

  await supabase.from("community_messages").insert({
    group_id: group.id,
    author_id: input.userId,
    body: `Created “${group.name}”. Welcome.`,
    kind: "system",
    author_name: "Pine",
  });

  return mapGroup(group, { myRole: "admin", memberCount: 1 });
}

export async function archiveCommunityGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from("community_groups")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", groupId);
  if (error) throw error;
}

export async function listGroupMembers(groupId: string): Promise<CommunityMember[]> {
  const { data, error } = await supabase
    .from("community_group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", groupId)
    .order("joined_at");
  if (error) throw error;

  const rows = data ?? [];
  const ids = rows.map((r) => r.user_id as string);
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", ids);

  const names = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, (p.display_name as string | null) ?? null]),
  );

  return rows.map((r) => ({
    userId: r.user_id as string,
    role: r.role as CommunityMemberRole,
    joinedAt: r.joined_at as string,
    displayName: names.get(r.user_id as string) ?? null,
    email: null,
  }));
}

export async function addGroupMember(
  groupId: string,
  userId: string,
  role: CommunityMemberRole = "member",
): Promise<void> {
  const { error } = await supabase.from("community_group_members").upsert({
    group_id: groupId,
    user_id: userId,
    role,
  });
  if (error) throw error;
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: CommunityMemberRole,
): Promise<void> {
  const { error } = await supabase
    .from("community_group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function listGroupMessages(groupId: string): Promise<CommunityMessage[]> {
  const { data, error } = await supabase
    .from("community_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at");
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).map(mapMessage);
}

export async function sendGroupMessage(input: {
  groupId: string;
  userId: string;
  body: string;
  kind: CommunityMessageKind;
  authorName: string;
}): Promise<CommunityMessage> {
  const { data, error } = await supabase
    .from("community_messages")
    .insert({
      group_id: input.groupId,
      author_id: input.userId,
      body: input.body.trim(),
      kind: input.kind,
      suggestion_status: input.kind === "suggestion" ? "open" : null,
      author_name: input.authorName,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not send");
  return mapMessage(data as MessageRow);
}

export async function updateSuggestionStatus(
  messageId: string,
  status: SuggestionStatus,
): Promise<void> {
  const { error } = await supabase
    .from("community_messages")
    .update({ suggestion_status: status })
    .eq("id", messageId)
    .eq("kind", "suggestion");
  if (error) throw error;
}

export async function deleteGroupMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from("community_messages").delete().eq("id", messageId);
  if (error) throw error;
}

export async function listTeammateCandidates(
  userId: string,
): Promise<{ userId: string; displayName: string | null }[]> {
  const { data: memberships } = await supabase
    .from("library_members")
    .select("library_id")
    .eq("user_id", userId);

  const libraryIds = (memberships ?? []).map((m) => m.library_id as string);
  if (libraryIds.length === 0) return [];

  const { data: mates } = await supabase
    .from("library_members")
    .select("user_id")
    .in("library_id", libraryIds);

  const ids = [...new Set((mates ?? []).map((m) => m.user_id as string))].filter(
    (id) => id !== userId,
  );
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", ids);

  const byId = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, (p.display_name as string | null) ?? null]),
  );

  return ids.map((id) => ({ userId: id, displayName: byId.get(id) ?? null }));
}
