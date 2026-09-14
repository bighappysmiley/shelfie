import { supabase } from "./supabase";
import {
  createCommunityCategory,
  createCommunityGroup,
  getServer,
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
/** Hall bot — separate from a human “Pine” official account you can create yourself. */
export const PINE_BOT_NAME = "Pine Hall";
export const SUGGESTIONS_BOT_NAME = "Suggestions";
export const SUPPORT_BOT_NAME = "Support";

const PINE_HALL_DESCRIPTION =
  "The official Pine reading hall — currently reading, recommendations, reviews, and a cozy place to talk books.";

const PINE_HALL_RULES = `1. Be kind — treat readers and their tastes with respect.
2. Spoilers need a clear warning in the first line.
3. Keep it bookish or friendly; spam and harassment get removed.
4. No pirated books or illegal download links.
5. Have fun — this hall is for discovering the next great read.`;

const PINE_HALL_WELCOME =
  "Welcome to Pine Hall! Start in #🌲 | Start Here, say hi in #👋 | Introductions, then share what you’re reading in #📖 | Currently Reading.";

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
  recommendations: "book-recs",
  readinggoals: "challenges",
  "reading-goals": "challenges",
  challenges: "challenges",
  offtopic: "off-topic",
  "off-topic": "off-topic",
  general: "lounge",
  lounge: "lounge",
  readinglounge: "quiet-reading",
  "reading-lounge": "quiet-reading",
  "quiet-reading": "quiet-reading",
  bookclub: "book-club",
  "book-club": "book-club",
  shelves: "shelves",
  reviews: "reviews",
  events: "events",
  introductions: "introductions",
  media: "media",
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

/** Bot / system authors (null author_id). Keeps legacy "Pine" messages marked as bots. */
export function isBotAuthorName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === "pine hall" ||
    n === "pine" ||
    n === "suggestions" ||
    n === "support" ||
    n === "server"
  );
}

