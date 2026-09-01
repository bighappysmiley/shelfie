import { supabase } from "./supabase";
import type {
  CommunityCategory,
  CommunityGroup,
  CommunityGroupKind,
  CommunityMember,
  CommunityMemberRole,
  CommunityMessage,
  CommunityMessageKind,
  SuggestionStatus,
} from "./community-types";

type CategoryRow = {
  id: string;
  name: string;
  position: number;
  is_official: boolean;
  created_at: string;
};

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  topic: string | null;
  kind: CommunityGroupKind;
  category_id: string | null;
  position: number;
  is_official: boolean;
  icon: string | null;
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

function mapCategory(row: CategoryRow): CommunityCategory {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    isOfficial: row.is_official,
    createdAt: row.created_at,
  };
}

function mapGroup(row: GroupRow, extra?: Partial<CommunityGroup>): CommunityGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    topic: row.topic,
    kind: row.kind,
    categoryId: row.category_id,
    position: row.position ?? 0,
    isOfficial: Boolean(row.is_official),
    icon: row.icon || "hash",
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

export async function listCommunityCategories(): Promise<CommunityCategory[]> {
  const { data, error } = await supabase
    .from("community_categories")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CategoryRow[]).map(mapCategory);
}

export async function createCommunityCategory(input: {
  name: string;
  userId: string;
}): Promise<CommunityCategory> {
  const { data: existing } = await supabase
    .from("community_categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((existing?.[0]?.position as number | undefined) ?? 0) + 10;

  const { data, error } = await supabase
    .from("community_categories")
    .insert({
      name: input.name.trim(),
      position: nextPos,
      is_official: false,
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not create category");
  return mapCategory(data as CategoryRow);
}

export async function renameCommunityCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("community_categories")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("is_official", false);
  if (error) throw error;
}

export async function deleteCommunityCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("community_categories")
    .delete()
    .eq("id", id)
    .eq("is_official", false);
  if (error) throw error;
}

export async function listCommunityGroups(userId: string): Promise<CommunityGroup[]> {
  const [{ data: memberships }, { data: groups, error }] = await Promise.all([
    supabase.from("community_group_members").select("group_id, role").eq("user_id", userId),
    supabase
      .from("community_groups")
      .select("*")
      .is("archived_at", null)
      .order("position", { ascending: true })
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
        myRole: roleByGroup.get(g.id) ?? (g.is_official ? "member" : null),
        memberCount: count ?? 0,
      });
    }),
  );
}

export async function createCommunityGroup(input: {
  name: string;
  description?: string;
  topic?: string;
  kind: CommunityGroupKind;
  categoryId?: string | null;
  isOfficial?: boolean;
  userId: string;
}): Promise<CommunityGroup> {
  const isOfficial = Boolean(input.isOfficial);
  let categoryId = input.categoryId ?? null;

  if (isOfficial || !categoryId) {
    const cats = await listCommunityCategories();
    const official = cats.find((c) => c.isOfficial);
    const text =
      cats.find((c) => !c.isOfficial && c.name === "Text Channels") ??
      cats.find((c) => !c.isOfficial);
    if (isOfficial) {
      if (!official) throw new Error("Official category is missing");
      categoryId = official.id;
    } else if (!categoryId) {
      categoryId = text?.id ?? official?.id ?? null;
    }
  }

  if (!categoryId) throw new Error("Pick a category for this channel");

  const { data: siblings } = await supabase
    .from("community_groups")
    .select("position")
    .eq("category_id", categoryId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((siblings?.[0]?.position as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("community_groups")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      topic: input.topic?.trim() || null,
      kind: input.kind,
      category_id: categoryId,
      is_official: isOfficial,
      position: nextPos,
      icon: "hash",
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not create channel");

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
    body: isOfficial
      ? `Official channel #${group.name} is live.`
      : `Welcome to #${group.name}.`,
    kind: "system",
    author_name: "Pine",
  });

  return mapGroup(group, { myRole: "admin", memberCount: 1 });
}

export async function updateCommunityGroup(
  groupId: string,
  patch: {
    name?: string;
    description?: string | null;
    topic?: string | null;
    kind?: CommunityGroupKind;
    categoryId?: string | null;
    isOfficial?: boolean;
    position?: number;
  },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.topic !== undefined) row.topic = patch.topic?.trim() || null;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.position !== undefined) row.position = patch.position;

  if (patch.isOfficial === true) {
    const cats = await listCommunityCategories();
    const official = cats.find((c) => c.isOfficial);
    if (!official) throw new Error("Official category is missing");
    row.is_official = true;
    row.category_id = official.id;
  } else {
    if (patch.isOfficial === false) row.is_official = false;
    if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  }

  const { error } = await supabase.from("community_groups").update(row).eq("id", groupId);
  if (error) throw error;
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
