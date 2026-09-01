import { useState } from "react";
import { Button } from "@/components/Button";
import { CommunityModal } from "@/components/CommunityModal";

export function ServerRulesModal({
  open,
  serverName,
  rules,
  rulesChannelName,
  busy,
  onAccept,
}: {
  open: boolean;
  serverName: string;
  rules: string;
  rulesChannelName?: string | null;
  busy?: boolean;
  onAccept: () => void | Promise<void>;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <CommunityModal
      open={open}
      onClose={() => {}}
      title={`Rules for ${serverName}`}
      tone="community"
      maxWidth="max-w-lg"
      footer={
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-2 text-[0.875rem]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span>I have read and agree to the server rules</span>
          </label>
          <Button type="button" disabled={!agreed || busy} onClick={() => void onAccept()}>
            {busy ? "Joining…" : "Continue"}
          </Button>
        </div>
      }
    >
      {rulesChannelName && (
        <p className="mb-3 text-[0.8125rem] text-muted">
          These rules are also posted in <span className="font-medium text-foreground">#{rulesChannelName}</span>.
        </p>
      )}
      <div className="whitespace-pre-wrap rounded-xl bg-[var(--community-input)] px-4 py-3 text-[0.875rem] leading-relaxed text-foreground ring-1 ring-[var(--community-border)]">
        {rules}
      </div>
    </CommunityModal>
  );
}
