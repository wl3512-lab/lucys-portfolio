/*
 * The night drive's pure helpers: no DOM, no WebGL, so Node can test them
 * (tests/night-drive-math.test.js). Shared by the engine (night-drive.js) and the section
 * (Skills.jsx). Plain script: window.NightDriveMath in the browser, module.exports in Node.
 *
 * Progress `s` runs 0..1 across the pinned section. The creature's flick scrubs A0..A1, his
 * hunt runs A1..x1, the drive starts as he launches (eDrive), and the five stops sit at STOP_S.
 * Spec: docs/superpowers/specs/2026-10-21-capabilities-night-drive-design.md
 */
(function (root) {
  'use strict';

  // Where each capability's stop sits along the drive.
  var STOP_S = [0.15, 0.34, 0.52, 0.73, 0.93];
  // Nobody misses a capability: the first time the drive reaches a stop it crawls through the
  // stretch where its words read (READ_IN before to READ_OUT after) over READ_MAX seconds, down
  // to READ_MIN for someone pushing far ahead, so the brake never becomes a wait.
  var READ_IN = 0.008, READ_OUT = 0.006, READ_MAX = 1.3, READ_MIN = 0.8;
  // The drive ends here; the route hides and the film dims into the recap.
  var RECAP_S = 0.96;
  // The retired pin's length, three screens of scroll (Lucy, 2026-10-21: "way too much scrolling in capabilities"). The
  // home page no longer pins Capabilities (2026-10-31, "One screen, plays itself"); kept for the brake's tests.
  var DRIVE_SCREENS = 3;
  // The entry: the creature's action (116 frames) scrubs A0..A1, contact on frame 55, the
  // pixel flies for 24 frames, and nothing plays faster than 1.4x his own 24 fps.
  var ENTRY = { A0: 0.004, A1: 0.062, ACT: 116, CONTACT: 55, FLY: 24, TEMPO: 1.4, FPS: 24 };
  // Auto drive, in progress per second: slow at the stops, quick between them (look test 4's
  // 240 and 3440 px/s over its 5400px track).
  var AUTO_SLOW = 1400 / 5400, AUTO_FAST = 3440 / 5400;   // into and out of a stop, and between stops
  // The auto drive is the default (Lucy, 2026-10-22: "takes a lot of scroll power, sometimes feels stuck. maybe the
  // self motion should be default instead of scroll? so viewer can read and not focus on scrolling at same time"):
  // it rests AUTO_DWELL seconds at each stop, for reading, then drives on.
  var AUTO_DWELL = 1.6;
  // and plays the creature's entry this much quicker than his own pace, since nobody is pushing it
  var AUTO_ENTRY = 1.4;
  // Desktop Capabilities is one screen that plays itself (Lucy, 2026-10-31: "One screen, plays itself"): each stop holds
  // STORY_MS (the drive to it included), under the story bar (components/story-bar.js), as on phones.
  var STORY_MS = 6000;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { return x * x * (3 - 2 * x); }
  function smooth(a, b, x) { return ease(clamp01((x - a) / (b - a))); }
  function cubicBezier(x1, y1, x2, y2) {
    function bx(t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; }
    function by(t) { return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t; }
    return function (x) {
      var lo = 0, hi = 1;
      for (var i = 0; i < 30; i++) { var m = (lo + hi) / 2; if (bx(m) < x) lo = m; else hi = m; }
      return by((lo + hi) / 2);
    };
  }
  // The theme toggle's circle (AnimatedThemeToggler): the world opens with the same curve.
  var easeToggle = cubicBezier(0.22, 1, 0.36, 1);

  // The entry's timing comes from the creature's own data: how long his exit runs and the frame
  // he launches on. Nothing is pinned to one take, so a re-timed exit drops in.
  function entryTiming(exitFrames, launchFrame) {
    var A0 = ENTRY.A0, A1 = ENTRY.A1, ACT = ENTRY.ACT;
    var rate = (A1 - A0) / (ACT / ENTRY.FPS / ENTRY.TEMPO);
    var exitN = Math.max(1, (exitFrames || 76) - 1);
    var launch = launchFrame != null ? launchFrame : 62;
    var sAt = function (f) { return A0 + (f / ACT) * (A1 - A0); };
    return {
      A0: A0, A1: A1, ACT: ACT, CONTACT: ENTRY.CONTACT, FLY: ENTRY.FLY, rate: rate, exitN: exitN, launch: launch,
      eDrive: A1 + (launch / ENTRY.FPS / ENTRY.TEMPO) * rate,
      x1: A1 + (exitN / ENTRY.FPS / ENTRY.TEMPO) * rate,
      eReveal: sAt(78),
      // the reveal takes the toggle's 850ms (1100ms on phones) at the entry's pace
      revealS: function (narrow) { return (narrow ? 1.1 : 0.85) * rate; },
      sAt: sAt,
    };
  }

  // The story's drive from one stop to another, in seconds: a hop of one stop about a second and a half, a longer jump
  // at most 2.6 s, so the road still reads as a drive and a jump across all five never drags.
  function hopSeconds(from, to) { return Math.min(2.6, 1.1 + 2.2 * Math.abs(to - from)); }
  // The creature's entry plays once on its own clock, at the auto drive's pace, and ends resting at stop 1. One frame of
  // it: returns the new progress; `ent` is { au: newAuto(), brake: newBrake(), target } (newEntry()).
  function newEntry(s) { return { au: newAuto(), brake: newBrake(), target: s || 0 }; }
  function entryStep(ent, s, dt, t) {
    ent.target = Math.min(STOP_S[0], autoAdvance(ent.au, s, ent.target, dt, t));
    s = driveStep(ent.brake, s, ent.target, dt, t, true);
    return STOP_S[0] - s < 0.0005 ? STOP_S[0] : s;
  }

  // Around each stop the drive slows to about a twelfth of its pace, so a capability stays
  // readable across a good stretch of scroll; between stops it makes the time back.
  // dFromS maps progress to distance along the road (0..1); sFromD inverts it.
  function makeDwell(eDrive, n) {
    n = n || 1400;
    var dcum = new Float64Array(n + 1), i;
    for (i = 1; i <= n; i++) {
      var sx = eDrive + (i / n) * (1 - eDrive), slow = 0;
      for (var k = 0; k < STOP_S.length; k++) slow += Math.exp(-Math.pow((sx - STOP_S[k]) / 0.022, 2));
      dcum[i] = dcum[i - 1] + 1 / (1 + 11 * slow);
    }
    for (i = 0; i <= n; i++) dcum[i] /= dcum[n];
    function dFromS(s) {
      if (s <= eDrive) return 0;
      var x = Math.min(n, (s - eDrive) / (1 - eDrive) * n), j = Math.min(n - 1, Math.floor(x));
      return dcum[j] + (dcum[j + 1] - dcum[j]) * (x - j);
    }
    function sFromD(d) {
      var lo = 0, hi = n;
      while (hi - lo > 1) { var m = (lo + hi) >> 1; if (dcum[m] < d) lo = m; else hi = m; }
      return eDrive + ((lo + (d - dcum[lo]) / Math.max(1e-12, dcum[hi] - dcum[lo])) / n) * (1 - eDrive);
    }
    return { dFromS: dFromS, sFromD: sFromD };
  }

  // Stages change halfway between stops.
  var BOUND_S = [0, 1, 2, 3].map(function (i) { return (STOP_S[i] + STOP_S[i + 1]) / 2; });
  function stageAt(s) { for (var i = 3; i >= 0; i--) if (s >= BOUND_S[i]) return i + 1; return 0; }
  // How much of each stage the camera is in, for the film passes (they cross over 0.04).
  function weightsAt(s, out) {
    out = out || [0, 0, 0, 0, 0];
    for (var i = 0; i < 5; i++) {
      var a = i === 0 ? -1 : BOUND_S[i - 1], b = i === 4 ? 2 : BOUND_S[i];
      out[i] = smooth(a - 0.02, a + 0.02, s) * (1 - smooth(b - 0.02, b + 0.02, s));
    }
    return out;
  }
  // A capability lights up as you enter its stage and switches off just after its stop,
  // before you would drive over the words. The first waits for the drive itself.
  function projectorOn(i, s, w, eDrive) {
    return clamp01(w * 1.4) * (s > eDrive - 0.004 || i > 0 ? 1 : 0) * (1 - smooth(STOP_S[i] + 0.005, STOP_S[i] + 0.022, s));
  }
  // The work shows while you are at a stop and leaves with its words; never while the
  // creature is still in the air.
  function cardOn(s, t) {
    var S = STOP_S[stageAt(s)];
    return s > Math.max(t.eDrive + 0.01, t.x1) && s > S - 0.032 && s < S + 0.016;
  }
  function routeOn(s, t) { return s > t.x1 - 0.002 && s < RECAP_S; }
  // The route's fill runs between its nodes as the drive runs between the stops.
  function routeFill(s, nodeX) {
    var x = nodeX[0];
    if (s >= STOP_S[4]) x = nodeX[4];
    else if (s > STOP_S[0]) {
      var i = 0;
      while (i < 3 && s >= STOP_S[i + 1]) i++;
      x = nodeX[i] + (nodeX[i + 1] - nodeX[i]) * (s - STOP_S[i]) / (STOP_S[i + 1] - STOP_S[i]);
    }
    return Math.max(0, x - nodeX[0]);
  }
  // The creature's action frame (0..ACT) and exit frame (0..exitN) at progress s.
  function creatureFrames(s, t) {
    return { f: clamp01((s - t.A0) / (t.A1 - t.A0)) * t.ACT, e: clamp01((s - t.A1) / (t.x1 - t.A1)) * t.exitN };
  }
  function autoRate(s, t) {
    if (s < t.eDrive) return t.rate;
    var near = Infinity;
    for (var i = 0; i < STOP_S.length; i++) near = Math.min(near, Math.abs(s - STOP_S[i]));
    return AUTO_SLOW + (AUTO_FAST - AUTO_SLOW) * clamp01((near - 0.015) / 0.07);
  }

  // ── The route's end ────────────────────────────────────────────────────────────────
  // Lucy, 2026-10-22: "should transition and open in a more cohesive way after tunnel animation";
  // she picked "the lights become the columns". As the drive passes its last stop the five
  // stages' lights come up as pools on the road; as the recap rises to its landing they lift and
  // straighten into the recap's five columns, in order, the titles settle under them and the
  // kicker comes last. `e` runs 0..1 from END_S (inside the pin) to the recap's landing (on the
  // page), so it follows the scroll both ways, the auto drive's glide included.
  var END_S = 0.95;
  function endProgress(y, y0, y1) { return y1 > y0 ? clamp01((y - y0) / (y1 - y0)) : (y >= y1 ? 1 : 0); }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  // Where light i lies on the road when it comes up: five pools receding toward the vanishing
  // point, alternating sides, the first stop's nearest. Viewport px.
  function poolRect(i, W, H) {
    var z = (i + 0.8) / 5.6, kx = W / 1440, ky = H / 810;
    var w = ((1 - z) * 520 + 40) * kx, h = ((1 - z) * 110 + 10) * ky;
    var cx = W / 2 + (i % 2 ? 1 : -1) * (1 - z) * 150 * kx, cy = H - H * 0.5 * z * z * 0.92;
    return { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
  }
  // Light i at e, between its pool and its column (`col`, viewport px): its rect, how far it has
  // lifted (k), its opacity (a), and how far its column's words have settled (text).
  function endLight(i, e, pool, col) {
    var k = easeInOut(clamp01((e - 0.14 - i * 0.05) / 0.52));
    return {
      x: pool.x + (col.x - pool.x) * k, y: pool.y + (col.y - pool.y) * k,
      w: pool.w + (col.w - pool.w) * k, h: pool.h + (col.h - pool.h) * k,
      k: k, a: smooth(0, 0.1, e), text: smooth(0.6 + i * 0.05, 0.86 + i * 0.03, e),
    };
  }
  function endKick(e) { return smooth(0.84, 1, e); }

  // ── The reading brake ──────────────────────────────────────────────────────────────
  // Inside the pin the drive owns the page scroll: the visitor's wheel and touch move a target,
  // and each frame the drive chases it (look test 4's model, unchanged). Through the entry it
  // keeps the creature's pace, and the first time it reaches a stop it crawls through the
  // stretch where that stop reads. Stops already read, scrolling back and a jump from the
  // route or the recap are never held.
  // The auto drive's target for this frame: on toward the next stop at autoRate, and once the drive is resting at a
  // stop it has not rested at yet, held there for AUTO_DWELL. `au` is newAuto()'s state; the visitor's own input
  // calls freshAuto(au) so whichever stop they land on is rested at again.
  function newAuto() { return { dwelt: [false, false, false, false, false], left: 0, at: 0 }; }
  function freshAuto(au) { au.dwelt = [false, false, false, false, false]; au.left = 0; }
  function autoAdvance(au, s, target, dt, t) {
    if (au.left > 0) { au.left -= dt; return au.at; }
    var next = -1;   // the next stop ahead it has not rested at
    for (var i = 0; i < STOP_S.length; i++) if (!au.dwelt[i] && STOP_S[i] > s - 0.008) { next = i; break; }
    var nt = target + autoRate(s, t) * (s < t.eDrive ? AUTO_ENTRY : 1) * dt;
    if (next < 0 || nt < STOP_S[next]) return nt;
    // never run the target past a stop it has not rested at: wait there, then rest once the drive arrives
    if (Math.abs(s - STOP_S[next]) <= 0.008) { au.dwelt[next] = true; au.left = AUTO_DWELL; au.at = STOP_S[next]; }
    return STOP_S[next];
  }
  function newBrake() {
    return { seen: [false, false, false, false, false], jumpTo: -1 };
  }
  // One frame: returns the new progress. `target` is where the visitor has scrolled to.
  function driveStep(st, s, target, dt, t, autoDrive) {
    var ds = (target - s) * (1 - Math.exp(-dt * 5.5));
    // the entry keeps the creature's pace, up to 1.8x quicker when you are clearly pushing on,
    // and skips when you scroll past 30% of the section
    var boost = 1 + 0.8 * clamp01((target - s - 0.02) / 0.12);
    if (s < t.x1 && target < 0.3) ds = Math.max(-3 * t.rate * dt, Math.min(t.rate * (autoDrive ? AUTO_ENTRY : boost) * dt, ds));
    // an unread stop: crawl through its reading stretch, checked even mid-entry (one big step
    // can otherwise jump the first stop whole). The auto drive rests at each stop instead.
    if (ds > 0 && !autoDrive) {
      for (var i = 0; i < STOP_S.length; i++) {
        if (st.seen[i] || (st.jumpTo >= 0 && i < st.jumpTo)) continue;
        var a = STOP_S[i] - READ_IN, b = STOP_S[i] + READ_OUT;
        if (s + ds <= a || s >= b) continue;
        var crawl = (b - a) / (READ_MAX - (READ_MAX - READ_MIN) * clamp01((target - s - 0.05) / 0.3)) * dt;
        ds = s < a ? Math.min(ds, a - s + crawl) : Math.min(ds, crawl);
        break;
      }
    }
    s += ds;
    if (Math.abs(target - s) < 1e-5) s = target;
    markSeen(st, s, s === target);
    return s;
  }
  // A stop is read once the drive has passed its reading stretch, or has come to rest in it
  // (`resting`): every flick lands on a stop, where the reader has as long as they like, and
  // braking the departure as well only made the next flick sit still for half a second.
  function markSeen(st, s, resting) {
    for (var i = 0; i < STOP_S.length; i++) {
      var reached = s >= STOP_S[i] + READ_OUT || (resting && s >= STOP_S[i] - READ_IN);
      if (!st.seen[i] && reached && !(st.jumpTo >= 0 && i < st.jumpTo)) st.seen[i] = true;
    }
    if (st.jumpTo >= 0 && Math.abs(s - STOP_S[st.jumpTo]) < 0.004) st.jumpTo = -1;
  }

  var api = {
    STOP_S: STOP_S, READ_IN: READ_IN, READ_OUT: READ_OUT, READ_MAX: READ_MAX, READ_MIN: READ_MIN,
    RECAP_S: RECAP_S, DRIVE_SCREENS: DRIVE_SCREENS, ENTRY: ENTRY, STORY_MS: STORY_MS,
    hopSeconds: hopSeconds, newEntry: newEntry, entryStep: entryStep, AUTO_SLOW: AUTO_SLOW, AUTO_FAST: AUTO_FAST, AUTO_DWELL: AUTO_DWELL, BOUND_S: BOUND_S,
    newAuto: newAuto, freshAuto: freshAuto, autoAdvance: autoAdvance,
    clamp01: clamp01, ease: ease, smooth: smooth, cubicBezier: cubicBezier, easeToggle: easeToggle,
    entryTiming: entryTiming, makeDwell: makeDwell, stageAt: stageAt, weightsAt: weightsAt, projectorOn: projectorOn,
    cardOn: cardOn, routeOn: routeOn, routeFill: routeFill, creatureFrames: creatureFrames, autoRate: autoRate,
    newBrake: newBrake, driveStep: driveStep, markSeen: markSeen,
    END_S: END_S, endProgress: endProgress, easeInOut: easeInOut, poolRect: poolRect, endLight: endLight, endKick: endKick,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NightDriveMath = api;
})(typeof window !== 'undefined' ? window : null);
