---
name: add-project
description: Add a new project case-study page to the FORMA architecture site (houses, commercial, landscape, or interior), including an optional floor-plans section. Use when asked to publish a new house/project, or when the user forwards raw content (text + photos, often from Telegram) about a completed project.
---

# Adding a project page to FORMA

The site is static HTML (no CMS). Every category — `houses.html`,
`commercial.html`, `landscape.html`, `interior.html` — links out to
`project-<slug>.html` pages that all share one structural pattern (same
header/nav/footer, `.article-header`, `.article-cover`, `.article-body`,
`.project-gallery`, and now optionally `.project-plans`). Copy an existing
page as your template — e.g. `project-villa-sosnovyi-bir.html`.

Content usually arrives as a raw dump from the studio (often relayed from a
Telegram message the client/colleague sent). Your job is to turn that into a
compliant page — right SEO, right image pipeline, right listing entries —
not to invent content.

## Intake checklist

**Required before you can publish:**
- category (houses / commercial / landscape / interior)
- title, location + year
- at least 1 photo
- 2–4 paragraphs of raw text about the project

**Optional:**
- floor plans (photos/scans of drawings, or a PDF of the full plan set)
- extra gallery photos
- per-floor area (for plan captions)
- tags beyond the primary category

If something required is missing, ask the user specifically for that piece —
don't re-ask the whole checklist.

## Steps

1. **Slug & filename**: `project-<english-slug>.html` in the project root,
   lowercase, hyphenated — same convention as the existing project pages.

