import { formatCommunityTime } from "@/lib/community-types";

export function MessageTimestamp({ iso, grouped = false }: { iso: string; grouped?: boolean }) {
  const d = new Date(iso);
  const full = d.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <time
      dateTime={iso}
      title={full}
      className={`text-muted ${grouped ? "text-[0.625rem] leading-none" : "text-[0.6875rem]"}`}
    >
      {formatCommunityTime(iso)}
    </time>
  );
}
