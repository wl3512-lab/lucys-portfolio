/* The short loading screen: caught in the spotlight (plain JS, injected by the inline lifecycle's loadSpot()).
   Lucy, 2026-10-22: a second loading screen for every load after the first in the tab ("just as a normal loading
   screen; the enter portfolio one ... only plays once per visit"). The heist stays the first visit's opening.

   Black. A lamp snaps on and catches him side-on, proud, the paperclip up in his tail blades. The startle turns him
   to face us, stepping round on his feet; his tail swings the clip down and tucks it under his belly; he looks at us,
   innocent, and blinks. The lamp cuts and the page comes up. Under the stage, all the while (Lucy: "lucy liu during,
   not after the animation, it feels too long"; "look more like a loading screen"): her name in the pixel font and a
   segmented loading bar with LOADING under it. The bar is honest: it fills with the bit but holds short of full
   until the page has mounted (`app:ready`, caught by the inline lifecycle as `__appReady`); if the page is late, he
   holds his last look a moment longer (at most 1.2 s) before the lamp cuts.

   The lamp follows his ground point every frame (he travels as he steps round) and is drawn like the opening's
   lamps: light computed per room pixel, dithered with the 4 x 4 Bayer matrix into the heist's palette. His frames
   come from the creature project (docs/projects/portfolio-character/spotlight-v1), packed by
   scripts/spotlight-assets.py into assets/spotlight/ (a sheet of 256 x 192 cells and spotlight.json with each
   image's ground point). It plays only when the overlay is in its spot mode (`intro-spot`), so a later Replay
   opening, which plays the heist, never wakes it. Any click or key skips it; the lifecycle handles the rest
   (Escape, Enter, the skip link, a hidden tab, reduced motion).

   Four bits, one per load (Lucy, 2026-10-28: "different one each visit at random"): this one, and three the creature
   project drew after it (docs/projects/portfolio-character/loading-variants-v1, lifted by
   scripts/loading-variants-assets.py into assets/spotlight/<name>/): asleep on his hoard (wake), the clip toss (toss)
   and peekaboo. Same lamp, room, name and bar; each load picks one at random, never the one shown last. */
