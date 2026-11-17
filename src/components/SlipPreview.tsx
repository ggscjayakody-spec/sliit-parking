"use client";

import { useState } from "react";

/** Shows an uploaded bank slip: as an image if it is one, otherwise (e.g. a PDF) as a link. */
export function SlipPreview({ url }: { url: string | null }) {
  const [notImage, setNotImage] = useState(false);

  if (!url) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-lilac-300 bg-white/50 p-6 text-center text-sm font-semibold text-ink-soft">
        No slip uploaded
      </div>
    );
  }
  if (notImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border border-lilac-200 bg-white/70 p-6 text-center font-bold text-[#5b4fd6] underline underline-offset-4"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6" />
        </svg>
        Open uploaded slip (PDF)
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-lilac-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Uploaded payment slip" className="max-h-[26rem] w-full object-contain" onError={() => setNotImage(true)} />
    </a>
  );
}
