import { useState } from "react";
import { AuthedImage } from "@/components/AuthedImage";
import { IconCopy } from "@/components/Icons";
import { highlightCode } from "@/lib/code-highlight";
import type { MentionMember, MentionRole } from "@/lib/community-mentions";
import {
  formatDiscordTimestamp,
  parseCommunityMarkdown,
  type MarkdownBlockNode,
  type MarkdownContext,
  type MarkdownInlineNode,
} from "@/lib/community-markdown";
import { roleColorTextStyle } from "@/lib/role-color";
import type { CommunityServerEmoji, CommunityServerSticker } from "@/lib/community-types";

function highlightText(text: string, query?: string) {
  if (!query?.trim()) return text;
  const q = query.trim();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200/40 px-0.5 text-inherit dark:bg-yellow-500/30">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function Spoiler({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className={`community-spoiler rounded px-1 ${revealed ? "community-spoiler--revealed" : ""}`}
      aria-label={revealed ? undefined : "Reveal spoiler"}
    >
      {children}
    </button>
  );
}

function InlineNodes({
  nodes,
  emojiByName,
  stickerByName,
  searchQuery,
}: {
  nodes: MarkdownInlineNode[];
  emojiByName: Map<string, CommunityServerEmoji>;
  stickerByName: Map<string, CommunityServerSticker>;
  searchQuery?: string;
}) {
  return (
    <>
      {nodes.map((node, i) => (
        <InlineNode
          key={i}
          node={node}
          emojiByName={emojiByName}
          stickerByName={stickerByName}
          searchQuery={searchQuery}
        />
      ))}
    </>
  );
}

function InlineNode({
  node,
  emojiByName,
  stickerByName,
  searchQuery,
}: {
  node: MarkdownInlineNode;
  emojiByName: Map<string, CommunityServerEmoji>;
  stickerByName: Map<string, CommunityServerSticker>;
  searchQuery?: string;
}) {
  switch (node.type) {
    case "text":
      return <>{highlightText(node.value, searchQuery)}</>;
    case "bold":
      return (
        <strong className="font-semibold">
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
        </strong>
      );
    case "italic":
      return (
        <em className="italic">
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
        </em>
      );
    case "underline":
      return (
        <span className="underline">
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
        </span>
      );
    case "strike":
      return (
        <span className="line-through">
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
        </span>
      );
    case "spoiler":
      return (
        <Spoiler>
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
        </Spoiler>
      );
    case "code":
      return <code className="community-inline-code rounded px-1 py-0.5 font-mono text-[0.85em]">{node.value}</code>;
    case "link":
      return (
        <a href={node.href} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
          {node.label}
        </a>
      );
    case "autolink":
      return (
        <a href={node.href} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
          {node.href}
        </a>
      );
    case "mention":
      return (
        <span className={`community-mention rounded px-0.5 font-medium ${node.known ? "" : "opacity-80"}`}>
          {node.label}
        </span>
      );
    case "role-mention":
      return (
        <span
          className="community-mention rounded px-0.5 font-medium"
          style={roleColorTextStyle(node.color)}
        >
          @{node.name}
        </span>
      );
    case "channel":
      return <span className="community-mention rounded px-0.5 font-medium">#{node.name}</span>;
    case "special-mention":
      return (
        <span className="community-mention community-mention--alert rounded px-0.5 font-medium">
          {node.value}
        </span>
      );
    case "emoji": {
      const emoji = emojiByName.get(node.name);
      if (emoji) {
        return (
          <span title={`:${node.name}:`}>
            <AuthedImage
              src={emoji.imageUrl}
              alt={`:${node.name}:`}
              className="mx-0.5 inline h-[1.375rem] w-[1.375rem] align-text-bottom object-contain"
            />
          </span>
        );
      }
      return <span>:{node.name}:</span>;
    }
    case "sticker": {
      const sticker = stickerByName.get(node.name);
      if (sticker) {
        return (
          <AuthedImage
            src={sticker.imageUrl}
            alt={sticker.name}
            className="my-1 block max-h-40 max-w-[10rem] object-contain"
          />
        );
      }
      return <span>:{node.name}:</span>;
    }
    case "timestamp":
      return (
        <time
          dateTime={new Date(node.unix * 1000).toISOString()}
          className="rounded bg-[var(--community-channel-hover)] px-1 py-0.5 text-[0.8125rem]"
          title={new Date(node.unix * 1000).toLocaleString()}
        >
          {formatDiscordTimestamp(node.unix, node.style)}
        </time>
      );
    default:
      return null;
  }
}

