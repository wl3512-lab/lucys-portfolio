/* Case studies: the grid and the spreads (CLAUDE.md, "Case studies: the grid and the spreads (2026-10-25)").
   habitabull.html and case-study.html open on a one-screen grid whose tiles are real links to the spreads below.
   This script only adds what links and <details> cannot do on their own:
   - Jumps. A link to a spread (or to something inside one) scrolls there, smoothly or at once under reduced motion,
     opens the fold the target lives in, and moves focus to the spread's heading. The URL keeps the hash.
   - Folds. "+ Read more" is a plain <details>, closed as shipped. A details[data-fold="phone"] is the project pages'
     phone fold (his-screen.js, gallery-wall.js), generalised: open on laptops, where its summary is hidden, folded on
     phones until the reader opens it; a fold the reader touched is left alone.
   - The full-size viewer. Every screenshot in a spread is a link to its file; with the script it opens in a modal
     window at its own pixels or smaller, never larger. Escape, ESC or a click outside closes it; focus returns.
   - The rise. As a spread first arrives its pictures come up 16px, once. Never under reduced motion, and never for
     a spread already on screen when the page loads.
   - The film (Driftwood). It plays only when the reader presses Play, once through, and pauses off screen or in a
     hidden tab. Nothing on these pages runs on a timer: every change answers a click, a key or a scroll arrival.
   Plain JS, no build: window.CaseSpreads. */
