/*
 * The paperclip heist: the first-visit opening on a small night stage. Spec:
 * docs/superpowers/specs/2026-10-21-opening-paperclip-heist-design.md; look test:
 * .superpowers/brainstorm/<session>/content/opening-room.html.
 *
 * The site's opening since 2026-10-21 (Lucy: "wheres loading screen new"); it replaced the
 * contact sheet, whose markup stays in #ll-loader as what shows if this file cannot load. The
 * inline lifecycle in index.html sets window.__heist and injects this file only when the
 * opening plays (a first visit in the tab, ?heist, /hell) or is replayed: loading it parks the
 * nav wordmark for the name it flies in.
 *
 * The room is a 2D canvas at one room pixel per Medium body pixel, upscaled with nearest
 * neighbour: a pale cyc over a deck of boards, lit by two footlights (blue left, lavender right)
 * from below the stage lip, quantised to a 23-colour palette with an ordered dither. "Lucy Liu"
 * is a shadow on the cyc; so is the creature, cast by both lamps. (The line under the name and
 * in the corner, "Design, code, performance.", came out on 2026-10-22, at Lucy's request.) The heist
 * plays from the creature board (assets/heist/, lifted by scripts/heist-assets.py). Then the
 * lights go down, the name's shadow flips to light and flies onto the hero's lit name (the nav logo when
 * the hero's is not laid out). It is set in the hero's face from the start and resolves from room pixels into the
 * hero's own words early in the flight, so one name makes the whole trip. The overlay fades onto the site.
 *
 * /hell (window.__hell, lucyliu.xyz/hell) plays the same heist and then goes to hell: at TURN the
 * footlights dissolve to blood red and ember, the name's shadow glitches from "Lucy Liu" into
 * "Lucifer", and the creature swaps to its evil sheet (sprites-hell.webp,
 * baked by scripts/heist-hell-assets.py) and tweaks: stutters, jitter, shoved slices. Every
 * hell branch is marked HELL; ?heist never takes one.
 *
 * Lifecycle: LucyIntro.mount(begin, stop) like the contact sheet. LucyIntro.hold() extends the
 * backstop to the heist's length once its frames are in and lets the hand-over finish before
 * the overlay goes. Any key or a press goes straight to the hand-over; the skip link, a hidden tab and
 * reduced motion end it at once.
 */
