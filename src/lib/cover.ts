const COLORS = [
  "#5c6bc0", "#26a69a", "#ef5350", "#ab47bc", "#42a5f5",
  "#66bb6a", "#ffa726", "#8d6e63", "#78909c", "#ec407a",
];

export function coverPlaceholder(title: string, authors: string): string {
  const hash = (title + authors).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = COLORS[hash % COLORS.length];
  const initials = title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
    <rect width="200" height="300" fill="${bg}"/>
    <text x="100" y="130" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="48" font-weight="600">${initials}</text>
    <text x="100" y="200" text-anchor="middle" fill="white" fill-opacity="0.9" font-family="system-ui,sans-serif" font-size="14" font-weight="500">${escapeXml(title.slice(0, 30))}</text>
    <text x="100" y="222" text-anchor="middle" fill="white" fill-opacity="0.7" font-family="system-ui,sans-serif" font-size="11">${escapeXml(authors.slice(0, 35))}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function bookCoverUrl(book: { coverUrl?: string | null; title: string; authors: string }): string {
  return book.coverUrl || coverPlaceholder(book.title, book.authors);
}
