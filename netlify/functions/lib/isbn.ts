/** Shared ISBN helpers for Netlify functions (keep in sync with src/lib/isbn.ts). */

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[-\s]/g, "").toUpperCase();
}

export function isIsbn10(isbn: string): boolean {
  const n = normalizeIsbn(isbn);
  if (!/^\d{9}[\dX]$/.test(n)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(n[i], 10);
  const check = n[9] === "X" ? 10 : parseInt(n[9], 10);
  return (sum + check) % 11 === 0;
}

export function isIsbn13(isbn: string): boolean {
  const n = normalizeIsbn(isbn);
  if (!/^\d{13}$/.test(n)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(n[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10 === parseInt(n[12], 10);
}

export function isbn10to13(isbn10: string): string | null {
  const n = normalizeIsbn(isbn10);
  if (!isIsbn10(n)) return null;
  const core = `978${n.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(core[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return `${core}${(10 - (sum % 10)) % 10}`;
}

export function isbn13to10(isbn13: string): string | null {
  const n = normalizeIsbn(isbn13);
  if (!isIsbn13(n) || !n.startsWith("978")) return null;
  const core = n.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(core[i], 10);
  const rem = sum % 11;
  const check = rem === 0 ? "0" : rem === 1 ? "X" : String(11 - rem);
  return `${core}${check}`;
}

export function isbnVariants(isbn: string): string[] {
  const n = normalizeIsbn(isbn);
  if (!n) return [];
  const out = new Set<string>([n]);
  if (isIsbn10(n)) {
    const as13 = isbn10to13(n);
    if (as13) out.add(as13);
  }
  if (isIsbn13(n)) {
    const as10 = isbn13to10(n);
    if (as10) out.add(as10);
  }
  return [...out];
}
