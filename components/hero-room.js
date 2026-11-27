/*
 * The hero as his room (Lucy's pick "A, the room stays lit", 2026-10-22; spec
 * docs/superpowers/specs/2026-10-22-pixel-hero-design.md; look test "Pixel Hero Look Test").
 *
 * The opening's stage does not leave: the same room as the heist (its room pixel, cyc over a deck
 * of boards, two footlights below the stage lip, blue left and lavender right, the heist's 23
 * colours and ordered dither; layout() and renderRoom() in heist-opening.js), so the first
 * visit's hand-over lines up, with the house lights down. He sits on the deck on the clip he
 * stole, breathing and blinking now and then, and his shadow climbs the wall.
 *
 * The display words live in the room: each `[data-lit]` line stays in the page as transparent
 * text (read, selected, announced), and the room draws it. Its face is footlit, bright at the
 * baseline and dim at the cap, plus the lamps, ordered-dithered into a four-step palette ramp on a
 * device-resolution canvas so the edges stay crisp. Its sides are pulled back toward the
 * vanishing point and shaded by the room, and its shadow is thrown on the cyc by each footlight.
 * Small copy, labels and links stay plain DOM text.
 *
 * Lights come up when the opening's overlay is gone (body.intro-playing removed), or at once if
 * none played. On a fine pointer the left lamp follows the pointer and the lights flicker at 24 fps;
 * with no pointer for 2.5 s it drifts. Touch screens get a still room with only him idling (his
 * patch redrawn); reduced motion gets one still frame.
 * Nothing runs off screen or in a hidden tab. opts.onReady is called once the name is lit, he is
 * drawn and the lights are all the way up: the page's scroll waits for it (hero-gate.js).
 *
 *   const room = HeroRoom.mount(section, roomCanvas, typeCanvas, { creature: { src, cell, cols, box, rest, blink, breath, loop } });
 *   creature: a sheet of cells (cell = [w, h], cols); box = his drawn bounds in a cell, feet on box[3];
 *   rest = the cell he idles on, blinking to `blink` every 2.5-5 s; or loop = cells played at 24 fps.
 *   breath = a row of the cell: on each exhale everything above it sits one room pixel lower.
 *   Or clips (with still, asleep, wake, cycle): his life as hero-creature.js plays it; x = [landscape,
 *   portrait] fractions of the room where his body stands (default 0.74, 0.66).
 *   Layout options (the centred hero, 2026-10-31): frame = an element whose bottom edge is the room's
 *   (default the section's), so the hero keeps a band of page below the stage; clear = an element he
 *   stands below: the room pixel steps down from the heist's until his head clears its bottom edge
 *   (so on a laptop he draws at about 2 css px a pixel, under the name).
 *   room.relayout(); room.dispose(); room.info
 *
 * Plain script: window.HeroRoom in the browser; the pure helpers are module.exports in Node.
 */
