import { useState } from "react";
import { AuthedImage } from "@/components/AuthedImage";
import type { MentionMember } from "@/lib/community-mentions";
import {
  formatDiscordTimestamp,
  parseCommunityMarkdown,
  type MarkdownBlockNode,
  type MarkdownContext,
  type MarkdownInlineNode,
} from "@/lib/community-markdown";
import type { CommunityServerEmoji, CommunityServerSticker } from "@/lib/community-types";

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
}: {
  nodes: MarkdownInlineNode[];
  emojiByName: Map<string, CommunityServerEmoji>;
  stickerByName: Map<string, CommunityServerSticker>;
}) {
  return (
    <>
      {nodes.map((node, i) => (
        <InlineNode key={i} node={node} emojiByName={emojiByName} stickerByName={stickerByName} />
      ))}
    </>
  );
}

function InlineNode({
  node,
  emojiByName,
  stickerByName,
}: {
  node: MarkdownInlineNode;
  emojiByName: Map<string, CommunityServerEmoji>;
  stickerByName: Map<string, CommunityServerSticker>;
}) {
  switch (node.type) {
    case "text":
      return <>{node.value}</>;
    case "bold":
      return (
        <strong className="font-semibold">
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} />
        </strong>
      );
    case "italic":
      return (
        <em className="italic">
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} />
        </em>
      );
    case "underline":
      return (
        <span className="underline">
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} />
        </span>
      );
    case "strike":
      return (
        <span className="line-through">
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} />
        </span>
      );
    case "spoiler":
      return (
        <Spoiler>
          <InlineNodes nodes={node.children} emojiByName={emojiByName} stickerByName={stickerByName} />
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
        <span
          className={`community-mention rounded px-0.5 font-medium ${
            node.known ? "" : "opacity-80"
          }`}
        >
          {node.label}
        </span>
      );
    case "channel":
      return (
        <span className="community-mention rounded px-0.5 font-medium">
          #{node.name}
        </span>
      );
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

function BlockNode({
  block,
  emojiByName,
  stickerByName,
}: {
  block: MarkdownBlockNode;
  emojiByName: Map<string, CommunityServerEmoji>;
  stickerByName: Map<string, CommunityServerSticker>;
}) {
  switch (block.type) {
    case "spacer":
      return <br />;
    case "paragraph":
      return (
        <p className="min-h-[1.375rem] whitespace-pre-wrap break-words">
          <InlineNodes nodes={block.children} emojiByName={emojiByName} stickerByName={stickerByName} />
        </p>
      );
    case "heading":
      return (
        <p
          className={
            block.level === 1
              ? "text-2xl font-bold leading-tight"
              : block.level === 2
                ? "text-xl font-bold leading-snug"
                : "text-lg font-bold leading-snug"
          }
        >
          <InlineNodes nodes={block.children} emojiByName={emojiByName} stickerByName={stickerByName} />
        </p>
      );
    case "subtext":
      return (
        <p className="text-xs text-muted">
          <InlineNodes nodes={block.children} emojiByName={emojiByName} stickerByName={stickerByName} />
        </p>
      );
    case "blockquote":
      return (
        <blockquote className="community-blockquote my-1 border-l-4 border-[var(--community-border)] pl-3">
          {block.children.map((child, i) => (
            <BlockNode key={i} block={child} emojiByName={emojiByName} stickerByName={stickerByName} />
          ))}
        </blockquote>
      );
    case "codeblock":
      return (
        <pre className="community-codeblock my-1 overflow-x-auto rounded bg-[var(--community-input)] p-2 font-mono text-[0.8125rem] leading-relaxed">
          <code>{block.value}</code>
        </pre>
      );
    case "image":
      return (
        <AuthedImage
          src={block.url}
          alt=""
          className="my-1 max-h-80 max-w-full rounded-lg object-contain"
        />
      );
    default:
      return null;
  }
}

export function CommunityMessageContent({
  body,
  mentionMembers = [],
  channels = [],
  serverEmoji = [],
  serverStickers = [],
  className = "",
  compact = false,
}: {
  body: string;
  mentionMembers?: MentionMember[];
  channels?: { name: string }[];
  serverEmoji?: CommunityServerEmoji[];
  serverStickers?: CommunityServerSticker[];
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
  };

  const blocks = parseCommunityMarkdown(body, ctx);

  if (compact) {
    const flat = blocks
      .filter((b) => b.type === "paragraph" || b.type === "heading" || b.type === "subtext")
      .flatMap((b) => ("children" in b ? b.children : []));
    return (
      <span className={`truncate ${className}`}>
        <InlineNodes nodes={flat} emojiByName={emojiByName} stickerByName={stickerByName} />
      </span>
    );
  }

  return (
    <div className={`community-message-content space-y-0.5 text-base leading-[1.375rem] text-foreground ${className}`}>
      {blocks.map((block, i) => (
        <BlockNode key={i} block={block} emojiByName={emojiByName} stickerByName={stickerByName} />
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
