import type { MentionMember } from "@/lib/community-mentions";

export type MarkdownInlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; children: MarkdownInlineNode[] }
  | { type: "italic"; children: MarkdownInlineNode[] }
  | { type: "underline"; children: MarkdownInlineNode[] }
  | { type: "strike"; children: MarkdownInlineNode[] }
  | { type: "spoiler"; children: MarkdownInlineNode[] }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string }
  | { type: "autolink"; href: string }
  | { type: "mention"; handle: string; label: string; known: boolean }
  | { type: "role-mention"; name: string; color: string }
  | { type: "channel"; name: string; known: boolean }
  | { type: "special-mention"; value: "@everyone" | "@here" }
  | { type: "emoji"; name: string }
  | { type: "sticker"; name: string }
  | { type: "timestamp"; unix: number; style: string };

export type MarkdownBlockNode =
  | { type: "paragraph"; children: MarkdownInlineNode[] }
  | { type: "blockquote"; children: MarkdownBlockNode[] }
  | { type: "codeblock"; language?: string; value: string }
  | { type: "heading"; level: 1 | 2 | 3; children: MarkdownInlineNode[] }
  | { type: "subtext"; children: MarkdownInlineNode[] }
  | { type: "image"; url: string }
  | { type: "link-preview"; url: string; hostname: string }
  | { type: "spacer" };

export type MarkdownContext = {
  mentionMembers?: MentionMember[];
  channelNames?: Set<string>;
  emojiNames?: Set<string>;
  stickerNames?: Set<string>;
  roles?: { name: string; color: string; mentionable: boolean }[];
};

const URL_RE =
  /https?:\/\/[^\s<>)}\]]+/gi;
const IMAGE_URL_RE =
  /^(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s]*)?|data:image\/[^\s]+|\/api\/(?:community\/)?covers\?[^\s]+)$/i;
const MARKDOWN_IMAGE_RE = /^!\[[^\]]*\]\(([^)]+)\)$/;

export function isRenderableImageUrl(url: string): boolean {
  const trimmed = url.trim();
  return IMAGE_URL_RE.test(trimmed) || MARKDOWN_IMAGE_RE.test(trimmed);
}

export function extractImageUrl(line: string): string | null {
  const trimmed = line.trim();
  if (IMAGE_URL_RE.test(trimmed)) return trimmed;
  const markdown = MARKDOWN_IMAGE_RE.exec(trimmed);
  if (markdown?.[1] && IMAGE_URL_RE.test(markdown[1].trim())) return markdown[1].trim();
  if (markdown?.[1]?.startsWith("/api/covers") || markdown?.[1]?.startsWith("/api/community/covers")) {
    return markdown[1].trim();
  }
  return null;
}

function mentionMap(members: MentionMember[] = []) {
  const map = new Map<string, string>();
  for (const m of members) {
    if (m.username) map.set(m.username.toLowerCase(), m.label);
    map.set(m.label.replace(/\s+/g, "").toLowerCase(), m.label);
  }
  return map;
}

function isEscaped(text: string, index: number): boolean {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) slashes++;
  return slashes % 2 === 1;
}

function readDelimited(
  text: string,
  start: number,
  open: string,
  close: string,
): { inner: string; end: number } | null {
  if (!text.startsWith(open, start) || isEscaped(text, start)) return null;
  let i = start + open.length;
  while (i < text.length) {
    if (text.startsWith(close, i) && !isEscaped(text, i)) {
      return { inner: text.slice(start + open.length, i), end: i + close.length };
    }
    i++;
  }
  return null;
}

