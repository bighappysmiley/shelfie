function initialsFromLabel(label: string): string {
  const cleaned = label.trim();
  if (!cleaned) return "?";
  if (cleaned.includes("@")) {
    const local = cleaned.split("@")[0] ?? cleaned;
    const parts = local.split(/[._-]+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

const palette = [
  "bg-accent text-accent-contrast",
  "bg-[#5a7268] text-white",
  "bg-[#6b5a4a] text-white",
  "bg-[#4a5a6b] text-white",
];

function colorClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % palette.length;
  return palette[hash] ?? palette[0];
}

export function UserAvatar({
  label,
  size = 40,
  className = "",
}: {
  label: string;
  size?: number;
  className?: string;
}) {
  const initials = initialsFromLabel(label);
  const colors = colorClass(label);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${colors} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function userDisplayName(
  displayName?: string | null,
  email?: string | null,
  phone?: string | null,
): string {
  if (displayName?.trim()) return displayName.trim();
  if (email) {
    const local = email.split("@")[0] ?? email;
    return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (phone) return phone;
  return "Account";
}
