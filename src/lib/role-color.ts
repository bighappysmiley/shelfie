import type { CSSProperties } from "react";

/** Role color encodings stored in community_server_roles.color (text).
 *  - solid:    #RRGGBB
 *  - gradient: gradient:#a,#b,#c
 *  - holo:     holo  or  holo:#a,#b,#c,#d
 */

export type RoleColorMode = "solid" | "gradient" | "holo";

export type ParsedRoleColor =
  | { mode: "solid"; hex: string }
  | { mode: "gradient"; stops: string[] }
  | { mode: "holo"; stops: string[] };

const DEFAULT_HOLO = ["#ff6b9d", "#c77dff", "#4cc9f0", "#80ed99", "#ffd60a", "#ff6b9d"];
const DEFAULT_GRADIENT = ["#f97316", "#ec4899", "#8b5cf6"];

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function parseRoleColor(raw: string | null | undefined): ParsedRoleColor {
  const value = (raw ?? "").trim();
  if (!value) return { mode: "solid", hex: "#6B7280" };

  if (value === "holo" || value.startsWith("holo:")) {
    const stops = value.startsWith("holo:")
      ? value
          .slice(5)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [...DEFAULT_HOLO];
    return { mode: "holo", stops: stops.length >= 2 ? stops : [...DEFAULT_HOLO] };
  }

  if (value.startsWith("gradient:")) {
    const stops = value
      .slice(9)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { mode: "gradient", stops: stops.length >= 2 ? stops : [...DEFAULT_GRADIENT] };
  }

  if (isHexColor(value)) return { mode: "solid", hex: value };
  if (value.startsWith("#")) return { mode: "solid", hex: value.slice(0, 7).padEnd(7, "0") };
  return { mode: "solid", hex: "#6B7280" };
}

export function encodeRoleColor(parsed: ParsedRoleColor): string {
  if (parsed.mode === "solid") return parsed.hex;
  if (parsed.mode === "gradient") return `gradient:${parsed.stops.join(",")}`;
  const sameDefault =
    parsed.stops.length === DEFAULT_HOLO.length &&
    parsed.stops.every((s, i) => s.toLowerCase() === DEFAULT_HOLO[i]!.toLowerCase());
  return sameDefault ? "holo" : `holo:${parsed.stops.join(",")}`;
}

/** CSS properties for a role swatch / name tint background. */
export function roleColorStyle(
  raw: string | null | undefined,
  opts?: { animate?: boolean },
): CSSProperties {
  const parsed = parseRoleColor(raw);
  if (parsed.mode === "solid") {
    return { backgroundColor: parsed.hex };
  }
  const stops = parsed.stops.join(", ");
  if (parsed.mode === "gradient") {
    return {
      backgroundImage: `linear-gradient(135deg, ${stops})`,
      backgroundColor: parsed.stops[0],
    };
  }
  return {
    backgroundImage: `linear-gradient(120deg, ${stops})`,
    backgroundSize: "280% 280%",
    backgroundColor: parsed.stops[0],
    ...(opts?.animate ? { animation: "role-holo-shift 5s ease infinite" } : { backgroundPosition: "40% 50%" }),
  };
}

/** Readable solid fallback for borders / text accents. */
export function roleColorAccent(raw: string | null | undefined): string {
  const parsed = parseRoleColor(raw);
  if (parsed.mode === "solid") return parsed.hex;
  return parsed.stops[0] ?? "#6B7280";
}

export const ROLE_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: "Rose", value: "#E11D48" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Sky", value: "#3B82F6" },
  { label: "Emerald", value: "#10B981" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Sunset", value: "gradient:#f97316,#ec4899,#8b5cf6" },
  { label: "Ocean", value: "gradient:#06b6d4,#3b82f6,#6366f1" },
  { label: "Forest", value: "gradient:#84cc16,#10b981,#0f766e" },
  { label: "Holo", value: "holo" },
  { label: "Neon holo", value: "holo:#ff006e,#8338ec,#3a86ff,#06d6a0,#ffbe0b,#ff006e" },
];
