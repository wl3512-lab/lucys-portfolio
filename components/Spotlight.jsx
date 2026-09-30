/* global React, THREE, LaserFlow, AsciiText */
/*
  Spotlight — Lucy Liu's "standout work" section.
  Combines a ScrollStack (adapted from React Bits) with LaserFlow + ASCIIText.

  ScrollStack adaptation notes:
   - Upstream spins up its OWN Lenis instance. This site already runs ONE global
     Lenis (window.__lenis); a second would fight it. So this drives card transforms
     off window scroll (and the global Lenis 'scroll' event when present) instead.
   - Card baseline offsets are measured ONCE (transforms cleared first) and cached,
     so the per-frame transform never feeds back into the measurement.
   - Honors prefers-reduced-motion / `.reduce-motion`: no pinning, cards render as a
     plain editorial list.
   - box-shadow / 40px radius from upstream dropped for the Lit Archive system.

  The deal-out (the seam into Capabilities):
   - Once the deck is complete the pin holds for one more runway (`.spotlight-deal`) and
     the cards peel off the front of the deck in sequence, each flung to its own outward
     vector. The Capabilities bento then assembles from those same vectors, so the two
     sections read as one gesture instead of two stacked blocks.
   - The fling is folded into update() rather than handed to GSAP because this loop
     already owns `.spotlight-card` transforms; two writers would fight over the
     same inline style.
   - `dealDir` is the shared direction table, exposed on window. The Capabilities
     entrance in index.html feeds it the same order index to get the same side/tier, so a
     card that exits upper-left is answered by a tile arriving from upper-left. Change
     this and that tween moves with it.
*/

// Shared with Skills.jsx: order 0 is the front of the deck (first to leave, first tile
// to land). Alternating sides, widening by tier, so the deck fans rather than scatters.
function dealDir(order) {
  const side = order % 2 === 0 ? -1 : 1;
  const tier = Math.floor(order / 2);
  return { side: side, tier: tier };
}
window.dealDir = dealDir;

