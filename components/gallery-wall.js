/* The gallery wall (Lucy, 2026-10-24, from the fine-art look test https://claude.ai/artifact/JgvdNuKo68CvThQLPZADk8:
   "F1, with two things borrowed"). Anticipation and Telnex each hang alone at eye level in his gallery, under a
   picture light, with a museum wall label beside the work and him on a bench below, looking at it.
   - This draws the room on a canvas in the hero's palette and 4 x 4 Bayer grid: the wall, the picture light and its
     cone, the frame (and Telnex's mat, as a print would have one), the skirting, the floor and the bench. The work,
     the label and the words are the page's own markup. The work is never pixelated, filtered or recoloured.
   - Look closer (and the work itself) opens the loupe on a fine pointer: the work fitted to the window, never past
     its own pixels, and a lens that shows the file's own pixels where the pointer is (arrow keys move it, Shift for
     larger steps; detail stops jump to a spot). On a touch screen it opens the 1:1 view instead (borrowed from F3: a
     lens under a finger hides what it magnifies): the file at one pixel to a CSS pixel, panned by finger, by mouse
     drag or by the arrow keys. "View 1:1" opens it on a fine pointer too. Both are modal dialogs: focus moves in and
     stays; Escape, Close or a click outside close them and focus returns to the button that opened them.
   - He is a slot, because his pose here is new and pending Lucy's pick: a sprite sheet and its JSON in
     assets/creature/gallery/ (gallery.json, the contract in readContract below and in CLAUDE.md). He plays at its fps
     only while the room is on screen in a visible tab, and holds his still frame under reduced motion.
   - The lamp comes up in three steps when the room first shows and flickers gently every 4 to 8 s, only on screen in
     a visible tab, never under reduced motion. Hovering or focusing the work turns it up.
   - The label and the statement are <details data-fold="phone">: open on laptops (their summaries are hidden there),
     folded on phones until the reader opens one.
   Plain JS, window.GalleryWall, auto-mounts [data-gallery]; the pure helpers are module.exports in Node
   (tests/project-templates.test.js). */
