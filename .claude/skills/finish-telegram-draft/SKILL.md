---
name: finish-telegram-draft
description: Turn raw content staged by the telegram-intake GitHub Action into a real page on the FORMA site. Use when the user says a new Telegram draft/PR is ready, or asks to check for new Telegram inbox content.
---

# Finishing a Telegram-intake draft

The `.github/workflows/telegram-intake.yml` Action polls the studio's
Telegram bot on a schedule and stages whatever comes in under
`telegram-inbox/<date>-<key>/` on a long-lived `telegram-intake` branch, as
a **draft PR** — it never touches `main` and never writes an actual page.
Your job is to turn that raw material into a real page using the existing
`add-project` or `add-blog-post` skill, then hand the PR back for human
review. **You push to the branch; you do not merge the PR** — merging to
`main` publishes to the live site, and that's the user's call, not yours
(confirmed with the user when this pipeline was designed: they specifically
want a human check before anything goes live).

## Steps

1. **Fetch the branch**: `git fetch origin telegram-intake && git checkout telegram-intake`
   (or `git checkout -b telegram-intake origin/telegram-intake` if it doesn't
   exist locally yet). If there's no such branch/PR, tell the user there's
   nothing new — don't invent content.

2. **Read each inbox item**: every folder under `telegram-inbox/` has:
   - `message.json` — `{ from, date, text, files }`. `text` is the raw
     caption/message text (may be short or messy — this is a person typing
     into Telegram, not writing copy).
   - `raw/` — the downloaded photos/documents, named `1.jpg`, `2.jpg`, etc.
     matching the order in `message.json.files`.

3. **Classify**: decide from `text` whether this is a project case study
   (house/commercial/landscape/interior) or a general blog post. If it's
   ambiguous (no category signal at all), ask the user — don't guess on
   something that changes which template and listing page it goes into.

4. **Check against the intake checklist** from `add-project`/`add-blog-post`
   (title, location+year or category, at least 1 photo, some body text). If
   something required is missing, ask the user for exactly that piece —
   Telegram messages are often incomplete on the first pass.

5. **Move raw files into the working folder** the image scripts expect:
   `content-incoming/<slug>/photos/` for photos, `content-incoming/<slug>/plans/`
   for anything that's clearly a floor plan or the PDF document (a PDF in
   `raw/` is unambiguous; for images, use the caption text if it says which
   ones are plans — otherwise ask). Then run
   `node scripts/process-local-images.js <slug>` as usual.

6. **Author the page**: follow `add-project` or `add-blog-post` from their
   "fill the template" step onward — SEO tags, category listing card,
   `sitemap.xml` entry, everything those skills already cover.

7. **Clean up the inbox item**: `git rm -r telegram-inbox/<date>-<key>` once
   its content has been moved into the real page — don't leave processed
   raw dumps sitting in the branch.

8. **Commit and push to `telegram-intake`** (not a new branch — the Action
   reuses this branch, so staying on it keeps history in one PR). Do not
   run `gh pr merge`. If the PR is still marked draft, `gh pr ready` is fine
   (just flips the draft flag so it shows up as awaiting review) — but stop
   there.

9. **Verify** with `preview_start` (`static-site` config) + `get_page_text`
   on the new page, same as the other two skills.

10. **Report back**: what was published (title, category, which files were
    used as photos vs. plans), and that the PR is ready for the user to
    review and merge whenever they're satisfied.

## Notes

- If multiple unrelated inbox folders exist at once (colleague sent several
  projects before anyone processed the backlog), handle them one at a time
  — don't mix content from different folders into one page.
- Telegram's `document` uploads (sent as files, not compressed photos) are
  preferred by `telegram-fetch.js` over its `photo` sizes precisely because
  compressed photos are downscaled/re-encoded by Telegram itself — if a
  photo looks low quality, that's why; ask the colleague to resend it as a
  file next time.
