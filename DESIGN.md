---
name: Lucy Liu Design System
description: Editorial-atmospheric portfolio for Lucy Liu — Design Strategist, NYU IMA
colors:
  void: "#050710"
  navy: "#0A0F2A"
  navy-mid: "#141930"
  navy-light: "#1E2640"
  cloud: "#F6FAFF"
  mist: "#E2EEFF"
  blue-100: "#EBF3FF"
  blue-200: "#C8DEFF"
  atmospheric-blue: "#A0C8FF"
  signal-blue: "#72ADFF"
  deep-signal-blue: "#4A8FEF"
  nebula-lavender: "#C4B0FF"
  lavender-light: "#E8E0FF"
typography:
  display:
    fontFamily: "'Playfair Display', Georgia, serif"
    fontSize: "clamp(72px, 13vw, 150px)"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "0"
  headline:
    fontFamily: "'Syne', system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 40px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "'Syne', system-ui, sans-serif"
    fontSize: "clamp(20px, 2.5vw, 26px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0"
  body:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0"
  label:
    fontFamily: "'Space Mono', 'JetBrains Mono', monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.14em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "20px"
  2xl: "24px"
  full: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
  section: "clamp(80px, 12vw, 140px)"
  gutter: "clamp(20px, 5vw, 48px)"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.void}"
    rounded: "{rounded.sm}"
    padding: "11px 22px"
  button-primary-hover:
    backgroundColor: "{colors.atmospheric-blue}"
    textColor: "{colors.void}"
    rounded: "{rounded.sm}"
    padding: "11px 22px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.cloud}"
    rounded: "{rounded.sm}"
    padding: "10px 22px"
  button-secondary-hover:
    backgroundColor: "#FFFFFF0A"
    textColor: "{colors.cloud}"
    rounded: "{rounded.sm}"
    padding: "10px 22px"
  tag:
    backgroundColor: "{colors.navy-mid}"
    textColor: "#EBF3FF8C"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  tag-accent:
    backgroundColor: "#72ADFF1A"
    textColor: "{colors.atmospheric-blue}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
---

# Design System: Lucy Liu

## 1. Overview

**Creative North Star: "The Lit Archive"**

A personal body of work that glows from within. Not a gallery with overhead lights and white walls — a deep-space archive where each piece is lit by its own aura, the glow emanating from behind the content rather than from above it. The environment itself argues for Lucy's sensibility: the void background is the default reality; every surface exists as a departure from it.

The system is editorial and atmospheric in equal measure. Editorial precision governs the typography — a deliberate mix of Playfair's serif intelligence, Syne's geometric weight, and Space Mono's technical rigor. Atmospheric depth governs the environment — deep-space void backgrounds, aura-blue radial halos, fine grid lines visible only at the center, SVG grain barely perceptible under content. The result is a space that feels occupied, not rendered.

This is a brand-register system: the design IS the portfolio. Every decision — the choice to use gradient light on one word per screen, the frosted nav that appears on scroll, the project row that expands with cursor pressure — communicates methodology without stating it. The work is the evidence; the surface is the argument.

**This system explicitly rejects:**
- Generic dark Webflow templates: Neue Haas Unica, full-caps headlines, neon accent, a grid of uniform portfolio cards. That communicates "studio," not "person."
- SaaS landing-page patterns: feature-bullet sections, hero-metric cards, purple-to-blue gradient heroes, free-trial CTAs. Nothing here is for sale.

**Key Characteristics:**
- Dark-only. Full-bleed void (`#050710`) as the default environment, always.
- Glow over shadow. No drop shadows on any surface. Depth is aura radial gradients behind content.
- One atmospheric light per screen. The aura gradient fires on one italic word per screen; nowhere else.
- Frosted restraint. Components have minimal material presence at rest, emerge fully on interaction.
- Motion as proof. GSAP-orchestrated entrances and scroll effects confirm structure; they do not decorate.
- Type as system. Four typefaces in precise, non-interchangeable roles.

## 2. Colors: The Atmospheric Palette

A deep-space palette: void black foundations, navy surfaces elevated above them, and two atmospheric lights — blue and lavender — that exist in the environment rather than on surfaces.

### Primary
- **Signal Blue** (`#72ADFF`): The primary accent. Buttons, focus rings, active nav links, cursor dot, hover-state color shifts on project titles and arrows. The one deliberate note of light on an otherwise atmospheric surface. Used at full opacity for interactive affordances.
- **Atmospheric Blue** (`#A0C8FF`): Lighter variant of Signal Blue. Button hover state, gradient start point of the Atmospheric Light, border colors at low alpha (`rgba(160,200,255,0.10)` for hairlines, `rgba(160,200,255,0.20)` for structural borders), cursor ring.

