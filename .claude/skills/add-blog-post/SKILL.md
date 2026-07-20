---
name: add-blog-post
description: Add a new blog article to the FORMA architecture site (create the article page, add it to the blog listing, wire up SEO tags). Use when asked to write, add, or publish a new blog post for FORMA.
---

# Adding a blog post to FORMA

The site is static HTML (no CMS). Follow the pattern of the existing posts
(`blog-natural-light.html`, `blog-materials.html`, `blog-design-questions.html`)
exactly — same header/nav, footer, and CSS classes from `src/styles/premium.css`.

## Steps

1. **Slug & filename**: `blog-<english-slug>.html` in the project root, lowercase,
   hyphenated (content is Ukrainian, filenames stay English like the rest of the site).

2. **Cover image — Pexels only, never Unsplash**:
   Unsplash mixes in paid "Unsplash+" photos that render with a tiled watermark
   even on non-`plus.` URLs — there's no way to tell from the URL alone. Pexels
   has no such tier; every hotlinked photo is clean.
   - `WebFetch` on `https://www.pexels.com/search/<query>/`, prompt it to list
     direct `https://images.pexels.com/photos/...` URLs.
   - Before using any URL, verify it with a HEAD request:
     `Invoke-WebRequest -Uri <url> -Method Head -UseBasicParsing` (PowerShell) —
     must return `200` and `Content-Type: image/jpeg`. Never paste a Pexels/Unsplash
     URL into the site without this check.
   - Size via query params: cover image `?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=900`,
     blog-grid thumbnail `...&w=1000&h=750`.

3. **Copy an existing post file** as the starting point (`blog-materials.html` is
   a good template) and update:
   - `<title>` — real title, ≤ 60 characters
   - `<meta name="description">` — ≤ 155 characters
   - `<link rel="canonical">` → `/blog-<slug>.html`
   - OG title/description/image
   - `<script type="application/ld+json">` — `BlogPosting`, real `headline`,
     `datePublished` (use today's date unless told otherwise), `image`
   - Nav: `blog.html` link keeps `aria-current="page"` (it's still a blog page)
   - `.kicker` label in the article header (short category word, e.g. "Проєктування")
   - `.article-header h1`, `.article-meta` (date + "FORMA")
   - `.article-cover img` — real alt text describing the temp photo, mark it as
     a placeholder in the alt text until real project photos exist, same as
     every other image on this site right now
   - `.article-body` — 3–5 short paragraphs, at least one `<h2>` subheading.
     Real substance, not keyword stuffing — matches the tone of the existing
     3 posts (concrete, a little opinionated, grounded in practice).

4. **Add a card to `blog.html`**: new `<article class="journal-card">` in
   `.blog-grid`, same markup shape as the existing three (image + `<h3>` +
   one-line dek + `Читати →` link). Newest post first.

5. **Optional — feature it on the homepage**: `index.html` has a 3-card
   `#journal` carousel ("Нотатки бюро"). If the new post should be featured,
   swap it in for the oldest of the current three.

6. **Verify before reporting done**:
   - Use the local `static-site` preview server (`preview_start` with the
     `.claude/launch.json` config already in this project) — never `file://`
     navigation for re-checking edits, it serves a cached static snapshot from
     first load and won't reflect changes.
   - `get_page_text` on the new page to confirm content renders (the
     screenshot/computer tool in this session has been flaky — text extraction
     is the reliable check).
   - Re-check the image URL's HEAD status if there's any doubt it changed.

## Site-wide rules to keep (from the project's CLAUDE.md)

- `html lang="uk"`, one `<h1>` per page, alt text on every image
- Spacing only via the `--space-1` … `--space-6` scale (4/8/16/24/48/96px)
- Colors only via CSS variables already defined in `premium.css`
- `loading="eager" fetchpriority="high"` on the cover image (it's the first
  thing in the article), nothing else on the page should be eager
- No new font families — this site uses exactly Fraunces + Work Sans everywhere
