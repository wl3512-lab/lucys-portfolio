/* global React */
/*
 * Story playback for the phone layouts of Standout work (Spotlight.jsx) and Capabilities
 * (PhoneCapabilities.jsx). Lucy, 2026-10-28: "standout work is easy to scroll by on phone and miss
 * tats its interactove", "and capablities tpop", "i dont liek th eprevious and continue and skip".
 * She picked story style for both: they play on their own while on screen, under a thin bar of equal
 * segments that fills like an Instagram story; tap the right side for next and the left for back (a
 * swipe works too); the reader scrolls on to leave. Since 2026-10-31 desktop Capabilities plays this way too (Skills.jsx,
 * Lucy: "One screen, plays itself"): it holds the clock while the creature's entry plays (opts.hold) and shows each
 * stop's name under its segment (StoryBar's `names`).
 *
 * - StoryClock: the pure parts (tap zones, gestures, the clock, when it may run). Node-tested in
 *   tests/story-bar.test.js.
 * - useStory(opts): the hook. The section keeps its own index; the hook times it, asks for the next
 *   item (select(i, 'auto')) and stops on the last. It runs only while the watched box is at least
 *   60% on screen, the tab is visible, About is closed, the reader has not paused it, is not holding
 *   the visual and has no keyboard focus in the section, and motion is allowed. Coming back resumes
 *   where it was. The fills are written straight to the DOM each frame, never through React.
 * - StoryBar: the segments (each a 44px-tall button with a 2px line) and the pause button.
 *
 * Plain JS like use-in-view.js: needs the React global and loads before the components.
 */
