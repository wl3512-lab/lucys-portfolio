/* The home page's last screen: lights out (plain JS, window.EndSceneMount). Lucy, 2026-10-22: the page ended at
   s0mped; she asked for a conclusion, picked "lights out" from three, and asked for it to be "connected to About
   somehow if you pick cabinet". So it is About's cabinet, closed for the night: as you arrive his drawer slides
   out, he peeks at you over its front, ducks back in and it slides shut (About opens on the same peek; Lucy:
   "in the ending and beginning of about"), then the lamp dims and z's rise. The cabinet is a real button, and
   it wakes him with a paperclip (Lucy, 2026-10-22: "I don't like the square framing on hover of the cabinet; maybe the
   cursor turns into something that wakes the dragon up"; she picked the paperclip over a bell): over it the site's
   cursor steps aside and a crisp silver clip, his favourite thing, dangles at the pointer in the room's pixels while
   his drawer stirs. Click and he snatches it: the drawer pops, he springs up, the clip flies into his mouth, and About
   opens on him bending it into a key (its peek is skipped; `__aboutHandoff`). Closing About sends him back down, so
   the two stay one place.

   It draws from About's own sheets (assets/creature/about-drawer/: drawer.json, creature.webp, outside.webp,
   slide.webp; the same files About fetches, so they are fetched once for both) into a small canvas, room pixels
   dithered with the 4 x 4 Bayer matrix into the heist's palette like the loading screen's lamp. Nothing loads until
   the section is two screens away; the loop runs only while it is on screen. Reduced motion shows him asleep in the
   closed drawer, still. */