(function () {
  'use strict';
  const api = window.LucyIntro, loader = document.getElementById('ll-loader');
  if (!api || !loader) return;
  // Which bit plays: at random, never the same as last time (remembered in localStorage, so it holds across visits);
  // ?spot=<name> picks one, for review. The original stays at the folder's root: the hero takes his resting pose from
  // its sheet (Hero.jsx). A bit that fails to load falls back to the original.
  const ROOT = 'assets/spotlight/', SCREENS = { spotlight: '', wake: 'wake/', toss: 'toss/', peekaboo: 'peekaboo/' }, LAST = 'lucy.spot.last';
  // Centred under the name and the bar (Lucy, 2026-11-01: "center loading dragon"; 2026-11-04: "make sure all loading
  // screens are centered"): CENTRE is where his centre of mass stands from his ground point, in cell px, averaged over
  // the bit's frames (his ground point stays on X0, and the lamp with it: the room is black, so he turns on the spot); TALL is how far his highest frame rises over his feet, which sizes the group the
  // layout centres on the screen's height (scripts/spotlight-centre.py; re-run it when a bit is re-lifted).
  const CENTRE = { spotlight: 9, wake: -2, toss: 5, peekaboo: 6 }, TALL = { spotlight: 137, wake: 76, toss: 140, peekaboo: 128 };
  const NAME_GAP = 14, FURNITURE = 39;   // from his feet to the name; from the top of the name to the foot of LOADING
  function pick() {
    const asked = (location.search.match(/[?&]spot=([a-z]+)/) || [])[1];
    if (asked && Object.prototype.hasOwnProperty.call(SCREENS, asked)) return asked;
    let last = null;
    try { last = localStorage.getItem(LAST); } catch (e) { /* blocked storage: any of the four */ }
    const pool = Object.keys(SCREENS).filter((n) => n !== last);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const SCREEN = pick(), BASE = ROOT + SCREENS[SCREEN];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ── Timing (s): the lamp snaps on, the bit plays at 24 fps, the lamp cuts and the overlay goes ──
  const LAMP = 0.08, AFTER = 0.05, LATE_MAX = 1.2, OUT_MS = 200;
  const NAME = 'LUCY LIU', LABEL = 'LOADING', SEGS = 16;

  // ── The palette: the heist's night and its both-lamps ramp, darkest to brightest ──
  const LBOTH = [0.58, 0.63, 1.0];
  const LEVELS = [[5, 6, 15], [9, 11, 30], [14, 18, 46]].concat([0.2, 0.32, 0.46, 0.62, 0.8, 1.0].map((v) => LBOTH.map((u) => Math.round(u * v * 255)))).concat([[206, 214, 252]]);
  const L32 = new Uint32Array(LEVELS.map((c) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0));
  const NL = LEVELS.length;
  const INK = 'rgb(226, 238, 255)', LAV = 'rgb(196, 176, 255)', DIM = 'rgb(29, 42, 106)', MID = 'rgb(118, 132, 171)';
  const FONT = { L: ['100', '100', '100', '100', '111'], U: ['101', '101', '101', '101', '111'], C: ['011', '100', '100', '100', '011'], Y: ['101', '101', '010', '010', '010'], I: ['1', '1', '1', '1', '1'],
    O: ['010', '101', '101', '101', '010'], A: ['010', '101', '111', '101', '101'], D: ['110', '101', '101', '101', '110'], N: ['1001', '1101', '1011', '1001', '1001'], G: ['011', '100', '101', '101', '011'], '.': ['0', '0', '0', '0', '1'], ' ': ['00'] };
  const widthOf = (str, k) => [...str].reduce((w, ch) => w + ((FONT[ch] || FONT[' '])[0].length + 1) * k, 0) - k;

  let D = null, sheet = null, frames = [], ready = null, running = false, raf = 0, t0 = 0, lastPaint = 0;
  let cv = null, ctx = null, buf = null, bx = null, img = null, d32 = null, W = 0, H = 0, K = 1, dpr = 1, HZ = 0, FEET = 0, X0 = 0, portrait = false;

  function fetchBit(base) {
    const im = new Image();
    return Promise.all([
      fetch(base + 'spotlight.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      new Promise((res, rej) => { im.onload = () => res(im); im.onerror = rej; im.src = base + 'spotlight.webp'; }),
    ]);
  }
  function load() {
    if (ready) return ready;
    let shown = SCREEN;
    ready = fetchBit(BASE).catch(() => { if (BASE === ROOT) throw new Error('no frames'); shown = 'spotlight'; return fetchBit(ROOT); })
      .then(([data, image]) => {
        D = data; sheet = image; frames = data.frames.map((n) => data.images[n]);
        try { localStorage.setItem(LAST, shown); } catch (e) { /* blocked storage: no memory, still random */ }
        return true;
      }).catch(() => false);
    return ready;
  }

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const dw = Math.round(innerWidth * dpr), dh = Math.round(innerHeight * dpr);
    portrait = dw < dh * 0.9;
    K = Math.max(1, Math.floor(Math.min(dw / (portrait ? 200 : 270), dh / 230)));   // the heist's room pixel (a size larger on a phone, so he is not lost in the tall screen)
    W = Math.ceil(dw / K); H = Math.ceil(dh / K);
    const tall = TALL[SCREEN] || 140;
    FEET = Math.max(tall, Math.round((H - tall - NAME_GAP - FURNITURE) / 2) + tall);   // him, the name and the bar, one group centred top to bottom
    HZ = FEET - Math.round(H * (portrait ? 0.18 : 0.26));          // the cyc meets the floor behind him
    X0 = Math.round(W / 2 - (CENTRE[SCREEN] || 0));               // his head, over the bit, under the centred name
    cv.width = W * K; cv.height = H * K; cv.style.width = (W * K / dpr) + 'px'; cv.style.height = (H * K / dpr) + 'px';
    buf.width = W; buf.height = H; img = bx.createImageData(W, H); d32 = new Uint32Array(img.data.buffer);
  }

  // ── The room for one moment: black, or the lamp on him at (lx, ly) with intensity a ──
  function room(lx, ly, a) {
    if (a <= 0) { d32.fill(L32[0]); bx.putImageData(img, 0, 0); return; }
    const top = -H * 0.25, rx = portrait ? 40 : 50, ry = portrait ? 10 : 12, sx = 30, sy = 4.5;
    for (let y = 0, i = 0; y < H; y++) {
      const by = (y & 3) << 2;
      const u = clamp((y - top) / (ly - top), 0, 1), half = 5 + (rx - 5) * u, cx = lx - 14 * (1 - u);   // the cone from above, a touch behind him
      const haze = y < HZ ? 0.26 + 0.1 * u : 0.16;                    // the beam on the cyc behind him, and in the air over the floor
      for (let x = 0; x < W; x++, i++) {
        let v = y < HZ ? 0.035 : 0.02;                                  // the room in the lamp's spill
        const dc = Math.abs(x - cx) / half;
        if (y < ly && dc < 1) v = Math.max(v, haze * (1 - dc * dc * 0.6));
        if (y >= HZ) {
          const ex = (x - lx) / rx, ey = (y - ly) / ry, e = ex * ex + ey * ey;
          if (e < 1.6) v = Math.max(v, 0.92 * Math.max(0, 1 - e / 1.6));   // the pool on the floor
          const cx2 = (x - lx) / sx, cy2 = (y - ly - 1) / sy;
          if (cx2 * cx2 + cy2 * cy2 < 1) v *= 0.35;                     // his contact shadow
        }
        if (y === HZ || y === HZ - 1) v *= 0.55;                        // where the cyc meets the floor
        const lv = clamp(Math.floor(v * a * (NL - 1) + 0.5 + BAYER[by | (x & 3)]), 0, NL - 1);
        d32[i] = L32[lv];
      }
    }
    bx.putImageData(img, 0, 0);
  }

  function text(str, x, y, k, col) { bx.fillStyle = col; for (const ch of str) { const gl = FONT[ch] || FONT[' ']; gl.forEach((r, j) => [...r].forEach((b, i) => { if (b === '1') bx.fillRect(x + i * k, y + j * k, k, k); })); x += (gl[0].length + 1) * k; } }
  // The clip twinkles while he admires it (Lucy: "make the paper clip more apparent"): a four-point pixel star at the
  // drawing's clip anchor, twice in the first third of a second, then a soft glow pixel between.
  function glint(x, y, tt) {
    const ph = tt % 0.17, big = ph < 0.05 ? 2 : ph < 0.09 ? 1 : 0;
    bx.fillStyle = 'rgb(246, 250, 255)'; bx.fillRect(x, y, 1, 1);
    if (!big) return;
    bx.fillStyle = 'rgb(206, 214, 252)';
    for (let i = 1; i <= big + 1; i++) { bx.fillRect(x + i, y, 1, 1); bx.fillRect(x - i, y, 1, 1); bx.fillRect(x, y + i, 1, 1); bx.fillRect(x, y - i, 1, 1); }
    if (big > 1) { bx.fillStyle = 'rgb(246, 250, 255)'; bx.fillRect(x + 1, y, 1, 1); bx.fillRect(x - 1, y, 1, 1); bx.fillRect(x, y + 1, 1, 1); bx.fillRect(x, y - 1, 1, 1); }
  }
  // The loading screen's furniture, under the stage: her name, the segmented bar, LOADING with its dots.
  function furniture(fill, t) {
    const k = 3, nw = widthOf(NAME, k), cx = Math.round(W / 2), top = Math.min(H - FURNITURE, FEET + NAME_GAP);
    text(NAME, cx - Math.round(nw / 2), top, k, INK);
    const bw = Math.max(nw, 96), sw = (bw - (SEGS - 1)) / SEGS, by = top + 5 * k + 7, x0 = cx - Math.round(bw / 2);
    const lit = fill * SEGS;
    for (let i = 0; i < SEGS; i++) {
      const x = Math.round(x0 + i * (sw + 1)), w = Math.round(x0 + (i + 1) * (sw + 1) - 1) - x;
      const on = i < Math.floor(lit), head = i === Math.floor(lit) && fill < 1;
      bx.fillStyle = on ? LAV : head && Math.floor(t * 6) % 2 === 0 ? MID : DIM;   // the segment being filled blinks
      bx.fillRect(x, by, w, 4);
    }
    const dots = '...'.slice(0, Math.floor(t * 4) % 4);
    text(LABEL + dots, cx - Math.round(widthOf(LABEL + '...', 1) / 2), by + 8, 1, MID);   // centred with its dots counted, so it holds still as they come
  }

  let readyAt = null, done = false;
  function frame(now) {
    if (!running) return;
    const interval = 1000 / (D.fps || 24), elapsed = now - lastPaint;
    if (elapsed + 0.001 < interval) { raf = requestAnimationFrame(frame); return; }
    lastPaint += Math.floor((elapsed + 0.001) / interval) * interval;
    const t = (now - t0) / 1000, nF = frames.length, fps = D.fps || 24, bit = LAMP + nF / fps;
    const appReady = !!window.__appReady;
    // the lamp cuts when the bit ends, or, if the page is late, when it has mounted (at most LATE_MAX later)
    if (appReady && readyAt == null) readyAt = t;
    const cut = readyAt != null ? Math.max(bit, Math.min(readyAt, bit + LATE_MAX)) : t > bit + LATE_MAX ? bit + LATE_MAX : Infinity;
    const f = clamp(Math.floor((t - LAMP) * fps), 0, nF - 1), im = frames[f], g0 = frames[0].gnd;
    const gx = X0, gy = FEET + (im.gnd[1] - g0[1]);
    // the lamp snaps on with a flick (on, half, on), holds with a faint flicker, and cuts
    let a = 0;
    if (t >= LAMP && t < cut) a = t < LAMP + 0.04 ? 1 : t < LAMP + 0.08 ? 0.55 : 1 + (REDUCED ? 0 : 0.02 * Math.sin(t * 41) + 0.012 * Math.sin(t * 97));
    room(gx, gy, a);
    if (a > 0) {
      const [cw, ch] = D.cell, cols = D.cols, sx = (im.cell % cols) * cw, sy = Math.floor(im.cell / cols) * ch;
      bx.drawImage(sheet, sx, sy, cw, ch, Math.round(gx - im.gnd[0]), Math.round(gy - im.gnd[1]), cw, ch);
      if (im.clip && f < (D.admireEnd || 8) && !REDUCED) glint(Math.round(gx - im.gnd[0] + im.clip[0]), Math.round(gy - im.gnd[1] + im.clip[1]), t - LAMP);
    }
    const fill = t >= cut ? 1 : Math.min(appReady ? 1 : 0.94, t / bit);   // never full before the page is
    furniture(fill, t);
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(buf, 0, 0, W * K, H * K);
    if (!done && t >= cut + AFTER) { done = true; api.exit(false); return; }   // the bar is full and the lamp is out: the page
    raf = requestAnimationFrame(frame);
  }

  const skip = () => { if (running && loader.classList.contains('intro-skip-ready')) api.exit(true); };
  const onResize = () => { if (running) layout(); };
  function begin() {
    if (!loader.classList.contains('intro-spot') || running) return;   // only in spot mode: a Replay opening plays the heist
    clearTimeout(dropTimer);
    if (!cv) {
      cv = document.createElement('canvas'); cv.className = 'spot-stage'; cv.setAttribute('aria-hidden', 'true');
      ctx = cv.getContext('2d'); buf = document.createElement('canvas'); bx = buf.getContext('2d');
    }
    loader.insertBefore(cv, loader.firstChild);
    layout(); room(0, 0, 0); ctx.drawImage(buf, 0, 0, W * K, H * K);
    load().then((ok) => {
      if (!ok || !loader.classList.contains('intro-spot') || loader.classList.contains('is-done')) return;   // no frames: the backstop ends the dark screen
      const nF = frames.length, total = LAMP + nF / (D.fps || 24) + AFTER;
      running = true; done = false; readyAt = null; t0 = performance.now(); lastPaint = t0;
      api.hold(Math.round((total + LATE_MAX + 0.3) * 1000), OUT_MS);   // the backstop, past a late page; the engine exits itself
      loader.addEventListener('pointerdown', skip); addEventListener('resize', onResize);
      raf = requestAnimationFrame(frame);
    });
  }
  let dropTimer = 0;
  function stop() {   // at the exit the last frame (the name) stays up while the overlay steps out; the canvas goes after
    running = false; cancelAnimationFrame(raf);
    loader.removeEventListener('pointerdown', skip); removeEventListener('resize', onResize);
    clearTimeout(dropTimer); dropTimer = setTimeout(() => { if (!running && cv && cv.parentNode) cv.parentNode.removeChild(cv); }, OUT_MS + 80);
  }
  window.__spotlightOpening = { get playing() { return running; }, get frames() { return frames.length; }, screen: SCREEN };   // the checks' hook
  api.mount(begin, stop);
})();
