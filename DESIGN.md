---
name: Lucy Liu Design System
description: Dark, pixel-lit portfolio for Lucy Liu, interaction designer and design engineer, NYU IMA
updated: 2026-10-31
source: ui_kits/portfolio/colors_and_type.css (tokens and the shared component classes)
colors:
  void: "#050710"
  navy: "#0A0F2A"
  navy-mid: "#141930"
  navy-light: "#1E2640"
  cloud: "#F6FAFF"
  blue-200: "#C8DEFF"
  blue-300: "#A0C8FF"
  signal-blue: "#72ADFF"
  lavender: "#C4B0FF"
  fg1: "{colors.cloud}"
  fg2: "rgba(235, 243, 255, 0.55)"
  fg3: "rgba(160, 200, 255, 0.65)"
  border: "rgba(160, 200, 255, 0.10)"
  border-strong: "rgba(160, 200, 255, 0.20)"
  control-bg: "#0E122E"
  control-line: "#5C649E"
typography:
  title:     { fontFamily: "Syne", fontWeight: 700, fontSize: "clamp(48px, 6.2vw, 88px)", lineHeight: 0.96, letterSpacing: "-0.03em", token: "--type-title" }
  h2:        { fontFamily: "Syne", fontWeight: 700, fontSize: "clamp(28px, 3.1vw, 44px)", lineHeight: 1.1, token: "--type-h2" }
  h3:        { fontFamily: "Syne", fontWeight: 700, fontSize: "24px", lineHeight: 1.2, token: "--type-h3" }
  h3-small:  { fontFamily: "Syne", fontWeight: 700, fontSize: "18px", lineHeight: 1.25, token: "--type-h3-sm" }
  body:      { fontFamily: "DM Sans", fontWeight: 400, fontSize: "16px", lineHeight: 1.6 }
  label:     { fontFamily: "Space Mono", fontWeight: 400, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "{colors.fg3}", token: "--type-label" }
  link:      { fontFamily: "Syne", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "{colors.signal-blue}", token: "--type-link" }
  big-link:  { fontFamily: "Syne", fontWeight: 600, fontSize: "21px", letterSpacing: "-0.015em", token: "--type-big-link" }
  button:    { fontFamily: "Syne", fontWeight: 700, fontSize: "17px", token: "--type-btn" }
  control:   { fontFamily: "DM Sans", fontWeight: 500, fontSize: "14px", token: "--type-control" }
  tag:       { fontFamily: "Space Mono", fontWeight: 400, fontSize: "11px", token: "--type-tag" }
  wordmark:  { fontFamily: "Anybody", note: "the nav logo only (components/wordmark.js)", token: "--font-wordmark" }
  pixel:     { fontFamily: "Press Start 2P", note: "inside his pixel scenes only, never a page label", token: "--font-pixel" }
components:
  header:      "components/site-header.js (every page but home) and FlowingMenu.jsx (home): one header"
  footer:      "components/site-footer.js: one contact strip on every page"
  btn-notch:   "the solid button"
  link-big:    "big text link"
  link-caps:   "small link"
  link-inline: "a link inside a sentence"
  media-btn:   "media control"
  read-more:   "fold toggle"
  next-block:  "end of page"
  dot-list:    "tags"
---

# Design System: Lucy Liu

