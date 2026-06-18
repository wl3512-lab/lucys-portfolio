/* global React */
/*
  Waves — flowing Perlin line field (canvas 2D, no deps).
  Adapted from React Bits (https://reactbits.dev) to this site's no-build globals
  pattern: ESM imports removed, hooks from global React, exposed as window.Waves.
  Used as a backdrop layer (e.g. behind the Spotlight laser) so the lone beam reads
  as light over a reactive surface. Honors prefers-reduced-motion (single static frame).
  Positioned/sized by CSS via className (no inline layout styles).
*/
function WvGrad(x, y, z) { this.x = x; this.y = y; this.z = z; }
WvGrad.prototype.dot2 = function (x, y) { return this.x * x + this.y * y; };

function WvNoise(seed) {
  this.grad3 = [new WvGrad(1,1,0),new WvGrad(-1,1,0),new WvGrad(1,-1,0),new WvGrad(-1,-1,0),
    new WvGrad(1,0,1),new WvGrad(-1,0,1),new WvGrad(1,0,-1),new WvGrad(-1,0,-1),
    new WvGrad(0,1,1),new WvGrad(0,-1,1),new WvGrad(0,1,-1),new WvGrad(0,-1,-1)];
  this.p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  this.perm = new Array(512); this.gradP = new Array(512); this.seed(seed || 0);
}
WvNoise.prototype.seed = function (seed) {
  if (seed > 0 && seed < 1) seed *= 65536;
  seed = Math.floor(seed);
  if (seed < 256) seed |= seed << 8;
  for (var i = 0; i < 256; i++) {
    var v = (i & 1) ? this.p[i] ^ (seed & 255) : this.p[i] ^ ((seed >> 8) & 255);
    this.perm[i] = this.perm[i + 256] = v;
    this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
  }
};
WvNoise.prototype.fade = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };
WvNoise.prototype.lerp = function (a, b, t) { return (1 - t) * a + t * b; };
WvNoise.prototype.perlin2 = function (x, y) {
  var X = Math.floor(x), Y = Math.floor(y);
  x -= X; y -= Y; X &= 255; Y &= 255;
  var n00 = this.gradP[X + this.perm[Y]].dot2(x, y);
  var n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1);
  var n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y);
  var n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1);
  var u = this.fade(x);
  return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(y));
};

