import { useEffect, useState } from "react";
import {
  listProfileBadges,
  listUserProfileBadges,
  setUserProfileBadges,
} from "@/lib/community-badges";
import type { ProfileBadge } from "@/lib/community-types";
import { BadgeIcon } from "@/components/community/ProfileBadges";
import { Button } from "@/components/Button";

/**
 * Staff-only: assign global profile badges while viewing a member profile.
 */
export function AssignProfileBadges({
  userId,
  assigned,
  onAssigned,
}: {
  userId: string;
  assigned: ProfileBadge[];
  onAssigned: (next: ProfileBadge[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<ProfileBadge[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => assigned.map((b) => b.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setSelectedIds(assigned.map((b) => b.id));
  }, [assigned]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listProfileBadges()
      .then((next) => {
        if (!cancelled) setCatalog(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load badges");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Manage badges
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-group)] border border-[var(--community-border)] bg-fill/40 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.8125rem] font-medium">Assign profile badges</p>
        <button
          type="button"
          className="text-[0.8125rem] text-muted hover:text-foreground"
          onClick={() => {
            setOpen(false);
            setError("");
            setStatus("");
            setSelectedIds(assigned.map((b) => b.id));
          }}
        >
          Cancel
        </button>
      </div>

      {catalog.length === 0 ? (
        <p className="text-[0.8125rem] text-muted">
          No badges yet — create them in Admin → Badges.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {catalog.map((badge) => {
            const checked = selectedIds.includes(badge.id);
            return (
              <label
                key={badge.id}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] ring-1 transition ${
                  checked
                    ? "bg-accent/10 font-medium ring-accent"
                    : "ring-black/10 hover:bg-fill dark:ring-white/15"
                }`}
                title={badge.name}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => {
                    setSelectedIds((prev) =>
                      checked ? prev.filter((id) => id !== badge.id) : [...prev, badge.id],
                    );
                  }}
                />
                <BadgeIcon badge={badge} size="sm" />
                <span>{badge.name}</span>
              </label>
            );
          })}
        </div>
      )}

      {error && <p className="text-[0.8125rem] text-destructive">{error}</p>}
      {status && <p className="text-[0.8125rem] text-muted">{status}</p>}

      <Button
        type="button"
        size="sm"
        disabled={busy || catalog.length === 0}
        onClick={async () => {
          setBusy(true);
          setError("");
          setStatus("");
          try {
            await setUserProfileBadges(userId, selectedIds);
            const next = await listUserProfileBadges(userId);
            onAssigned(next);
            setStatus("Badges saved.");
            setOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save badges");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : "Save badges"}
      </Button>
    </div>
  );
}
