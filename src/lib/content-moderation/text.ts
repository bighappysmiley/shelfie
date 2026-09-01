import { BLOCKED_PHRASES, BLOCKED_URL_PATTERNS, PROFANITY_WORDS } from "./words";

export type TextModerationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "2": "z",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  $: "s",
  "!": "i",
  "+": "t",
};

function normalizeChar(char: string): string {
  const lower = char.toLowerCase();
  return LEET_MAP[lower] ?? lower;
}

/** Collapse leetspeak and strip decorative characters for token matching. */
export function normalizeForModeration(input: string): string {
  let out = "";
  for (const char of input) {
    if (/[a-z0-9@$!+]/i.test(char)) {
      out += normalizeChar(char);
    } else if (/\s/.test(char)) {
      out += " ";
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Remove spaces between single letters (e.g. "f u c k" → "fuck"). */
function collapseSpacedLetters(input: string): string {
  return input.replace(/(?:\b[a-z]\s+){2,}[a-z]\b/gi, (match) => match.replace(/\s+/g, ""));
}

/** Collapse stretched letters: fuuuuck → fuuck (max 2 repeats). */
function collapseRepeats(input: string): string {
  return input.replace(/(.)\1{2,}/g, "$1$1");
}

function tokenize(input: string): string[] {
  return input
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function findBlockedWord(text: string): string | null {
  const normalized = collapseRepeats(collapseSpacedLetters(normalizeForModeration(text)));
  const tokens = tokenize(normalized);

  for (const token of tokens) {
    if (PROFANITY_WORDS.has(token)) return token;
    if (token.length >= 5) {
      for (const word of PROFANITY_WORDS) {
        if (word.length >= 5 && token.includes(word)) return word;
      }
    }
  }

  const compact = normalized.replace(/\s+/g, "");
  for (const word of PROFANITY_WORDS) {
    if (word.length >= 5 && compact.includes(word)) return word;
  }

  return null;
}

function findBlockedPhrase(text: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  for (const phrase of BLOCKED_PHRASES) {
    if (lower.includes(phrase)) return phrase.trim();
  }
  return null;
}

function findBlockedUrl(text: string): string | null {
  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (pattern.test(text)) return pattern.source;
  }
  return null;
}

export function moderateTextContent(
  text: string,
  extraKeywords: string[] = [],
): TextModerationResult {
  const trimmed = text.trim();
  if (!trimmed) return { allowed: true };

  const blockedUrl = findBlockedUrl(trimmed);
  if (blockedUrl) {
    return {
      allowed: false,
      reason: "GIFs and certain media links are not allowed in messages.",
    };
  }

  const blockedPhrase = findBlockedPhrase(trimmed);
  if (blockedPhrase) {
    return {
      allowed: false,
      reason: "Message blocked: inappropriate or harmful language is not allowed.",
    };
  }

  const blockedWord = findBlockedWord(trimmed);
  if (blockedWord) {
    return {
      allowed: false,
      reason: "Message blocked: profanity and inappropriate language are not allowed.",
    };
  }

  const lower = trimmed.toLowerCase();
  for (const kw of extraKeywords) {
    const needle = kw.trim().toLowerCase();
    if (needle && lower.includes(needle)) {
      return {
        allowed: false,
        reason: `Message blocked by server filter (matched “${needle}”).`,
      };
    }
  }

  return { allowed: true };
}

export function isBlockedImageFile(file: File): string | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === "image/gif" || name.endsWith(".gif")) {
    return "GIF uploads are not allowed.";
  }
  if (type.startsWith("video/") || name.endsWith(".webm") || name.endsWith(".mp4")) {
    return "Video uploads are not allowed.";
  }
  if (!type.startsWith("image/")) {
    return "Only image uploads are allowed.";
  }
  return null;
}
