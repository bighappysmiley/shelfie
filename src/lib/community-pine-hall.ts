import { supabase } from "./supabase";
import {
  createCommunityCategory,
  createCommunityGroup,
  listCommunityCategories,
  listCommunityGroups,
  recomputeServerScore,
  updateServer,
} from "./community";
import { bumpCommunityRail } from "./community-events";
import type { CommunityGroupKind, CommunityServer } from "./community-types";

export const PINE_HALL_NAME = "Pine Hall";

const PINE_HALL_DESCRIPTION =
  "Pine’s official reading community — share what you’re reading, swap recommendations, and hang out with fellow book people.";

const PINE_HALL_RULES = `1. Be kind — treat readers and their tastes with respect.
2. No spoilers without a clear warning in the first line.
3. Keep discussion bookish or friendly; spam and harassment get removed.
4. Don’t share pirated books or illegal download links.
5. Have fun — this hall is for discovering the next great read.`;

const PINE_HALL_WELCOME =
  "Welcome to Pine Hall! Say hi in #introductions, check #announcements, and tell us what you’re reading.";

type ChannelSeed = {
  name: string;
  kind: CommunityGroupKind;
  topic: string;
  description?: string;
};

type CategorySeed = {
  name: string;
  channels: ChannelSeed[];
};

const PINE_HALL_LAYOUT: CategorySeed[] = [
  {
    name: "Welcome",
    channels: [
      {
        name: "announcements",
        kind: "announcement",
        topic: "Official Pine updates and community news",
        description: "Staff posts only — follow for server news.",
      },
      {
        name: "rules",
        kind: "text",
        topic: "House rules for Pine Hall",
        description: "Please read before chatting.",
      },
      {
        name: "introductions",
        kind: "text",
        topic: "New here? Tell us your name and a favorite book",
      },
      {
        name: "start-here",
        kind: "text",
        topic: "How Pine Community works — tips for new members",
      },
    ],
  },
  {
    name: "Reading",
    channels: [
      {
        name: "currently-reading",
        kind: "text",
        topic: "What are you reading right now?",
      },
      {
        name: "book-recs",
        kind: "forum",
        topic: "Ask for recommendations or share a gem",
        description: "One book or vibe per post works best.",
      },
      {
        name: "reviews",
        kind: "forum",
        topic: "Spoilers welcome — mark them clearly",
        description: "Short takes and full reviews.",
      },
      {
        name: "shelves",
        kind: "text",
        topic: "Show off a shelf, stack, or TBR pile",
      },
      {
        name: "reading-goals",
        kind: "text",
        topic: "Yearly challenges, streaks, and progress",
      },
    ],
  },
  {
    name: "Hangout",
    channels: [
      {
        name: "general",
        kind: "text",
        topic: "Everyday chat for Pine Hall",
      },
      {
        name: "off-topic",
        kind: "text",
        topic: "Life beyond books (still keep it friendly)",
      },
      {
        name: "media",
        kind: "text",
        topic: "Bookish shows, podcasts, and adaptations",
      },
    ],
  },
  {
    name: "Voice",
    channels: [
      {
        name: "reading-lounge",
        kind: "voice",
        topic: "Quiet co-reading and soft hangouts",
      },
      {
        name: "book-club",
        kind: "voice",
        topic: "Live book club discussions",
      },
    ],
  },
];

function makeInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return out;
}

async function seedRoles(serverId: string): Promise<void> {
  const defaults = [
    {
      name: "Owner",
      position: 0,
      color: "#E11D48",
      can_manage_server: true,
      can_manage_channels: true,
      can_moderate: true,
      can_kick_members: true,
      can_ban_members: true,
      can_manage_messages: true,
      can_invite_users: true,
      hoist: true,
      mentionable: true,
      is_everyone: false,
    },
    {
      name: "Admin",
      position: 10,
      color: "#F59E0B",
      can_manage_server: true,
      can_manage_channels: true,
      can_moderate: true,
      can_kick_members: true,
      can_ban_members: true,
      can_manage_messages: true,
      can_invite_users: true,
      hoist: true,
      mentionable: true,
      is_everyone: false,
    },
    {
      name: "Moderator",
      position: 20,
      color: "#3B82F6",
      can_manage_server: false,
      can_manage_channels: false,
      can_moderate: true,
      can_kick_members: true,
      can_ban_members: true,
      can_manage_messages: true,
      can_invite_users: true,
      hoist: true,
      mentionable: true,
      is_everyone: false,
    },
    {
      name: "Member",
      position: 100,
      color: "#6B7280",
      can_manage_server: false,
      can_manage_channels: false,
      can_moderate: false,
      can_kick_members: false,
      can_ban_members: false,
      can_manage_messages: false,
      can_invite_users: true,
      hoist: false,
      mentionable: true,
      is_everyone: true,
    },
  ];
  for (const role of defaults) {
    await supabase.from("community_server_roles").upsert(
      { server_id: serverId, ...role },
      { onConflict: "server_id,name", ignoreDuplicates: true },
    );
  }
}

