/**
 * Phone photos of bank slips are often 3–8 MB, but the server accepts up to 4 MB.
 * Big images are resized (longest side 1800px) and saved as JPEG before upload.
 * PDFs and small images are sent unchanged.
 */
export async function shrinkImage(file: File, maxBytes = 1_500_000, maxSide = 1800): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size <= maxBytes) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // unsupported format (e.g. HEIC on some browsers) — let the server decide
  }
}
