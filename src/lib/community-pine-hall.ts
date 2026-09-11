import { supabase } from "./supabase";
import {
  createCommunityCategory,
  createCommunityGroup,
  listCommunityCategories,
  listCommunityGroups,
  recomputeServerScore,
  syncServerMembersToChannel,
  updateCommunityGroup,
  updateServer,
} from "./community";
import { bumpCommunityRail } from "./community-events";
import { upsertPermissionOverride } from "./community-permissions";
import type { CommunityGroupKind, CommunityServer } from "./community-types";

export const PINE_HALL_NAME = "Pine Hall";
export const PINE_BOT_NAME = "Pine";
export const SUGGESTIONS_BOT_NAME = "Suggestions";
export const SUPPORT_BOT_NAME = "Support";

const PINE_HALL_DESCRIPTION =
  "Pine’s official reading community — share what you’re reading, swap recommendations, and hang out with fellow book people.";

const PINE_HALL_RULES = `1. Be kind — treat readers and their tastes with respect.
2. No spoilers without a clear warning in the first line.
3. Keep discussion bookish or friendly; spam and harassment get removed.
4. Don’t share pirated books or illegal download links.
5. Have fun — this hall is for discovering the next great read.`;

const PINE_HALL_WELCOME =
  "Welcome to Pine Hall! Say hi in #👋 | Introductions, read #📕 | Rules, and tell us what you’re reading in #📖 | Currently Reading.";

/** `emoji | Title Case` channel display name. */
export function pineChannelLabel(emoji: string, title: string): string {
  return `${emoji} | ${title}`;
}

/** Stable key so `announcements` and `📢 | Announcements` match. */
export function channelIdentityKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\s|‧·•\-–—]+/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const KEY_ALIASES: Record<string, string> = {
  starthere: "start-here",
  "start-here": "start-here",
  currentlyreading: "currently-reading",
  "currently-reading": "currently-reading",
  bookrecs: "book-recs",
  "book-recs": "book-recs",
  readinggoals: "reading-goals",
  "reading-goals": "reading-goals",
  offtopic: "off-topic",
  "off-topic": "off-topic",
  readinglounge: "reading-lounge",
  "reading-lounge": "reading-lounge",
  bookclub: "book-club",
  "book-club": "book-club",
};

export function normalizeChannelKey(name: string): string {
  const key = channelIdentityKey(name);
  return KEY_ALIASES[key] ?? key;
}

export function isSuggestionsChannel(name: string): boolean {
  return normalizeChannelKey(name) === "suggestions";
}

export function isSupportChannel(name: string): boolean {
  return normalizeChannelKey(name) === "support";
}

export function isBotAuthorName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return n === "pine" || n === "suggestions" || n === "support" || n === "server";
}

type ChannelSeed = {
  key: string;
  emoji: string;
  title: string;
  kind: CommunityGroupKind;
  topic: string;
  description?: string;
  /** Member role cannot send; staff roles can. */
  staffWriteOnly?: boolean;
  bot?: { name: string; marker: string; body: string };
};

type CategorySeed = {
  name: string;
  channels: ChannelSeed[];
};

function channelDisplayName(ch: ChannelSeed): string {
  return pineChannelLabel(ch.emoji, ch.title);
}

