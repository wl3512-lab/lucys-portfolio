# Case studies: the reading layout

The five live case studies (Chance AI, Driftwood, HabitaBull Lifting, Magnet Fishing, rep.tools), rebuilt to read like
[aaronjames.design](https://www.aaronjames.design/): one story told top to bottom, short sections, few pictures.

These files were built from the **live pages on lucyliu.xyz (26 Nov 2026)**, not from this repo's root, which stops at
30 Sep. Only `<main>` and the stylesheet lines changed. The head, meta tags, site header, footer, analytics and
edit-mode loader are the live ones, unchanged.

## The arc (every page, same order)

1. **Title**, one line on what it is, one main button
2. **Overview**: one short paragraph beside the facts (role, team, platform, timeline)
3. **One hero**: the cover image or the trailer
4. **Problems**: two or three, numbered, a sentence or two each
5. **The question**, set large: "How might …?"
6. **Goals**: each problem turned into what it should become (Old → New)
7. **The work**: one claim per row (heading left, two to four sentences right), then at most one picture or one set of up to three screens under it. Some rows have no picture.
8. **Final design**
9. **Results**: big numbers, real ones only, and where it stands
10. **What I learned**, **How it was made** (small, open, never folded), **Next project**

## Apply it

1. Copy the six files into `ui_kits/portfolio/`, replacing the five pages:
   `case-read.css`, `chance-ai.html`, `case-study.html`, `habitabull.html`, `magnet-fishing.html`, `reptools.html`.
2. Keep `case-spreads.css` and `components/case-spreads.js`: `h2know.html` and `eternal-wreckening.html` still use them.
3. Run `bash deploy.sh` (it should stamp `?v=` on `case-read.css` like the other stylesheets).
4. Update the rule in `CLAUDE.md` ("Case studies: the grid and the spreads (2026-10-25)") and
   `docs/projects/case-study-looks/TEMPLATE.md` to point at `case-read.css` and the arc above.

## What changed per page

| Page | Pictures before → after | Visible words before → after* |
|---|---|---|
| Chance AI | 21 → 13 | 664 → 794 |
| Driftwood | 15 → 6 | 751 → 845 |
| HabitaBull | 22 → 15 (4 are small mascot drawings) | 490 → 744 |
| Magnet Fishing | 9 → 7 | 337 → 569 |
| rep.tools | 14 → 6 | 512 → 736 |

\*The live pages hid much of their text behind "+ Read more" and "How it was made" folds, so their visible word count
was lower. Nothing is folded now, and the total copy is about the same or shorter.

Cut: the bento grid at the top of each page, plus
- Chance AI: the wireframe board, the create-skill flow, the card iterations, week 10 of Visual skills, weeks 8 to 10 of Home, the app icon
- Driftwood: the entry card, mood dial, first chat, certificate, both brand guides, the show photo, the almanac and the phone shot
- HabitaBull: the new-best, form-cue, crew-feed, welcome and PR screens, and the worried bull
- Magnet Fishing: the Shallows pile and the shop
- rep.tools: the product grids, the phone full-page screenshots, the live home, the tools hub and the buying guide

All the files are still in `assets/`.

Kept: every image's alt text is the live one, word for word. Driftwood keeps `id="cs-s-outcome"`, so the With AI
page's "Read the exhibition findings" link still lands on the results.

## Copy to check

Most sentences are the live copy, moved or lightly shortened. These are new, written to fit the arc. Please check
the wording:

- **Chance AI**: the line under the title; the question ("How might Chance AI answer like a product, not a chatbot,
  and give visual skills the same weight as Snap to know?"); the three goals; the problem titles; the results
  (7 screens audited, 3 weekly rounds, 1 style on every screen).
- **Driftwood**: the question ("How might a game teach people to catch the moment an AI's advice goes wrong?"); the
  goals for version two; "1/4 left before the training room" as a stat (from your own "a quarter of players left");
  "A flaw has to cost something" as a lesson.
- **HabitaBull**: problem 3 ("Coming back is where people drop off"); the question; the goals; the results (6 apps,
  6 interviews, 21 colour pairs).
- **Magnet Fishing**: the line under the title; problem 2 ("The map didn't fit"); the question; the goals; the lesson's
  second sentence.
- **rep.tools**: the line under the title; problem 3 ("There were no product pages"); the question; the goals; the
  "1st product pages" stat. The next-project line under Driftwood now uses the v2 one-liner.