function wvReduced() {
  try {
    return document.documentElement.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { return false; }
}

function Waves(props) {
  const p = props || {};
  const { useRef, useEffect } = React;
  const hostRef = useRef(null);

  useEffect(function () {
    const host = hostRef.current;
    if (!host) return;
    const reduced = wvReduced();

    const cfg = {
      lineColor: p.lineColor || '#169eff',
      waveSpeedX: p.waveSpeedX != null ? p.waveSpeedX : 0.0125,
      waveSpeedY: p.waveSpeedY != null ? p.waveSpeedY : 0.005,
      waveAmpX: p.waveAmpX != null ? p.waveAmpX : 32,
      waveAmpY: p.waveAmpY != null ? p.waveAmpY : 16,
      xGap: p.xGap != null ? p.xGap : 10,
      yGap: p.yGap != null ? p.yGap : 32,
      friction: p.friction != null ? p.friction : 0.925,
      tension: p.tension != null ? p.tension : 0.005,
      maxCursorMove: p.maxCursorMove != null ? p.maxCursorMove : 100
    };

    const canvas = document.createElement('canvas');
    canvas.className = 'waves-canvas';
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const noise = new WvNoise(Math.random());
    let bounding = { width: 0, height: 0, left: 0, top: 0 };
    let lines = [];
    const mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };

    function setSize() {
      bounding = host.getBoundingClientRect();
      canvas.width = bounding.width;
      canvas.height = bounding.height;
    }
    function setLines() {
      const w = bounding.width, h = bounding.height;
      lines = [];
      const oWidth = w + 200, oHeight = h + 30;
      const totalLines = Math.ceil(oWidth / cfg.xGap);
      const totalPoints = Math.ceil(oHeight / cfg.yGap);
      const xStart = (w - cfg.xGap * totalLines) / 2;
      const yStart = (h - cfg.yGap * totalPoints) / 2;
      for (let i = 0; i <= totalLines; i++) {
        const pts = [];
        for (let j = 0; j <= totalPoints; j++) {
          pts.push({ x: xStart + cfg.xGap * i, y: yStart + cfg.yGap * j,
            wave: { x: 0, y: 0 }, cursor: { x: 0, y: 0, vx: 0, vy: 0 } });
        }
        lines.push(pts);
      }
    }
    function movePoints(time) {
      lines.forEach(function (pts) {
        pts.forEach(function (pt) {
          const move = noise.perlin2((pt.x + time * cfg.waveSpeedX) * 0.002, (pt.y + time * cfg.waveSpeedY) * 0.0015) * 12;
          pt.wave.x = Math.cos(move) * cfg.waveAmpX;
          pt.wave.y = Math.sin(move) * cfg.waveAmpY;
          const dx = pt.x - mouse.sx, dy = pt.y - mouse.sy;
          const dist = Math.hypot(dx, dy), l = Math.max(175, mouse.vs);
          if (dist < l) {
            const s = 1 - dist / l;
            const f = Math.cos(dist * 0.001) * s;
            pt.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00065;
            pt.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00065;
          }
          pt.cursor.vx += (0 - pt.cursor.x) * cfg.tension;
          pt.cursor.vy += (0 - pt.cursor.y) * cfg.tension;
          pt.cursor.vx *= cfg.friction; pt.cursor.vy *= cfg.friction;
          pt.cursor.x += pt.cursor.vx * 2; pt.cursor.y += pt.cursor.vy * 2;
          pt.cursor.x = Math.min(cfg.maxCursorMove, Math.max(-cfg.maxCursorMove, pt.cursor.x));
          pt.cursor.y = Math.min(cfg.maxCursorMove, Math.max(-cfg.maxCursorMove, pt.cursor.y));
        });
      });
    }
    function moved(pt, withCursor) {
      const x = pt.x + pt.wave.x + (withCursor ? pt.cursor.x : 0);
      const y = pt.y + pt.wave.y + (withCursor ? pt.cursor.y : 0);
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    }
    function drawLines() {
      ctx.clearRect(0, 0, bounding.width, bounding.height);
      ctx.beginPath();
      ctx.strokeStyle = cfg.lineColor;
      lines.forEach(function (points) {
        let p1 = moved(points[0], false);
        ctx.moveTo(p1.x, p1.y);
        points.forEach(function (pt, idx) {
          const isLast = idx === points.length - 1;
          p1 = moved(pt, !isLast);
          const p2 = moved(points[idx + 1] || points[points.length - 1], !isLast);
          ctx.lineTo(p1.x, p1.y);
          if (isLast) ctx.moveTo(p2.x, p2.y);
        });
      });
      ctx.stroke();
    }
    let raf = 0;
    function tick(t) {
      mouse.sx += (mouse.x - mouse.sx) * 0.1;
      mouse.sy += (mouse.y - mouse.sy) * 0.1;
      const dx = mouse.x - mouse.lx, dy = mouse.y - mouse.ly;
      const d = Math.hypot(dx, dy);
      mouse.v = d; mouse.vs += (d - mouse.vs) * 0.1; mouse.vs = Math.min(100, mouse.vs);
      mouse.lx = mouse.x; mouse.ly = mouse.y; mouse.a = Math.atan2(dy, dx);
      movePoints(t); drawLines();
      raf = requestAnimationFrame(tick);
    }
    function updateMouse(x, y) {
      bounding = host.getBoundingClientRect();   // fresh each move so it tracks through scroll
      mouse.x = x - bounding.left; mouse.y = y - bounding.top;
      if (!mouse.set) { mouse.sx = mouse.x; mouse.sy = mouse.y; mouse.lx = mouse.x; mouse.ly = mouse.y; mouse.set = true; }
    }
    function onMove(e) { updateMouse(e.clientX, e.clientY); }
    function onTouch(e) { const tch = e.touches[0]; if (tch) updateMouse(tch.clientX, tch.clientY); }
    function onResize() { setSize(); setLines(); }

    setSize(); setLines();
    window.addEventListener('resize', onResize, { passive: true });

    if (reduced) {
      movePoints(0); drawLines();
    } else {
      window.addEventListener('mousemove', onMove, { passive: true });
      window.addEventListener('touchmove', onTouch, { passive: true });
      raf = requestAnimationFrame(tick);
    }

    return function () {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      if (canvas.parentElement === host) host.removeChild(canvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.lineColor, p.waveSpeedX, p.waveSpeedY, p.waveAmpX, p.waveAmpY, p.xGap, p.yGap,
      p.friction, p.tension, p.maxCursorMove]);

  return <div ref={hostRef} className={'waves ' + (p.className || '')} aria-hidden="true" />;
}

window.Waves = Waves;
