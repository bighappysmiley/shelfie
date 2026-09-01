import type { RefObject } from "react";
import { IconBold, IconCode, IconItalic, IconSpoiler, IconStrike, IconUnderline } from "@/components/Icons";

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder = "text",
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const cursor = start + before.length + selected.length + after.length;
  return { next, cursor, selectionStart: start + before.length, selectionEnd: start + before.length + selected.length };
}

export function FormattingToolbar({
  textareaRef,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string, cursor?: number) => void;
}) {
  const apply = (before: string, after: string, placeholder?: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { next, cursor, selectionStart, selectionEnd } = wrapSelection(el, before, after, placeholder);
    onChange(next, cursor);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const buttons = [
    { label: "Bold", icon: IconBold, action: () => apply("**", "**") },
    { label: "Italic", icon: IconItalic, action: () => apply("*", "*") },
    { label: "Underline", icon: IconUnderline, action: () => apply("__", "__") },
    { label: "Strikethrough", icon: IconStrike, action: () => apply("~~", "~~") },
    { label: "Spoiler", icon: IconSpoiler, action: () => apply("||", "||") },
    { label: "Inline code", icon: IconCode, action: () => apply("`", "`", "code") },
    {
      label: "Code block",
      icon: IconCode,
      action: () => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const value = el.value;
        const selected = value.slice(start, end) || "code";
        const block = `\`\`\`\n${selected}\n\`\`\``;
        const next = value.slice(0, start) + block + value.slice(end);
        onChange(next, start + block.length);
      },
    },
  ];

  return (
    <div className="mb-1 flex flex-wrap items-center gap-0.5">
      {buttons.map(({ label, icon: Icon, action }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          title={label}
          aria-label={label}
          className="flex h-7 w-7 items-center justify-center rounded text-muted transition hover:bg-[var(--community-hover)] hover:text-foreground"
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
