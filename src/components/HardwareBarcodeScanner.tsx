import { useEffect, useRef, useState } from "react";
import { isValidIsbn, normalizeIsbn, isbnHint } from "@/lib/isbn";
import { Button } from "./Button";
import { FormError } from "./form";

/**
 * Hardware barcode scanner input (USB / Bluetooth).
 * These scanners act as a keyboard: they type the ISBN then press Enter.
 */
export function HardwareBarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (isbn: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [lastScanned, setLastScanned] = useState("");
  const bufferRef = useRef("");
  const lastKeyAt = useRef(0);

  const submitIsbn = (raw: string) => {
    const isbn = normalizeIsbn(raw);
    if (!isbn) return;
    if (!isValidIsbn(isbn) && isbn.length !== 10 && isbn.length !== 13) {
      setError("Invalid ISBN format. Enter a valid ISBN-10 or ISBN-13.");
      return;
    }
    setError("");
    setLastScanned(isbn);
    setValue("");
    bufferRef.current = "";
    onScan(isbn);
  };

  useEffect(() => {
    inputRef.current?.focus();
    const keepFocus = () => {
      const active = document.activeElement;
      if (active === inputRef.current) return;
      if (active?.closest("button, a, [role='button']")) return;
      inputRef.current?.focus();
    };
    const id = window.setInterval(keepFocus, 800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target !== inputRef.current &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyAt.current > 80) bufferRef.current = "";
      lastKeyAt.current = now;

      if (e.key === "Enter") {
        if (target === inputRef.current) return;
        const buf = bufferRef.current;
        if (buf) {
          e.preventDefault();
          submitIsbn(buf);
        }
        return;
      }

      if (target === inputRef.current) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [value, onScan]);

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-black/10 bg-accent-soft px-4 py-5 text-center dark:border-white/10">
        <p className="text-base font-semibold">Scanner ready</p>
        <p className="mt-2 text-sm text-muted">
          Connect a USB or Bluetooth barcode scanner and scan the ISBN barcode.
          Hardware scanners operate as keyboard input; no camera is required.
        </p>
      </div>

      {error && <FormError message={error} />}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Scan or type ISBN</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitIsbn(value);
            }
          }}
          className="w-full rounded-lg border border-black/10 bg-surface px-3.5 py-3 text-center font-mono text-lg tracking-wide text-foreground placeholder:text-muted/70 dark:border-white/10"
          placeholder="Awaiting scan…"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label="ISBN from barcode scanner"
        />
        <span className="mt-1.5 block text-center text-sm text-muted">
          {value ? isbnHint(value) : "Most scanners append Enter after the code"}
        </span>
      </label>

      {lastScanned && (
        <p className="text-center text-sm text-muted">
          Last scanned: <span className="font-mono text-foreground">{lastScanned}</span>
        </p>
      )}

      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={!normalizeIsbn(value)}
          onClick={() => submitIsbn(value)}
        >
          Look up
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
