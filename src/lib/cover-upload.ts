/** Resize and compress an image data URL for cover upload (keeps Blobs small). */
export async function compressCover(
  dataUrl: string,
  maxWidth = 600,
  quality = 0.82,
): Promise<{ dataUrl: string; mediaType: string }> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxWidth / img.width);
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");

  ctx.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl: out, mediaType: "image/jpeg" };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}
