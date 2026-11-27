/*
 * Animated covers: a project's cover video, played only when it has a reason to.
 *
 * The reels are cut to loop on their rest frame: frame 0, the last frame and the poster
 * are the same picture. So a cover can stop at the end of any pass without freezing
 * mid-scene, and nothing ever has to cut a pass short to look tidy.
 *
 * - It performs once, the first time its card is at least half in view, then rests.
 * - Hovering or focusing the card replays it and keeps it looping while you stay; on a
 *   touch screen the card the page marks `.is-scroll-active` counts as hovered (the
 *   site's scroll-is-hover rule). Leaving lets the current pass finish.
 * - Out of view it pauses and rewinds to the rest frame.
 * - Reduced motion never plays it: the poster is the cover. Save-Data skips the
 *   arrival pass but still plays on hover, which is a request.
 * - An "always" cover (opts.always, or data-cover-always on a static page) skips the
 *   rest: it loops the whole time it is in view, hover or not. HabitaBull's is one (Lucy,
 *   2026-10-02: "no pause"). It still rests off screen and never plays under reduced motion.
 * - opts.arrival === false skips the arrival pass: the cover rests on its poster until its
 *   card is hovered or focused. The home page's Standout cards use it (Lucy, 2026-10-31: the
 *   moving covers made the section look like something to watch, not case studies to open).
 *
 * Markup: <video data-cover-reel muted playsinline preload="none" poster="…" src="…">
 * inside the card. Static pages mount automatically at DOMContentLoaded (the card is
 * the nearest [data-cover-host], else the parent); React calls CoverReel(video, host).
 * Plain JS, no dependencies; exposes window.CoverReel and returns a dispose function.
 */
(function () {
  function CoverReel(video, host, opts) {
    if (!video || typeof video.play !== 'function') return function () {};
    if (video.__coverReelOff) return video.__coverReelOff;
    host = host || video.parentElement || video;
    opts = opts || {};

    var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
    var reduce = mm('(prefers-reduced-motion: reduce)');
    var finePointer = mm('(hover: hover) and (pointer: fine)').matches;
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var seen = false, inView = false, wanted = false, disposed = false;
    // Three reasons to keep looping, tracked apart so one ending never cancels another.
    var hovered = false, focused = false, active = false;
    var always = !!opts.always || !!(video.hasAttribute && video.hasAttribute('data-cover-always'));
    var arrival = opts.arrival !== false;

    // The property is what autoplay policy reads, and React does not reliably set the attribute.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = false;

    function play(fromTop) {
      if (disposed || reduce.matches || !inView) return;
      if (fromTop && video.readyState > 0) { try { video.currentTime = 0; } catch (e) {} }
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    }
    function rest() {
      video.loop = false;
      if (!video.paused) video.pause();
      if (video.readyState > 0) { try { video.currentTime = 0; } catch (e) {} }
    }
    function sync() {
      var on = always || hovered || focused || active;
      if (wanted === on) return;
      wanted = on;
      video.loop = on;
      // A pass already running carries on; a rested cover starts from the top.
      if (on && (video.paused || video.ended)) play(true);
    }

    if (always) { wanted = true; video.loop = true; }

    var io = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(function (entries) {
        var e = entries[entries.length - 1];
        inView = e.isIntersecting && e.intersectionRatio >= 0.5;
        if (!inView) { rest(); return; }
        video.loop = wanted;
        if (!seen) {
          seen = true;
          if ((arrival && !saveData) || wanted) play(true);
        } else if (wanted) {
          play(false);
        }
      }, { threshold: [0, 0.5, 1] });
      io.observe(video);
    }

    var enter = function () { hovered = true; sync(); };
    var leave = function () { hovered = false; sync(); };
    var focusIn = function () { focused = true; sync(); };
    var focusOut = function (e) { if (!host.contains || !host.contains(e.relatedTarget)) { focused = false; sync(); } };
    // Only a real pointer hovers. A tap fires mouseenter too, and on iOS a hover handler
    // that changes what is on screen can swallow the first tap of a link.
    if (finePointer) {
      host.addEventListener('mouseenter', enter);
      host.addEventListener('mouseleave', leave);
    }
    host.addEventListener('focusin', focusIn);
    host.addEventListener('focusout', focusOut);

    var mo = null;
    if (opts.activeClass && typeof MutationObserver === 'function') {
      mo = new MutationObserver(function () {
        var now = host.classList.contains(opts.activeClass);
        if (now !== active) { active = now; sync(); }
      });
      mo.observe(host, { attributes: true, attributeFilter: ['class'] });
    }

    var onReduce = function () { if (reduce.matches) rest(); };
    if (reduce.addEventListener) reduce.addEventListener('change', onReduce);

    var off = function () {
      if (disposed) return;
      disposed = true;
      if (io) io.disconnect();
      if (mo) mo.disconnect();
      if (finePointer) {
        host.removeEventListener('mouseenter', enter);
        host.removeEventListener('mouseleave', leave);
      }
      host.removeEventListener('focusin', focusIn);
      host.removeEventListener('focusout', focusOut);
      if (reduce.removeEventListener) reduce.removeEventListener('change', onReduce);
      if (!video.paused) video.pause();
      video.__coverReelOff = null;
    };
    video.__coverReelOff = off;
    return off;
  }

  window.CoverReel = CoverReel;

  function mountAll() {
    var vids = document.querySelectorAll('video[data-cover-reel]');
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      var host = (v.closest && v.closest('[data-cover-host]')) || v.parentElement;
      CoverReel(v, host, { activeClass: 'is-scroll-active' });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})();
