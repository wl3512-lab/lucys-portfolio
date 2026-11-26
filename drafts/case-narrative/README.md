# Narrative case studies: the rollout

Lucy's five live case studies are moving from the stage-and-board template (`case-spreads.css`) onto the
**narrative template** (`case-narrative.css`), the one Portfolio Pet uses (branch `claude/inspiring-dijkstra-754quf`,
`drafts/portfolio-pet/`). One page at a time; Lucy approves each page's words before anything ships, and she ships
with `bash deploy.sh` on "ship".

These are drop-ins for the live source folder `ui_kits/portfolio/`. They were built on 26 Nov 2026 in a cloud session
that could not reach that folder, so they were checked against lucyliu.xyz as served (see Checks).

## Status

| Page | Status |
| --- | --- |
| Magnet Fishing (`magnet-fishing.html`) | Words approved by Lucy, 26 Nov. Ready to copy in; not shipped. |
| HabitaBull Lifting (`habitabull.html`) | Draft. Waiting for Lucy's words (12 drafted lines) and an answer on AI credits. |
| Chance AI (`chance-ai.html`) | Not started. |
| Driftwood (`case-study.html`) | Not started. Keep the audience caveat beside its result. |
| rep.tools (`reptools.html`) | Not started. |

## Drop-in

Copy `case-narrative.css` and the approved page into `ui_kits/portfolio/`, replacing the old page. The stylesheet is
Portfolio Pet's copy plus a few rules, so if Portfolio Pet ships first, use this copy for both:

- `.nr-result h3`: the claim beside a result.
- `.nr-hero figcaption`: a hero caption, only where the page needs one (HabitaBull's "demo data").
- `.nr-phones`: two phone screens at most 300 px each, so a pair stays shorter than a laptop screen.
- `.nr-match` with `--r` (width / height) on each figure: two pictures of different shapes at one height, uncropped.
  Add `.nr-stack` and `.nr-tall` on the phone screen when a wide picture sits beside a phone screen: on phones the
  pair stacks and the screen keeps half the width.

The outcomes heading is "Results" (Lucy, 26 Nov).

## Markup the tests can rely on

- Each section carries `data-nr`, in this order: `hero`, `over`, `prob`, `hmw`, `goal`, `proc` (repeats), `res`,
  `learn`, `credit`, `next`.
- A line Lucy has not approved yet carries `data-draft` and an HTML comment saying what it is. Remove both when she
  approves it; the check prints how many are left.
- A hero trailer keeps the site rule (Lucy, 2026-11-11): it plays itself, muted, 2 s after the page opens, once
  through, never under reduced motion. The page loads `components/case-spreads.js` for that alone
  (`main[data-case-spreads] video[data-cx-film]`); `case-spreads.css` is not loaded.

## Magnet Fishing: what moved where

- **Kept**: title tag, description, canonical, link preview, the trailer and its label, Play on itch.io, every alt
  text used, the AI credits (visible), the next project (rep.tools), the shared header and footer, Vercel analytics,
  the edit-mode loader.
- **New title**: "Turning clutter into a calm fishing puzzle", from the page's own description ("I turned the CLUTTER
  theme into a calm fishing puzzle").
- **New wording, marked `data-draft`**: the problems' lead line and one-word names, the "How might we" line (the old lesson heading "Show
  progress where the player is already looking.", asked as a question), the goal words, and the lesson heading
  "Let a fix become a feature." (was "A map fix turned the rope into the key between levels."). Every sentence under
  them is cut from the old page.
- **Cut**: the hero caption (now the overview), the decorative dragon beside the stage, the Sunset river screenshot
  (Morning and Night kept), the shop screenshot, and the "How it was made" fold. From the fold, the stack moved to
  Results and Tools, the AI use is the credits, and "29 automated tests" and the AI-playtest bug story were cut as
  process detail.
- Words: 468 visible (the old page showed 337 with its fold closed, about 470 open).

## HabitaBull: what moved where

- **Kept**: title tag, description, Open Graph tags, the walkthrough and its label, "Edited walkthrough with demo
  data." (as the hero caption), View the slides (PDF), Open the web version, every alt text used, the next project
  (Magnet Fishing), the shared header and footer, Vercel analytics, the edit-mode loader. The walkthrough still plays
  only when pressed, as on the live page.
- **New wording, marked `data-draft`**: the title ("Designing and building a lifting app for comebacks"), the problems'
  lead and one-word names, the "How might" line, the goal words and two goal sentences, and the lesson heading
  "Designers should build the thing." (from "That is the strongest argument I have for designers building the
  thing."). The section headings are new; the sentences under them are cut from the old page.
- **Cut**: the decorative dragon, five of nine app screens (set logged, rest timer, progress grid, crew feed, welcome),
  the 2023 tutorial and 2026 form-cue pair with its sentence, four of five mascot poses, the name "Oxide", the
  research and audit fold's detail (the app list, four Figma tasks, 21 token pairs), and "Every app I audited had the
  same problems."
- **No credits section**: the old page says nothing about AI use. Ask Lucy before adding one.
- Words: 538 visible.

## Checks

`tools/check.cjs <page> <out-dir>` loads a page at 1440 x 900 and 390 x 844, with and without reduced motion, and
fails on console errors, failed requests, sideways scroll, broken, cropped or alt-less images, more than 2 pictures
in a row, a missing or out-of-order section, 0 or more than 2 highlighted HMW words, or fewer than 400 / more than
650 words. It also checks that the hero rests on its poster under reduced motion. It runs in Chromium and in WebKit
where WebKit is installed. `BASE` is the served site root (default `http://127.0.0.1:8931`).

Run it against the source folder on Lucy's computer. Without that folder, `tools/serve-live.cjs` serves this
directory over a copy of lucyliu.xyz that fills itself from the live site. `edit-mode.js` (localhost only, never
deployed) and Vercel's `/_vercel/` scripts are ignored.

26 Nov 2026, Chromium, both sizes, both motion settings: Magnet Fishing passes (468 words, trailer still under
reduced motion) and so does HabitaBull (538 words; its walkthrough never starts on its own). No errors, no failed
requests, no sideways scroll on either. A page without a credits section gets a note, not a failure. WebKit was not
installed in that session.

## Still to do

1. Lucy approves HabitaBull's words and says whether to credit AI; remove its `data-draft` marks.
2. Chance AI, Driftwood and rep.tools, one at a time, each shown to Lucy.
3. In `ui_kits/portfolio/`: update `npm test` and the case-spreads checks that expect the stage-and-board layout
   (they are not served on lucyliu.xyz, so they could not be read here), and run them in Chromium and WebKit.
4. All Work links and Portfolio Pet's "next project" chain stay as they are unless Lucy says otherwise.
