const fs = require('fs');
const path = require('path');
const { encodeVariants, formatSizesLine } = require('./lib/encode-variants');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'src', 'images', 'photos');
const plansOutDir = path.join(root, 'src', 'plans');

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => !f.startsWith('.'))
    .sort()
    .map((f) => path.join(dir, f));
}

async function processGroup(files, labelPrefix) {
  let n = 0;
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) {
      console.log(`  skipping ${path.basename(file)} (unsupported format ${ext} — convert to jpg/png first)`);
      continue;
    }
    n += 1;
    const basename = `${labelPrefix}-${n}`;
    const buffer = fs.readFileSync(file);
    const { meta, results } = await encodeVariants(buffer, basename, outDir);
    console.log(`${basename} <- ${path.basename(file)}: ${meta.width}x${meta.height}`);
    for (const r of results) {
      console.log(formatSizesLine(r.width, r));
    }
  }
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node scripts/process-local-images.js <slug>');
    process.exit(1);
  }

  const incomingDir = path.join(root, 'content-incoming', slug);
  const photosDir = path.join(incomingDir, 'photos');
  const plansDir = path.join(incomingDir, 'plans');

  if (!fs.existsSync(incomingDir)) {
    console.error(`No such folder: content-incoming/${slug}`);
    process.exit(1);
  }

  console.log(`Photos (-> ${slug}-photo-N-*):`);
  await processGroup(listFiles(photosDir), `${slug}-photo`);

  console.log(`Plans (-> ${slug}-plan-N-*):`);
  const planFiles = listFiles(plansDir);
  await processGroup(planFiles.filter((f) => path.extname(f).toLowerCase() !== '.pdf'), `${slug}-plan`);

  const pdf = planFiles.find((f) => path.extname(f).toLowerCase() === '.pdf');
  if (pdf) {
    fs.mkdirSync(plansOutDir, { recursive: true });
    const dest = path.join(plansOutDir, `${slug}.pdf`);
    fs.copyFileSync(pdf, dest);
    console.log(`Copied PDF -> src/plans/${slug}.pdf (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
  }

  console.log('Done.');
}

main();