Lucy reviewed every button, link, label, tag, heading, header and footer on the site on 2026-10-31 and chose one of
each (the Design Consistency review, https://claude.ai/artifact/KuV16LEVrzVkpUs4msByD7). This file is the result.
The tokens and the shared classes live in `colors_and_type.css`, which every page loads; page stylesheets point
their own classes at those tokens, and new markup uses the shared classes directly. When this file and the code
disagree, the code in `colors_and_type.css` wins and this file is the one to fix.

## 1. Overview

**The Lit Archive, at night.** The site is dark only: the void (`#050710`) is every page's ground, and the light
comes from inside the work. His world (the creature, the hero room, the cabinets, the bench, the projector) is
pixel art drawn on canvases; the pages around it are set in three plain faces with one accent, signal blue.

The rule that holds it together: **one of each.** One solid button, one big link, one small link, one label, one way
to write a section number, one tag line, one fold toggle, one media control, one end-of-page block, one header,
one footer. A page that needs something new adds it to `colors_and_type.css` first.

## 2. Colors

- **Void** `#050710`: every page's background. Dark only; the light theme is retired.
- **Navy, navy-mid, navy-light** (`#0A0F2A`, `#141930`, `#1E2640`): surfaces, in that order of elevation.
- **Cloud** `#F6FAFF` as `--fg1`: titles and primary text.
- **`--fg2`** `rgba(235, 243, 255, .55)`: body copy.
- **`--fg3`** `rgba(160, 200, 255, .65)`: the label colour, for every label, kicker and section number.
- **Signal blue** `#72ADFF` as `--accent` (fills) and `--fg-accent` (link text). The only accent.
- **Lavender** `#C4B0FF`: atmosphere only (auras, the creature's scenes), never text.
- Pixel scenes keep their own palettes (the `--cx-*`, `--wd-*`, `--c-*` and `--dr-*` tokens), but their text, labels
  and links use the tokens above. No `#fff` or `#000` anywhere.

## 3. Typography

Three faces with fixed jobs, plus two that stay in their place:

| Role | Face | Token |
|---|---|---|
| Page title (h1) | Syne 700, 48 to 88px; home's hero is the one bigger | `--type-title` |
| Section heading (h2) | Syne 700, 28 to 44px | `--type-h2` |
| Card heading (h3) | Syne 700, 24px, or 18px for small cards | `--type-h3`, `--type-h3-sm` |
| Body | DM Sans 400, 16px | `--font-body` |
| Label, kicker, section number | Space Mono 400, 11px, 0.14em, uppercase, `--fg3` | `--type-label`, `--track-label` |
| Small link | Syne 600, 13px, 0.14em, uppercase, signal blue | `--type-link`, `--track-link` |
| The logo | Anybody, the breathing wordmark | `--font-wordmark` |
| Inside his pixel scenes | Press Start 2P | `--font-pixel` |

- **No italic accent word in any heading**, and no title that turns italic on hover (`tests/validate.test.js`).
- **Section numbers** read `01 · Label`: plain mono, the label style, no box, no icon, no roman numerals.
- **Anybody** is the logo's face only. **Press Start 2P** is for words drawn inside his scenes (the bench's room, the
  About drawer, the case viewer's Esc key). It is never a page label.

## 4. Components

All in `colors_and_type.css` unless noted.

- **Header**: `components/site-header.js` on every page but home, home's `FlowingMenu.jsx` on home; the same logo,
  MENU and menu. Past the top (on home, past the hero) it takes a frosted backing so nothing runs under the logo.
- **Footer**: `components/site-footer.js`, one contact strip on every page. Nothing above it repeats its links
  (home's Lights out keeps only the room and its line).
- **Solid button** `.btn-notch`: notched corners, signal blue, Syne 17/700, dark text; a `<small>` names the file
  (`View UX deck <small>PDF ↗</small>`). For decks, downloads, play and view-live. The case studies' `.cx-deck` is
  the same button.
- **Big text link** `.link-big` with `.link-arrow`: the hero's "All work →". For the one or two ways onward from a
  section (home's hero and its With AI band).
- **Small link** `.link-caps`: spaced caps, signal blue, underline on hover ("Open the file →", "Check out
  Driftwood ↗"). Every standalone link that is not a big link.
- **Link inside a sentence** `.link-inline` (and `.prose a`): signal blue, one 1px underline, 3px offset. No
  border-bottom second line.
- **Media control** `.media-btn`: the Demon Nights player's button (DM Sans 14/500, a 1px line, navy). Play, pause,
  sound, Look closer, View 1:1.
- **Fold toggle** `.read-more` with `.read-more-i`: "+ Read more", Space Mono 13 in signal blue after a small
  notched box holding a + or - drawn in 2px bars (`--rm-plus`, `--rm-minus`; no font needed). Every `<details>` that hides detail uses it.
- **End of page** `.next-block`: "Next project" in the label style, the project's name in Syne 700 with →, one line
  under it; a solid button may sit on the right. Never "Related project", never a row of small links.
- **Tags** `.dot-list`: a plain line, Space Mono 11, separated by middle dots. No boxes, no pills.
- **Labels** `.label` / `.eyebrow`: the label style above.

### Arrows

- **→** goes to a page on this site.
- **↗** opens a new tab: another site or a PDF.
- **↓** jumps further down this page (↑ goes back up, as in Back to top).
- Downloads carry no arrow. No drawn icons for links; the glyphs are the icon set.

## 5. Do and don't

- **Do** reach for the shared class before writing a new rule; if a page needs a variant, change the token.
- **Do** keep every label at `--type-label`, every page title at `--type-title`.
- **Don't** put a label in a box or a pill (Lucy: "i dont like how [the label] is in a pill box").
- **Don't** add a back link; the header and the end block do that job.
- **Don't** use em dashes in copy; use commas, colons, semicolons or parentheses.
- **Don't** use `#fff` or `#000`; use the tokens.
- **Don't** write "X, not Y" headings or copy.

## 6. Where the exceptions are, and why

- **Case-study title cards** (`.cx-g-title .cx-title`) set the title in Syne 800 at 36 to 46px: the title lives inside
  the one-screen grid's first tile, and 88px would break the grid.
- **With AI's headline** is a three-line statement, so it is sized to its column (40 to 62px) rather than 88px.
- **All Work's cabinet** keeps its folder tabs and year dividers as shapes (they are the cabinet), with the label
  style inside them.
- **Overlay labels** on the Audio Reactive comparison ("Source", "TouchDesigner") keep a dark backing so they read over
  moving video.
