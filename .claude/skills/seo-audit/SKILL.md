---
name: seo-audit
description: Audit one or all pages of the FORMA site against the SEO/perf/a11y checklist from CLAUDE.md, and fix issues found directly in the HTML. Use when asked to check, audit, or verify SEO on a page or across the whole site.
---

# SEO audit for FORMA

Checks real HTML source against the checklists already defined in the
project's `CLAUDE.md` (## SEO, parts of ## Зображення and ## Доступність).
Read the file directly (`Read`/`Grep`) rather than relying on the rendered
DOM — meta tags, canonical, and JSON-LD are all easier to verify from source.

## Scope

- **Single page**: the user names a file or URL.
- **Whole site**: `Glob` for `*.html` at the repo root, then exclude
  everything listed under `Disallow:` in `robots.txt` (the archived design
  variants — swiss/editorial/brutalist/dark-\*/design-variants — aren't real
  indexed pages and don't need auditing).

## Checklist (per page)

**Meta / SEO**
- [ ] `<html lang="uk">`
- [ ] `<title>` present, ≤ 60 characters
- [ ] `<meta name="description">` present, ≤ 155 characters
- [ ] `<link rel="canonical">` present and matches the page's real path
- [ ] `og:title`, `og:description`, `og:type`, `og:url`, `og:image` all present
- [ ] `<script type="application/ld+json">` present, valid JSON, and the
      right `@type` for the page (`Organization`+`LocalBusiness` on
      index/contact-bearing pages, `ImageObject` on project pages,
      `BlogPosting` on blog posts)
- [ ] Page has an entry in `sitemap.xml` (unless it's intentionally excluded
      per `robots.txt`)

**Structure**
- [ ] Exactly one `<h1>`
- [ ] Heading order has no gaps (no `<h3>` before the first `<h2>`, etc.)
- [ ] Semantic landmarks present: `<header>`, `<nav>`, `<main>`, `<footer>`,
      and `<article>` on content pages

**Images** (ties into the site's perf budget, not just SEO)
- [ ] Every `<img>` has a non-empty, descriptive `alt` — not a filename, not
      "image1", not left as `alt=""` on a content photo (empty `alt` is only
      correct for purely decorative images, which this site shouldn't have)
- [ ] Every `<img>` has explicit `width` and `height`
- [ ] Exactly one eager image per page (the hero/cover — `loading="eager"
      fetchpriority="high"`); everything else `loading="lazy"`
- [ ] `<picture>` with avif → webp → jpg fallback order, 3-size `srcset`
      (640/1280/1920, or fewer if the source is smaller — never invent sizes
      larger than the source)

## Steps

1. Build the page list (see Scope).
2. For each page, read the `<head>` block and the body, and check off the
   list above.
3. **Fix directly** rather than just reporting, when the fix is unambiguous:
   - Trim an over-length title/description (don't just truncate mid-word —
     rewrite to fit while keeping the meaning)
   - Add a missing canonical/OG tag using values already present elsewhere
     on the page (og:title from `<title>`, og:url from the known site
     origin + filename, etc.)
   - Add a missing `sitemap.xml` entry (`priority` matching sibling pages of
     the same type, `lastmod` = today)
   - Fix heading gaps by adjusting levels (never by deleting content)
4. **Don't invent** what you can't derive from the page itself — a missing
   or generic `alt` on a real content photo needs a real description of
   what's actually in that image (look at it), not a placeholder string.
5. **Report as a table**: page | issues found | issues fixed | issues that
   need a human decision (e.g. a genuinely ambiguous alt text, or a title
   that's technically compliant but weak).

## Out of scope

This skill checks on-page/technical SEO only. It does not touch:
- Search Console / Bing Webmaster indexing status (external, needs account access)
- Backlinks, keyword rankings, competitor analysis
- Core Web Vitals as measured in the field (PageSpeed Insights/Lighthouse
  give lab estimates — mention them if asked, but this skill audits source,
  not runtime performance)
