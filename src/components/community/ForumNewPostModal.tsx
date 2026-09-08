import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";
import { CommunityModal } from "@/components/CommunityModal";

export function ForumNewPostModal({
  channelName,
  open,
  onClose,
  onSubmit,
}: {
  channelName: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { title: string; body: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give your post a title.");
      return;
    }
    if (!body.trim()) {
      setError("Write something for the post.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({ title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create post");
      setBusy(false);
    }
  };

  return (
    <CommunityModal
      open={open}
      onClose={onClose}
      title={`New post in #${channelName}`}
      tone="community"
      onSubmit={handleSubmit}
      footer={
        <div className="flex items-center gap-2">
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !title.trim() || !body.trim()}>
            {busy ? "Posting…" : "Post"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is this post about?"
          required
          autoFocus
          maxLength={120}
        />
        <TextArea
          label="Post"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share details, questions, or a starting point for discussion…"
          rows={6}
          required
        />
        {error && <FormError message={error} />}
      </div>
    </CommunityModal>
  );
}
