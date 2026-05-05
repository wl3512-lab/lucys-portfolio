# Lucy Liu — Animation System Guide

Section-by-section plan for the portfolio's scroll, interaction, and transition animations. Built on **GSAP + ScrollTrigger + Lenis**. All snippets are copy-pastable — see `../../reference/original-main.js` for the integrated source.

---

## 0. Foundation — Lenis + GSAP ticker sync

Lenis provides inertia-based smooth scroll; ScrollTrigger has to be driven by its raf so scrubs stay in sync.

```html
<script src="https://unpkg.com/lenis@1.1.14/dist/lenis.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
```

```js
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.15,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 0.85,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

**Always** respect `prefers-reduced-motion`:
```js
if (matchMedia('(prefers-reduced-motion: reduce)').matches) return initFallback();
```

---

## 1. Hero — First Impression

**Plan:**
- Char-level heading cascade with skew distortion (not fade/slide).
- Eyebrow letters wipe up from their own mask.
- Right column (photo → bio → toolkit → actions) enters on a staggered timeline.
- Background grid + orb parallax at different speeds (foreground fastest, orb mid, bg slowest).
- Mouse-parallax on the orb (subtle drift).
- Scroll hint fades as user moves down.
- On scroll, text drifts up and out, photo scales up (depth zoom).

### 1a. Split heading into characters, animate with skew

```js
// Split each .word into individual .char spans
document.querySelectorAll('.word').forEach(w => {
  const chars = [...w.textContent].map(c => {
    const s = document.createElement('span');
    s.textContent = c === ' ' ? '\u00A0' : c;
    s.className = 'char';
    return s;
  });
  w.innerHTML = '';
  chars.forEach(c => w.appendChild(c));
});

const chars = document.querySelectorAll('.char');
gsap.set(chars, { yPercent: 120, skewX: 10, opacity: 0 });

gsap.to(chars, {
  yPercent: 0, skewX: 0, opacity: 1,
  duration: 1.1,
  stagger: { each: 0.022, from: 'start' },
  ease: 'expo.out',
  delay: 0.2,
});
```

### 1b. Layered parallax (3 speeds)

```js
// Background grid — slow
gsap.to('.hero-bg-layer', {
  y: '18%', ease: 'none',
  scrollTrigger: { trigger: '.scene-hero', start: 'top top', end: 'bottom top', scrub: true },
});

