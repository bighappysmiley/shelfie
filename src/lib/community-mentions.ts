export type MentionMember = {
  userId: string;
  label: string;
  username?: string | null;
};

export type MentionRole = {
  id: string;
  name: string;
  color: string;
  mentionable: boolean;
};

const MENTION_RE = /@([a-zA-Z0-9._-]{2,32})/g;

export function extractMentionQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = /(?:^|\s)@([a-zA-Z0-9._-]*)$/.exec(before);
  return match ? (match[1] ?? "") : null;
}

export function filterMentionMembers(members: MentionMember[], query: string): MentionMember[] {
  const q = query.trim().toLowerCase();
  if (!q) return members.slice(0, 8);
  return members
    .filter((m) => {
      const label = m.label.toLowerCase();
      const user = (m.username ?? "").toLowerCase();
      return label.includes(q) || user.includes(q);
    })
    .slice(0, 8);
}

export function filterMentionRoles(roles: MentionRole[], query: string): MentionRole[] {
  const q = query.trim().toLowerCase();
  const mentionable = roles.filter((r) => r.mentionable);
  if (!q) return mentionable.slice(0, 5);
  return mentionable.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 5);
}

export function applyMention(text: string, cursor: number, member: MentionMember): { text: string; cursor: number } {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  const match = /(?:^|\s)@([a-zA-Z0-9._-]*)$/.exec(before);
  if (!match) return { text, cursor };
  const handle = member.username ? `@${member.username}` : `@${member.label.replace(/\s+/g, "")}`;
  const start = before.length - (match[1]?.length ?? 0) - 1;
  const next = `${before.slice(0, start)}${handle} `;
  const nextCursor = start + handle.length + 1;
  return { text: next + after, cursor: nextCursor };
}

export function applyRoleMention(text: string, cursor: number, role: MentionRole): { text: string; cursor: number } {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  const match = /(?:^|\s)@([a-zA-Z0-9._-]*)$/.exec(before);
  if (!match) return { text, cursor };
  const handle = `@${role.name}`;
  const start = before.length - (match[1]?.length ?? 0) - 1;
  const next = `${before.slice(0, start)}${handle} `;
  const nextCursor = start + handle.length + 1;
  return { text: next + after, cursor: nextCursor };
}

export function renderMessageWithMentions(
  body: string,
  members: MentionMember[],
): Array<{ type: "text" | "mention"; value: string }> {
  const byHandle = new Map<string, string>();
  for (const m of members) {
    if (m.username) byHandle.set(m.username.toLowerCase(), m.label);
    byHandle.set(m.label.replace(/\s+/g, "").toLowerCase(), m.label);
  }

  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  let last = 0;
  for (const match of body.matchAll(MENTION_RE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: "text", value: body.slice(last, index) });
    const handle = match[1] ?? "";
    const label = byHandle.get(handle.toLowerCase());
    parts.push({
      type: "mention",
      value: label ? `@${label}` : `@${handle}`,
    });
    last = index + match[0].length;
  }
  if (last < body.length) parts.push({ type: "text", value: body.slice(last) });
  return parts.length > 0 ? parts : [{ type: "text", value: body }];
}
