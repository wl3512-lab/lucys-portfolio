/* global React, ReactDOM */
/*
  AnimatedThemeToggler — light/dark switch with a View Transitions circular reveal that
  expands from the button. Adapted from Magic UI (https://magicui.design) to this site's
  no-build globals pattern: no ESM imports (React/ReactDOM globals), toggles `.theme-light`
  on <html> (the site is dark by default), persists for this tab's visit, and falls back to an
  instant swap without View Transitions or with reduced motion. Exposed as window.AnimatedThemeToggler.
*/
function AnimatedThemeToggler(props) {
  const p = props || {};
  const { useState, useRef, useCallback, useEffect } = React;
  const ref = useRef(null);
  const transitioning = useRef(false);
  const [isLight, setIsLight] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light')
  );

  // Keep the icon in sync if the theme was set before mount (early inline script).
  useEffect(function () {
    setIsLight(document.documentElement.classList.contains('theme-light'));
  }, []);

  const apply = useCallback(function (light) {
    document.documentElement.classList.toggle('theme-light', light);
    document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    /* sessionStorage (not localStorage): the theme persists while navigating within a
       visit, but every fresh arrival resets to the dark "Lit Archive" default. */
    try { sessionStorage.setItem('lucy.theme', light ? 'light' : 'dark'); } catch (e) {}
    try { window.__lenis && window.__lenis.resize && window.__lenis.resize(); } catch (e) {}
    if (ReactDOM && ReactDOM.flushSync) { ReactDOM.flushSync(function () { setIsLight(light); }); }
    else setIsLight(light);
  }, []);

  const toggle = useCallback(async function () {
    if (transitioning.current) return;
    const light = !document.documentElement.classList.contains('theme-light');
    const btn = ref.current;
    let reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (!btn || reduced || typeof document.startViewTransition !== 'function') { apply(light); return; }

    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const maxRad = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    // Longer, more visible reveal — and longest on phones, where the request came from.
    const dur = window.innerWidth <= 768 ? 1100 : 850;
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

    // Select one target before taking a snapshot. If readiness/animation fails after
    // the update ran, applying the same target cannot undo the user's selection.
    transitioning.current = true;
    try {
      await document.startViewTransition(function () { apply(light); }).ready;
      const animation = document.documentElement.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + maxRad + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: dur, easing: ease, pseudoElement: '::view-transition-new(root)' }
      );
      await animation.finished;
    } catch (e) { apply(light); }
    finally { transitioning.current = false; }
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
