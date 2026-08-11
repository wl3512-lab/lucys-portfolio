/*
  LetterGlitch — scrambling letter grid (canvas 2D, no deps).
  Adapted from React Bits (https://reactbits.dev) to a framework-free enhancer for the
  plain-HTML pages: any <div data-letter-glitch ...> becomes a LetterGlitch background.
  Vignettes use the brand void colour (not black) so it blends. Honors prefers-reduced-motion
  (renders one static frame). Also exposes window.LetterGlitchMount(container, opts) -> dispose.
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
    var reduced = false; try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    var charset = characters.split('');
    var canvas = document.createElement('canvas');
    canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.height = '100%';
    container.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var letters = [], grid = { columns: 0, rows: 0 }, lastGlitch = Date.now(), raf = 0, disposed = false;

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
      for (var i = 0; i < n; i++) letters.push({ char: rndChar(), color: rndColor(), targetColor: rndColor(), colorProgress: 1 });
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
    function draw() {
      if (!letters.length) return;
      var rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.font = FONT + 'px monospace'; ctx.textBaseline = 'top';
      for (var i = 0; i < letters.length; i++) {
        ctx.fillStyle = letters[i].color;
        ctx.fillText(letters[i].char, (i % grid.columns) * CW, Math.floor(i / grid.columns) * CH);
      }
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
      if (redraw) draw();
    }
    function tick() {
      if (disposed) return;
      var now = Date.now();
      if (now - lastGlitch >= glitchSpeed) { update(); draw(); lastGlitch = now; }
      if (smooth) smoothT();
      raf = requestAnimationFrame(tick);
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
    if (!reduced) raf = requestAnimationFrame(tick);

    return function () {
      disposed = true; cancelAnimationFrame(raf);
      try { ro.disconnect(); } catch (e) {}
      try { if (canvas.parentElement === container) container.removeChild(canvas); } catch (e) {}
    };
  }
  window.LetterGlitchMount = LetterGlitchMount;

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
  try {
    var llReduced = false;
    try { llReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var llLoader = document.getElementById('ll-loader');
    var llHost = document.getElementById('ll-glitch');
    if (llLoader && llHost && !llReduced && !document.body.classList.contains('loader-done')) {
      var disposeGlitch = LetterGlitchMount(llHost, {
        glitchColors: ['#141930', '#1E2640', '#1E2640', '#4A8FEF', '#4A8FEF', '#72ADFF'],
        glitchSpeed: 50,
        smooth: true,
        centerVignette: true,
        outerVignette: true
      });
      window.addEventListener('loader:exit', function () {
        // CSS fades #ll-glitch out (#ll-loader.is-done #ll-glitch); dispose after the transition.
        setTimeout(function () { try { if (disposeGlitch) disposeGlitch(); } catch (e) {} }, 700);
      }, { once: true });
    }
  } catch (e) {}
})();
