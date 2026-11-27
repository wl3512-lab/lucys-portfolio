/*
 * His life in the hero (Lucy's pick 12 on the "Hero Poses" board, 2026-10-23: "wakes with the lights,
 * then lives there"; https://claude.ai/artifact/UXQifHN5fJaCpVF8wkJrdh).
 *
 * He dozes while the lights are down, wakes once they come up, then idles, now and then glancing at the
 * name, yawning or looking curious. The clips are the creature project's renders of his approved seated
 * drawing (docs/projects/portfolio-character/hero-poses-v1/): every clip in the cycle starts and ends on
 * the idle's frame 0, and the wake runs from the doze's frame 0 to it, so they chain with no seam. The
 * wake waits for the doze's wrap for the same reason.
 *
 * Memory: a sheet of 192 cells decodes to ~34 MB, so only the clip playing and the one after it are
 * decoded (createImageBitmap); the rest stay as compressed Blobs. Until a clip is in he shows a still
 * (asleep or awake). Reduced motion gets the awake still and fetches no sheets; Save-Data skips the extras.
 *
 *   const p = HeroCreature.create(spec, { reduced, saveData, onReady });
 *   p.tick(dt, lit) -> true when his frame changed (p.boundary: a new clip began); p.draw(ctx, x, y);
 *   p.ready(); p.moving(); p.state(); p.dispose()
 *
 * Plain script: window.HeroCreature in the browser; `step` is module.exports in Node for the tests.
 */
