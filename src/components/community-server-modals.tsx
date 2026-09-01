import { useState, type FormEvent } from "react";
import { createCommunityGroup, updateCommunityGroup } from "@/lib/community";
import type { CommunityCategory, CommunityGroup, CommunityGroupKind, CommunityServerRole } from "@/lib/community-types";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";
import { ChannelTypeSelect } from "@/components/community/ChannelKind";
import { CommunityModal } from "@/components/CommunityModal";
import { PermissionOverridesEditor } from "@/components/community-settings/PermissionOverridesEditor";

export function ChannelFormModal({
  title,
  categories,
  channel,
  defaultCategoryId,
  serverId,
  userId,
  roles = [],
  onClose,
  onSaved,
  onArchive,
}: {
  title: string;
  categories: CommunityCategory[];
  channel?: CommunityGroup;
  defaultCategoryId?: string | null;
  serverId: string;
  userId: string;
  roles?: CommunityServerRole[];
  onClose: () => void;
  onSaved: (g?: CommunityGroup) => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  const [name, setName] = useState(channel?.name ?? "");
  const [kind, setKind] = useState<CommunityGroupKind>(channel?.kind ?? "text");
  const [topic, setTopic] = useState(channel?.topic ?? "");
  const [description, setDescription] = useState(channel?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    channel?.categoryId || defaultCategoryId || categories[0]?.id || "",
  );
  const [slowModeSeconds, setSlowModeSeconds] = useState(channel?.slowModeSeconds ?? 0);
  const [tab, setTab] = useState<"general" | "permissions">("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (tab === "permissions") {
      onClose();
      return;
    }
    if (!name.trim()) {
      setError("Give the channel a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (channel) {
        await updateCommunityGroup(channel.id, {
          name,
          kind,
          topic,
          description,
          categoryId: categoryId || null,
          serverId,
          slowModeSeconds,
        });
        await onSaved();
      } else {
        const g = await createCommunityGroup({
          serverId,
          name,
          kind,
          topic,
          description,
          categoryId: categoryId || null,
          userId,
          slowModeSeconds,
        });
        await onSaved(g);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  };

  return (
    <CommunityModal
      open
      onClose={onClose}
      title={title}
      tone="community"
      onSubmit={onSubmit}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {onArchive && (
            <button type="button" onClick={() => void onArchive()} className="text-[0.875rem] text-destructive">
              Archive
            </button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            {tab === "permissions" ? "Done" : "Cancel"}
          </Button>
          {tab === "general" && (
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Saving…" : channel ? "Save" : "Create"}
            </Button>
          )}
        </div>
      }
    >
      {channel && roles.length > 0 && (
        <div className="mb-4 flex gap-1 rounded-lg bg-[var(--community-input)] p-1">
          {(["general", "permissions"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-md px-3 py-1.5 text-[0.8125rem] font-medium capitalize ${
                tab === id ? "bg-[var(--community-panel)] shadow-sm" : "text-muted"
              }`}
            >
              {id}
            </button>
          ))}
        </div>
      )}

      {tab === "permissions" && channel ? (
        <PermissionOverridesEditor
          serverId={serverId}
          targetType="channel"
          targetId={channel.id}
          roles={roles}
          onError={setError}
        />
      ) : (
        <div className="space-y-3">
          <TextField label="Channel name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <TextField label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <ChannelTypeSelect value={kind} onChange={setKind} />
          <label className="block text-[0.8125rem] font-medium text-muted">
            Slow mode
            <select
              value={slowModeSeconds}
              onChange={(e) => setSlowModeSeconds(Number(e.target.value))}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.9375rem]"
            >
              <option value={0}>Off</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          </label>
          <label className="block text-[0.8125rem] font-medium text-muted">
            Category
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.9375rem]"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {error && <FormError message={error} />}
        </div>
      )}
    </CommunityModal>
  );
}

export function CategoryFormModal({
  title,
  initialName = "",
  onClose,
  onSubmit,
  onDelete,
}: {
  title: string;
  initialName?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <CommunityModal
      open
      onClose={onClose}
      title={title}
      tone="community"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        setError("");
        try {
          await onSubmit(name.trim());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save");
          setBusy(false);
        }
      }}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {onDelete && (
            <button type="button" onClick={() => void onDelete()} className="text-[0.875rem] text-destructive">
              Delete
            </button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <TextField label="Category name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      {error && <FormError message={error} />}
    </CommunityModal>
  );
}
