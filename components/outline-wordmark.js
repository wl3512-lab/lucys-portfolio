/*
  OutlineWordmark: the loader's "lucy liu" drawn as a gradient outline on a canvas
  (#ll-mark) that sits beneath the LetterGlitch grid, with a faint starfield and a few
  stars pinned to the glyph strokes. Revealed where the glitch is wiped or dissolved.

  window.OutlineWordmark.sampleEdgePoints(alpha, W, H, step, count, random) -> pure, tested
  window.OutlineWordmarkMount(loader, opts) -> canvas + frame loop; returns { stop, dispose }

  Position and font come from an anchor element (.ll-rm-name) so the drawn name lands where
  the hidden text sits and the sub-line below it keeps its layout.
  Plain JS, no ESM, no deps. Self-mounts into #ll-loader like letter-glitch.js does.
*/
(function (root) {
  'use strict';
  var GRAD = ['#A0C8FF', '#C4B0FF', '#8EC4FF'];   // the site's Atmospheric Light gradient
  var CLOUD = '#F6FAFF';

  // Pick `count` random pixels that are opaque and have a transparent 4-neighbour.
  function sampleEdgePoints(alpha, W, H, step, count, random) {
    random = random || Math.random;
    var on = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && alpha[y * W + x] > 128; };
    var edge = [];
    for (var y = 0; y < H; y += step) {
      for (var x = 0; x < W; x += step) {
        if (!on(x, y)) continue;
        if (!on(x - step, y) || !on(x + step, y) || !on(x, y - step) || !on(x, y + step)) edge.push({ x: x, y: y });
      }
    }
    var out = [];
    while (out.length < count && edge.length) {
      var i = Math.floor(random() * edge.length);
      var p = edge.splice(i, 1)[0];
      out.push({ x: p.x, y: p.y, phase: random() * Math.PI * 2 });
    }
    return out;
  }

  function mount(loader, opts) {
    opts = opts || {};
    var doc = root.document;
    var text = opts.text || 'lucy liu';
    var anchor = opts.anchor || (doc && doc.querySelector('.ll-rm-name'));
    var drawMs = opts.drawMs || 1300;
    // Page time (performance.now) at which the outline starts tracing itself on: after the
    // glitch dissolve (1.1s to 2.3s) has mostly cleared, so the animation is seen, not buried.
    var drawStart = opts.drawStart != null ? opts.drawStart : 1600;
    var reduced = false;
    try { reduced = root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (!loader || !anchor || !doc) return null;

    var canvas = doc.createElement('canvas');
    canvas.id = 'll-mark'; canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;
    loader.appendChild(canvas);
    // has-mark goes on before the first layout(): the Playfair rules for .ll-rm-name only apply
    // under #ll-loader.has-mark, and layout() reads the anchor's computed font. dispose() removes
    // it again, so a later failure still restores the CSS gradient name.
    loader.classList.add('has-mark');

    var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, fontStr = '', fontPx = 100, sky = [], edge = [];
    var t0 = 0, rafId = 0, stopped = false, started = false, exiting = false;
    var now = function () { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); };

    function seeded(seed) { var s = seed; return function () { return (s = (s * 9301 + 49297) % 233280) / 233280; }; }

    function layout() {
      var r = loader.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      W = r.width; H = r.height; dpr = Math.min(2, root.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var ar = anchor.getBoundingClientRect();
      cx = ar.left - r.left + ar.width / 2; cy = ar.top - r.top + ar.height / 2;
      // Pivot from the same point the exit FLIP uses (top-left of .ll-rm-name), so a later
      // CSS transform on #ll-mark tracks the same transform applied to the anchor.
      canvas.style.transformOrigin = (ar.left - r.left) + 'px ' + (ar.top - r.top) + 'px';
      var cs = root.getComputedStyle(anchor);
      fontStr = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      fontPx = parseFloat(cs.fontSize) || 100;
      var rnd = seeded(9);
      sky = [];
      for (var i = 0; i < 80; i++) sky.push({ x: rnd() * W, y: rnd() * H, r: 0.6 + rnd() * 0.9, phase: rnd() * Math.PI * 2 });
      // Raster only the anchor's box (padded) to find its edges, then pin ~10 stars to them.
      var boxW = Math.ceil(ar.width + 40), boxH = Math.ceil(ar.height + 40);
      var o = doc.createElement('canvas'); o.width = boxW; o.height = boxH;
      var oc = o.getContext('2d');
      oc.font = fontStr;
      if (oc.font === '10px sans-serif') return false;   // unparseable computed font: bail rather than draw a tiny fallback name
      oc.textAlign = 'center'; oc.textBaseline = 'middle'; oc.fillStyle = '#fff';
      var localCx = boxW / 2, localCy = boxH / 2;
      oc.fillText(text, localCx, localCy);
      var data = oc.getImageData(0, 0, boxW, boxH).data;
      var alpha = new Uint8Array(boxW * boxH);
      for (var p = 0; p < alpha.length; p++) alpha[p] = data[p * 4 + 3];
      var boxOriginX = ar.left - r.left - 20, boxOriginY = ar.top - r.top - 20;
      var rawEdge = sampleEdgePoints(alpha, boxW, boxH, 6, 10, seeded(21));
      edge = rawEdge.map(function (pt) { return { x: pt.x + boxOriginX, y: pt.y + boxOriginY, phase: pt.phase }; });
      return true;
    }

    function draw(el) {
      ctx.clearRect(0, 0, W, H);                  // transparent: the loader's globe shows through
      if (!exiting) {
        for (var i = 0; i < sky.length; i++) {
          var s = sky[i];
          ctx.globalAlpha = reduced ? 0.3 : 0.22 + 0.18 * Math.sin(el * 0.0015 + s.phase);
          ctx.fillStyle = CLOUD; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      var g = ctx.createLinearGradient(W * 0.3, H * 0.4, W * 0.7, H * 0.6);
      g.addColorStop(0, GRAD[0]); g.addColorStop(0.55, GRAD[1]); g.addColorStop(1, GRAD[2]);
      ctx.font = fontStr; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // A recessed edge gives the luminous front stroke visible thickness.
      ctx.globalAlpha = reduced ? 0.22 : 0.22 * Math.min(1, Math.max(0, (now() - drawStart) / 900));
      ctx.strokeStyle = GRAD[0]; ctx.lineWidth = 2.8; ctx.lineJoin = 'round';
      ctx.strokeText(text, cx + fontPx * 0.023, cy + fontPx * 0.027);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g; ctx.lineWidth = 1.65; ctx.lineJoin = 'round';
      ctx.shadowColor = GRAD[1]; ctx.shadowBlur = 5;
      var sweep = reduced ? 1 : Math.max(0, Math.min(1, (now() - drawStart) / drawMs));
      if (sweep < 1) { ctx.globalAlpha = 0.12; ctx.strokeText(text, cx, cy); ctx.globalAlpha = 1; }
      var L = fontPx * 5;                         // ~longest single glyph contour; the offset sweeps each contour in over drawMs
      if (sweep < 1) { ctx.setLineDash([L, L]); ctx.lineDashOffset = L * (1 - sweep); ctx.strokeText(text, cx, cy); ctx.setLineDash([]); ctx.lineDashOffset = 0; } else { ctx.strokeText(text, cx, cy); }
      // A short light segment follows the lettering, separate from the base outline.
      // One extra text stroke on this existing canvas keeps the effect inexpensive.
      if (!reduced && !exiting && sweep > 0.35) {
        ctx.globalAlpha = Math.min(0.85, (sweep - 0.35) * 2);
        ctx.strokeStyle = CLOUD;
        ctx.lineWidth = 2;
        ctx.shadowColor = GRAD[0]; ctx.shadowBlur = 7;
        ctx.setLineDash([fontPx * 0.22, fontPx * 1.8]);
        ctx.lineDashOffset = -(now() - drawStart) * fontPx * 0.00045;
        ctx.strokeText(text, cx, cy);
        ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.globalAlpha = 1;
      }
      ctx.shadowBlur = 0;
      if (!exiting) {
        for (var k = 0; k < edge.length; k++) {
          var e = edge[k];
          ctx.globalAlpha = reduced ? 1 : 0.55 + 0.45 * Math.sin(el * 0.003 + e.phase);
          ctx.fillStyle = CLOUD; ctx.beginPath(); ctx.arc(e.x, e.y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    var api = {
      stop: function () { stopped = true; },
      exit: function () { exiting = true; },
      dispose: function () {
        stopped = true;
        try { root.cancelAnimationFrame(rafId); } catch (e) {}
        try { if (ro) ro.disconnect(); } catch (e) {}
        try { if (canvas.parentElement === loader) loader.removeChild(canvas); } catch (e) {}
        try { loader.classList.remove('has-mark'); } catch (e) {}
      }
    };

    // Any drawing failure disposes cleanly and leaves the loader as if this component never ran.
    function fail(e) {
      try { console.warn('[Loader] OutlineWordmark failed, keeping the gradient name', e); } catch (_) {}
      api.dispose();
      // The markup holds the gradient name back (ll-mark-pending) until the canvas has had its
      // chance. Failing IS that answer, so hand the name back now instead of leaving the loader
      // nameless until the IIFE's DOMContentLoaded check gets there.
      try { loader.classList.remove('ll-mark-pending'); } catch (_) {}
    }

    function tick() {
      if (stopped) return;
      try { draw(now() - t0); } catch (e) { return fail(e); }
      if (!reduced) rafId = root.requestAnimationFrame(tick);
    }

    var ro = null;
    try {
      ro = new root.ResizeObserver(function () {
        try {
          if (stopped || !started) return;
          var r = loader.getBoundingClientRect();
          if (r.width === W && r.height === H) return;
          if (layout()) draw(now() - t0);
        } catch (e) { fail(e); }
      });
      ro.observe(loader);
    } catch (e) {}

    // Draw once fonts are in, or after 800ms with the fallback face, whichever is first.
    function start() {
      if (started || stopped) return;
      // Never start mid-exit: the canvas would draw on while the loader is fading out.
      try { if (loader.classList.contains('is-done')) return; } catch (e) {}
      started = true;
      t0 = now();
      // A first layout that bails (zero-size loader, unparseable font) disposes too: has-mark is
      // already on, so leaving the canvas blank would hide the CSS name with nothing in its place.
      try { if (layout()) { draw(0); tick(); } else { fail('layout bailed'); } } catch (e) { fail(e); }
    }
    // Load the real face, not fonts.ready: that promise can resolve before Playfair is even
    // requested (nothing on the page has used it yet), which would draw the name in Syne.
    var face = 'italic 700 100px "Playfair Display"';
    var fontsReady = (doc.fonts && doc.fonts.load) ? doc.fonts.load(face) : Promise.resolve();
    fontsReady.then(function () {
      // If a webfont lands after the 800ms fallback already started us, re-lay-out against the
      // real face so edge stars and (under reduced motion) the static frame aren't pinned to it.
      if (stopped) return;
      if (!started) return start();
      try { if (layout()) draw(now() - t0); } catch (e) { fail(e); }
    }, start);
    setTimeout(start, 800);

    return api;
  }

  root.OutlineWordmark = { sampleEdgePoints: sampleEdgePoints };
  root.OutlineWordmarkMount = mount;
  if (typeof module !== 'undefined' && module.exports) module.exports = { sampleEdgePoints: sampleEdgePoints, mount: mount };

  // Loader boot: self-mount, like letter-glitch.js does.
  // Guarded: any throw leaves the loader exactly as it is today (.ll-rm-name visible).
  (function bootLoaderWordmark() {
    try {
      var doc = root.document;
      var loaderEl = doc && doc.getElementById && doc.getElementById('ll-loader');
      // Begin the trace as the glitch field clears.
      if (loaderEl && !(doc.body && doc.body.classList.contains('loader-done'))) {
        var wm = mount(loaderEl, { drawStart: 400, drawMs: 2400 });  /* Give the brighter trace time to read during the glitch reveal. */
        if (wm) {
          root.addEventListener('loader:exit', function () {
            // The FLIP transforms the whole canvas; stop drawing the starfield so it doesn't fly with the name.
            try { wm.exit(); } catch (e) {}
            // CSS fades #ll-mark (#ll-loader.is-done #ll-mark); stop drawing after it ends.
            setTimeout(function () { try { wm.dispose(); } catch (e) {} wm = null; }, 1100);
          }, { once: true });
        }
      }
    } catch (e) { try { console.warn('[Loader] OutlineWordmark failed, keeping the gradient name', e); } catch (_) {} }
  })();
})(typeof window !== 'undefined' ? window : globalThis);
