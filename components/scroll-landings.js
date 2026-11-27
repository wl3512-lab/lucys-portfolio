/*
 * Scroll landings: one flick goes to the next stop, never past it (Lucy, 2026-10-21: "make scroll
 * more logical, right now it's so easy to overscroll"; she picked "land on each stop").
 *
 * The page has landings: the top of each section ([data-landing], with an optional px offset as
 * its value) and whatever a section registers (ScrollLandings.add(fn), fn returning document y
 * positions: the s0mped chapter's gag and beats). A wheel gesture may travel up to the next
 * landing in its direction; once it gets there, the rest of that gesture (a trackpad's inertia, a
 * spun mouse wheel) is absorbed. A new gesture (after a pause, a clearly harder push, or a change
 * of direction) goes on to the landing after.
 *
 * Desktop only: it owns Lenis's virtualScroll hook (phones scroll natively here, and the night
 * drive applies the same rule to its own stops for wheel and touch). Keyboard, scrollbar and
 * programmatic scrolls are never held. A section that owns its scroll registers an interceptor
 * (ScrollLandings.intercept(fn)): fn(data) returns false when it took the event, true to let it
 * through. One gesture tracker serves the page and every interceptor: a gesture belongs to
 * whoever takes its first event, and ScrollLandings.gesture() ({ wheel, fresh, owner }) tells
 * an interceptor whether the page already owns this one (then it lets it through). What an
 * interceptor lets go of in the middle of its own gesture is absorbed: it has had its landing.
 *
 * Plain script: window.ScrollLandings = { install, add, intercept, apply, landings, ... } and
 * module.exports for tests (tests/scroll-landings.test.js).
 */