### Secondary
- **Nebula Lavender** (`#C4B0FF`): Gradient midpoint of the Atmospheric Light. Appears in the aura gradient alongside Atmospheric Blue. Also used as the skill-card foreground for motion-category cards.

### Neutral
- **Void** (`#050710`): The default environment. Every screen, every background. The deepest layer. Never replaced with white.
- **Navy** (`#0A0F2A`): Elevated surfaces, the marquee strip background, frosted nav background base.
- **Navy Mid** (`#141930`): Cards, tags, skill card backgrounds. Second tier above the void.
- **Navy Light** (`#1E2640`): Hover surfaces, the third tier.
- **Cloud White** (`#F6FAFF`): Primary text. The near-white that reads as intentional, not default.
- **Mist** (`#E2EEFF`): Light surface accents, rarely used as a direct color.
- **Secondary Text** (`rgba(235,243,255,0.55)`): Body copy, subtitles, most paragraphs.
- **Tertiary Text** (`rgba(160,200,255,0.35)`): Eyebrow labels, monospace meta, decorative indicators. Never used for body-weight reading text per WCAG AA.

### Named Rules
**The One Flame Rule.** The Atmospheric Light gradient (`linear-gradient(135deg, #A0C8FF, #C4B0FF 55%, #8EC4FF)`) applied via `-webkit-background-clip: text` fires on exactly one italic Playfair word per screen — the word that carries the whole sentence's meaning. Not one per component, not one per section. Per screen. If the aura fires twice in viewport, it means nothing.

**The No-White Rule.** `#ffffff` and `#000000` are prohibited. Cloud White (`#F6FAFF`) is the near-white. Void (`#050710`) is the near-black. Tinting toward the brand hue is non-negotiable.

**The Contrast Floor.** Secondary text at `rgba(235,243,255,0.55)` on Void clears WCAG AA (4.5:1). Tertiary text at `rgba(160,200,255,0.35)` does not. Tertiary is eyebrow and decorative meta only; never assigned to body-weight reading text.

## 3. Typography: The Editorial Stack

**Display Font:** Playfair Display (Georgia, serif fallback) — editorial headlines, hero, section titles, italic aura accents
**UI Font:** Syne (system-ui, sans-serif fallback) — wordmark, nav, buttons, labels, section headings
**Body Font:** DM Sans (system-ui, sans-serif fallback) — paragraphs, bio, case study prose
**Mono Font:** Space Mono / JetBrains Mono (Courier New fallback) — eyebrow labels, project indices, tags, technical meta

**Character:** A pairing of tension and clarity. Playfair Display brings editorial authority and the italic moment that is the system's signature. Syne provides geometric weight without coldness, functioning as both UI label and wordmark. DM Sans handles the reading-weight work: light but not frail, legible in dark contexts. Space Mono introduces technical precision — the voice of someone who codes, who counts, who measures.

### Hierarchy
- **Display** (700 weight, `clamp(72px, 13vw, 150px)`, line-height 0.92): Hero names and section heroes. Extremely tight leading. Only Playfair Display. Uppercase initial, not all-caps.
- **Headline** (700 weight, `clamp(28px, 4vw, 40px)`, line-height 1.2): Section titles ("selected work", "about", contact headings). Playfair Display.
- **Title** (600 weight, `clamp(20px, 2.5vw, 26px)`, line-height 1.2): Tertiary section leaders, nav links at mobile breakpoint. Syne.
- **Body Large** (300 weight, 18px, line-height 1.7): Introductory paragraphs, hero sub-copy. DM Sans. Maximum line length 65ch.
- **Body** (400 weight, 16px, line-height 1.7): Standard paragraphs, about bio, project descriptions. DM Sans. Maximum line length 65ch.
- **Label / Eyebrow** (400 weight, 12px, letter-spacing 0.14em, uppercase): Section labels, project indices, tag text, meta. Space Mono. Always uppercase with 0.14em tracking.

### Named Rules
**The Four-Voice Rule.** Each typeface has one role and does not migrate. Playfair Display for editorial display and italic accents; Syne for UI surface and wordmark; DM Sans for reading-weight body; Space Mono for monospace labels. Mixing them into each other's roles breaks the hierarchy.

**The Lowercase Rule.** The wordmark (`lucy liu`) and all short nav labels (`work`, `about`, `contact ↗`) are lowercase. This is a design decision, not a mistake. UPPERCASE + 0.14em tracking is reserved for Space Mono eyebrows and tags.

