/*
  About decks: "The Set". Framework-free, window globals only, like wordmark.js.

  The About overlay opens on two of Lucy's VJ loops, deck A under deck B, and a crossfader
  decides how much of B shows (deck B's opacity is the fader value f, so the visible shares
  are mix(f) = { a: 1 - f, b: f }). On a fine pointer the fader follows the pointer across
  the stage, eased; anyone can drag it, and it is a real range input, so arrow keys and
  screen readers work. After 3s without input it drifts on its own. The loop strip in
  "Between sets" cues a loop into the deck that is mostly hidden, then glides over to it,
  so there is never a visible hard cut.

  Cheap on purpose:
    - nothing loads before About opens: decks and strip images carry data-src until the
      first resume();
    - only the two decks decode video; the strip shows poster stills;
    - the glow behind the screen is a tiny canvas upscaled by CSS, redrawn every 4th frame,
      on wide screens only. Never put a CSS blur filter on it (a filter re-rasterised per
      redraw was the gem chapter's stutter risk);
    - the frame loop runs only while the overlay is open and the stage is on screen.

  AboutDecksMount(root) -> { pause, resume, dispose, state }. Mounting the same root again
  returns the same handle. root is the About section; parts are found by class.
  window.AboutDecks = { mix, cueTarget, driftAt, DRIFT_PERIOD } are pure, for tests.
*/
(function () {
  var EASE = 0.12;          // per-frame glide of the fader toward its target
  var IDLE_MS = 3000;       // this long without input and the fader drifts on its own
  var CUE_HOLD_MS = 6000;   // after cueing a loop, hold on it this long before drifting
  var DRIFT_PERIOD = 9000;  // ms for one full sway A -> B -> A
  var GLOW_EVERY = 4;       // redraw the glow every Nth frame
  var GLOW_W = 24, GLOW_H = 15;
  var GLOW_BLUR = 'blur(1.6px)';   // inside the tiny canvas: smooths the upscale, costs nothing

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function mix(f) { f = clamp01(f); return { a: 1 - f, b: f }; }
  function cueTarget(f) { return f < 0.5 ? 'b' : 'a'; }
  function driftAt(t) { return 0.5 - 0.5 * Math.cos((t / DRIFT_PERIOD) * Math.PI * 2); }

  function mq(q) {
    try { return window.matchMedia ? window.matchMedia(q) : null; } catch (e) { return null; }
  }
  function play(v) {
    try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }

  function AboutDecksMount(root) {
    var noop = { pause: function () {}, resume: function () {}, dispose: function () {}, state: function () { return {}; } };
    if (!root) return noop;
    if (root.__decks) return root.__decks;

    var stage = root.querySelector('.about-stage');
    var decks = { a: root.querySelector('.about-deck-a'), b: root.querySelector('.about-deck-b') };
    var fader = root.querySelector('.about-fader-input');
    var glow = root.querySelector('.about-glow');
    var bins = [].slice.call(root.querySelectorAll('.about-bin-btn') || []);
    if (!stage || !decks.a || !decks.b || !fader) return noop;

    var rm = mq('(prefers-reduced-motion: reduce)');
    var reduce = !!(rm && rm.matches) ||
      !!(document.documentElement && document.documentElement.classList.contains('reduce-motion'));
    var fp = mq('(pointer: fine)');
    var fine = !!(fp && fp.matches);
    var wide = mq('(min-width: 900px)');

    var f = clamp01(parseFloat(fader.value));
    if (isNaN(f)) f = 0.35;
    var target = f;
    var lastInput = 0, drifting = false, driftOffset = 0;
    var running = false, visible = true, loaded = false, dragging = false;
    var raf = 0, frameN = 0;
    var ctx = null;
    var posters = { a: null, b: null };

    if (glow && glow.getContext) {
      try {
        glow.width = GLOW_W; glow.height = GLOW_H; ctx = glow.getContext('2d');
        if (ctx && 'filter' in ctx) ctx.filter = GLOW_BLUR;
      } catch (e) { ctx = null; }
    }

    function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

    function posterFor(deck) {
      var url = decks[deck].dataset.poster;
      if (!url || typeof Image === 'undefined') return null;
      var img = new Image();
      img.src = url;
      return img;
    }

    function drawGlow() {
      if (!ctx || !(wide && wide.matches)) return;
      try {
        ctx.clearRect(0, 0, GLOW_W, GLOW_H);
        var shares = mix(f);
        ['a', 'b'].forEach(function (k) {
          var src = decks[k].readyState >= 2 ? decks[k] : (posters[k] && posters[k].complete ? posters[k] : null);
          if (!src) return;
          // Deck A is drawn whole, deck B over it at f: the same stacking the screen uses.
          ctx.globalAlpha = k === 'a' ? 1 : shares.b;
          ctx.drawImage(src, 0, 0, GLOW_W, GLOW_H);
        });
        ctx.globalAlpha = 1;
      } catch (e) {}
    }

    function render() {
      decks.b.style.opacity = f.toFixed(3);
      if (!dragging) fader.value = String(+f.toFixed(3));
      stage.style.setProperty('--about-mix', f.toFixed(3));
    }

    function frame() {
      raf = 0;
      if (!running || !visible) return;
      var t = now();
      if (!dragging && t - lastInput > IDLE_MS) {
        if (!drifting) {
          drifting = true;
          // Start the sway from where the fader already is, so idling never jumps.
          driftOffset = (Math.acos(1 - 2 * clamp01(f)) / (Math.PI * 2)) * DRIFT_PERIOD - t;
        }
        target = driftAt(t + driftOffset);
      }
      f += (target - f) * EASE;
      if (Math.abs(target - f) < 0.0005) f = target;
      render();
      if (++frameN % GLOW_EVERY === 0) drawGlow();
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && running && visible && !reduce) raf = requestAnimationFrame(frame); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    function touch(hold) { lastInput = now() + (hold || 0); drifting = false; }

    function onMove(e) {
      if (dragging || e.target === fader) return;
      var r = stage.getBoundingClientRect();
      if (!r.width) return;
      target = clamp01((e.clientX - r.left) / r.width);
      touch();
      start();
    }
    function onInput() {
      f = target = clamp01(parseFloat(fader.value) || 0);
      touch();
      render();
      if (reduce) drawGlow();
    }
    function onDown() { dragging = true; touch(); }
    function onUp() { dragging = false; touch(); }

    function markBins() {
      bins.forEach(function (b) {
        var s = b.dataset.src;
        b.dataset.deck = s === decks.a.dataset.src ? 'a' : s === decks.b.dataset.src ? 'b' : '';
      });
    }
    function load(deck, src, poster) {
      var v = decks[deck];
      v.dataset.src = src;
      if (poster) { v.dataset.poster = poster; v.poster = poster; posters[deck] = posterFor(deck); }
      if (loaded) { v.src = src; if (running && visible && !reduce) play(v); }
    }
    function onBin(e) {
      var b = e.currentTarget || e.target;
      var src = b.dataset.src;
      var deck = src === decks.a.dataset.src ? 'a' : src === decks.b.dataset.src ? 'b' : null;
      if (!deck) { deck = cueTarget(f); load(deck, src, b.dataset.poster); }
      target = deck === 'a' ? 0 : 1;
      touch(CUE_HOLD_MS);
      markBins();
      if (reduce) { f = target; render(); drawGlow(); }
      else start();
    }

    // First resume: attach the real sources. Until then nothing downloads.
    function attach() {
      if (loaded) return;
      loaded = true;
      ['a', 'b'].forEach(function (k) {
        var v = decks[k];
        if (v.dataset.poster) v.poster = v.dataset.poster;
        if (v.dataset.src) v.src = v.dataset.src;
        posters[k] = posterFor(k);
      });
      bins.forEach(function (b) {
        var img = b.querySelector && b.querySelector('img');
        if (img && img.dataset && img.dataset.src && !img.src) img.src = img.dataset.src;
      });
    }

    var io = null;
    if (typeof IntersectionObserver !== 'undefined') {
      try {
        io = new IntersectionObserver(function (es) {
          visible = es[es.length - 1].isIntersecting;
          if (!running) return;
          if (visible) { if (!reduce) { play(decks.a); play(decks.b); } start(); }
          else { decks.a.pause(); decks.b.pause(); stop(); }
        }, { threshold: 0 });
        io.observe(stage);
      } catch (e) { io = null; }
    }

    fader.addEventListener('input', onInput);
    fader.addEventListener('pointerdown', onDown);
    fader.addEventListener('pointerup', onUp);
    fader.addEventListener('pointercancel', onUp);
    bins.forEach(function (b) { b.addEventListener('click', onBin); });
    if (fine && !reduce) stage.addEventListener('pointermove', onMove);

    markBins();
    render();

    var handle = {
      resume: function () {
        attach();
        running = true;
        if (!reduce && visible) { play(decks.a); play(decks.b); }
        touch();
        start();
        drawGlow();
      },
      pause: function () {
        running = false;
        stop();
        try { decks.a.pause(); decks.b.pause(); } catch (e) {}
      },
      dispose: function () {
        handle.pause();
        try { if (io) io.disconnect(); } catch (e) {}
        fader.removeEventListener('input', onInput);
        fader.removeEventListener('pointerdown', onDown);
        fader.removeEventListener('pointerup', onUp);
        fader.removeEventListener('pointercancel', onUp);
        bins.forEach(function (b) { b.removeEventListener('click', onBin); });
        stage.removeEventListener('pointermove', onMove);
        root.__decks = null;
      },
      state: function () { return { f: f, target: target, running: running, visible: visible }; },
    };
    root.__decks = handle;
    return handle;
  }

  window.AboutDecks = { mix: mix, cueTarget: cueTarget, driftAt: driftAt, DRIFT_PERIOD: DRIFT_PERIOD };
  window.AboutDecksMount = AboutDecksMount;
})();
