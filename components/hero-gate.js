/*
 * The hero gate: the home page does not scroll until the hero is up (Lucy, 2026-10-29: "also make it so the hero screen
 * has to fuly load before scroll cna be actvated incase ppl scroll to standout work before hero").
 *
 * The opening already hid the body's overflow, but Lenis comes in as soon as React mounts, mid-opening, and turns a
 * wheel flick into a programmatic scroll (and Scroll landings into the next stop: Standout work), behind the overlay.
 * While held: html.hero-hold hides the page's overflow and its scrollbar (intro-reel.css); wheel, one-finger touch drags
 * and the scroll keys are taken before Lenis sees them; a section hash (index.html#skills) is taken off the URL and put
 * back when the gate opens, so the deep link lands then; the browser does not restore a reload's scroll position.
 *
 * It opens on hero:ready (Hero.jsx, once his room is lit with him in it and the lights are all the way up; at once if
 * there is no room, but never before the opening has gone), AFTER ms after the opening has gone and the page has
 * mounted if the hero never says so, and CAP ms after it began whatever happens. Never held: under reduced motion (the hero has nothing to wait for; switching to it mid-hold opens it), on
 * back and forward (the browser puts the visitor back where they were), inside About (#about still opens it at once,
 * and its own scroller scrolls), a pinch or ctrl-wheel zoom, keys typed into a control. Clicks, focus and the menu's
 * links still scroll the page: only the visitor's own scrolling and the jumps nobody asked for wait.
 *
 * Plain script, sync, right after the opening's lifecycle in index.html: window.HeroGate = { create, wanted, heldHash,
 * gate } (gate: the page's, gate.state = { held, why, hash }) and module.exports for tests (tests/hero-gate.test.js).
 */
(function (root) {
  'use strict';
  var AFTER = 3000, CAP = 20000;
  var KEYS = [' ', 'Spacebar', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
  var FREE = '.about-overlay, [data-lenis-prevent]';   // scrolls of their own: About and its scroller
  var OWNS_KEYS = 'input, textarea, select, button, [contenteditable=""], [contenteditable="true"], [role="tab"], [role="slider"], [role="listbox"], [role="menu"]';

  // Whether this visit is held at all.
  function wanted(o) { return !o.reduced && o.navType !== 'back_forward'; }
  // The hash that waits for the gate: a section's, never About (an overlay, it opens at once) or the skip link's target.
  function heldHash(hash) { return /^#[A-Za-z][\w-]*$/.test(hash || '') && !/^#(about|main|main-content)$/.test(hash) ? hash : ''; }

  function create(win, doc, o) {
    o = o || {};
    var later = o.setTimeout || function (f, ms) { return win.setTimeout(f, ms); };
    var cancel = o.clearTimeout || function (t) { win.clearTimeout(t); };
    var html = doc.documentElement, body = doc.body, loc = win.location, hist = win.history;
    var state = { held: false, why: '', hash: '' }, gate = { state: state, release: release };
    if (!wanted(o)) { state.why = o.reduced ? 'reduced' : 'returning'; return gate; }

    state.held = true;
    html.classList.add('hero-hold');
    var opening = body.classList.contains('intro-playing'), mounted = !!win.__appReady, heroUp = false, stall = 0, mo = null;
    var cap = later(function () { release('cap'); }, CAP);
    var restore = hist && 'scrollRestoration' in hist ? hist.scrollRestoration : '';
    if (restore) try { hist.scrollRestoration = 'manual'; } catch (e) { restore = ''; }
    var hash = heldHash(loc.hash);
    if (hash && hist && hist.replaceState) try { hist.replaceState(hist.state, '', loc.pathname + loc.search); state.hash = hash; } catch (e) {}

    // The stall clock starts once the opening has gone and the page has mounted: the hero cannot be up before both.
    function arm() { if (state.held && !stall && !opening && mounted) stall = later(function () { release('stall'); }, AFTER); }
    function watch() {
      var now = body.classList.contains('intro-playing');
      if (now && !opening) { opening = true; if (stall) { cancel(stall); stall = 0; } }
      else if (!now && opening) { opening = false; if (heroUp) release('hero'); else arm(); }
    }
    if (o.MutationObserver) { mo = new o.MutationObserver(watch); mo.observe(body, { attributes: true, attributeFilter: ['class'] }); }
    else opening = false;
    function onMounted() { mounted = true; arm(); }
    // the room says so only once the opening has gone; with no room to wait for it can say so mid-opening, and the
    // opening still has to go first
    function onHero() { heroUp = true; if (!opening) release('hero'); }
    function onMotion() { if (o.motion.matches) release('reduced'); }

    function free(t) { return !!(t && t.closest && t.closest(FREE)); }
    function onWheel(e) { if (e.ctrlKey || free(e.target)) return; e.preventDefault(); e.stopPropagation(); }   // before Lenis and the landings
    function onTouch(e) { if ((e.touches && e.touches.length > 1) || free(e.target)) return; if (e.cancelable !== false) e.preventDefault(); }
    function onKey(e) {
      if (KEYS.indexOf(e.key) < 0 || free(e.target) || (e.target && e.target.closest && e.target.closest(OWNS_KEYS))) return;
      e.preventDefault();
    }
    var grab = { capture: true, passive: false };
    win.addEventListener('wheel', onWheel, grab);
    win.addEventListener('touchmove', onTouch, grab);
    win.addEventListener('keydown', onKey, true);
    win.addEventListener('app:ready', onMounted);
    win.addEventListener('hero:ready', onHero);
    if (o.motion && o.motion.addEventListener) o.motion.addEventListener('change', onMotion);

    function release(why) {
      if (!state.held) return;
      state.held = false; state.why = why;
      html.classList.remove('hero-hold');
      cancel(cap); if (stall) cancel(stall);
      if (mo) mo.disconnect();
      win.removeEventListener('wheel', onWheel, grab);
      win.removeEventListener('touchmove', onTouch, grab);
      win.removeEventListener('keydown', onKey, true);
      win.removeEventListener('app:ready', onMounted);
      win.removeEventListener('hero:ready', onHero);
      if (o.motion && o.motion.removeEventListener) o.motion.removeEventListener('change', onMotion);
      if (restore) try { hist.scrollRestoration = restore; } catch (e) {}
      // the deep link lands now, unless the visit has gone somewhere since
      if (state.hash && !loc.hash && (win.scrollY || 0) < 2) try { loc.replace(state.hash); } catch (e) {}
    }
    arm();
    if (win.__heroReady) onHero();
    return gate;
  }

  var api = { AFTER: AFTER, CAP: CAP, KEYS: KEYS, wanted: wanted, heldHash: heldHash, create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) {
    root.HeroGate = api;
    var nav = '';
    try { nav = (performance.getEntriesByType('navigation')[0] || {}).type || (performance.navigation && performance.navigation.type === 2 ? 'back_forward' : ''); } catch (e) {}
    var motion = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
    api.gate = create(root, root.document, { reduced: !!(motion && motion.matches), navType: nav, motion: motion, MutationObserver: root.MutationObserver });
  }
})(typeof window !== 'undefined' ? window : null);
