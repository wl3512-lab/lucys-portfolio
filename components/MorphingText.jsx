/* global React */
/*
  MorphingText — cross-fades through a list of words with a blur "morph".
  Adapted from Magic UI (https://magicui.design) to the no-build globals pattern:
  ESM imports / Tailwind classes removed, hooks from global React, exposed as
  window.MorphingText. The upstream "gooey" SVG threshold filter (great only on huge
  text) is OPTIONAL via the `gooey` prop — default is a clean blur cross-fade that
  reads at any size. Honors prefers-reduced-motion (cycles with a plain fade, no rAF blur).
*/
function MorphingText(props) {
  const p = props || {};
  const { useRef, useEffect } = React;
  const texts = p.texts && p.texts.length ? p.texts : ['Design', 'Code'];
  const morphTime = p.morphTime != null ? p.morphTime : 1.4;
  const cooldownTime = p.cooldownTime != null ? p.cooldownTime : 1.4;
  const gooey = !!p.gooey;

  const t1 = useRef(null);
  const t2 = useRef(null);

  useEffect(function () {
    const a = t1.current, b = t2.current;
    if (!a || !b) return;
    let reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    let idx = 0, morph = 0, cooldown = 0, last = performance.now(), raf = 0, disposed = false;
    a.textContent = texts[0];
    b.textContent = texts[1 % texts.length];

    function setStyles(frac) {
      b.style.filter = reduced ? 'none' : ('blur(' + Math.min(8 / frac - 8, 100) + 'px)');
      b.style.opacity = Math.pow(frac, 0.4) * 100 + '%';
      const inv = 1 - frac;
      a.style.filter = reduced ? 'none' : ('blur(' + Math.min(8 / inv - 8, 100) + 'px)');
      a.style.opacity = Math.pow(inv, 0.4) * 100 + '%';
      a.textContent = texts[idx % texts.length];
      b.textContent = texts[(idx + 1) % texts.length];
    }
    function doMorph() {
      morph -= cooldown; cooldown = 0;
      let frac = morph / morphTime;
      if (frac > 1) { cooldown = cooldownTime; frac = 1; }
      setStyles(frac);
      if (frac === 1) idx++;
    }
    function doCooldown() {
      morph = 0;
      b.style.filter = 'none'; b.style.opacity = '100%';
      a.style.filter = 'none'; a.style.opacity = '0%';
    }
    function animate() {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      cooldown -= dt;
      if (cooldown <= 0) doMorph(); else doCooldown();
    }
    animate();
    return function () { disposed = true; cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texts.join('|'), morphTime, cooldownTime]);

  const filterId = 'mt-threshold';
  const sizer = texts.reduce(function (a, b) { return b.length > a.length ? b : a; }, '');
  return (
    <span className={'morphing-text ' + (gooey ? 'is-gooey ' : '') + (p.className || '')} aria-label={texts.join(', ')}>
      <span className="morphing-text-stage" style={gooey ? { filter: 'url(#' + filterId + ') blur(0.5px)' } : undefined}>
        <span className="morphing-text-sizer" aria-hidden="true">{sizer}</span>
        <span className="morphing-text-a" ref={t1} aria-hidden="true" />
        <span className="morphing-text-b" ref={t2} aria-hidden="true" />
      </span>
      {gooey && (
        <svg className="morphing-text-filters" width="0" height="0" aria-hidden="true">
          <defs>
            <filter id={filterId}>
              <feColorMatrix in="SourceGraphic" type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140" />
            </filter>
          </defs>
        </svg>
      )}
    </span>
  );
}

window.MorphingText = MorphingText;
