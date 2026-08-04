// One-time migration: reads the current hand-authored root *.html files and
// writes the equivalent views/*.njk templates (front matter + body content
// only — header/nav/footer live in views/_includes/base.njk now). Run once,
// then `npm run build` and diff the output against these same source files
// to confirm nothing was lost in translation. Safe to delete after the
// migration is verified and committed; kept for now as a record of how it
// was done.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const nav = JSON.parse(fs.readFileSync(path.join(ROOT, 'views/_data/nav.json'), 'utf8'));

const pages = [
  { file: 'index.html', out: 'views/index.njk' },
  { file: 'houses.html', out: 'views/houses.njk' },
  { file: 'commercial.html', out: 'views/commercial.njk' },
  { file: 'landscape.html', out: 'views/landscape.njk' },
  { file: 'interior.html', out: 'views/interior.njk' },
  { file: 'blog.html', out: 'views/blog.njk' },
  { file: 'blog-natural-light.html', out: 'views/blog-natural-light.njk' },
  { file: 'blog-materials.html', out: 'views/blog-materials.njk' },
  { file: 'blog-design-questions.html', out: 'views/blog-design-questions.njk' },
  { file: '404.html', out: 'views/404.njk' },
  { file: 'project-villa-sosnovyi-bir.html', out: 'views/projects/villa-sosnovyi-bir.njk', permalink: '/project-villa-sosnovyi-bir.html' },
  { file: 'project-office-vektor.html', out: 'views/projects/office-vektor.njk', permalink: '/project-office-vektor.html' },
  { file: 'project-park-klever.html', out: 'views/projects/park-klever.njk', permalink: '/project-park-klever.html' },
  { file: 'project-showroom-pryama-linia.html', out: 'views/projects/showroom-pryama-linia.njk', permalink: '/project-showroom-pryama-linia.html' },
  { file: 'project-apartments-minimal.html', out: 'views/projects/apartments-minimal.njk', permalink: '/project-apartments-minimal.html' },
  { file: 'project-business-osnova.html', out: 'views/projects/business-osnova.njk', permalink: '/project-business-osnova.html' },
  { file: 'project-dim-na-dnipri.html', out: 'views/projects/dim-na-dnipri.njk', permalink: '/project-dim-na-dnipri.html' },
  { file: 'project-loft-richkova.html', out: 'views/projects/loft-richkova.njk', permalink: '/project-loft-richkova.html' },
  { file: 'project-budynok-terasa.html', out: 'views/projects/budynok-terasa.njk', permalink: '/project-budynok-terasa.html' },
  { file: 'project-budynok-kyivska-oblast.html', out: 'views/projects/budynok-kyivska-oblast.njk', permalink: '/project-budynok-kyivska-oblast.html' },
];

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function yamlString(s) {
  if (s == null) return null;
  // Double-quoted YAML scalar; escape backslashes and double quotes.
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function migrate({ file, out, permalink }) {
  // 11ty's default output path for a non-"index"-named template is
  // "<name>/index.html" (pretty URLs) — every page here needs an explicit
  // permalink matching its current flat filename, or the build silently
  // writes to the wrong path and leaves the real file stale.
  if (!permalink) permalink = '/' + file;
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');

  const title = extract(html, /<title>([\s\S]*?)<\/title>/);
  const description = extract(html, /<meta name="description" content="([\s\S]*?)">/);
  const robotsNoindex = /<meta name="robots" content="noindex">/.test(html);
  const canonical = extract(html, /<link rel="canonical" href="([\s\S]*?)">/);
  const ogTitle = extract(html, /<meta property="og:title" content="([\s\S]*?)">/);
  const ogDescription = extract(html, /<meta property="og:description" content="([\s\S]*?)">/);
  const ogType = extract(html, /<meta property="og:type" content="([\s\S]*?)">/);
  const ogUrl = extract(html, /<meta property="og:url" content="([\s\S]*?)">/);
  const ogImage = extract(html, /<meta property="og:image" content="([\s\S]*?)">/);
  const jsonld = extract(html, /<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/);

  const headerBlock = extract(html, /<header class="site-header wrap">([\s\S]*?)<\/header>/) || '';
  let currentNav = null;
  const curMatch = headerBlock.match(/<a href="([^"]+)" aria-current="page">/);
  if (curMatch) {
    const item = nav.find((n) => n.href === curMatch[1]);
    if (item) currentNav = item.key;
  }

  const content = extract(html, /<main id="top">\n([\s\S]*?)\n<\/main>/);
  if (content == null) throw new Error('No <main id="top"> content found in ' + file);

  let extraBodyEnd = extract(html, /<\/footer>\n\n?([\s\S]*?)(?:<script src="src\/scripts\/scroll-reveal\.js"><\/script>\n)?<\/body>/);
  if (extraBodyEnd) {
    extraBodyEnd = extraBodyEnd.replace(/<script src="src\/scripts\/scroll-reveal\.js"><\/script>\n?/, '').trim();
    if (!extraBodyEnd) extraBodyEnd = null;
  }
  const noReveal = !html.includes('src/scripts/scroll-reveal.js');

  const fm = [];
  fm.push('title: ' + yamlString(title));
  fm.push('description: ' + yamlString(description));
  if (robotsNoindex) fm.push('robotsNoindex: true');
  fm.push('canonical: ' + yamlString(canonical));
  if (ogTitle && ogTitle !== title) fm.push('ogTitle: ' + yamlString(ogTitle));
  if (ogDescription && ogDescription !== description) fm.push('ogDescription: ' + yamlString(ogDescription));
  if (ogType) fm.push('ogType: ' + yamlString(ogType));
  if (ogUrl) fm.push('ogUrl: ' + yamlString(ogUrl));
  if (ogImage) fm.push('ogImage: ' + yamlString(ogImage));
  if (currentNav) fm.push('currentNav: ' + yamlString(currentNav));
  if (permalink) fm.push('permalink: ' + yamlString(permalink));
  if (noReveal) fm.push('noReveal: true');
  fm.push('layout: base.njk');
  if (jsonld) {
    const indented = jsonld.split('\n').map((l) => '  ' + l).join('\n');
    fm.push('jsonld: |\n' + indented);
  }
  if (extraBodyEnd) {
    const indented = extraBodyEnd.split('\n').map((l) => '  ' + l).join('\n');
    fm.push('extraBodyEnd: |\n' + indented);
  }

  const outPath = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, '---\n' + fm.join('\n') + '\n---\n' + content + '\n', 'utf8');
  console.log('wrote', out);
}

for (const p of pages) migrate(p);
console.log('\nDone —', pages.length, 'templates written.');
