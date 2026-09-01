export type SlashCommand = {
  name: string;
  description: string;
  insert?: string;
  action?: "timestamp";
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "timestamp", description: "Insert a formatted date or time", action: "timestamp" },
  { name: "me", description: "Send an action message", insert: "*%text%*" },
  { name: "shrug", description: "Append ¯\\_(ツ)_/¯", insert: "¯\\_(ツ)_/¯" },
  { name: "tableflip", description: "Append (╯°□°）╯︵ ┻━┻", insert: "(╯°□°）╯︵ ┻━┻" },
  { name: "unflip", description: "Append ┬─┬ノ( º _ ºノ)", insert: "┬─┬ノ( º _ ºノ)" },
];

export function extractSlashQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = /(?:^|\s)\/([a-z]*)$/i.exec(before);
  return match ? (match[1] ?? "") : null;
}

export function filterSlashCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(q));
}

export function applySlashCommand(text: string, cursor: number, command: SlashCommand): {
  text: string;
  cursor: number;
  action?: "timestamp";
} {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  const match = /(?:^|\s)\/[a-z]*$/i.exec(before);
  if (!match) return { text, cursor };
  const start = before.length - match[0].length + (match[0].startsWith(" ") ? 1 : 0);
  if (command.action === "timestamp") {
    const next = `${text.slice(0, start)}${after.trimStart()}`;
    return { text: next, cursor: start, action: "timestamp" };
  }
  const insert = command.insert ?? `/${command.name} `;
  const next = `${text.slice(0, start)}${insert}${after}`;
  return { text: next, cursor: start + insert.length };
}
