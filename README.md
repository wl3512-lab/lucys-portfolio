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

## Capabilities: the span

"What I do" is a span, not a card grid: five capabilities plotted along one axis running from `upstream` to `on stage`, with nodes alternating above and below the rule. The order is the content, because the width of the range is the argument the section exists to make.

It replaced a seven-tile bento that carried 17 sentences (~108 words, around 32 seconds of reading) in a section a visitor gives a few seconds. Four of those tiles were cuts at one discipline, two were hard to tell apart, and the per-tile meta labels (`craft`, `dev`, `play`, `rigor`, `framing`) carried no information. Now each node is a label, one line, and its tools.

Editing it: the `SPAN` array at the top of `components/Skills.jsx`. Tool names must match `TOOLS[].name` exactly. Keep the lines to roughly a dozen words; the layout gives each node about 30ch and the whole point is that it stays scannable.

Colour is deliberately restrained here. The signal-blue accent fires on one marker at a time, on hover, and nowhere else, so the section stays quieter than the work above it.

Responsive and fallbacks: below 900px the axis rotates vertical and the nodes stack, with nothing depending on hover. The entrance (the axis sweeping out and depositing each node) is skipped under `prefers-reduced-motion` and on touch, where the span is simply drawn. Nothing is hidden at rest, so print, reader mode and a failed script all show the full section.

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
