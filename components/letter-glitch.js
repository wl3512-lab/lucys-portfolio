/*
  LetterGlitch — scrambling letter grid (canvas 2D, no deps).
  Adapted from React Bits (https://reactbits.dev) to a framework-free enhancer for the
  plain-HTML pages: any <div data-letter-glitch ...> becomes a LetterGlitch background.
  Vignettes use the brand void colour (not black) so it blends. Honors prefers-reduced-motion
  (renders one static frame). Also exposes window.LetterGlitchMount(container, opts) -> dispose.

  Optional `decode: true` layers a second visual mode on top of the base scramble: columns
  fall from above the grid, hot-marking the cell they pass over with a fresh character, heat
  decays over the following frames, and a per-frame brightness wave sweeps the whole grid so
  it reads as a field resolving into focus rather than random static. Off by default, and
  when off the engine's behaviour is unchanged from the plain scramble.
*/
(function () {
  'use strict';
  var FONT = 16, CW = 10, CH = 20;
  var VOID = '5,7,16';

  function LetterGlitchMount(container, opts) {
    opts = opts || {};
    var glitchColors = (opts.glitchColors && opts.glitchColors.length) ? opts.glitchColors : ['#141930', '#1E2640', '#4A8FEF'];
    var glitchSpeed = opts.glitchSpeed != null ? opts.glitchSpeed : 60;
    var smooth = opts.smooth != null ? opts.smooth : true;
    var characters = opts.characters || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789';
    var outerVignette = opts.outerVignette != null ? opts.outerVignette : true;
    var centerVignette = !!opts.centerVignette;
    // Optional clear-map: mask(col, row) -> 0..1, 1 = fully cleared. Cells are drawn at
    // alpha (1 - mask) and skipped below 0.04. Absent, the engine is unchanged.
    var mask = typeof opts.mask === 'function' ? opts.mask : null;
    var reduced = false; try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    // Decode streaks (see file header). Off unless asked for.
    var decode = !!opts.decode;
    var spawnMs = opts.spawnMs != null ? opts.spawnMs : 300;
    // Optional injections so a test can drive the frame loop and clock by hand instead of a
    // real requestAnimationFrame/Date.now. Mirrors reveal-field.js's raf/caf/now pattern.
    var raf = opts.raf || function (fn) { return requestAnimationFrame(fn); };
    var caf = opts.caf || function (id) { cancelAnimationFrame(id); };
    var now = opts.now || Date.now;

    var charset = characters.split('');
    var canvas = document.createElement('canvas');
    canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.height = '100%';
    container.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var letters = [], grid = { columns: 0, rows: 0 }, lastGlitch = now(), rafId = 0, disposed = false;
    // Decode-only state: streaks in flight and a frame counter for the brightness wave.
    var decodeStreaks = [], lastSpawn = now(), frame = 0;

    function rndChar() { return charset[Math.floor(Math.random() * charset.length)]; }
    function rndColor() { return glitchColors[Math.floor(Math.random() * glitchColors.length)]; }
    function hexToRgb(hex) {
      hex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, function (m, r, g, b) { return r + r + g + g + b + b; });
      var r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null;
    }
    function lerp(s, e, f) {
      return 'rgb(' + Math.round(s.r + (e.r - s.r) * f) + ',' + Math.round(s.g + (e.g - s.g) * f) + ',' + Math.round(s.b + (e.b - s.b) * f) + ')';
    }
    function initLetters(c, r) {
      grid = { columns: c, rows: r };
      var n = c * r; letters = [];
      for (var i = 0; i < n; i++) letters.push({ char: rndChar(), color: rndColor(), targetColor: rndColor(), colorProgress: 1, heat: 0 });
      // A streak's column index points into the old grid; a resize invalidates it.
      decodeStreaks = [];
    }
    function resize() {
      var dpr = window.devicePixelRatio || 1;
      var rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initLetters(Math.ceil(rect.width / CW), Math.ceil(rect.height / CH));
      draw();
    }

    function spawnDecodeStreak() {
      decodeStreaks.push({
        col: (Math.random() * grid.columns) | 0,
        row: -2,
        speed: 0.6 + Math.random() * 0.6
      });
    }
    // Advances every streak, hot-marks the cell under its head with a fresh character, drops
    // streaks once they run off the bottom, and decays heat on every cell. Spawns a new
    // streak every `spawnMs` on the same clock as `lastGlitch`.
    function stepDecode(t) {
      if (t - lastSpawn >= spawnMs) { spawnDecodeStreak(); lastSpawn = t; }
      for (var i = decodeStreaks.length - 1; i >= 0; i--) {
        var st = decodeStreaks[i];
        st.row += st.speed;
        var r = Math.floor(st.row);
        if (r >= 0 && r < grid.rows) {
          var idx = r * grid.columns + st.col;
          if (letters[idx]) { letters[idx].heat = 1; letters[idx].char = rndChar(); }
        }
        if (st.row >= grid.rows + 2) decodeStreaks.splice(i, 1);
      }
      for (var j = 0; j < letters.length; j++) letters[j].heat *= 0.955;
    }

    function draw(t) {
      if (!letters.length) return;
      var rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.font = FONT + 'px monospace'; ctx.textBaseline = 'top';
      for (var i = 0; i < letters.length; i++) {
        var col = i % grid.columns, row = Math.floor(i / grid.columns);
        var maskAlpha = 1;
        if (mask) {
          // A throwing mask disables itself and redraws unmasked, rather than freezing tick().
          try { maskAlpha = 1 - mask(col, row); } catch (e) { mask = null; ctx.globalAlpha = 1; draw(t); return; }
        }
        if (decode) {
          var wave = 0.82 + 0.18 * Math.sin((col + row) * 0.18 - frame * 0.03);
          var base = maskAlpha * wave;
          if (base < 0.04) continue;
          var heat = letters[i].heat;
          ctx.globalAlpha = Math.min(1, base + heat);
          ctx.fillStyle = heat > 0.6 ? '#F6FAFF' : heat > 0.12 ? '#A0C8FF' : letters[i].color;
        } else {
          if (mask) {
            if (maskAlpha < 0.04) continue;
            ctx.globalAlpha = maskAlpha;
          }
          ctx.fillStyle = letters[i].color;
        }
        ctx.fillText(letters[i].char, col * CW, row * CH);
      }
      if (mask || decode) ctx.globalAlpha = 1;
    }
    function update() {
      var cnt = Math.max(1, Math.floor(letters.length * 0.05));
      for (var i = 0; i < cnt; i++) {
        var idx = Math.floor(Math.random() * letters.length);
        if (!letters[idx]) continue;
        letters[idx].char = rndChar();
        letters[idx].targetColor = rndColor();
        if (!smooth) { letters[idx].color = letters[idx].targetColor; letters[idx].colorProgress = 1; }
        else letters[idx].colorProgress = 0;
      }
    }
    function smoothT() {
      var redraw = false;
      for (var i = 0; i < letters.length; i++) {
        var l = letters[i];
        if (l.colorProgress < 1) {
          l.colorProgress += 0.05; if (l.colorProgress > 1) l.colorProgress = 1;
          var s = hexToRgb(l.color), e = hexToRgb(l.targetColor);
          if (s && e) { l.color = lerp(s, e, l.colorProgress); redraw = true; }
        }
      }
      return redraw;
    }
    function tick() {
      if (disposed) return;
      var t = now();
      var needsDraw = false;
      if (t - lastGlitch >= glitchSpeed) { update(); needsDraw = true; lastGlitch = t; }
      if (smooth && smoothT()) needsDraw = true;
      if (decode) { stepDecode(t); frame++; needsDraw = true; }
      // Combine all state updates before painting, rather than repainting for each effect.
      if (needsDraw) draw(t);
      rafId = raf(tick);
    }

    function vignette(bg) {
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:' + bg + ';';
      container.appendChild(d);
    }
    if (outerVignette) vignette('radial-gradient(circle, rgba(' + VOID + ',0) 55%, rgba(' + VOID + ',1) 100%)');
    if (centerVignette) vignette('radial-gradient(circle, rgba(' + VOID + ',0.85) 0%, rgba(' + VOID + ',0) 60%)');

    resize();
    var ro = new ResizeObserver(function () { resize(); });
    ro.observe(container);
    if (!reduced) rafId = raf(tick);

    return function () {
      disposed = true; caf(rafId);
      try { ro.disconnect(); } catch (e) {}
      try { if (canvas.parentElement === container) container.removeChild(canvas); } catch (e) {}
    };
  }
  window.LetterGlitchMount = LetterGlitchMount;
  window.LetterGlitchCell = { w: CW, h: CH };

  function init() {
    var nodes = document.querySelectorAll('[data-letter-glitch]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.__lg) continue; el.__lg = true;
      var colors = (el.getAttribute('data-colors') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      LetterGlitchMount(el, {
        glitchColors: colors.length ? colors : undefined,
        glitchSpeed: parseFloat(el.getAttribute('data-speed')) || undefined,
        smooth: el.getAttribute('data-smooth') !== 'false',
        outerVignette: el.getAttribute('data-outer-vignette') !== 'false',
        centerVignette: el.getAttribute('data-center-vignette') === 'true'
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ── Loader boot backdrop ───────────────────────────────────────────────
  // Self-contained: mounts a decoding letter grid into #ll-glitch and tears down on the
  // loader's existing 'loader:exit' event. Never touches the loader IIFE or its guards.
  // When RevealField is present (reveal-field.js, loaded before this file) the grid is
  // masked by its clear-map: the pointer wipes it, and a noise dissolve clears it on the
  // spec's timing. If RevealField is absent or throws, this is exactly the old loader.
  // Own named IIFE so its locals (llField, disposeGlitch, ...) aren't retained on the
  // outer file IIFE's closure once boot finishes.
  (function bootLoaderGlitch() {
    try {
      var llReduced = false;
      try { llReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      var llLoader = document.getElementById('ll-loader');
      var llHost = document.getElementById('ll-glitch');
      // Repeat visits (window.__loaderFast, set by the loader IIFE) run the same sequence on a
      // compressed clock: the counter is 1.5s instead of 2.6s, so the dissolve runs 0.4s to 1.3s.
      var llFast = !!window.__loaderFast;
      if (llLoader && llHost && !llReduced && !document.body.classList.contains('loader-done')) {
        var llField = null;
        try {
          if (typeof window.RevealFieldMount === 'function') {
            var coarse = false;
            try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}
            llField = window.RevealFieldMount(llLoader, { cw: CW, ch: CH, radius: coarse ? 150 : 200, healMs: 5000, edge: 1.7 });
          }
        } catch (e) { llField = null; try { console.warn('[Loader] RevealField failed, running without wipe', e); } catch (_) {} }

        // Mount inside its own try: if it throws, dispose whatever field we already made and
        // rethrow to the outer catch instead of leaving an orphaned field with no teardown.
        var disposeGlitch;
        try {
          disposeGlitch = LetterGlitchMount(llHost, {
            glitchColors: ['#141930', '#1E2640', '#1E2640', '#4A8FEF', '#4A8FEF', '#72ADFF'],
            glitchSpeed: 80,
            smooth: true,
            // The boot screen is the one moment the grid is the whole page rather than a
            // backdrop behind something being read, which is the only place a decode read
            // earns its attention. Other pages keep the plain scramble.
            decode: true,
            spawnMs: 260,
            // The centre vignette sits above #ll-mark and is not part of the clear-map, so with
            // a field it would keep the revealed name dim. It only exists to keep the old gradient
            // name legible over the grid, which the no-field path still needs.
            centerVignette: !llField,
            outerVignette: true,
            mask: llField ? llField.sample : undefined
          });
        } catch (e) {
          try { if (llField) llField.dispose(); } catch (_) {}
          throw e;
        }

        // Listener goes on immediately after a successful mount, so a later throw (e.g. from
        // dissolve) can never leave the frame loop running with no teardown path.
        window.addEventListener('loader:exit', function () {
          try { if (llField) llField.stop(); } catch (e) {}
          // CSS fades #ll-glitch out (#ll-loader.is-done #ll-glitch); dispose after the transition.
          setTimeout(function () {
            try { if (disposeGlitch) disposeGlitch(); } catch (e) {}
            try { if (llField) llField.dispose(); } catch (e) {}
            disposeGlitch = null; llField = null;
          }, 700);
        }, { once: true });

        try { if (llField) llField.dissolve(250, 950); } catch (e) {}   /* clears before the outline traces on (850-1650ms) */
      }
    } catch (e) { try { console.warn('[Loader] glitch boot failed', e); } catch (_) {} }
  })();
})();
