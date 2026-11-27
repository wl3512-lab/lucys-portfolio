/* The loading screen for the pages that build a world (plain JS; loaded, not deferred, right after the #ll-loader
   markup at the top of <body>). Lucy, 2026-10-25: "put loading page everywhere that needs one ... like when i press
   top right work". On a phone connection the pages whose first screen is drawn by script showed half built for up to
   two seconds: All Work's plain grid before the drawer filed it, the With AI bench, his screen, the pegboard and the
   gallery wall with their frames empty and him popping in. They now open on the home page's short loading screen,
   caught in the spotlight (components/spotlight-opening.js, which this file fetches and which knows nothing of the
   page it is on). The case studies and the CV have their layout at the first paint, so they get none.

   This is the home page's inline lifecycle cut down to the spotlight: no heist, no replay. The markup and
   intro-reel.css show the dark screen from the first paint; a <noscript> style hides it without scripts, and if this
   file never runs it lifts by itself after 3 s (`#ll-loader.ll-page:not(.ll-js)`). The bar's last segment waits for
   the page (`__appReady`: loaded, fonts in). Reduced motion, a tab opened in the background, back and forward (the
   page is already built) and a page restored from the back-forward cache get no screen; any click or key ends it.
   While it is up the body carries `intro-playing`; at the end `loader-done` and the `loader:exit` event, which the
   pages' entrances wait for (wordmark.js, gallery-wall.js, workshop-bench.js). Checks skip it with
   `window.__noPageLoader` set before the page's scripts run. */
(function () {
  'use strict';
  var loader = document.getElementById('ll-loader');
  if (!loader) return;
  loader.classList.add('ll-js');
  var media = window.matchMedia('(prefers-reduced-motion: reduce)');
  var navEntry = (window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  var timer = 0, finishTimer = 0, outMs = 0, effects = [], held = [], oldOverflow = '';
  var body = document.body;

  function beginEffects() { effects.forEach(function (f) { try { f[0](); } catch (e) {} }); }
  function stopEffects() { effects.forEach(function (f) { try { f[1](); } catch (e) {} }); }
  function finish() {
    clearTimeout(timer); clearTimeout(finishTimer);
    stopEffects();
    var hadFocus = loader.contains(document.activeElement);
    loader.classList.remove('intro-active'); loader.classList.add('ll-gone'); loader.hidden = true;
    body.classList.remove('intro-playing');
    body.style.overflow = oldOverflow;
    held.forEach(function (el) { el.inert = false; }); held = [];
    if (hadFocus && document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.removeEventListener('keydown', keys);
  }
  // instant: Escape, the button or a click. hard: a hidden tab, reduced motion, a page from the back-forward cache.
  function exit(instant, hard) {
    if (loader.classList.contains('is-done')) { if (instant) finish(); return; }
    clearTimeout(timer); loader.classList.add('is-done');
    window.__loaderExited = true;
    body.classList.add('loader-done');
    try { window.dispatchEvent(new CustomEvent('loader:exit')); } catch (e) {}
    stopEffects();
    if (hard || media.matches || (instant && !outMs)) finish(); else finishTimer = setTimeout(finish, outMs || 200);
  }
  function keys(e) {
    if (e.key === 'Escape') { e.preventDefault(); exit(true); }
    else if (e.key === 'Tab') { e.preventDefault(); loader.querySelector('button').focus(); }
  }
  // nothing behind the screen takes focus or a click while it is up
  function hold() {
    if (!loader.classList.contains('intro-active') || loader.classList.contains('is-done')) return;
    [].forEach.call(body.children, function (el) { if (el !== loader && el.tagName !== 'SCRIPT' && !el.inert) { el.inert = true; held.push(el); } });
  }

  window.LucyIntro = {
    mount: function (begin, stop) { effects.push([begin, stop]); if (loader.classList.contains('intro-active') && !loader.classList.contains('is-done')) begin(); },
    exit: exit,
    // hold(ms, out): the engine moves the backstop to its real length; out is how long its last frame stays up
    // The screen is there to cover the page while it builds, so it never keeps a ready page waiting long: if the
    // spotlight's frames come in late (over a second) and the page is ready, it lifts at once, and in any case it is
    // gone by about 4.4 s.
    hold: function (ms, out) {
      if (out != null) outMs = out;
      if (ms == null || !loader.classList.contains('intro-active') || loader.classList.contains('is-done')) return;
      var now = performance.now();
      if (now > 1000 && window.__appReady) { exit(false); return; }
      clearTimeout(timer); timer = setTimeout(function () { exit(false); }, Math.min(ms, Math.max(600, 4400 - now)));
    },
    replay: function () {},
  };

  // No screen: reduced motion, a background tab, back or forward, a check that asked, or a script so late that the
  // CSS has already lifted the screen.
  // A repeat visit gets no loading screen (Lucy, 2026-11-24: "repeat visits shoukdnt see loader"): any page of the site
  // already seen in this tab, or arriving from another page of the site.
  var seen = false;
  try { seen = sessionStorage.getItem('lucy.page.seen') === '1' || sessionStorage.getItem('lucy.intro.heist.seen') === '1'; sessionStorage.setItem('lucy.page.seen', '1'); } catch (e) {}
  try { if (document.referrer && new URL(document.referrer).origin === location.origin) seen = true; } catch (e) {}
  var skip = seen || media.matches || document.hidden || navEntry.type === 'back_forward' || window.__noPageLoader || performance.now() > 2600;
  if (skip) { loader.classList.add('is-done'); window.__loaderExited = true; body.classList.add('loader-done'); finish(); return; }

  window.__spot = true;
  oldOverflow = body.style.overflow;
  body.style.overflow = 'hidden';
  body.classList.add('intro-playing');
  document.addEventListener('keydown', keys);
  // as soon as the page is parsed, before its deferred scripts run (DOMContentLoaded comes after them)
  if (document.readyState === 'loading') document.addEventListener('readystatechange', function once() { if (document.readyState !== 'loading') { document.removeEventListener('readystatechange', once); hold(); } }); else hold();
  loader.querySelector('button').addEventListener('click', function () { exit(true); });
  loader.addEventListener('pointerdown', function () { exit(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && loader.classList.contains('intro-active')) exit(true, true); });
  window.addEventListener('pageshow', function (e) { if (e.persisted && loader.classList.contains('intro-active')) exit(true, true); });
  if (media.addEventListener) media.addEventListener('change', function () { if (media.matches) exit(true, true); });

  // the bar fills its last segment once the page has loaded and its fonts are in
  var loaded = new Promise(function (res) { if (document.readyState === 'complete') res(); else window.addEventListener('load', res, { once: true }); });
  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([loaded, fonts]).then(function () { window.__appReady = true; }, function () { window.__appReady = true; });

  // the backstop, until the engine has its frames and asks for the bit's real length
  timer = setTimeout(function () { exit(false); }, 2400);
  var sp = document.createElement('script'); sp.async = true; sp.src = 'components/spotlight-opening.js?v=10'; document.head.appendChild(sp);
  beginEffects();
})();
