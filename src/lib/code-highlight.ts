export type HighlightToken = { type: string; value: string };

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "class",
  "import", "export", "from", "async", "await", "true", "false", "null", "undefined",
  "def", "elif", "lambda", "pass", "print", "self", "None", "True", "False",
]);

export function highlightCode(source: string, language?: string): HighlightToken[] {
  const lang = (language ?? "").toLowerCase();
  const tokens: HighlightToken[] = [];
  let i = 0;

  while (i < source.length) {
    if (source.startsWith("//", i) || (lang === "python" && source.startsWith("#", i))) {
      const end = source.indexOf("\n", i);
      const slice = end < 0 ? source.slice(i) : source.slice(i, end);
      tokens.push({ type: "comment", value: slice });
      i += slice.length;
      continue;
    }
    if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2);
      const slice = end < 0 ? source.slice(i) : source.slice(i, end + 2);
      tokens.push({ type: "comment", value: slice });
      i += slice.length;
      continue;
    }
    if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
      const q = source[i]!;
      let j = i + 1;
      while (j < source.length && source[j] !== q) {
        if (source[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: source.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    const word = /^[a-zA-Z_][\w]*/.exec(source.slice(i));
    if (word) {
      const w = word[0];
      tokens.push({
        type: KEYWORDS.has(w) ? "keyword" : "plain",
        value: w,
      });
      i += w.length;
      continue;
    }
    if (/^\d+/.test(source.slice(i))) {
      const num = /^\d+(\.\d+)?/.exec(source.slice(i))![0];
      tokens.push({ type: "number", value: num });
      i += num.length;
      continue;
    }
    tokens.push({ type: "plain", value: source[i]! });
    i++;
  }

  return tokens;
}
