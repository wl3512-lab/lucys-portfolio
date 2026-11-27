/*
 * Other work (2026-11-09): on a touch screen nothing hovers, so the card whose cover is nearest the middle of the
 * screen is marked `.is-scroll-active`, which cover-reel.js treats as hovered (the site's scroll-is-hover rule).
 * Fine pointers hover instead, so this does nothing there. One rAF-throttled scroll listener; no timers.
 */
(function () {
  if (!window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var cards = [], current = null, queued = false;
  function pick() {
    queued = false;
    var mid = window.innerHeight / 2, best = null, bestD = Infinity;
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].querySelector('.ow-cover').getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      var d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = cards[i]; }
    }
    if (best && bestD > window.innerHeight * 0.4) best = null;
    if (best === current) return;
    if (current) current.classList.remove('is-scroll-active');
    if (best) best.classList.add('is-scroll-active');
    current = best;
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(pick); } }
  function start() {
    cards = Array.prototype.slice.call(document.querySelectorAll('.ow-card'));
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    queue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
