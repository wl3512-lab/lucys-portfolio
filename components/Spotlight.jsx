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
*/

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
  const heavyOk =
    typeof window !== 'undefined' &&
    window.innerWidth >= 760 &&
    typeof THREE !== 'undefined';
  const showLaser = heavyOk && typeof LaserFlow !== 'undefined';
  const showAscii = heavyOk && typeof AsciiText !== 'undefined';

  useEffect(function () {
    const scroller = stackRef.current;
    if (!scroller) return;
    if (spReducedMotion()) return; // plain list, no pinning

    const cards = Array.prototype.slice.call(scroller.querySelectorAll('.spotlight-card'));
    const endEl = scroller.querySelector('.scroll-stack-end');
    if (!cards.length || !endEl) return;

    // Tuning
    const itemStackDistance = 26;
    const itemScale = 0.022;
    const baseScale = 0.9;
    const stackPositionPct = 22; // % of viewport height
    const scaleEndPct = 12;

    cards.forEach(function (card) {
      card.style.willChange = 'transform';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
    });

    let baseTops = [];
    let endTop = 0;
    const lastTf = [];

    function measure() {
      cards.forEach(function (c) { c.style.transform = ''; });
      endEl.style.transform = '';
      // force reflow before reading
      void scroller.offsetHeight;
      baseTops = cards.map(function (c) {
        return c.getBoundingClientRect().top + window.scrollY;
      });
      endTop = endEl.getBoundingClientRect().top + window.scrollY;
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
      const stackPx = (stackPositionPct / 100) * ch;
      const endPx = (scaleEndPct / 100) * ch;
      const pinEnd = endTop - ch / 2;

      for (let i = 0; i < cards.length; i++) {
        const cardTop = baseTops[i];
        const triggerStart = cardTop - stackPx - itemStackDistance * i;
        const triggerEnd = cardTop - endPx;
        const pinStart = triggerStart;

        const scaleProg = clamp01(scrollTop, triggerStart, triggerEnd);
        const targetScale = baseScale + i * itemScale;
        const scale = 1 - scaleProg * (1 - targetScale);

        let translateY = 0;
        if (scrollTop >= pinStart && scrollTop <= pinEnd) {
          translateY = scrollTop - cardTop + stackPx + itemStackDistance * i;
        } else if (scrollTop > pinEnd) {
          translateY = pinEnd - cardTop + stackPx + itemStackDistance * i;
        }

        const ty = Math.round(translateY * 100) / 100;
        const sc = Math.round(scale * 1000) / 1000;
        const prev = lastTf[i];
        if (!prev || Math.abs(prev.ty - ty) > 0.1 || Math.abs(prev.sc - sc) > 0.001) {
          cards[i].style.transform = 'translate3d(0,' + ty + 'px,0) scale(' + sc + ')';
          lastTf[i] = { ty: ty, sc: sc };
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

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize);
    const lenis = window.__lenis;
    if (lenis && typeof lenis.on === 'function') lenis.on('scroll', update);

    // Re-measure once images load (cover art changes card heights).
    const imgs = scroller.querySelectorAll('img');
    let pending = imgs.length;
    function imgDone() { pending--; onResize(); }
    imgs.forEach(function (im) {
      if (!im.complete) im.addEventListener('load', imgDone, { once: true });
    });

    return function () {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
      if (lenis && typeof lenis.off === 'function') lenis.off('scroll', update);
      cancelAnimationFrame(resizeRaf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standout.length]);

  function cardHref(p) {
    if (p.detailPage) return p.detailPage;
    return 'case-study.html?slug=' + encodeURIComponent(p.slug || p.id);
  }

  return (
    <section className="spotlight" id="spotlight" data-screen-label="01 Spotlight">
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
            return (
              <a
                key={p.id}
                href={cardHref(p)}
                className="spotlight-card"
                data-cursor="view ↗"
                aria-label={'View project: ' + p.title}
                onClick={function () { if (onOpen) onOpen(p); }}
              >
                <div className="spotlight-card-cover">
                  {p.cover ? (
                    /* eager: the ScrollStack transforms cards, so lazy covers don't load before a card peeks into the stack */
                    <img src={p.cover} alt={p.title} loading="eager" decoding="async" />
                  ) : (
                    <div className="spotlight-card-cover-fallback"><span>{p.title[0]}</span></div>
                  )}
                  <div className="spotlight-card-aura" aria-hidden="true" />
                </div>
                <div className="spotlight-card-body">
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
              </a>
            );
          })}
          <div className="scroll-stack-end" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

window.Spotlight = Spotlight;
