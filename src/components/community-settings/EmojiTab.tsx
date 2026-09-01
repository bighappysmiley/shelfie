import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/form";
import { AuthedImage } from "@/components/AuthedImage";
import {
  createServerEmoji,
  deleteServerEmoji,
  listServerEmoji,
  uploadCommunityImage,
} from "@/lib/community";
import type { CommunityServerEmoji } from "@/lib/community-types";
import { getEmojiSlotLimit } from "@/lib/pro";

export function EmojiTab({
  serverId,
  userId,
  boostCount = 0,
  onError,
}: {
  serverId: string;
  userId: string;
  boostCount?: number;
  onError: (msg: string) => void;
}) {
  const [emoji, setEmoji] = useState<CommunityServerEmoji[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setEmoji(await listServerEmoji(serverId));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load emoji");
    }
  };

  useEffect(() => {
    void refresh();
  }, [serverId]);

  const slotLimit = getEmojiSlotLimit(boostCount);

  const onUpload = async (file: File) => {
    if (!name.trim()) {
      onError("Enter an emoji name first (e.g. shelf_wave)");
      return;
    }
    if (emoji.length >= slotLimit) {
      onError(`Emoji limit reached (${slotLimit}). Boost the server to unlock more slots.`);
      return;
    }
    setBusy(true);
    onError("");
    try {
      const url = await uploadCommunityImage(file);
      await createServerEmoji({ serverId, name, imageUrl: url, userId });
      setName("");
      await refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not upload emoji");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-[0.875rem] text-muted">
        Upload custom emoji for this server ({emoji.length}/{slotLimit} slots). Members can type{" "}
        <code className="text-foreground">:name:</code> in chat.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <TextField
          label="Emoji name"
          value={name}
          onChange={(e) => setName(e.target.value.replace(/\s/g, "_"))}
          placeholder="shelf_wave"
          className="min-w-[10rem] flex-1"
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
          {busy ? "Uploading…" : "Upload image"}
        </Button>
      </div>

      {emoji.length === 0 ? (
        <p className="text-[0.875rem] text-muted">No custom emoji yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {emoji.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-[var(--radius-group)] border border-[var(--community-border)] bg-fill/40 p-3"
            >
              <AuthedImage src={e.imageUrl} alt="" className="h-10 w-10 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[0.8125rem]">:{e.name}:</p>
              </div>
              <button
                type="button"
                className="text-[0.75rem] text-destructive"
                onClick={async () => {
                  if (!confirm(`Delete :${e.name}:?`)) return;
                  try {
                    await deleteServerEmoji(e.id);
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
