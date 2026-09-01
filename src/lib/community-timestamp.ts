export type TimestampStyle = "R" | "t" | "T" | "d" | "D" | "f" | "F" | "Y";

export const TIMESTAMP_STYLES: {
  id: TimestampStyle;
  label: string;
  description: string;
}[] = [
  { id: "R", label: "Relative", description: 'e.g. "in 2 hours", "3 days ago"' },
  { id: "t", label: "Time", description: "4:20 PM" },
  { id: "T", label: "Time with seconds", description: "4:20:01 PM" },
  { id: "d", label: "Short date", description: "30/09/2026" },
  { id: "D", label: "Long date", description: "September 30, 2026" },
  { id: "f", label: "Date and time", description: "September 30, 2026 4:20 PM" },
  { id: "F", label: "Full", description: "Tuesday, September 30, 2026 4:20 PM" },
  { id: "Y", label: "Year only", description: "2026" },
];

export function buildTimestampToken(unix: number, style: TimestampStyle): string {
  return `<t:${unix}:${style}>`;
}

export function previewTimestamp(unix: number, style: TimestampStyle): string {
  const d = new Date(unix * 1000);
  switch (style) {
    case "Y":
      return String(d.getFullYear());
    case "R": {
      const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
      const abs = Math.abs(diffSec);
      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
      if (abs < 60) return rtf.format(diffSec, "second");
      if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
      return rtf.format(Math.round(diffSec / 86400), "day");
    }
    case "t":
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    case "T":
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
    case "d":
      return d.toLocaleDateString(undefined, { day: "numeric", month: "numeric", year: "numeric" });
    case "D":
      return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    case "f":
      return d.toLocaleString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    case "F":
      return d.toLocaleString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    default:
      return d.toLocaleString();
  }
}

export function dateToUnixSeconds(isoLocal: string): number | null {
  if (!isoLocal) return null;
  const ms = new Date(isoLocal).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}