// Orb — medium, faster
gsap.to('.hero-orb', {
  y: '-12%', ease: 'none',
  scrollTrigger: { trigger: '.scene-hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
});

// Hero text — fast, fades out
gsap.to('.hero-text', {
  y: -80, opacity: 0, ease: 'none',
  scrollTrigger: { trigger: '.scene-hero', start: 'top top', end: '40% top', scrub: 1.2 },
});

// Photo — depth zoom on scroll
gsap.to('.hero-photo-wrap', {
  scale: 1.08, y: -30, ease: 'none',
  scrollTrigger: { trigger: '.scene-hero', start: 'top top', end: 'bottom top', scrub: 1.5 },
});
```

### 1c. Mouse parallax on orb

```js
let mx = 0, my = 0, ox = 0, oy = 0;
addEventListener('mousemove', e => {
  mx = (e.clientX / innerWidth  - 0.5) * 70;
  my = (e.clientY / innerHeight - 0.5) * 50;
}, { passive: true });

gsap.ticker.add(() => {
  ox += (mx - ox) * 0.04;
  oy += (my - oy) * 0.04;
  gsap.set('.hero-orb', { x: ox, y: oy });
});
```

---

## 2. Scroll Behavior

- Lenis handles smooth/inertia scroll globally.
- Sections use `[data-reveal]` + `[data-stagger]` for one-shot entrances.
- Use **clip-path wipes** — never default fade-ins.

### Stagger grid entrances (skills bento)

```js
const cards = gsap.utils.toArray('[data-skill-card]');
gsap.to(cards, {
  opacity: 1, y: 0, scale: 1,
  duration: 0.75,
  stagger: { each: 0.06, from: 'center' },
  ease: 'back.out(1.5)',
  scrollTrigger: { trigger: '.scene-skills', start: 'top 78%' },
});
```

### Clip-path wipe for project rows (reveals from bottom)

```js
gsap.utils.toArray('.project-row').forEach((row, i) => {
  gsap.fromTo(row,
    { clipPath: 'inset(0 0 100% 0)' },
    {
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.9, ease: 'expo.out',
      delay: i * 0.07,
      scrollTrigger: { trigger: row, start: 'top 90%' },
    }
  );
});
```

### Section title — line-by-line character sweep

```js
document.querySelectorAll('[data-split-reveal]').forEach(el => {
  el.innerHTML = el.textContent.split('').map(ch =>
    ch === ' ' ? '<span style="display:inline-block;width:.28em"></span>'
               : `<span class="ch" style="display:inline-block;clip-path:inset(0 0 100% 0)">${ch}</span>`
  ).join('');

  gsap.to(el.querySelectorAll('.ch'), {
    clipPath: 'inset(0 0 0% 0)',
    duration: 0.7, stagger: 0.022, ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});
```

---

## 3. Interaction Design

### 3a. Custom cursor — dual layer with label

See `Cursor.jsx` in `components/`. Dot uses 0.75 lerp (snappy), ring uses 0.10 lerp (lag). Ring grows + brightens on hoverables; a label slot shows `view ↗` over project cards.

```js
let mx = 0, my = 0, dx = 0, dy = 0, rx = 0, ry = 0;
addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

gsap.ticker.add(() => {
  dx += (mx - dx) * 0.75;  dy += (my - dy) * 0.75;
  rx += (mx - rx) * 0.10;  ry += (my - ry) * 0.10;
  gsap.set('.cursor-dot',  { x: dx, y: dy });
  gsap.set('.cursor-ring', { x: rx, y: ry });
});

document.querySelectorAll('a, button, [role=button]').forEach(el => {
  el.addEventListener('mouseenter', () => document.querySelector('.cursor').classList.add('is-hovering'));
  el.addEventListener('mouseleave', () => document.querySelector('.cursor').classList.remove('is-hovering'));
});
```

### 3b. Magnetic hover — buttons pull toward cursor

```js
document.querySelectorAll('.btn, .nav-logo, .contact-email').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    gsap.to(el, {
      x: (e.clientX - (r.left + r.width/2))  * 0.32,
      y: (e.clientY - (r.top  + r.height/2)) * 0.32,
      duration: 0.4, ease: 'power2.out',
    });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
  });
});
```

### 3c. Velocity-reactive marquee

```js
const track = document.querySelector('.marquee-track');
let velocity = 0, lastY = scrollY;
gsap.ticker.add(() => {
  velocity += (Math.abs(scrollY - lastY) - velocity) * 0.08;
  lastY = scrollY;
  track.style.animationDuration = Math.max(5, 22 - velocity * 0.4) + 's';
});
```

---

## 4. Transitions

- **Clip-path reveals** on project rows (above).
- **Letter-spacing expansion** on scroll for emphasis words (see contact).
- **Mask transitions** between sections: pin a `.scene` and animate a `.project-mask` overlay.
- **Image zoom-ins on scroll** (see hero photo above).

### Contact — letter-spacing stretch on scroll

```js
gsap.fromTo('.contact-accent',
  { letterSpacing: '-0.04em' },
  {
    letterSpacing: '0.06em', ease: 'none',
    scrollTrigger: { trigger: '.scene-contact', start: 'top 60%', end: 'center center', scrub: 2 },
  }
);
```

---

## 5. Motion Principles (cheat sheet)

| Use for                          | Ease                            |
|----------------------------------|---------------------------------|
| Entrances, exits                 | `expo.out` = `cubic-bezier(.16,1,.3,1)` |
| Snappy bounce (skills, tags)     | `back.out(1.5)` or `back.out(2)` |
| Magnetic snap-back               | `elastic.out(1, 0.5)`           |
| Scrubs (parallax, scroll-bound)  | `none`                          |
| Hover returns                    | `power2.out`                    |

- **Every animation earns its presence.** No generic fade-ins.
- **Never below 200ms.** Never above 1400ms for single motions.
- **Respect reduced motion.** Fallback to instant show.

---

## 6. Performance notes

- Add `will-change: transform` on things that parallax continuously (hero-bg-layer, orb).
- Debounce nothing — let `gsap.ticker` drive everything.
- Don't animate `box-shadow` or `width`/`height` — use `transform` and `opacity` only.
- `ScrollTrigger.refresh()` after dynamic content insertion.