(function () {
  'use strict';
  const api = window.LucyIntro, loader = document.getElementById('ll-loader');
  if (!api || !loader || !window.__heist) return;
  loader.classList.add('intro-heist');
  const HELL = !!window.__hell;
  if (HELL) loader.classList.add('intro-hell');
  // The nav wordmark rests instead of sweeping in (FlowingMenu): the name lands on the hero's (or on it), and on
  // the home page the wordmark only comes back once the hero has scrolled away.
  window.__loaderWave = true;

  const BASE = 'assets/heist/';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ── Palette: the night, then a ramp for each footlight (blue, lavender, both) ─────────────
  const LB = [0.40, 0.64, 1.0], LL = [0.76, 0.62, 1.0], LBOTH = [0.58, 0.63, 1.0];
  const ramps = (night, lamps, top) => {
    const P = night.slice();
    lamps.forEach((c) => [0.2, 0.32, 0.46, 0.62, 0.8, 1.0].forEach((v) => P.push(c.map((u) => Math.round(u * v * 255)))));
    return P.concat(top);
  };
  const pal32 = (P) => new Uint32Array(P.map((c) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0));
  const PAL = ramps([[5, 6, 15], [9, 11, 30], [14, 18, 46]], [LBOTH, LB, LL], [[206, 214, 252], [236, 240, 255]]);
  const PAL32 = pal32(PAL);
  // HELL: crimson (left) and scarlet (right) footlights on a red-black night; same 23 slots
  const HB = [1.0, 0.07, 0.12], HE = [1.0, 0.2, 0.1], HBOTH = [1.0, 0.13, 0.11];
  const PALH = ramps([[12, 3, 5], [24, 5, 9], [40, 8, 14]], [HBOTH, HB, HE], [[255, 206, 196], [255, 236, 230]]);
  const PALH32 = pal32(PALH);
  let LUT = null, LUTH = null;
  function lutOf(P) {
    const L = new Uint8Array(32768);
    for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
      const R = r * 255 / 31, G = g * 255 / 31, B = b * 255 / 31; let best = 0, bd = Infinity;
      for (let p = 0; p < P.length; p++) { const dr = R - P[p][0], dg = G - P[p][1], db = B - P[p][2], d = 0.8 * dr * dr + 1.1 * dg * dg + 0.7 * db * db; if (d < bd) { bd = d; best = p; } }
      L[(r << 10) | (g << 5) | b] = best;
    }
    return L;
  }
  function buildLut() { LUT = lutOf(PAL); if (HELL) LUTH = lutOf(PALH); }
  const SPREAD = 0.075;
  const rgbOf = (p) => 'rgb(' + p.join(',') + ')';
  const FLASH = rgbOf(PAL[PAL.length - 1]), FLASH_RIM = rgbOf(PAL[PAL.length - 2]), NIGHT = rgbOf(PAL[1]);

  // ── The board (frames, images, sheets) ────────────────────────────────────────────
  let D = null, F = [], IM = {}, HFPS = 24, CW = 256, CH = 192, HEIST = 10;
  let S = 256 / 4.8, IMG_PX_PER_U = 960 / 4.8, LIFT_Y = Math.cos(16 * Math.PI / 180);
  const STAGE_U = 8;
  const STAGE_MID = 0.8;   // on wide screens the middle of where he works, from the clip (0) to where he stands with it (1.6), sits on the centre line
  const sheets = { sprites: null, dorsal: null, hell: null };
  let dataReq = null;
  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }
  function loadBoard() {
    if (dataReq) return dataReq;
    dataReq = fetch(BASE + 'heist.json?v=drawn-contacts-v1').then((r) => { if (!r.ok) throw new Error('heist.json ' + r.status); return r.json(); }).then((d) => {
      D = d; F = d.frames; IM = d.images; HFPS = d.sequence.motion.fps; HEIST = F.length / HFPS; retime(); buildCues();
      CW = d.sheets.medium.sprites.cell[0]; CH = d.sheets.medium.sprites.cell[1];
      S = 256 / d.sequence.camera.ortho_scale; IMG_PX_PER_U = 960 / d.sequence.camera.ortho_scale;
      LIFT_Y = Math.cos(d.sequence.camera.elevation_deg * Math.PI / 180);
      return Promise.all([loadImage(BASE + 'sprites.webp'), loadImage(BASE + 'dorsal.webp')]);
    }).then((ims) => { sheets.sprites = ims[0]; sheets.dorsal = ims[1]; silCache.clear(); return true; });
    dataReq.catch(() => { dataReq = null; });
    return dataReq;
  }

  // ── State ───────────────────────────────────────────────────────────────────────
  let cv = null, out = null;
  const buf = document.createElement('canvas'), bx = buf.getContext('2d', { willReadFrequently: true });
  let W = 0, H = 0, K = 1, HZ = 0, FEET = 0, portrait = false, dpr = 1, fontsReady = false, STAGE_CX = 0, camX = 0;
  let img = null, d32 = null, alb, amb, AO, F0, F1, T0, T1, C0, C1;
  let nm0 = null, nameMask = null, nameBox = null, flipAmt = 0, flying = false;
  const scene = { lights: [], Ly: 0 };
  let lastCS = null, light = 0;

  // ── The name, in the hero's own face ──────────────────────────────────────────────
  // Syne 700 at the hero's tracking, and in the hero's case (Lucy, Nov 4: "make the stylized transition of lucy liu to
  // the hero more natural, can change font of the lucy liu on loading page to match better, but dont make it stack on
  // top of each"; it was lowercase Anybody with a navette, and the last stretch of the flight crossfaded two different
  // sets of letters). The same run of letters from the cyc to the hero, always on one line here. Kerned as the page
  // kerns it: each pen is the run up to and including the letter, less the letter.
  const NAME_FONT = '700 {F}px Syne, sans-serif', NAME_TRACK = -0.035;
  const WORD = [...'Lucy Liu'];
  function setName(c, Fz) { c.font = NAME_FONT.replace('{F}', Fz); }
  function layoutWord(c, Fz, word) {
    const chars = word || WORD, text = chars.join(''), items = [], track = Fz * NAME_TRACK;
    setName(c, Fz);
    chars.forEach((ch, i) => { items.push({ ch, x: c.measureText(text.slice(0, i + 1)).width - c.measureText(ch).width + i * track }); });
    return { items, width: c.measureText(text).width + (chars.length - 1) * track };
  }
  function drawWord(c, ox, b, Fz, lay) {
    setName(c, Fz);
    for (const it of lay.items) if (it.ch !== ' ') c.fillText(it.ch, ox + it.x, b);
  }
  // the name's words, each with its pen in the run and where its share of the room's pixels ends
  function wordsOf(lay) {
    const words = []; let w = null;
    lay.items.forEach((it, i) => {
      if (it.ch === ' ') { if (w) { w.end = it.x; w = null; } return; }
      if (!w) { w = { x: it.x, text: '', end: lay.width }; words.push(w); }
      w.text += it.ch;
    });
    return words;
  }
  function nameLayout(word) {
    const c = document.createElement('canvas').getContext('2d');
    let Fz = portrait ? Math.round(W * 0.27) : Math.round(H * 0.22), lay = layoutWord(c, Fz);
    const maxW = portrait ? W * 0.84 : W * 0.43;
    if (lay.width > maxW) { Fz = Math.floor(Fz * maxW / lay.width); lay = layoutWord(c, Fz); }
    // HELL: another word keeps the size "Lucy Liu" set, shrinking only if it would not fit
    if (word) { lay = layoutWord(c, Fz, word); if (lay.width > maxW) { Fz = Math.floor(Fz * maxW / lay.width); lay = layoutWord(c, Fz, word); } }
    const x = Math.round((W - lay.width) / 2);
    const b = portrait ? Math.max(156, Math.round(HZ * 0.34)) : Math.round(HZ * 0.36);
    return { F: Fz, lay, x, base: b };
  }

  // ── Masks ───────────────────────────────────────────────────────────────────────
  function mask(fn) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = 'rgb(0,0,0)'; x.textBaseline = 'alphabetic'; fn(x);
    const d = x.getImageData(0, 0, W, H).data, m = new Float32Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] / 255;
    return m;
  }
  function blur(m, r, w, h, passes = 2) {
    if (r <= 0) return m;
    const t = new Float32Array(m.length), n = 2 * r + 1;
    for (let pass = 0; pass < passes; pass++) {
      for (let y = 0; y < h; y++) { let s = 0; const o = y * w;
        for (let x = -r; x <= r; x++) s += m[o + clamp(x, 0, w - 1)];
        for (let x = 0; x < w; x++) { t[o + x] = s / n; s += m[o + Math.min(w - 1, x + r + 1)] - m[o + Math.max(0, x - r)]; } }
      for (let x = 0; x < w; x++) { let s = 0;
        for (let y = -r; y <= r; y++) s += t[clamp(y, 0, h - 1) * w + x];
        for (let y = 0; y < h; y++) { m[y * w + x] = s / n; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
    }
    return m;
  }

  // ── Layout ──────────────────────────────────────────────────────────────────────
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const dw = Math.round(innerWidth * dpr), dh = Math.round(innerHeight * dpr);
    K = Math.max(1, Math.floor(Math.min(dw / 270, dh / 230)));
    W = Math.ceil(dw / K); H = Math.ceil(dh / K); portrait = W < H * 0.9;
    FEET = portrait ? Math.round(H - Math.max(84, H * 0.17)) : Math.round(H * 0.86);
    HZ = FEET - (portrait ? 74 : Math.round(H * 0.2));
    STAGE_CX = W / 2;   // centred (Lucy, 2026-11-04: "make sure all loading screens are centered"); see STAGE_MID
    cv.width = W * K; cv.height = H * K; cv.style.width = (W * K / dpr) + 'px'; cv.style.height = (H * K / dpr) + 'px';
    buf.width = W; buf.height = H; img = bx.createImageData(W, H); d32 = new Uint32Array(img.data.buffer);
    const n = W * H;
    alb = new Float32Array(n * 3); amb = new Float32Array(n * 3);
    AO = new Float32Array(n); F0 = new Float32Array(n); F1 = new Float32Array(n); T0 = new Float32Array(n); T1 = new Float32Array(n); C0 = new Float32Array(n); C1 = new Float32Array(n);
    lastCS = null; build();
  }

  // ── The room: a cyc lit from the stage lip by two footlights, blue left and lavender right ──
  function build() {
    alb.fill(0); amb.fill(0); AO.fill(1); F0.fill(0); F1.fill(0); T0.fill(0); T1.fill(0); C0.fill(0); C1.fill(0);
    const vpx = W * 0.5, vpy = HZ - H * 0.95, P = 2400 / (H - vpy);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, j = i * 3;
      if (y < HZ) { alb[j] = 0.86; alb[j + 1] = 0.89; alb[j + 2] = 0.98; }
      else {
        const sp = P * (y - vpy) / 100, u = (x - vpx) / (y - vpy) * 100 / P;
        const seam = Math.abs(((u % 1) + 1.5) % 1 - 0.5) * sp < 0.55 ? 0.7 : 1;
        alb[j] = 0.36 * seam; alb[j + 1] = 0.38 * seam; alb[j + 2] = 0.5 * seam;
      }
      if (y >= HZ - 2 && y < HZ + 1) { alb[j] *= 0.35; alb[j + 1] *= 0.35; alb[j + 2] *= 0.4; }
      const v = 1 - 0.55 * Math.pow(Math.hypot((x / W - 0.5) * 1.1, y / H - 0.42), 2);
      amb[j] = 0.03 * v; amb[j + 1] = 0.036 * v; amb[j + 2] = 0.085 * v;
    }
    // a lamp either side of where he works, so the room is lit evenly about the centred name and his two shadows part
    const L = [{ x: W * (portrait ? 0.18 : 0.3), k: 0.5 }, { x: W * (portrait ? 0.74 : 0.7), k: 0.48 }];
    const Ly = H + (portrait ? H * 0.6 : H * 1.05);
    scene.lights = L; scene.Ly = Ly;
    L.forEach((l, li) => {
      const f = li ? F1 : F0, sx = W * (portrait ? 0.62 : 0.4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let v;
        if (y < HZ) { const gx = (x - l.x) / sx, up = (HZ - y) / HZ; v = Math.exp(-gx * gx) * (1 - 0.5 * up * up); }
        else { const gx = (x - l.x) / (W * 0.32), gy = (H + 10 - y) / (H - HZ + 34); v = Math.exp(-(gx * gx + gy * gy) * 1.3) * 1.35; }
        f[y * W + x] = v * l.k;
      }
    });
    buildName(0);
  }
  // The words' shadows and the name's mask. glitch (HELL, as the name turns) shoves each lamp's
  // shadow its own random way, so the two coloured fringes tear apart.
  function buildName(glitch) {
    if (!fontsReady) return;
    const nm = nameLayout(nameWord);
    const g = () => (glitch ? Math.round((Math.random() - 0.5) * 2 * glitch) : 0);
    // each lamp pushes the name's shadow away from itself and leans it the same way; the name
    // stands off the cyc, so its edge is soft
    const shadowOf = (dx, shear, sy) => {
      const tf = (c, k) => { const b = nm.base; c.setTransform(1, 0, -shear * k * sy, sy, shear * k * sy * b + dx * k, b * (1 - sy)); };
      return blur(mask((c) => { tf(c, 1); drawWord(c, nm.x, nm.base, nm.F, nm.lay); }), 1, W, H, 1);
    };
    T0.set(shadowOf(2 + g(), 0.05, 1.04)); T1.set(shadowOf(-2 + g(), -0.035, 1.04));
    // the name where the two shadows meet: the pixels that flip to light at the hand-over
    nm0 = nm; const m = mask((c) => drawWord(c, nm.x, nm.base, nm.F, nm.lay));
    nameMask = new Uint8Array(W * H); let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] > 0.5) { nameMask[y * W + x] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1); }
    nameBox = { x0, y0, x1, y1 };
  }
  function flick(i) { return REDUCED ? 1 : 1 + 0.018 * Math.sin(clock * 7.3 + i * 2.1) + 0.012 * Math.sin(clock * 13.7 + i * 5.3) + 0.008 * Math.sin(clock * 29.1 + i); }
  function renderRoom() {
    const f0 = flick(0) * light, f1 = flick(1) * light;
    for (let y = 0, i = 0; y < H; y++) { const by = (y & 3) << 2;
      for (let x = 0; x < W; x++, i++) {
        const j = i * 3, ao = AO[i];
        const l0 = F0[i] * (1 - Math.max(T0[i], C0[i])) * f0 * ao, l1 = F1[i] * (1 - Math.max(T1[i], C1[i])) * f1 * ao;
        const o = BAYER[by | (x & 3)] * SPREAD;
        if (hellAmt > 0 && BAYER4[by | (x & 3)] < hellAmt) {   // HELL: this pixel has turned
          let r = ((alb[j] * (amb[j + 2] * ao + HB[0] * l0 + HE[0] * l1) + o) * 31 + 0.5) | 0;
          let g = ((alb[j + 1] * (amb[j] * 0.5 * ao + HB[1] * l0 + HE[1] * l1) + o) * 31 + 0.5) | 0;
          let b = ((alb[j + 2] * (amb[j] * 0.6 * ao + HB[2] * l0 + HE[2] * l1) + o) * 31 + 0.5) | 0;
          r = r < 0 ? 0 : r > 31 ? 31 : r; g = g < 0 ? 0 : g > 31 ? 31 : g; b = b < 0 ? 0 : b > 31 ? 31 : b;
          d32[i] = PALH32[LUTH[(r << 10) | (g << 5) | b]];
          continue;
        }
        let r = ((alb[j] * (amb[j] * ao + LB[0] * l0 + LL[0] * l1) + o) * 31 + 0.5) | 0;
        let g = ((alb[j + 1] * (amb[j + 1] * ao + LB[1] * l0 + LL[1] * l1) + o) * 31 + 0.5) | 0;
        let b = ((alb[j + 2] * (amb[j + 2] * ao + LB[2] * l0 + LL[2] * l1) + o) * 31 + 0.5) | 0;
        r = r < 0 ? 0 : r > 31 ? 31 : r; g = g < 0 ? 0 : g > 31 ? 31 : g; b = b < 0 ? 0 : b > 31 ? 31 : b;
        d32[i] = PAL32[LUT[(r << 10) | (g << 5) | b]];
      }
    }
    bx.putImageData(img, 0, 0);
  }

  // ── The heist, from the creature board, at one room pixel per body pixel ───────────────
  const hash = (a, b, c) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const stageX = (x) => (x - camX) * S + STAGE_CX;
  let subframe = 0, exitSubframe = 0, drawDt = 1 / 60;
  function motionAt(f) {
    const a = F[f];
    let j = f + 1;
    while (j < F.length - 1 && DUR[j] === 0) j++;
    const b = F[j] && F[j].img ? F[j] : a;
    const u = f === heistFrame() ? (leaving >= 0 ? exitSubframe : subframe) : 0;
    const height = (v) => v.height != null ? v.height : Math.max(0, IM[v.img].low + (v.lift || 0));
    const x = (v) => v.renderX != null ? v.renderX : v.x;
    // A planted paw stays still until the drawing changes. Air and travel move at display refresh rate.
    const planted = a.plant && a.plant === b.plant;
    return { x: lerp(x(a), planted ? x(a) : x(b), u), height: lerp(height(a), height(b), u),
      depth: lerp(a.depth || 0, b.depth || 0, u), fade: lerp(a.fade || 0, b.fade || 0, u) };
  }
  function place(f) {
    const fr = F[f], im = IM[fr.img], motion = motionAt(f);
    const ds = 1 - motion.depth * 0.35, ground = FEET - motion.depth * 0.9 * S, scale = S / IMG_PX_PER_U * ds;
    // The drawn feet/body set contact, rather than the Blender planning rig.
    const contact = im.contact, height = motion.height;
    const sx = stageX(motion.x), bp = 960 * scale / 256;
    const crouch = IM['k03-crouch'];
    const floorOffset = contact && crouch.contact ? crouch.contact[1] - crouch.gnd[1] : 0;
    const floor = ground + floorOffset * scale; // keep the original crouch's contact line
    const fx = sx - (contact ? contact[0] : im.pel[0] - im.slide[0]) * scale;
    const fy = floor - (contact ? contact[1] : im.gnd[1]) * scale - height * LIFT_Y * S * ds;
    return { fx: Math.round(fx), fy: Math.round(fy), scale, ground: floor, ds, sx, bp, height, fade: motion.fade };
  }
  const INK_N = ['#2f45c2', '#4a63e0', '#a99cf6', '#c4b0ff', '#e2eeff'], INK_H = ['#8a0a1c', '#c8162e', '#f0563f', '#ff8a66', '#ffd9cc'];
  let INK = INK_N;
  const term = document.createElement('canvas'), tctx = term.getContext('2d');
  function terminal(name, t) {   // the hero's terminal cells breathing on his back, inside the dorsal mask
    const dm = sheets.dorsal; if (!dm) return null;
    const [gw, gh] = D.sheets.medium.dorsal.cell, c = IM[name].cell, ox = (c % D.cols) * gw, oy = Math.floor(c / D.cols) * gh;
    if (term.width !== gw || term.height !== gh) { term.width = gw; term.height = gh; }
    tctx.globalCompositeOperation = 'source-over'; tctx.clearRect(0, 0, gw, gh);
    if (REDUCED) t = 0;
    const n = gw / 128;
    for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) {
      const r = hash(x, y, 7); if (r >= 0.26) continue;
      const scan = 0.5 + 0.5 * Math.sin(y * 0.35 - t * 2.2 + hash(x, 0, 3) * 2), pulse = 0.5 + 0.5 * Math.sin(t * (1.4 + hash(x, y, 8)) + hash(x, y, 9) * Math.PI * 2);
      tctx.globalAlpha = (0.15 + 0.65 * pulse * pulse) * (0.55 + 0.45 * scan);
      tctx.fillStyle = r < 0.07 ? INK[2] : r < 0.15 ? INK[1] : INK[0]; tctx.fillRect(x * n, y * n, n, n);
    }
    tctx.globalAlpha = 1; tctx.globalCompositeOperation = 'destination-in'; tctx.drawImage(dm, ox, oy, gw, gh, 0, 0, gw, gh); tctx.globalCompositeOperation = 'source-over';
    return term;
  }
  function trail(c, f) {   // when he moves fast, a few ink pixels fall off his trailing side
    for (let p = Math.max(1, f - 7); p <= f; p++) {
      const a = F[p], b = F[p - 1]; if (!a.img || !b.img) continue;
      const v = a.x - b.x; if (Math.abs(v) < 0.05) continue;
      const P = place(p), box = IM[a.img].box, dir = Math.sign(v), age = f - p, n = Math.min(7, Math.round(Math.abs(v) * 40));
      for (let i = 0; i < n; i++) {
        const r1 = hash(p, i, 1), r2 = hash(p, i, 2), r3 = hash(p, i, 3);
        const bxx = P.fx + (dir > 0 ? box[0] + (box[2] - box[0]) * r1 * 0.3 : box[2] - (box[2] - box[0]) * r1 * 0.3) * P.scale;
        const byy = P.fy + (box[1] + (box[3] - box[1]) * (0.25 + 0.7 * r2)) * P.scale;
        const x = bxx - dir * (0.5 + r3) * P.bp * age * 1.2, y = byy + (r3 - 0.3) * P.bp * age * 0.6;
        c.globalAlpha = Math.max(0, 1 - age / 8) * (0.5 + 0.4 * r1); c.fillStyle = INK[Math.floor(r2 * 4)];
        const m = (r3 > 0.8 ? 2 : 1) * P.bp; c.fillRect(Math.round(x / P.bp) * P.bp, Math.round(y / P.bp) * P.bp, m, m);
      }
    }
    c.globalAlpha = 1;
  }
  const BURST_N = ['#5b6eff', '#8f7dff', '#c4b0ff', '#e2eeff'], BURST_H = ['#d0182e', '#ff3b2f', '#ff8f5a', '#ffe2d2'];
  let BURST_INK = BURST_N;
  function burst(c, cx, cy, R, f, bp, alpha) {   // the roll's manga burst: rays spin and pump, dot rings ripple out, it pulses
    const q = Math.max(2, Math.round(bp * 2)), n = Math.ceil(R / q), rays = 18, spin = f * 0.07;
    const ang = (k) => (k / rays) * Math.PI * 2 + hash(k, 7, 1) * 0.35 + spin * (k % 2 ? 1 : 0.8);
    const len = (k) => 0.45 + 0.35 * hash(k, 3, 3) + 0.2 * Math.sin(f * 0.9 + k * 1.7);
    const ring = (f * 0.045) % 0.12;
    c.save(); c.globalAlpha = alpha;
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const x = i * q, y = j * q, d = Math.hypot(x, y) / R; if (d > 1) continue;
      const a = Math.atan2(y, x); let ray = -1;
      for (let k = 0; k < rays; k++) {
        const L = len(k), w = 0.01 + (0.09 + 0.07 * hash(k, 9, 2)) * Math.max(0, 1 - d / L) ** 0.9;
        const da = Math.abs(((a - ang(k)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        if (d < L && da < w) { ray = k; break; }
      }
      let col = null; const core = 0.18 + 0.04 * Math.sin(f * 1.3);
      if (d < core) col = d < core * 0.6 ? BURST_INK[3] : (d < core * 0.8 || (i + j) & 1 ? BURST_INK[2] : null);
      else if (ray >= 0) col = d < 0.32 ? BURST_INK[3] : d < 0.55 ? BURST_INK[2] : (ray % 3 ? BURST_INK[0] : BURST_INK[1]);
      else if (d > 0.4 && d < 0.95 && i % 3 === 0 && j % 3 === 0 && ((d - ring) % 0.12) < 0.07) col = BURST_INK[1];
      if (!col) continue;
      c.fillStyle = col; c.fillRect(Math.round((cx + x) / q) * q, Math.round((cy + y) / q) * q, q, q);
    }
    c.restore();
  }
  const gcanvas = document.createElement('canvas'), gctx = gcanvas.getContext('2d');
  function glitchSprite(c, art, sx, sy, sw, sh, dx, dy, dw, dh, amount, f, bp) {   // breaks into shoved slices instead of fading
    gcanvas.width = Math.ceil(dw); gcanvas.height = Math.ceil(dh);
    gctx.imageSmoothingEnabled = false; gctx.clearRect(0, 0, gcanvas.width, gcanvas.height); gctx.drawImage(art, sx, sy, sw, sh, 0, 0, dw, dh);
    const bands = 7, bh = dh / bands;
    for (let k = 0; k < bands; k++) {
      if (amount > 0.25 && hash(k, f, 5) < amount * 0.9) continue;
      const shift = Math.round((hash(k, f, 6) - 0.5) * 2 * (4 + 18 * amount) / bp) * bp;
      c.globalAlpha = 0.55; c.drawImage(gcanvas, 0, k * bh, dw, bh, dx + shift - 2 * bp, dy + k * bh, dw, bh);
      c.globalAlpha = 1; c.drawImage(gcanvas, 0, k * bh, dw, bh, dx + shift, dy + k * bh, dw, bh);
    }
  }
  const PRINTS = { side: ['.......XX.', '.XXX......', 'XXXXX..XXX', 'XXXXX..XXX', '.XXX......', '.......XX.'], back: ['.XX.XX.', 'X.....X', '..XXX..', '.XXXXX.', '..X.X..'] };
  function pawPrints(c, f) {
    for (const pr of D.prints || []) {
      const age = f - pr.frame; if (age < 0 || age > 48) continue;
      const P = place(pr.frame), im = IM[F[pr.frame].img], near = im.paw.L[1] > im.paw.R[1] ? 'L' : 'R';
      const x = P.fx + (im.paw[pr.side][0] - im.slide[0]) * P.scale + (pr.side === near ? 0 : 2 * P.bp), y = P.ground - (im.paw[near][1] - im.paw[pr.side][1]) * P.scale * 0.45;
      const pat = PRINTS[pr.kind], bp = P.bp, t = Math.max(0, (age - 34) / 14);
      const x0 = Math.round(x / bp - pat[0].length / 2) * bp, y0 = Math.round(y / bp - pat.length * 0.6) * bp;
      pat.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== 'X' || BAYER4[(j % 4) * 4 + (i % 4)] < t) return;
        const lower = j === pat.length - 1 || pat[j + 1][i] !== 'X';
        c.fillStyle = INK === INK_H ? (lower ? 'rgba(120,8,24,.8)' : 'rgba(230,40,48,.75)') : (lower ? 'rgba(40,52,160,.8)' : 'rgba(91,110,255,.75)'); c.fillRect(x0 + i * bp, y0 + j * bp, bp, bp);
      }));
    }
  }
  function pixelShadow(c, cx, cy, rx, ry, a, bp) {
    const nx = Math.ceil(rx / bp), ny = Math.max(1, Math.ceil(ry / bp)), x0 = Math.round(cx / bp), y0 = Math.round(cy / bp);
    c.fillStyle = 'rgba(3,6,20,' + a + ')';
    for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
      const d = (i * bp / rx) ** 2 + (j * bp / ry) ** 2;
      if (d > 1 || (d > 0.6 && ((i + j) & 1))) continue;
      c.fillRect((x0 + i) * bp, (y0 + j) * bp, bp, bp);
    }
  }
  const CLIP = ['..##############..', '.#..............#.', '#..############..#', '#.#............#.#', '.#..##########...#', '..##############..'];
  function pixelClip(c, x, y, bp) {   // one clip, fixed while it lies on the floor
    const w = CLIP[0].length, h = CLIP.length, x0 = Math.round((x - w * bp / 2) / bp) * bp, y0 = Math.round((y - h * bp * 0.8) / bp) * bp;
    c.fillStyle = 'rgba(3,6,20,.55)'; c.fillRect(x0 + bp, y0 + h * bp - bp, (w - 1) * bp, bp * 2);
    CLIP.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') { c.fillStyle = j < 2 ? '#e8edf8' : '#c9d1e6'; c.fillRect(x0 + i * bp, y0 + j * bp, bp, bp); } }));
  }

  // ── Limited animation (board v15), so the low frame rate reads as a style. The motion track
  // flags frames (fr.fx); everything works on his own pixel grid, so no pixel changes size.
  const cellCanvas = document.createElement('canvas'), cellCtx = cellCanvas.getContext('2d');
  const sqCanvas = document.createElement('canvas'), sqCtx = sqCanvas.getContext('2d');
  const inkCanvas = document.createElement('canvas'), inkCtx = inkCanvas.getContext('2d');
  function cellOf(name, f, withTerm) {   // the frame's sprite plus its terminal back, in sprite pixels
    const im = IM[name];
    if (cellCanvas.width !== CW || cellCanvas.height !== CH) { cellCanvas.width = CW; cellCanvas.height = CH; }
    cellCtx.imageSmoothingEnabled = false; cellCtx.clearRect(0, 0, CW, CH);
    cellCtx.drawImage(art(), (im.cell % D.cols) * CW, Math.floor(im.cell / D.cols) * CH, CW, CH, 0, 0, CW, CH);
    const tm = withTerm && terminal(name, f / HFPS);
    if (tm) { cellCtx.globalAlpha = 0.8; cellCtx.drawImage(tm, 0, 0); cellCtx.globalAlpha = 1; }
    return cellCanvas;
  }
  function inked(src, w, h, col) {   // the sprite's silhouette in one ink
    if (inkCanvas.width !== w || inkCanvas.height !== h) { inkCanvas.width = w; inkCanvas.height = h; }
    inkCtx.imageSmoothingEnabled = false; inkCtx.globalCompositeOperation = 'source-over';
    inkCtx.clearRect(0, 0, w, h); inkCtx.drawImage(src, 0, 0, w, h, 0, 0, w, h);
    inkCtx.globalCompositeOperation = 'source-in'; inkCtx.fillStyle = col; inkCtx.fillRect(0, 0, w, h);
    inkCtx.globalCompositeOperation = 'source-over';
    return inkCanvas;
  }
  // Squash or stretch about the floor point under the pelvis: the size and offset, in sprite pixels.
  function squashOf(im, fxs) {
    const k = fxs && (fxs.squash || fxs.stretch);
    if (!k) return null;
    const ax = (im.contact ? im.contact[0] : im.pel[0] - im.slide[0]) * CW / 960;
    const ay = (im.contact ? im.contact[1] : im.gnd[1]) * CW / 960;
    return { w: Math.round(CW * k[0]), h: Math.round(CH * k[1]), ox: Math.round(ax - ax * k[0]), oy: Math.round(ay - ay * k[1]) };
  }
  function styled(c, im, f, P, fxs, withTerm) {
    let src = cellOf(F[f].img, f, withTerm), w = CW, h = CH, ox = 0, oy = 0;
    const u = 960 * P.scale / CW, q = squashOf(im, fxs);   // room pixels per sprite pixel
    if (q) {
      if (sqCanvas.width !== q.w || sqCanvas.height !== q.h) { sqCanvas.width = q.w; sqCanvas.height = q.h; }
      sqCtx.imageSmoothingEnabled = false; sqCtx.clearRect(0, 0, q.w, q.h); sqCtx.drawImage(src, 0, 0, CW, CH, 0, 0, q.w, q.h);
      src = sqCanvas; w = q.w; h = q.h; ox = q.ox; oy = q.oy;
    }
    if (fxs.impact) src = inked(src, w, h, fxs.impact === 1 ? NIGHT : FLASH);
    c.drawImage(src, 0, 0, w, h, P.fx + ox * u, P.fy + oy * u, w * u, h * u);
  }
  function multiples(c, f, n, P) {   // oldest faintest, lavender then cobalt, then the streak in whole sprite pixels
    const u = 960 * P.scale / CW;
    for (let k = n; k >= 1; k--) {
      const g = f - k; if (g < 0 || !F[g].img) continue;
      const Q = place(g), gu = 960 * Q.scale / CW;
      c.globalAlpha = 0.42 / k;
      c.drawImage(inked(cellOf(F[g].img, g, false), CW, CH, k === 1 ? BURST_INK[1] : BURST_INK[0]), 0, 0, CW, CH, Q.fx, Q.fy, CW * gu, CH * gu);
    }
    const g = f - 1;
    if (g >= 0 && F[g].img) {
      const Q = place(g), vx = Q.sx - P.sx, vy = Q.fy - P.fy;
      const steps = Math.min(10 * n, Math.round(Math.hypot(vx, vy) / u));
      const ink = inked(cellOf(F[f].img, f, false), CW, CH, BURST_INK[0]);
      for (let i = steps; i >= 1; i--) {
        c.globalAlpha = 0.5 * (1 - i / (steps + 1));
        c.drawImage(ink, 0, 0, CW, CH, P.fx + Math.round(0.7 * vx * i / steps / u) * u, P.fy + Math.round(0.7 * vy * i / steps / u) * u, CW * u, CH * u);
      }
    }
    c.globalAlpha = 1;
  }
  function impactBack(c, P, im, f, kind) {   // the pounce's contact: a pale flash disc, then the burst at full strength
    const cx = P.fx + (im.box[0] + im.box[2]) / 2 * P.scale, cy = P.fy + (im.box[1] + im.box[3]) / 2 * P.scale;
    const R = (im.box[2] - im.box[0]) * P.scale * 0.8, q = Math.max(2, Math.round(P.bp * 2)), n = Math.ceil(R / q);
    if (kind === 1) {
      for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
        const d = Math.hypot(i, j) / n;
        if (d > 1 || (d > 0.78 && BAYER4[((j & 3) << 2) | (i & 3)] < (d - 0.78) / 0.22)) continue;   // dithered rim
        c.fillStyle = d > 0.78 ? FLASH_RIM : FLASH;
        c.fillRect(Math.round((cx + i * q) / q) * q, Math.round((cy + j * q) / q) * q, q, q);
      }
    } else burst(c, cx, cy, R * 1.4, f, P.bp, 0.95);
  }

  // ── His shadows on the cyc: each frame's silhouette, cast by both footlights ─────────────
  const silCache = new Map(), silC = document.createElement('canvas'), silX = silC.getContext('2d', { willReadFrequently: true });
  function silOf(cell) {
    let m = silCache.get(cell); if (m) return m;
    if (silC.width !== CW || silC.height !== CH) { silC.width = CW; silC.height = CH; }
    silX.clearRect(0, 0, CW, CH); silX.drawImage(sheets.sprites, (cell % D.cols) * CW, Math.floor(cell / D.cols) * CH, CW, CH, 0, 0, CW, CH);
    const d = silX.getImageData(0, 0, CW, CH).data; m = new Float32Array(CW * CH);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 40 ? 1 : 0;
    blur(m, 1, CW, CH); silCache.set(cell, m); return m;
  }
  function castCreature(f) {
    if (lastCS) for (let y = lastCS.y0; y < lastCS.y1; y++) { C0.fill(0, y * W + lastCS.x0, y * W + lastCS.x1); C1.fill(0, y * W + lastCS.x0, y * W + lastCS.x1); }
    lastCS = null;
    const fr = F[f]; if (!fr || !fr.img || !sheets.sprites) return;
    const im = IM[fr.img], P = place(f), sil = silOf(im.cell), k = P.ds, Ly = scene.Ly;   // silhouette px to room px
    const s = (Ly - HZ) / (Ly - P.ground), air = P.height > 0.1;
    const keep = 1 - (REDUCED ? 0 : fr.fade || 0);   // his shadow goes as he glitches out
    // a squashed or stretched frame casts its squashed or stretched shape
    const sq = REDUCED || !HELL ? null : squashOf(im, fr.fx), qx = sq ? sq.w / CW : 1, qy = sq ? sq.h / CH : 1, qox = sq ? sq.ox : 0, qoy = sq ? sq.oy : 0;
    const bxa = P.fx + (qox + im.box[0] * CW / 960 * qx) * k, bxb = P.fx + (qox + im.box[2] * CW / 960 * qx) * k;
    const bya = P.fy + (qoy + im.box[1] * CW / 960 * qy) * k;
    let X0 = W, X1 = 0, Y0 = H;
    scene.lights.forEach((l, li) => {
      const C = li ? C1 : C0, Lx = l.x;
      const x0 = Math.max(0, Math.floor(Lx + s * (bxa - Lx)) - 3), x1 = Math.min(W, Math.ceil(Lx + s * (bxb - Lx)) + 3);
      const y0 = Math.max(0, Math.floor(Ly + s * (bya - Ly)) - 3);
      for (let y = y0; y < HZ; y++) {
        const v = (((Ly + (y - Ly) / s) - P.fy) / k - qoy) / qy; if (v < 0 || v >= CH - 1) continue;
        const v0 = v | 0, fv = v - v0;
        for (let x = x0; x < x1; x++) {
          const u = (((Lx + (x - Lx) / s) - P.fx) / k - qox) / qx; if (u < 0 || u >= CW - 1) continue;
          const u0 = u | 0, fu = u - u0, i = v0 * CW + u0;
          const a = (sil[i] * (1 - fu) + sil[i + 1] * fu) * (1 - fv) + (sil[i + CW] * (1 - fu) + sil[i + CW + 1] * fu) * fv;
          if (a > 0.01) C[y * W + x] = a * 0.95 * keep;
        }
      }
      if (!air) {   // on the ground, his shadow runs back along the deck to the foot of the cyc
        const mid = (bxa + bxb) / 2, half = (bxb - bxa) * 0.22, b0 = mid - half, b1 = mid + half, p0 = Lx + s * (b0 - Lx), p1 = Lx + s * (b1 - Lx);
        for (let y = HZ; y < P.ground; y++) {
          const t = (P.ground - y) / Math.max(1, P.ground - HZ), xa = lerp(b0, p0, t), xb = lerp(b1, p1, t);
          for (let x = Math.max(0, Math.floor(xa) - 2); x < Math.min(W, Math.ceil(xb) + 2); x++) { const a = smooth(xa - 1.5, xa + 1.5, x) * (1 - smooth(xb - 1.5, xb + 1.5, x)) * (0.92 - 0.25 * (1 - t)) * keep; if (a > 0) C[y * W + x] = Math.max(C[y * W + x], a); }
        }
        X0 = Math.min(X0, Math.floor(Math.min(b0, p0)) - 3); X1 = Math.max(X1, Math.ceil(Math.max(b1, p1)) + 3);
      }
      X0 = Math.min(X0, x0); X1 = Math.max(X1, x1); Y0 = Math.min(Y0, y0);
    });
    lastCS = { x0: clamp(X0, 0, W), x1: clamp(X1, 0, W), y0: clamp(Y0, 0, H), y1: clamp(Math.ceil(P.ground) + 1, 0, H) };
  }

  // ── The opening's timeline ───────────────────────────────────────────────────────
  // Lights up on the empty stage and the clip (the name appears as shadow), the heist, a beat
  // on the empty stage, then the hand-over: the lights go down, the name's shadow flips to
  // light (FLIP) and flies onto the hero's name (FLY), and the overlay fades onto the site (OUT).
  // The heist waits for its frames, up to WAIT_FRAMES seconds, then goes to the hand-over.
  const UP = 0.9, LEAD = 0.5, HOLD = 0.4, DOWN = 0.7, FLIP = 0.32, FLY = 0.95, OUT = 0.4, WAIT_FRAMES = 2.5;
  // The heist plays its board frames at RATE x 24 fps: 1.25 shows all 266 in about 8.9 s instead of 11.1 s.
  const RATE = 1.25, STEP_MS = 1000 / (24 * RATE);
  // The pounce/roll retain their original grab pace. Only reach, pinch, lift and the look-back
  // run faster (Lucy, Nov 11: pickup takes too long), with two exposures for repeated poses.
  // Unique in-betweens stay on the track; display-rate interpolation keeps travel continuous.
  const GRAB_FROM = 'k03-crouch', GRAB_TO = 'k09-lift-look-back', GRAB_RATE = 1.7, HOLD_MAX = 6, START_MAX = 4;
  const PICKUP_FROM = 'k06-k08a-', PICKUP_RATE = 3.1, PICKUP_HOLD = 2;
  const PICK = /^(?:k08a-k08|k08-k09)-(\d+)/;   // the pickup's in-betweens, named for their count
  let DUR = [], REAL = 10;   // DUR[i]: how long board frame i shows, ms (0: skipped); REAL: the heist's length, s
  function retime() {
    const a = F.findIndex((f) => f.img === GRAB_FROM), p = F.findIndex((f) => (f.img || '').startsWith(PICKUP_FROM)), lead = F.findIndex((f) => f.img);   // lead: the empty stage before he hops in
    let b = -1, run = 0;
    F.forEach((f, i) => { if (f.img === GRAB_TO) b = i; });
    DUR = F.map((f, i) => {
      run = i > 0 && f.img && f.img === F[i - 1].img ? run + 1 : 0;
      const grab = a >= 0 && i >= a && i <= b, pickup = p >= 0 && i >= p && i <= b;
      if ((i < lead && i >= START_MAX) || (grab && run >= (pickup ? PICKUP_HOLD : HOLD_MAX))) return 0;
      // the pickup's two moves (blades close on the clip, the lift) have more in-betweens than the 22 the grab was
      // timed with (Lucy, Nov 2: "add more frames in pickup of the paper clip"); they play n / 22 faster, so the
      // grab is smoother and the same length
      const pick = grab && PICK.exec(f.img || '');
      return 1000 / (HFPS * (grab ? (pickup ? PICKUP_RATE : GRAB_RATE) * (pick ? Math.max(1, +pick[1] / 22) : 1) : RATE));
    });
    REAL = DUR.reduce((sum, d) => sum + d, 0) / 1000;
  }
  // the clock's step: once the heist runs, how long the showing frame shows; before it, the board's pace at RATE
  function stepMs() { return framesReady && leaving < 0 && clock - t0 >= LEAD && DUR.length ? (DUR[heistFrame()] || STEP_MS) : STEP_MS; }
  // The flip starts as the lights start down and the flight follows it, while the lights finish.
  const HANDOVER_MS = Math.round((FLIP + FLY + OUT) * 1000) + 150;
  let clock = 0, t0 = 0, heistT = 0, leaving = -1, ended = false, landed = false, framesReady = false;
  function heistFrame() { return clamp(Math.floor(heistT * HFPS), 0, Math.max(0, F.length - 1)); }
  function frame() {
    if (!W) return;
    const t = clock - t0;
    const fi0 = heistFrame(), fi = HELL && tweaking ? Math.max(0, fi0 - ((Math.floor(clock * 24) & 1) ? 2 : 0)) : fi0, fr = framesReady ? F[fi] : null;
    const end = leaving >= 0 ? leaving : Infinity, since = leaving >= 0 ? t - leaving : -1;
    light = smooth(0, UP, t) * (leaving >= 0 ? 1 - smooth(end, end + DOWN, t) : 1);
    flipAmt = since < 0 ? 0 : clamp(since / FLIP, 0, 1);
    if (since >= FLIP && !flying) startFlight();
    // the narrow screen follows him within the stage
    const worldW = W / S;
    if (fr && portrait && fr.img) {
      const target = clamp(motionAt(fi).x, -(STAGE_U - worldW) / 2, (STAGE_U - worldW) / 2);
      camX = lerp(camX, target, 1 - Math.exp(-8 * drawDt));
    } else if (!portrait) camX = STAGE_MID;
    if (fr) castCreature(fi);
    renderRoom();
    const c = bx; c.imageSmoothingEnabled = false;
    if (fr && fr.clipX != null) pixelClip(c, stageX(fr.clipX), FEET + (fr.clipDY || 0) * S, 1);
    if (fr) pawPrints(c, fi);
    if (fr && fr.img) {
      const P = place(fi), im = IM[fr.img], fx = !REDUCED;
      const ROLL = ['k05-hug-tip', 'k06-roll-belly', 'k07-roll-back'];
      if (HELL && fx && ROLL.includes(im.key)) {
        const r0 = F.findIndex((x) => ROLL.includes(x.key)), r1 = F.length - 1 - [...F].reverse().findIndex((x) => ROLL.includes(x.key));
        const pop = Math.min(1, (fi - r0 + 1) / 4), outv = Math.max(0, (fi - (r1 - 3)) / 3);
        const bcx = P.fx + (im.box[0] + im.box[2]) / 2 * P.scale, bcy = P.fy + (im.box[1] + im.box[3]) / 2 * P.scale;
        const R = (im.box[2] - im.box[0]) * P.scale * (0.75 + 0.25 * (1 - (1 - pop) ** 3)) * (1 + 0.09 * Math.sin(fi * 1.1));   // pulses
        if (outv < 1) burst(c, bcx + (outv ? Math.round((hash(fi, 2, 2) - 0.5) * 30 * outv) : 0), bcy, R * (1 - 0.3 * outv), fi, P.bp, 0.38 * pop * (1 - outv));
      }
      const air = P.height > 0.1, sh = 1 / (1 + P.height * 1.5), box = im.box;
      const half = Math.max(0.35, (box[2] - box[0]) * P.scale / S * 0.38) * (air ? 0.75 : 1) * sh;
      pixelShadow(c, P.sx, P.ground, S * P.ds * half, S * P.ds * (air ? 0.07 : 0.12) * sh, (air ? 0.32 + 0.2 * sh : 0.55) * (1 - (fx && fr.fade || 0)), P.bp);
      if (HELL && fx) trail(c, fi);
      const keyAt = (g) => F[g] && F[g].img ? IM[F[g].img].key : null, HOP = (k) => ['k01-hop-push', 'k02-hop-land', 'k06-roll-belly', 'k07-roll-back'].includes(k);   // hops and rolls
      const hopSwitch = fx && HOP(im.key) && [0, 1].some((b) => fi - b > 0 && HOP(keyAt(fi - b - 1)) && keyAt(fi - b) !== keyAt(fi - b - 1));
      const sx = (im.cell % D.cols) * CW, sy = Math.floor(im.cell / D.cols) * CH;
      const fxs = (HELL && fx && fr.fx) || {}; // one clean silhouette in the main opening
      if (fxs.smear) multiples(c, fi, fxs.smear, P);
      if (fxs.impact) impactBack(c, P, im, fi, fxs.impact);
      if (HELL && tweaking) { P.fx += jx * P.bp; P.fy += jy * P.bp; }   // HELL: he twitches off his mark
      const shove = HELL && tweaking && Math.random() < 0.55;
      // His run-away ends in the original sliced glitch; earlier poses stay clean.
      if (fx && (P.fade || (HELL && (hopSwitch || fxs.glitch || shove)))) glitchSprite(c, art(), sx, sy, CW, CH, P.fx, P.fy, 960 * P.scale, 720 * P.scale, P.fade || fxs.glitch || (shove ? 0.3 : 0.18), fi, P.bp);
      else {
        c.save(); c.globalAlpha = 1 - (fx ? P.fade : 0);
        styled(c, im, fi, P, fxs, fx);
        c.restore();
      }
    }
    // the sprite, clip and prints sit in the stage's light too: dim them with the lights. The last glimmer goes as the
    // name flies, or a skipped heist's creature ghosts over the hero's as the overlay fades
    if (light < 0.999) {
      const glimmer = 0.12 * (1 - clamp((since - FLIP) / (FLY * 0.5), 0, 1));
      c.fillStyle = (hellAmt > 0.5 ? 'rgba(12,3,5,' : 'rgba(5,6,15,') + (1 - Math.max(since < FLIP ? 0.12 : glimmer, light)).toFixed(3) + ')'; c.fillRect(0, 0, W, H);
    }
    // the hand-over: the name's shadow turns to light, pixel by pixel in an ordered dissolve. It is
    // the light now, so it is drawn after the stage dims.
    if (flipAmt > 0 && !flying && nameMask) {
      const b = nameBox, bw = b.x1 - b.x0, bh = b.y1 - b.y0;
      if (bw > 0 && bh > 0) {
        const id = c.getImageData(b.x0, b.y0, bw, bh), u = new Uint32Array(id.data.buffer), L = (hellAmt > 0.5 ? PALH32 : PAL32)[PAL.length - 1];
        for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const gx = b.x0 + x, gy = b.y0 + y; if (nameMask[gy * W + gx] && BAYER4[((gy & 3) << 2) | (gx & 3)] < flipAmt) u[y * bw + x] = L; }
        c.putImageData(id, b.x0, b.y0);
      }
    }
    out.imageSmoothingEnabled = false;
    if (HELL && tear && leaving < 0) {
      const n = 9, bh = Math.ceil(H / n);
      out.drawImage(buf, 0, 0, W * K, H * K);
      for (let k = 0; k < n; k++) { if (Math.random() < 0.55) continue; const sh = Math.round((Math.random() - 0.5) * 14); out.drawImage(buf, 0, k * bh, W, bh, sh * K, k * bh * K, W * K, bh * K); }
    } else out.drawImage(buf, 0, 0, W * K, H * K);
  }
  // Where the name lands. On the home page the hero carries it (the centred hero, 2026-10-31; Lucy: "no remove
  // this lucy liu not my ttle name bring it back", of the nav wordmark, which steps out while the hero is up):
  // the box of the hero's lit name lines. Anywhere else, or if the hero's name is not laid out, the nav logo.
  function heroTitle() {
    const lines = [...document.querySelectorAll('.scene-hero [data-lit] .hero-lit-line')];
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    lines.forEach((el) => { const q = el.getBoundingClientRect(); if (!q.width) return; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); });
    return r > l && b > t && b > 0 && t < innerHeight ? { lines, l, t, r, b } : null;
  }
  // The hero's own words, lit: each line a canvas at its place on the page, in its own face at its own baseline (read
  // from the page, as the hero's room reads them), drawn sup times over so it stays sharp while it flies in larger.
  function heroWord(tg, hot, sup) {
    const dp = (window.devicePixelRatio || 1) * sup, m = 24;
    return tg.lines.map((el) => {
      const bl = el.querySelector('.bl'), text = bl && bl.nextSibling && bl.nextSibling.textContent, cs = getComputedStyle(el.closest('[data-lit]'));
      if (!text) return null;
      const q = el.getBoundingClientRect(), p = bl.getBoundingClientRect(), left = q.left - m, top = q.top - m, w = q.width + m * 2, h = q.height + m * 2;
      const c = document.createElement('canvas'); c.width = Math.round(w * dp); c.height = Math.round(h * dp);
      const g = c.getContext('2d'); g.setTransform(dp, 0, 0, dp, -left * dp, -top * dp); g.textBaseline = 'alphabetic';
      g.shadowColor = hot ? 'rgba(255,60,50,.6)' : 'rgba(140,170,255,.55)'; g.shadowBlur = 6 * dp; g.fillStyle = hot ? 'rgb(255,236,230)' : 'rgb(236,240,255)';
      g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      if ('letterSpacing' in g) g.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      g.fillText(text, p.left, p.top);
      c.className = 'heist-fly'; c.setAttribute('aria-hidden', 'true'); c.dataset.heroWord = text;
      Object.assign(c.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px', opacity: '0' });
      return { c, text, left, top, penX: p.left, penY: p.top, size: parseFloat(cs.fontSize) };
    }).filter(Boolean);
  }
  // The room's pixels of the name between two columns, as a canvas at their place on the cyc.
  function pixelName(x0, x1, y0, y1, k) {
    const bw = x1 - x0, bh = y1 - y0, px = document.createElement('canvas'); px.width = bw; px.height = bh;
    const pc = px.getContext('2d'), id = pc.createImageData(bw, bh), u32 = new Uint32Array(id.data.buffer), lit = (hellAmt > 0.5 ? PALH32 : PAL32)[PAL.length - 1];
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const gx = x0 + x, gy = y0 + y; if (gx >= 0 && gy >= 0 && gx < W && gy < H && nameMask[gy * W + gx]) u32[y * bw + x] = lit; }
    pc.putImageData(id, 0, 0);
    px.className = 'heist-fly'; px.setAttribute('aria-hidden', 'true'); px.style.imageRendering = 'pixelated';
    Object.assign(px.style, { left: (x0 * k) + 'px', top: (y0 * k) + 'px', width: (bw * k) + 'px', height: (bh * k) + 'px' });
    return px;
  }
  // The name leaves the cyc and it is one name all the way: the letters are the hero's own from the first frame, so they
  // only move and shrink. Each hero word starts on its word on the cyc, pen on pen and baseline on baseline, at the
  // cyc's size, and flies home (the phone's two lines take a word each; the name stays on one line in the room). The
  // room's pixels that just flipped fly under it and it resolves over them early on, same letters on same letters; two
  // different sets of letters never share the screen. The hero's words then outlive the overlay until the room's
  // lights come up on the same glyphs.
  // /hell's "Lucifer" is another word: it flies in pixels and crisp, as the nav's fallback does, and on its last stretch
  // cuts back and forth with the hero's words, one or the other, never both.
  // Anywhere else (no hero name laid out) it lands on the nav logo, and the overlay fades onto the real logo under it.
  const FLY_EASE = 'cubic-bezier(.3,0,.12,1)', RESOLVED = 0.3, CUTS = [0.74, 0.8, 0.85, 0.91], PATH = 32;
  const flyCurve = (t) => smooth(0, 1, Math.pow(t, 0.72));   // a soft start and a long settle, as FLY_EASE
  let flyers = [], heroCopy = null;
  function flyWords(hero, words, k) {
    const nm = nm0, b = nameBox, pad = 4, y0 = b.y0 - pad, y1 = b.y1 + pad;
    const sizes = heroWord(hero, false, 1);   // measured once, for how much finer to draw them
    const sup = Math.max(1, ...sizes.map((w) => nm.F * k / w.size));
    heroCopy = heroWord(hero, false, sup);
    const plain = { duration: FLY * 1000, fill: 'forwards' };
    let flight = null;
    try {
      heroCopy.forEach((w, i) => {
        const cyc = words[i], cx = (nm.x + cyc.x) * k, cy = nm.base * k, s = nm.F * k / w.size, dx = cx - w.penX, dy = cy - w.penY;
        const x0 = Math.max(0, Math.floor(nm.x + (i ? words[i - 1].end + (cyc.x - words[i - 1].end) / 2 : cyc.x) - pad));
        const x1 = Math.min(W, Math.ceil(nm.x + (i + 1 < words.length ? cyc.end + (words[i + 1].x - cyc.end) / 2 : cyc.end) + pad));
        const px = pixelName(x0, x1, y0, y1, k);
        loader.appendChild(px); loader.appendChild(w.c); flyers.push(px, w.c);
        w.c.style.transformOrigin = (w.penX - w.left) + 'px ' + (w.penY - w.top) + 'px';
        px.style.transformOrigin = (cx - x0 * k) + 'px ' + (cy - y0 * k) + 'px';
        // sampled, because two lines must part before they cross: on a phone the words first move apart upward and
        // downward, then slide to the middle, or "Liu" would pass through the tail of "Lucy"'s y. The size keeps one curve.
        const split = heroCopy.some((o) => Math.abs(o.penY - w.penY) > 1), word = [], pixels = [];
        for (let n = 0; n <= PATH; n++) {
          const t = n / PATH, sp = flyCurve(t), xp = split ? flyCurve(clamp((t - 0.34) / 0.66, 0, 1)) : sp, yp = split ? flyCurve(clamp(t / 0.42, 0, 1)) : sp;
          const ox = dx * (1 - xp), oy = dy * (1 - yp), sc = s + (1 - s) * sp;
          word.push({ transform: 'translate(' + ox.toFixed(2) + 'px,' + oy.toFixed(2) + 'px) scale(' + sc.toFixed(4) + ')' });
          pixels.push({ transform: 'translate(' + (ox - dx).toFixed(2) + 'px,' + (oy - dy).toFixed(2) + 'px) scale(' + (sc / s).toFixed(4) + ')' });
        }
        flight = w.c.animate(word, plain);
        px.animate(pixels, plain);
        w.c.animate([{ opacity: 0 }, { opacity: 1, offset: RESOLVED }, { opacity: 1 }], plain);
        px.animate([{ opacity: 1 }, { opacity: 1, offset: RESOLVED }, { opacity: 0, offset: RESOLVED }, { opacity: 0 }], plain);
      });
      flight.finished.then(() => { landed = true; land(); }).catch(() => {});
    } catch (e) { landed = true; land(); }
  }
  function startFlight() {
    if (flying) return;
    flying = true;
    if (!nameBox || !nm0) { landed = true; fadeOut(); return; }
    const k = K / dpr, hero = heroTitle(), words = wordsOf(nm0.lay);
    if (hero && !nameWord && hero.lines.length === words.length) { flyWords(hero, words, k); return; }
    const b = nameBox, pad = 4, x0 = b.x0 - pad, y0 = b.y0 - pad, bw = b.x1 - b.x0 + pad * 2, bh = b.y1 - b.y0 + pad * 2;
    const px = pixelName(x0, x0 + bw, y0, y0 + bh, k), hot = hellAmt > 0.5;
    const cr = document.createElement('canvas'); cr.width = Math.round(bw * K); cr.height = Math.round(bh * K);
    const cc = cr.getContext('2d');
    cc.shadowColor = hot ? 'rgba(255,60,50,.6)' : 'rgba(140,170,255,.55)'; cc.shadowBlur = 2.5 * K; cc.fillStyle = hot ? 'rgb(255,236,230)' : 'rgb(236,240,255)';
    cc.setTransform(K, 0, 0, K, -x0 * K, -y0 * K); drawWord(cc, nm0.x, nm0.base, nm0.F, nm0.lay);
    cr.className = 'heist-fly'; cr.setAttribute('aria-hidden', 'true');
    Object.assign(cr.style, { left: (x0 * k) + 'px', top: (y0 * k) + 'px', width: (bw * k) + 'px', height: (bh * k) + 'px' });
    [px, cr].forEach((el) => loader.appendChild(el));
    flyers = [px, cr];
    // The target's place: the name's ink spans its box (left and right edges, centres level), so it settles
    // onto the hero's name (or the resting wordmark) without growing or shrinking.
    const logo = hero ? null : (document.querySelector('.flow-menu-logo-text') || document.querySelector('.flow-menu-logo'));
    const inkW = (b.x1 - b.x0) * k, inkH = (b.y1 - b.y0) * k;
    let tx, ty, th, s1;
    if (hero) { tx = hero.l; ty = hero.t; th = hero.b - hero.t; s1 = (hero.r - hero.l) / inkW; }
    else if (logo && logo.getBoundingClientRect().width > 0) { const r = logo.getBoundingClientRect(); tx = r.left; ty = r.top; th = r.height; s1 = r.width / inkW; }
    else { const narrow = innerWidth <= 650; tx = narrow ? 22 : innerWidth * 0.04; ty = narrow ? 22 : 24; th = narrow ? 22 : 24; s1 = th / inkH; }
    const dx = tx - pad * k * s1 - x0 * k, dy = ty + th / 2 - (pad * k + inkH / 2) * s1 - y0 * k;
    const move = [{ transform: 'translate(0px,0px) scale(1)' }, { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + s1.toFixed(4) + ')' }];
    const timing = { duration: FLY * 1000, easing: FLY_EASE, fill: 'forwards' }, plain = { duration: FLY * 1000, fill: 'forwards' };
    if (hero) { heroCopy = heroWord(hero, hot, 1); heroCopy.forEach((w) => { loader.appendChild(w.c); flyers.push(w.c); }); }
    try {
      px.animate(move, timing); cr.animate(move, timing);
      px.animate([{ opacity: 1 }, { opacity: 1, offset: 0.15 }, { opacity: 0, offset: 0.6 }, { opacity: 0 }], plain);
      const crisp = [{ opacity: 0 }, { opacity: 0, offset: 0.15 }, { opacity: 1, offset: 0.6 }];
      if (hero) {
        const [a, b2, c2, d] = CUTS, on = (at) => ({ opacity: 1, offset: at }), off = (at) => ({ opacity: 0, offset: at });
        crisp.push(on(a), off(a), off(b2), on(b2), on(c2), off(c2), off(d), { opacity: 0 });
        heroCopy.forEach((w) => w.c.animate([{ opacity: 0 }, off(a), on(a), on(b2), off(b2), off(c2), on(c2), { opacity: 1 }], plain));
      } else crisp.push({ opacity: 1 });
      cr.animate(crisp, plain).finished.then(() => { landed = true; land(); }).catch(() => {});
    } catch (e) { landed = true; land(); }
  }
  // Landed. On the hero: its words, lit, stay on the page as the overlay goes, whole until the room's lights have come
  // up on the same glyphs, then dissolve into them. On the nav: the real wordmark is under the flown name, and its
  // navette catches the light. Then the overlay fades onto the site.
  function land() {
    if (heroCopy) {
      const copy = heroCopy; heroCopy = null;
      copy.forEach(({ c }) => {
        flyers = flyers.filter((f) => f !== c);
        Object.assign(c.style, { position: 'fixed', zIndex: '10000', pointerEvents: 'none', opacity: '1', transform: 'none' });   // over the overlay (9999) as it fades, or the name dips with it
        document.body.appendChild(c);
        try { c.getAnimations().forEach((a) => a.cancel()); } catch (e) {}
        const done = () => c.remove();
        try { c.animate([{ opacity: 1 }, { opacity: 1, offset: 0.65, easing: 'ease-in-out' }, { opacity: 0 }], { duration: 1600, fill: 'forwards' }).finished.then(done, done); } catch (e) { setTimeout(done, 1600); }
      });
    } else {
      const logo = document.querySelector('.flow-menu-logo');
      if (logo) { logo.classList.add('wm-catch'); setTimeout(() => logo.classList.remove('wm-catch'), 900); }
    }
    fadeOut();
  }
  function fadeOut() {
    loader.style.transition = 'opacity ' + OUT + 's ease';
    loader.style.opacity = '0';
  }

  // ── The loop, mounted on the inline lifecycle ─────────────────────────────────────────
  let raf = 0, last = 0, acc = 0, running = false, built = false;
  function ensureCanvas() {
    if (cv) return;
    cv = document.createElement('canvas'); cv.className = 'heist-room'; cv.setAttribute('aria-hidden', 'true');
    loader.insertBefore(cv, loader.firstChild);
    out = cv.getContext('2d');
  }
  function onResize() { clearTimeout(onResize.t); onResize.t = setTimeout(() => { if (running) { layout(); } }, 120); }
  function loop(now) {
    raf = 0;
    if (!running) return;
    // The overlay is gone (finished, skipped, a hidden tab): let go of everything.
    if (loader.hidden || loader.classList.contains('ll-gone')) { teardown(); return; }
    drawDt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    acc += Math.min(200, now - last); last = now;
    let steps = 0;
    while (steps < 3 && acc >= stepMs()) { const ms = stepMs(); acc -= ms; tick24(ms); steps++; }
    // Interpolate placement, never images: one crisp pose at 60/120 Hz, with no ghost outline.
    subframe = clamp(acc / stepMs(), 0, 1);
    frame();
    raf = requestAnimationFrame(loop);
  }
  // ── HELL: the turn and the tweaking ─────────────────────────────────────────────────
  // At TURN the room dissolves to the hell lamps over TURN_LEN on the ordered dither (one fade, no
  // flash), the name re-forms at 12 fps from scrambled letters into "Lucifer", left to right, and
  // the creature's sheet swaps on a dissolving coin toss. Then every 0.45-1.35s he tweaks for a
  // beat: stutters between frames, jitters off his mark, shoves into slices, and the frame tears.
  const TURN = 1.5, TURN_LEN = 0.6, LUCIFER = [...'Lucifer'], SCRAMBLE = 'Lucifer6x#';
  let hellAmt = 0, nameWord = null, turnStep = -1, tweaking = false, tweakUntil = -1, nextTweak = 0, jx = 0, jy = 0, tear = false;
  const pick = (str) => str[Math.floor(Math.random() * str.length)];
  function art() { return HELL && sheets.hell && hellAmt > 0 && (hellAmt >= 1 || Math.random() < hellAmt) ? sheets.hell : sheets.sprites; }
  function hellReset() {
    hellAmt = 0; nameWord = null; turnStep = -1; tweaking = false; tweakUntil = -1; nextTweak = 0; jx = jy = 0; tear = false;
    INK = INK_N; BURST_INK = BURST_N; loader.classList.remove('heist-hell');
  }
  function hellTick(t) {
    if (!HELL || t < TURN || (leaving >= 0 && turnStep < 0)) return;   // skipped before the turn: it never turns
    hellAmt = smooth(TURN, TURN + TURN_LEN, t);
    if (turnStep < 0) { INK = INK_H; BURST_INK = BURST_H; loader.classList.add('heist-hell'); }
    if (t < TURN + TURN_LEN && leaving < 0) {
      const step = Math.floor((t - TURN) * 12), p = (t - TURN) / TURN_LEN;
      if (step !== turnStep) {
        turnStep = step;
        nameWord = LUCIFER.map((ch, i) => (p > 0.2 + 0.7 * i / LUCIFER.length ? ch : pick(SCRAMBLE)));
        if (built) buildName(6);
      }
      tear = true;
      return;
    }
    if (nameWord !== LUCIFER) { nameWord = LUCIFER; if (built) buildName(0); nextTweak = t + 0.3; }
    if (leaving >= 0) { tweaking = false; tear = false; return; }
    if (t >= nextTweak) { tweakUntil = t + 0.12 + Math.random() * 0.22; nextTweak = tweakUntil + 0.45 + Math.random() * 0.9; }
    tweaking = t < tweakUntil;
    jx = tweaking ? Math.round((Math.random() - 0.5) * 10) : 0; jy = tweaking ? Math.round((Math.random() - 0.5) * 4) : 0;
    tear = tweaking && Math.random() < 0.5;
  }

  // ── Sound: chiptune cues on his hops, landings, rolls and the clip (Lucy, Nov 12: "add sound effects to the
  // dragon hopping, sprite noises"). Synthesised on Web Audio, nothing to download. Cues come from the track
  // itself (takeoff where his height leaves 0, landing where it returns, a pose's first frame), so a re-lifted
  // board keeps its sounds in step. Browsers allow sound only after the visitor has touched the page, so a cold
  // first visit may stay silent; Replay opening (a click) always has it. None under reduced motion.
  let AC = null, CUES = [];
  function audio() {
    if (REDUCED || !window.__introSound) return null;
    try { AC = AC || window.__heistAC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (AC.state === 'suspended') AC.resume().catch(() => {});
    return AC.state === 'running' ? AC : null;
  }
  function tone(type, f0, f1, len, vol, at = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = HELL ? 'sawtooth' : type;
    const k = HELL ? 0.6 : 1;   // /hell: the same cues, lower and rougher
    o.frequency.setValueAtTime(f0 * k, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * k), t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + len + 0.02);
  }
  function noise(len, vol, hz, at = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + at, n = Math.ceil(a.sampleRate * len), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass'; f.frequency.value = HELL ? hz * 0.6 : hz; g.gain.value = vol; src.buffer = b;
    src.connect(f).connect(g).connect(a.destination); src.start(t);
  }
  const SFX = {
    hop: () => { tone('square', 220, 660, 0.14, 0.07); },
    pounce: () => { tone('square', 180, 880, 0.22, 0.08); tone('triangle', 360, 1200, 0.18, 0.04, 0.03); },
    land: () => { noise(0.08, 0.35, 900); tone('triangle', 140, 60, 0.1, 0.12); },
    roll: () => { noise(0.16, 0.18, 1800); tone('triangle', 300, 180, 0.12, 0.05); },
    squeak: () => { tone('square', 900, 1300, 0.07, 0.04); tone('square', 1300, 1100, 0.06, 0.04, 0.07); },
    clip: () => { tone('square', 988, 988, 0.07, 0.05); tone('square', 1319, 1319, 0.2, 0.05, 0.07); },
    peek: () => { tone('triangle', 600, 900, 0.1, 0.05); },
    step: () => { tone('square', 520, 380, 0.035, 0.03); },
  };
  function buildCues() {
    const h = (f) => (f && f.img ? f.height || 0 : 0);
    CUES = F.map((f, i) => {
      const p = F[i - 1] || {}, hp = h(p), hf = h(f), first = f.key && f.key !== p.key;
      if (hp === 0 && hf > 0) return f.flight === 'pounce' ? 'pounce' : 'hop';
      if (hp > 0 && hf === 0) return 'land';
      if (!first) return null;
      if (/roll/.test(f.key)) return 'roll';
      if (f.key === 'k05-hug-tip') return 'squeak';
      if (f.key === 'k08-tail-pickup') return 'clip';
      if (f.key === 'k09-lift-look-back') return 'peek';
      if (/waddle|run-back/.test(f.key)) return 'step';
      return null;
    });
  }
  function cue(from, to) {   // every frame passed this step, skipped ones too, one sound at most per step
    for (let i = from + 1; i <= to; i++) if (CUES[i]) { try { SFX[CUES[i]](); } catch (e) {} return; }
  }
  // One step of the clocks: the room always runs, in real seconds; the heist runs once its frames are in, one board
  // frame a step. Steps come RATE times faster than the board's 24 fps (Lucy, Oct 22: "how to make it faster
  // animation", for the loading screen, after the pickup gained in-betweens), so every frame still shows, just
  // sooner: the room's lamps, the /hell turn and the hand-over keep real time.
  function tick24(ms = STEP_MS) {
    clock += ms / 1000;
    const t = clock - t0;
    hellTick(t);
    if (leaving >= 0) return;
    if (t < LEAD) return;
    if (framesReady) {
      const was = heistT > 0 ? heistFrame() : -1;
      heistT += 1 / 24;
      while (DUR[heistFrame()] === 0 && heistFrame() < F.length - 1) heistT += 1 / 24;   // the held frames the retime skips
      cue(was, heistFrame());
      if (!ended && heistT >= HEIST + HOLD * RATE) { ended = true; api.exit(false); }   // the heist is over: hand over
    } else if (t > LEAD + WAIT_FRAMES && !ended) {
      ended = true; api.exit(false);   // its frames never came: go straight to the hand-over
    }
  }
  function onExit() { if (running && leaving < 0) { exitSubframe = subframe; leaving = Math.max(clock - t0, UP * 0.6); } }
  const HEIST_DELAY = 500;   // ms of black before the stage fades in (Lucy, 2026-11-24)
  function begin() {
    ensureCanvas();
    if (!LUT) buildLut();
    audio();
    running = true; subframe = 0; exitSubframe = 0; clock = 0; t0 = 0; heistT = 0; leaving = -1; ended = false; landed = false; flying = false; flipAmt = 0; camX = 0; heroCopy = null;
    if (HELL) {   // starts as the plain heist; its evil sheet loads alongside, never holding the heist up
      hellReset();
      if (!sheets.hell) loadImage(BASE + 'sprites-hell.webp').then((im) => { if (running) sheets.hell = im; }).catch(() => {});
    }
    flyers.forEach((el) => el.remove()); flyers = [];
    loader.style.transition = ''; loader.style.opacity = '';
    if (!built) { layout(); built = true; }
    window.addEventListener('resize', onResize);
    window.addEventListener('loader:exit', onExit);
    // the heist's real length once its frames are in; the hand-over gets its time before the overlay goes
    api.hold(null, HANDOVER_MS);
    const startAt = performance.now() + HEIST_DELAY;   // a black screen with only "press anywhere to skip" first
    loadBoard().then(() => new Promise((ok) => setTimeout(ok, Math.max(0, startAt - performance.now())))).then(() => {
      if (!running) return;
      framesReady = true;
      api.hold(Math.round((LEAD + REAL + HOLD + 1.5) * 1000), HANDOVER_MS);
    }).catch(() => { framesReady = false; });
    last = performance.now(); acc = 0;
    if (!raf) raf = requestAnimationFrame(loop);
  }
  // The lifecycle calls this as the overlay starts to go, and again when it is gone: the
  // hand-over keeps drawing until the overlay is hidden, then everything is released.
  function stop() { onExit(); }
  function teardown() {
    running = false;
    if (raf) cancelAnimationFrame(raf); raf = 0;
    window.removeEventListener('resize', onResize);
    window.removeEventListener('loader:exit', onExit);
    flyers.forEach((el) => el.remove()); flyers = [];
    loader.style.transition = ''; loader.style.opacity = '';
    if (cv) { cv.width = 0; cv.height = 0; }   // drop the backing store
    built = false;
    // drop the decoded sheets; a replay fetches them again from the cache
    sheets.sprites = null; sheets.dorsal = null; sheets.hell = null; dataReq = null; framesReady = false; silCache.clear();
  }
  const fontsLoad = document.fonts
    ? document.fonts.load('700 64px Syne', 'Lucy Liu Lucifer')
    : Promise.resolve();
  fontsLoad.catch(() => {}).then(() => { fontsReady = true; if (built) build(); });
  // test hook for scripts/heist-check.mjs
  window.__heistOpening = { info: () => ({ W, H, K, t: clock - t0, heistT, light, leaving, flipAmt, flying, landed, framesReady, frames: F.length, nameBox,
    hell: HELL, hellAmt, word: (nameWord || WORD).join(''), tweaking, hellSheet: !!sheets.hell }) };
  api.mount(begin, stop);
})();
