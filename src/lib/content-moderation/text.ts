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

const UNICODE_SPACES = /[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]/g;
const LETTER_SEPARATORS = /[\s._\-*•|/\\,`'"~]+/;

function normalizeChar(char: string): string {
  const lower = char.toLowerCase();
  return LEET_MAP[lower] ?? lower;
}

/** Collapse leetspeak and strip decorative characters for token matching. */
export function normalizeForModeration(input: string): string {
  const spaced = input.replace(UNICODE_SPACES, " ");
  const isWordish = (c: string | undefined) => !!c && /[a-z0-9@$!+]/i.test(c);

  let out = "";
  for (let i = 0; i < spaced.length; i++) {
    const char = spaced[i];
    if (/[a-z0-9]/i.test(char)) {
      out += normalizeChar(char);
    } else if (/[@$!+]/.test(char)) {
      const prev = spaced[i - 1];
      const next = spaced[i + 1];
      // Interior leet ("sh!t", "a$$") or leading leet ("$hit", "@ss").
      if ((isWordish(prev) && isWordish(next)) || (!prev && isWordish(next))) {
        out += normalizeChar(char);
      } else if (isWordish(prev) && !isWordish(next)) {
        // Trailing: keep $/@ as leet ("ass$"), treat !/+ as punctuation ("Ass!").
        out += char === "!" || char === "+" ? " " : normalizeChar(char);
      } else {
        out += " ";
      }
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

/** Collapse letters separated by punctuation (e.g. "f.u.c.k", "f-u-c-k"). */
function collapseSeparatedLetters(input: string): string {
  return input.replace(/(?:[a-z][\s._\-*•|/\\,`'"~]+){2,}[a-z]/gi, (match) =>
    match.replace(/[^a-z0-9]/gi, ""),
  );
}

/** Keep only letters/digits after leet normalization. */
function alphaCompact(input: string): string {
  let out = "";
  for (const char of input) {
    if (/[a-z0-9]/i.test(char)) out += normalizeChar(char);
  }
  return out;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match needle only as its own alphanumeric run — not inside longer words like "assign". */
function containsWholeWord(haystack: string, needle: string): boolean {
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(needle)}(?:[^a-z0-9]|$)`, "i");
  return re.test(haystack);
}

const INFLECTION_SUFFIX = /^(s|es|ed|er|ers|ing|ings|y|ie|ies|iest|ly)$/i;

/** 4-letter stems safe to inflect — excludes butter/butt, hello/hell-style collisions. */
const INFLECTABLE_SHORT = new Set(["fuck", "shit", "cunt", "slut", "piss"]);

/**
 * Exact token match, short-word plurals, or longer stems with common inflections.
 * Never treats a blocked stem as a substring inside an unrelated word.
 */
function tokenMatchesBlocked(token: string): string | null {
  const t = token.toLowerCase();
  if (PROFANITY_WORDS.has(t)) return t;

  for (const word of PROFANITY_WORDS) {
    if (word.length < 4) {
      if (t === `${word}s` || t === `${word}es`) return word;
      continue;
    }
    if (word.length === 4 && !INFLECTABLE_SHORT.has(word)) continue;
    if (!t.startsWith(word)) continue;
    const rest = t.slice(word.length);
    if (!rest || INFLECTION_SUFFIX.test(rest)) return word;
  }
  return null;
}

function findBlockedWord(text: string): string | null {
  const normalized = normalizeForModeration(text);
  const candidates = [
    collapseRepeats(collapseSeparatedLetters(collapseSpacedLetters(normalized))),
    collapseRepeats(collapseSpacedLetters(normalized)),
    collapseRepeats(normalized),
  ];

  for (const candidate of candidates) {
    for (const word of PROFANITY_WORDS) {
      if (containsWholeWord(candidate, word)) return word;
    }

    for (const token of tokenize(candidate)) {
      const hit = tokenMatchesBlocked(collapseRepeats(token.toLowerCase()));
      if (hit) return hit;
    }
  }

  // Catch mixed separators without word boundaries, e.g. "f u.c-k" → exact/inflected token only.
  const mixed = collapseRepeats(alphaCompact(normalized.split(LETTER_SEPARATORS).join("")));
  return tokenMatchesBlocked(mixed);
}

function findBlockedPhrase(text: string): string | null {
  const normalized = normalizeForModeration(text).toLowerCase();
  const compactPhrase = alphaCompact(text).toLowerCase();
  for (const phrase of BLOCKED_PHRASES) {
    const compactPhraseNeedle = alphaCompact(phrase);
    if (normalized.includes(phrase) || compactPhrase.includes(compactPhraseNeedle)) {
      return phrase.trim();
    }
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
  const compactLower = alphaCompact(trimmed).toLowerCase();
  for (const kw of extraKeywords) {
    const needle = kw.trim().toLowerCase();
    if (!needle) continue;
    const compactNeedle = alphaCompact(needle);
    if (lower.includes(needle) || compactLower.includes(compactNeedle)) {
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
