import type { SlashCommand } from "@/lib/community-slash-commands";

export function SlashCommandMenu({
  commands,
  onPick,
}: {
  commands: SlashCommand[];
  onPick: (command: SlashCommand) => void;
}) {
  if (commands.length === 0) return null;

  return (
    <ul className="mb-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--community-border)] bg-[var(--community-panel)] py-1 shadow-lg">
      {commands.map((cmd) => (
        <li key={cmd.name}>
          <button
            type="button"
            onClick={() => onPick(cmd)}
            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--community-hover)]"
          >
            <span className="font-mono text-sm text-accent">/{cmd.name}</span>
            <span className="text-sm text-muted">{cmd.description}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
