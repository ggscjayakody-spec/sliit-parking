"use client";

/** Shows an uploaded bank slip: inline if it's an image, otherwise a link. */
export function SlipPreview({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-lilac-300 bg-white/50 p-6 text-center text-sm font-semibold text-ink-soft">
        No slip image available
        <br />
        (sample data)
      </div>
    );
  }
  const isImage = /^data:image\//.test(url) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
  return isImage ? (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-lilac-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Uploaded payment slip" className="max-h-[26rem] w-full object-contain" />
    </a>
  ) : (
    <a href={url} target="_blank" rel="noreferrer" className="font-bold text-[#5b4fd6] underline underline-offset-4">
      Open uploaded slip
    </a>
  );
}