(function (root) {
  'use strict';
  var TAP_SPLIT = 0.4;   // the left 40% goes back, the right 60% goes on
  var SWIPE_MIN = 48;    // px sideways before a drag counts as a swipe
  var TAP_SLOP = 12;     // px a tap may wander
  var HOLD_MS = 240;     // a press longer than this holds the story instead of tapping
  var IN_VIEW = 0.6;     // share of the watched box (or of the screen, if the box is taller) on screen
  var MAX_DT = 100;      // ms; a stalled frame never skips a segment

  function zone(x, left, width) { return x - left < width * TAP_SPLIT ? -1 : 1; }
  // A finished press: 'tap', 1 or -1 for a sideways swipe (a swipe left goes on), or 0 (a hold, a scroll, a wobble).
  function gesture(dx, dy, held) {
    if (held) return 0;
    var ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax >= SWIPE_MIN && ax > ay * 1.2) return dx < 0 ? 1 : -1;
    if (ax <= TAP_SLOP && ay <= TAP_SLOP) return 'tap';
    return 0;
  }
  // One frame: the clock grows by dt; at the duration it asks for the next item, or on the last it stops full.
  function tick(elapsed, dt, duration, index, count) {
    var e = elapsed + Math.max(0, Math.min(dt, MAX_DT));
    if (e < duration) return { elapsed: e, next: -1, finished: false };
    if (index < count - 1) return { elapsed: 0, next: index + 1, finished: false };
    return { elapsed: duration, next: -1, finished: true };
  }
  // `hold` is the section's own wait (desktop Capabilities holds the clock while the creature's entry plays).
  function running(s) {
    return !!(s.enabled && s.count > 1 && !s.reduced && s.inView && !s.hidden && !s.paused && !s.held && !s.hold && !s.focused && !s.finished);
  }
  // How much of a box is on screen, against the smaller of its height and the screen's.
  function inViewFraction(top, bottom, viewH) {
    var h = bottom - top;
    if (h <= 0 || viewH <= 0) return 0;
    return Math.max(0, Math.min(bottom, viewH) - Math.max(top, 0)) / Math.min(h, viewH);
  }
  // Each segment's fill: past full, the current one by its clock, future empty. Reduced motion shows position only.
  function fillOf(i, index, frac, reduced) { return i < index ? 1 : i > index ? 0 : reduced ? 1 : Math.max(0, Math.min(1, frac)); }

  var clock = { TAP_SPLIT: TAP_SPLIT, SWIPE_MIN: SWIPE_MIN, TAP_SLOP: TAP_SLOP, HOLD_MS: HOLD_MS, IN_VIEW: IN_VIEW, MAX_DT: MAX_DT,
    zone: zone, gesture: gesture, tick: tick, running: running, inViewFraction: inViewFraction, fillOf: fillOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = clock;
  if (!root) return;
  root.StoryClock = clock;

  var pausedById = {};   // the pause button's state lasts for the visit, across remounts
  var INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="tab"], [role="link"]';
  function reducedNow() {
    return !!((root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('reduce-motion'));
  }
  function hiddenNow() { return !!(document.hidden || document.body.classList.contains('about-locked')); }
  function keyboardFocus(el) { try { return !!el && el.matches(':focus-visible'); } catch (e) { return false; } }

  // opts: { id, count, index, select(i, how), duration (ms), enabled, watchRef (the box that must be on screen),
  // rootRef (keyboard focus in here holds it) }
  function useStory(opts) {
    var R = React;
    var count = opts.count, index = opts.index, duration = opts.duration || 6000;
    var enabled = !!opts.enabled && count > 1;
    var pausedState = R.useState(function () { return !!pausedById[opts.id]; }), paused = pausedState[0], setPaused = pausedState[1];
    var heldState = R.useState(false), held = heldState[0], setHeld = heldState[1];
    var viewState = R.useState(false), inView = viewState[0], setInView = viewState[1];
    function sectionHidden() { var el = opts.rootRef && opts.rootRef.current; return hiddenNow() || !!(el && el.inert); }
    var hiddenState = R.useState(sectionHidden), hidden = hiddenState[0], setHidden = hiddenState[1];
    var focusState = R.useState(false), focused = focusState[0], setFocused = focusState[1];
    var finState = R.useState(false), finished = finState[0], setFinished = finState[1];
    var redState = R.useState(reducedNow), reduced = redState[0], setReduced = redState[1];
    var fills = R.useRef([]), elapsed = R.useRef(0), autoTo = R.useRef(-1), prev = R.useRef(index), live = R.useRef('polite');
    var press = R.useRef(null), latest = R.useRef(null);
    latest.current = { index: index, count: count, duration: duration, select: opts.select, reduced: reduced, hold: !!opts.hold };

    // Who changed the item? Decided while rendering, so the live region's politeness lands in the same commit as
    // the new content: off for the clock, polite for the reader (WCAG: no chatter during autoplay).
    if (prev.current !== index) { live.current = autoTo.current === index ? 'off' : 'polite'; autoTo.current = -1; prev.current = index; }

    function paint() {
      var L = latest.current, els = fills.current;
      for (var i = 0; i < L.count; i++) {
        if (els[i]) els[i].style.transform = 'scaleX(' + fillOf(i, L.index, elapsed.current / L.duration, L.reduced).toFixed(4) + ')';
      }
    }
    function restart() { elapsed.current = 0; setFinished(false); paint(); }
    function go(dir) {
      var L = latest.current, t = L.index + dir;
      if (t < 0 || t >= L.count) restart(); else L.select(t, 'user');
    }
    // A segment (or Home / End) is a jump, which the section may treat apart from "next"; while the section holds the
    // clock (desktop Capabilities' entry) even the current item is a real choice, not a restart.
    function jump(i) { var L = latest.current; if (i === L.index && !L.hold) restart(); else L.select(i, 'jump'); }
    function toggle() {
      if (finished && !paused) { latest.current.select(0, 'user'); return; }   // at the end the button replays
      pausedById[opts.id] = !paused; setPaused(!paused);
    }

    // A new item starts its clock from zero.
    R.useLayoutEffect(function () { elapsed.current = 0; setFinished(false); paint(); }, [index]);
    R.useLayoutEffect(paint, [count, reduced, enabled]);

    var hold = !!opts.hold;
    var run = running({ enabled: enabled, count: count, reduced: reduced, inView: inView, hidden: hidden, paused: paused, held: held, hold: hold, focused: focused, finished: finished });
    R.useEffect(function () {
      if (!run) return;
      var raf = 0, last = performance.now();
      function frame(now) {
        var L = latest.current, t = tick(elapsed.current, now - last, L.duration, L.index, L.count);
        last = now; elapsed.current = t.elapsed;
        if (t.next >= 0) { autoTo.current = t.next; L.select(t.next, 'auto'); return; }
        paint();
        if (t.finished) { setFinished(true); return; }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return function () { cancelAnimationFrame(raf); };
    }, [run, index]);

    // On screen: at least 60% of the watched box, or of the screen when the box is taller than it.
    R.useEffect(function () {
      if (!enabled) { setInView(false); return; }
      var el = opts.watchRef && opts.watchRef.current;
      if (!el) return;
      if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
      var th = []; for (var i = 0; i <= 20; i++) th.push(i / 20);
      var io = new IntersectionObserver(function (entries) {
        var e = entries[entries.length - 1], r = e.boundingClientRect, vh = e.rootBounds ? e.rootBounds.height : innerHeight;
        setInView(e.isIntersecting && inViewFraction(r.top, r.bottom, vh) >= IN_VIEW - 0.001);
      }, { threshold: th });
      io.observe(el);
      return function () { io.disconnect(); };
    }, [enabled]);

    // A hidden tab or About on top holds it; so does the reduced-motion preference.
    R.useEffect(function () {
      if (!enabled) return;
      var mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
      function sync() { setHidden(sectionHidden()); setReduced(reducedNow()); }
      sync();
      document.addEventListener('visibilitychange', sync);
      document.addEventListener('lucy:scene-visibility', sync);
      if (mq && mq.addEventListener) mq.addEventListener('change', sync);
      return function () {
        document.removeEventListener('visibilitychange', sync);
        document.removeEventListener('lucy:scene-visibility', sync);
        if (mq && mq.removeEventListener) mq.removeEventListener('change', sync);
      };
    }, [enabled]);

    // Keyboard focus inside the section holds it (the pause button excepted), so nothing moves under a keyboard user.
    R.useEffect(function () {
      var el = opts.rootRef && opts.rootRef.current;
      if (!enabled || !el) return;
      function into(e) { setFocused(keyboardFocus(e.target) && !(e.target.classList && e.target.classList.contains('story-pause'))); }
      function out(e) { if (!el.contains(e.relatedTarget)) setFocused(false); }
      el.addEventListener('focusin', into); el.addEventListener('focusout', out);
      return function () { el.removeEventListener('focusin', into); el.removeEventListener('focusout', out); setFocused(false); };
    }, [enabled]);

    // The visual: tap right for next and left for back, swipe sideways, press and hold to pause. Links and
    // buttons keep their own taps. A vertical drag is the page's scroll (touch-action: pan-y), so it cancels.
    function endPress(navigate, e) {
      var p = press.current; press.current = null;
      if (!p) return;
      clearTimeout(p.timer);
      if (p.held) setHeld(false);
      if (!navigate || !e || p.id !== e.pointerId) return;
      var kind = gesture(e.clientX - p.x, e.clientY - p.y, p.held);
      if (kind === 'tap') { var b = e.currentTarget.getBoundingClientRect(); go(zone(e.clientX, b.left, b.width)); }
      else if (kind) go(kind);
    }
    var gestures = {
      onPointerDown: function (e) {
        var own = e.target.closest ? e.target.closest(INTERACTIVE) : null;
        if ((e.pointerType === 'mouse' && e.button !== 0) || (own && own !== e.currentTarget && e.currentTarget.contains(own))) return;
        endPress(false);
        var p = { x: e.clientX, y: e.clientY, id: e.pointerId, held: false, timer: 0 };
        p.timer = setTimeout(function () { p.held = true; setHeld(true); }, HOLD_MS);
        press.current = p;
        if (e.pointerType !== 'touch') { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} }   // a touch is already captured to its target; capturing it again can keep iOS Safari from scrolling (Lucy, 2026-10-29: "its so hard to scroll in mobile now")
      },
      onPointerMove: function (e) {
        var p = press.current;
        if (p && !p.held && p.id === e.pointerId && (Math.abs(e.clientX - p.x) > TAP_SLOP || Math.abs(e.clientY - p.y) > TAP_SLOP)) clearTimeout(p.timer);
      },
      onPointerUp: function (e) { endPress(true, e); },
      onPointerCancel: function () { endPress(false); },
      onContextMenu: function (e) { e.preventDefault(); },   // a long press is a hold, never the image menu
    };
    R.useEffect(function () { return function () { if (press.current) clearTimeout(press.current.timer); }; }, []);

    var state = run ? 'playing' : !enabled ? 'off' : reduced ? 'still' : paused ? 'paused' : finished ? 'done' : held ? 'held' : hold && inView ? 'intro' : 'waiting';
    if (enabled) {   // a read-only view for the browser checks (scripts/story-check.mjs)
      root.__stories = root.__stories || {};
      root.__stories[opts.id] = { index: index, count: count, state: state, inView: inView, live: live.current, elapsed: function () { return elapsed.current; }, duration: duration };
    } else if (root.__stories) delete root.__stories[opts.id];
    return { enabled: enabled, index: index, count: count, reduced: reduced, paused: paused, finished: finished, state: state,
      inView: inView, hidden: hidden,
      live: live.current, fills: fills.current, go: go, jump: jump, restart: restart, toggle: toggle, gestures: gestures };
  }

  function icon(kind) {
    var h = React.createElement;
    return h('svg', { viewBox: '0 0 10 12', 'aria-hidden': 'true', focusable: 'false' }, kind === 'pause'
      ? [h('rect', { key: 'a', x: 1, y: 0, width: 3, height: 12, fill: 'currentColor' }), h('rect', { key: 'b', x: 6, y: 0, width: 3, height: 12, fill: 'currentColor' })]
      : h('polygon', { points: '1,0 10,6 1,12', fill: 'currentColor' }));
  }
  // props: { story, labels: one name per item, label: the group's name, className, names: show each name under its
  // segment, numbered (desktop Capabilities, 2026-10-31: all five visible and clickable at once) }
  function StoryBar(props) {
    var s = props.story, h = React.createElement;
    if (!s || !s.enabled) return null;
    var replay = s.finished && !s.paused;
    return h('div', { className: 'story-bar' + (props.names ? ' has-names' : '') + (props.className ? ' ' + props.className : ''), role: 'group', 'aria-label': props.label, 'data-story': s.state },
      h('div', { className: 'story-segs' }, props.labels.map(function (name, i) {
        return h('button', { key: i, type: 'button', className: 'story-seg', 'aria-label': name, 'aria-current': i === s.index ? 'step' : undefined, onClick: function () { s.jump(i); } },
          h('i', { 'aria-hidden': 'true', ref: function (el) { s.fills[i] = el; } }),
          props.names ? h('span', { className: 'story-name', 'aria-hidden': 'true' }, h('b', null, (i < 9 ? '0' : '') + (i + 1)), ' ' + name) : null);
      })),
      s.reduced ? null : h('button', { type: 'button', className: 'story-pause', 'aria-label': replay ? 'Play again from the start' : s.paused ? 'Play' : 'Pause', onClick: s.toggle },
        icon(s.paused || replay ? 'play' : 'pause')));
  }

  root.useStory = useStory;
  root.StoryBar = StoryBar;
})(typeof window !== 'undefined' ? window : null);
