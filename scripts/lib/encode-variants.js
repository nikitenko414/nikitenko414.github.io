const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DEFAULT_WIDTHS = [640, 1280, 1920];

// Resizes `buffer` to each width in `widths` (skipping widths larger than the
// source) and writes jpg/webp/avif variants named `${basename}-${width}.${ext}`
// into `outDir`. Returns per-file sizes in bytes for budget checks.
// `quality` optionally overrides the default per-format quality (e.g. to
// bring a high-detail source back under the hero-image budget).
async function encodeVariants(buffer, basename, outDir, widths = DEFAULT_WIDTHS, quality = {}) {
  const q = { jpg: 72, webp: 68, avif: 55, ...quality };
  fs.mkdirSync(outDir, { recursive: true });
  const meta = await sharp(buffer).metadata();
  const results = [];

  for (const w of widths) {
    if (w > meta.width) continue;
    const base = sharp(buffer).resize({ width: w });

    const jpgPath = path.join(outDir, `${basename}-${w}.jpg`);
    const webpPath = path.join(outDir, `${basename}-${w}.webp`);
    const avifPath = path.join(outDir, `${basename}-${w}.avif`);

    await base.clone().jpeg({ quality: q.jpg, mozjpeg: true }).toFile(jpgPath);
    await base.clone().webp({ quality: q.webp }).toFile(webpPath);
    await base.clone().avif({ quality: q.avif }).toFile(avifPath);

    results.push({
      width: w,
      jpg: fs.statSync(jpgPath).size,
      webp: fs.statSync(webpPath).size,
      avif: fs.statSync(avifPath).size,
    });
  }

  return { meta, results };
}

function formatSizesLine(width, sizes) {
  return `  ${width}w: jpg=${(sizes.jpg / 1024).toFixed(0)}KB webp=${(sizes.webp / 1024).toFixed(0)}KB avif=${(sizes.avif / 1024).toFixed(0)}KB`;
}

module.exports = { encodeVariants, formatSizesLine, DEFAULT_WIDTHS };