2. **Photos**:
   - **Real photos provided** (the normal case going forward): put the raw
     files in `content-incoming/<slug>/photos/` (jpg/png/webp — convert HEIC
     to jpg first, sharp doesn't reliably handle it), then run:
     `node scripts/process-local-images.js <slug>`
     This outputs `src/images/photos/<slug>-photo-<n>-<width>.{avif,webp,jpg}`
     and prints each variant's size in KB — check the hero variant against
     the 200 KB budget from CLAUDE.md before using it as the eager hero image.
   - **No real photos yet**: fall back to a Pexels placeholder, exactly like
     `add-blog-post` does — `WebFetch` on `https://www.pexels.com/search/<query>/`,
     verify the direct `images.pexels.com` URL with a HEAD request (must be
     `200` + `image/jpeg`), never Unsplash (paid tier photos can carry a
     watermark with no way to detect it from the URL). Mark placeholder
     photos as such in the alt text, same as every current project page.

3. **Floor plans** (only if provided): raw files in
   `content-incoming/<slug>/plans/` (images and/or one PDF), same command as
   above — it also copies any PDF straight to `src/plans/<slug>.pdf`
   untouched. Add this section to the page (after `.project-gallery`, or
   wherever fits the content):

   ```html
   <section class="project-plans" aria-labelledby="plans-heading">
     <h2 id="plans-heading">Плани поверхів</h2>
     <div class="plans-grid">
       <figure>
         <picture>
           <source type="image/avif" srcset="src/images/photos/<slug>-plan-1-640.avif 640w, src/images/photos/<slug>-plan-1-1280.avif 1280w, src/images/photos/<slug>-plan-1-1920.avif 1920w" sizes="(max-width: 640px) 100vw, 400px">
           <source type="image/webp" srcset="src/images/photos/<slug>-plan-1-640.webp 640w, src/images/photos/<slug>-plan-1-1280.webp 1280w, src/images/photos/<slug>-plan-1-1920.webp 1920w" sizes="(max-width: 640px) 100vw, 400px">
           <img src="src/images/photos/<slug>-plan-1-1280.jpg" srcset="src/images/photos/<slug>-plan-1-640.jpg 640w, src/images/photos/<slug>-plan-1-1280.jpg 1280w, src/images/photos/<slug>-plan-1-1920.jpg 1920w" sizes="(max-width: 640px) 100vw, 400px" width="1000" height="750" alt="Поверховий план «<Назва>», 1-й поверх" loading="lazy">
         </picture>
         <figcaption>1-й поверх · 118 м²</figcaption>
       </figure>
       <!-- one <figure> per plan image -->
     </div>
     <a class="plan-download" href="src/plans/<slug>.pdf" download>Завантажити повний план (PDF)</a>
   </section>
   ```

   Drop the `plan-download` link if there's no PDF. `.project-plans` /
   `.plans-grid` styles already exist in `src/styles/premium.css` — plan
   images get a light card background (not the grayscale photo filter),
   since they're line drawings that need to stay legible on the dark page.

   **Interactive room hotspots (optional, do only if asked)**: hovering/
   focusing a room highlights it on the plan and shows its area — markup is
   `.interactive-plan` wrapping the `<picture>` + one `<button class="room-hotspot" style="left:X%;top:Y%;width:W%;height:H%;">`
   per room (see `project-budynok-kyivska-oblast.html` for a full example).
   Getting the `%` boxes right is the hard part — **don't just eyeball
   coordinates from the image, and don't trust a single automatic pass
   either**. Both were tried and both produce visibly wrong boxes (rooms
   bleeding into their neighbors). The process that actually works:

   1. Use `scripts/lib/wall-detector.js`'s `loadPixels` + `scanVWalls`/
      `scanHWalls` to scan a **wide** x or y range and list *every* candidate
      wall with a darkness score (0–255), not just the nearest one to a
      guess. Real walls in these line-drawing plans score 230–255; furniture/
      appliance icons score lower (150–210) and will out you if you trust a
      single nearby-peak search (`castRay`/`findRoomBox` in the same file
      do this automatically and are tempting, but they walk straight into
      furniture icons and stop early — don't rely on them alone).
   2. Cross-reference the candidate list against what you can see in the
      plan image yourself — you already know which room is which; the scan
      just gives you the precise pixel position of the wall between them.
   3. Composite the boxes you've derived onto a copy of the plan with sharp
      (draw a semi-transparent rect + label per room, see git history on
      `project-budynok-kyivska-oblast.html` for the exact snippet) and
      **view that image** before touching the live HTML. If anything's off,
      fix that room's numbers and re-render — don't skip straight to the
      page.
   4. Only after the overlay looks right, write the `%` values into the
      `room-hotspot` buttons.

4. **Fill the template**: `<title>` (≤60 chars), `<meta name="description">`
   (≤155 chars), `<link rel="canonical">` → `/project-<slug>.html`, OG
   title/description/image/url, JSON-LD `ImageObject` (real `contentUrl` —
   the hero's largest variant, or the Pexels URL if using a placeholder).
   Hero `<img>` keeps `loading="eager" fetchpriority="high"` — nothing else
   on the page should be eager. `.article-body`: 2–4 paragraphs from the raw
   text, edited into the site's tone (concrete, grounded in practice — not
   marketing filler). `.project-tags`: link back to the category page
   (`houses.html` etc.), plus any secondary category that applies.

5. **Add a card to the category listing page** (`houses.html` /
   `commercial.html` / `landscape.html` / `interior.html`): new
   `<article class="project-card">` in the `#projects-carousel`, same shape
   as the existing ones (picture + `.kicker` + `<h3>`). New project goes
   first.

6. **Add to `sitemap.xml`**: a `<url>` entry with `priority 0.6` and
   `lastmod` set to today's date — same shape as the existing `project-*`
   entries.

7. **Optional — feature on the homepage**: `index.html` has a project
   carousel; swap the new project in for the oldest one if asked to feature it.

8. **Verify before reporting done**:
   - `preview_start` with the `static-site` config from `.claude/launch.json`
     — never `file://`, it serves a stale cached snapshot.
   - `get_page_text` on the new page (screenshot/`computer` has been flaky in
     this environment — text extraction is the reliable check).
   - If a plans section was added, `resize_window` to mobile once to confirm
     `plans-grid` wraps sensibly.

## Site-wide rules to keep (from the project's CLAUDE.md)

- `html lang="uk"`, one `<h1>` per page, descriptive alt text on every image
- Spacing only via the `--space-1` … `--space-6` scale
- Colors only via CSS variables already defined in `premium.css`
- No new font families — exactly Italiana + Work Sans everywhere (see
  `--font-display`/`--font-body` in `premium.css`)
- Every `<img>` needs explicit `width`/`height` (CLS), 3-size `srcset`
  (640/1280/1920), AVIF → WebP → JPEG fallback order, `loading="lazy"` below
  the fold
