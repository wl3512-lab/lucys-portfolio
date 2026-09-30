/*
  RevealField — the loader's clear-map. One float per LetterGlitch cell (8 x 16 px, and passed in rather than assumed):
  0 = glitch intact, 1 = fully cleared. Written by the pointer wipe and by the timed noise
  dissolve; read by LetterGlitch through its `mask` option.

  window.RevealField.create(opts)  -> pure core, no DOM (Node-testable, exported via module.exports)
  window.RevealFieldMount(el, opts) -> binds pointer/touch + ResizeObserver + the per-frame loop

  Plain JS, no ESM, no deps (precompile invariants: every component is a window.* global).
*/
(function (root) {
  'use strict';

  function create(opts) {
    opts = opts || {};
    var cw = opts.cw || 10, ch = opts.ch || 20;
    var radius = opts.radius || 140;
    var healMs = opts.healMs || 3000;
    // Brush profile: 1 is a linear cone; higher values fully clear a core of the brush
    // (the inner (1 - 1/edge) of the radius) and keep only the rim soft.
    var edge = opts.edge || 1;
    var noiseStep = opts.noiseStep || 9;          // lattice step, in cells
    var centerBias = opts.centerBias != null ? opts.centerBias : 0.2;
    var ramp = opts.ramp || 0.18;                 // softness of the dissolve edge
    var random = opts.random || Math.random;
    var cols = 0, rows = 0, clear, pinned, noise;

    function smooth(f) { return f * f * (3 - 2 * f); }

    // Smooth value noise, bilinear between lattice points, plus a gentle centre bias so the
    // name tends to clear first. No geometric front: the dissolve happens in soft patches.
    function makeNoise() {
      var gw = Math.ceil(cols / noiseStep) + 2, gh = Math.ceil(rows / noiseStep) + 2;
      var lat = new Float32Array(gw * gh);
      for (var i = 0; i < lat.length; i++) lat[i] = random();
      var out = new Float32Array(cols * rows);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var u = c / noiseStep, v = r / noiseStep, x0 = Math.floor(u), y0 = Math.floor(v);
          var sx = smooth(u - x0), sy = smooth(v - y0);
          var n00 = lat[y0 * gw + x0], n10 = lat[y0 * gw + x0 + 1];
          var n01 = lat[(y0 + 1) * gw + x0], n11 = lat[(y0 + 1) * gw + x0 + 1];
          var n = (n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy;
          var dc = Math.hypot((c + 0.5) / cols - 0.5, (r + 0.5) / rows - 0.5) / 0.7;
          out[r * cols + c] = Math.min(1, n * (1 - centerBias) + dc * centerBias);
        }
      }
      return out;
    }

    function resize(width, height) {
      var nc = Math.max(1, Math.ceil(width / cw));
      var nr = Math.max(1, Math.ceil(height / ch));
      if (nc === cols && nr === rows) return;
      cols = nc;
      rows = nr;
      clear = new Float32Array(cols * rows);
      pinned = new Uint8Array(cols * rows);
      noise = makeNoise();
    }

    // Distance is measured to the nearest point inside the cell's rectangle (not the cell
    // centre), so a cell the brush merely grazes reads a shorter, more accurate distance.
    function paintPoint(px, py) {
      var c0 = Math.max(0, Math.floor((px - radius) / cw)), c1 = Math.min(cols - 1, Math.ceil((px + radius) / cw));
      var r0 = Math.max(0, Math.floor((py - radius) / ch)), r1 = Math.min(rows - 1, Math.ceil((py + radius) / ch));
      for (var r = r0; r <= r1; r++) {
        for (var c = c0; c <= c1; c++) {
          var cx0 = c * cw, cx1 = cx0 + cw, cy0 = r * ch, cy1 = cy0 + ch;
          var nx = Math.min(Math.max(px, cx0), cx1), ny = Math.min(Math.max(py, cy0), cy1);
          var d = Math.hypot(nx - px, ny - py);
          if (d > radius) continue;
          var i = r * cols + c, v = (1 - d / radius) * edge;
          if (v > 1) v = 1;
          if (v > clear[i]) clear[i] = v;
        }
      }
    }

    // Stamp the brush along the segment so a fast stroke leaves one continuous swipe.
    function paintStroke(x0, y0, x1, y1) {
      var seg = Math.hypot(x1 - x0, y1 - y0);
      var n = Math.max(1, Math.ceil(seg / (radius * 0.25)));
      for (var k = 1; k <= n; k++) {
        var u = k / n;
        paintPoint(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u);
      }
    }

    // k in 0..1: how far the dissolve has progressed. Cells whose noise value the rising
    // threshold has passed clear with a soft ramp; fully cleared cells are pinned and no
    // longer heal.
    function dissolve(k) {
      if (!(k > 0)) return;
      var th = Math.min(1, k) * (1 + ramp);
      for (var i = 0; i < clear.length; i++) {
        var v = (th - noise[i]) / ramp;
        if (v <= 0) continue;
        if (v > 1) v = 1;
        if (v > clear[i]) clear[i] = v;
        if (v >= 1) pinned[i] = 1;
      }
    }

    function decay(dt) {
      if (!(dt > 0)) return;
      var f = Math.exp(-dt / healMs);
      for (var i = 0; i < clear.length; i++) if (!pinned[i]) clear[i] *= f;
    }

    function sample(col, row) {
      if (col < 0 || row < 0 || col >= cols || row >= rows) return 0;
      return clear[row * cols + col];
    }

    function progress() {
      var n = 0;
      for (var i = 0; i < clear.length; i++) if (clear[i] > 0.5) n++;
      return clear.length ? n / clear.length : 0;
    }

    function size() { return { cols: cols, rows: rows }; }

    resize(opts.width || cw, opts.height || ch);
    return { resize: resize, paintPoint: paintPoint, paintStroke: paintStroke, dissolve: dissolve, decay: decay, sample: sample, progress: progress, size: size };
  }

  // DOM binding. `container` is the element that receives pointer events (the loader).
  // Optional injections (raf, caf, now, ResizeObserver) exist so the mount can run in Node.
  function mount(container, opts) {
    opts = opts || {};
    var raf = opts.raf || function (fn) { return root.requestAnimationFrame(fn); };
    var caf = opts.caf || function (id) { root.cancelAnimationFrame(id); };
    var now = opts.now || function () { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); };
    var RO = opts.ResizeObserver !== undefined ? opts.ResizeObserver : root.ResizeObserver;

    var rect = container.getBoundingClientRect();
    var field = create({ width: rect.width, height: rect.height, cw: opts.cw, ch: opts.ch, radius: opts.radius, healMs: opts.healMs, edge: opts.edge, random: opts.random });
    var last = null, stopped = false, rafId = 0, prev = 0, from = -1, to = -1;

    function move(x, y) {
      if (stopped) return;
      var r = container.getBoundingClientRect();
      x -= r.left; y -= r.top;
      if (last) field.paintStroke(last.x, last.y, x, y); else field.paintPoint(x, y);
      last = { x: x, y: y };
    }
    function leave() { last = null; }
    function onMouse(e) { move(e.clientX, e.clientY); }
    function onTouch(e) { var t = e.touches && e.touches[0]; if (t) move(t.clientX, t.clientY); }

    var touchOpts = { passive: true };
    container.addEventListener('mousemove', onMouse);
    container.addEventListener('mouseleave', leave);
    container.addEventListener('touchmove', onTouch, touchOpts);
    container.addEventListener('touchend', leave);
    container.addEventListener('touchcancel', leave);

    var ro = null;
    if (RO) {
      try {
        ro = new RO(function () { if (stopped) return; var r = container.getBoundingClientRect(); if (r.width && r.height) field.resize(r.width, r.height); });
        ro.observe(container);
      } catch (e) { ro = null; }
    }

    // `now()` is ms since navigation start (performance.now), so dissolve(1100, 2300) means
    // "from 1.1s to 2.3s of page time" regardless of when this deferred script executed.
    function tick() {
      if (stopped) return;
      var t = now();
      var dt = prev ? t - prev : 0; prev = t;
      field.decay(dt);
      if (from >= 0 && to > from) field.dissolve((t - from) / (to - from));
      rafId = raf(tick);
    }
    rafId = raf(tick);

    return {
      sample: field.sample,
      progress: field.progress,
      dissolve: function (startMs, endMs) { from = startMs; to = endMs; },
      stop: function () { stopped = true; },
      dispose: function () {
        stopped = true; caf(rafId);
        container.removeEventListener('mousemove', onMouse);
        container.removeEventListener('mouseleave', leave);
        container.removeEventListener('touchmove', onTouch, touchOpts);
        container.removeEventListener('touchend', leave);
        container.removeEventListener('touchcancel', leave);
        try { if (ro) ro.disconnect(); } catch (e) {}
      }
    };
  }

  root.RevealField = { create: create };
  root.RevealFieldMount = mount;
  if (typeof module !== 'undefined' && module.exports) module.exports = { create: create, mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
