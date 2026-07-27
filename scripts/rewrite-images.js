const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
// Only the real, indexed production pages — archived design variants
// (swiss/editorial/brutalist/dark-*) are intentionally excluded.
const files = [
  'index.html', 'houses.html', 'commercial.html', 'landscape.html', 'interior.html',
  'blog.html', 'blog-natural-light.html', 'blog-materials.html', 'blog-design-questions.html',
  'project-dim-na-dnipri.html', 'project-villa-sosnovyi-bir.html', 'project-budynok-terasa.html',
  'project-office-vektor.html', 'project-showroom-pryama-linia.html', 'project-business-osnova.html',
  'project-park-klever.html', 'project-loft-richkova.html', 'project-apartments-minimal.html'
];

// Matches a single <img ...> tag whose src is a Pexels photo URL.
const imgRegex = /<img src="https:\/\/(?:images|plus)\.pexels\.com\/photos\/(\d+)\/pexels-photo-\d+\.jpeg\?[^"]*" width="(\d+)" height="(\d+)" alt="([^"]*)"([^>]*)>/g;

function buildPicture(id, width, height, alt, rest) {
  const eager = /loading="eager"/.test(rest);
  const fetchPriority = /fetchpriority="high"/.test(rest);
  const sizes = eager ? '100vw' : '(max-width: 640px) 100vw, 400px';
  const loadingAttr = eager ? ' loading="eager"' : ' loading="lazy"';
  const fpAttr = fetchPriority ? ' fetchpriority="high"' : '';

  const base = `src/images/photos/${id}`;
  const avifSrcset = `${base}-640.avif 640w, ${base}-1280.avif 1280w, ${base}-1920.avif 1920w`;
  const webpSrcset = `${base}-640.webp 640w, ${base}-1280.webp 1280w, ${base}-1920.webp 1920w`;
  const jpgSrcset = `${base}-640.jpg 640w, ${base}-1280.jpg 1280w, ${base}-1920.jpg 1920w`;

  return `<picture>
      <source type="image/avif" srcset="${avifSrcset}" sizes="${sizes}">
      <source type="image/webp" srcset="${webpSrcset}" sizes="${sizes}">
      <img src="${base}-1280.jpg" srcset="${jpgSrcset}" sizes="${sizes}" width="${width}" height="${height}" alt="${alt}"${loadingAttr}${fpAttr}>
    </picture>`;
}

let totalReplacements = 0;

for (const file of files) {
  const filePath = path.join(root, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let count = 0;

  content = content.replace(imgRegex, (match, id, width, height, alt, rest) => {
    count++;
    return buildPicture(id, width, height, alt, rest);
  });

  if (count > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`${file}: replaced ${count} image(s)`);
    totalReplacements += count;
  }
}

console.log(`\nTotal replacements: ${totalReplacements}`);