(function (root) {
  'use strict';
  // A gesture continues while wheel events keep coming less than GAP ms apart, in one
  // direction, without a push FRESH times harder than its recent average. Tail events smaller
  // than TAIL px after a gap are the end of an old gesture, not the start of a new one.
  var GAP = 160, FRESH = 1.8, FRESH_MIN = 24, TAIL = 4, MERGE = 8;

  function createGesture() {
    var g = { dir: 0, lastT: -1e9, avg: 0, held: false, limit: null };
    // Is this event the start of a new gesture? Updates the running state either way.
    g.step = function (dy, now) {
      var mag = Math.abs(dy), dir = dy > 0 ? 1 : -1, gap = now - g.lastT;
      var fresh = dir !== g.dir || (gap > GAP && mag >= TAIL) || (mag > FRESH_MIN && mag > g.avg * FRESH);
      g.lastT = now;
      g.avg = fresh ? mag : g.avg * 0.7 + mag * 0.3;
      if (fresh) { g.dir = dir; g.held = false; g.limit = null; }
      return fresh;
    };
    return g;
  }
  // The next landing beyond `pos` in direction `dir` (sorted list), or null.
  function nextLanding(list, pos, dir) {
    var i;
    if (dir > 0) { for (i = 0; i < list.length; i++) if (list[i] > pos + 2) return list[i]; }
    else { for (i = list.length - 1; i >= 0; i--) if (list[i] < pos - 2) return list[i]; }
    return null;
  }
  // How much of `dy` the gesture may still travel from `pos` (0 when it must be absorbed);
  // marks the gesture held once it reaches its landing.
  function allow(g, list, pos, dy, fresh) {
    if (fresh) g.limit = nextLanding(list, pos, g.dir);
    if (g.held) return 0;
    if (g.limit == null) return dy;
    var room = (g.limit - pos) * g.dir;
    if (room <= 0.5) { g.held = true; return room > 0.01 ? room * g.dir : 0; }   // land exactly
    if (Math.abs(dy) >= room) { g.held = true; return room * g.dir; }
    return dy;
  }

  var providers = [], interceptors = [], list = [], lenis = null, prevHook = null;
  // One gesture for every wheel event on the page, whoever handles it. It belongs to whoever
  // takes its first event, the page (its landings) or a section that owns its scroll (an
  // interceptor: the night drive), and it lands once. Two trackers disagreed: a flick that
  // landed on the drive's top went on driving it with its own inertia, as a new gesture.
  var gesture = createGesture(), current = { wheel: false, fresh: false, owner: null };
  gesture.owner = null;
  function collect() {
    var ys = [], doc = typeof document !== 'undefined' ? document : null;
    if (doc && doc.querySelectorAll) {
      var els = doc.querySelectorAll('[data-landing]');
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.height || r.width) ys.push(r.top + window.scrollY + (parseFloat(els[i].getAttribute('data-landing')) || 0));
      }
    }
    providers.forEach(function (p) { try { (p() || []).forEach(function (y) { if (isFinite(y)) ys.push(y); }); } catch (e) { /* a section mid-teardown */ } });
    ys = ys.map(Math.round).filter(function (y) { return y >= 0; }).sort(function (a, b) { return a - b; });
    list = ys.filter(function (y, k) { return k === 0 || y - ys[k - 1] > MERGE; });
    return list;
  }
  // A wheel event the landings apply to: not touch (phones scroll natively), not pinch-zoom.
  function isWheel(data) {
    var ev = data.event;
    return !!data.deltaY && !(ev && ev.ctrlKey) && !(ev && ev.type && ev.type.indexOf('touch') === 0);
  }
  // when the event happened, not when it was handled: a busy page must not split a flick
  function eventTime(ev) { return (ev && ev.timeStamp) || (typeof performance !== 'undefined' ? performance.now() : Date.now()); }
  function absorb(ev) { if (ev && ev.cancelable) ev.preventDefault(); return false; }
  // The page's landing for one event of a gesture the page owns (mutates data.deltaY).
  function land(data, fresh) {
    var d = allow(gesture, list, lenis.targetScroll, data.deltaY, fresh);
    if (!d) return absorb(data.event);
    data.deltaY = d;
    return true;
  }
  // Apply the page's landings to one Lenis virtual-scroll event, asking no interceptor.
  // Returns false when the event must not scroll at all (Lenis then skips it).
  function apply(data) {
    if (!lenis || lenis.isStopped || !isWheel(data)) return true;
    var fresh = gesture.step(data.deltaY, eventTime(data.event));
    if (fresh) { gesture.owner = 'page'; collect(); }
    return land(data, fresh);
  }
  function hook(data) {
    if (prevHook && prevHook(data) === false) return false;
    var wheel = !!lenis && !lenis.isStopped && isWheel(data), fresh = false;
    if (wheel) { fresh = gesture.step(data.deltaY, eventTime(data.event)); if (fresh) gesture.owner = null; }
    current = { wheel: wheel, fresh: fresh, owner: gesture.owner };
    for (var i = 0; i < interceptors.length; i++) {
      var took;
      try { took = interceptors[i](data) === false; } catch (e) { took = false; }
      if (took) { if (wheel) gesture.owner = interceptors[i]; return false; }
    }
    if (!wheel) return true;
    // A gesture a section took and then let go of (the drive gliding out at its end onto the
    // page's next landing) has had its landing: the rest of it is absorbed, not carried on.
    if (gesture.owner && gesture.owner !== 'page') return absorb(data.event);
    if (fresh) { gesture.owner = 'page'; collect(); }
    return land(data, fresh);
  }
  function install(l) {
    if (!l || lenis === l) return;
    lenis = l;
    prevHook = l.options.virtualScroll || null;
    l.options.virtualScroll = hook;
  }
  function add(fn) { providers.push(fn); return function () { var i = providers.indexOf(fn); if (i > -1) providers.splice(i, 1); }; }
  function intercept(fn) { interceptors.push(fn); return function () { var i = interceptors.indexOf(fn); if (i > -1) interceptors.splice(i, 1); }; }

  // What an interceptor is being asked about: { wheel, fresh, owner }, owner being null (a new
  // gesture nobody has taken yet), 'page', or the interceptor that took it.
  function currentGesture() { return current; }

  var api = {
    install: install, add: add, intercept: intercept, apply: apply, landings: collect,
    gesture: currentGesture, createGesture: createGesture, nextLanding: nextLanding, allow: allow,
    GAP: GAP,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ScrollLandings = api;
})(typeof window !== 'undefined' ? window : null);
