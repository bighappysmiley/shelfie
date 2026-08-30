import { createWorker } from "tesseract.js";

export interface OcrBookGuess {
  title: string;
  author: string;
  confidence: number;
}

/** Read text from an image data URL using on-device OCR (free, no API key). */
export async function readImageText(dataUrl: string): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(dataUrl);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

/**
 * Heuristic: first non-empty line ≈ title, second ≈ author.
 * Cover text is messy; the user can edit before saving.
 */
export function parseCoverText(text: string): OcrBookGuess | null {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 2 && /[A-Za-z]/.test(l));

  if (lines.length === 0) return null;

  const title = lines[0];
  const author = lines[1] ?? "";
  return { title, author, confidence: 0.5 };
}

/**
 * Split OCR output into candidate spine lines for shelf review.
 * Filters out very short / numeric-only noise.
 */
export function parseShelfText(text: string): OcrBookGuess[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 3 && /[A-Za-z]{3,}/.test(l))
    .filter((l) => !/^\d+$/.test(l));

  const seen = new Set<string>();
  const books: OcrBookGuess[] = [];

  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // "Title — Author" or "Title by Author"
    const byMatch = line.match(/^(.+?)\s+(?:—|–|-|by)\s+(.+)$/i);
    if (byMatch) {
      books.push({
        title: byMatch[1].trim(),
        author: byMatch[2].trim(),
        confidence: 0.45,
      });
    } else {
      books.push({ title: line, author: "", confidence: 0.35 });
    }
  }

  return books.slice(0, 40);
}
