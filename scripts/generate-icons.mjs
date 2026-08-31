import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const iconsDir = join(publicDir, "icons");

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" fill="#f0f2e8"/>
  <path fill="#3d5248" d="M24 8 40 36a2 2 0 0 1-1.8 2H9.8A2 2 0 0 1 8 36L24 8Z"/>
  <path fill="#3d5248" d="M21.25 36h5.5v6.75a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5V36Z"/>
</svg>`;

async function writePng(svg, size, path) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path);
}

await mkdir(iconsDir, { recursive: true });
await writePng(iconSvg, 180, join(publicDir, "apple-touch-icon.png"));
await writePng(iconSvg, 180, join(iconsDir, "icon-180.png"));
await writePng(iconSvg, 192, join(iconsDir, "icon-192.png"));
await writePng(iconSvg, 512, join(iconsDir, "icon-512.png"));

console.log("Generated home-screen PNG icons");
