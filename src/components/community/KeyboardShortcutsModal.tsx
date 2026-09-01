import { CommunityModal } from "@/components/CommunityModal";

const SHORTCUTS = [
  { keys: "Enter", desc: "Send message" },
  { keys: "Shift + Enter", desc: "New line in composer" },
  { keys: "Ctrl/Cmd + B", desc: "Bold selected text" },
  { keys: "Ctrl/Cmd + I", desc: "Italic selected text" },
  { keys: "Ctrl/Cmd + F", desc: "Search in channel" },
  { keys: "Esc", desc: "Close search / panels" },
  { keys: "Shift + ?", desc: "Show this help" },
];

export function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <CommunityModal open={open} onClose={onClose} title="Keyboard shortcuts" tone="community">
      <ul className="space-y-2">
        {SHORTCUTS.map((s) => (
          <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted">{s.desc}</span>
            <kbd className="shrink-0 rounded bg-[var(--community-input)] px-2 py-0.5 font-mono text-xs text-foreground">
              {s.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </CommunityModal>
  );
}