**The Italic Constraint.** Italic type is meaningful, not decorative. Italic Playfair without the aura gradient appears in body copy for emphasis. Italic Playfair WITH the aura gradient is The One Flame Rule (see Colors). Italic DM Sans appears only in body prose for quotation or citation.

## 4. Elevation

This system uses glow over shadow. No `box-shadow` on any card, container, or floating element. Depth is created entirely through:

1. **Aura orbs** — large CSS radial gradients (500–800px) behind hero and about sections at `rgba(160,200,255,0.18)` to `rgba(196,176,255,0.10)`, creating perceived light sources in the void.
2. **Tonal layering** — the background stack (Void → Navy → Navy Mid → Navy Light) provides four distinct elevation tiers. Each tier is its own surface; the difference reads as depth.
3. **Frosted glass** — `rgba(255,255,255,0.04)` fill + `backdrop-filter: blur(8–16px)` + 1px `rgba(160,200,255,0.10–0.20)` border. Used for nav (scrolled state), cards, and inputs.
4. **Border at low alpha** — hairline at `rgba(160,200,255,0.10)` for structural dividers; strong at `rgba(160,200,255,0.20)` for cards, inputs, active components.

### Named Rules
**The No-Shadow Rule.** `box-shadow` is prohibited on all surfaces. If you're reaching for it, the alternative is always: a tonal background step, an aura radial behind the element, or a 1px border at low alpha.

**The Frosted-Nav Exception.** Navigation uses `backdrop-filter: blur(16px)` and `rgba(5,7,16,0.85)` background only after 40px of scroll. At rest, the nav is transparent. This is a purposeful material moment — earned by the scroll, not present by default.

## 5. Components

### Buttons

Frosted restraint. Minimal material presence at rest; state changes are deliberate and fast.

- **Shape:** Gently squared corners (4px radius — `{rounded.sm}`)
- **Primary:** Signal Blue (`#72ADFF`) background, Void (`#050710`) text, 11px 22px padding, Syne 700 14px. Hover: lightens to Atmospheric Blue (`#A0C8FF`). Press: `scale(0.97)`.
- **Secondary:** Transparent background, Cloud White text, 1px border at `rgba(160,200,255,0.20)`. Hover: border shifts to Cloud White, background gets `rgba(255,255,255,0.04)` fill.
- **Ghost:** No background, no border. Secondary-text color `rgba(235,243,255,0.55)`. Hover: lifts to Cloud White. Used for nav-style inline actions.
- **Focus (all):** 2px solid Signal Blue (`#72ADFF`) at 4px offset. Never removed; never replaced with outline: none.
- **Magnetic behavior:** Primary and Ghost contact buttons pull 32% toward cursor and snap back via `cubic-bezier(0.34,1.56,0.64,1)` on release.

### Tags / Chips

Read-only labels. Two variants:

- **Default:** Navy Mid (`#141930`) background, Secondary Text (`rgba(235,243,255,0.55)`), 0.5px border at `rgba(160,200,255,0.10)`, Space Mono 11px, 4px 10px padding, radius `{rounded.sm}`. Used for project discipline labels.
- **Accent:** `rgba(114,173,255,0.10)` background, Atmospheric Blue (`#A0C8FF`) text, border at `rgba(160,200,255,0.25)`. Used to highlight the primary skill or featured attribute.

Tags are never interactive (no hover states). If a chip filters content, add a visible selected state: border shifts to Signal Blue.

### Navigation

Fixed top bar, 64px height. Transparent on hero; gains frosted glass on scroll.

- **At rest:** Transparent background, Cloud White wordmark, Secondary Text links.
- **Scrolled (`>40px`):** `rgba(5,7,16,0.85)` background, `backdrop-filter: blur(16px)`, 1px bottom border at `rgba(160,200,255,0.10)`. 300ms transition.
- **Wordmark:** Syne 700 14px, lowercase `lucy liu`, 0.02em tracking. Hover: color → Signal Blue.
- **Links:** Syne 400 14px, lowercase. Default: Secondary Text. Hover: Cloud White. Active: Signal Blue.
- **Mobile:** Hamburger built from two `<span>` rules — 22px wide, 1px height, Cloud White. Full-screen overlay at Void background, links at Title scale.

### Cards / Containers

The system avoids cards as a default. When a bounded container is genuinely the right affordance:

