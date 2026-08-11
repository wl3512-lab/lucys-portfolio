/* global React */
/*
 * useInView(ref, rootMargin) — one-shot "is this section near the viewport yet?"
 * hook, shared by the below-fold WebGL backdrops (Dither, Aurora, Iridescence,
 * LaserFlow, AsciiText). Returns false until the observed element comes within
 * rootMargin of the viewport, then latches true forever (no unmount/flicker).
 *
 * Why: every backdrop used to mount at boot, spinning up 5+ WebGL contexts and
 * rAF loops before you scroll to any of them. Gating each on useInView means
 * only the hero backdrop mounts on load; the rest initialize just before they
 * scroll into view. Degrades safely: no IntersectionObserver => mount immediately.
 *
 * Loaded before the component scripts so `useInView` is a defined global.
 */
(function () {
  function useInView(ref, rootMargin) {
    var useState = React.useState, useEffect = React.useEffect;
    var st = useState(false), inView = st[0], setInView = st[1];
    useEffect(function () {
      if (inView) return; // latched
      var el = ref && ref.current;
      if (!el) return;
      if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { setInView(true); io.disconnect(); return; }
        }
      }, { rootMargin: rootMargin || '300px 0px 300px 0px' });
      io.observe(el);
      return function () { io.disconnect(); };
    }, [inView]);
    return inView;
  }
  window.useInView = useInView;
})();
