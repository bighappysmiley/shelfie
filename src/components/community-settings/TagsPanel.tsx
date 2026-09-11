import { useEffect, useRef, useState } from "react";
import {
  createServerTag,
  deleteServerTag,
  listServerTags,
  updateServerTag,
} from "@/lib/community-tags";
import { uploadCommunityImage } from "@/lib/community";
import type { CommunityServerTag } from "@/lib/community-types";
import { RoleColorPicker } from "@/components/community-settings/panels";
import { roleColorStyle, roleColorTextStyle } from "@/lib/role-color";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/layout";
import { AuthedImage } from "@/components/AuthedImage";
import { IconPlus } from "@/components/Icons";

export function TagsPanel({
  serverId,
  canUseHolo = true,
  onError,
}: {
  serverId: string;
  canUseHolo?: boolean;
  onError: (msg: string) => void;
}) {
  const [tags, setTags] = useState<CommunityServerTag[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const iconInput = useRef<HTMLInputElement>(null);

  const selected = tags.find((t) => t.id === selectedId) ?? null;
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#5865F2");
  const [editIcon, setEditIcon] = useState<string | null>(null);

  const refresh = async () => {
    const next = await listServerTags(serverId);
    setTags(next);
    if (selectedId && !next.some((t) => t.id === selectedId)) {
      setSelectedId(next[0]?.id ?? null);
    } else if (!selectedId && next[0]) {
      setSelectedId(next[0].id);
    }
  };

  useEffect(() => {
    void refresh().catch((err) =>
      onError(err instanceof Error ? err.message : "Could not load tags"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditColor(selected.color);
    setEditIcon(selected.iconUrl);
  }, [selected]);

  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="space-y-1 rounded-[var(--radius-group)] bg-surface p-2 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <p className="px-2 pb-1 text-[0.75rem] text-muted">
          Tags are decorative badges (like Discord role icons). They don’t grant permissions — use
          Roles for that.
        </p>
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[0.9375rem] ${
              t.id === selectedId ? "bg-fill-secondary font-medium" : "hover:bg-fill"
            }`}
          >
            <TagIcon tag={t} />
            <span className="truncate" style={roleColorTextStyle(t.color)}>
              {t.name}
            </span>
          </button>
        ))}
        {tags.length === 0 && (
          <p className="px-2 py-3 text-[0.8125rem] text-muted">
            No tags yet — try “Owner”, “VIP”, etc.
          </p>
        )}
        <div className="border-t border-black/[0.06] pt-2 dark:border-white/[0.08]">
          <div className="flex gap-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New tag"
              className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-2 py-1.5 text-[0.8125rem]"
            />
            <button
              type="button"
              className="rounded-lg p-1.5 text-accent hover:bg-fill"
              title="Add tag"
              disabled={!newName.trim() || busy}
              onClick={async () => {
                setBusy(true);
                onError("");
                try {
                  const tag = await createServerTag(serverId, { name: newName.trim() });
                  setNewName("");
                  await refresh();
                  setSelectedId(tag.id);
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Could not create tag");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <IconPlus size={16} />
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <form
          className="space-y-4 rounded-[var(--radius-group)] bg-surface p-4 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            onError("");
            try {
              await updateServerTag(selected.id, {
                name: editName,
                color: editColor,
                iconUrl: editIcon,
              });
              await refresh();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Could not save tag");
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

          <RoleColorPicker value={editColor} onChange={setEditColor} canUseHolo={canUseHolo} />

          <div>
            <p className="mb-2 text-[0.8125rem] font-medium text-muted">Tag icon</p>
            <div className="flex items-center gap-3">
              <TagIcon tag={{ ...selected, color: editColor, iconUrl: editIcon }} size="lg" />
              <input
                ref={iconInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setBusy(true);
                  onError("");
                  try {
                    const url = await uploadCommunityImage(file);
                    setEditIcon(url);
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
                onClick={() => iconInput.current?.click()}
              >
                Upload icon
              </Button>
              {editIcon && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditIcon(null)}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={busy || !editName.trim()}>
              {busy ? "Saving…" : "Save tag"}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Delete tag “${selected.name}”?`)) return;
                setBusy(true);
                onError("");
                try {
                  await deleteServerTag(selected.id);
                  setSelectedId(null);
                  await refresh();
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
          title="Create a tag"
          description="Owner, VIP, and other badges members can wear on their profile and next to their name."
        />
      )}
    </div>
  );
}

export function TagIcon({
  tag,
  size = "sm",
}: {
  tag: Pick<CommunityServerTag, "name" | "color" | "iconUrl">;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-10 w-10" : size === "md" ? "h-6 w-6" : "h-4 w-4";
  if (tag.iconUrl) {
    return (
      <AuthedImage src={tag.iconUrl} alt="" className={`${dim} shrink-0 rounded-full object-cover`} />
    );
  }
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold text-white`}
      style={roleColorStyle(tag.color)}
      title={tag.name}
    >
      {tag.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ProfileTagChips({ tags }: { tags: CommunityServerTag[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold text-white shadow-sm"
          style={roleColorStyle(tag.color, { animate: true })}
          title={tag.name}
        >
          {tag.iconUrl ? (
            <AuthedImage
              src={tag.iconUrl}
              alt=""
              className="h-3.5 w-3.5 rounded-full object-cover"
            />
          ) : null}
          {tag.name}
        </span>
      ))}
    </div>
  );
}