const PINE_HALL_LAYOUT: CategorySeed[] = [
  {
    name: "Welcome",
    channels: [
      {
        key: "announcements",
        emoji: "📢",
        title: "Announcements",
        kind: "announcement",
        topic: "Official Pine updates and community news",
        description: "Staff posts only — follow for server news.",
        staffWriteOnly: true,
        bot: {
          name: PINE_BOT_NAME,
          marker: "<!--pine-bot:announcements-->",
          body: `**Welcome to Pine Hall** <!--pine-bot:announcements-->

This is the official announcements channel. Pine staff post product updates, reading events, and community news here.

You’ll get notified for important posts — sit back and enjoy the bookshelf.`,
        },
      },
      {
        key: "rules",
        emoji: "📕",
        title: "Rules",
        kind: "text",
        topic: "House rules for Pine Hall",
        description: "Please read before chatting.",
        staffWriteOnly: true,
        bot: {
          name: PINE_BOT_NAME,
          marker: "<!--pine-bot:rules-->",
          body: `**Pine Hall Rules** <!--pine-bot:rules-->

${PINE_HALL_RULES}

Thanks for helping keep this a cozy place to talk books.`,
        },
      },
      {
        key: "introductions",
        emoji: "👋",
        title: "Introductions",
        kind: "text",
        topic: "New here? Tell us your name and a favorite book",
        bot: {
          name: PINE_BOT_NAME,
          marker: "<!--pine-bot:introductions-->",
          body: `**Say hello!** <!--pine-bot:introductions-->

New to Pine Hall? Introduce yourself with:
• What you like to be called
• A favorite book (or three)
• What you’re reading right now`,
        },
      },
      {
        key: "start-here",
        emoji: "🌲",
        title: "Start Here",
        kind: "text",
        topic: "How Pine Community works — tips for new members",
        bot: {
          name: PINE_BOT_NAME,
          marker: "<!--pine-bot:start-here-->",
          body: `**Start here** <!--pine-bot:start-here-->

1. Read **#📕 | Rules**
2. Say hi in **#👋 | Introductions**
3. Share what you’re reading in **#📖 | Currently Reading**
4. Need help? Visit **#🛟 | Support**
5. Have an idea? Drop it in **#💡 | Suggestions**

Your **server role** controls what you can do in each channel — ask a mod if you need access.`,
        },
      },
      {
        key: "suggestions",
        emoji: "💡",
        title: "Suggestions",
        kind: "forum",
        topic: "Feature ideas and community improvements",
        description: "One idea per post — Moderators review with roles.",
        bot: {
          name: SUGGESTIONS_BOT_NAME,
          marker: "<!--pine-bot:suggestions-->",
          body: `**How to submit a suggestion** <!--pine-bot:suggestions-->

1. Create a new post with a clear title.
2. Describe the idea and why it helps readers.
3. Staff will mark it Open → Accepted / Declined / Implemented.

One idea per post. Moderators and Admins manage suggestion status via their **server roles**.`,
        },
      },
      {
        key: "support",
        emoji: "🛟",
        title: "Support",
        kind: "text",
        topic: "Get help with Pine — bugs, account, and access questions",
        description: "Community help here; private issues go to in-app Support.",
        bot: {
          name: SUPPORT_BOT_NAME,
          marker: "<!--pine-bot:support-->",
          body: `**Need help?** <!--pine-bot:support-->

• **Account / billing / private issues** → open **Support** in the Pine app (keeps it private)
• **Community questions** → ask here and a Moderator will help
• **Bug reports** → include what you tried, device, and a screenshot if you can

Moderators and Admins watch this channel (role-synced permissions).`,
        },
      },
    ],
  },
  {
    name: "Reading",
    channels: [
      {
        key: "currently-reading",
        emoji: "📖",
        title: "Currently Reading",
        kind: "text",
        topic: "What are you reading right now?",
      },
      {
        key: "book-recs",
        emoji: "✨",
        title: "Book Recs",
        kind: "forum",
        topic: "Ask for recommendations or share a gem",
        description: "One book or vibe per post works best.",
      },
      {
        key: "reviews",
        emoji: "⭐",
        title: "Reviews",
        kind: "forum",
        topic: "Spoilers welcome — mark them clearly",
        description: "Short takes and full reviews.",
      },
      {
        key: "shelves",
        emoji: "📚",
        title: "Shelves",
        kind: "text",
        topic: "Show off a shelf, stack, or TBR pile",
      },
      {
        key: "reading-goals",
        emoji: "🎯",
        title: "Reading Goals",
        kind: "text",
        topic: "Yearly challenges, streaks, and progress",
      },
    ],
  },
  {
    name: "Hangout",
    channels: [
      {
        key: "general",
        emoji: "💬",
        title: "General",
        kind: "text",
        topic: "Everyday chat for Pine Hall",
      },
      {
        key: "off-topic",
        emoji: "🎲",
        title: "Off Topic",
        kind: "text",
        topic: "Life beyond books (still keep it friendly)",
      },
      {
        key: "media",
        emoji: "🎬",
        title: "Media",
        kind: "text",
        topic: "Bookish shows, podcasts, and adaptations",
      },
    ],
  },
  {
    name: "Voice",
    channels: [
      {
        key: "reading-lounge",
        emoji: "🎧",
        title: "Reading Lounge",
        kind: "voice",
        topic: "Quiet co-reading and soft hangouts",
      },
      {
        key: "book-club",
        emoji: "🎙️",
        title: "Book Club",
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

async function upsertBotMessage(input: {
  groupId: string;
  botName: string;
  marker: string;
  body: string;
}): Promise<void> {
  const { data: existing } = await supabase
    .from("community_messages")
    .select("id")
    .eq("group_id", input.groupId)
    .ilike("body", `%${input.marker}%`)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("community_messages")
      .update({
        body: input.body,
        author_name: input.botName,
        kind: "chat",
        edited_at: new Date().toISOString(),
      })
      .eq("id", existing.id as string);
    return;
  }

  await supabase.from("community_messages").insert({
    group_id: input.groupId,
    author_id: null,
    body: input.body,
    kind: "chat",
    author_name: input.botName,
  });
}

type RoleRef = { id: string; name: string; isEveryone: boolean };

async function syncStaffWriteOverrides(
  serverId: string,
  channelId: string,
  roles: RoleRef[],
): Promise<void> {
  const member =
    roles.find((r) => r.isEveryone) ?? roles.find((r) => r.name === "Member");
  const staff = roles.filter((r) => ["Owner", "Admin", "Moderator"].includes(r.name));

  if (member) {
    await upsertPermissionOverride({
      serverId,
      targetType: "channel",
      targetId: channelId,
      roleId: member.id,
      patch: {
        allowView: true,
        allowSendMessages: false,
        allowManageMessages: false,
        allowManageChannel: false,
      },
    });
  }

  for (const role of staff) {
    await upsertPermissionOverride({
      serverId,
      targetType: "channel",
      targetId: channelId,
      roleId: role.id,
      patch: {
        allowView: true,
        allowSendMessages: true,
        allowManageMessages: true,
        allowManageChannel: role.name !== "Moderator",
      },
    });
  }
}

async function syncStaffManageOverrides(
  serverId: string,
  channelId: string,
  roles: RoleRef[],
): Promise<void> {
  const staff = roles.filter((r) => ["Owner", "Admin", "Moderator"].includes(r.name));
  for (const role of staff) {
    await upsertPermissionOverride({
      serverId,
      targetType: "channel",
      targetId: channelId,
      roleId: role.id,
      patch: {
        allowView: true,
        allowSendMessages: true,
        allowManageMessages: true,
      },
    });
  }
}

/** Idempotent category + channel seed for Pine Hall (emoji | Title Case). */
export async function seedPineHallLayout(serverId: string, userId: string): Promise<void> {
  const existingCategories = await listCommunityCategories(serverId);
  const existingGroups = await listCommunityGroups(userId, serverId);
  const categoryByName = new Map(
    existingCategories.map((c) => [c.name.trim().toLowerCase(), c] as const),
  );
  const groupByKey = new Map(
    existingGroups.map((g) => [normalizeChannelKey(g.name), g] as const),
  );

  const { data: roleRows } = await supabase
    .from("community_server_roles")
    .select("id, name, is_everyone")
    .eq("server_id", serverId);
  const roles: RoleRef[] = (roleRows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    isEveryone: Boolean(r.is_everyone),
  }));

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
      const wantedName = channelDisplayName(ch);
      let group = groupByKey.get(ch.key) ?? null;

      if (!group) {
        group = await createCommunityGroup({
          serverId,
          name: wantedName,
          kind: ch.kind,
          topic: ch.topic,
          description: ch.description,
          categoryId: category.id,
          userId,
        });
        groupByKey.set(ch.key, group);
      } else {
        const needsUpdate =
          group.name !== wantedName ||
          group.kind !== ch.kind ||
          group.topic !== ch.topic ||
          (ch.description !== undefined && group.description !== ch.description) ||
          group.categoryId !== category.id;
        if (needsUpdate) {
          await updateCommunityGroup(group.id, {
            name: wantedName,
            kind: ch.kind,
            topic: ch.topic,
            description: ch.description ?? group.description,
            categoryId: category.id,
          });
          group = {
            ...group,
            name: wantedName,
            kind: ch.kind,
            topic: ch.topic,
            description: ch.description ?? group.description,
            categoryId: category.id,
          };
          groupByKey.set(ch.key, group);
        }
        await syncServerMembersToChannel(serverId, group.id, userId).catch(() => undefined);
      }

      if (ch.bot) {
        await upsertBotMessage({
          groupId: group.id,
          botName: ch.bot.name,
          marker: ch.bot.marker,
          body: ch.bot.body,
        });
      }

      if (ch.staffWriteOnly) {
        await syncStaffWriteOverrides(serverId, group.id, roles);
      }
      if (ch.key === "suggestions" || ch.key === "support") {
        await syncStaffManageOverrides(serverId, group.id, roles);
      }
    }
  }
}

async function finalizePineHall(serverId: string, userId: string): Promise<void> {
  const groups = await listCommunityGroups(userId, serverId);
  const byKey = new Map(groups.map((g) => [normalizeChannelKey(g.name), g] as const));
  const rules = byKey.get("rules");
  const general = byKey.get("general");
  const announcements = byKey.get("announcements");

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
    await seedRoles(rpcId as string).catch(() => undefined);
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
        welcome_message: PINE_HALL_WELCOME,
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
