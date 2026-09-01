import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { TextArea } from "@/components/form";
import { ToggleRow } from "@/components/layout";
import { updateServer } from "@/lib/community";

export function AutomodTab({
  serverId,
  automodEnabled,
  automodKeywords,
  busy,
  onChanged,
  onError,
}: {
  serverId: string;
  automodEnabled: boolean;
  automodKeywords: string[];
  busy: boolean;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [enabled, setEnabled] = useState(automodEnabled);
  const [keywordsText, setKeywordsText] = useState(automodKeywords.join("\n"));

  useEffect(() => {
    setEnabled(automodEnabled);
    setKeywordsText(automodKeywords.join("\n"));
  }, [automodEnabled, automodKeywords]);

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-[0.875rem] text-muted">
        Block messages that contain configured keywords. Moderators and admins can still post in
        announcement channels; AutoMod applies to everyone in text and forum channels.
      </p>

      <ToggleRow
        label="Enable AutoMod"
        hint="When on, matching messages are rejected before sending"
        checked={enabled}
        onChange={setEnabled}
      />

      <TextArea
        label="Blocked keywords"
        hint="One keyword or phrase per line (case-insensitive)"
        value={keywordsText}
        onChange={(e) => setKeywordsText(e.target.value)}
        className="min-h-36 font-mono text-[0.875rem]"
      />

      <Button
        disabled={busy}
        onClick={async () => {
          onError("");
          try {
            const keywords = keywordsText
              .split(/\n/)
              .map((k) => k.trim())
              .filter(Boolean);
            await updateServer(serverId, { automodEnabled: enabled, automodKeywords: keywords });
            await onChanged();
          } catch (err) {
            onError(err instanceof Error ? err.message : "Could not save AutoMod");
          }
        }}
      >
        {busy ? "Saving…" : "Save AutoMod"}
      </Button>
    </div>
  );
}
