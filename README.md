# Portfolio UI Kit: Lucy Liu

A recreation of `lucyliu.dev`, componentized for reuse when designing new pages, case studies, or prototypes.

## Files

- **`index.html`**: full interactive portfolio (hero, work, skills, about, contact) with GSAP + Lenis scroll animations, custom cursor, magnetic buttons, and a working Tweaks panel.
- **`project-editor.html`**: form-based tool for adding / editing projects. Data persists to `localStorage` under `lucy.projects`. Export as JSON to paste into the portfolio's project list.
- **`animation-guide.md`**: Section-by-section animation plan with drop-in GSAP ScrollTrigger + Lenis code snippets (hero scroll reaction, magnetic hover, clip-path reveals, cursor, etc.).
- **`components/`**: JSX sources the kit is built from:
  - `Nav.jsx`: fixed top nav + scroll progress bar
  - `Hero.jsx`: editorial hero with char-split heading, photo, toolkit
  - `Marquee.jsx`: velocity-reactive running text strip
  - `ProjectRow.jsx`: editorial project row (used in the Work section)
  - `SkillCard.jsx`: bento-grid skill tile
  - `Cursor.jsx`: dual-layer custom cursor
  - `Contact.jsx`: centered contact block with elastic letter-spacing
  - `Tweaks.jsx`: in-page edit panel (toggle via toolbar)

## Usage

Open `index.html` directly to see the full portfolio. Open `project-editor.html` to add / edit projects via form.

## Adding a project (two paths)

1. **Quick way:** open `project-editor.html`, fill out the form, click *Save*. The project is stored in `localStorage`. Then click *Export JSON* and paste into the `PROJECTS` array at the top of `index.html`.
2. **Direct:** edit the `PROJECTS` array in `index.html`; each project is `{ id, title, description, tags, year, link, featured }`.

## What's intentionally simplified

- Project detail pages are stubs (alert on click).
- No routing; single-page mock.
- Lenis + GSAP loaded from CDN. Swap for local for production.
