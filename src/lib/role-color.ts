import type { CSSProperties } from "react";

/** Role color encodings stored in community_server_roles.color (text).
 *  - solid:    #RRGGBB
 *  - gradient: gradient:#a,#b,#c
 *  - holo:     holo
 */

export type RoleColorMode = "solid" | "gradient" | "holo";

export type ParsedRoleColor =
  | { mode: "solid"; hex: string }
  | { mode: "gradient"; stops: string[] }
  | { mode: "holo" };

/** Discord-style iridescent holographic palette (not user-editable). */
const HOLO_STOPS = [
  "#f6a8ff",
  "#a8d4ff",
  "#a8ffe8",
  "#fff2a8",
  "#ffb8e8",
  "#c8a8ff",
  "#a8f0ff",
  "#f6a8ff",
];

const DEFAULT_GRADIENT = ["#f97316", "#ec4899", "#8b5cf6"];

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function parseRoleColor(raw: string | null | undefined): ParsedRoleColor {
  const value = (raw ?? "").trim();
  if (!value) return { mode: "solid", hex: "#6B7280" };

  if (value === "holo" || value.startsWith("holo:")) {
    return { mode: "holo" };
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
  return "holo";
}

function holoBackground(animate: boolean): CSSProperties {
  return {
    backgroundImage: `linear-gradient(115deg, ${HOLO_STOPS.join(", ")})`,
    backgroundSize: "280% 280%",
    backgroundColor: HOLO_STOPS[0],
    ...(animate
      ? { animation: "role-holo-shift 4.5s ease-in-out infinite" }
      : { backgroundPosition: "35% 50%" }),
  };
}

/** CSS properties for a role swatch / badge background. */
export function roleColorStyle(
  raw: string | null | undefined,
  opts?: { animate?: boolean },
): CSSProperties {
  const parsed = parseRoleColor(raw);
  if (parsed.mode === "solid") {
    return { backgroundColor: parsed.hex };
  }
  if (parsed.mode === "gradient") {
    const stops = parsed.stops.join(", ");
    return {
      backgroundImage: `linear-gradient(135deg, ${stops})`,
      backgroundColor: parsed.stops[0],
    };
  }
  return holoBackground(Boolean(opts?.animate));
}

/** CSS properties for role names — gradient or holographic text fill. */
export function roleColorTextStyle(raw: string | null | undefined): CSSProperties {
  const parsed = parseRoleColor(raw);
  if (parsed.mode === "solid") {
    return { color: parsed.hex };
  }
  const fill =
    parsed.mode === "gradient"
      ? {
          backgroundImage: `linear-gradient(90deg, ${parsed.stops.join(", ")})`,
          backgroundColor: parsed.stops[0],
        }
      : holoBackground(true);
  return {
    ...fill,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };
}

/** Readable solid fallback for borders / text accents. */
export function roleColorAccent(raw: string | null | undefined): string {
  const parsed = parseRoleColor(raw);
  if (parsed.mode === "solid") return parsed.hex;
  if (parsed.mode === "gradient") return parsed.stops[0] ?? "#6B7280";
  return HOLO_STOPS[0] ?? "#6B7280";
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
  { label: "Holographic", value: "holo" },
];
