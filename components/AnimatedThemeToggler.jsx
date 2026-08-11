/* global React, ReactDOM */
/*
  AnimatedThemeToggler — light/dark switch with a View Transitions circular reveal that
  expands from the button. Adapted from Magic UI (https://magicui.design) to this site's
  no-build globals pattern: no ESM imports (React/ReactDOM globals), toggles `.theme-light`
  on <html> (the site is dark by default), persists to localStorage, and falls back to an
  instant swap when View Transitions / reduced-motion apply. Exposed as window.AnimatedThemeToggler.
*/
function AnimatedThemeToggler(props) {
  const p = props || {};
  const { useState, useRef, useCallback, useEffect } = React;
  const ref = useRef(null);
  const [isLight, setIsLight] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light')
  );

  // Keep the icon in sync if the theme was set before mount (early inline script).
  useEffect(function () {
    setIsLight(document.documentElement.classList.contains('theme-light'));
  }, []);

  const apply = useCallback(function () {
    const light = document.documentElement.classList.toggle('theme-light');
    document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    /* sessionStorage (not localStorage): the theme persists while navigating within a
       visit, but every fresh arrival resets to the dark "Lit Archive" default. */
    try { sessionStorage.setItem('lucy.theme', light ? 'light' : 'dark'); } catch (e) {}
    try { window.__lenis && window.__lenis.resize && window.__lenis.resize(); } catch (e) {}
    if (ReactDOM && ReactDOM.flushSync) { ReactDOM.flushSync(function () { setIsLight(light); }); }
    else setIsLight(light);
  }, []);

  const toggle = useCallback(async function () {
    const btn = ref.current;
    let reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (!btn || reduced) { apply(); return; }

    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const maxRad = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    // Longer, more visible reveal — and longest on phones, where the request came from.
    const dur = window.innerWidth <= 768 ? 1100 : 850;
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

    if (typeof document.startViewTransition === 'function') {
      try {
        await document.startViewTransition(apply).ready;
        document.documentElement.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + maxRad + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: dur, easing: ease, pseudoElement: '::view-transition-new(root)' }
        );
        return;
      } catch (e) { /* fall through to the manual wipe */ }
    }

    // Fallback for browsers without View Transitions (notably iOS Safari < 18): a manual
    // circular wipe so mobile users still see the change. The old background collapses
    // into the toggle button, revealing the freshly-themed page underneath.
    try {
      const oldBg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#050710';
      const ov = document.createElement('div');
      ov.setAttribute('aria-hidden', 'true');
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;will-change:clip-path;background:' + oldBg + ';';
      ov.style.clipPath = 'circle(' + maxRad + 'px at ' + x + 'px ' + y + 'px)';
      document.body.appendChild(ov);
      apply();
      const a = ov.animate(
        { clipPath: ['circle(' + maxRad + 'px at ' + x + 'px ' + y + 'px)', 'circle(0px at ' + x + 'px ' + y + 'px)'] },
        { duration: dur, easing: ease }
      );
      const cleanup = function () { try { ov.remove(); } catch (e) {} };
      a.onfinish = cleanup; a.oncancel = cleanup;
    } catch (e) { apply(); }
  }, [apply]);

  const Sun = React.createElement('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
    React.createElement('circle', { cx: 12, cy: 12, r: 4 }),
    React.createElement('path', { d: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' })
  );
  const Moon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
    React.createElement('path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' })
  );

  return (
    <button
      ref={ref}
      type="button"
      className="theme-toggler"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-pressed={isLight}
      title={isLight ? 'Dark mode' : 'Light mode'}
    >
      {isLight ? Moon : Sun}
    </button>
  );
}

window.AnimatedThemeToggler = AnimatedThemeToggler;
