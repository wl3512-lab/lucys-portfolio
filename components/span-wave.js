/*
  SpanWave — the Capabilities trail, drawn as a signal that wakes up.

  Replaces the 1px axis rule, the gradient trail and the dot playhead with one canvas. The
  signal exists only behind the head: ahead of it there is nothing, so scrolling generates
  the trail rather than uncovering a line that was already there.

  Amplitude follows pow(x, 1.8), not a linear ramp: linear reads as a wedge, this hugs the
  axis through the upstream capabilities and only tears open near the booth. Roughness rises
  with it, so the signal gets rougher as well as taller.

  window.SpanWave.mount(host, opts) -> { setPlay, stop, dispose }
  Plain JS, no deps, canvas 2D. Same shape as letter-glitch.js / reveal-field.js.
*/
(function (root) {
  'use strict';

  function mount(host, opts) {
    opts = opts || {};
    var doc = root.document;
    if (!host || !doc) return null;

    var canvas = doc.createElement('canvas');
    canvas.className = 'span-wave';
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;
    host.appendChild(canvas);

    var accent = opts.accent || '#72ADFF';
    var hot    = opts.hot    || '#C8DEFF';
    // A fixed band around the axis, NOT a fraction of the host. The host is the full
    // .span-list (~425px), so a proportional amplitude would drive the signal through the
    // capability labels sitting above and below the rule. Caught in the preview harness,
    // which was short enough to hide the problem.
    var AMP = opts.amp || 34;
    var W = 0, H = 0, dpr = 1;
    var play = 0, t0 = 0, raf = 0, stopped = false, visible = true;

    var now = function () {
      return (root.performance && root.performance.now) ? root.performance.now() : Date.now();
    };

    function layout() {
      var r = host.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      W = r.width; H = Math.max(2, r.height);
      dpr = Math.min(2, root.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      canvas.style.pointerEvents = 'none';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    // Deterministic value noise, so the signal is the same shape every load and does not
    // shimmer randomly between frames.
    function vnoise(x) {
      var i = Math.floor(x), f = x - i;
      function h(n) { n = (n << 13) ^ n; return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824; }
      var a = h(i), b = h(i + 1);
      var u = f * f * (3 - 2 * f);
      return a * (1 - u) + b * u;
    }

    // One sample of the signal at x in 0..1. env is the wake-up curve; roughness rides it,
    // so the far end is not merely louder but broken up.
    function sample(x, tt) {
      var env = Math.pow(x, 1.55);
      var v = 0;
      // Low swell is always present, so the upstream end is a quiet ripple rather than the
      // dead-flat rule this is replacing.
      v += Math.sin(x * 20 + tt * 1.4) * 0.30;
      // Everything above rides the envelope, so the far end is rougher, not merely louder.
      v += Math.sin(x * 57  - tt * 2.2) * 0.42 * env;
      v += Math.sin(x * 139 + tt * 3.5) * 0.34 * env;
      v += Math.sin(x * 317 - tt * 5.1) * 0.24 * env * env;
      v += vnoise(x * 88 + tt * 2.6) * 0.95 * env * env;
      return v * (0.22 + env);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var mid = H / 2;
      var amp = AMP;
      var tt = (now() - t0) * 0.001;
      var headX = Math.max(0, Math.min(1, play)) * W;
      if (headX < 1) return;

      // The walked signal. Brightness ramps toward the head so the trail reads as travelled
      // rather than uniformly lit.
      var step = 1.5;
      ctx.lineWidth = 1.25;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      var grad = ctx.createLinearGradient(0, 0, headX, 0);
      grad.addColorStop(0, 'rgba(114,173,255,0.18)');
      grad.addColorStop(0.72, accent);
      grad.addColorStop(1, hot);
      ctx.strokeStyle = grad;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      for (var px = 0; px <= headX; px += step) {
        var x = px / W;
        var y = mid - sample(x, tt) * amp;
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();

      // A brighter segment chasing the head, the same device outline-wordmark.js uses on
      // the loader stroke.
      var chase = Math.min(headX, W * 0.06);
      if (chase > 2) {
        ctx.beginPath();
        ctx.strokeStyle = hot;
        ctx.lineWidth = 1.7;
        ctx.shadowBlur = 10;
        for (var qx = headX - chase; qx <= headX; qx += step) {
          var x2 = qx / W;
          var y2 = mid - sample(x2, tt) * amp;
          if (qx <= headX - chase) ctx.moveTo(qx, y2); else ctx.lineTo(qx, y2);
        }
        ctx.stroke();
      }

      // The head itself.
      var hy = mid - sample(headX / W, tt) * amp;
      ctx.shadowBlur = 14;
      ctx.fillStyle = hot;
      ctx.beginPath();
      ctx.arc(headX, hy, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function frame() {
      if (stopped) return;
      raf = root.requestAnimationFrame(frame);
      if (!visible) return;
      draw();
    }

    var ro = null, io = null;
    try {
      ro = new root.ResizeObserver(function () { if (layout()) draw(); });
      ro.observe(host);
    } catch (e) {}
    try {
      io = new root.IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 });
      io.observe(host);
    } catch (e) {}

    if (!layout()) { try { host.removeChild(canvas); } catch (e) {} return null; }
    t0 = now();
    if (opts.still) { draw(); } else { raf = root.requestAnimationFrame(frame); }

    return {
      setPlay: function (p) { play = p; },
      redraw: draw,
      stop: function () { stopped = true; try { root.cancelAnimationFrame(raf); } catch (e) {} },
      dispose: function () {
        stopped = true;
        try { root.cancelAnimationFrame(raf); } catch (e) {}
        try { if (ro) ro.disconnect(); } catch (e) {}
        try { if (io) io.disconnect(); } catch (e) {}
        try { if (canvas.parentElement === host) host.removeChild(canvas); } catch (e) {}
      }
    };
  }

  root.SpanWave = { mount: mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