(function (root) {
  'use strict';
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16; });
  var FLICKER = [0.8, 1, 0.88, 1], FLICKER_MS = 60, RELIGHT = [0.12, 0.62, 1], RELIGHT_MS = 85;
  var FRAME = 3;                                   // the frame's rings, in room pixels
  var LENS = 240, LENS_PHONE = 150, PAN_STEP = 60, PAN_BIG = 240;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // The work at nw x nh in a space of aw x ah: its own pixels, or scaled down, never up (as Pegboard.fitWithin).
  function fitWithin(nw, nh, aw, ah) {
    var s = Math.min(1, aw / nw, ah / nh);
    return { w: Math.max(1, Math.floor(nw * s)), h: Math.max(1, Math.floor(nh * s)), scale: s };
  }
  // The loupe at (fx, fy) of a work shown at dw x dh: how much it magnifies, where the lens sits over the shown work
  // and where the file sits inside the lens (the file at its own pixels, centred on the point).
  function lensAt(fx, fy, nw, nh, dw, dh, D) {
    return { mag: nw / dw, x: fx * dw - D / 2, y: fy * dh - D / 2, bx: D / 2 - fx * nw, by: D / 2 - fy * nh };
  }
  // The 1:1 view's scroll to centre (fx, fy) of the file in a window of vw x vh.
  function panTo(fx, fy, nw, nh, vw, vh) {
    return { left: Math.round(clamp(fx * nw - vw / 2, 0, Math.max(0, nw - vw))), top: Math.round(clamp(fy * nh - vh / 2, 0, Math.max(0, nh - vh))) };
  }

  /* The creature slot's contract (assets/creature/gallery/gallery.json):
       { "fps": n, "cell": [w, h], "frames": n, "loop": true, "sheet": "gallery.webp", "scale": n, "anchor": [x, y] }
     plus, optional: "phoneScale" (his scale on phones, default scale), "still" (the frame shown under reduced
     motion, default 0) and "placeholder"/"source" (bookkeeping). The sheet sits in the same folder; frame i is at
     column i % cols, row floor(i / cols), with cols read from the sheet's width (floor(width / cell w)), so a
     horizontal strip and a 16-column sheet both work. "scale" is CSS px per sheet px on laptops; "anchor" is the
     point of the cell, in sheet px, that sits on the middle of the bench's seat. */
  function readContract(d) {
    var e = [], num = function (v) { return typeof v === 'number' && isFinite(v); };
    if (!d || typeof d !== 'object') return { ok: false, errors: ['not an object'] };
    var cellOk = Array.isArray(d.cell) && d.cell.length === 2 && d.cell.every(function (v) { return num(v) && v > 0 && v % 1 === 0; });
    if (!num(d.fps) || d.fps <= 0) e.push('fps');
    if (!cellOk) e.push('cell');
    if (!num(d.frames) || d.frames < 1 || d.frames % 1) e.push('frames');
    if (typeof d.loop !== 'boolean') e.push('loop');
    if (typeof d.sheet !== 'string' || !/^[a-z0-9][a-z0-9._-]*\.(webp|png)$/i.test(d.sheet)) e.push('sheet');
    if (!num(d.scale) || d.scale <= 0) e.push('scale');
    if (d.phoneScale != null && (!num(d.phoneScale) || d.phoneScale <= 0)) e.push('phoneScale');
    if (!Array.isArray(d.anchor) || d.anchor.length !== 2 || !num(d.anchor[0]) || !num(d.anchor[1]) ||
      (cellOk && (d.anchor[0] < 0 || d.anchor[0] > d.cell[0] || d.anchor[1] < 0 || d.anchor[1] > d.cell[1]))) e.push('anchor');
    if (d.still != null && (!num(d.still) || d.still % 1 || d.still < 0 || d.still >= d.frames)) e.push('still');
    return {
      ok: !e.length, errors: e, fps: d.fps, cell: d.cell, frames: d.frames, loop: d.loop, sheet: d.sheet, scale: d.scale,
      phoneScale: d.phoneScale == null ? d.scale : d.phoneScale, anchor: d.anchor, still: d.still || 0, placeholder: !!d.placeholder,
    };
  }
  function columnsOf(sheetW, c) { return Math.max(1, Math.min(c.frames, Math.floor(sheetW / c.cell[0]))); }
  function sheetFits(sheetW, sheetH, c) { var cols = Math.floor(sheetW / c.cell[0]); return cols >= 1 && sheetH >= Math.ceil(c.frames / Math.min(cols, c.frames)) * c.cell[1]; }
  function cellAt(i, cols, c) { return { x: (i % cols) * c.cell[0], y: Math.floor(i / cols) * c.cell[1] }; }
  function frameAt(ms, c) {
    if (c.frames <= 1) return 0;
    var n = Math.floor(Math.max(0, ms) * c.fps / 1000);
    return c.loop ? n % c.frames : Math.min(n, c.frames - 1);
  }
  // The floor under the wall: where the bench's seat is (px below the skirting) and how tall the floor is, so he fits
  // (his head may rise a little over the skirting, never over the frame).
  function floorOf(c, phone) {
    var s = c ? (phone ? c.phoneScale : c.scale) : (phone ? 1 : 1.5);
    var above = c ? c.anchor[1] * s : (phone ? 113 : 170);
    var seat = Math.max(phone ? 96 : 140, Math.round(above - (phone ? 20 : 30)));
    // what hangs below the seat (pose A drapes its tail over the edge) gets room too, so the room never clips him
    var below = c ? Math.ceil((c.cell[1] - c.anchor[1]) * s) + (phone ? 6 : 10) : 0;
    return { scale: s, seat: seat, height: seat + Math.max(phone ? 36 : 56, below) };
  }

  var api = { FLICKER: FLICKER, RELIGHT: RELIGHT, FRAME: FRAME, fitWithin: fitWithin, lensAt: lensAt, panTo: panTo, readContract: readContract,
    columnsOf: columnsOf, sheetFits: sheetFits, cellAt: cellAt, frameAt: frameAt, floorOf: floorOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root || !root.document) return;

  function u32(h) { var n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; }
  var C = {};
  [['void', '#05060f'], ['night', '#090b1e'], ['ink', '#0e122e'], ['slate', '#1e2033'], ['rule', '#2f3352'], ['steel', '#444a75'], ['dusk', '#5c649e'],
    ['peri', '#7681cc'], ['lav', '#94a1ff'], ['mist', '#ced6fc'], ['white', '#ecf0ff']].forEach(function (p) { C[p[0]] = u32(p[1]); });
  var GRAY = ['void', 'night', 'ink', 'slate', 'rule', 'steel', 'dusk', 'peri', 'lav', 'mist', 'white'].map(function (k) { return C[k]; });
  var PAPER = [C.mist, C.white];
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  // The room at room resolution (one room pixel is K css px): wall, picture light, frame and mat, skirting, floor, bench.
  function paint(cv, g) {
    var W = g.W, H = g.H, L = g.L;
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'), im = ctx.createImageData(W, H), o = new Uint32Array(im.data.buffer);
    var tone = function (x, y, rp, v) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      var n = rp.length - 1, t = clamp(v, 0, 1) * n, i = Math.floor(t);
      if (t - i > BAY[((y & 3) << 2) | (x & 3)]) i++;
      o[y * W + x] = rp[i > n ? n : i];
    };
    var rect = function (c, x0, y0, w, h) {
      x0 = Math.round(x0); y0 = Math.round(y0);
      for (var y = Math.max(0, y0); y < Math.min(H, y0 + Math.round(h)); y++) for (var x = Math.max(0, x0); x < Math.min(W, x0 + Math.round(w)); x++) o[y * W + x] = c;
    };
    var mat = g.mat, fr = FRAME, fx0 = g.ix0 - mat - fr, fy0 = g.iy0 - mat - fr, fx1 = g.ix1 + mat + fr, fy1 = g.iy1 + mat + fr;
    var hz = g.hz, lx = (fx0 + fx1) / 2, ly = fy0 - 8, reach = (fy1 - fy0) * 1.05 + 14, vpy = (fy0 + fy1) / 2, pw = g.phone ? 17 : 24;
    var bx0 = g.bx0, bx1 = g.bx1, by = g.by, legH = g.phone ? 9 : 11, foot = by + 5 + legH, bcx = (bx0 + bx1) / 2, brx = (bx1 - bx0) / 2 + 5;
    var x, y, v, beam = L * (g.hover ? 1.15 : 1);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var ex = (x / W - 0.5) * 2;
      if (y < hz) {
        v = 0.255 - 0.07 * Math.max(0, 1 - y / (hz * 0.25)) - 0.07 * ex * ex;
        var dy = y - ly, ax = Math.abs(x + 0.5 - lx);
        if (dy > -3) {
          var half = (fx1 - fx0) * 0.3 + Math.max(0, dy) * 0.44;
          v += beam * 0.4 * (1 - sstep(half * 0.6, half * 1.05, ax)) * Math.exp(-Math.max(0, dy) / reach);
          v += beam * 0.22 * Math.exp(-Math.hypot(ax * 0.45, dy) / 4.5);
        }
        if (x - 1 >= fx0 && x - 1 < fx1 && y - 3 >= fy0 && y - 3 < fy1) v -= 0.13 * (0.4 + 0.6 * L);   // the frame's shadow
      } else if (y <= g.floorEnd) {
        var t = (y - hz) / Math.max(1, g.floorEnd - hz), q = (x - lx) / ((fx1 - fx0) * 0.65);
        v = 0.13 + 0.05 * t - 0.05 * ex * ex + L * 0.14 * Math.exp(-q * q) * Math.exp(-t * 2);
        var dd = (y - vpy) / Math.max(1, g.floorEnd - vpy), u = (x - lx) / dd, mm = ((u % pw) + pw) % pw;
        if (Math.min(mm, pw - mm) * dd < 0.55) v -= 0.06;                                                  // the boards
        var bqx = (x - bcx) / brx, bqy = (y - foot) / 2.4;
        if (bqx * bqx + bqy * bqy < 1) v -= 0.09;                                                        // the bench's shadow
      } else v = 0.1;                                                                                     // under the label on phones
      tone(x, y, GRAY, v);
    }
    // the skirting board
    rect(C.rule, 0, hz - 3, W, 1); rect(C.slate, 0, hz - 2, W, 2); rect(C.void, 0, hz, W, 1);
    // the mat, for a print: lit from above
    if (mat) {
      for (y = g.iy0 - mat; y < g.iy1 + mat; y++) for (x = g.ix0 - mat; x < g.ix1 + mat; x++) tone(x, y, PAPER, L * (1.05 - 0.75 * (y - g.iy0 + mat) / (g.iy1 - g.iy0 + 2 * mat)));
      rect(C.mist, g.ix0 - 1, g.iy0 - 1, g.ix1 - g.ix0 + 2, 1); rect(C.mist, g.ix0 - 1, g.iy0 - 1, 1, g.iy1 - g.iy0 + 2);
    }
    // the frame: three rings, its top lit by the picture light
    var top = L > 0.5 ? C.lav : C.steel;
    var RING = [[C.steel, C.slate, C.void, C.rule], [top, C.rule, C.night, C.steel], [C.night, C.void, C.void, C.night]];
    for (var rg = 0; rg < fr; rg++) {
      var a0 = fx0 + rg, b0 = fy0 + rg, a1 = fx1 - 1 - rg, b1 = fy1 - 1 - rg, S = RING[rg];
      rect(S[3], a0, b0, 1, b1 - b0 + 1); rect(S[1], a1, b0, 1, b1 - b0 + 1);
      rect(S[0], a0, b0, a1 - a0 + 1, 1); rect(S[2], a0, b1, a1 - a0 + 1, 1);
    }
    // the picture light: its arm and hood
    var hw = Math.max(8, Math.round((fx1 - fx0) * 0.2));
    rect(C.slate, lx - 1, ly, 2, fy0 - ly); rect(C.steel, lx - 1, ly, 1, fy0 - ly);
    rect(C.rule, lx - hw, ly - 3, hw * 2, 1); rect(C.steel, lx - hw, ly - 2, hw * 2, 1);
    rect(L > 0.5 ? C.white : C.dusk, lx - hw + 1, ly - 1, hw * 2 - 2, 1);
    // the bench
    rect(C.dusk, bx0, by, bx1 - bx0, 1); rect(C.steel, bx0, by + 1, bx1 - bx0, 1);
    rect(C.rule, bx0, by + 2, bx1 - bx0, 2); rect(C.slate, bx0, by + 4, bx1 - bx0, 1);
    [bx0 + 3, bx1 - 6].forEach(function (lgx) { rect(C.slate, lgx, by + 5, 3, legH); rect(C.rule, lgx, by + 5, 1, legH); });
    ctx.putImageData(im, 0, 0);
  }

  // A modal dialog keeps Tab inside itself (as pegboard.js).
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
  // Open a dialog modally with focus on `focusEl`; on close focus returns to whatever opened it.
  function modal(dlg, focusEl, onClose) {
    var opener = null;
    trap(dlg);
    [].forEach.call(dlg.querySelectorAll('.pt-close'), function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (onClose) onClose(); if (opener && opener.focus) opener.focus(); opener = null; });
    return function show(from) {
      opener = from || document.activeElement;
      dlg.showModal();
      focusEl.focus({ preventScroll: true });
    };
  }
  function stopsOf(dlg) { return [].slice.call(dlg.querySelectorAll('.gw-stops button')); }
  function press(list, b) { list.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); }

  // The loupe: the work fitted to the window (never past its own pixels) and a lens at the file's own pixels.
  function Loupe(dlg, phone, info) {
    var box = dlg.querySelector('.gw-loupe-box'), pic = box && box.querySelector('img'), lens = dlg.querySelector('.gw-lens');
    var stage = dlg.querySelector('.gw-loupe-stage'), meta = dlg.querySelector('.gw-meta'), stops = stopsOf(dlg);
    if (!box || !pic || !lens || !stage) return null;
    var pos = { x: 0.5, y: 0.5 }, disp = { w: 1, h: 1 }, touch = false, dragging = false;
    var nat = function () { return [pic.naturalWidth || +pic.getAttribute('width'), pic.naturalHeight || +pic.getAttribute('height')]; };
    function place() {
      var n = nat(), D = Math.round(Math.min(phone.matches ? LENS_PHONE : LENS, Math.min(disp.w, disp.h) * 0.7));
      var L = lensAt(pos.x, pos.y, n[0], n[1], disp.w, disp.h, D), y = L.y;
      if (touch) {                               // on a finger the lens floats above it, below if there is no room
        y = L.y - D * 0.78;
        var above = box.getBoundingClientRect().top - stage.getBoundingClientRect().top;
        if (y < 4 - above) y = L.y + D * 0.78;
      }
      lens.style.width = lens.style.height = D + 'px';
      lens.style.transform = 'translate(' + Math.round(L.x) + 'px,' + Math.round(y) + 'px)';
      lens.style.backgroundSize = n[0] + 'px ' + n[1] + 'px';
      lens.style.backgroundPosition = Math.round(L.bx) + 'px ' + Math.round(L.by) + 'px';
      info.loupe.pos = [pos.x, pos.y];
    }
    function fit() {
      var n = nat(), cs = getComputedStyle(stage), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      var r = fitWithin(n[0], n[1], Math.max(80, stage.clientWidth - pad), Math.max(80, stage.clientHeight - padV));
      disp = r; box.style.width = r.w + 'px'; box.style.height = r.h + 'px';
      var mag = n[0] / r.w;
      lens.hidden = mag <= 1.05;
      if (meta) meta.textContent = mag > 1.05 ? 'Loupe ' + mag.toFixed(1) + '×, up to the file’s own pixels (' + n[0] + ' × ' + n[1] + ')' : 'Shown at the file’s own size (' + n[0] + ' × ' + n[1] + ')';
      info.loupe.shown = { w: r.w, h: r.h, natural: n, mag: mag, lens: !lens.hidden };
      place();
    }
    function fromEvent(e) {
      var b = box.getBoundingClientRect();
      pos.x = clamp((e.clientX - b.left) / b.width, 0, 1); pos.y = clamp((e.clientY - b.top) / b.height, 0, 1);
      press(stops, null); place();
    }
    box.addEventListener('pointerdown', function (e) { touch = e.pointerType !== 'mouse'; dragging = true; try { box.setPointerCapture(e.pointerId); } catch (_) {} fromEvent(e); });
    box.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { touch = false; fromEvent(e); } else if (dragging) fromEvent(e); });
    box.addEventListener('pointerup', function () { dragging = false; });
    box.addEventListener('pointercancel', function () { dragging = false; });
    box.addEventListener('keydown', function (e) {
      var s = e.shiftKey ? 0.12 : 0.03, dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -s; else if (e.key === 'ArrowRight') dx = s; else if (e.key === 'ArrowUp') dy = -s; else if (e.key === 'ArrowDown') dy = s; else return;
      e.preventDefault(); touch = false;
      pos.x = clamp(pos.x + dx, 0, 1); pos.y = clamp(pos.y + dy, 0, 1); press(stops, null); place();
    });
    stops.forEach(function (b) {
      b.addEventListener('click', function () { touch = false; pos.x = +b.getAttribute('data-x'); pos.y = +b.getAttribute('data-y'); press(stops, b); place(); });
    });
    root.addEventListener('resize', function () { if (dlg.open) fit(); });
    pic.addEventListener('load', function () { if (dlg.open) fit(); });
    lens.style.backgroundImage = 'url("' + (pic.getAttribute('src') || '') + '")';
    var show = modal(dlg, box);
    return function open(from) {
      touch = false;
      if (stops[0]) { pos.x = +stops[0].getAttribute('data-x'); pos.y = +stops[0].getAttribute('data-y'); press(stops, stops[0]); }
      else if (box.hasAttribute('data-x')) { pos.x = +box.getAttribute('data-x'); pos.y = +box.getAttribute('data-y'); }   // no detail buttons on the loupe (Lucy, Nov 18: "remvoev extra uselss redunacncy buttons"): it opens on the first detail, the pointer or the arrow keys move it
      info.loupe.opens++;
      show(from); fit();
    };
  }

  // The 1:1 view: the file at one pixel to a CSS pixel, panned by finger, mouse drag or the arrow keys.
  function Full(dlg, reduce, info) {
    var pan = dlg.querySelector('.gw-pan'), pic = pan && pan.querySelector('img'), stops = stopsOf(dlg), drag = null;
    if (!pan || !pic) return null;
    var nat = function () { return [+pic.getAttribute('width') || pic.naturalWidth, +pic.getAttribute('height') || pic.naturalHeight]; };
    function go(fx, fy, smooth) {
      var n = nat(), p = panTo(fx, fy, n[0], n[1], pan.clientWidth, pan.clientHeight);
      if (smooth && !reduce.matches && pan.scrollTo) pan.scrollTo({ left: p.left, top: p.top, behavior: 'smooth' });
      else { pan.scrollLeft = p.left; pan.scrollTop = p.top; }
    }
    pan.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0) return;      // a finger pans natively
      drag = { x: e.clientX, y: e.clientY, l: pan.scrollLeft, t: pan.scrollTop };
      try { pan.setPointerCapture(e.pointerId); } catch (_) {}
      pan.classList.add('is-drag'); e.preventDefault();
    });
    pan.addEventListener('pointermove', function (e) { if (!drag) return; pan.scrollLeft = drag.l - (e.clientX - drag.x); pan.scrollTop = drag.t - (e.clientY - drag.y); });
    var end = function () { drag = null; pan.classList.remove('is-drag'); };
    pan.addEventListener('pointerup', end); pan.addEventListener('pointercancel', end);
    pan.addEventListener('keydown', function (e) {
      var s = e.shiftKey ? PAN_BIG : PAN_STEP, dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -s; else if (e.key === 'ArrowRight') dx = s; else if (e.key === 'ArrowUp') dy = -s; else if (e.key === 'ArrowDown') dy = s; else return;
      e.preventDefault();
      pan.scrollLeft += dx; pan.scrollTop += dy; press(stops, null);
    });
    stops.forEach(function (b) { b.addEventListener('click', function () { press(stops, b); go(+b.getAttribute('data-x'), +b.getAttribute('data-y'), true); }); });
    var show = modal(dlg, pan);
    return function open(from) {
      var n = nat();
      pic.style.width = n[0] + 'px'; pic.style.height = n[1] + 'px';     // 1:1, never larger
      info.full.opens++; info.full.natural = n;
      show(from);
      if (stops[0]) { press(stops, stops[0]); go(+stops[0].getAttribute('data-x'), +stops[0].getAttribute('data-y'), false); }
      else go(0.5, 0.5, false);
    };
  }

  // On laptops the folds are open with their summaries hidden; on phones they fold until the reader opens one.
  function folds(phone) {
    var ds = [].slice.call(document.querySelectorAll('.gw-room details[data-fold="phone"]'));
    ds.forEach(function (d) { var s = d.querySelector('summary'); if (s) s.addEventListener('click', function () { d.__touched = true; }); });
    function apply() { ds.forEach(function (d) { if (!phone.matches) d.open = true; else if (!d.__touched) d.open = false; }); }
    apply();
    if (phone.addEventListener) phone.addEventListener('change', apply); else if (phone.addListener) phone.addListener(apply);
  }

  function mount(room) {
    if (room.__gallery) return room.__gallery;
    var cv = room.querySelector('.gw-cv'), work = room.querySelector('.gw-work'), art = work && work.querySelector('img'), floorEl = room.querySelector('.gw-floor'), him = room.querySelector('.gw-him');
    if (!cv || !work || !art || !floorEl) return null;
    var mq = function (q) { return root.matchMedia(q); };
    var reduce = mq('(prefers-reduced-motion: reduce)'), phone = mq('(max-width: 760px)'), coarse = mq('(pointer: coarse)');
    var listen = function (m, fn) { if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); };
    var info = { paints: 0, flickers: 0, running: false, level: 1, lit: false, loupe: { opens: 0 }, full: { opens: 0 },
      creature: { state: 'loading', frame: -1, draws: 0, animating: false, placeholder: null, sheet: null } };
    var L = reduce.matches ? 1 : RELIGHT[0], hover = false, visible = true, raf = 0, flickT = 0, timers = [], geo = floorOf(null, phone.matches);
    var cre = null, creImg = null, creCols = 1, creRaf = 0, creT0 = 0;

    function cssNum(n, d) { var v = parseFloat(getComputedStyle(room).getPropertyValue(n)); return isFinite(v) ? v : d; }
    function setFloor() {
      geo = floorOf(cre, phone.matches);
      var h = geo.height + 'px';
      if (room.style.getPropertyValue('--floor-h') !== h) room.style.setProperty('--floor-h', h);
    }
    function draw() {
      raf = 0;
      var K = cssNum('--k', 3), mat = cssNum('--mat', 0), cw = room.clientWidth, ch = room.clientHeight, W = Math.ceil(cw / K), H = Math.ceil(ch / K);
      if (W < 8 || H < 8) return;
      var box = room.getBoundingClientRect(), ox = box.left + room.clientLeft, oy = box.top + room.clientTop, r = art.getBoundingClientRect(), f = floorEl.getBoundingClientRect();
      var cx = (r.left + r.right) / 2 - ox, ww = r.width, ph = phone.matches;
      var bw = ph ? Math.min(Math.max(ww * 0.86, 220), cw - 40) : Math.min(Math.max(ww * 0.9, 320), 470);
      var floorTop = f.top - oy, seat = floorTop + geo.seat, by = Math.round(seat / K);
      paint(cv, {
        W: W, H: H, L: L, hover: hover, phone: ph, mat: Math.round(mat),
        ix0: Math.floor((r.left - ox) / K), iy0: Math.floor((r.top - oy) / K), ix1: Math.ceil((r.right - ox) / K), iy1: Math.ceil((r.bottom - oy) / K),
        hz: Math.round(floorTop / K), floorEnd: Math.round((f.bottom - oy) / K), bx0: Math.round((cx - bw / 2) / K), bx1: Math.round((cx + bw / 2) / K), by: by,
      });
      cv.style.width = W * K + 'px'; cv.style.height = H * K + 'px';
      if (him && cre && creImg) {
        var s = geo.scale;
        him.style.width = cre.cell[0] * s + 'px'; him.style.height = cre.cell[1] * s + 'px';
        him.style.left = Math.round(cx - cre.anchor[0] * s) + 'px'; him.style.top = Math.round(by * K - cre.anchor[1] * s) + 'px';
      }
      info.paints++; info.level = L; info.lit = L >= 1;
    }
    function schedule() { if (!raf) raf = root.requestAnimationFrame(draw); }
    // under the loading screen (page-loader.js) the room waits, so the lamp comes up as the screen lifts
    var covered = function () { return document.body.classList.contains('intro-playing') && !root.__loaderExited; };
    var alive = function () { return visible && !document.hidden && !reduce.matches && !covered(); };

    // the lamp: up in three steps the first time the room shows, then a gentle flicker now and then
    var relit = false;
    function relight() {
      relit = true;
      if (!alive()) { L = 1; draw(); return; }
      RELIGHT.forEach(function (lv, i) { timers.push(setTimeout(function () { L = lv; draw(); }, i * RELIGHT_MS)); });
    }
    function flickOnce(then) {
      if (!alive()) return false;
      info.flickers++;
      FLICKER.forEach(function (lv, i) { timers.push(setTimeout(function () { L = lv; draw(); if (i === FLICKER.length - 1 && then) then(); }, i * FLICKER_MS)); });
      return true;
    }
    function flicker() {
      clearTimeout(flickT);
      if (!alive()) return;
      flickT = setTimeout(function () {
        if (document.querySelector('.gw-dlg[open]')) { flicker(); return; }
        if (!flickOnce(flicker)) flicker();
      }, 3800 + Math.random() * 4200);
    }

    // him: the slot's frames, played only on screen in a visible tab, held still under reduced motion
    function drawFrame(i) {
      if (!cre || !creImg || i === info.creature.frame) return;
      var p = cellAt(i, creCols, cre), g = him.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, him.width, him.height);
      g.drawImage(creImg, p.x, p.y, cre.cell[0], cre.cell[1], 0, 0, cre.cell[0], cre.cell[1]);
      info.creature.frame = i; info.creature.draws++;
    }
    function tickCreature(now) {
      creRaf = 0;
      if (!cre || !alive()) { info.creature.animating = false; return; }
      if (!creT0) creT0 = now;
      var i = frameAt(now - creT0, cre);
      drawFrame(i);
      if (!cre.loop && i >= cre.frames - 1) { info.creature.animating = false; return; }
      creRaf = root.requestAnimationFrame(tickCreature);
    }
    function playCreature() {
      if (!cre || !creImg) return;
      if (creRaf) { root.cancelAnimationFrame(creRaf); creRaf = 0; }
      if (cre.frames > 1 && alive()) { info.creature.animating = true; creT0 = 0; creRaf = root.requestAnimationFrame(tickCreature); }
      else { info.creature.animating = false; drawFrame(reduce.matches ? cre.still : Math.max(0, info.creature.frame)); }
    }
    function loadCreature(url) {
      var base = url.slice(0, url.lastIndexOf('/') + 1);
      var fail = function (why) { info.creature.state = 'none'; if (him) him.hidden = true; if (root.console) console.warn('[GalleryWall] no creature: ' + why); };
      if (!him || !root.fetch) { fail('no slot'); return; }
      fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }).then(function (d) {
        var c = readContract(d);
        if (!c.ok) throw new Error('gallery.json: ' + c.errors.join(', '));
        return new Promise(function (resolve, reject) {
          var im = new Image();
          im.onload = function () { resolve([c, im]); };
          im.onerror = function () { reject(new Error(c.sheet + ' did not load')); };
          im.src = base + c.sheet;
        });
      }).then(function (res) {
        var c = res[0], im = res[1];
        if (!sheetFits(im.naturalWidth, im.naturalHeight, c)) throw new Error(c.sheet + ' holds fewer than ' + c.frames + ' frames of ' + c.cell.join(' x '));
        cre = c; creImg = im; creCols = columnsOf(im.naturalWidth, c);
        him.width = c.cell[0]; him.height = c.cell[1];
        info.creature.state = 'ready'; info.creature.placeholder = c.placeholder; info.creature.sheet = c.sheet; info.creature.frames = c.frames;
        drawFrame(reduce.matches ? c.still : 0);
        setFloor(); draw();
        him.classList.add('is-on');
        playCreature();
      }).catch(function (e) { fail(e.message); });
    }

    function wake() {
      timers.forEach(clearTimeout); timers = [];
      info.running = alive();
      if (!alive()) L = 1;
      else if (!relit) { relight(); }
      else L = 1;
      draw(); flicker(); playCreature();
    }

    // the work, Look closer and View 1:1
    var loupeDlg = document.querySelector('.gw-loupe'), fullDlg = document.querySelector('.gw-full');
    var canModal = loupeDlg && typeof loupeDlg.showModal === 'function';
    var openLoupe = canModal ? Loupe(loupeDlg, phone, info) : null, openFull = canModal && fullDlg ? Full(fullDlg, reduce, info) : null;
    var touchy = function () { return coarse.matches; };
    function look(from) { if (touchy() && openFull) openFull(from); else if (openLoupe) openLoupe(from); else if (openFull) openFull(from); }
    [].forEach.call(room.querySelectorAll('[data-gw="look"]'), function (b) { b.addEventListener('click', function () { look(b); }); });
    [].forEach.call(room.querySelectorAll('[data-gw="full"]'), function (b) { b.addEventListener('click', function () { if (openFull) openFull(b); }); });
    function pointerKind() { room.classList.toggle('is-touch', touchy()); }
    pointerKind(); listen(coarse, pointerKind);

    work.addEventListener('pointerenter', function () { hover = true; schedule(); });
    work.addEventListener('pointerleave', function () { hover = false; schedule(); });
    work.addEventListener('focus', function () { hover = true; schedule(); });
    work.addEventListener('blur', function () { hover = false; schedule(); });

    folds(phone);
    listen(phone, function () { setFloor(); schedule(); });
    listen(reduce, wake);
    if ('IntersectionObserver' in root) new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; wake(); }).observe(room);
    else relit = true;
    document.addEventListener('visibilitychange', wake);
    if (covered()) root.addEventListener('loader:exit', wake, { once: true });
    if ('ResizeObserver' in root) new ResizeObserver(schedule).observe(room); else root.addEventListener('resize', schedule);
    if (!art.complete) art.addEventListener('load', schedule, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    room.classList.add('is-live');
    setFloor(); draw();
    var src = room.getAttribute('data-creature');
    if (src) loadCreature(src); else info.creature.state = 'none';
    var handle = { draw: draw, info: info, look: look, openLoupe: openLoupe, openFull: openFull, flick: function () { return flickOnce(null); }, get level() { return L; } };
    room.__gallery = handle;
    root.__galleryWall = handle;
    return handle;
  }

  api.mount = mount;
  root.GalleryWall = api;
  function boot() { [].forEach.call(document.querySelectorAll('[data-gallery]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : null);
