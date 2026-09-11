/** Treat Synk’s placeholder label as “no real name”. */
export function isUsableSynkName(name: string | null | undefined): boolean {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return false;
  if (/^synk\s+member$/i.test(trimmed)) return false;
  return true;
}

export function pickSynkDisplayName(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (isUsableSynkName(candidate)) return candidate!.trim();
  }
  return null;
}
