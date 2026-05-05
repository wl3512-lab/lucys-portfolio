# Product

## Register

brand

## Users

Potential employers, design directors, creative collaborators, and fellow students or researchers evaluating Lucy's work. They arrive via cold email, a LinkedIn link, or a conference referral. They're viewing on desktop, often mid-search, deciding in the first 30 seconds whether to read further and reach out.

Secondary audience: Lucy herself, as author and curator of her own narrative.

## Product Purpose

Personal portfolio for Lucy Liu, a Design Strategist and NYU Interactive Media Arts student based in New York City (from Vancouver). The site showcases interaction design, accessibility-focused work, and creative coding projects.

Success looks like: a visitor leaves with a clear sense of Lucy's aesthetic sensibility, design methodology, and range of work, then contacts her. The site should feel like encountering a person with a precise point of view, not a gallery of deliverables.

## Brand Personality

Sharp, warm, experimental. Never pretentious.

Voice: confident but curious. First-person owned ("I'm Lucy Liu", "I study", "I put emphasis on"). Direct without being authoritative. Specificity over adjectives ("accessibility audits and co-design" beats "human-centered solutions").

Emotional goal: editorial intelligence. The visitor should feel they've stumbled into something with a genuine aesthetic argument, not a template.

Content rules from the brand doc:
- All lowercase for wordmark, nav, short UI labels
- Sentence case for headlines, body, CTAs
- UPPERCASE + 0.14em tracking for eyebrow labels, tags, monospace meta
- Em dashes used in editorial copy for rhythm ("Design Strategist from Vancouver — now based in New York City")
- Directional arrows as typography: `↓` `↗` `→` (carry meaning, never decorative)
- No exclamation marks
- No emoji (substituted by unicode arrows, bullet dots `·`, single ornamental sparkle `✦` for favicon only)

## Anti-references

**Generic dark Webflow**: Agency-template dark mode with Neue Haas Unica, UPPERCASE headlines, neon accent, and a grid of portfolio cards. The aesthetic communicates "studio" not "person."

**SaaS landing page**: Feature-bullet sections, hero-metric cards, purple-to-blue gradient heroes, free-trial CTAs. Design in service of conversion. Nothing here is for sale.

## Design Principles

**Access is not an afterthought.** Accessibility is baked into every component decision. The portfolio advocates for inclusive design; it should practice what it preaches. WCAG 2.1 AA minimum throughout.

**Atmosphere before attention.** The environment communicates taste before any copy does. The void background, aura glows, and editorial typography do the work of establishing sensibility. Don't explain the aesthetic; embody it.

**Restraint earns the accent.** The aura gradient on a single italic word per screen works precisely because everything else is quiet. Repetition kills it. One emphasis per surface.

**Specificity over claims.** Show methodology and outcomes, not labels. "Co-design with switch-nav users" beats "accessibility expert." The work is evidence; the copy is direction.

**Motion has a job.** Every entrance, scroll effect, and hover confirms structure or rewards agency. No animation for animation's sake. The cursor, the magnetic pull, the wipe reveal: all of it should feel earned.

## Accessibility & Inclusion

Target: WCAG 2.1 AA.

Known considerations:
- Dark atmospheric palette requires careful contrast auditing; secondary text (`--fg2`, rgba 55% white on void) and tertiary labels (`--fg3`, rgba 35%) need measured checking against WCAG minimum ratios
- `--fg3` is used only for eyebrow labels and decorative meta, not body-weight text
- Custom cursor and magnetic hover interactions must have keyboard-equivalent affordances
- GSAP animations must respect `prefers-reduced-motion`; all motion-driven reveals need fallback states
- Focus rings: 2px solid `--blue-400` at 4px offset throughout
