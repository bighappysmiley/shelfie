import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { isValidIsbn, normalizeIsbn } from "@/lib/isbn";
import { Button } from "./Button";
import { FormError } from "./form";

/** Free camera barcode scan — no AI key required. */
export function CameraBarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (isbn: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const runningRef = useRef(false);
  const handledRef = useRef(false);

  useEffect(() => {
    const elId = "camera-barcode-reader";
    const scanner = new Html5Qrcode(elId);
    scannerRef.current = scanner;
    handledRef.current = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (decoded) => {
          if (handledRef.current) return;
          const isbn = normalizeIsbn(decoded);
          if (isValidIsbn(isbn) || isbn.length === 10 || isbn.length === 13) {
            handledRef.current = true;
            scanner.stop().catch(() => {});
            runningRef.current = false;
            onScan(isbn);
          }
        },
        () => {},
      )
      .then(() => {
        runningRef.current = true;
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Camera access denied — use a USB/Bluetooth scanner or enter ISBN manually",
        );
      });

    return () => {
      if (runningRef.current && scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      {error && <FormError message={error} />}
      <div id="camera-barcode-reader" className="overflow-hidden rounded-xl" />
      <p className="text-center text-sm text-muted">
        Point your camera at the ISBN barcode on the back cover
      </p>
      <Button variant="secondary" onClick={onClose} className="w-full">
        Cancel
      </Button>
    </div>
  );
}
