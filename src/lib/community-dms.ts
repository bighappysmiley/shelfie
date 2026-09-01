import { supabase } from "./supabase";
import { moderateTextContent } from "./content-moderation";

export type DmThreadSummary = {
  threadId: string;
  updatedAt: string;
  otherUser: {
    userId: string;
    displayName: string | null;
    username: string | null;
  } | null;
  lastMessage: {
    body: string;
    createdAt: string;
    authorId: string;
  } | null;
};

export type DmMessage = {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export async function countDmUnread(): Promise<number> {
  const { data, error } = await supabase.rpc("count_dm_unread");
  if (error) {
    if (error.code === "42883") return 0;
    throw error;
  }
  return Number(data ?? 0);
}

export async function markDmThreadRead(threadId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_dm_thread_read", { p_thread_id: threadId });
  if (error && error.code !== "42883") throw error;
}

export async function blockDmUser(blockedId: string): Promise<void> {
  const { error } = await supabase.from("community_dm_blocks").insert({ blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockDmUser(blockedId: string): Promise<void> {
  const { error } = await supabase
    .from("community_dm_blocks")
    .delete()
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function isDmBlocked(otherUserId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) return false;

  const { data, error } = await supabase
    .from("community_dm_blocks")
    .select("blocker_id")
    .or(`and(blocker_id.eq.${uid},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${uid})`)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return false;
    throw error;
  }
  return Boolean(data);
}

export async function listMyDmThreads(): Promise<DmThreadSummary[]> {
  const { data, error } = await supabase.rpc("list_my_dm_threads");
  if (error) throw error;
  return ((data as DmThreadSummary[] | null) ?? []).map((row) => ({
    threadId: row.threadId,
    updatedAt: row.updatedAt,
    otherUser: row.otherUser,
    lastMessage: row.lastMessage,
  }));
}

export async function openDmThread(otherUserId: string): Promise<string> {
  const blocked = await isDmBlocked(otherUserId);
  if (blocked) throw new Error("You cannot message this user.");

  const { data, error } = await supabase.rpc("get_or_create_dm_thread", {
    p_other_user_id: otherUserId,
  });
  if (error) throw error;
  return data as string;
}

export async function listDmMessages(threadId: string): Promise<DmMessage[]> {
  const { data, error } = await supabase
    .from("community_dm_messages")
    .select("id, thread_id, author_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    threadId: row.thread_id as string,
    authorId: row.author_id as string,
    body: row.body as string,
    createdAt: row.created_at as string,
  }));
}

export async function sendDmMessage(threadId: string, userId: string, body: string): Promise<DmMessage> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  const moderated = moderateTextContent(trimmed);
  if (!moderated.allowed) throw new Error(moderated.reason);

  const { data, error } = await supabase
    .from("community_dm_messages")
    .insert({ thread_id: threadId, author_id: userId, body: trimmed })
    .select("id, thread_id, author_id, body, created_at")
    .single();
  if (error || !data) throw error ?? new Error("Could not send message");

  await supabase
    .from("community_dm_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return {
    id: data.id as string,
    threadId: data.thread_id as string,
    authorId: data.author_id as string,
    body: data.body as string,
    createdAt: data.created_at as string,
  };
}

export function subscribeDmMessages(
  threadId: string,
  onMessage: () => void,
): () => void {
  const channel = supabase
    .channel(`dm:${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "community_dm_messages",
        filter: `thread_id=eq.${threadId}`,
      },
      () => onMessage(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
