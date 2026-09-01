import { AuthedImage } from "@/components/AuthedImage";
import { IconX } from "@/components/Icons";

export type StagedAttachment = {
  id: string;
  file: File;
  previewUrl: string;
  uploading?: boolean;
};

export function AttachmentPreviewBar({
  attachments,
  onRemove,
}: {
  attachments: StagedAttachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((a) => (
        <div
          key={a.id}
          className="relative overflow-hidden rounded-lg border border-[var(--community-border)] bg-[var(--community-input)]"
        >
          <AuthedImage src={a.previewUrl} alt="" className="h-20 w-20 object-cover" />
          {a.uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
              Uploading…
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(a.id)}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            aria-label="Remove attachment"
          >
            <IconX size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
