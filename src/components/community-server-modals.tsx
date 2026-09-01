import { useState, type FormEvent } from "react";
import { createCommunityGroup, updateCommunityGroup } from "@/lib/community";
import type { CommunityCategory, CommunityGroup, CommunityGroupKind } from "@/lib/community-types";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";
import { SegmentedControl } from "@/components/layout";
import { CommunityModal } from "@/components/CommunityModal";

export function ChannelFormModal({
  title,
  categories,
  channel,
  defaultCategoryId,
  serverId,
  userId,
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
  onClose: () => void;
  onSaved: (g?: CommunityGroup) => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  const [name, setName] = useState(channel?.name ?? "");
  const [kind, setKind] = useState<CommunityGroupKind>(channel?.kind ?? "both");
  const [topic, setTopic] = useState(channel?.topic ?? "");
  const [description, setDescription] = useState(channel?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    channel?.categoryId || defaultCategoryId || categories[0]?.id || "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the channel a name.");
      return;
    }
    if (!categoryId) {
      setError("Create a category first.");
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
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim() || !categoryId}>
            {busy ? "Saving…" : channel ? "Save" : "Create"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <TextField label="Channel name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <TextField label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <div>
          <p className="mb-2 text-[0.8125rem] font-medium text-muted">Type</p>
          <SegmentedControl
            value={kind}
            onChange={setKind}
            options={[
              { value: "both", label: "Chat & suggestions" },
              { value: "chat", label: "Chat" },
              { value: "suggestions", label: "Suggestions" },
            ]}
          />
        </div>
        <label className="block text-[0.8125rem] font-medium text-muted">
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.9375rem]"
            required
          >
            {categories.length === 0 ? (
              <option value="">No categories — create one first</option>
            ) : (
              categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </label>
        {error && <FormError message={error} />}
      </div>
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