function CodeBlock({ value, language }: { value: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = highlightCode(value, language);
  return (
    <div className="community-codeblock-wrap my-1 overflow-hidden rounded border border-[var(--community-border)]">
      <div className="flex items-center justify-between bg-[var(--community-panel)] px-2 py-1">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted hover:bg-[var(--community-hover)] hover:text-foreground"
        >
          <IconCopy size={12} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-[var(--community-input)] p-2 font-mono text-[0.8125rem] leading-relaxed">
        <code>
          {tokens.map((t, i) => (
            <span key={i} className={`code-token code-token--${t.type}`}>
              {t.value}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function BlockNode({
  block,
  emojiByName,
  stickerByName,
  searchQuery,
}: {
  block: MarkdownBlockNode;
  emojiByName: Map<string, CommunityServerEmoji>;
  stickerByName: Map<string, CommunityServerSticker>;
  searchQuery?: string;
}) {
  switch (block.type) {
    case "spacer":
      return <br />;
    case "paragraph":
      return (
        <p className="min-h-[1.375rem] whitespace-pre-wrap break-words">
          <InlineNodes nodes={block.children} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
        </p>
      );
    case "heading":
      return (
        <p
          className={
            block.level === 1
              ? "text-[1.5rem] font-bold leading-tight"
              : block.level === 2
                ? "text-center text-[1.125rem] font-semibold leading-snug"
                : "text-base font-bold leading-snug"
          }
        >
          <InlineNodes nodes={block.children} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
        </p>
      );
    case "subtext":
      return (
        <p className="text-xs text-muted">
          <InlineNodes nodes={block.children} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
        </p>
      );
    case "blockquote":
      return (
        <blockquote className="community-blockquote my-1 border-l-4 border-[var(--community-border)] pl-3">
          {block.children.map((child, i) => (
            <BlockNode key={i} block={child} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
          ))}
        </blockquote>
      );
    case "codeblock":
      return <CodeBlock value={block.value} language={block.language} />;
    case "image":
      return (
        <AuthedImage src={block.url} alt="" className="my-1 max-h-80 max-w-full rounded-lg object-contain" />
      );
    case "link-preview":
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="community-link-embed my-1 block max-w-md overflow-hidden rounded-lg border border-[var(--community-border)] bg-[var(--community-input)] hover:border-accent/40"
        >
          <div className="px-3 py-2">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{block.hostname}</p>
            <p className="mt-0.5 truncate text-sm text-link">{block.url}</p>
          </div>
        </a>
      );
    default:
      return null;
  }
}

export function CommunityMessageContent({
  body,
  mentionMembers = [],
  mentionRoles = [],
  channels = [],
  serverEmoji = [],
  serverStickers = [],
  searchQuery,
  className = "",
  compact = false,
}: {
  body: string;
  mentionMembers?: MentionMember[];
  mentionRoles?: MentionRole[];
  channels?: { name: string }[];
  serverEmoji?: CommunityServerEmoji[];
  serverStickers?: CommunityServerSticker[];
  searchQuery?: string;
  className?: string;
  compact?: boolean;
}) {
  const emojiByName = new Map(serverEmoji.map((e) => [e.name, e]));
  const stickerByName = new Map(serverStickers.map((s) => [s.name, s]));

  const ctx: MarkdownContext = {
    mentionMembers,
    channelNames: new Set(channels.map((c) => c.name.toLowerCase())),
    emojiNames: new Set(serverEmoji.map((e) => e.name)),
    stickerNames: new Set(serverStickers.map((s) => s.name)),
    roles: mentionRoles.map((r) => ({ name: r.name, color: r.color, mentionable: r.mentionable })),
  };

  const blocks = parseCommunityMarkdown(body, ctx);

  if (compact) {
    const flat = blocks
      .filter((b) => b.type === "paragraph" || b.type === "heading" || b.type === "subtext")
      .flatMap((b) => ("children" in b ? b.children : []));
    return (
      <span className={`truncate ${className}`}>
        <InlineNodes nodes={flat} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
      </span>
    );
  }

  return (
    <div className={`community-message-content space-y-0.5 text-base leading-[1.375rem] text-foreground ${className}`}>
      {blocks.map((block, i) => (
        <BlockNode key={i} block={block} emojiByName={emojiByName} stickerByName={stickerByName} searchQuery={searchQuery} />
      ))}
    </div>
  );
}

export function CommunityReactionEmoji({
  emoji,
  serverEmoji = [],
}: {
  emoji: string;
  serverEmoji?: CommunityServerEmoji[];
}) {
  const match = /^:([a-zA-Z0-9_]{2,32}):$/.exec(emoji);
  if (match) {
    const custom = serverEmoji.find((e) => e.name === match[1]);
    if (custom) {
      return <AuthedImage src={custom.imageUrl} alt={emoji} className="h-4 w-4 object-contain" />;
    }
  }
  return <span>{emoji}</span>;
}
