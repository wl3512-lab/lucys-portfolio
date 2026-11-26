# Case studies on the aaronjames.design layout

Lucy's five live case studies, rebuilt on one layout copied from the case studies at
[aaronjames.design](https://www.aaronjames.design/facebook-marketplace-redesign) (Lucy, 26 Nov 2026: "copy the
layout"). The layout is his; the colours, fonts, header, footer, words and pictures are Lucy's.

These are drop-ins for the live source folder `ui_kits/portfolio/`. They were built on 26 Nov 2026 in a cloud
session that could not reach that folder, and checked against lucyliu.xyz as served (see Checks). Nothing is shipped:
Lucy ships with `bash deploy.sh` on "ship".

## Files

| File | Page |
| --- | --- |
| `case-narrative.css` | The layout (prefix `nr-`). Copy to the site root. |
| `chance-ai.html` | Chance AI |
| `case-study.html` | Driftwood |
| `habitabull.html` | HabitaBull Lifting |
| `magnet-fishing.html` | Magnet Fishing (words approved by Lucy, 26 Nov) |
| `reptools.html` | rep.tools |

Keep `case-spreads.css` in the site: `h2know.html` and `eternal-wreckening.html` still use it. Keep
`components/case-spreads.js` too: Magnet Fishing and Driftwood load it for their trailers.

## The layout, as measured on aaronjames.design (1440 x 900)

1. **Hero**: the first screen is the project's All Work cover (a muted loop for Driftwood, HabitaBull and rep.tools;
   the cover image for Chance AI and Magnet Fishing), darkened, with the title over it and one pill button with the
   arrow first. The site header floats over it. This is the one place a picture is cropped and darkened, as in the
   reference.
2. **Overview**: the label in the first column, the paragraph over the other two, then My role / Platforms (or
   Tools) / Year.
3. **Problems**: the label, a lead line, sometimes a picture, then three numbered columns.
4. **Opportunity**: the label, then one "How might …?" line at title size, its key words lit in the accent.
5. **Goals**: the label, a lead line, three columns of old word (greyed, as in the reference) → new word.
6. **Process sections**: a heading, a lead line across the column, then the pictures: wide screens full width and
   stacked; phone screens and thumbnails three across. A trailer or walkthrough sits in its own section before
   Results, where the reference puts its final designs.
7. **Results**: one statement per row; a big number on the right only for a real outcome (Magnet Fishing's 2nd of
   20, Driftwood's 76% with its audience caveat beside it). No process counts.
8. **What I learned** (three columns), **Credits** (label | text), **Next project**.

Measures: column 1156 px in a three-column grid (347 px columns, 56 px gaps); title and question 82 px; section
headings 33 px; lead lines 25 px with 2.2 line height; column text 21 px; 144 px between sections; 58 px between
words and pictures. On phones the reference shrinks body text to 11 px; these pages keep it at 16 px or more.

Not copied: his left rail, his floating Contact button and the small grey "H2 / P2" type tags beside each block.

## Markup the tests can rely on

- Each section carries `data-nr`, in this order: `hero`, `over`, `prob`, `hmw`, `goal`, `proc` (repeats), `res`,
  `learn`, `credit`, `next`.
- A line Lucy has not approved yet carries `data-draft` and an HTML comment saying where it came from. Remove both
  when she approves it; the check prints how many are left.
- Trailers keep the site rule (Lucy, 2026-11-11): they play themselves, muted, 2 s after the page opens, once
  through, while on screen, never under reduced motion (`main[data-case-spreads] video[data-cx-film]`).
  Hero loops use `cover-reel.js` (`data-cover-always`): they loop in view and rest on their poster under reduced
  motion.
- Kept on purpose: every page's title tag, description, link-preview tags, links (decks, PDFs, itch.io, the web
  version, GitHub), alt text word for word, the next-project chain, Vercel analytics and the edit-mode loader.
  Driftwood keeps `id="cs-s-outcome"` on its result, so the With AI page's "Read the exhibition findings" still
  lands there; Chance AI keeps `id="cs-s-carousel"`.

## Words still to approve

Everything not marked `data-draft` is the live page's own sentences, cut or shortened. Drafted lines per page:
Chance AI 9, Driftwood 9, HabitaBull 13, Magnet Fishing 1 (the trailer's new section line), rep.tools 10. They are
mostly the titles, one-word problem and goal names, and "How might" lines, which the live pages don't have.
HabitaBull has no Credits section: its live page says nothing about AI use.

## Checks

`tools/check.cjs <page> <out-dir>` loads a page at 1440 x 900 and 390 x 844, with and without reduced motion, and
fails on console errors, failed requests, sideways scroll, broken, cropped or alt-less images, too many pictures in
a row, a missing or out-of-order section, 0 or more than 2 lit words in the question, or fewer than 400 / more than
650 words. Every video must rest on its poster under reduced motion. It runs in Chromium, and in WebKit where WebKit
is installed. `BASE` is the served site root (default `http://127.0.0.1:8931`). Without Lucy's folder,
`tools/serve-live.cjs` serves this directory over a copy of lucyliu.xyz that fills itself from the live site.

26 Nov 2026, Chromium, both sizes, both motion settings: all five pass. Words: Chance AI 575, Driftwood 647,
HabitaBull 545, Magnet Fishing 479, rep.tools 549. WebKit was not installed in that session.

## Still to do

1. Lucy approves the drafted lines; remove their `data-draft` marks.
2. In `ui_kits/portfolio/`: copy these files in, update `npm test` and the case-spreads checks that expect the old
   layout (they are not served on lucyliu.xyz, so they could not be read here), and run them in Chromium and WebKit.
3. Portfolio Pet (`drafts/portfolio-pet/` on branch `claude/inspiring-dijkstra-754quf`) still uses the old
   narrow-column markup; its hero needs the same full-screen markup to match.
