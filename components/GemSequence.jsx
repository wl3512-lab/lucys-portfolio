/* global React */

/*
  GemSequence — the s0mped stone, a Blender-rendered brilliant played as a two-axis grid.

  blender/render_grid.sh renders GEM_ORBITS x GEM_LIGHTS frames: the orbit axis is a tumble
  (the camera circles 270 degrees while rising from profile to face-up), the light axis turns
  the studio panels so the fire moves across the facets. GemStory drives both through
  props.driveRef: { orbit: 0..1, light: 0..1 } from scroll and pointer. This component only
  draws; it never listens to scroll itself. It writes back { cx, cy, w } (the drawn stone in
  host pixels) so the chapter can fly the stone into the nav.

  Smoothness without more frames: the four grid frames around the exact (orbit, light)
  position are blended bilinearly with additive compositing, which on premultiplied RGBA is
  an exact linear crossfade. 36 poses read as continuous motion, at no extra download.

  Kept cheap on purpose, because this runs while the page scrolls:
    - the colour grade is baked into the frames (no CSS filter re-rasterised per redraw);
    - the canvas is a square around the stone, not the whole section, capped at 1.5x DPR;
    - frames are decoded off the main thread (createImageBitmap) before they count as ready,
      so a draw never stalls on decoding;
    - memory is a sliding window: all 180 frames stay resident only as compressed bytes
      (~27KB each); decoded bitmaps (2.4MB each at 768px) exist just for the orbits around
      the current pose plus a coarse keyframe ring, and are closed as the pose moves on.
      Holding every frame decoded was ~425MB of RAM for one section;
    - it redraws only when the quantised blend state changes, and the rAF loop stops while
      the section is off screen.
  props.lights limits which light columns load (phones take three of five).
*/
const GEM_ORBITS = 36;
const GEM_LIGHTS = 5;
const GEM_GRID_DIR = 'assets/gems/grid/';

function gemGridSrc(o, l) {
  return GEM_GRID_DIR + 'o' + String(o).padStart(2, '0') + '_l' + l + '.webp';
}