function spReducedMotion() {
  try {
    return (
      document.documentElement.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch (e) {
    return false;
  }
}

function Spotlight(props) {
  const projects = (props && props.projects) || [];
  const onOpen = props && props.onOpen;
  const { useEffect, useRef, useMemo } = React;

  // Single work section (Selected Work removed): show all projects, spotlight/featured first.
  const standout = useMemo(
    function () {
      const rank = function (p) { return p.spotlight ? 0 : (p.featured ? 1 : 2); };
      return projects.slice().sort(function (a, b) { return rank(a) - rank(b); });
    },
    [projects]
  );

  const stackRef = useRef(null);

  // WebGL effects (LaserFlow + ASCIIText) are desktop-only: they're GPU-heavy and the
  // primary audience views on desktop. Mobile gets the text heading + plain card list.
  const sectionRef = useRef(null);
  // Defer the two WebGL contexts (LaserFlow backdrop + ASCIIText heading) until the
  // section nears the viewport, so boot only spins up the hero backdrop. rootMargin
  // mounts them ~well before visible, so the plain-heading -> ascii swap happens offscreen.
  // The laser is released again when the section is far away (frees its context); the ASCII
  // heading is kept, because swapping it back to the plain heading would change the layout
  // above every pin further down the page.
  const nearView = typeof useInView === 'function' ? useInView(sectionRef, '60% 0px') : true;
  const headingNear = typeof useInView === 'function' ? useInView(sectionRef, '60% 0px', { keep: true }) : true;
  const heavyOk =
    typeof window !== 'undefined' &&
    window.innerWidth > 760 && !window.matchMedia('(pointer: coarse)').matches &&
    typeof THREE !== 'undefined' &&
    window.__webglOK !== false;
  const showLaser = heavyOk && nearView && typeof LaserFlow !== 'undefined';
  const showAscii = heavyOk && headingNear && typeof AsciiText !== 'undefined';

  // A touch screen has no hover: the card nearest the reading line receives the
  // same emphasis as a pointer hover. Scrolling never activates a link.
  useEffect(function () {
    const media = window.matchMedia('(max-width: 760px), (pointer: coarse)');
    if (!media.matches || !stackRef.current) return;
    const cards = Array.from(stackRef.current.querySelectorAll('.spotlight-card'));
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.48;
      let nearest = null, distance = Infinity;
      cards.forEach(card => {
        const box = card.getBoundingClientRect();
        const delta = Math.abs(box.top + box.height / 2 - line);
        if (box.bottom > 0 && box.top < innerHeight && delta < distance) {
          nearest = card; distance = delta;
        }
      });
      cards.forEach(card => card.classList.toggle('is-scroll-active', card === nearest));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(schedule);
    cards.forEach(card => observer.observe(card));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cards.forEach(card => card.classList.remove('is-scroll-active'));
    };
  }, [standout]);

  useEffect(function () {
    const scroller = stackRef.current;
    if (!scroller) return;
    if (spReducedMotion()) return; // plain list, no pinning
    // Phones get the plain list too: per-scroll-frame pinning math fights touch
    // scrolling (the "glitchy" feel) and the stack needs a tall viewport anyway.
    if (window.matchMedia('(max-width: 760px), (pointer: coarse)').matches) return;

    const cards = Array.prototype.slice.call(scroller.querySelectorAll('.spotlight-card'));
    const endEl = scroller.querySelector('.scroll-stack-end');
    if (!cards.length || !endEl) return;
    const sectionEl = scroller.closest('.spotlight');
    // Past every early return, so this class means "the deal is actually running". The
    // seam-collapse rules in styles.css hang off it: they pull Capabilities up so the
    // grid tops the fold exactly as the deck empties, and they must never apply on the
    // mobile / reduced-motion paths, which bail above and keep their normal spacing.
    document.documentElement.classList.add('deal-live');
    // Scroll runway for the deal-out. Absent (or zero-height, as on the mobile/reduced
    // paths) just means no deal: the cards freeze at pinEnd exactly as before.
    const dealEl = sectionEl && sectionEl.querySelector('.spotlight-deal');

    // Tuning
    // Stack offset tightens on short viewports: the card floors at 300px, so on a
    // ~600px window the deck (offsets + card) cannot fit above the centre line and
    // the front card stays stranded low. A smaller offset shortens the deck enough
    // for the lift below to actually apply.
    const itemStackDistance = window.innerHeight < 720 ? 13 : 26;
    const itemScale = 0.022;
    const baseScale = 0.9;
    const scaleEndPct = 12;

    // ---- deal-out tuning ----
    // Only the first DEAL_USE of the runway actually deals; the rest is tail, so the
    // cards are gone before `.spotlight`'s overflow:hidden clips them at the section
    // edge. Each card's fling runs over DEAL_SPAN of total progress, and the fronts
    // leave DEAL_LEAD apart, so the peel overlaps instead of queueing.
    const DEAL_USE = 0.86;
    // 0.55 rather than 0.42: at the shorter window each card crossed the frame in ~190px
    // of scroll, too fast to read as a throw. The lead is set so the last card (order 5)
    // still finishes inside the window: 5 * 0.085 + 0.55 = 0.975.
    const DEAL_SPAN = 0.55;
    const DEAL_LEAD = 0.085;

    /* Where the deck parks vertically.
       This used to be a flat 22% of viewport height. That reads fine on a tall
       window, but the card has a 300px floor (clamp(300px, 44vh, 400px)), so on a
       short window one card is already over half the viewport: 22% + card height +
       the per-card stack offsets pushed the whole deck into the bottom third
       (measured centres at 66% to 85% on a 577px viewport).
       Instead, centre the deck: measure its real height and split the leftover
       space. On a tall window this lands near 24%, so the original look is
       preserved; on a short one it lifts the deck back to the middle. */
    let cardH = 0;
    function stackTopPx(ch) {
      const h = cardH || 0.44 * ch;
      // Centre the FRONT card, not the deck. Cards stack downward at
      // itemStackDistance each, so the last one (the card actually being read) sits
      // itemStackDistance * (n - 1) below the deck top. Centring the deck therefore
      // still left the readable card low: its centre landed near 58% of the
      // viewport. Subtracting the stack offset puts that card on the centre line
      // and lets the earlier cards peek above it, which is the intended look.
      const frontOffset = itemStackDistance * (cards.length - 1);
      // The cards render scaled (baseScale + i * itemScale) about their top edge, and
      // the section's own rhythm adds a further constant offset, so the analytic
      // centre is about 92px low in practice. Measured across 600/800/1000px
      // viewports the correction was near-constant (92 to 97px) rather than
      // proportional, so it is applied as a flat lift rather than a ratio.
      const renderLift = 92;
      return Math.max(0.04 * ch, (ch - h) / 2 - frontOffset - renderLift);
    }

    cards.forEach(function (card) {
      card.style.willChange = 'transform';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
    });

    let baseTops = [];
    let endTop = 0;
    let dealRunway = 0;
    let lastDeal = -1;
    const lastTf = [];

    function measure() {
      cards.forEach(function (c) { c.style.transform = ''; c.style.opacity = ''; });
      endEl.style.transform = '';
      // force reflow before reading
      void scroller.offsetHeight;
      baseTops = cards.map(function (c) {
        return c.getBoundingClientRect().top + window.scrollY;
      });
      // read height here, while transforms are cleared, so scale() cannot skew it
      cardH = cards[0] ? cards[0].getBoundingClientRect().height : 0;
      endTop = endEl.getBoundingClientRect().top + window.scrollY;
      // Read the runway from the DOM rather than hardcoding a vh figure, so the scroll
      // distance the deal consumes and the space it occupies can never disagree.
      dealRunway = dealEl ? dealEl.getBoundingClientRect().height : 0;
      lastDeal = -1;
      // Clearing transforms above invalidates the per-card cache: drop it so the
      // next update() re-applies every card (otherwise unchanged cards stay blank).
      lastTf.length = 0;
    }

    function clamp01(st, a, b) {
      if (st < a) return 0;
      if (st > b) return 1;
      return (st - a) / (b - a);
    }

    function update() {
      const scrollTop = window.scrollY;
      const ch = window.innerHeight;
      const stackPx = stackTopPx(ch);
      const endPx = (scaleEndPct / 100) * ch;
      const pinEnd = endTop - ch / 2;

      // Deck-complete -> dealt. 0 while the deck is still assembling, 1 once every card
      // has been flung. Published as --deal so the seam hairline can track it in CSS.
      const dealSpan = dealRunway * DEAL_USE;
      const deal = dealSpan > 0 ? clamp01(scrollTop, pinEnd, pinEnd + dealSpan) : 0;
      // Where the deck is actually released. With no runway this is pinEnd, i.e. exactly
      // the previous behaviour.
      const pinHold = pinEnd + dealSpan;
      if (sectionEl) {
        const d = Math.round(deal * 1000) / 1000;
        if (d !== lastDeal) {
          sectionEl.style.setProperty('--deal', String(d));
          sectionEl.classList.toggle('is-dealing', d > 0 && d < 1);
          lastDeal = d;
        }
      }

      for (let i = 0; i < cards.length; i++) {
        const cardTop = baseTops[i];
        const triggerStart = cardTop - stackPx - itemStackDistance * i;
        const triggerEnd = cardTop - endPx;
        const pinStart = triggerStart;

        const scaleProg = clamp01(scrollTop, triggerStart, triggerEnd);
        const targetScale = baseScale + i * itemScale;
        const scale = 1 - scaleProg * (1 - targetScale);

        // The pin has to hold through the deal, not release at pinEnd. Released, the deck
        // scrolls up the viewport while it is also flinging, so the cards pile into the
        // top edge and leave the lower two thirds of the frame empty. Held, they fly out
        // from the centre where you were reading them, which is the whole effect.
        let translateY = 0;
        if (scrollTop >= pinStart && scrollTop <= pinHold) {
          translateY = scrollTop - cardTop + stackPx + itemStackDistance * i;
        } else if (scrollTop > pinHold) {
          translateY = pinHold - cardTop + stackPx + itemStackDistance * i;
        }

        // ---- deal-out: peel this card off the front of the deck ----
        // order 0 is the front (readable) card, so the deck depletes from the top down
        // and you watch the one you were just reading leave first.
        const order = cards.length - 1 - i;
        const lead = order * DEAL_LEAD;
        const raw = clamp01(deal, lead, lead + DEAL_SPAN);
        // Eased so the card leaves fast and coasts, the way a dealt card does. 2.2 rather
        // than a cube: a cube put the card 94% of the way out at 62% of its window, which
        // read as a snap rather than a throw.
        const p = 1 - Math.pow(1 - raw, 2.2);
        let dx = 0, rot = 0, dealY = 0, dealScale = 1, alpha = 1;
        if (raw > 0) {
          const dir = dealDir(order);
          // 0.78vw of travel is what it takes for a card this wide to actually clear the
          // frame. At 0.42vw its centre only reached x=116, so the card was still ~40% on
          // screen when the fade finished it off — it dissolved in place instead of being
          // thrown. With real travel the fade can come late and merely finish the exit.
          dx = dir.side * (0.78 + dir.tier * 0.14) * window.innerWidth * p;
          // Lift is inverted against tier on purpose. Back cards already sit highest in
          // the deck (their stack offset is smallest), so giving them the largest lift
          // too sent them out through the top while the frame emptied from the bottom up.
          // The front cards, which sit lowest, now rise furthest and cross the space the
          // back ones vacate, keeping the exit band centred.
          dealY = -(0.13 - dir.tier * 0.045) * ch * p;
          rot = dir.side * (9 + dir.tier * 4) * p;
          dealScale = 1 - 0.28 * p;
          // Keyed to raw, not the eased p: against p the fade tracked the front-loaded
          // motion and ran while the card was still mid-frame.
          alpha = 1 - clamp01(raw, 0.62, 1);
        }

        const ty = Math.round((translateY + dealY) * 100) / 100;
        const sc = Math.round(scale * dealScale * 1000) / 1000;
        const tx = Math.round(dx * 100) / 100;
        const rz = Math.round(rot * 100) / 100;
        const op = Math.round(alpha * 1000) / 1000;
        const prev = lastTf[i];
        if (
          !prev ||
          Math.abs(prev.ty - ty) > 0.1 || Math.abs(prev.sc - sc) > 0.001 ||
          Math.abs(prev.tx - tx) > 0.1 || Math.abs(prev.rz - rz) > 0.05 ||
          Math.abs(prev.op - op) > 0.005
        ) {
          cards[i].style.transform =
            'translate3d(' + tx + 'px,' + ty + 'px,0) rotate(' + rz + 'deg) scale(' + sc + ')';
          // Only touch opacity once the card is actually leaving, so a card at rest keeps
          // whatever opacity the stylesheet gives it.
          cards[i].style.opacity = op < 1 ? String(op) : '';
          // A card committed to leaving must not eat clicks meant for the grid arriving
          // under it. Keyed to travel, not opacity, which now stays high well off-frame.
          cards[i].style.pointerEvents = raw > 0.2 ? 'none' : '';
          lastTf[i] = { ty: ty, sc: sc, tx: tx, rz: rz, op: op };
        }
      }
    }

    measure();
    update();

    let resizeRaf = 0;
    function onResize() {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(function () { measure(); update(); });
    }

    let scrollRaf = 0;
    function scheduleUpdate() {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; update(); });
    }
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', onResize);
    const lenis = window.__lenis;
    if (lenis && typeof lenis.on === 'function') lenis.on('scroll', scheduleUpdate);

    // Re-measure when the section's own height changes. The header is the reason this is
    // needed: measure() runs with the plain `.spotlight-title-fallback` heading (~80px) in
    // place, then `showAscii` flips once THREE and the in-view gate are ready and the
    // `.ascii-text-container` takes its place at ~200px, pushing the whole stack down. The
    // effect does not re-run on that swap, so without this every cached baseTop/endTop
    // stayed ~120px stale and the pin — and the deal handoff tuned against it — fired late.
    // Also covers late font loads and the WebGL fallback path.
    let ro = null;
    let lastSectionH = sectionEl ? Math.round(sectionEl.getBoundingClientRect().height) : 0;
    if (sectionEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(function () {
        const h = Math.round(sectionEl.getBoundingClientRect().height);
        // Height-only comparison: card transforms and --deal writes never change layout,
        // so this cannot feed back into itself.
        if (h !== lastSectionH) {
          lastSectionH = h;
          onResize();
          // Everything below this section shifts with it, and GSAP caches trigger
          // positions at creation. Without this the Capabilities entrance fired ~120px
          // early (the height the ASCII heading adds), so the tiles were already landing
          // before the grid reached its trigger point.
          try { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); } catch (e) {}
        }
      });
      ro.observe(sectionEl);
    }

    // Re-measure once images load (cover art changes card heights).
    const imgs = scroller.querySelectorAll('img');
    let pending = imgs.length;
    function imgDone() { pending--; onResize(); }
    imgs.forEach(function (im) {
      if (!im.complete) im.addEventListener('load', imgDone, { once: true });
    });

    return function () {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', onResize);
      if (lenis && typeof lenis.off === 'function') lenis.off('scroll', scheduleUpdate);
      cancelAnimationFrame(resizeRaf);
      cancelAnimationFrame(scrollRaf);
      if (ro) ro.disconnect();
      // Leave nothing flung: a card unmounted mid-deal would otherwise stay invisible
      // and click-through if this effect re-runs.
      cards.forEach(function (c) {
        c.style.transform = '';
        c.style.opacity = '';
        c.style.pointerEvents = '';
      });
      if (sectionEl) {
        sectionEl.style.removeProperty('--deal');
        sectionEl.classList.remove('is-dealing');
      }
      document.documentElement.classList.remove('deal-live');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standout.length]);

  function cardHref(p) {
    if (p.detailPage) return p.detailPage;
    return 'case-study.html?slug=' + encodeURIComponent(p.slug || p.id);
  }

  return (
    <section ref={sectionRef} className="spotlight" id="spotlight" data-screen-label="01 Spotlight">
      <div className="spotlight-atmos" aria-hidden="true">
        {showLaser && (
          <LaserFlow
            color="#72ADFF"
            horizontalBeamOffset={0.0}
            verticalBeamOffset={0.08}
            wispIntensity={3.2}
            wispDensity={1}
            fogIntensity={0.34}
            flowStrength={0.22}
            verticalSizing={2.1}
            horizontalSizing={0.5}
            mouseTiltStrength={0.005}
          />
        )}
      </div>

      <div className="spotlight-inner">
        <header className="spotlight-header">
          <div className="spotlight-meta">
            <span className="spotlight-idx">01</span>
            <span className="spotlight-rule" aria-hidden="true" />
            <span className="spotlight-label">Spotlight</span>
          </div>
          <div className="spotlight-title-wrap">
            {showAscii ? (
              <React.Fragment>
                <AsciiText text="standout_work" asciiFontSize={6} planeBaseHeight={10} enableWaves={false} />
                {/* Accessible heading: the ASCII canvas is aria-hidden visual only */}
                <h2 className="sr-only">Standout work</h2>
              </React.Fragment>
            ) : (
              <h2 className="spotlight-title-fallback">standout work</h2>
            )}
          </div>
          <p className="spotlight-sub">
            A close look at the pieces I'd point to <em className="aura-word">first</em>.
          </p>
        </header>

        <div className="scroll-stack" ref={stackRef}>
          {standout.map(function (p, i) {
            const num = String(i + 1).padStart(2, '0');
            const cardInner = [
              <div className="spotlight-card-cover" key="cover">
                {p.cover ? (
                  /* eager + sync decode: the ScrollStack transforms cards, so covers must be ready (not lazy/async) before a card peeks into the stack */
                  <img src={p.cover} alt={p.title} loading="eager" decoding="async" style={p.coverPos ? { objectPosition: p.coverPos } : undefined} />
                ) : (
                  <div className="spotlight-card-cover-fallback"><span>{p.title[0]}</span></div>
                )}
                <div className="spotlight-card-aura" aria-hidden="true" />
              </div>,
              <div className="spotlight-card-body" key="body">
                <div className="spotlight-card-top">
                  <span className="spotlight-card-num">{num}</span>
                  {p.spotlight && <span className="spotlight-card-live">live</span>}
                </div>
                <h3 className="spotlight-card-title">{p.title}</h3>
                <p className="spotlight-card-desc">{p.subtitle || p.description}</p>
                <div className="spotlight-card-tags">
                  {(p.tags || []).slice(0, 3).map(function (t) {
                    return <span key={t} className="tag tag-sm">{t}</span>;
                  })}
                </div>
                <div className="spotlight-card-foot">
                  <span className="spotlight-card-year">
                    {p.year}{p.role ? ' · ' + p.role : ''}
                  </span>
                  <span className="spotlight-card-arrow" aria-hidden="true">↗</span>
                </div>
              </div>
            ];
            // BorderGlow (React Bits): cursor-reactive gradient border on each card.
            // Renders as the <a class="spotlight-card"> the ScrollStack transforms; the
            // 2-col grid lives on the inner wrapper. Falls back to a plain card if absent.
            if (typeof BorderGlow !== 'undefined' && !window.matchMedia('(max-width: 760px), (pointer: coarse)').matches) {
              return (
                <BorderGlow
                  key={p.id}
                  as="a"
                  className="spotlight-card"
                  innerClassName="spotlight-card-inner"
                  href={cardHref(p)}
                  ariaLabel={'View project: ' + p.title}
                  dataCursor="view ↗"
                  onClick={function () { if (onOpen) onOpen(p); }}
                  backgroundColor="var(--navy-mid)"
                  glowColor="215 100 72"
                  colors={['#72ADFF', '#C4B0FF', '#A0C8FF']}
                  borderRadius={20}
                  glowRadius={34}
                  glowIntensity={0.85}
                  coneSpread={22}
                >
                  {cardInner}
                </BorderGlow>
              );
            }
            return (
              <a
                key={p.id}
                href={cardHref(p)}
                className="spotlight-card spotlight-card--plain"
                data-cursor="view ↗"
                aria-label={'View project: ' + p.title}
                onClick={function () { if (onOpen) onOpen(p); }}
              >
                {cardInner}
              </a>
            );
          })}
          <div className="scroll-stack-end" aria-hidden="true" />
        </div>

        {/* Deal-out runway: the scroll distance the deck is flung over. Collapses to
            nothing on the mobile/reduced-motion paths (see styles.css), which also
            switches the deal off in JS since the measured height is then 0. The hairline
            draws down as --deal advances, carrying the eye into Capabilities. */}
        <div className="spotlight-deal" aria-hidden="true">
          <span className="spotlight-deal-line" />
          <span className="spotlight-deal-tick">02</span>
        </div>
      </div>
    </section>
  );
}

window.Spotlight = Spotlight;
