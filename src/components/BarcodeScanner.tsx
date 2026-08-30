import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "./Button";
import { FormError } from "./form";

export function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (isbn: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;

    const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];
    void formats;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (decoded) => {
          const isbn = decoded.replace(/[-\s]/g, "");
          if (isbn.length >= 10) {
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
        setError(err instanceof Error ? err.message : "Camera access denied");
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
      <div id="barcode-reader" className="overflow-hidden rounded-xl" />
      <p className="text-center text-sm text-muted">
        Point your camera at the ISBN barcode on the back cover
      </p>
      <Button variant="secondary" onClick={onClose} className="w-full">
        Cancel
      </Button>
    </div>
  );
}
