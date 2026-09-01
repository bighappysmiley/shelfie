import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { TextField, TextArea } from "@/components/form";
import { AuthedImage } from "@/components/AuthedImage";
import {
  createServerSticker,
  deleteServerSticker,
  listServerStickers,
  uploadCommunityImage,
} from "@/lib/community";
import type { CommunityServerSticker } from "@/lib/community-types";

export function StickersTab({
  serverId,
  userId,
  onError,
}: {
  serverId: string;
  userId: string;
  onError: (msg: string) => void;
}) {
  const [stickers, setStickers] = useState<CommunityServerSticker[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setStickers(await listServerStickers(serverId));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load stickers");
    }
  };

  useEffect(() => {
    void refresh();
  }, [serverId]);

  const onUpload = async (file: File) => {
    if (!name.trim()) {
      onError("Enter a sticker name first");
      return;
    }
    setBusy(true);
    onError("");
    try {
      const url = await uploadCommunityImage(file);
      await createServerSticker({
        serverId,
        name,
        description: description || null,
        imageUrl: url,
        userId,
      });
      setName("");
      setDescription("");
      await refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not upload sticker");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-[0.875rem] text-muted">
        Add sticker packs members can browse and share in chat.
      </p>

      <div className="space-y-3 rounded-[var(--radius-group)] border border-[var(--community-border)] bg-fill/30 p-4">
        <TextField label="Sticker name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextArea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f);
            e.target.value = "";
          }}
        />
        <Button disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Uploading…" : "Upload sticker image"}
        </Button>
      </div>

      {stickers.length === 0 ? (
        <p className="text-[0.875rem] text-muted">No stickers yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stickers.map((s) => (
            <li
              key={s.id}
              className="rounded-[var(--radius-group)] border border-[var(--community-border)] bg-fill/40 p-3"
            >
              <AuthedImage src={s.imageUrl} alt="" className="mx-auto h-24 w-24 object-contain" />
              <p className="mt-2 truncate text-center text-[0.875rem] font-medium">{s.name}</p>
              {s.description && (
                <p className="mt-0.5 truncate text-center text-[0.75rem] text-muted">{s.description}</p>
              )}
              <button
                type="button"
                className="mt-2 w-full text-[0.75rem] text-destructive"
                onClick={async () => {
                  if (!confirm(`Delete sticker “${s.name}”?`)) return;
                  try {
                    await deleteServerSticker(s.id);
                    await refresh();
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Could not delete");
                  }
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
