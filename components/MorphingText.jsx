/* global React */
/*
  MorphingText — cross-fades through a list of words with a blur "morph".
  Adapted from Magic UI (https://magicui.design) to the no-build globals pattern:
  ESM imports / Tailwind classes removed, hooks from global React, exposed as
  window.MorphingText. The upstream "gooey" SVG threshold filter (great only on huge
  text) is OPTIONAL via the `gooey` prop — default is a clean blur cross-fade that
  reads at any size. The morph intentionally runs under prefers-reduced-motion too (see note
  in the effect): it is blur + opacity only, no movement.
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
  // Latest onIndexChange in a ref so it can fire from the rAF loop without being an
  // effect dependency (which would otherwise restart the animation on every render).
  const onIdxRef = useRef(p.onIndexChange);
  onIdxRef.current = p.onIndexChange;

  useEffect(function () {
    const a = t1.current, b = t2.current;
    if (!a || !b) return;
    if (onIdxRef.current) onIdxRef.current(0);
    // Deliberate product decision: the morph runs even under prefers-reduced-motion.
    // It was previously disabled there, which stripped the blur entirely and left a plain
    // opacity cross-fade ("fade, not morph") for anyone with Reduce Motion on. This effect
    // is blur + opacity only, with no translation, scale or parallax, so it avoids the
    // movement that actually triggers vestibular discomfort.

    let idx = 0, morph = 0, cooldown = 0, last = performance.now(), raf = 0, disposed = false;
    a.textContent = texts[0];
    b.textContent = texts[1 % texts.length];

    // The gooey threshold resolves blurred alpha into hard "liquid" edges.
    // Same look at every size: every blur value scales in exact proportion to the font,
    // so a phone renders the identical morph at half scale rather than a different effect.
    // Deliberately linear. An earlier version damped small text (exponent 1.25) to keep
    // letterforms crisper, but that made the phone a different animation from the laptop.
    // Proportional is also ~4x cheaper on a phone, since blur cost scales with radius squared.
    const REF_FS = 92, REF_BLUR = 8, REF_MAX = 100;
    let blurUnit = REF_BLUR, maxBlur = REF_MAX;
    function measure() {
      try {
        const fs = parseFloat(window.getComputedStyle(a).fontSize);
        if (fs > 0) {
          const k = fs / REF_FS;
          blurUnit = Math.max(1, REF_BLUR * k);
          maxBlur = Math.max(12, REF_MAX * k);
        }
      } catch (e) {}
    }
    measure();
    window.addEventListener('resize', measure, { passive: true });

    function setStyles(frac) {
      const u = blurUnit;
      b.style.filter = 'blur(' + Math.min(u / frac - u, maxBlur) + 'px)';
      b.style.opacity = Math.pow(frac, 0.4) * 100 + '%';
      const inv = 1 - frac;
      a.style.filter = 'blur(' + Math.min(u / inv - u, maxBlur) + 'px)';
      a.style.opacity = Math.pow(inv, 0.4) * 100 + '%';
      a.textContent = texts[idx % texts.length];
      b.textContent = texts[(idx + 1) % texts.length];
    }
    function doMorph() {
      morph -= cooldown; cooldown = 0;
      let frac = morph / morphTime;
      if (frac > 1) { cooldown = cooldownTime; frac = 1; }
      setStyles(frac);
      if (frac === 1) { idx++; if (onIdxRef.current) onIdxRef.current(idx % texts.length); }
    }
    function doCooldown() {
      morph = 0;
      b.style.filter = 'none'; b.style.opacity = '100%';
      a.style.filter = 'none'; a.style.opacity = '0%';
    }
    // Self-tuning for slow devices. Blur is rasterised per frame, and on a phone at 3x
    // density the full-strength effect can cost more than a frame budget, so most frames of
    // the morph never render and the word appears to just change. Measure real frame rate
    // over the first ~1.4s and, if the device can't keep up, drop to a cheaper blur that it
    // can actually animate. Desktop measures fine and is left at full strength.
    let probeFrames = 0, probeStart = 0, tuned = false;
    function tune(now) {
      if (tuned) return;
      if (!probeStart) { probeStart = now; return; }
      probeFrames++;
      const elapsed = now - probeStart;
      if (elapsed < 1400) return;
      const fps = probeFrames / (elapsed / 1000);
      if (fps < 24) {
        // last resort: a frozen animation is worse than a slightly lighter one
        blurUnit = Math.max(1, blurUnit * 0.7);
        maxBlur = Math.max(10, maxBlur * 0.5);
      }
      tuned = true;
    }

    function animate() {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      tune(now);
      const dt = (now - last) / 1000; last = now;
      cooldown -= dt;
      if (cooldown <= 0) doMorph(); else doCooldown();
    }
    animate();
    return function () {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texts.join('|'), morphTime, cooldownTime]);

  /* Safari/iOS hardening for the gooey filter. When it silently no-ops the morph
     degrades to a plain blur cross-fade, which is what "not fluid, just a fade" looks like:
       - color-interpolation-filters="sRGB": without it filters run in linearRGB, the single
         biggest cross-browser difference in how this alpha threshold renders.
       - explicit filter region: the default (-10%/120%) clips blurred glyph edges and
         Safari is stricter about it than Chrome.
       - a 1x1 host instead of width/height 0: zero-sized SVGs are a known trigger for
         filter references failing to resolve on iOS. */
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
        <svg className="morphing-text-filters" width="1" height="1" aria-hidden="true" focusable="false">
          <defs>
            <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%"
                    color-interpolation-filters="sRGB" filterUnits="objectBoundingBox">
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