function GemSequence(props) {
  const hostRef = React.useRef(null);
  const placeRef = React.useRef(null);
  const layoutRef = React.useRef(null);
  placeRef.current = (props && props.place) || { x: 0.5, y: 0.5, scale: 0.8 };
  const driveRef = props && props.driveRef;
  const lightsKey = ((props && props.lights) || [0, 1, 2, 3, 4]).join(',');

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'gem-seq-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    host.appendChild(canvas);

    const lights = lightsKey.split(',').map(Number);
    const lo = Math.min.apply(null, lights), hi = Math.max.apply(null, lights);
    const frames = [];                       // frames[o][l] = decoded bitmap/Image, drawable
    const blobs = [];                        // blobs[o][l] = compressed bytes (Blob), or true while fetching
    const decoding = [];                     // decoding[o][l] = true while a decode is in flight
    for (let o = 0; o < GEM_ORBITS; o++) { frames.push([]); blobs.push([]); decoding.push([]); }
    const canBitmap = typeof createImageBitmap === 'function';
    // Always-decoded keyframes, so a fast fling lands on a near pose while its window decodes.
    const mid = lights.indexOf(2) > -1 ? 2 : lights[0];
    const isKey = (o, l) => l === mid && (o % 6 === 0 || o === GEM_ORBITS - 1);
    const AHEAD = 4, BEHIND = 2, EVICT = 6;  // window in orbits; evict beyond EVICT
    let centre = -1, dir = 1, inflight = 0;
    let W = 0, H = 0, S = 0, dpr = 1, disposed = false, raf = 0, drawn = '', visible = true;
    let light = 0.5;
    let reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    // The canvas is a square box around the stone; its placement lives in host pixels.
    function layout() {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      W = r.width; H = r.height;
      const place = placeRef.current;
      S = Math.round(Math.min(W, H) * place.scale);
      if (place.maxW) S = Math.min(S, Math.round(W * place.maxW));   // keeps side columns clear on narrow wides
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(S * dpr);
      canvas.height = Math.round(S * dpr);
      canvas.style.width = S + 'px';
      canvas.style.height = S + 'px';
      canvas.style.left = Math.round(W * place.x - S / 2) + 'px';
      canvas.style.top = Math.round(H * place.y - S / 2) + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (driveRef) { driveRef.current.cx = W * place.x; driveRef.current.cy = H * place.y; driveRef.current.w = S; }
      // Where the stone sits, for CSS that has to line up with it (the light-mode contact shadow).
      host.style.setProperty('--stone-x', (W * place.x).toFixed(1) + 'px');
      host.style.setProperty('--stone-y', (H * place.y).toFixed(1) + 'px');
      host.style.setProperty('--stone-s', S + 'px');
      drawn = '';
      return true;
    }

    const ready = (o, l) => o >= 0 && o < GEM_ORBITS && !!frames[o][l];
    // Nearest ready frame to (o, l): same pose at the nearest light first, then walk the orbit.
    function nearest(o, l) {
      for (let d = 0; d < GEM_ORBITS; d++) {
        for (const oo of d ? [o - d, o + d] : [o]) {
          for (let e = 0; e <= GEM_LIGHTS; e++) {
            for (const ll of e ? [l - e, l + e] : [l]) if (ready(oo, ll)) return frames[oo][ll];
          }
        }
      }
      return null;
    }

    function paint(of, lf) {
      const o0 = Math.floor(of), l0 = Math.floor(lf);
      const to = of - o0, tl = lf - l0;
      const o1 = Math.min(GEM_ORBITS - 1, o0 + 1), l1 = Math.min(hi, l0 + 1);
      const taps = [
        [o0, l0, (1 - to) * (1 - tl)], [o1, l0, to * (1 - tl)],
        [o0, l1, (1 - to) * tl],       [o1, l1, to * tl],
      ].filter((t) => t[2] > 0.004);
      ctx.clearRect(0, 0, S, S);
      // Additive on premultiplied pixels = exact crossfade, provided every tap is ready.
      if (taps.every((t) => ready(t[0], t[1]))) {
        ctx.globalCompositeOperation = 'lighter';
        taps.forEach((t) => { ctx.globalAlpha = t[2]; ctx.drawImage(frames[t[0]][t[1]], 0, 0, S, S); });
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        return true;
      }
      const img = nearest(Math.round(of), Math.round(lf));
      if (!img) return false;
      ctx.drawImage(img, 0, 0, S, S);
      return true;
    }

    function tick() {
      raf = 0;
      if (disposed || !visible) return;
      raf = requestAnimationFrame(tick);
      const d = driveRef ? driveRef.current : { orbit: 0.5, light: 0.5 };
      // With no pointer for a while the light drifts on its own, so the stone still sparkles
      // for a reader who only scrolls. Reduced motion holds it in the middle.
      const now = performance.now();
      // d.steer: the chapter aims the light itself (spotlight on the active beat or the pointer).
      const idle = !d.steer && (!d.moved || now - d.moved > 2500);
      const want = reduced ? 0.5 : idle ? 0.5 + 0.4 * Math.sin(now / 2600) : d.light;
      light += (want - light) * 0.12;
      const of = Math.max(0, Math.min(GEM_ORBITS - 1, (d.orbit || 0) * (GEM_ORBITS - 1)));
      recentre(Math.round(of));
      const lf = Math.max(lo, Math.min(hi, light * (GEM_LIGHTS - 1)));
      // Quantised so an idle drift redraws a few times a second, not every frame.
      const key = Math.round(of * 24) + ':' + Math.round(lf * 24);
      if (key === drawn) return;
      if (paint(of, lf)) drawn = key;
    }
    function start() { if (!raf && !disposed && visible) raf = requestAnimationFrame(tick); }

    // Decode one frame off the main thread. Capped at 3 in flight so a fling never queues
    // dozens of decodes at once.
    function decode(o, l) {
      const b = blobs[o][l];
      if (!(b instanceof Blob) || frames[o][l] || decoding[o][l] || inflight >= 3) return;
      decoding[o][l] = true; inflight++;
      const finish = (img) => {
        decoding[o][l] = false; inflight--;
        if (disposed) { if (img && img.close) img.close(); return; }
        if (img) { frames[o][l] = img; drawn = ''; }
        pump();
      };
      if (canBitmap) createImageBitmap(b).then(finish, () => finish(null));
      else {
        const url = URL.createObjectURL(b), img = new Image();
        img.src = url;
        const ok = () => { URL.revokeObjectURL(url); finish(img); };
        if (img.decode) img.decode().then(ok, () => { URL.revokeObjectURL(url); finish(null); });
        else img.onload = ok;
      }
    }
    function wanted(o, l) {
      if (isKey(o, l)) return true;
      if (centre < 0) return false;
      const d = (o - centre) * dir;
      return d >= -BEHIND && d <= AHEAD;
    }
    // Decode what the window needs (nearest first), close what it has left behind.
    function pump() {
      if (disposed) return;
      for (let o = 0; o < GEM_ORBITS; o++) {
        for (const l of lights) {
          const f = frames[o][l];
          if (f && !isKey(o, l) && centre >= 0 && Math.abs(o - centre) > EVICT) {
            if (f.close) f.close();
            frames[o][l] = null;
          }
        }
      }
      for (let k = 0; k <= AHEAD && inflight < 3; k++) {
        for (const o of k ? [centre + dir * k, centre - dir * k] : [centre]) {
          if (o < 0 || o >= GEM_ORBITS) continue;
          for (const l of lights) if (wanted(o, l)) decode(o, l);
        }
      }
      for (let o = 0; o < GEM_ORBITS && inflight < 3; o++) if (isKey(o, mid)) decode(o, mid);
    }
    function recentre(o) {
      if (o === centre) return;
      if (centre >= 0) dir = o >= centre ? 1 : -1;
      centre = o;
      pump();
    }

    function load(o, l) {
      if (blobs[o][l]) return;
      blobs[o][l] = true;
      fetch(gemGridSrc(o, l)).then((r) => (r.ok ? r.blob() : null)).then((b) => {
        if (disposed) return;
        blobs[o][l] = b || null;
        if (b && wanted(o, l)) decode(o, l);
      }, () => { blobs[o][l] = null; });
    }

    // Coarse pass on the middle light, then the whole middle light, then the other lights.
    for (let o = 0; o < GEM_ORBITS; o += 6) load(o, mid);
    load(GEM_ORBITS - 1, mid);
    const fill1 = setTimeout(() => { for (let o = 0; o < GEM_ORBITS; o++) load(o, mid); }, 300);
    const fill2 = setTimeout(() => {
      for (let o = 0; o < GEM_ORBITS; o++) lights.forEach((l) => load(o, l));
    }, 1600);

    let ro = null, io = null;
    try { ro = new ResizeObserver(() => { layout(); }); ro.observe(host); } catch (e) {}
    try {
      io = new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
        if (visible) { drawn = ''; start(); }
      }, { rootMargin: '200px 0px' });
      io.observe(host);
    } catch (e) {}
    layoutRef.current = layout;
    layout();
    start();

    return () => {
      layoutRef.current = null;
      disposed = true;
      clearTimeout(fill1); clearTimeout(fill2);
      try { cancelAnimationFrame(raf); } catch (e) {}
      try { if (ro) ro.disconnect(); } catch (e) {}
      try { if (io) io.disconnect(); } catch (e) {}
      try { if (canvas.parentElement === host) host.removeChild(canvas); } catch (e) {}
      frames.forEach((row) => row.forEach((f) => { if (f && f.close) f.close(); }));
    };
  }, [lightsKey]);

  // The chapter switches placement (desktop centre vs phone upper half) without a resize.
  const pk = placeRef.current.x + ',' + placeRef.current.y + ',' + placeRef.current.scale;
  React.useEffect(() => { if (layoutRef.current) layoutRef.current(); }, [pk]);

  return <div ref={hostRef} className={'gem-sequence ' + (props && props.className ? props.className : '')} aria-hidden="true" />;
}

window.GemSequence = GemSequence;
