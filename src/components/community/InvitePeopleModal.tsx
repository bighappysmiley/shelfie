import { useState } from "react";
import { Button } from "@/components/Button";
import { CommunityModal } from "@/components/CommunityModal";

export function InvitePeopleModal({
  open,
  onClose,
  serverName,
  inviteCode,
}: {
  open: boolean;
  onClose: () => void;
  serverName: string;
  inviteCode: string;
}) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const inviteLink =
    typeof window !== "undefined" && inviteCode
      ? `${window.location.origin}/community?invite=${encodeURIComponent(inviteCode)}`
      : "";

  const copy = async (text: string, kind: "link" | "code") => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <CommunityModal open={open} onClose={onClose} title={`Invite friends to ${serverName}`} tone="community">
      <p className="text-[0.875rem] text-muted">
        Share this link or invite code. Friends can join via Community → Add a Server → Join with code.
      </p>

      <div className="mt-4 space-y-4">
        <div className="rounded-xl bg-[var(--community-input)] px-3 py-3 ring-1 ring-[var(--community-border)]">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-muted">Invite link</p>
          <p className="mt-1 break-all font-mono text-[0.8125rem] text-foreground">{inviteLink || "—"}</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3"
            disabled={!inviteLink}
            onClick={() => void copy(inviteLink, "link")}
          >
            {copied === "link" ? "Copied!" : "Copy link"}
          </Button>
        </div>

        <div className="rounded-xl bg-[var(--community-input)] px-3 py-3 ring-1 ring-[var(--community-border)]">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-muted">Invite code</p>
          <p className="mt-1 font-mono text-[1.125rem] font-semibold tracking-wider text-foreground">
            {inviteCode || "—"}
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3"
            disabled={!inviteCode}
            onClick={() => void copy(inviteCode, "code")}
          >
            {copied === "code" ? "Copied!" : "Copy code"}
          </Button>
        </div>
      </div>
    </CommunityModal>
  );
}
