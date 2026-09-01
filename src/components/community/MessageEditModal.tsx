import { useEffect, useRef } from "react";
import { CommunityModal } from "@/components/CommunityModal";
import { Button } from "@/components/Button";

export function MessageEditModal({
  open,
  initialBody,
  onClose,
  onSave,
}: {
  open: boolean;
  initialBody: string;
  onClose: () => void;
  onSave: (body: string) => void | Promise<void>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = textareaRef.current;
    if (!el) return;
    el.value = initialBody;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [open, initialBody]);

  return (
    <CommunityModal open={open} onClose={onClose} title="Edit message" tone="community">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const body = textareaRef.current?.value.trim();
          if (!body) return;
          void Promise.resolve(onSave(body)).then(onClose);
        }}
        className="space-y-3"
      >
        <textarea
          ref={textareaRef}
          rows={4}
          className="w-full resize-y rounded-lg bg-[var(--community-input)] px-3 py-2 text-[0.9375rem] text-foreground outline-none ring-1 ring-[var(--community-border)] focus:ring-accent/40"
          placeholder="Edit your message…"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Save
          </Button>
        </div>
      </form>
    </CommunityModal>
  );
}
