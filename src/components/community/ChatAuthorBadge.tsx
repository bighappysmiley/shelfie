import { AuthedImage } from "@/components/AuthedImage";

/** Chat badges: app OWNER pill, or server role icon only (no Nitro, no role initial). */
export function ChatAuthorBadge({
  isAppOwner = false,
  roleIconUrl,
}: {
  isAppOwner?: boolean;
  roleIconUrl?: string | null;
}) {
  if (isAppOwner) {
    return (
      <span
        className="inline-flex shrink-0 items-center rounded-[3px] bg-[#5865F2] px-1 py-px text-[0.625rem] font-bold uppercase leading-none tracking-wide text-white"
        title="App owner"
      >
        Owner
      </span>
    );
  }

  if (!roleIconUrl) return null;

  return (
    <AuthedImage
      src={roleIconUrl}
      alt=""
      className="h-4 w-4 shrink-0 rounded-full object-cover"
    />
  );
}
