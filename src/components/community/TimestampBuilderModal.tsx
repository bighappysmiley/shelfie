import { useEffect, useMemo, useState } from "react";
import { CommunityModal } from "@/components/CommunityModal";
import { Button } from "@/components/Button";
import {
  TIMESTAMP_STYLES,
  buildTimestampToken,
  dateToUnixSeconds,
  previewTimestamp,
  type TimestampStyle,
} from "@/lib/community-timestamp";

export function TimestampBuilderModal({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (token: string) => void;
}) {
  const defaultLocal = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, [open]);

  const [when, setWhen] = useState(defaultLocal);
  const [style, setStyle] = useState<TimestampStyle>("f");

  const unix = dateToUnixSeconds(when);
  const preview = unix ? previewTimestamp(unix, style) : "Pick a date and time";

  return (
    <CommunityModal open={open} onClose={onClose} title="Insert timestamp" tone="community">
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-muted">Date and time</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-lg bg-[var(--community-input)] px-3 py-2 text-[0.9375rem] outline-none ring-1 ring-[var(--community-border)] focus:ring-accent/40"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-muted">How should it display?</legend>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {TIMESTAMP_STYLES.map((opt) => (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 hover:bg-[var(--community-hover)] ${
                  style === opt.id ? "bg-[var(--community-channel-hover)]" : ""
                }`}
              >
                <input
                  type="radio"
                  name="ts-style"
                  checked={style === opt.id}
                  onChange={() => setStyle(opt.id)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="block text-xs text-muted">{opt.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rounded-lg border border-[var(--community-border)] bg-[var(--community-input)] px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Preview</p>
          <p className="mt-1 text-base text-foreground">{preview}</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!unix}
            onClick={() => {
              if (!unix) return;
              onInsert(buildTimestampToken(unix, style));
              onClose();
            }}
          >
            Insert
          </Button>
        </div>
      </div>
    </CommunityModal>
  );
}