function parseInline(text: string, ctx: MarkdownContext): MarkdownInlineNode[] {
  const nodes: MarkdownInlineNode[] = [];
  const mentions = mentionMap(ctx.mentionMembers);
  let i = 0;

  const pushText = (value: string) => {
    if (!value) return;
    const last = nodes[nodes.length - 1];
    if (last?.type === "text") last.value += value;
    else nodes.push({ type: "text", value });
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === "\\" && i + 1 < text.length && !isEscaped(text, i)) {
      pushText(text[i + 1]!);
      i += 2;
      continue;
    }

    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        nodes.push({ type: "code", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    const spoiler = readDelimited(text, i, "||", "||");
    if (spoiler) {
      nodes.push({ type: "spoiler", children: parseInline(spoiler.inner, ctx) });
      i = spoiler.end;
      continue;
    }

    const bold = readDelimited(text, i, "**", "**");
    if (bold) {
      nodes.push({ type: "bold", children: parseInline(bold.inner, ctx) });
      i = bold.end;
      continue;
    }

    const underline = readDelimited(text, i, "__", "__");
    if (underline) {
      nodes.push({ type: "underline", children: parseInline(underline.inner, ctx) });
      i = underline.end;
      continue;
    }

    const strike = readDelimited(text, i, "~~", "~~");
    if (strike) {
      nodes.push({ type: "strike", children: parseInline(strike.inner, ctx) });
      i = strike.end;
      continue;
    }

    if (ch === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i + 1 && text[end + 1] !== "*") {
        const inner = text.slice(i + 1, end);
        nodes.push({ type: "italic", children: parseInline(inner, ctx) });
        i = end + 1;
        continue;
      }
    }

    if (ch === "_" && text[i + 1] !== "_") {
      const end = text.indexOf("_", i + 1);
      if (end > i + 1 && text[end + 1] !== "_") {
        const inner = text.slice(i + 1, end);
        nodes.push({ type: "italic", children: parseInline(inner, ctx) });
        i = end + 1;
        continue;
      }
    }

    if (ch === "[") {
      const closeBracket = text.indexOf("](", i + 1);
      const closeParen = closeBracket > 0 ? text.indexOf(")", closeBracket + 2) : -1;
      if (closeBracket > 0 && closeParen > closeBracket) {
        const label = text.slice(i + 1, closeBracket);
        const href = text.slice(closeBracket + 2, closeParen);
        nodes.push({ type: "link", label, href });
        i = closeParen + 1;
        continue;
      }
    }

    if (ch === "<" && text.startsWith("<t:", i)) {
      const close = text.indexOf(">", i);
      if (close > i) {
        const inner = text.slice(i + 3, close);
        const [unixRaw, style = "f"] = inner.split(":");
        const unix = Number(unixRaw);
        if (Number.isFinite(unix)) {
          nodes.push({ type: "timestamp", unix, style: style.toLowerCase() });
          i = close + 1;
          continue;
        }
      }
    }

    if (ch === ":") {
      const end = text.indexOf(":", i + 1);
      if (end > i + 1) {
        const name = text.slice(i + 1, end);
        if (/^[a-zA-Z0-9_]{2,32}$/.test(name)) {
          if (ctx.stickerNames?.has(name)) {
            nodes.push({ type: "sticker", name });
            i = end + 1;
            continue;
          }
          if (ctx.emojiNames?.has(name)) {
            nodes.push({ type: "emoji", name });
            i = end + 1;
            continue;
          }
        }
      }
    }

    if (ch === "@") {
      const mentionableRoles = [...(ctx.roles ?? [])]
        .filter((r) => r.mentionable)
        .sort((a, b) => b.name.length - a.name.length);
      for (const role of mentionableRoles) {
        const token = `@${role.name}`;
        if (text.slice(i, i + token.length).toLowerCase() === token.toLowerCase()) {
          const after = text[i + token.length];
          if (!after || /[\s,.!?]/.test(after)) {
            nodes.push({ type: "role-mention", name: role.name, color: role.color });
            i += token.length;
            continue;
          }
        }
      }

      const match = /^@([a-zA-Z0-9._-]{2,32}|everyone|here)/.exec(text.slice(i));
      if (match) {
        const token = match[0];
        if (token === "@everyone" || token === "@here") {
          nodes.push({ type: "special-mention", value: token });
        } else {
          const handle = match[1] ?? "";
          const label = mentions.get(handle.toLowerCase());
          nodes.push({
            type: "mention",
            handle,
            label: label ? `@${label}` : `@${handle}`,
            known: Boolean(label),
          });
        }
        i += token.length;
        continue;
      }
    }

    if (ch === "#") {
      const match = /^#([a-zA-Z0-9_-]{1,100})/.exec(text.slice(i));
      if (match) {
        const name = match[1] ?? "";
        nodes.push({
          type: "channel",
          name,
          known: ctx.channelNames?.has(name.toLowerCase()) ?? false,
        });
        i += match[0].length;
        continue;
      }
    }

    URL_RE.lastIndex = i;
    const urlMatch = URL_RE.exec(text);
    if (urlMatch && urlMatch.index === i) {
      nodes.push({ type: "autolink", href: urlMatch[0] });
      i += urlMatch[0].length;
      continue;
    }

    pushText(ch);
    i++;
  }

  return nodes.length > 0 ? nodes : text ? [{ type: "text", value: text }] : [];
}