(function (root) {
  'use strict';
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16 - 0.5; });
  var LB = [0.40, 0.64, 1.0], LL = [0.76, 0.62, 1.0], LBOTH = [0.58, 0.63, 1.0];
  // The heist's palette: the night, a ramp each for both lamps, blue and lavender, and two whites.
  var PAL = [[5, 6, 15], [9, 11, 30], [14, 18, 46]];
  [LBOTH, LB, LL].forEach(function (c) { [0.2, 0.32, 0.46, 0.62, 0.8, 1.0].forEach(function (v) { PAL.push(c.map(function (u) { return Math.round(u * v * 255); })); }); });
  PAL.push([206, 214, 252], [236, 240, 255]);
  // A face's four-step ramps (palette indices): the name in both lamps' light up to the whites.
  var FACE = [[7, 8, 21, 22], [12, 13, 14, 14]];
  // FB/FV: a face is footlit, FV brighter at the baseline than at the cap; FACEK of the lamps on top.
  // DT: how far a letter's back pulls toward the vanishing point. TS: how far its shadow grows.
  var FB = 0.02, FV = 0.72, FACEK = 1.8, DT = 0.05, TS = 0.011;
  var LIGHT = 0.42, UP = 0.9, FPS = 24, IDLE = 2.5;   // the house lights low; their rise in s
  var BLINK_FRAMES = 3, BLINK_MIN = 2.5, BLINK_MAX = 5;   // a blink is three 24 fps frames, every 2.5-5 s
  var BREATH = 2.6, BREATH_OUT = 1.1;   // a breath every 2.6 s, settled for 1.1 s of it
  var STRETCH = { '100%': 'normal', '112.5%': 'semi-expanded', '125%': 'expanded', '150%': 'extra-expanded' };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // The heist's room pixel, from the viewport: one room pixel is K device pixels.
  function roomPixel(vw, vh, dpr) {
    var dw = Math.max(1, Math.round(vw * dpr)), dh = Math.max(1, Math.round(vh * dpr));
    return { K: Math.max(1, Math.floor(Math.min(dw / 270, dh / 230))), portrait: dw < dh * 0.9 };
  }
  // The heist's stage in a room of W x H: where the deck meets the cyc, where feet stand, the lamps.
  function stageOf(W, H, portrait) {
    var FEET = portrait ? Math.round(H - Math.max(84, H * 0.17)) : Math.round(H * 0.86);
    return {
      portrait: portrait, FEET: FEET, HZ: FEET - (portrait ? 74 : Math.round(H * 0.2)), Ly: H + (portrait ? H * 0.6 : H * 1.05),
      lamps: [{ x: W * (portrait ? 0.18 : 0.3), k: 0.5 }, { x: W * (portrait ? 0.74 : 0.7), k: 0.48 }],
    };
  }
  // A face pixel's step in its ramp (0..3): footlit by height in its line (fy: 0 baseline, 1 cap),
  // plus the lamps (lamp), scaled by how far the lights have come up (up), dithered by Bayer b.
  function faceStep(fy, lamp, up, b) {
    var v = clamp((FB + FV * (1 - fy)) * up + lamp * FACEK, 0, 1) * 3 + b;
    return v < 0.5 ? 0 : v < 1.5 ? 1 : v < 2.5 ? 2 : 3;
  }
  // His breath at time t: 1 while exhaled (head and shoulders a room pixel lower), else 0.
  function breathAt(t) { return ((t % BREATH) + BREATH) % BREATH < BREATH_OUT ? 1 : 0; }
  // The Gaussian light separates into horizontal and vertical factors. Expensive exponentials
  // are O(W + H), rather than O(W * H), without changing the room's light or pixel grid.
  function fillLampField(out, W, H, HZ, lampX, strength, portrait, work) {
    work = work || { wall: new Float64Array(W), floor: new Float64Array(W) };
    var sx = W * (portrait ? 0.62 : 0.4), x, y, i = 0;
    for (x = 0; x < W; x++) {
      var gx = (x - lampX) / sx, hx = (x - lampX) / (W * 0.32);
      work.wall[x] = Math.exp(-gx * gx);
      work.floor[x] = Math.exp(-hx * hx * 1.3);
    }
    for (y = 0; y < H; y++) {
      if (y < HZ) {
        var upw = (HZ - y) / HZ, wallY = 1 - 0.5 * upw * upw;
        for (x = 0; x < W; x++, i++) out[i] = work.wall[x] * wallY * strength;
      } else {
        var hy = (H + 10 - y) / (H - HZ + 34), floorY = Math.exp(-hy * hy * 1.3);
        for (x = 0; x < W; x++, i++) out[i] = work.floor[x] * floorY * 1.35 * strength;
      }
    }
    return out;
  }
  var LUT = null;
  function lut() {
    if (LUT) return LUT;
    LUT = new Uint8Array(32768);
    for (var r = 0; r < 32; r++) for (var g = 0; g < 32; g++) for (var b = 0; b < 32; b++) {
      var R = r * 255 / 31, G = g * 255 / 31, B = b * 255 / 31, best = 0, bd = Infinity;
      for (var p = 0; p < PAL.length; p++) { var dr = R - PAL[p][0], dg = G - PAL[p][1], db = B - PAL[p][2], d = 0.8 * dr * dr + 1.1 * dg * dg + 0.7 * db * db; if (d < bd) { bd = d; best = p; } }
      LUT[(r << 10) | (g << 5) | b] = best;
    }
    return LUT;
  }

  function mount(section, canvas, tc, opts) {
    opts = opts || {};
    var reduced = opts.reduced != null ? opts.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = opts.fine != null ? opts.fine : matchMedia('(pointer: fine)').matches;
    var still = reduced || !fine;   // touch screens and reduced motion: one frame, no loop
    var L = lut(), PAL32 = new Uint32Array(PAL.map(function (c) { return ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; }));
    var ctx = canvas.getContext('2d'), tcx = tc.getContext('2d');
    var cr = opts.creature || { src: opts.sprite || 'assets/hero/creature.webp', cell: [256, 192], cols: 1, box: [67, 42, 190, 161], rest: 0 };
    var BOX = cr.box, CW = cr.cell[0], CH = cr.cell[1];
    var sprite = new Image(); sprite.decoding = 'async';
    // His clips (hero-creature.js, Lucy's pick 12: he dozes, wakes with the lights, then lives there) when
    // the hero passes them (creature.clips); otherwise one sheet and a rest cell.
    var player = cr.clips && root && root.HeroCreature ? root.HeroCreature.create(cr, {
      reduced: reduced, saveData: !!(navigator.connection && navigator.connection.saveData),
      onReady: function () { if (!disposed && st) { shadows(); render(); } },
    }) : null;
    function spriteReady() { return player ? player.ready() : !!(sprite.complete && sprite.naturalWidth); }
    var cellNow = cr.rest != null ? cr.rest : (cr.loop ? cr.loop[0] : 0), blinkAt = 0, blinkLeft = 0, breathNow = 0;
    function cellRect(c) { return [(c % cr.cols) * CW, Math.floor(c / cr.cols) * CH]; }
    function drawCell(x, c, dx, dy, b) {
      var r = cellRect(c), sp = cr.breath;
      if (!b || !sp) { x.drawImage(sprite, r[0], r[1], CW, CH, dx, dy, CW, CH); return; }
      x.drawImage(sprite, r[0], r[1] + sp, CW, CH - sp, dx, dy + sp, CW, CH - sp);   // haunches, feet and tail stay planted
      x.drawImage(sprite, r[0], r[1], CW, sp, dx, dy + b, CW, sp);                   // the rest settles b pixels
    }
    var W = 0, H = 0, K = 1, dpr = 1, n = 0, SW = 0, SH = 0, st = null, img = null, d32 = null;
    var alb, amb, F, SH2, TM, EXT, FY, EG, DN, tm, tmx, face, sil, silx, fieldWork, at = { x: 0, y: 0 }, cx = 0, lamps = [];
    var lines = [], tb = null, up = 0, upFrom = -1, lit = false, ready = false, dim = 0;
    var raf = 0, last = 0, acc = 0, clock = 0, idle = 0, visible = false, disposed = false, covered = false, roTimer = 0, mo = null;
    var info = { W: 0, H: 0, K: 1, up: 0, renders: 0, running: false, lines: 0, still: still, ready: false };

    // The room's size: the section's width, and its height down to the frame's bottom edge when there is one.
    function measure() {
      var box = section.getBoundingClientRect(), fb = opts.frame ? opts.frame.getBoundingClientRect() : box;
      return { w: box.width, h: Math.max(1, Math.min(box.height, fb.bottom - box.top)) };
    }
    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      var box = measure(), rp = roomPixel(innerWidth, innerHeight, dpr);
      // opts.grow (portrait only): the hero may take a room pixel up to grow steps larger than the heist's, so on a
      // phone he fills the screen (Lucy, 2026-11-12: "the dragon is way too small"); clear still steps it down.
      K = rp.K + (rp.portrait && opts.grow ? opts.grow : 0); SW = box.w; SH = box.h;
      // He stands below opts.clear: the largest room pixel, up to the heist's, whose stage puts the top of
      // his drawing 8 css px under its bottom edge.
      // The Dragon layer (.hero-creature-box, for Edit Mode): once it is moved or sized by hand, its box sets his
      // room pixel (whole steps, so his pixels stay even) and where he stands; the clear rule steps aside.
      var cbox = section.querySelector('.hero-creature-box'), cs0 = cbox && cbox.style, mine = cs0 && (cs0.width || cs0.left || cs0.top) ? cbox.getBoundingClientRect() : null;
      if (mine) K = Math.max(1, Math.round(mine.width * dpr / (BOX[2] - BOX[0])));
      if (opts.clear && !mine) {
        var under = opts.clear.getBoundingClientRect().bottom - section.getBoundingClientRect().top + 8, tall = BOX[3] - BOX[1];
        var fits = function (k) { return (stageOf(Math.ceil(SW * dpr / k), Math.ceil(SH * dpr / k), rp.portrait).FEET - tall) * k / dpr >= under; };
        while (K > 1 && !fits(K)) K--;
        // creature.maxH (share of the screen's height): with the title higher he would grow; he keeps Lucy's size
        if (cr.maxH && !rp.portrait) while (K > 1 && tall * K / dpr > cr.maxH * innerHeight) K--;
      }
      W = Math.max(1, Math.ceil(SW * dpr / K)); H = Math.max(1, Math.ceil(SH * dpr / K)); n = W * H;
      st = stageOf(W, H, rp.portrait);
      section.style.setProperty('--hero-feet', (st.FEET * K / dpr).toFixed(1) + 'px');   // where his feet stand, css px from the top, for the tools strip
      canvas.width = W; canvas.height = H;
      canvas.style.width = (W * K / dpr) + 'px'; canvas.style.height = (H * K / dpr) + 'px';
      tc.width = Math.round(SW * dpr); tc.height = Math.round(SH * dpr);
      tc.style.width = SW + 'px'; tc.style.height = SH + 'px';
      img = ctx.createImageData(W, H); d32 = new Uint32Array(img.data.buffer);
      alb = new Float32Array(n * 3); amb = new Float32Array(n * 3);
      F = [new Float32Array(n), new Float32Array(n)]; SH2 = [new Float32Array(n), new Float32Array(n)];
      fieldWork = { wall: new Float64Array(W), floor: new Float64Array(W) };
      TM = new Uint8Array(n); EXT = new Uint8Array(n); FY = new Float32Array(n);
      DN = Math.max(4, Math.round(W / 48)); EG = new Float32Array(DN + 1);
      for (var k = 1; k <= DN; k++) EG[k] = 1.9 - 1.6 * (k - 1) / (DN - 1);   // sides catch the footlights near the face, then fall into the dark
      tm = document.createElement('canvas'); tm.width = W; tm.height = H; tmx = tm.getContext('2d', { willReadFrequently: true });
      sil = document.createElement('canvas'); sil.width = W; sil.height = H; silx = sil.getContext('2d', { willReadFrequently: true });
      face = [0, 1].map(function () { var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d'), im = x.createImageData(W, H); return { c: c, x: x, img: im, d32: new Uint32Array(im.data.buffer) }; });
      // the room's surfaces, as the heist builds them
      var HZ = st.HZ, vpx = W * 0.5, vpy = HZ - H * 0.95, P = 2400 / (H - vpy);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var i = y * W + x, j = i * 3;
        if (y < HZ) { alb[j] = 0.86; alb[j + 1] = 0.89; alb[j + 2] = 0.98; }
        else {
          var sp = P * (y - vpy) / 100, u = (x - vpx) / (y - vpy) * 100 / P;
          var seam = Math.abs(((u % 1) + 1.5) % 1 - 0.5) * sp < 0.55 ? 0.7 : 1;
          alb[j] = 0.36 * seam; alb[j + 1] = 0.38 * seam; alb[j + 2] = 0.5 * seam;
        }
        if (y >= HZ - 2 && y < HZ + 1) { alb[j] *= 0.35; alb[j + 1] *= 0.35; alb[j + 2] *= 0.4; }
        var v = 1 - 0.55 * Math.pow(Math.hypot((x / W - 0.5) * 1.1, y / H - 0.42), 2);
        amb[j] = 0.03 * v; amb[j + 1] = 0.036 * v; amb[j + 2] = 0.085 * v;
      }
      lamps = st.lamps.map(function (l) { return { x: l.x, k: l.k, tx: l.x, home: l.x }; });
      cx = Math.round(W * (cr.x ? cr.x[rp.portrait ? 1 : 0] : (rp.portrait ? 0.66 : 0.74)));   // creature.x: where his body stands [landscape, portrait]
      at = { x: Math.round(cx - (BOX[0] + BOX[2]) / 2), y: Math.round(st.FEET - BOX[3]) };
      // his whole drawing stays in the room (a grown phone room is narrower than his tail): slide him in, centre kept if it fits
      var INK = cr.ink || [BOX[0], BOX[2]];   // creature.ink: his drawing's left and right edges in a cell, tail included
      at.x = Math.max(2 - INK[0], Math.min(at.x, W - 2 - INK[1]));
      // creature.drop (share of the stage's height, landscape): he stands that much lower, on the floor (Lucy, 2026-11-20)
      if (cr.drop && !mine && !rp.portrait) at.y += Math.round(cr.drop * SH * dpr / K);
      // creature.under (vh): he stands that far under the title instead of at the stage's feet line (Lucy, 2026-11-20),
      // never lower than the feet line and never with his feet above the floor's horizon
      if (cr.under && opts.clear && !mine && !rp.portrait) {
        var tb0 = opts.clear.getBoundingClientRect().bottom - section.getBoundingClientRect().top + cr.under * innerHeight / 100;
        var ay = Math.round(tb0 * dpr / K) - BOX[1];
        at.y = Math.max(st.HZ + 6 - BOX[3], Math.min(at.y, ay));
      }
      if (mine) { var sb = section.getBoundingClientRect(); at = { x: Math.round((mine.left - sb.left) * dpr / K - BOX[0]), y: Math.round((mine.top - sb.top) * dpr / K - BOX[1]) }; }
      if (cbox) {   // the layer's box is his drawing's box (snapped to his pixels when sized by hand)
        var bw = (BOX[2] - BOX[0]) * K / dpr, bh = (BOX[3] - BOX[1]) * K / dpr;
        cbox.style.setProperty('--cl', ((at.x + BOX[0]) * K / dpr).toFixed(1) + 'px'); cbox.style.setProperty('--ct', ((at.y + BOX[1]) * K / dpr).toFixed(1) + 'px');
        cbox.style.setProperty('--cw', bw.toFixed(1) + 'px'); cbox.style.setProperty('--ch', bh.toFixed(1) + 'px');
        if (mine && cs0.width && Math.abs(parseFloat(cs0.width) - bw) > 0.5) { cs0.width = bw.toFixed(1) + 'px'; cs0.height = bh.toFixed(1) + 'px'; }
      }
      info.W = W; info.H = H; info.K = K; info.at = at; info.dpr = dpr;
      lampField(0); lampField(1); readLines(); buildType(); shadows();
    }
    function lampField(li) {   // how much of lamp li reaches each pixel, as in the heist
      var l = lamps[li];
      fillLampField(F[li], W, H, st.HZ, l.x, l.k, st.portrait, fieldWork);
    }
    // Each lit line: its text, font and baseline, read from the page (a zero-size .bl marker before it).
    function readLines() {
      var box = section.getBoundingClientRect();
      lines = [];
      Array.prototype.forEach.call(section.querySelectorAll('[data-lit]'), function (el) {
        var cs = getComputedStyle(el), font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        Array.prototype.forEach.call(el.querySelectorAll('.bl'), function (bl) {
          var t = bl.nextSibling && bl.nextSibling.textContent;
          if (!t) return;
          var r = bl.getBoundingClientRect();
          lines.push({ text: t, font: font, size: parseFloat(cs.fontSize), stretch: STRETCH[cs.fontStretch] || 'normal',
            ls: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing, ramp: el.hasAttribute('data-lit-blue') ? 1 : 0,
            x: r.left - box.left, y: r.top - box.top });
        });
      });
      info.lines = lines.length;
    }
    function drawLines(c, fill) {
      c.textBaseline = 'alphabetic';
      lines.forEach(function (l) { c.font = l.font; if ('fontStretch' in c) c.fontStretch = l.stretch; if ('letterSpacing' in c) c.letterSpacing = l.ls; c.fillStyle = fill(l); c.fillText(l.text, l.x, l.y); });
    }
    // The letters at room pixels (TM), the depth each pixel shows (EXT) and how high up its line it is (FY).
    function buildType() {
      TM.fill(0); EXT.fill(0); tb = null;
      if (!lines.length) return;
      var r = dpr / K;   // css px to room px
      tmx.setTransform(1, 0, 0, 1, 0, 0); tmx.clearRect(0, 0, W, H);
      tmx.setTransform(r, 0, 0, r, 0, 0); drawLines(tmx, function () { return '#fff'; });
      var d = tmx.getImageData(0, 0, W, H).data, x0 = W, y0 = H, x1 = -1, y1 = -1, i, x, y;
      for (i = 0; i < n; i++) if (d[i * 4 + 3] > 110) { TM[i] = 1; x = i % W; y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return;
      lines.forEach(function (l) {
        tmx.font = l.font; if ('fontStretch' in tmx) tmx.fontStretch = l.stretch; if ('letterSpacing' in tmx) tmx.letterSpacing = l.ls;
        var cap = 0.72 * l.size, lx0 = Math.max(0, Math.floor(l.x * r)), lx1 = Math.min(W - 1, Math.ceil((l.x + tmx.measureText(l.text).width) * r));
        var ly0 = Math.max(0, Math.floor((l.y - 0.8 * l.size) * r)), ly1 = Math.min(H - 1, Math.ceil((l.y + 0.25 * l.size) * r));
        for (var yy = ly0; yy <= ly1; yy++) for (var xx = lx0; xx <= lx1; xx++) { var q = yy * W + xx; if (TM[q]) FY[q] = clamp((l.y - (yy + 0.5) / r) / cap, 0, 1); }
      });
      // a pixel shows the nearest layer of the letters' depth that covers it
      var vx = W * 0.5, vy = H * 0.42, m = Math.ceil(Math.max(W, H) * DT) + 2;
      var bx0 = Math.max(0, x0 - m), by0 = Math.max(0, y0 - m), bx1 = Math.min(W - 1, x1 + m), by1 = Math.min(H - 1, y1 + m);
      for (y = by0; y <= by1; y++) for (x = bx0; x <= bx1; x++) {
        i = y * W + x;
        if (TM[i]) { EXT[i] = 1; continue; }
        for (var k = 1; k <= DN; k++) {
          var f = 1 - DT * k / DN, px = Math.round(vx + (x - vx) / f), py = Math.round(vy + (y - vy) / f);
          if (px >= 0 && px < W && py >= 0 && py < H && TM[py * W + px]) { EXT[i] = k; break; }
        }
      }
      tb = [bx0, by0, bx1, by1];
    }
    // His shadow and the letters' climb the cyc: silhouettes scaled up from each lamp below the stage.
    function shadows() {
      var spr = spriteReady(), HZ = st.HZ, Ly = st.Ly, s = (Ly - HZ) / Math.max(1, Ly - st.FEET);
      for (var li = 0; li < 2; li++) {
        var S = SH2[li]; S.fill(0);
        if (!spr && !tb) continue;
        var lx = lamps[li].x;
        silx.setTransform(1, 0, 0, 1, 0, 0); silx.clearRect(0, 0, W, H);
        if (tb) { var t = 1 + TS; silx.setTransform(t, 0, 0, t, lx * (1 - t), Ly * (1 - t)); silx.globalAlpha = 0.6; silx.drawImage(tm, 0, 0); silx.globalAlpha = 1; }   // the letters' shadows are lighter than his
        if (spr) { silx.setTransform(s, 0, 0, s, lx * (1 - s), Ly * (1 - s)); if (player) player.draw(silx, at.x, at.y); else drawCell(silx, cr.rest != null ? cr.rest : cellNow, at.x, at.y); }
        // Only the wall receives shadows; do not read the unused floor back from the canvas.
        var d = silx.getImageData(0, 0, W, Math.max(1, HZ)).data;
        for (var i = 0, end = HZ * W; i < end; i++) { var a = d[i * 4 + 3]; S[i] = a > 200 ? 0.9 : a > 40 ? 0.62 : 0; }
      }
    }
    function render() {
      if (disposed || covered || document.hidden || document.body.classList.contains('about-locked')) return;
      var fl = function (i) { return still ? 1 : 1 + 0.018 * Math.sin(clock * 7.3 + i * 2.1) + 0.012 * Math.sin(clock * 13.7 + i * 5.3); };
      var light = LIGHT * up * (1 - dim), f0 = fl(0) * light, f1 = fl(1) * light, A = F[0], B = F[1], S0 = SH2[0], S1 = SH2[1];
      for (var y = 0, i = 0; y < H; y++) { var by = (y & 3) << 2;
        for (var x = 0; x < W; x++, i++) {
          var j = i * 3, e = EXT[i], dd = BAYER[by | (x & 3)] * 0.075;
          var ar = alb[j], ag = alb[j + 1], ab = alb[j + 2], l0 = A[i] * (1 - S0[i]) * f0, l1 = B[i] * (1 - S1[i]) * f1;
          if (e) { var kk = EG[e]; ar = 0.86 * kk; ag = 0.89 * kk; ab = 0.98 * kk; l0 = A[i] * f0; l1 = B[i] * f1; }   // a letter's side, in front of its own shadow
          var r = ((ar * (amb[j] + LB[0] * l0 + LL[0] * l1) + dd) * 31 + 0.5) | 0;
          var g = ((ag * (amb[j + 1] + LB[1] * l0 + LL[1] * l1) + dd) * 31 + 0.5) | 0;
          var b = ((ab * (amb[j + 2] + LB[2] * l0 + LL[2] * l1) + dd) * 31 + 0.5) | 0;
          r = r < 0 ? 0 : r > 31 ? 31 : r; g = g < 0 ? 0 : g > 31 ? 31 : g; b = b < 0 ? 0 : b > 31 ? 31 : b;
          d32[i] = PAL32[L[(r << 10) | (g << 5) | b]];
        }
      }
      ctx.putImageData(img, 0, 0);
      drawHim();
      drawFaces(f0, f1);
      info.renders++; info.up = up;
      // the page's words go transparent only once the room draws them; a room with no lit words (the centred hero) is lit at once
      if (!lit && (tb || !lines.length)) { lit = true; section.classList.add('is-room-lit'); }
      checkReady();
    }
    // Ready, once: the name lit, him drawn and the lights all the way up. The page's scroll waits for it (opts.onReady:
    // Hero.jsx's hero:ready, components/hero-gate.js).
    function checkReady() {
      if (ready || !lit || up < 1 || !spriteReady()) return;
      ready = info.ready = true;
      if (opts.onReady) try { opts.onReady(); } catch (e) {}
    }
    // a dithered contact shadow, then him at one room pixel per drawn pixel
    function drawHim() {
      if (!spriteReady()) return;
      var rx = (BOX[2] - BOX[0]) * 0.42, ry = 5;
      ctx.fillStyle = 'rgb(9,11,30)';   // a palette night, so nothing in the room leaves the 23 colours
      for (var yy = -ry; yy <= ry; yy++) for (var xx = -Math.ceil(rx); xx <= rx; xx++) { var q = (xx / rx) * (xx / rx) + (yy / ry) * (yy / ry); if (q <= 1 && (q < 0.6 || ((xx + yy) & 1))) ctx.fillRect(Math.round(cx + xx), Math.round(st.FEET + yy - 1), 1, 1); }
      ctx.imageSmoothingEnabled = false;
      if (player) player.draw(ctx, at.x, at.y); else drawCell(ctx, cellNow, at.x, at.y, breathNow);
    }
    // only his patch, from the room as last lit (the idle on a still room: a blink costs a few thousand pixels)
    function redrawHim() {
      var x0 = Math.max(0, at.x), y0 = Math.max(0, at.y), w = Math.min(W, at.x + CW) - x0, h = Math.min(H, at.y + CH + 6) - y0;
      if (w > 0 && h > 0) ctx.putImageData(img, 0, 0, x0, y0, w, h);
      drawHim();
      checkReady();
    }
    // his idle: a drawn loop, or his rest cell breathing, with a blink now and then
    function idleCell(dt) {
      breathNow = reduced || !cr.breath ? 0 : breathAt(clock);
      if (reduced) return cr.rest != null ? cr.rest : cellNow;
      if (cr.loop) return cr.loop[Math.floor(clock * FPS) % cr.loop.length];
      if (cr.blink == null) return cr.rest;
      if (blinkLeft > 0) { blinkLeft--; return cr.blink; }
      blinkAt -= dt;
      if (blinkAt <= 0) { blinkAt = BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN); blinkLeft = BLINK_FRAMES - 1; return cr.blink; }
      return cr.rest;
    }
    function drawFaces(f0, f1) {   // each letter's face: footlight and lamps, ordered-dithered into its ramp
      tcx.setTransform(1, 0, 0, 1, 0, 0); tcx.clearRect(0, 0, tc.width, tc.height);
      if (!tb) return;
      var x0 = tb[0], y0 = tb[1], x1 = tb[2], y1 = tb[3], A = F[0], B = F[1], d0 = face[0].d32, d1 = face[1].d32;
      for (var y = y0; y <= y1; y++) { var by = (y & 3) << 2;
        for (var x = x0; x <= x1; x++) {
          var i = y * W + x, q = faceStep(FY[i], A[i] * f0 + B[i] * f1, up, BAYER[by | (x & 3)]);
          d0[i] = PAL32[FACE[0][q]]; d1[i] = PAL32[FACE[1][q]];
        }
      }
      tcx.setTransform(dpr, 0, 0, dpr, 0, 0); tcx.imageSmoothingEnabled = false;
      var pats = face.map(function (f) {
        // CanvasPattern snapshots its source; refresh after the face pixels change.
        f.x.putImageData(f.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
        var p = tcx.createPattern(f.c, 'no-repeat'); p.setTransform(new DOMMatrix([K / dpr, 0, 0, K / dpr, 0, 0])); return p;
      });
      drawLines(tcx, function (l) { return pats[l.ramp]; });
    }

    // ── Time: the lights come up after the opening, then (fine pointers) the lamp and the flicker ──
    function lightsUp() { if (upFrom < 0) upFrom = clock; }
    function step(dt) {
      clock += dt;
      if (upFrom >= 0 && up < 1) { var t = reduced ? 1 : clamp((clock - upFrom) / UP, 0, 1); up = t * t * (3 - 2 * t); }
      if (still) return;
      idle += dt;
      var l = lamps[0];
      if (idle > IDLE) l.tx = l.home + 0.08 * W * Math.sin(clock * 0.35);   // no pointer: the lamp drifts
      var nx = l.x + (l.tx - l.x) * (1 - Math.exp(-dt * 6));
      if (Math.abs(nx - l.x) > 0.05) { l.x = nx; lampField(0); shadows(); }
    }
    function frame(now) {
      raf = 0;
      if (disposed || covered || !visible || document.hidden || document.body.classList.contains('about-locked')) { info.running = false; return; }
      info.running = true;
      var dt = Math.min(0.1, (now - (last || now)) / 1000); last = now; acc += dt;
      if (acc + 1e-7 >= 1 / FPS) {
        // Keep the remainder: resetting it makes 24 fps become 20 on a 60 Hz display.
        var s = Math.floor((acc + 1e-7) * FPS) / FPS; acc = Math.max(0, acc - s);
        var lit0 = up; step(s);
        var changed, whole = false;
        if (player) {
          changed = player.tick(s, upFrom >= 0);
          var ps = player.state(); info.clip = ps.clip; info.frame = ps.frame; info.decoded = ps.decoded;
          if (player.boundary) { shadows(); whole = true; }   // a new clip: his shadow on the cyc follows
        } else {
          var b0 = breathNow, c = idleCell(s); changed = c !== cellNow || breathNow !== b0; cellNow = c; info.cell = c; info.breath = breathNow;
        }
        if (!still || up !== lit0 || up < 1 || whole) render();   // a lit, moving room redraws whole
        else if (changed) redrawHim();                     // a still room redraws only him
      }
      if (still && up >= 1 && (reduced || (!cr.loop && cr.blink == null && !cr.breath && !(player && player.moving())))) { info.running = false; return; }   // nothing left to move
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && !disposed && !covered && visible && !document.hidden && !document.body.classList.contains('about-locked') && !(reduced && up >= 1)) { last = 0; raf = requestAnimationFrame(frame); } }
    function onMove(e) {
      if (!visible) return;
      var b = canvas.getBoundingClientRect();
      lamps[0].tx = clamp((e.clientX - b.left) * dpr / K, W * 0.05, W * 0.95); idle = 0;
    }
    function onVisibility() {
      if (document.hidden || document.body.classList.contains('about-locked')) {
        if (raf) cancelAnimationFrame(raf); raf = 0; info.running = false;
      } else { if (visible) render(); start(); }
    }
    function relayout() { if (disposed) return; layout(); render(); start(); }

    // the lights wait for the opening's overlay to go
    function introPlaying() { return document.body.classList.contains('intro-playing'); }
    if (!player) { sprite.onload = function () { if (!disposed) { shadows(); render(); } }; sprite.src = cr.src; }
    layout();
    if (!introPlaying()) { upFrom = 0; if (reduced) up = 1; }
    else if (typeof MutationObserver === 'function') {
      mo = new MutationObserver(function () { if (!introPlaying()) { lightsUp(); mo.disconnect(); mo = null; start(); } });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } else lightsUp();
    render();
    var io = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; if (visible) start(); }, { threshold: 0 }) : null;
    if (io) io.observe(section); else { visible = true; start(); }
    var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(function () {
      // layout() sizes the border box, including the hero's responsive padding.
      var b = measure();
      // The initial observation already matches layout(); font readiness relayouts separately.
      if (Math.abs(b.w - SW) < 1 && Math.abs(b.h - SH) < 1 && dpr === Math.min(window.devicePixelRatio || 1, 3)) return;
      clearTimeout(roTimer); roTimer = setTimeout(relayout, 150);
    }) : null;
    if (ro) { ro.observe(section); if (opts.frame) ro.observe(opts.frame); }
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('lucy:scene-visibility', onVisibility);
    if (!still) window.addEventListener('pointermove', onMove, { passive: true });

    return {
      info: info,
      relayout: relayout,
      setCovered: function (value) { covered = !!value; if (covered) { if (raf) cancelAnimationFrame(raf); raf = 0; info.running = false; } else { render(); start(); } },
      // The house lights going down as Standout comes up (projection-journey.js): 0 lit, 1 out; in 24 steps, like the
      // flicker. A running room picks it up on its next frame; a still one draws it now.
      setDim: function (k) {
        k = Math.round(clamp(+k || 0, 0, 1) * 24) / 24;
        if (k === dim) return;
        dim = info.dim = k;
        if (!raf) render();
      },
      dispose: function () {
        disposed = true; if (raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(roTimer); if (player) player.dispose();
        if (io) io.disconnect(); if (ro) ro.disconnect(); if (mo) mo.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        document.removeEventListener('lucy:scene-visibility', onVisibility);
        window.removeEventListener('pointermove', onMove);
        section.classList.remove('is-room-lit');
        canvas.width = 0; canvas.height = 0; tc.width = 0; tc.height = 0; info.running = false;
      },
    };
  }

  var api = { PAL: PAL, FACE: FACE, LIGHT: LIGHT, roomPixel: roomPixel, stageOf: stageOf, faceStep: faceStep, breathAt: breathAt, fillLampField: fillLampField, paletteLUT: lut, mount: mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.HeroRoom = api;
})(typeof window !== 'undefined' ? window : null);