function mapServerRow(row: Record<string, unknown>): CommunityServer {
  return {
    id: row.id as string,
    libraryId: (row.library_id as string | null) ?? null,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    iconUrl: (row.icon_url as string | null) ?? null,
    isPublic: Boolean(row.is_public),
    isOfficial: Boolean(row.is_official),
    officialPosition: (row.official_position as number | null) ?? null,
    inviteCode: (row.invite_code as string | null) ?? "",
    joinMode: "open",
    memberCount: Number(row.member_count ?? 1),
    messageCount: Number(row.message_count ?? 0),
    activityScore: Number(row.activity_score ?? 0),
    lastActivityAt: (row.last_activity_at as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    canManage: true,
    isMember: true,
  };
}

/** Idempotent category + channel seed for Pine Hall. */
export async function seedPineHallLayout(serverId: string, userId: string): Promise<void> {
  const existingCategories = await listCommunityCategories(serverId);
  const existingGroups = await listCommunityGroups(userId, serverId);
  const categoryByName = new Map(
    existingCategories.map((c) => [c.name.trim().toLowerCase(), c] as const),
  );
  const groupByName = new Map(existingGroups.map((g) => [g.name.trim().toLowerCase(), g] as const));

  for (const cat of PINE_HALL_LAYOUT) {
    let category = categoryByName.get(cat.name.toLowerCase()) ?? null;
    if (!category) {
      category = await createCommunityCategory({
        serverId,
        name: cat.name,
        userId,
      });
      categoryByName.set(cat.name.toLowerCase(), category);
    }

    for (const ch of cat.channels) {
      if (groupByName.has(ch.name.toLowerCase())) continue;
      const group = await createCommunityGroup({
        serverId,
        name: ch.name,
        kind: ch.kind,
        topic: ch.topic,
        description: ch.description,
        categoryId: category.id,
        userId,
      });
      groupByName.set(ch.name.toLowerCase(), group);
    }
  }
}

async function finalizePineHall(serverId: string, userId: string): Promise<void> {
  const groups = await listCommunityGroups(userId, serverId);
  const rules = groups.find((g) => g.name === "rules");
  const general = groups.find((g) => g.name === "general");
  const announcements = groups.find((g) => g.name === "announcements");

  await updateServer(serverId, {
    rules: PINE_HALL_RULES,
    welcomeMessage: PINE_HALL_WELCOME,
    rulesChannelId: rules?.id ?? null,
    systemChannelId: general?.id ?? announcements?.id ?? null,
    vanitySlug: "pine-hall",
    isPublic: true,
    joinMode: "open",
    isOfficial: true,
    officialPosition: 0,
  });
}

/**
 * Create (or upgrade) the official Pine Hall server with a full reading-community layout.
 * Intended for app owners. Prefer SQL RPC when available.
 */
export async function ensureOfficialPineHall(userId: string): Promise<CommunityServer> {
  const { data: rpcId, error: rpcError } = await supabase.rpc("ensure_pine_hall_server");
  if (!rpcError && rpcId) {
    await seedPineHallLayout(rpcId as string, userId).catch(() => undefined);
    await finalizePineHall(rpcId as string, userId).catch(() => undefined);
    await recomputeServerScore(rpcId as string).catch(() => undefined);
    bumpCommunityRail();
    const { data } = await supabase
      .from("community_servers")
      .select("*")
      .eq("id", rpcId as string)
      .maybeSingle();
    if (data) return mapServerRow(data as Record<string, unknown>);
  }

  // Rename a leftover "General" seed if one exists
  await supabase
    .from("community_servers")
    .update({ name: PINE_HALL_NAME, updated_at: new Date().toISOString() })
    .eq("name", "General");

  const { data: existing } = await supabase
    .from("community_servers")
    .select("*")
    .ilike("name", PINE_HALL_NAME)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let serverId = existing?.id as string | undefined;

  if (!serverId) {
    const { data, error } = await supabase
      .from("community_servers")
      .insert({
        library_id: null,
        name: PINE_HALL_NAME,
        description: PINE_HALL_DESCRIPTION,
        is_public: true,
        is_official: true,
        official_position: 0,
        invite_code: makeInviteCode(),
        join_mode: "open",
        created_by: userId,
        rules: PINE_HALL_RULES,
        welcome_message: PINE_HALL_WELCOME,
        vanity_slug: "pine-hall",
        verification_level: "low",
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Could not create Pine Hall");
    serverId = data.id as string;

    await seedRoles(serverId);
    const { data: ownerRole } = await supabase
      .from("community_server_roles")
      .select("id")
      .eq("server_id", serverId)
      .eq("name", "Owner")
      .maybeSingle();
    await supabase.from("community_server_members").upsert({
      server_id: serverId,
      user_id: userId,
      role_id: ownerRole?.id ?? null,
    });
  } else {
    await supabase
      .from("community_servers")
      .update({
        name: PINE_HALL_NAME,
        description: existing?.description || PINE_HALL_DESCRIPTION,
        is_public: true,
        is_official: true,
        official_position: existing?.official_position ?? 0,
        library_id: null,
        join_mode: "open",
        rules: existing?.rules || PINE_HALL_RULES,
        welcome_message: existing?.welcome_message || PINE_HALL_WELCOME,
        vanity_slug: existing?.vanity_slug || "pine-hall",
        updated_at: new Date().toISOString(),
      })
      .eq("id", serverId);

    await seedRoles(serverId);
    const { data: ownerRole } = await supabase
      .from("community_server_roles")
      .select("id")
      .eq("server_id", serverId)
      .eq("name", "Owner")
      .maybeSingle();
    await supabase.from("community_server_members").upsert({
      server_id: serverId,
      user_id: userId,
      role_id: ownerRole?.id ?? null,
    });
  }

  await seedPineHallLayout(serverId, userId);
  await finalizePineHall(serverId, userId);
  await recomputeServerScore(serverId);
  bumpCommunityRail();

  const { data: fresh, error: freshError } = await supabase
    .from("community_servers")
    .select("*")
    .eq("id", serverId)
    .single();
  if (freshError || !fresh) throw freshError ?? new Error("Pine Hall missing after create");

  return mapServerRow(fresh as Record<string, unknown>);
}
