/* global React */
/*
 * useInView(ref, rootMargin, opts) — "should this section's heavy backdrop exist right now?"
 * Shared by the WebGL backdrops (FaultyTerminal, LaserFlow, AsciiText, Dither, Aurora) and
 * the gem frame sequence.
 *
 * Returns false until the element comes within rootMargin of the viewport, then true.
 *
 * One at a time: sections do not mount the moment they are near. Each takes a ticket from a
 * single queue, and the next ticket is only granted after the previous mount has built its
 * context and painted (two frames plus an idle slot). Two backdrops compiling shaders in the
 * same frame was the load-time stutter.
 *
 * Released when far: once the element is more than ~1.5 viewports away for 3s, the hook goes
 * back to false, so the backdrop unmounts and its cleanup frees the WebGL context / decoded
 * frames. Scrolling back re-queues it well before it is visible. Pass { keep: true } for
 * anything whose presence changes layout (swapping it out while the reader is below it would
 * shift the page and every pin under it).
 *
 * Degrades safely: no IntersectionObserver => mount immediately and stay mounted.
 * Loaded before the component scripts so `useInView` is a defined global.
 */
(function () {
  var queue = [];
  var busy = false;

  function grant() {
    if (busy || !queue.length) return;
    busy = true;
    var ticket = queue.shift();
    try { ticket(); } catch (e) {}
    var next = function () { busy = false; grant(); };
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (window.requestIdleCallback) requestIdleCallback(next, { timeout: 400 });
        else setTimeout(next, 120);
      });
    });
  }
  function enqueue(fn) {
    queue.push(fn);
    grant();
    return function cancel() {
      var i = queue.indexOf(fn);
      if (i > -1) queue.splice(i, 1);
    };
  }

  function useInView(ref, rootMargin, opts) {
    var useState = React.useState, useEffect = React.useEffect;
    var keep = !!(opts && opts.keep);
    var st = useState(false), on = st[0], setOn = st[1];

    useEffect(function () {
      var el = ref && ref.current;
      if (!el) return;
      if (typeof IntersectionObserver === 'undefined') { setOn(true); return; }
      var alive = true, mounted = false, cancel = null, releaseTimer = 0;

      var near = new IntersectionObserver(function (entries) {
        if (!entries[entries.length - 1].isIntersecting || mounted || cancel) return;
        clearTimeout(releaseTimer);
        cancel = enqueue(function () {
          cancel = null;
          if (!alive) return;
          mounted = true;
          setOn(true);
          if (keep) near.disconnect();
        });
      }, { rootMargin: rootMargin || '300px 0px 300px 0px' });
      near.observe(el);

      var far = null;
      if (!keep) {
        far = new IntersectionObserver(function (entries) {
          var inRange = entries[entries.length - 1].isIntersecting;
          clearTimeout(releaseTimer);
          if (inRange) return;
          if (cancel) { cancel(); cancel = null; }
          releaseTimer = setTimeout(function () {
            if (!alive || !mounted) return;
            mounted = false;
            setOn(false);
            // Let the near observer re-arm: it only fires on a change, so re-observe.
            near.unobserve(el); near.observe(el);
          }, 3000);
        }, { rootMargin: '150% 0px 150% 0px' });
        far.observe(el);
      }

      return function () {
        alive = false;
        clearTimeout(releaseTimer);
        if (cancel) cancel();
        near.disconnect();
        if (far) far.disconnect();
      };
    }, [keep, rootMargin]);

    return on;
  }
  window.useInView = useInView;
})();
