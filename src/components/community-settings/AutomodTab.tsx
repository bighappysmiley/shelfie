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
      <div className="rounded-[var(--radius-group)] bg-fill px-4 py-3 text-[0.875rem] text-muted">
        <p className="font-medium text-foreground">Strict family-safe filter (always on)</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Profanity, slurs, and harmful phrases are blocked in all messages</li>
          <li>GIFs, video uploads, and common GIF hosts are blocked</li>
          <li>Images are scanned by AI before upload — inappropriate content is rejected</li>
          <li>Leetspeak and spaced-letter bypass attempts are detected</li>
        </ul>
      </div>

      <ToggleRow
        label="Extra keyword filter"
        hint="Adds your custom blocked words on top of the global filter"
        checked={enabled}
        onChange={setEnabled}
      />

      <TextArea
        label="Additional blocked keywords"
        hint="One keyword or phrase per line (case-insensitive)"
        value={keywordsText}
        onChange={(e) => setKeywordsText(e.target.value)}
        className="min-h-36 font-mono text-[0.875rem]"
        disabled={!enabled}
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
        {busy ? "Saving…" : "Save filter settings"}
      </Button>
    </div>
  );
}
