const DRAFTS_KEY = "community-channel-drafts";

function readMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(map));
}

export function getChannelDraft(groupId: string): string {
  return readMap()[groupId] ?? "";
}

export function setChannelDraft(groupId: string, text: string) {
  const map = readMap();
  if (text.trim()) map[groupId] = text;
  else delete map[groupId];
  writeMap(map);
}

export function getAllChannelDrafts(): Map<string, string> {
  return new Map(Object.entries(readMap()));
}

export function draftPreview(text: string, max = 32): string | null {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}
