/* Lucky Drawer: a crumpled scratch ticket. A pixel coin with his key scratches the silver off in 3 px
   squares (a mouse by moving over it, a finger by dragging), flakes falling; a click, a tap or Enter
   rubs a spot clean by itself. Past 55% the silver falls away and the prize, inert till then, works.
   Reduced motion: no coin or flakes, a click clears it. Restored 18 Nov 2026 (Lucy: "make the scratch
   animtion come bakc and the coin"); it was a one-tap reveal from 14 Nov. */
(function () {
  'use strict';
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seeded = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const G = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'], E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  };
  function glyphs(word) {   // the pixels of a word in the 5 x 7 font, and its width
    const px = []; let x = 0;
    for (const ch of word) { if (ch === ' ') { x += 4; continue; } (G[ch] || []).forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') px.push([x + i, j]); })); x += 6; }
    return { px, w: x - 1 };
  }
  function edgePoints(W, H, seed = 29) {   // the ragged outline: each side walked in 6 px steps a pixel in or out, the perforation's half-holes mid-side
    const r = seeded(seed), j = () => Math.max(0, Math.round((r() - .5) * 3)), pts = [], hole = dy => Math.sqrt(81 - dy * dy);
    for (let x = 0; x <= W; x += 6) pts.push([x, j()]);
    for (let y = 0; y <= H; y += 6) { const dy = y - H / 2; pts.push([Math.abs(dy) < 9 ? W - hole(dy) : W - j(), y]); }
    for (let x = W; x >= 0; x -= 6) pts.push([x, H - j()]);
    for (let y = H; y >= 0; y -= 6) { const dy = y - H / 2; pts.push([Math.abs(dy) < 9 ? hole(dy) : j(), y]); }
    return pts;
  }
  const rects = (pts, fill) => pts.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1"${fill ? ` fill="${fill}"` : ''}/>`).join('');
  const grid = (rows, pal) => rows.map((row, j) => [...row].map((c, i) => pal[c] ? `<rect x="${i}" y="${j}" width="1" height="1" fill="${pal[c]}"/>` : '').join('')).join('');
  const ART = {   // the pixel pictures, as SVG rects
    star: grid(['....#....', '...###...', '#########', '..#####..', '.##...##.', '.#.....#.'], { '#': '#2f45c2' }),
  };
  // The coin: 16 px, his key on its face.
  let COIN = null;
  function coinSprite() {
    if (COIN) return COIN;
    const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5); if (d > 7.6) continue;
      g.fillStyle = d > 6.4 ? '#5a63c8' : d > 5.4 ? '#9aa3cc' : (x + y < 13 ? '#eef2ff' : '#c9cdf0'); g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = '#5a63c8'; [[6, 4], [7, 4], [8, 4], [5, 5], [9, 5], [6, 6], [7, 6], [8, 6], [7, 7], [7, 8], [7, 9], [8, 9], [7, 10], [7, 11], [8, 11]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    g.fillStyle = '#f6faff'; g.fillRect(4, 4, 1, 1); g.fillRect(5, 3, 2, 1);
    return (COIN = c);
  }

  function mount(root) {
    const turn = root.querySelector('.dr-tk-turn'), front = root.querySelector('.dr-tk-front'), back = root.querySelector('.dr-tk-back');
    const faces = Array.from(root.querySelectorAll('.dr-tk')), lt = faces[0], fx = root.querySelector('.dr-tk-fx');
    if (!lt || !fx || !turn) return { reset() {}, destroy() {} };
    const S = 4, PX = 3, M = 4;
    let destroyed = false, flipT = 0;
    const listeners = [];
    function on(el, type, fn) { el.addEventListener(type, fn); listeners.push(() => el.removeEventListener(type, fn)); }
    { const t = glyphs('LUCKY DRAWER'), svg = root.querySelector('.dr-tk-title');
      if (svg) { svg.setAttribute('viewBox', `0 0 ${t.w + 2} 9`); svg.style.aspectRatio = `${t.w + 2} / 9`; const r = rects(t.px); svg.innerHTML = `<g fill="#c4b0ff" transform="translate(1 1)">${r}</g><g fill="#2f45c2">${r}</g>`; } }
    for (const [sel, art] of [['.dr-tk-star', ART.star]]) { const el = root.querySelector(sel); if (el) el.innerHTML = art; }
    { const bar = root.querySelector('.dr-tk-bar'); if (bar) { const r = seeded(5); let s = '', y = 0; while (y < 40) { const h = r() < .5 ? 1 : 2; s += `<rect x="0" y="${y}" width="10" height="${h}" fill="#141a3c"/>`; y += h + (r() < .5 ? 1 : 2); } bar.innerHTML = s; } }

    function crumpleIt(cv, W, H, mirror) {   // facets (nearest of 22 points) tilted to the light, creases where two meet, two folds
      const cw = Math.ceil(W / S), ch = Math.ceil(H / S); cv.width = cw; cv.height = ch;
      const x = cv.getContext('2d'), img = x.createImageData(cw, ch), r = seeded(11);
      const pts = Array.from({ length: 22 }, () => ({ x: r() * cw, y: r() * ch, b: r() * 2 - 1, dx: r() - .5, dy: r() - .5 }));
      let fx0 = cw * (.58 + r() * .06); const fy0 = ch * (.44 + r() * .08), slope = (r() - .5) * .3;
      if (mirror) { pts.forEach(p => { p.x = cw - p.x; p.dx = -p.dx; p.b = -p.b * .8; }); fx0 = cw - fx0; }   // the same creases from behind, lit the other way
      for (let y = 0; y < ch; y++) for (let i = 0; i < cw; i++) {
        let d1 = 1e9, d2 = 1e9, k = 0;
        for (let p = 0; p < pts.length; p++) { const d = Math.hypot(i - pts[p].x, y - pts[p].y); if (d < d1) { d2 = d1; d1 = d; k = p; } else if (d < d2) d2 = d; }
        const P = pts[k];
        let sh = P.b * .05 + ((i - P.x) * P.dx + (y - P.y) * P.dy) * .006;
        if (d2 - d1 < 1.1) sh = P.b > 0 ? .2 : -.17;
        const fv = i - (fx0 + (y - ch / 2) * slope), fh = y - (fy0 + (i - cw / 2) * slope * .4);
        if (Math.abs(fv) < .7) sh = -.2; else if (fv > .7 && fv < 1.7) sh = .18;
        if (Math.abs(fh) < .7) sh = -.16; else if (fh > .7 && fh < 1.7) sh = .16;
        if (Math.min(i, y, cw - 1 - i, ch - 1 - y) < 2) sh -= .06;
        const o = (y * cw + i) * 4;
        if (sh < 0) { img.data[o] = 20; img.data[o + 1] = 26; img.data[o + 2] = 60; img.data[o + 3] = Math.min(255, -sh * 200); }
        else { img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255; img.data[o + 3] = Math.min(255, sh * 260); }
      }
      x.putImageData(img, 0, 0);
    }

    // The fx canvas over the ticket: the scratching coin, the silver flakes, the winner's coins.
    const fctx = fx.getContext('2d');
    let coin = null, flakes = [], coins = [], fxRaf = 0, lastT = 0;
    function fxLoop(t) {
      if (destroyed) return;
      const dt = Math.min(48, t - (lastT || t)); lastT = t;
      fctx.clearRect(0, 0, fx.width, fx.height); fctx.imageSmoothingEnabled = false;
      flakes = flakes.filter(f => (f.life -= dt) > 0);
      for (const f of flakes) { f.vy += .0009 * dt; f.x += f.vx * dt; f.y += f.vy * dt; fctx.fillStyle = f.c; fctx.fillRect(Math.round(f.x) + M, Math.round(f.y) + M, f.s, f.s); }
      coins = coins.filter(c => (c.life -= dt) > 0);
      for (const c of coins) { c.vy += .0011 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.ph += dt * c.spin;
        fctx.save(); fctx.translate(Math.round(c.x) + M, Math.round(c.y) + M); fctx.scale(Math.max(.15, Math.abs(Math.cos(c.ph))) * 2, 2); fctx.drawImage(coinSprite(), -8, -8); fctx.restore(); }
      if (coin && coin.on) {   // spinning while it hovers, tipped on its edge while it scratches
        const spin = coin.down ? .5 : Math.abs(Math.cos(t / 260));
        fctx.save(); fctx.translate(Math.round(coin.x) + M, Math.round(coin.y) + M); fctx.rotate(coin.down ? coin.tilt : 0);
        fctx.scale(Math.max(.18, spin) * 3, 3); fctx.drawImage(coinSprite(), -8, coin.down ? -12 : -8); fctx.restore();
      }
      if (flakes.length || coins.length || (coin && coin.on)) fxRaf = requestAnimationFrame(fxLoop); else { fxRaf = 0; lastT = 0; fctx.clearRect(0, 0, fx.width, fx.height); }
    }
    const kick = () => { if (!fxRaf && !destroyed && !reduce() && !document.hidden) fxRaf = requestAnimationFrame(fxLoop); };
    const coinOff = () => { if (coin) coin.on = false; };
    function spray(x, y, n) {
      if (reduce()) return;
      const cols = ['#c7cdea', '#bcc3e3', '#e9edfb', '#a7aed8'];
      for (let i = 0; i < n; i++) flakes.push({ x, y, vx: (Math.random() - .5) * .22, vy: -Math.random() * .2, s: Math.random() < .3 ? 6 : 3, c: cols[i % 4], life: 380 + Math.random() * 420 });
      kick();
    }
    function burst(x, y) {   // the winner's coins: up and out, spinning, then falling off the ticket
      if (reduce()) return;
      for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, v = .22 + Math.random() * .25; coins.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ph: Math.random() * 6, spin: .008 + Math.random() * .01, life: 1300 + Math.random() * 500 }); }
      kick();
    }
    const origin = el => { let ox = 0, oy = 0; while (el && el !== lt) { ox += el.offsetLeft; oy += el.offsetTop; el = el.offsetParent; } return [ox, oy]; };

    // A silver spot: the coin scratches it off in 3 px squares (a mouse just by moving over it, a finger by
    // dragging); a click, a tap or Enter rubs it clean by itself. Past 55% cleared the rest falls away.
    function foil(btn) {
      const round = !!btn.closest('.dr-tk-jack');
      const cv = btn.querySelector('canvas'), x = cv.getContext('2d'), prize = btn.previousElementSibling;
      let cols = 0, rows = 0, cleared = null, left = 0, total = 0, done = false, auto = 0, down = null, revealedAt = -Infinity;
      const inside = (i, j) => !round || Math.hypot(i + .5 - cols / 2, j + .5 - rows / 2) <= cols / 2;
      function settle() { cancelAnimationFrame(auto); auto = 0; down = null; coinOff(); }
      function paint(keep) {
        if (destroyed || (keep && done)) return;
        const nc = Math.ceil(btn.clientWidth / PX), nr = Math.ceil(btn.clientHeight / PX);
        if (keep && cleared && nc === cols && nr === rows) return;   // same size: keep what was scratched
        const was = keep && cleared && cols && rows ? { cleared, cols, rows } : null;   // resized mid-scratch (the card settling): carry the scratches over
        if (!was) { settle(); done = false; revealedAt = -Infinity; btn.hidden = false; btn.classList.remove('done'); btn.tabIndex = 0; prize.inert = true; }
        cols = nc; rows = nr;
        if (!cols || !rows) return;
        cv.width = cols; cv.height = rows; cleared = new Uint8Array(cols * rows); total = 0;
        const r = seeded(cols * 31 + rows);
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          if (!inside(i, j)) { cleared[j * cols + i] = 1; continue; }
          total++; const v = r(); x.fillStyle = v < .1 ? '#eef1fc' : v < .28 ? '#b9c0e1' : (i + j) % 2 ? '#cdd3ee' : '#c6cce9'; x.fillRect(i, j, 1, 1);
        }
        left = total;
        for (let i = 0; i < cols; i += 2) for (let j = (i / 2) % 3; j < rows; j += 3) if (inside(i, j)) { x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(i, j, 1, 1); }
        const t = glyphs('SCRATCH');
        if (!round && cols >= t.w + 6) {
          const sx = Math.round((cols - t.w) / 2), sy = Math.round((rows - 7) / 2);
          x.fillStyle = '#eef1fc'; t.px.forEach(([a, b]) => x.fillRect(sx + a - 1, sy + b - 1, 1, 1));
          x.fillStyle = '#8f97c8'; t.px.forEach(([a, b]) => x.fillRect(sx + a, sy + b, 1, 1));
        } else { x.globalAlpha = .55; x.drawImage(coinSprite(), Math.round((cols - 16) / 2), Math.round((rows - 16) / 2)); x.globalAlpha = 1; }
        if (was) for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const k = j * cols + i; if (cleared[k]) continue;
          if (was.cleared[Math.min(was.rows - 1, Math.floor(j * was.rows / rows)) * was.cols + Math.min(was.cols - 1, Math.floor(i * was.cols / cols))]) { cleared[k] = 1; left--; x.clearRect(i, j, 1, 1); }
        }
      }
      function erase(cx, cy) {
        for (let j = -1; j <= 1; j++) for (let i = -2; i <= 2; i++) {
          const u = cx + i, v = cy + j; if (u < 0 || v < 0 || u >= cols || v >= rows) continue;
          const k = v * cols + u; if (!cleared[k]) { cleared[k] = 1; left--; x.clearRect(u, v, 1, 1); }
        }
        if (!done && left < total * .45) reveal();
      }
      function line(a, b) { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let t = 0; t <= n && !done; t++) erase(Math.round(a[0] + (b[0] - a[0]) * t / n), Math.round(a[1] + (b[1] - a[1]) * t / n)); }
      function coinAt(cx, cy, isDown, dx) { if (reduce() || done) return; const [ox, oy] = origin(btn); coin = { on: true, down: isDown, x: ox + cx, y: oy + cy, tilt: isDown ? -.5 + Math.max(-.35, Math.min(.35, (dx || 0) * .05)) : 0 }; kick(); }
      function reveal(viaKey) {
        if (done || destroyed) return;
        done = true; revealedAt = performance.now(); cancelAnimationFrame(auto);
        btn.classList.add('done'); btn.tabIndex = -1; prize.inert = false;
        const [ox, oy] = origin(btn); for (let k = 0; k < 6; k++) spray(ox + Math.random() * btn.clientWidth, oy + Math.random() * btn.clientHeight, 4);
        coinOff();
        if (viaKey || document.activeElement === btn) {
          const to = prize.matches('a') ? prize : prize.querySelector('a') || prize;
          if (!to.matches('a, button, input, [tabindex]')) to.tabIndex = -1;
          to.focus({ preventScroll: true });
        }
        win(ox + btn.clientWidth / 2, oy + btn.clientHeight / 2);
      }
      function scratchItself(viaKey) {   // the coin rubs back and forth down the panel by itself
        if (done) return;
        if (reduce()) { reveal(viaKey); return; }
        const path = []; for (let k = 0; k <= 14; k++) path.push([(k % 2 ? .92 : .08) * cols, (.12 + k / 14 * .8) * rows]);
        const DUR = 700, n = path.length - 1, t0 = performance.now(); let last = path[0], sprayed = 0;   // by the clock: the same 0.7 s at any frame rate
        const step = now => {
          if (destroyed || done) return;
          const u = Math.max(0, Math.min(1, ((now || performance.now()) - t0) / DUR)) * n, k = Math.min(n - 1, Math.floor(u)), t = u - k;
          const a = path[k], b = path[k + 1], p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          line(last.map(Math.round), p.map(Math.round)); coinAt(p[0] * PX, p[1] * PX, true, b[0] - a[0]);
          if (++sprayed % 2) { const [ox, oy] = origin(btn); spray(ox + p[0] * PX, oy + p[1] * PX, 2); }
          last = p;
          if (!done && u < n) auto = requestAnimationFrame(step); else { if (!done) reveal(viaKey); coinOff(); }
        };
        step();
      }
      const at = e => { const r = btn.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const sq = p => [Math.floor(p[0] / PX), Math.floor(p[1] / PX)];
      let hoverP = null;
      on(btn, 'pointerenter', e => { if (done) return; hoverP = at(e); coinAt(hoverP[0], hoverP[1], e.pointerType === 'mouse', 0); });
      on(btn, 'pointerleave', () => { hoverP = null; if (!down) coinOff(); });
      on(btn, 'pointerdown', e => {
        if (done) return;
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        const p = at(e); down = { p, moved: false, t: performance.now() }; coinAt(p[0], p[1], true, 0);
      });
      on(btn, 'pointermove', e => {
        if (done) return;
        const p = at(e);
        if (down) {   // pressed: a drag scratches (mouse or finger)
          if (Math.hypot(p[0] - down.p[0], p[1] - down.p[1]) > 3) down.moved = true;
          line(sq(down.p), sq(p)); coinAt(p[0], p[1], true, p[0] - down.p[0]);
          if (Math.random() < .7) { const [ox, oy] = origin(btn); spray(ox + p[0], oy + p[1], 2); }
          down.p = p;
        } else if (e.pointerType === 'mouse') {   // a mouse needs no press: the coin scratches as it passes over
          if (hoverP) { line(sq(hoverP), sq(p)); if (Math.random() < .5) { const [ox, oy] = origin(btn); spray(ox + p[0], oy + p[1], 1); } }
          coinAt(p[0], p[1], true, hoverP ? p[0] - hoverP[0] : 0); hoverP = p;
        }
      });
      on(btn, 'pointerup', () => { const d = down; down = null; if (coin) coin.down = !!hoverP; if (d && !d.moved && !done) scratchItself(false); });
      on(btn, 'pointercancel', () => { down = null; coinOff(); });
      on(btn, 'click', e => { e.stopPropagation(); if (e.detail === 0) scratchItself(true); });   // Enter or Space
      // A rapid double tap rubs the seal, without opening its email underneath.
      on(prize, 'click', e => { if (e.detail > 0 && performance.now() - revealedAt < 400) { e.preventDefault(); e.stopPropagation(); } });
      return { paint, settle, destroy() { settle(); }, get done() { return done; } };
    }
    const foils = Array.from(front.querySelectorAll('.dr-tk-scratch'), foil);
    function win(bx, by) {
      if (!foils.every(f => f.done) || root.classList.contains('won')) return;
      root.classList.add('won'); burst(bx, by); nudge(1400);
    }
    // Turn me over: five seconds on the ticket, or a win, and its corner starts to peel (styles.css), till it is turned
    const peel = front.querySelector('.dr-tk-flip'); let nudgeT = 0, turned = false;
    function nudge(ms) { clearTimeout(nudgeT); if (!destroyed && !turned && peel) nudgeT = setTimeout(() => { if (!destroyed && !turned) peel.classList.add('nudge'); }, ms); }
    function calm() { clearTimeout(nudgeT); if (peel) peel.classList.remove('nudge'); }
    const seen = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) nudge(5000); else calm(); })) : null;
    if (seen) seen.observe(lt);
    function flip(over) {
      if (destroyed) return;
      turned = true; calm(); foils.forEach(f => f.settle()); clearTimeout(flipT);
      turn.classList.toggle('over', over); front.inert = over; if (back) back.inert = !over;
      const to = (over ? back : front) && (over ? back : front).querySelector('.dr-tk-flip');
      if (to) flipT = setTimeout(() => to.focus({ preventScroll: true }), reduce() ? 0 : 220);   // once its face shows: it turns visible at the half turn (styles.css)
    }
    root.querySelectorAll('.dr-tk-flip').forEach(b => on(b, 'click', () => flip(!turn.classList.contains('over'))));

    let lastW = 0, lastH = 0;
    function layout(force) {
      const W = lt.offsetWidth, H = lt.offsetHeight;
      if (destroyed || !W || !H || (!force && W === lastW && H === lastH)) return;
      lastW = W; lastH = H;
      faces.forEach((f, i) => {
        f.style.clipPath = `polygon(${edgePoints(W, H, 29 + i).map(p => `${(i ? W - p[0] : p[0]).toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
        const cv = f.querySelector('.dr-tk-crumple'); if (cv) crumpleIt(cv, W, H, i === 1);
      });
      const fxW = W + 2 * M, fxH = H + 2 * M; fx.width = fxW; fx.height = fxH;
      Object.assign(fx.style, { left: -M + 'px', top: -M + 'px', width: fxW + 'px', height: fxH + 'px' });
      foils.forEach(f => f.paint(true));
    }
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => layout(false)) : null;
    if (ro) ro.observe(lt); else on(window, 'resize', () => layout(false));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout(true));
    layout(true);
    return {
      reset() {
        if (destroyed) return;
        clearTimeout(flipT); lastW = lastH = 0;
        root.classList.remove('won'); turn.classList.remove('over'); front.inert = false; if (back) back.inert = true;
        foils.forEach(f => f.paint(false)); turned = false; calm();
      },
      destroy() { destroyed = true; cancelAnimationFrame(fxRaf); if (ro) ro.disconnect(); if (seen) seen.disconnect(); clearTimeout(nudgeT); clearTimeout(flipT); foils.forEach(f => f.destroy()); listeners.forEach(off => off()); },
      get scratched() { return foils.map(f => f.done); },
      flip,
    };
  }

  if (typeof window !== 'undefined') window.LuckyTicket = { mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = { glyphs, edgePoints };
})();