(function (root) {
  'use strict';
  var FPS = 24;

  // The state after one frame: { clip, frame, ci } (ci: where in spec.cycle). ready(name) says whether
  // that clip can be drawn now; gone(name) that it never will be (skipped for Save-Data, or its fetch
  // failed), so the cycle passes over it. He dozes until the lights are up and the wake and the idle are
  // in, and wakes only at the doze's wrap (with no wake, he goes straight to the idle there). A clip whose
  // successor is not in yet loops (every looping clip ends where it began); the wake, which does not
  // loop, holds its last frame, the idle's frame 0.
  function step(s, spec, lit, ready, gone) {
    var f = s.frame + 1;
    if (f < spec.clips[s.clip].frames) return { clip: s.clip, frame: f, ci: s.ci };
    if (s.clip === spec.asleep) {
      if (lit && ready(spec.wake) && ready(spec.cycle[0])) return { clip: spec.wake, frame: 0, ci: -1 };
      if (lit && gone && gone(spec.wake) && ready(spec.cycle[0])) return { clip: spec.cycle[0], frame: 0, ci: 0 };
      return { clip: s.clip, frame: 0, ci: s.ci };
    }
    var n = next(s, spec, gone);
    if (ready(n.clip)) return n;
    if (s.clip === spec.wake) return { clip: s.clip, frame: s.frame, ci: s.ci };
    return { clip: s.clip, frame: 0, ci: s.ci };
  }
  // the clip after this one (skipping extras that were never fetched)
  function next(s, spec, skip) {
    if (s.clip === spec.asleep) return { clip: spec.wake, frame: 0, ci: -1 };
    var ci = s.ci;
    for (var k = 0; k < spec.cycle.length; k++) {
      ci = (ci + 1) % spec.cycle.length;
      if (!skip || !skip(spec.cycle[ci])) return { clip: spec.cycle[ci], frame: 0, ci: ci };
    }
    return { clip: spec.cycle[0], frame: 0, ci: 0 };
  }

  function create(spec, o) {
    o = o || {};
    var CW = spec.cell[0], CH = spec.cell[1], cols = spec.cols, disposed = false;
    var stills = {}, blobs = {}, bmps = {}, decoding = {}, wanted = {}, failed = {};
    var s = o.reduced ? null : { clip: spec.asleep, frame: 0, ci: -1 }, acc = 0;
    var extras = Object.keys(spec.clips).filter(function (k) { return k !== spec.asleep && k !== spec.wake && k !== spec.cycle[0]; });
    var skip = function (name) { return o.saveData && extras.indexOf(name) >= 0; };
    var gone = function (name) { return skip(name) || !!failed[name]; };
    var api = { boundary: false };

    function still(name, src) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { if (!disposed && o.onReady) o.onReady(); };
      im.src = src; stills[name] = im;
    }
    still('awake', spec.still.awake);
    if (s) still('asleep', spec.still.asleep);

    function ready(name) { return !!bmps[name]; }
    function decode(name) {
      if (bmps[name] || decoding[name] || !blobs[name] || disposed) return;
      decoding[name] = true;
      var done = function (bm) { decoding[name] = false; if (disposed || !wanted[name]) { if (bm && bm.close) bm.close(); return; } bmps[name] = bm; };
      if (typeof createImageBitmap === 'function') createImageBitmap(blobs[name]).then(done, function () { decoding[name] = false; });
      else { var im = new Image(); im.onload = function () { done(im); }; im.src = URL.createObjectURL(blobs[name]); }
    }
    // keep the clip playing and the one after it decoded; let the rest go
    function want() {
      if (!s) return;
      var keep = {}, n = next(s, spec, gone);
      keep[s.clip] = true; keep[n.clip] = true;
      if (s.clip === spec.asleep) keep[spec.cycle[0]] = true;   // the wake hands straight to the idle
      if (s.clip === spec.wake) keep[spec.cycle[0]] = true;
      wanted = keep;
      Object.keys(bmps).forEach(function (k) { if (!keep[k]) { if (bmps[k].close) bmps[k].close(); delete bmps[k]; } });
      Object.keys(keep).forEach(decode);
    }
    // fetch the sheets in the order he needs them: the doze, the wake, the idle, then the extras
    if (s) {
      var order = [spec.asleep, spec.wake, spec.cycle[0]].concat(extras.filter(function (k) { return !skip(k); }));
      order.reduce(function (p, name) {
        return p.then(function () {
          if (disposed) return;
          return fetch(spec.clips[name].src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
            .then(function (b) { blobs[name] = b; want(); }, function () { failed[name] = true; });
        });
      }, Promise.resolve());
    }

    api.tick = function (dt, lit) {
      api.boundary = false;
      if (!s) return false;
      acc += dt;
      var changed = false;
      while (acc >= 1 / FPS) {
        acc -= 1 / FPS;
        var was = s;
        s = step(s, spec, lit, ready, gone);
        if (s.clip !== was.clip) { api.boundary = true; want(); }
        if (s.clip !== was.clip || s.frame !== was.frame) changed = true;
      }
      return changed && ready(s.clip);
    };
    api.ready = function () { return !!((s && bmps[s.clip]) || (stills[s ? 'asleep' : 'awake'] || {}).naturalWidth); };
    api.moving = function () { return !!s; };
    api.state = function () { return s ? { clip: s.clip, frame: s.frame, drawn: ready(s.clip), decoded: Object.keys(bmps) } : { clip: 'still', frame: 0, drawn: false, decoded: [] }; };
    api.draw = function (x, dx, dy) {
      if (s && bmps[s.clip]) {
        var c = s.frame, sx = (c % cols) * CW, sy = Math.floor(c / cols) * CH;
        x.drawImage(bmps[s.clip], sx, sy, CW, CH, dx, dy, CW, CH);
        return;
      }
      var im = stills[s && s.clip === spec.asleep ? 'asleep' : 'awake'];
      if (im && im.naturalWidth) x.drawImage(im, dx, dy);
    };
    api.dispose = function () {
      disposed = true; wanted = {};
      Object.keys(bmps).forEach(function (k) { if (bmps[k].close) bmps[k].close(); });
      bmps = {}; blobs = {};
    };
    return api;
  }

  var api = { FPS: FPS, step: step, next: next, create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.HeroCreature = api;
})(typeof window !== 'undefined' ? window : null);
