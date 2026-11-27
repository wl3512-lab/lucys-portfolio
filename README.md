# Portfolio UI Kit: Lucy Liu

A recreation of `lucyliu.dev`, componentized for reuse when designing new pages, case studies, or prototypes.

## Files

- **`index.html`**: full interactive portfolio (hero, work, skills, about, contact) with GSAP + Lenis scroll animations, custom cursor, magnetic buttons, and a working Tweaks panel.
- **`project-editor.html`**: form-based tool for adding / editing projects. Data persists to `localStorage` under `lucy.projects`. Export as JSON to paste into the portfolio's project list.
- **`animation-guide.md`**: Section-by-section animation plan with drop-in GSAP ScrollTrigger + Lenis code snippets (hero scroll reaction, magnetic hover, clip-path reveals, cursor, etc.).
- **`components/`**: JSX sources the kit is built from. The ones that carry the page:
  - `Nav.jsx`: fixed top nav + scroll progress bar
  - `Hero.jsx`: editorial hero with char-split heading, photo, toolkit
  - `Spotlight.jsx`: the Standout Work deck. Cards stack as you scroll, then deal outward into the next section
  - `ProjectRow.jsx`: editorial project row
  - `Skills.jsx`: the Capabilities span and the `TOOLS` colour table (see below)
  - `GemStory.jsx`: the s0mped side-project section
  - `Contact.jsx`: centered contact block with elastic letter-spacing
  - `TargetCursor.jsx`: the custom cursor
  - `FlowingMenu.jsx`: the nav menu

  Plus the React Bits ports used as backdrops and effects (`Waves`, `Aurora`, `Dither`, `Iridescence`, `LaserFlow`, `AsciiText`, `FaultyTerminal`, `BorderGlow`, `MorphingText`, `AnimatedThemeToggler`) and the framework-free engines (`letter-glitch.js`, `reveal-field.js`, `outline-wordmark.js`, `ascii-text-core.js`, `faulty-terminal-core.js`, `use-in-view.js`).

## Capabilities: the first-person journey

Section 02, “Research, design, code, performance.”, is a scroll-controlled first-person flight through the portfolio's blue and lavender atmosphere. The camera rises, dips and gently banks past five capabilities. There is no literal rollercoaster model.

`components/capability-flight.js` owns the procedural Three.js scene and projects five world-space reading positions. `Skills.jsx` owns the scroll timeline, readable HTML, keyboard access and stop navigation. Headings reveal word by word, followed by the sentence, tools and related work. The same scroll position controls the fades and camera, including in reverse; pauses leave the text fully readable.

Edit capability content in `SPAN` and tool marks in `TOOLS`, both in `components/Skills.jsx`. Tool names must match exactly. The flight uses the existing Three.js dependency, loads only near this section, renders on demand and releases its GPU resources when the enhancement closes. Both themes are supported.

The SVG trail remains the no-WebGL fallback. Short viewports and reduced motion show the ordinary list. Print restores all text to normal flow. Run `node scripts/journey-check.mjs <precompiled-site-directory>` to verify desktop and phone stops, fades, navigation, pin release and motion-preference cleanup.

## Usage

Open `index.html` directly to see the full portfolio. Open `project-editor.html` to add / edit projects via form.

## Adding a project (two paths)

1. **Quick way:** open `project-editor.html`, fill out the form, click *Save*. The project is stored in `localStorage`. Then click *Export JSON* and paste into the `PROJECTS` array at the top of `index.html`.
2. **Direct:** edit the `PROJECTS` array in `index.html`; each project is `{ id, title, description, tags, year, link, featured }`.

## What's intentionally simplified

- No routing; the home page is a single document.
- Lenis + GSAP loaded from CDN.

## Stale elsewhere in these docs

Flagged rather than silently fixed, since they're outside the span work:

- The repo-root `README.md` still describes `uploads/lucy-liu-brand-identity.html` as the master brand document and points at `lucyliu.dev`; the site deploys to `lucyliu.xyz`.
- `DESIGN.md` is out of date in three places: it documents colour-coded skill bento cards that no longer exist, it states "dark-only, there is no light mode" although `.theme-light` shipped, and it gives `--fg3` as `rgba(160,200,255,0.35)` where the live token is `0.65`. Running `/impeccable document` would regenerate it from the current code.
