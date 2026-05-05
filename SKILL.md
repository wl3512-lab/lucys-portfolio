HabitaBull---
name: lucy-liu-design
description: Use this skill to generate well-branded interfaces and assets for Lucy Liu's personal portfolio — a Design Strategist / NYU IMA student focused on human-centered, accessible interaction design. Use for production portfolio code OR throwaway mocks/prototypes/case-study pages. Contains palette (deep-space void + aura blue/lavender gradients), typography (Playfair Display editorial + Syne UI + DM Sans body + Space Mono meta), the GSAP + Lenis animation system, and a full portfolio UI kit.
user-invocable: true
---

Read the `README.md` file within this skill first — it covers the content voice, visual foundations, iconography approach, and file index.

Then explore:
- `colors_and_type.css` — all tokens + semantic type classes. Always link this first.
- `reference/brand-identity.html` — full master brand doc (editorial reference).
- `reference/original-*` — the live portfolio codebase (HTML/CSS/JS) to lift patterns from.
- `ui_kits/portfolio/` — pixel-accurate recreation, componentized. `index.html` is the full interactive mock; `animation-guide.md` has GSAP ScrollTrigger recipes; `project-editor.html` is the form-based project add/edit tool.
- `assets/` — headshot + tool-logo PNGs.

**When creating visual artifacts** (slides, mocks, throwaway prototypes, case studies, etc.):
- Copy assets out of this skill folder into your working directory and create static HTML files.
- Always use `var(--void)` as the default background. Never white.
- Reach for Playfair Display italic with the aura gradient for ONE emphasized word per screen — never more.
- Use Space Mono + uppercase + 0.14em tracking for eyebrow labels and meta.
- Keep the lowercase wordmark (`lucy liu`) and short nav intact (`work`, `about`, `contact ↗`).
- No emoji. Use unicode arrows (`↗ ↓ →`) instead.
- No drop shadows — depth comes from aura glows, borders, and backdrop blur.

**When working on production code:**
- Read `reference/original-*.css` for exact rules. Copy patterns; don't reinvent.
- GSAP + Lenis is the motion platform. See `ui_kits/portfolio/animation-guide.md` for recipes.
- Follow the voice & tone in README: lowercase, em dashes, no exclamation marks, first person, specificity over buzzwords.

**If invoked without guidance:** ask the user what they want to build (a new case study page, a resume, a deck about a specific project, a blog post, a 404, etc.), ask 2–3 focused questions about content + length, then act as an expert designer who outputs either an HTML artifact or production-ready code depending on the need.
