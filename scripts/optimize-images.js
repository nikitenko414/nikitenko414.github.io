const https = require('https');
const path = require('path');
const { encodeVariants, formatSizesLine } = require('./lib/encode-variants');

const ids = [
  '10177216', '1190903', '12277631', '1313534', '15422346',
  '16370914', '16631149', '1974596', '290275', '32666364',
  '5825574', '6430734', '6615806', '6615908', '7045921',
  '7587879', '8089275', '8091888', '8134814', '9708531'
];

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

  const { meta, results } = await encodeVariants(buffer, id, outDir);
  console.log(`  master: ${meta.width}x${meta.height}, ${(buffer.length / 1024).toFixed(0)} KB`);
  for (const r of results) {
    console.log(formatSizesLine(r.width, r));
  }
}

async function main() {
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
