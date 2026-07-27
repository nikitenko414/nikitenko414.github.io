const sharp = require('sharp');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ids = [
  '10177216', '1190903', '12277631', '1313534', '15422346',
  '16370914', '16631149', '1974596', '290275', '32666364',
  '5825574', '6430734', '6615806', '6615908', '7045921',
  '7587879', '8089275', '8091888', '8134814', '9708531'
];

const widths = [640, 1280, 1920];
const outDir = path.join(__dirname, '..', 'src', 'images', 'photos');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function processId(id) {
  const masterUrl = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920`;
  console.log(`Fetching master for ${id}...`);
  const buffer = await fetchBuffer(masterUrl);
  const meta = await sharp(buffer).metadata();
  console.log(`  master: ${meta.width}x${meta.height}, ${(buffer.length / 1024).toFixed(0)} KB`);

  for (const w of widths) {
    if (w > meta.width) continue;
    const base = sharp(buffer).resize({ width: w });

    const jpgPath = path.join(outDir, `${id}-${w}.jpg`);
    const webpPath = path.join(outDir, `${id}-${w}.webp`);
    const avifPath = path.join(outDir, `${id}-${w}.avif`);

    await base.clone().jpeg({ quality: 72, mozjpeg: true }).toFile(jpgPath);
    await base.clone().webp({ quality: 68 }).toFile(webpPath);
    await base.clone().avif({ quality: 55 }).toFile(avifPath);

    const jpgSize = fs.statSync(jpgPath).size;
    const webpSize = fs.statSync(webpPath).size;
    const avifSize = fs.statSync(avifPath).size;
    console.log(`  ${w}w: jpg=${(jpgSize/1024).toFixed(0)}KB webp=${(webpSize/1024).toFixed(0)}KB avif=${(avifSize/1024).toFixed(0)}KB`);
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const id of ids) {
    try {
      await processId(id);
    } catch (err) {
      console.error(`FAILED for ${id}:`, err.message);
    }
  }
  console.log('Done.');
}

main();