(function () {
  'use strict';
  const BASE = 'assets/creature/about-drawer/';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2), easeOut = (t) => 1 - (1 - t) ** 3;
  const backOut = (t) => { const k = 1.9; t -= 1; return t * t * ((k + 1) * t + k) + 1; };
  const LBOTH = [0.58, 0.63, 1.0];
  const LEVELS = [[5, 6, 15], [9, 11, 30], [14, 18, 46]].concat([0.2, 0.32, 0.46, 0.62, 0.8, 1.0].map((v) => LBOTH.map((u) => Math.round(u * v * 255)))).concat([[206, 214, 252]]);
  const L32 = new Uint32Array(LEVELS.map((c) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0));
  const NL = LEVELS.length;
  // The paperclip, drawn as the spotlight's mock drew it: a Gem clip's centreline brushed a pixel wide, crisp silver with
  // a navy edge, lit from the top left. One small canvas per tilt, made once.
  const SIL = [214, 219, 232], HI = [246, 250, 255], SHD = [150, 158, 190], NAVY = [8, 19, 87];
  function gemPath() {
    const pts = [], line = (a, b, n = 40) => { for (let k = 0; k <= n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); };
    const arc = (c, r, a0, a1, n = 40) => { for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } };
    line([0.08, 2.05], [0.08, 0.40]); arc([0.50, 0.40], 0.42, Math.PI, 2 * Math.PI);
    line([0.92, 0.40], [0.92, 2.20]); arc([0.62, 2.20], 0.30, 0, Math.PI);
    line([0.32, 2.20], [0.32, 0.70]); arc([0.50, 0.70], 0.18, Math.PI, 2 * Math.PI);
    line([0.68, 0.70], [0.68, 1.55]);
    return pts;
  }
  const clipCache = new Map();
  function clipSprite(width, tilt) {   // { c, top }: the canvas and the y of its top wire, for hanging it from the pointer
    const key = width + ':' + tilt;
    if (clipCache.has(key)) return clipCache.get(key);
    const t = tilt * Math.PI / 180, r = 0.55;
    const pts = gemPath().map(([x, y]) => { const X = x * width - 0.5 * width, Y = y * width - 1.3 * width; return [X * Math.cos(t) - Y * Math.sin(t), X * Math.sin(t) + Y * Math.cos(t)]; });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.floor(Math.min(...xs)) - 3, y0 = Math.floor(Math.min(...ys)) - 3, w = Math.ceil(Math.max(...xs)) + 3 - x0, h = Math.ceil(Math.max(...ys)) + 3 - y0;
    const on = new Uint8Array(w * h), at = (i, j) => i >= 0 && j >= 0 && i < w && j < h && on[j * w + i] === 1;
    for (const [x, y] of pts) for (let j = Math.floor(y - 2); j <= Math.ceil(y + 2); j++) for (let i = Math.floor(x - 2); i <= Math.ceil(x + 2); i++) {
      if ((i + 0.5 - x) ** 2 + (j + 0.5 - y) ** 2 <= r * r) { const ii = i - x0, jj = j - y0; if (ii >= 0 && jj >= 0 && ii < w && jj < h) on[jj * w + ii] = 1; }
    }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d'), im = cx.createImageData(w, h), d = im.data;
    const set = (i, j, col) => { const k = (j * w + i) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255; };
    let top = h;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (at(i, j)) { set(i, j, !at(i, j - 1) || !at(i - 1, j) ? HI : !at(i, j + 1) && !at(i + 1, j) ? SHD : SIL); top = Math.min(top, j); }
      else if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) set(i, j, NAVY);
    }
    cx.putImageData(im, 0, 0);
    const out = { c, top }; clipCache.set(key, out); return out;
  }
  const W = 300, H = 170;                    // the room, in art pixels; the cabinet is about a third of it wide
  const SINK = 76, FRONT = 113;   // as About: how far he sinks, and the bottom of his drawer's front (cell px)
  // the arrival (s), About's opening peek to the frame, with its drawn layers (D.peek, peek.webp; Lucy: "only paws, no
  // back can be seen, and the top of the head like gills and horns"): his drawer slides out, his paws come up and hook
  // over its front, his head rises behind them, he looks and blinks, ducks, lets go, and it slides shut; then the lamp
  // dims and z's rise
  const OUT1 = 0.4, PAWS0 = 0.4, PAWS1 = 0.54, UP0 = 0.52, UP1 = 0.82, BLINK0 = 1.08, BLINK1 = 1.2, DOWN0 = 1.45, DOWN1 = 1.69, LET = 1.7, SHUT0 = 1.8, SHUT1 = 2.2, DIM0 = 2.2, DIM1 = 2.9, Z0 = 2.7;
  // the snatch (s): his drawer pops out by POP, he springs up from LEAP0 over LEAP, the clip flies into his mouth from
  // FLY0 to FLY1, and About opens at GO
  const POP = 0.22, LEAP0 = 0.06, LEAP = 0.3, FLY0 = 0.1, FLY1 = 0.3, GO = 0.78;

  function mount(root) {
    const stage = root.querySelector('[data-end="stage"]'), canvas = root.querySelector('[data-end="canvas"]'), door = root.querySelector('[data-end="door"]');
    if (!stage || !canvas || !door) return null;
    const foreground = root.hasAttribute('data-workspace-room') && root.closest('.workspace-journey').querySelector('.journey-foreground');
    const fx = foreground && foreground.getContext('2d');
    let revealed = !(root.hasAttribute('data-workspace-room') && window.WorkspaceJourney && window.WorkspaceJourney.isAnimated());
    const ctx = canvas.getContext('2d'), buf = document.createElement('canvas'); buf.width = W; buf.height = H;
    const bx = buf.getContext('2d'), img = bx.createImageData(W, H), d32 = new Uint32Array(img.data.buffer);
    const background = document.createElement('canvas'); background.width = W; background.height = H;
    const backgroundCtx = background.getContext('2d');
    let lastLamp = null, drawnAt = 0, hiddenAt = null;
    let D = null, BEND = null, MOUTH = null, PK = null, peekImg = null, sheet = null, slide = null, loaded = null, raf = 0, visible = false, t0 = null, hover = 0, hoverTo = 0, last = 0;
    let snatchT = -1, cursorOn = false, clipAt = null, clipFrom = null;   // the paperclip at the pointer, in room px
    const load = () => loaded || (loaded = Promise.all([
      fetch(BASE + 'drawer.json').then((r) => r.json()),
      new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = BASE + 'creature.webp'; }),
      new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = BASE + 'slide.webp'; }),
      new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = BASE + 'peek.webp'; }),   // optional: without it he just stays down
    ]).then(([data, c, s, p]) => {
      D = data; sheet = c; slide = s; peekImg = p; PK = D.peek || null;
      const duck = D.duck || [{ img: 'd01-peek' }];   // his peek, then bent down frame by frame (About's BEND)
      BEND = [duck[0].img].concat(duck.filter((p, i) => i > 0 && !p.overshoot).map((p) => p.img));
      const g = D.screen && D.screen[BEND[0]] && D.screen[BEND[0]].clip_grip, k = 256 / ((D.frame && D.frame[0]) || 1200);
      MOUTH = g ? [g[0] * k, g[1] * k] : [166, 87];   // where About's key sits in his teeth, in cell px
      return true;
    }).catch(() => false));
    const cellOf = (i) => [(i % D.cols) * 256, Math.floor(i / D.cols) * 192];
    const OX = Math.round(W / 2 - 136), FLOOR = Math.round(H * 0.8), OY = FLOOR - 150;   // the cabinet's cell, its glow at the floor

    function room(lamp) {
      // The sleeping room's light is static. Reuse its pixels beneath the moving sprite.
      if (lamp === lastLamp) { bx.clearRect(0, 0, W, H); bx.drawImage(background, 0, 0); return; }
      lastLamp = lamp;
      const lx = W / 2 + 2, ly = FLOOR - 4, rx = 70, ry = 13;
      for (let y = 0, i = 0; y < H; y++) {
        const by = (y & 3) << 2;
        for (let x = 0; x < W; x++, i++) {
          let v = 0.02;
          const ex = (x - lx) / rx, ey = (y - ly) / ry, e = ex * ex + ey * ey;
          if (e < 1.8) v = Math.max(v, 0.8 * lamp * Math.max(0, 1 - e / 1.8));
          const lv = clamp(Math.floor(v * (NL - 1) + 0.5 + BAYER[by | (x & 3)]), 0, NL - 1);
          d32[i] = lv ? L32[lv] : 0;   // the darkest level is the section's own night: transparent, so the canvas has no edge
        }
      }
      backgroundCtx.putImageData(img, 0, 0);
      bx.clearRect(0, 0, W, H); bx.drawImage(background, 0, 0);
    }
    function draw(now) {
      if (!D || document.hidden || document.body.classList.contains('about-locked')) return;
      const dt = drawnAt ? Math.min(0.1, (now - drawnAt) / 1000) : 1 / 24; drawnAt = now;
      const t = REDUCED ? 99 : t0 == null ? 0 : (now - t0) / 1000;   // peek once, then duck and close the drawer
      const sn = snatchT >= 0 ? (REDUCED ? 9 : (now - snatchT) / 1000) : -1;   // the snatch's clock, or -1
      hover += (hoverTo - hover) * (REDUCED ? 1 : 1 - Math.exp(-dt * 12));
      if (Math.abs(hoverTo - hover) < 0.001) hover = hoverTo;
      const outA = clamp(t / OUT1, 0, 1), shutA = clamp((t - SHUT0) / (SHUT1 - SHUT0), 0, 1);
      const lamp = sn >= 0 ? 1.15 : 1 - 0.62 * ease(clamp((t - DIM0) / (DIM1 - DIM0), 0, 1)) + 0.35 * hover;   // awake: the lamp comes up
      room(lamp);
      let step, sink, bend, pkOn = false, pkHead = 0, pkPaws = 0, pkHook = false, pkBlink = false;
      if (sn >= 0) {   // the snatch: the drawer pops, he springs up, upright
        const lp = clamp((sn - LEAP0) / LEAP, 0, 1);
        step = Math.round((D.slideSteps - 1) * easeOut(clamp(sn / POP, 0, 1)));
        sink = Math.round(SINK * (1 - backOut(lp))); bend = 1 - clamp(lp / 0.8, 0, 1);
      } else {
        step = Math.round((D.slideSteps - 1) * (t < SHUT0 ? easeOut(outA) : 1 - ease(shutA)));
        sink = SINK; bend = 1;   // the drawn him stays down: the peek's layers do the peeking
        if (PK && peekImg && t > 0 && t < SHUT0) {
          const H0 = PK.hide.head + 2, P0 = PK.hide.paws + 4, pawsUp = clamp((t - PAWS0) / (PAWS1 - PAWS0), 0, 1), headUp = clamp((t - UP0) / (UP1 - UP0), 0, 1);
          const headDown = clamp((t - DOWN0) / (DOWN1 - DOWN0), 0, 1), pawsDown = clamp((t - LET) / 0.1, 0, 1);
          pkOn = true; pkHook = pawsUp >= 1 && t < LET; pkBlink = t > BLINK0 && t < BLINK1;
          pkPaws = Math.round(P0 * (1 - easeOut(pawsUp)) + P0 * pawsDown);
          pkHead = Math.round(t < DOWN0 ? H0 * (1 - easeOut(headUp)) : H0 * headDown * headDown);
        }
      }
      const name = BEND[Math.round(bend * (BEND.length - 1))], im = D.images[name], [sx, sy] = cellOf(im.cell);
      // while the clip hangs over him his drawer stirs: a pixel each way, every 0.9 s
      const ph = (now / 1000) % 0.9, stir = sn < 0 && hover > 0.5 && !REDUCED && ph < 0.2 ? [1, -1, 1, 0][Math.floor(ph / 0.05)] : 0;
      const ox = OX, mouth = [ox + MOUTH[0], OY + sink + MOUTH[1]];
      bx.imageSmoothingEnabled = false;
      bx.drawImage(slide, step * 256, 0, 256, 192, ox, OY, 256, 192);                                  // the cabinet, his drawer at this step
      bx.save(); bx.beginPath(); bx.rect(ox, OY - 20, 256, FRONT + 20); bx.clip();
      bx.drawImage(sheet, sx, sy, 256, 192, ox, OY + sink, 256, 192);                                  // him, sinking behind the front
      if (sn >= FLY1) { const cs = clipSprite(6, 8); bx.drawImage(cs.c, Math.round(mouth[0] - cs.c.width / 2), Math.round(mouth[1] - cs.top - 1)); }   // the clip in his teeth
      if (pkOn) {   // the peek: his head and paws, behind the front
        bx.drawImage(peekImg, (pkBlink ? PK.cells.blink : PK.cells.head) * 256, 0, 256, 192, ox, OY + pkHead, 256, 192);
        bx.drawImage(peekImg, PK.cells.paws * 256, 0, 256, 192, ox, OY + pkPaws, 256, 192);
      }
      bx.restore();
      bx.drawImage(slide, step * 256, 192, 256, 192, ox + stir, OY, 256, 192);                         // his drawer's front, over him
      if (pkOn && pkHook) bx.drawImage(peekImg, PK.cells.over * 256, 0, 256, 192, ox + stir, OY, 256, 192);   // his claws over its edge
      if (sn >= 0 && sn < FLY1 && clipFrom) {   // the clip flies from your hand to his mouth, in a little arc
        const a = easeOut(clamp((sn - FLY0) / (FLY1 - FLY0), 0, 1)), cs = clipSprite(7, Math.round(-28 + 36 * a));
        const x = clipFrom[0] + (mouth[0] - clipFrom[0]) * a, y = clipFrom[1] + (mouth[1] - clipFrom[1]) * a - 10 * Math.sin(Math.PI * a);
        bx.drawImage(cs.c, Math.round(x - cs.c.width / 2), Math.round(y - cs.top));
      } else if (sn < 0 && cursorOn && clipAt) {   // the clip at the pointer, swaying from its top
        const cs = clipSprite(7, REDUCED ? -28 : -28 + 2 * Math.round(3 * Math.sin(now / 1000 * 2.4)));
        bx.drawImage(cs.c, Math.round(clipAt[0] - cs.c.width / 2), Math.round(clipAt[1] - cs.top));
      }
      if (t >= Z0 && sn < 0) {   // z's rise from the gap under his drawer's top
        bx.fillStyle = 'rgb(196, 176, 255)';
        const Z = ['111', '001', '010', '100', '111'];
        for (let i = 0; i < 3; i++) {
          const ph = REDUCED ? 0.3 + i * 0.25 : ((t - Z0) * 0.55 + i / 3) % 1, k = i === 2 ? 2 : 1;
          if (!REDUCED && ph > 0.92) continue;
          const zx = Math.round(ox + 168 + i * 9 + ph * 10), zy = Math.round(OY + 84 - ph * 30 - i * 5);
          Z.forEach((r, j) => [...r].forEach((b, c2) => { if (b === '1') bx.fillRect(zx + c2 * k, zy + j * k, k, k); }));
        }
      }
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      // His head and paws sit in front of the monitor on the cabinet, using the same original transparent sprites.
      if (fx && foreground.clientWidth) {
        fx.clearRect(0, 0, foreground.width, foreground.height); fx.imageSmoothingEnabled = false;
        fx.save(); fx.scale(foreground.width / W, foreground.height / H);
        fx.save(); fx.beginPath(); fx.rect(ox, OY - 20, 256, FRONT + 20); fx.clip();
        if (sn >= 0) fx.drawImage(sheet, sx, sy, 256, 192, ox, OY + sink, 256, 192);
        if (pkOn) {
          fx.drawImage(peekImg, (pkBlink ? PK.cells.blink : PK.cells.head) * 256, 0, 256, 192, ox, OY + pkHead, 256, 192);
          fx.drawImage(peekImg, PK.cells.paws * 256, 0, 256, 192, ox, OY + pkPaws, 256, 192);
        }
        fx.restore();
        fx.globalCompositeOperation = 'destination-out';
        fx.drawImage(slide, step * 256, 192, 256, 192, ox + stir, OY, 256, 192);
        fx.globalCompositeOperation = 'source-over';
        if (pkOn && pkHook) fx.drawImage(peekImg, PK.cells.over * 256, 0, 256, 192, ox + stir, OY, 256, 192);
        fx.restore();
      }
    }
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2), w = stage.clientWidth;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * H / W * dpr);
      if (foreground) { foreground.width = canvas.width; foreground.height = canvas.height; }
      const k = w / W;   // the door sits on the cabinet's drawers
      door.style.left = Math.round((OX + 66) * k) + 'px'; door.style.top = Math.round((OY + 86) * k) + 'px';
      door.style.width = Math.round(144 * k) + 'px'; door.style.height = Math.round(74 * k) + 'px';
    }
    const loaderUp = () => document.body.classList.contains('intro-playing');   // a reload at the bottom: the arrival waits for the loading screen to go
    function loop(now) {
      if (!visible) { raf = 0; return; }
      if (document.hidden || document.body.classList.contains('about-locked')) { raf = 0; return; }
      if (t0 == null && revealed && !loaderUp()) t0 = now;   // the zoom first reveals the cabinet, then his arrival starts
      const elapsed = now - last, step = 1000 / 24;
      if (cursorOn || snatchT >= 0 || elapsed + 0.001 >= step) {
        last += Math.floor((elapsed + 0.001) / step) * step; draw(now);
      }   // the clip follows the pointer at the screen's rate; keep idle's fractional frame time
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && !REDUCED) { if (!visible || document.hidden || document.body.classList.contains('about-locked') || !D) return; last = performance.now(); drawnAt = 0; raf = requestAnimationFrame(loop); } }
    function onVisibility() {
      const now = performance.now();
      if (document.hidden || document.body.classList.contains('about-locked')) {
        if (hiddenAt == null) hiddenAt = now; cancelAnimationFrame(raf); raf = 0;
      } else {
        if (hiddenAt != null) { const dt = now - hiddenAt; if (t0 != null) t0 += dt; if (snatchT >= 0) snatchT += dt; hiddenAt = null; }
        if (REDUCED && visible && D) draw(now); else start();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('lucy:scene-visibility', onVisibility);
    // load when two screens away; play the arrival the first time it is half in view; loop only while on screen
    const near = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { near.disconnect(); load().then((ok) => { if (ok) { size(); draw(performance.now()); } }); } }, { rootMargin: '200% 0px' });
    near.observe(root);
    const seen = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting);
      if (!visible) return;
      load().then((ok) => { if (!ok || !visible || document.hidden) return; size(); draw(performance.now()); start(); });
    }, { threshold: 0.5 });
    seen.observe(stage);
    const onResize = () => { if (D) { size(); draw(performance.now()); } };
    addEventListener('resize', onResize);
    // The paperclip is the cursor over his drawer: the site's cursor steps aside (body.end-clip) and the room draws the
    // clip where the pointer is. The keyboard gets it hanging by the drawer; a tap puts it where the finger lands.
    const toRoom = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    const redraw = () => { if (D && (REDUCED || !raf)) draw(performance.now()); };
    const show = (at) => { hoverTo = 1; cursorOn = true; if (at) clipAt = at; else if (!clipAt) clipAt = [OX + 196, OY + 60]; document.body.classList.add('end-clip'); start(); redraw(); };
    const hide = () => { if (snatchT >= 0) return; hoverTo = 0; cursorOn = false; document.body.classList.remove('end-clip'); redraw(); };
    door.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') show(toRoom(e)); });
    door.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' && snatchT < 0) { clipAt = toRoom(e); if (REDUCED) redraw(); } });
    door.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') show(toRoom(e)); });
    door.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') hide(); });
    door.addEventListener('focus', () => { if (door.matches(':focus-visible')) show(); });
    door.addEventListener('blur', hide);
    door.addEventListener('click', () => {   // he snatches it, then About opens on him bending it into a key
      if (snatchT >= 0) return;
      clipFrom = clipAt || [OX + 196, OY + 60]; snatchT = performance.now(); start();
      const go = () => {
        window.__aboutHandoff = 'clip';   // About skips its peek: he already has the clip
        location.hash = 'about';
        snatchT = -1; cursorOn = false; hoverTo = 0; hover = 0; document.body.classList.remove('end-clip');
        t0 = performance.now() - 60000;   // back here, he is asleep again in the shut drawer
      };
      if (REDUCED) go(); else setTimeout(go, GO * 1000);
    });
    return { draw: () => draw(performance.now()), reveal() { revealed = true; start(); }, get loaded() { return !!D; }, get arrived() { return t0 != null && (performance.now() - t0) / 1000 > DIM1; }, get t() { return t0 == null ? null : (performance.now() - t0) / 1000; }, get snatching() { return snatchT >= 0; }, get cursorOn() { return cursorOn; } };   // t: the arrival's clock, for the checks
  }
  const handles = new WeakMap();
  window.EndSceneMount = function (root) {
    if (!root) return null;
    if (handles.has(root)) return handles.get(root);
    const h = mount(root); handles.set(root, h); window.__endScene = h; return h;
  };
})();