- **Skill Bento Cards:** Radius `{rounded.lg}` (12px), 1px border at `rgba(160,200,255,0.10)`, category-specific dark backgrounds (not uniform Navy), no shadows. Hover: `translateY(-4px) scale(1.01)`. Each category has its own tinted background and accent: design (amber), code (accent blue), motion (violet), physical (orange), AI (sky blue).
- **Profile Photo:** 50% radius (circle), `object-fit: cover`, 1px border at `rgba(160,200,255,0.20)`. Hover: `scale(1.04)`, border shifts to Signal Blue. No shadow.

Nested cards are prohibited.

### Project Row (Signature Component)

The primary content pattern for the work section. Not a card grid — a list with editorial behavior.

- **Structure:** Full-width horizontal divider (0.5px at `rgba(160,200,255,0.10)`), 2-column grid (left: index + title + tags; right: description + arrow).
- **Hover:** Vertical padding expands from 40px to 48px (slow 500ms expo-out). Project title shifts `translateX(8px)` and color → Signal Blue. Arrow translates `(4px, -4px)` and color → Signal Blue. An accent-colored `mix-blend-mode: overlay` mask slides in from the left at 8% opacity.
- **Typography:** Index in Space Mono tertiary; title in Playfair Display headline; description in DM Sans body at max 38ch.

No thumbnails, no images in the list. The title and the hover behavior are the preview.

### Custom Cursor (Signature Component)

Dual-layer: a 6px solid dot (Signal Blue, lerp 0.75) and a 36px ring (Atmospheric Blue border at 35% alpha, lerp 0.10). On hover over interactive elements: ring expands to 56px, border brightens to 65% alpha, dot scales to zero. A text label (`view ↗`) appears inside the ring over project rows.

Requires JavaScript (GSAP or `requestAnimationFrame` lerp loop). Must be hidden on touch devices.

### Scroll Progress Bar (Signature Component)

2px fixed bar at the very top edge of the viewport, above the nav. Background: the Atmospheric Light gradient. Width animated via `scrollY / scrollHeight`. z-index: 200. No border-radius.

## 6. Do's and Don'ts

### Do:
- **Do** use `#050710` (Void) as the default background on every screen, page, and component. There is no light mode.
- **Do** use Signal Blue (`#72ADFF`) as the sole interactive accent. One accent, used deliberately.
- **Do** apply the Atmospheric Light gradient (`background-clip: text`) to exactly one italic Playfair word per screen. Stop there.
- **Do** use `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) as the standard easing curve for all state transitions. `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring) for snap-back and entrance personality.
- **Do** use the four-voice type system as specified. Playfair Display for editorial display; Syne for UI; DM Sans for body; Space Mono for mono labels.
- **Do** keep all navigation and short UI labels lowercase (`work`, `about`, `contact ↗`). It is intentional.
- **Do** use glyph arrows (`↓ ↗ →`) as the icon system. They are typographic, not decorative.
- **Do** provide 2px solid Signal Blue focus rings at 4px offset on every interactive element. Never suppress them.
- **Do** include `prefers-reduced-motion` fallbacks for all GSAP entrances and scroll-triggered animations.
- **Do** use Space Mono uppercase + 0.14em tracking for all eyebrow labels and section meta.

### Don't:
- **Don't** do generic dark Webflow. No Neue Haas Unica, no UPPERCASE headline stack, no neon accent, no uniform grid of portfolio cards. That aesthetic communicates "studio," not "person."
- **Don't** do SaaS landing-page patterns. No feature-bullet sections, no hero-metric cards ("4 years experience, 12 projects, 3 awards"), no purple-to-blue gradient heroes. Nothing here is for sale.
- **Don't** add `box-shadow` to any card or container. The system uses glow and tonal layering. If you're reaching for a shadow, use a tonal background step instead.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe. Full borders, background tints, or nothing.
- **Don't** fire the Atmospheric Light gradient twice in the same viewport. Once per screen. Its rarity is the argument.
- **Don't** mix typeface roles. Syne does not appear in body copy. Playfair Display does not appear in buttons or nav. Space Mono is not a display font.
- **Don't** introduce a light mode. The dark atmospheric palette is the system. There is no surface without the void.
- **Don't** use glassmorphism decoratively. `backdrop-filter: blur` appears only on the scrolled nav and only after 40px of scroll. Blurring everything is not atmosphere.
- **Don't** use emoji. Use unicode arrows (`↓ ↗ →`), bullet dots (`·`), or Space Mono labels.
- **Don't** animate CSS layout properties. Animate `transform` and `opacity`; never `width`, `height`, `padding`, or `margin` (except the project-row padding-block, which is deliberate and uses `will-change: padding`).
- **Don't** use `#000000` or `#ffffff`. Cloud White (`#F6FAFF`) and Void (`#050710`) are the extremes.