type ChannelSeed = {
  key: string;
  emoji: string;
  title: string;
  kind: CommunityGroupKind;
  topic: string;
  description?: string;
  /** @everyone cannot send; Owner / Admin / Moderator can. */
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

/**
 * Official Pine Hall layout — clearer categories, stronger onboarding,
 * and reading-first channels that stay easy to browse.
 */
const PINE_HALL_LAYOUT: CategorySeed[] = [
  {
    name: "Information",
    channels: [
      {
        key: "announcements",
        emoji: "📢",
        title: "Announcements",
        kind: "announcement",
        topic: "Official Pine Hall updates and community news",
        description: "Staff posts only — follow for hall news.",
        staffWriteOnly: true,
        bot: {
          name: PINE_BOT_NAME,
          marker: "<!--pine-bot:announcements-->",
          body: `**Welcome to Pine Hall** <!--pine-bot:announcements-->

This is the official announcements channel for Pine Hall.

Staff post product updates, reading events, and community news here. You’ll get notified for important posts — settle in and enjoy the bookshelf.

Looking for a human voice from the team? Create or follow the **Pine** official account — this bot stays as **Pine Hall**.`,
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
        key: "start-here",
        emoji: "🌲",
        title: "Start Here",
        kind: "text",
        topic: "New to Pine Hall? Start with this short path",
        bot: {
          name: PINE_BOT_NAME,
          marker: "<!--pine-bot:start-here-->",
          body: `**Start here** <!--pine-bot:start-here-->

1. Read **#📕 | Rules**
2. Say hi in **#👋 | Introductions**
3. Share what you’re reading in **#📖 | Currently Reading**
4. Want a rec? Post in **#✨ | Book Recs**
5. Need help? **#🛟 | Support** · Have an idea? **#💡 | Suggestions**

Your **server role** controls what you can do in each channel — ask a mod if you need access.`,
        },
      },
      {
        key: "events",
        emoji: "🗓️",
        title: "Events",
        kind: "text",
        topic: "Read-alongs, buddy reads, and hall events",
        description: "Staff and hosts post upcoming reading events.",
        staffWriteOnly: true,
        bot: {
          name: PINE_BOT_NAME,
          marker: "<!--pine-bot:events-->",
          body: `**Events board** <!--pine-bot:events-->

Buddy reads, seasonal challenges, and live book-club nights get posted here.

Want to host something? Ask a Moderator in **#💬 | Lounge** and we’ll help you get it on the calendar.`,
        },
      },
    ],
  },
  {
    name: "Lobby",
    channels: [
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
• What you’re reading right now

We’re glad you’re here.`,
        },
      },
      {
        key: "lounge",
        emoji: "💬",
        title: "Lounge",
        kind: "text",
        topic: "Everyday chat for Pine Hall",
      },
      {
        key: "off-topic",
        emoji: "🎲",
        title: "Off Topic",
        kind: "text",
        topic: "Life beyond books — still keep it friendly",
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
    name: "Books",
    channels: [
      {
        key: "currently-reading",
        emoji: "📖",
        title: "Currently Reading",
        kind: "text",
        topic: "What page are you on right now?",
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
        key: "challenges",
        emoji: "🎯",
        title: "Challenges",
        kind: "text",
        topic: "Reading goals, streaks, and seasonal challenges",
      },
    ],
  },
  {
    name: "Help",
    channels: [
      {
        key: "suggestions",
        emoji: "💡",
        title: "Suggestions",
        kind: "forum",
        topic: "Feature ideas and hall improvements",
        description: "One idea per post — Moderators review with roles.",
        bot: {
          name: SUGGESTIONS_BOT_NAME,
          marker: "<!--pine-bot:suggestions-->",
          body: `**How to submit a suggestion** <!--pine-bot:suggestions-->

1. Create a new post with a clear title.
2. Describe the idea and why it helps readers.
3. Staff will mark it Open → Accepted / Declined / Implemented.

One idea per post. Moderators and Admins manage status via their **server roles**.`,
        },
      },
      {
        key: "support",
        emoji: "🛟",
        title: "Support",
        kind: "text",
        topic: "Get help with Pine — bugs, account, and access",
        description: "Community help here; private issues go to in-app Support.",
        bot: {
          name: SUPPORT_BOT_NAME,
          marker: "<!--pine-bot:support-->",
          body: `**Need help?** <!--pine-bot:support-->

• **Account / billing / private issues** → open **Support** in the Pine app
• **Hall questions** → ask here and a Moderator will help
• **Bug reports** → include what you tried, device, and a screenshot if you can

Moderators and Admins watch this channel (role-synced permissions).`,
        },
      },
    ],
  },
  {
    name: "Voice",
    channels: [
      {
        key: "quiet-reading",
        emoji: "🎧",
        title: "Quiet Reading",
        kind: "voice",
        topic: "Soft co-reading and quiet hangouts",
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

async function renameCategoryIfNeeded(
  categoryByName: Map<string, Awaited<ReturnType<typeof listCommunityCategories>>[number]>,
  fromName: string,
  toName: string,
): Promise<void> {
  const from = categoryByName.get(fromName.toLowerCase());
  if (!from || categoryByName.has(toName.toLowerCase())) return;
  await supabase.from("community_categories").update({ name: toName }).eq("id", from.id);
  categoryByName.delete(fromName.toLowerCase());
  categoryByName.set(toName.toLowerCase(), { ...from, name: toName });
}

/** Idempotent category + channel seed for Pine Hall. */
export async function seedPineHallLayout(serverId: string, userId: string): Promise<void> {
  const existingCategories = await listCommunityCategories(serverId);
  const existingGroups = await listCommunityGroups(userId, serverId);
  const categoryByName = new Map(
    existingCategories.map((c) => [c.name.trim().toLowerCase(), c] as const),
  );
  const groupByKey = new Map(
    existingGroups.map((g) => [normalizeChannelKey(g.name), g] as const),
  );

  await renameCategoryIfNeeded(categoryByName, "Welcome", "Information");
  await renameCategoryIfNeeded(categoryByName, "Reading", "Books");
  await renameCategoryIfNeeded(categoryByName, "Hangout", "Lobby");

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

  // Rename leftover bot posts still signed as "Pine" → "Pine Hall".
  const groupIds = [...groupByKey.values()].map((g) => g.id);
  if (groupIds.length > 0) {
    try {
      await supabase
        .from("community_messages")
        .update({ author_name: PINE_BOT_NAME, edited_at: new Date().toISOString() })
        .is("author_id", null)
        .eq("author_name", "Pine")
        .in("group_id", groupIds);
    } catch {
      /* best-effort rename of legacy bot posts */
    }
  }
}

async function finalizePineHall(serverId: string, userId: string): Promise<void> {
  const groups = await listCommunityGroups(userId, serverId);
  const byKey = new Map(groups.map((g) => [normalizeChannelKey(g.name), g] as const));
  const rules = byKey.get("rules");
  const introductions = byKey.get("introductions");
  const lounge = byKey.get("lounge");
  const announcements = byKey.get("announcements");

  await updateServer(serverId, {
    name: PINE_HALL_NAME,
    description: PINE_HALL_DESCRIPTION,
    rules: PINE_HALL_RULES,
    welcomeMessage: PINE_HALL_WELCOME,
    rulesChannelId: rules?.id ?? null,
    systemChannelId: introductions?.id ?? lounge?.id ?? announcements?.id ?? null,
    vanitySlug: "pine-hall",
    isPublic: true,
    joinMode: "open",
    isOfficial: true,
    officialPosition: 0,
    libraryId: null,
    verificationLevel: "low",
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
    const server = await getServer(rpcId as string).catch(() => null);
    if (server) return { ...server, isMember: true, canManage: true };
  }

  await supabase
    .from("community_servers")
    .update({ name: PINE_HALL_NAME, updated_at: new Date().toISOString() })
    .eq("name", "General");

  const { data: existing } = await supabase
    .from("community_servers")
    .select("id")
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

  const fresh = await getServer(serverId);
  if (!fresh) throw new Error("Pine Hall missing after create");
  return { ...fresh, isMember: true, canManage: true };
}