function splitCodeFences(text: string): Array<{ type: "code" | "text"; value: string; language?: string }> {
  const parts: Array<{ type: "code" | "text"; value: string; language?: string }> = [];
  let i = 0;
  while (i < text.length) {
    const fence = text.indexOf("```", i);
    if (fence < 0) {
      parts.push({ type: "text", value: text.slice(i) });
      break;
    }
    if (fence > i) parts.push({ type: "text", value: text.slice(i, fence) });
    const langEnd = text.indexOf("\n", fence + 3);
    if (langEnd < 0) {
      parts.push({ type: "text", value: text.slice(fence) });
      break;
    }
    const language = text.slice(fence + 3, langEnd).trim() || undefined;
    const close = text.indexOf("```", langEnd + 1);
    if (close < 0) {
      parts.push({ type: "text", value: text.slice(fence) });
      break;
    }
    parts.push({ type: "code", value: text.slice(langEnd + 1, close), language });
    i = close + 3;
  }
  return parts;
}

function parseTextBlocks(text: string, ctx: MarkdownContext): MarkdownBlockNode[] {
  const blocks: MarkdownBlockNode[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim() === "") {
      blocks.push({ type: "spacer" });
      i++;
      continue;
    }

    if (line.startsWith(">>>")) {
      const quoteLines = [line.slice(3).trimStart()];
      i++;
      while (i < lines.length && (lines[i] ?? "").trim() !== "") {
        quoteLines.push(lines[i] ?? "");
        i++;
      }
      const inner = quoteLines.join("\n");
      blocks.push({
        type: "blockquote",
        children: parseTextBlocks(inner, ctx).filter((b) => b.type !== "spacer"),
      });
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push({
        type: "blockquote",
        children: [{ type: "paragraph", children: parseInline(line.slice(2), ctx) }],
      });
      i++;
      continue;
    }

    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1]!.length as 1 | 2 | 3,
        children: parseInline(heading[2] ?? "", ctx),
      });
      i++;
      continue;
    }

    if (line.startsWith("-# ")) {
      blocks.push({
        type: "subtext",
        children: parseInline(line.slice(3), ctx),
      });
      i++;
      continue;
    }

    if (extractImageUrl(line)) {
      blocks.push({ type: "image", url: extractImageUrl(line)! });
      i++;
      continue;
    }

    const urlOnly = /^(https?:\/\/[^\s]+)$/i.exec(line.trim());
    if (urlOnly) {
      try {
        const hostname = new URL(urlOnly[1]!).hostname.replace(/^www\./, "");
        blocks.push({ type: "link-preview", url: urlOnly[1]!, hostname });
        i++;
        continue;
      } catch {
        /* fall through */
      }
    }

    blocks.push({ type: "paragraph", children: parseInline(line, ctx) });
    i++;
  }

  return blocks;
}

export function parseCommunityMarkdown(body: string, ctx: MarkdownContext = {}): MarkdownBlockNode[] {
  if (!body) return [];

  const blocks: MarkdownBlockNode[] = [];
  for (const segment of splitCodeFences(body)) {
    if (segment.type === "code") {
      blocks.push({ type: "codeblock", language: segment.language, value: segment.value.replace(/\n$/, "") });
    } else {
      blocks.push(...parseTextBlocks(segment.value, ctx));
    }
  }

  return blocks;
}

export function formatDiscordTimestamp(unix: number, style: string): string {
  const d = new Date(unix * 1000);
  switch (style) {
    case "t":
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    case "T":
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
    case "d":
      return d.toLocaleDateString(undefined, { day: "numeric", month: "numeric", year: "numeric" });
    case "D":
      return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    case "f":
      return d.toLocaleString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    case "F":
      return d.toLocaleString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    case "Y":
      return String(d.getFullYear());
    case "Y":
      return String(d.getFullYear());
    case "R": {
      const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
      const abs = Math.abs(diffSec);
      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
      if (abs < 60) return rtf.format(diffSec, "second");
      if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
      return rtf.format(Math.round(diffSec / 86400), "day");
    }
    default:
      return d.toLocaleString();
  }
}

export function plainTextFromMarkdown(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/, "").replace(/```$/, ""))
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\|\|([^|]+)\|\|/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
