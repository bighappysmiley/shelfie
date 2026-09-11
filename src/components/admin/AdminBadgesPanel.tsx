import { useEffect, useRef, useState } from "react";
import {
  createProfileBadge,
  deleteProfileBadge,
  listProfileBadges,
  updateProfileBadge,
} from "@/lib/community-badges";
import { uploadCommunityImage } from "@/lib/community";
import type { ProfileBadge } from "@/lib/community-types";
import { RoleColorPicker } from "@/components/community-settings/panels";
import { roleColorTextStyle } from "@/lib/role-color";
import { BadgeIcon } from "@/components/community/ProfileBadges";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/layout";
import { IconPlus } from "@/components/Icons";

/** Admin catalog: create / edit / delete global profile badges. */
export function AdminBadgesPanel({ onError }: { onError: (msg: string) => void }) {
  const [badges, setBadges] = useState<ProfileBadge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const iconInput = useRef<HTMLInputElement>(null);

  const selected = badges.find((b) => b.id === selectedId) ?? null;
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#5865F2");
  const [editIcon, setEditIcon] = useState<string | null>(null);

  const refresh = async (preferId?: string | null) => {
    const next = await listProfileBadges();
    setBadges(next);
    const keep = preferId && next.some((b) => b.id === preferId) ? preferId : null;
    if (keep) {
      setSelectedId(keep);
    } else if (selectedId && next.some((b) => b.id === selectedId)) {
      /* keep current */
    } else {
      setSelectedId(next[0]?.id ?? null);
    }
    return next;
  };

  useEffect(() => {
    void refresh().catch((err) =>
      onError(err instanceof Error ? err.message : "Could not load badges"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditColor(selected.color);
    setEditIcon(selected.iconUrl);
  }, [selected]);

  const createBadge = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    onError("");
    setStatus("");
    try {
      const badge = await createProfileBadge({ name });
      setNewName("");
      await refresh(badge.id);
      setStatus(`Created “${badge.name}”. Upload an icon or assign it on Users.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not create badge");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="space-y-1 rounded-[var(--radius-group)] bg-surface p-2 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <p className="px-2 pb-1 text-[0.75rem] text-muted">
          Global profile badges (optional icons). Assign on Users — shown on profiles only, never
          beside chat names.
        </p>
        {badges.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedId(b.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[0.9375rem] ${
              b.id === selectedId ? "bg-fill-secondary font-medium" : "hover:bg-fill"
            }`}
          >
            <BadgeIcon badge={b} />
            <span className="truncate" style={roleColorTextStyle(b.color)}>
              {b.name}
            </span>
          </button>
        ))}
        {badges.length === 0 && (
          <p className="px-2 py-3 text-[0.8125rem] text-muted">No badges yet — try “Owner”.</p>
        )}
        <div className="border-t border-black/[0.06] pt-2 dark:border-white/[0.08]">
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              void createBadge();
            }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New badge"
              className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-2 py-1.5 text-[0.8125rem]"
              disabled={busy}
            />
            <button
              type="submit"
              className="rounded-lg p-1.5 text-accent hover:bg-fill disabled:opacity-40"
              title="Add badge"
              disabled={!newName.trim() || busy}
            >
              <IconPlus size={16} />
            </button>
          </form>
        </div>
      </div>

      {selected ? (
        <form
          className="space-y-4 rounded-[var(--radius-group)] bg-surface p-4 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            onError("");
            setStatus("");
            try {
              const updated = await updateProfileBadge(selected.id, {
                name: editName,
                color: editColor,
                iconUrl: editIcon,
              });
              await refresh(updated.id);
              setStatus(`Saved “${updated.name}”.`);
            } catch (err) {
              onError(err instanceof Error ? err.message : "Could not save badge");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-1 block text-[0.8125rem] font-medium text-muted">Name</span>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-[var(--radius-control)] bg-fill px-3 py-2"
              required
            />
          </label>

          <RoleColorPicker value={editColor} onChange={setEditColor} canUseHolo />

          <div>
            <p className="mb-2 text-[0.8125rem] font-medium text-muted">Badge icon</p>
            <div className="flex flex-wrap items-center gap-3">
              <BadgeIcon
                badge={{ ...selected, color: editColor, iconUrl: editIcon }}
                size="lg"
              />
              <input
                ref={iconInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !selected) return;
                  setBusy(true);
                  onError("");
                  setStatus("");
                  try {
                    const url = await uploadCommunityImage(file);
                    setEditIcon(url);
                    // Persist immediately so icon upload “just works”.
                    const updated = await updateProfileBadge(selected.id, {
                      name: editName.trim() || selected.name,
                      color: editColor,
                      iconUrl: url,
                    });
                    await refresh(updated.id);
                    setStatus(`Icon saved on “${updated.name}”.`);
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => iconInput.current?.click()}
              >
                Upload icon
              </Button>
              {editIcon && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    if (!selected) return;
                    setBusy(true);
                    onError("");
                    setStatus("");
                    try {
                      setEditIcon(null);
                      const updated = await updateProfileBadge(selected.id, {
                        name: editName.trim() || selected.name,
                        color: editColor,
                        iconUrl: null,
                      });
                      await refresh(updated.id);
                      setStatus(`Removed icon from “${updated.name}”.`);
                    } catch (err) {
                      onError(err instanceof Error ? err.message : "Could not remove icon");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {status && <p className="text-[0.8125rem] text-muted">{status}</p>}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={busy || !editName.trim()}>
              {busy ? "Saving…" : "Save badge"}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Delete badge “${selected.name}”?`)) return;
                setBusy(true);
                onError("");
                setStatus("");
                try {
                  await deleteProfileBadge(selected.id);
                  setSelectedId(null);
                  await refresh();
                  setStatus(`Deleted “${selected.name}”.`);
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Could not delete");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </form>
      ) : (
        <EmptyState
          title="Create a badge"
          description="Owner, Staff, Bookworm — shown on member profiles (not next to chat names)."
        />
      )}
    </div>
  );
}
