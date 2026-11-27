/* The pegboard (Lucy, 2026-10-24, from the look test https://claude.ai/artifact/SgAsktQLCPmwsn7EVhprbb: "Keep P3's
   pegboard for the still work (Handpainting, Agar Alphabet), where a frame on a wall is the honest frame").
   The work hangs in a pixel frame under its own lamp on his workshop pegboard, and he sits on the bench below, as on
   With AI's bench (workshop-bench.js). This draws the wall, the lamp's light and the bench on a canvas in the hero's
   palette and 4 x 4 Bayer grid; the frame, the work and he are the page's own markup. The work itself is never
   pixelated or recoloured.
   - The lamp flickers now and then and he blinks, both only while the wall is on screen in a visible tab, and
     neither under reduced motion. Hovering or focusing the frame turns the lamp up.
   - The frame is a button: it lifts off its hook and the work opens large in a lightbox (a modal dialog, focus moved
     in and kept there, back to the frame on close; Escape, the close button or a click outside close it). The work
     shows at its own pixel size or smaller, never larger.
   Plain JS, window.Pegboard, auto-mounts [data-pegboard]; the pure helpers are module.exports in Node
   (tests/project-templates.test.js). */
(function (root) {
  'use strict';
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16; });
  var BENCH = 55;                               // room pixels under the wall: the plank, its front and the floor
  var FLICKER = [0.8, 1, 0.88, 1], FLICKER_MS = 60;

  // The lightbox's size for a work of nw x nh in a space of aw x ah: its own pixels, or scaled down, never up.
  function fitWithin(nw, nh, aw, ah) {
    var s = Math.min(1, aw / nw, ah / nh);
    return { w: Math.max(1, Math.floor(nw * s)), h: Math.max(1, Math.floor(nh * s)), scale: s };
  }
  function u32(h) { var n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; }
  function pick(r, v, x, y) {
    v = (v < 0 ? 0 : v > 0.9999 ? 0.9999 : v) * (r.length - 1);
    var i = v | 0;
    return (v - i) > BAY[((y & 3) << 2) | (x & 3)] ? r[Math.min(i + 1, r.length - 1)] : r[i];
  }

  var api = { BENCH: BENCH, FLICKER: FLICKER, fitWithin: fitWithin };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root || !root.document) return;

  var BOARD = ['#05060f', '#090b1e', '#0e122e', '#142133', '#213452', '#2f4b75', '#3f659e', '#5283cc'].map(u32);
  var FRONT = ['#1e2033', '#2f3352'].map(u32);

  // The wall, the lamp's cone and pool, the bench and the floor, at room resolution (one room pixel is K css px).
  function paint(cv, W, H, lamp) {
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'), im = ctx.createImageData(W, H), o = new Uint32Array(im.data.buffer);
    var bt = H - BENCH, x, y, k;
    var fill = function (c, x0, y0, w, h) { c = u32(c); for (var yy = Math.max(0, y0); yy < Math.min(H, y0 + h); yy++) for (var xx = Math.max(0, x0); xx < Math.min(W, x0 + w); xx++) o[yy * W + xx] = c; };
    for (y = 0, k = 0; y < H; y++) for (x = 0; x < W; x++, k++) {
      if (y >= bt) continue;
      var v = 0.12 + 0.2 * (y / bt), t = y - lamp.y;
      if (t > 0 && y <= lamp.end) {
        var hw = 3 + 0.5 * t, dx = Math.abs(x - lamp.x);
        if (dx < hw) { var q = dx / hw; v += (lamp.on ? 0.5 : 0.36) * lamp.level * (1 - 0.65 * q * q) * (1 - 0.55 * t / (lamp.end - lamp.y)); }
      }
      if ((x % 10 === 4 || x % 10 === 5) && (y % 10 === 4 || y % 10 === 5)) v -= 0.24;   // the pegboard's holes
      o[k] = pick(BOARD, v, x, y);
    }
    // the bench he sits on and the floor, in the With AI bench's proportions
    fill('#5c649e', 0, bt, W, 2); fill('#444a75', 0, bt + 2, W, 5); fill('#1e2033', 0, bt + 7, W, 2);
    for (y = bt + 9; y < bt + 31; y++) for (x = 0; x < W; x++) o[y * W + x] = pick(FRONT, 0.85 - 0.6 * (y - bt - 9) / 22, x, y);
    fill('#090b1e', 0, bt + 31, W, BENCH - 31);
    for (y = bt + 37; y < H; y += 8) fill('#0e122e', 0, y, W, 1);
    // the lamp leaves a pool of light on the plank
    var pool = u32('#5c649e'), lx = Math.round(lamp.x), reach = 30;
    for (y = bt + 2; y < bt + 7; y++) for (x = lx - reach; x < lx + reach; x++) {
      if (x < 0 || x >= W) continue;
      var d = 1 - Math.abs(x - lx) / reach;
      if (BAY[((y & 3) << 2) | (x & 3)] < d * (lamp.on ? 0.95 : 0.62) * lamp.level) o[y * W + x] = pool;
    }
    ctx.putImageData(im, 0, 0);
  }

  // A modal dialog keeps Tab inside itself.
  function trap(dlg) {
    dlg.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [].filter.call(dlg.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !dlg.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    });
  }

  function mount(shop) {
    if (shop.__pegboard) return shop.__pegboard;
    var cv = shop.querySelector('.pg-cv'), item = shop.querySelector('.pg-item'), frame = shop.querySelector('.pg-frame');
    var shade = shop.querySelector('.pg-shade'), him = shop.querySelector('.pg-him'), art = frame && frame.querySelector('img');
    var dlg = document.querySelector('.pg-lb'), big = dlg && dlg.querySelector('.pg-lb-body img'), closeBtn = dlg && dlg.querySelector('.pt-close');
    if (!cv || !item || !frame || !shade) return null;
    var reduce = root.matchMedia('(prefers-reduced-motion: reduce)'), phone = root.matchMedia('(max-width: 760px)');
    var hover = false, level = 1, visible = true, raf = 0, flickT = 0, blinkT = 0, timers = [];
    var info = { paints: 0, flickers: 0, blinks: 0, shown: null, running: false };
    var blinkSrc = him && him.getAttribute('data-blink'), openSrc = him && him.getAttribute('src');
    if (blinkSrc) { var pre = new Image(); pre.src = blinkSrc; }

    function draw() {
      raf = 0;
      var K = parseFloat(getComputedStyle(shop).getPropertyValue('--k')) || 2;
      var cw = shop.clientWidth, ch = shop.clientHeight, W = Math.floor(cw / K), H = Math.floor(ch / K);
      if (W < 2 || H < BENCH + 2) return;
      var box = shop.getBoundingClientRect(), ox = box.left + shop.clientLeft, oy = box.top + shop.clientTop;
      var s = shade.getBoundingClientRect(), f = frame.getBoundingClientRect();
      paint(cv, W, H, { x: (s.left + s.width / 2 - ox) / K, y: (s.bottom - oy) / K, end: (f.bottom - oy) / K + 26, on: hover, level: level });
      cv.style.width = W * K + 'px'; cv.style.height = H * K + 'px';
      info.paints++;
    }
    function schedule() { if (!raf) raf = root.requestAnimationFrame(draw); }
    var alive = function () { return visible && !document.hidden && !reduce.matches; };

    // the lamp flickers gently now and then
    function flickOnce(then) {
      if (!alive()) return false;
      info.flickers++;
      FLICKER.forEach(function (lv, i) { timers.push(setTimeout(function () { level = lv; draw(); if (i === FLICKER.length - 1 && then) then(); }, i * FLICKER_MS)); });
      return true;
    }
    function flicker() {
      clearTimeout(flickT);
      if (!alive()) return;
      flickT = setTimeout(function () {
        if (dlg && dlg.open) { flicker(); return; }
        if (!flickOnce(flicker)) flicker();
      }, 3800 + Math.random() * 4200);
    }
    // he blinks
    function blink() {
      clearTimeout(blinkT);
      if (!him || !blinkSrc || !alive()) return;
      blinkT = setTimeout(function () {
        if (!alive()) { blink(); return; }
        info.blinks++;
        him.src = blinkSrc;
        setTimeout(function () { him.src = openSrc; blink(); }, 140);
      }, 2600 + Math.random() * 2400);
    }
    function wake() { timers.forEach(clearTimeout); timers = []; level = 1; info.running = alive(); flicker(); blink(); }

    frame.addEventListener('pointerenter', function () { hover = true; schedule(); });
    frame.addEventListener('pointerleave', function () { hover = false; schedule(); });
    frame.addEventListener('focus', function () { hover = true; schedule(); });
    frame.addEventListener('blur', function () { hover = false; schedule(); });

    // The lightbox: the work at its own pixels or smaller.
    function size() {
      if (!big) return;
      var nw = (art && art.naturalWidth) || +big.getAttribute('width'), nh = (art && art.naturalHeight) || +big.getAttribute('height');
      var vw = document.documentElement.clientWidth, vh = root.innerHeight;
      var aw = phone.matches ? vw - 32 - 12 - 20 : Math.min(1180, vw - 32) - 12 - 24 - 26 - 280;
      var ah = phone.matches ? vh * 0.58 : vh - 32 - 12 - 26 - 60 - 20;
      var r = fitWithin(nw, nh, Math.max(120, aw), Math.max(120, ah));
      big.style.width = r.w + 'px'; big.style.height = r.h + 'px';
      info.shown = { w: r.w, h: r.h, natural: [nw, nh] };
    }
    function open() {
      if (!dlg || dlg.open) return;
      size();
      dlg.showModal();
      if (closeBtn) closeBtn.focus();
    }
    if (dlg && typeof dlg.showModal === 'function') {
      trap(dlg);
      frame.addEventListener('click', function () {
        if (dlg.open) return;
        item.classList.remove('is-back');
        if (reduce.matches) { open(); return; }
        item.classList.add('is-down');            // it lifts off its hook, then comes down large
        setTimeout(open, 200);
      });
      if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', function () {
        item.classList.remove('is-down');
        if (!reduce.matches) { item.classList.add('is-back'); setTimeout(function () { item.classList.remove('is-back'); }, 300); }
        frame.focus();
      });
      root.addEventListener('resize', function () { if (dlg.open) size(); });
    }

    if ('IntersectionObserver' in root) new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; wake(); }).observe(shop);
    document.addEventListener('visibilitychange', wake);
    if (reduce.addEventListener) reduce.addEventListener('change', wake);
    if ('ResizeObserver' in root) new ResizeObserver(schedule).observe(shop); else root.addEventListener('resize', schedule);
    if (art && !art.complete) art.addEventListener('load', schedule, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    shop.classList.add('is-live');
    draw(); wake();
    var handle = { draw: draw, info: info, open: open, flick: function () { return flickOnce(null); }, get level() { return level; } };
    shop.__pegboard = handle;
    root.__pegboard = handle;
    return handle;
  }

  api.mount = mount;
  root.Pegboard = api;
  function boot() { [].forEach.call(document.querySelectorAll('[data-pegboard]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : null);
