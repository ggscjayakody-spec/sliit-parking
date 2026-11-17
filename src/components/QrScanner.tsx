"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Camera QR scanner. Needs HTTPS (Vercel gives you this) or localhost.
 * Calls onScan once with the decoded text, then stops the camera.
 */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const id = "qr-" + useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const done = useRef(false);
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode(id, { verbose: false });
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: (w, h) => {
            const s = Math.floor(Math.min(w, h) * 0.7);
            return { width: s, height: s };
          } },
          (text) => {
            if (done.current) return;
            done.current = true;
            navigator.vibrate?.(60);
            scanner?.stop().catch(() => {});
            onScanRef.current(text);
          },
          () => {},
        );
        if (!cancelled) setStarting(false);
      } catch (e) {
        if (cancelled) return;
        setStarting(false);
        const msg = String(e);
        setError(
          /NotAllowed|Permission/i.test(msg)
            ? "Camera permission was denied. Allow camera access in your browser settings, or search by ID below."
            : /NotFound|Requested device not found/i.test(msg)
              ? "No camera found on this device. Search by ID or vehicle number below."
              : "Couldn't start the camera. It only works over HTTPS. Search by ID below instead.",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, [id]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-ink/90">
      <div id={id} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
      {/* corner brackets like the design */}
      <div className="pointer-events-none absolute inset-[15%]">
        <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-white" />
        <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-white" />
        <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-white" />
        <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-white" />
      </div>
      {(starting || error) && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-white/90">
          {error ?? "Starting camera…"}
        </div>
      )}
    </div>
  );
}
