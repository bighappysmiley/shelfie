import { useRef, useState } from "react";
import { Button } from "./Button";
import { FormError } from "./form";

export function PhotoCapture({
  onCapture,
  onClose,
  label,
  actionLabel = "Analyze",
}: {
  onCapture: (dataUrl: string, mediaType: string) => void;
  onClose: () => void;
  label: string;
  actionLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {error && <FormError message={error} />}
      <p className="text-sm text-muted">{label}</p>

      {preview ? (
        <img src={preview} alt="Preview" className="w-full rounded-xl" />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-48 w-full items-center justify-center rounded-xl border border-dashed border-black/20 bg-accent-soft text-muted dark:border-white/20"
        >
          Tap to take or choose a photo
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="flex gap-3">
        {preview ? (
          <>
            <Button
              className="flex-1"
              onClick={() => {
                const match = preview.match(/^data:(image\/\w+);base64,/);
                onCapture(preview, match?.[1] ?? "image/jpeg");
              }}
            >
              {actionLabel}
            </Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Retake
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose} className="w-full">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