(function (root) {
  'use strict';
  var api = {};

  // The viewer's rule: the picture at its own size, or scaled down to fit the box. Never scaled up.
  api.fitWithin = function (nw, nh, maxW, maxH) {
    if (!(nw > 0 && nh > 0)) return { w: 0, h: 0 };
    var k = Math.min(1, maxW / nw, maxH / nh);
    return { w: Math.round(nw * k), h: Math.round(nh * k) };
  };

  // What a hash points at: the element, the spread (or the file band) it belongs to, the folds to open, where to
  // scroll and what to focus. A target inside a closed fold scrolls to its spread, so the claim is in view.
  api.resolve = function (doc, id) {
    var t = id && doc.getElementById(id);
    if (!t) return null;
    var block = t.closest('.cx-spread, .cx-file, .cx-say, .cx-lessons');
    var folds = [], d = t.closest('details');
    if (t.tagName === 'DETAILS') folds.push(t);
    while (d) { if (folds.indexOf(d) < 0) folds.push(d); d = d.parentElement && d.parentElement.closest('details'); }
    var focusId = t.getAttribute('data-cx-focus');
    if (!block) return { target: t, block: t, folds: folds, scroll: t, focus: (focusId && doc.getElementById(focusId)) || t };
    var focus = (focusId && doc.getElementById(focusId)) || (t.matches('h1, h2, h3') ? t : block.querySelector('.cx-h, .cx-file-h'));
    // Scroll to the spread, so its heading (which takes focus) is in view; only a target that names its own focus
    // (the walkthrough, the film) is scrolled to itself.
    var own = !!(focusId && doc.getElementById(focusId)) && !(folds.length > 0 && t !== block);
    return { target: t, block: block, folds: folds, scroll: own ? t : block, focus: focus };
  };

  if (!root || !root.document) { if (typeof module !== 'undefined') module.exports = api; return; }
  var doc = root.document;
  var mq = function (q) { return root.matchMedia ? root.matchMedia(q) : { matches: false }; };
  var reduce = mq('(prefers-reduced-motion: reduce)'), phone = mq('(max-width: 760px)');
  var listen = function (m, fn) { if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); };

  // ── folds ──
  api.folds = function () {
    var ds = [].slice.call(doc.querySelectorAll('details[data-fold="phone"]'));
    ds.forEach(function (d) { var s = d.querySelector('summary'); if (s) s.addEventListener('click', function () { d.__touched = true; }); });
    function apply() { ds.forEach(function (d) { if (!phone.matches) d.open = true; else if (!d.__touched) d.open = false; }); }
    apply(); listen(phone, apply);
    return ds.length;
  };

  // ── jumps ──
  api.jump = function (id, opts) {
    var r = api.resolve(doc, id);
    if (!r) return false;
    opts = opts || {};
    r.folds.forEach(function (d) { d.open = true; d.__touched = true; });
    r.scroll.scrollIntoView({ behavior: opts.instant || reduce.matches ? 'auto' : 'smooth', block: 'start' });
    if (r.focus && !opts.noFocus) {
      if (!r.focus.hasAttribute('tabindex')) r.focus.setAttribute('tabindex', '-1');
      try { r.focus.focus({ preventScroll: true }); } catch (e) { r.focus.focus(); }
    }
    return r;
  };
  function onClick(e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-cx-zoom') || !a.closest('[data-case-spreads]')) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!id || !doc.getElementById(id)) return;
    e.preventDefault();
    if (api.jump(id) && root.history && root.history.pushState && root.location.hash !== '#' + id) root.history.pushState(null, '', '#' + id);
  }
  function fromHash(instant) {
    var id = root.location.hash && decodeURIComponent(root.location.hash.slice(1));
    if (id) api.jump(id, { instant: instant, noFocus: instant });
  }

  // ── the full-size viewer ──
  var zoom, zImg, zCap, zFrom = null;
  function buildZoom() {
    zoom = doc.createElement('dialog');
    zoom.className = 'cx-zoom';
    zoom.setAttribute('aria-labelledby', 'cx-zoom-t');
    zoom.innerHTML = '<div class="cx-zoom-in"><div class="cx-zoom-box"><div class="cx-zoom-bar"><p class="cx-zoom-t" id="cx-zoom-t" tabindex="-1">FULL SIZE</p>' +
      '<button type="button" class="cx-esc" aria-label="Close (Escape)">ESC</button></div><div class="cx-zoom-media"><img alt="" decoding="async"></div><p class="cx-zoom-cap"></p></div></div>';
    (doc.querySelector('.cx') || doc.body).appendChild(zoom);
    zImg = zoom.querySelector('img'); zCap = zoom.querySelector('.cx-zoom-cap');
    zoom.querySelector('.cx-esc').addEventListener('click', function () { zoom.close(); });
    zoom.addEventListener('click', function (e) { if (e.target === zoom) zoom.close(); });
    zoom.addEventListener('close', function () {
      zImg.removeAttribute('src');
      if (zFrom && zFrom.isConnected) zFrom.focus();
      zFrom = null;
    });
  }
  api.openZoom = function (a) {
    if (!zoom) buildZoom();
    if (typeof zoom.showModal !== 'function') return false;
    var img = a.querySelector('img'), fig = a.closest('figure, .cx-step'), cap = fig && fig.querySelector('figcaption, .cx-step-c');
    zFrom = a;
    zImg.src = a.getAttribute('href');
    zImg.alt = img ? img.alt : '';
    if (img && img.getAttribute('width')) { zImg.width = +img.getAttribute('width'); zImg.height = +img.getAttribute('height'); }
    zCap.textContent = cap ? cap.textContent.replace(/\s+/g, ' ').trim() : (img ? img.alt : '');
    zoom.showModal();
    zoom.querySelector('.cx-zoom-t').focus();
    return true;
  };
  function onZoomClick(e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('a[data-cx-zoom]');
    if (!a) return;
    if (api.openZoom(a)) e.preventDefault();
  }

  // ── the one-time rise ──
  function rise(main) {
    if (reduce.matches || !('IntersectionObserver' in root)) return;
    var spreads = [].slice.call(main.querySelectorAll('.cx-spread'));
    var vh = root.innerHeight || 800;
    spreads.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) s.classList.add('is-in'); });
    main.classList.add('cx-rise');
    var io = new root.IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    spreads.forEach(function (s) { if (!s.classList.contains('is-in')) io.observe(s); });
  }

  // ── the hero trailer: plays itself, muted, 2 s after the page opens (Lucy, 2026-11-11: "remove play the trailer
  // button everywhere, tailer should auto play after 2 seconds on hero"). Once through, then it rests on its end card.
  // Its native controls stay, so it can be paused and unmuted; once the reader pauses or plays it, it is theirs.
  // Paused off screen and in a hidden tab; never under reduced motion.
  api.FILM_DELAY = 2000;
  api.film = function (video) {
    video.muted = true; video.loop = false; video.autoplay = false; video.controls = true;
    if (reduce.matches) return { sync: function () {} };
    var visible = !('IntersectionObserver' in root), started = false, theirs = false, ours = false;
    try { video.preload = 'auto'; } catch (e) {}
    function sync() {
      if (!started || theirs || video.ended) return;
      if (!visible || doc.hidden) { if (!video.paused) { ours = true; video.pause(); } }
      else if (video.paused) { ours = true; var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    }
    ['play', 'pause'].forEach(function (t) { video.addEventListener(t, function () { if (ours) { ours = false; return; } if (started) theirs = true; }); });
    if (!visible) new root.IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1]; visible = e.isIntersecting && e.intersectionRatio >= 0.3; sync();
    }, { threshold: [0, 0.3, 1] }).observe(video);
    doc.addEventListener('visibilitychange', sync);
    root.setTimeout(function () { started = true; sync(); }, api.FILM_DELAY);
    return { sync: sync, get started() { return started; }, get theirs() { return theirs; } };
  };

  function boot() {
    var main = doc.querySelector('[data-case-spreads]');
    if (!main) return;
    api.folds();
    doc.addEventListener('click', onZoomClick);
    doc.addEventListener('click', onClick);
    root.addEventListener('hashchange', function () { fromHash(false); });
    [].forEach.call(doc.querySelectorAll('video[data-cx-film]'), function (v) {
      v.__cxFilm = api.film(v);
    });
    rise(main);
    if (root.location.hash) fromHash(true);
    root.__caseSpreads = api;
  }
  root.CaseSpreads = api;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : null);
