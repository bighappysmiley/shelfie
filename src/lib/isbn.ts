/** Digits only, keep trailing X for ISBN-10. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[-\s]/g, "").toUpperCase();
}

export function isIsbn10(isbn: string): boolean {
  const n = normalizeIsbn(isbn);
  if (!/^\d{9}[\dX]$/.test(n)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(n[i], 10);
  const check = n[9] === "X" ? 10 : parseInt(n[9], 10);
  sum += check;
  return sum % 11 === 0;
}

export function isIsbn13(isbn: string): boolean {
  const n = normalizeIsbn(isbn);
  if (!/^\d{13}$/.test(n)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(n[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(n[12], 10);
}

export function isValidIsbn(isbn: string): boolean {
  const n = normalizeIsbn(isbn);
  if (!n) return false;
  return isIsbn10(n) || isIsbn13(n);
}

/** Convert ISBN-10 → ISBN-13 (978 prefix). Returns null if invalid. */
export function isbn10to13(isbn10: string): string | null {
  const n = normalizeIsbn(isbn10);
  if (!isIsbn10(n)) return null;
  const core = `978${n.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(core[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${core}${check}`;
}

/** Convert ISBN-13 (978…) → ISBN-10. Returns null if not convertible. */
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

/** All equivalent forms to try for lookup / duplicate matching. */
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

export function isbnHint(isbn: string): string {
  const n = normalizeIsbn(isbn);
  if (!n) return "ISBN-10 or ISBN-13";
  if (n.length < 10) return "Keep typing…";
  if (isIsbn10(n)) return "ISBN-10 ✓";
  if (isIsbn13(n)) return "ISBN-13 ✓";
  if (n.length === 10 || n.length === 13) return "Check digit looks wrong";
  return "Use 10 or 13 characters";
}
