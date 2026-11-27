/*
 * The Capabilities night drive (section 02): a first-person drive at night through five
 * stages made from Lucy's board, one per capability, with each capability projected onto the
 * world in its stage's medium. Ported from look test 4
 * (docs/superpowers/plans/2026-10-21-night-drive/night-drive-v4.html); the spec is
 * docs/superpowers/specs/2026-10-21-capabilities-night-drive-design.md.
 *
 * The engine owns the WebGL world, the film, the reveal, the title's letters and the flicked
 * pixel, and plays the creature through a CreaturePlayer. It owns no scroll: the section
 * (Skills.jsx) passes progress in with setProgress(s). Its frame loop runs only while the
 * canvas is on screen and the tab is visible. Every DOM position is taken relative to the
 * canvas, which fills the pinned stage, so nothing depends on where the page is scrolled.
 *
 *   const drive = NightDrive.mount(canvas, { stops, timing, title, stop, entry, pixel, creature, voidRgb, onLost })
 *   drive.setProgress(s); drive.resize(); drive.dispose(); drive.info → { s, speed, stage, rv, R, f, e, level }
 *
 * Plain script; needs window.THREE (r160) and window.NightDriveMath.
 */
(function () {
  'use strict';
  const M = window.NightDriveMath;
  function supported() { return !!(window.THREE && M && window.__webglOK !== false); }

  function mount(canvas, opts) {
    if (!supported() || !canvas || !opts || !opts.timing) return null;
    const THREE = window.THREE;
    const t = opts.timing, STOP_S = M.STOP_S, BOUND_S = M.BOUND_S;
    const clamp01 = M.clamp01, ease = M.ease, smooth = M.smooth, easeToggle = M.easeToggle;
    const STOPS = opts.stops.map((x) => ({ t: x.lines, l: x.line }));
    let cr = opts.creature || null;
    // Night colour per stage, from the board: cold monochrome crowds, paper and red ink, teal
    // and gold trails, magenta and cyan data, electric blue light.
    const LOOK = [
      { sky: 0x1a2236, fog: 0x06080f, line: 0xd8e0f0 },
      { sky: 0x2a161e, fog: 0x0a0609, line: 0xff5a64 },
      { sky: 0x0a2a33, fog: 0x040b0e, line: 0x58e6d2 },
      { sky: 0x290c34, fog: 0x09050d, line: 0xff4fd8 },
      { sky: 0x131b5a, fog: 0x05061a, line: 0x72adff },
    ];

    let W = Math.max(1, canvas.clientWidth), H = Math.max(1, canvas.clientHeight);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    // Quality: pixel ratio capped at 1.25 (1 on phones); `level` steps down when frames run long.
    let level = 0;
    const dprFor = () => Math.min(window.devicePixelRatio || 1, W <= 640 ? 1 : 1.25) * (level >= 2 ? 0.5 : 1);
    let DPR = dprFor();
    renderer.setPixelRatio(DPR);
    renderer.autoClear = false;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // every shader here writes display values
    const HDR = renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 2400);

    // ── Road ────────────────────────────────────────────────────────────────────────
    const LEN = 1700, CREST_U = 0.66, GROUND = 0.25;   // the ground sits 1.65 below the eye
    const hill = (u) => Math.sin(u * Math.PI * 3.1) * 4 + 30 * Math.exp(-Math.pow((u - CREST_U) / 0.05, 2)) - 12 * Math.exp(-Math.pow((u - CREST_U - 0.07) / 0.05, 2));
    const ctrl = [];
    for (let i = 0; i <= 34; i++) { const u = i / 34; ctrl.push(new THREE.Vector3(Math.sin(u * Math.PI * 2.3) * 70 + Math.sin(u * Math.PI * 6.1) * 14, hill(u), -u * LEN)); }
    const path = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
    path.arcLengthDivisions = 3000;
    const PL = path.getLength();
    const WN = 2000, cum = new Float32Array(WN + 1);
    for (let i = 1; i <= WN; i++) { const u = i / WN; cum[i] = cum[i - 1] + 1 + 2.2 * Math.exp(-Math.pow((u - CREST_U) / 0.02, 2)); }
    for (let i = 0; i <= WN; i++) cum[i] /= cum[WN];
    function uFromD(d) { let lo = 0, hi = WN; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; } return (lo + (d - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo])) / WN; }
    const dFromU = (u) => cum[Math.max(0, Math.min(WN, Math.round(u * WN)))];
    // Around each stop the drive slows almost to a halt (NightDriveMath.makeDwell).
    const dwell = M.makeDwell(t.eDrive), dFromS = dwell.dFromS, sFromD = dwell.sFromD;
    const stageAtU = (u) => M.stageAt(sFromD(dFromU(u)));
    const camU = (s) => Math.min(0.995, uFromD(dFromS(s)) * 0.995);
    // where each stage starts along the road, in metres (for shaders that blend by place)
    const BOUND = [0].concat(BOUND_S.map((b) => camU(b) * PL));

    const UP = new THREE.Vector3(0, 1, 0);
    const tc = new THREE.Color();
    const rgb = (hex, k) => { tc.setHex(hex); return [tc.r * k, tc.g * k, tc.b * k]; };
    const rand = (() => { let x = 987654321; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
    function frameAt(dist) {
      const u = Math.max(0, Math.min(1, dist / PL));
      const p = path.getPointAt(u), tan = path.getTangentAt(u);
      return { u, dist, p, tan, right: new THREE.Vector3().crossVectors(tan, UP).normalize(), stage: stageAtU(u) };
    }
    const place = (F, lat, y, along) => { const v = F.p.clone().addScaledVector(F.right, lat).addScaledVector(UP, y); if (along) v.addScaledVector(F.tan, along); return v; };
    const v3 = (v) => [v.x, v.y, v.z];

    // ── Uniforms shared by every world shader ───────────────────────────────────────
    const gain = [1, 1, 1, 1, 1];
    const U = {
      uVP: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() }, uView: { value: new THREE.Vector2(1, 1) },
      uPx: { value: 1 }, uExp: { value: 0.1 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFog: { value: 0.0042 },
      uGain: { value: gain }, uCam: { value: new THREE.Vector3() }, uFogCol: { value: new THREE.Color(LOOK[0].fog) },
      uBound: { value: BOUND.slice() },
      // the projected capabilities: one atlas row and one projector per stop
      uAtlas: { value: null }, uProj: { value: [0, 1, 2, 3, 4].map(() => new THREE.Matrix4()) },
      uProjPos: { value: [0, 1, 2, 3, 4].map(() => new THREE.Vector3()) }, uProjOn: { value: [0, 0, 0, 0, 0] },
    };
    const GLSL_COMMON = `
      uniform vec3 uCam; uniform float uFog; uniform vec3 uFogCol; uniform float uTime; uniform float uBeat; uniform float uBound[5];
      uniform sampler2D uAtlas; uniform mat4 uProj[5]; uniform vec3 uProjPos[5]; uniform float uProjOn[5];
      float hash1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
      float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      // stage weights by distance along the road
      float stageW(float dist, int i) {
        float a = i == 0 ? -1e5 : uBound[i];
        float b = i == 4 ? 1e7 : (i == 0 ? uBound[1] : i == 1 ? uBound[2] : i == 2 ? uBound[3] : uBound[4]);
        return smoothstep(a - 18.0, a + 18.0, dist) * (1.0 - smoothstep(b - 18.0, b + 18.0, dist));
      }
      // Each capability is light thrown from its stop onto whatever surface is in the way:
      // the road, a passer-by, a sheet, a tower. Where nothing is in the way there is no text.
      vec3 projected(vec3 wp, vec3 n) {
        vec3 acc = vec3(0.0);
        for (int i = 0; i < 5; i++) {
          float on = uProjOn[i];
          if (on < 0.002) continue;
          vec4 pc = uProj[i] * vec4(wp, 1.0);
          if (pc.w < 0.5) continue;
          vec2 uv = pc.xy / pc.w * 0.5 + 0.5;
          if (uv.x <= 0.0 || uv.x >= 1.0 || uv.y <= 0.0 || uv.y >= 1.0) continue;
          vec3 L = uProjPos[i] - wp; float d = length(L);
          float facing = dot(n, n) < 0.5 ? 1.0 : clamp(0.35 + dot(n, L / d) * 1.2, 0.0, 1.0);
          float edge = smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x) * smoothstep(0.0, 0.04, uv.y) * smoothstep(1.0, 0.96, uv.y);
          vec3 t = texture2D(uAtlas, vec2(uv.x, (float(4 - i) + uv.y) / 5.0)).rgb;
          acc += t * on * edge * facing * clamp(34.0 / d, 0.3, 1.5);
        }
        return acc;
      }`;

    // ── The projected capabilities: one canvas, each stop's title in its stage's medium ──
    // The atlas is light, not page colour: black throws nothing, white throws full light.
    const LIGHT = 'rgb(255, 255, 255)', NO_LIGHT = 'rgb(0, 0, 0)';
    const TW = 1536, TH = 576;
    const atlas = document.createElement('canvas'); atlas.width = TW; atlas.height = TH * 5;
    const atlasTex = new THREE.CanvasTexture(atlas);
    atlasTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    atlasTex.minFilter = THREE.LinearMipmapLinearFilter;
    U.uAtlas.value = atlasTex;
    function drawTitle(x, i, oy) {
      const S = STOPS[i], size = 150, lh = 138, left = 64;
      const top = oy + (S.t.length === 1 ? 236 : 168);
      const font = '820 ' + size + 'px Anybody, sans-serif';
      const setT = () => { x.font = font; try { x.fontStretch = 'expanded'; } catch (e) { /* older canvases set normal width */ } x.textBaseline = 'alphabetic'; };
      const lines = (dx, dy) => S.t.forEach((ln, k) => x.fillText(ln, left + (dx || 0), top + k * lh + (dy || 0)));
      const lineY = top + (S.t.length - 1) * lh + 112;
      x.save();
      if (i === 0) {          // ghost crowds: the words pass through, blurred, more than once
        setT();
        [[-86, 0.1, 16], [-44, 0.16, 9], [34, 0.09, 12]].forEach(([dx, a, b]) => { x.filter = 'blur(' + b + 'px)'; x.globalAlpha = a; x.fillStyle = '#e8ecf5'; lines(dx); });
        x.filter = 'none'; x.globalAlpha = 1; x.fillStyle = '#f2f4f8'; lines();
      } else if (i === 1) {   // print & frames: misregistered red, toner speckle, tracking boxes
        setT();
        x.globalAlpha = 0.55; x.fillStyle = '#ff3d4f'; lines(7, 4);
        x.globalAlpha = 1; x.fillStyle = '#f1efe9'; lines();
        x.globalCompositeOperation = 'destination-out';
        for (let n = 0; n < 9000; n++) { const px = rand() * TW, py = oy + rand() * TH, r = 1 + rand() * 2.2; x.fillRect(px, py, r, r); }
        x.globalCompositeOperation = 'source-over';
        x.strokeStyle = 'rgba(244,244,248,.92)'; x.lineWidth = 3; x.fillStyle = 'rgba(244,244,248,.92)';
        S.t.forEach((ln, k) => {
          setT(); const w = x.measureText(ln).width, yb = top + k * lh;
          x.strokeRect(left - 14, yb - 118, w + 28, 140);
          x.font = '22px "Space Mono", monospace'; try { x.fontStretch = 'normal'; } catch (e) { /* see setT */ }
          x.fillText((k ? 'w ' : 'x ') + String(Math.round(k ? w : left)).padStart(4, '0') + (k ? '' : ' · y ' + String(Math.round(yb - oy)).padStart(4, '0')), left - 14, yb - 128);
        });
      } else if (i === 2) {   // long exposure: light dragged behind the words
        setT();
        for (let k = 14; k >= 1; k--) { x.globalAlpha = 0.07 * (1 - k / 15); x.fillStyle = k % 2 ? '#58e6d2' : '#ffb15e'; lines(-k * 11); }
        x.globalAlpha = 1; x.fillStyle = LIGHT; lines();
      } else if (i === 3) {   // glitch: channels apart, columns pixel-sorted downward, a torn slice
        setT();
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = 0.75; x.fillStyle = '#ff2fd0'; lines(-7); x.fillStyle = '#22e6ff'; lines(7);
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = LIGHT; lines();
        const img = x.getImageData(0, oy, TW, TH), d = img.data;
        for (let px = 0; px < TW; px++) {
          if (rand() > 0.38) continue;
          let topY = -1; for (let py = 0; py < TH; py++) if (d[(py * TW + px) * 4 + 3] > 150) { topY = py; break; }
          if (topY < 0) continue;
          const len = Math.pow(rand(), 1.8) * 240, band = Math.floor(px / (5 + rand() * 9)) % 3;
          const col = band === 0 ? [255, 70, 210] : band === 1 ? [60, 230, 255] : [255, 255, 255];
          for (let py = topY; py < Math.min(TH, topY + len); py++) {
            const o = (py * TW + px) * 4; if (d[o + 3] > 150) continue;
            const f = 1 - (py - topY) / len; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 230 * f;
          }
        }
        const y0 = Math.floor(TH * 0.38), h = 16, sh = 34;
        for (let py = y0; py < y0 + h; py++) { const row = d.slice(py * TW * 4, (py + 1) * TW * 4); for (let px = 0; px < TW; px++) { const sx = Math.min(TW - 1, Math.max(0, px - sh)); d.set(row.subarray(sx * 4, sx * 4 + 4), (py * TW + px) * 4); } }
        x.putImageData(img, 0, oy);
      } else {                // light: bloom and colour fringe, the booth's glow
        setT();
        x.globalCompositeOperation = 'lighter';
        x.shadowColor = 'rgba(196,176,255,.9)'; x.shadowBlur = 46; x.globalAlpha = 0.6; x.fillStyle = '#c4b0ff'; lines();
        x.shadowBlur = 0; x.globalAlpha = 0.85; x.fillStyle = '#ff3b6b'; lines(-6); x.fillStyle = '#3b8bff'; lines(6);
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = LIGHT; lines();
      }
      // the line, in the board's electric blue, big enough to read on a phone, wrapped rather than shrunk
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none';
      x.font = 'italic 500 62px "DM Sans", sans-serif'; try { x.fontStretch = 'normal'; } catch (e) { /* see setT */ }
      x.shadowColor = 'rgba(114,173,255,.75)'; x.shadowBlur = 14; x.fillStyle = '#9cc7ff';
      const rows = []; let cur = '';
      S.l.split(' ').forEach((wd) => { const tx = cur ? cur + ' ' + wd : wd; if (x.measureText(tx).width > TW - left * 2 && cur) { rows.push(cur); cur = wd; } else cur = tx; });
      rows.push(cur);
      rows.forEach((r, k) => x.fillText(r, left + 4, lineY + k * 70));
      x.restore();
    }
    function drawAtlas() {
      const x = atlas.getContext('2d', { willReadFrequently: true });
      x.fillStyle = NO_LIGHT; x.fillRect(0, 0, TW, TH * 5);
      for (let i = 0; i < 5; i++) drawTitle(x, i, i * TH);
      atlasTex.needsUpdate = true;
    }
    // A projector at each stop, at the eye, aimed a little below the horizon: standing at the
    // stop the words read straight; driving past, they slide and bend over what they land on.
    const projCams = STOP_S.map((Ss, i) => {
      const pc = new THREE.PerspectiveCamera(15.5, TW / TH, 1, 700);
      const u = camU(Ss), p = path.getPointAt(u), q = path.getPointAt(Math.min(0.999, u + 0.012));
      p.y += 1.95; q.y += 1.5;
      pc.position.copy(p); pc.lookAt(q); pc.rotateX(-0.155); pc.updateMatrixWorld();
      U.uProjPos.value[i].copy(pc.position);
      return pc;
    });
    // The words never spill past the screen: each projector throws at most 88% of what the
    // camera sees across, so a phone's narrow view gets the whole title, smaller.
    function aimProjectors() {
      const camAcross = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(56) / 2) * (W / H));
      const across = Math.min(THREE.MathUtils.degToRad(38.6), camAcross * 0.88);
      const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(across / 2) / (TW / TH)));
      projCams.forEach((pc, i) => { pc.fov = fov; pc.updateProjectionMatrix(); U.uProj.value[i].multiplyMatrices(pc.projectionMatrix, pc.matrixWorldInverse); });
    }

    // ── Materials ───────────────────────────────────────────────────────────────────
    const ADD = { blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, transparent: true };
    const shader = (vs, fs, extra) => new THREE.ShaderMaterial(Object.assign({ vertexShader: vs, fragmentShader: GLSL_COMMON + fs, uniforms: U }, extra || {}));

    // Points: long-exposure streaks for every small light on the road.
    const pointVert = `
      attribute vec2 corner;
      attribute vec3 iPos; attribute vec3 iVel; attribute vec3 iColor; attribute vec4 iMeta; // size, phase, pulse, stage
      uniform mat4 uVP; uniform mat4 uPrevVP; uniform vec2 uView; uniform float uPx; uniform float uExp;
      uniform float uTime; uniform float uBeat; uniform float uFog; uniform float uGain[5];
      varying vec3 vColor; varying vec2 vLocal; varying float vLen; varying float vR;
      void main() {
        vec3 now = iPos, then = iPos - iVel * uExp;
        vec4 h = uVP * vec4(now, 1.0), t = uPrevVP * vec4(then, 1.0);
        if (h.w < 0.4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        if (t.w < 0.4) t = h;
        vec2 hp = h.xy / h.w * 0.5 * uView, tp = t.xy / t.w * 0.5 * uView;
        vec2 d = hp - tp; float len = length(d); float cap = uView.y * 0.9;
        if (len > cap) { tp = hp - d / len * cap; d = hp - tp; len = cap; }
        vec2 dir = len > 0.01 ? d / len : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
        float px = iMeta.x * uPx / h.w, inten = 1.0;
        if (px < 0.85) { inten = px / 0.85; px = 0.85; }
        float r = px * 4.0;
        vec2 p = mix(tp, hp, corner.x) + dir * (corner.x * 2.0 - 1.0) * r + nrm * corner.y * r;
        gl_Position = vec4(p / (0.5 * uView), h.z / h.w, 1.0);
        vLocal = vec2(mix(-r, len + r, corner.x), corner.y * r); vLen = len; vR = px;
        float beat = pow(0.5 + 0.5 * sin(uBeat - iMeta.y), 10.0);
        int s = int(iMeta.w + 0.5);
        float g = s == 0 ? uGain[0] : s == 1 ? uGain[1] : s == 2 ? uGain[2] : s == 3 ? uGain[3] : uGain[4];
        vColor = iColor * inten * (1.0 + iMeta.z * (beat * 2.6 - 0.45)) * exp(-h.w * uFog) * pow((2.0 * px) / (2.0 * px + len), 0.5) * g;
      }`;
    const pointFrag = `
      varying vec3 vColor; varying vec2 vLocal; varying float vLen; varying float vR;
      void main() {
        float ax = clamp(vLocal.x, 0.0, vLen);
        float d = length(vec2(vLocal.x - ax, vLocal.y)) / vR;
        float a = (exp(-d * d * 1.5) + 0.11 * exp(-d * 0.95)) * (vLen > 0.5 ? mix(0.3, 1.0, ax / vLen) : 1.0);
        if (a < 0.003) discard;
        gl_FragColor = vec4(vColor * a, 1.0);
      }`;
    const pointMat = new THREE.ShaderMaterial(Object.assign({ vertexShader: pointVert, fragmentShader: pointFrag, uniforms: U }, ADD));
    const pixelMat = new THREE.ShaderMaterial(Object.assign({ vertexShader: pointVert, fragmentShader: pointFrag, uniforms: U }, ADD, { depthTest: false }));
    function quadGeo(n, centred) {
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
      g.setAttribute('corner', new THREE.BufferAttribute(new Float32Array(centred ? [-1, -1, 1, -1, 1, 1, -1, 1] : [0, -1, 1, -1, 1, 1, 0, 1]), 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      g.instanceCount = n;
      return g;
    }
    function instanced(geo, spec, list, dynamic) {
      for (const k in spec) {
        const n = spec[k], a = new Float32Array(list.length * n);
        list.forEach((L, i) => { const v = L[k]; if (typeof v === 'number') a[i] = v; else a.set(v, i * n); });
        const attr = new THREE.InstancedBufferAttribute(a, n); if (dynamic) attr.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute(k, attr);
      }
      return geo;
    }
    function pointGroup(list, dynamic, mat) {
      const g = instanced(quadGeo(list.length), { iPos: 3, iVel: 3, iColor: 3, iMeta: 4 },
        list.map((L) => ({ iPos: L.p, iVel: L.v || [0, 0, 0], iColor: L.c, iMeta: [L.size, L.phase || 0, L.pulse || 0, L.stage || 0] })), dynamic);
      const m = new THREE.Mesh(g, mat || pointMat); m.frustumCulled = false; m.renderOrder = 3; return m;
    }

    const scene = new THREE.Scene();
    let lineRef = null;

    // ── The ground: one ribbon along the road, the surface most words land on ───────────
    {
      const GN = 1800, GW = 70, pos = new Float32Array((GN + 1) * 2 * 3), uv = new Float32Array((GN + 1) * 2 * 2), idx = [];
      for (let i = 0; i <= GN; i++) {
        const F = frameAt(i / GN * PL);
        [-1, 1].forEach((side, j) => {
          const v = place(F, side * GW, GROUND);
          pos.set([v.x, v.y, v.z], (i * 2 + j) * 3); uv.set([side, F.dist], (i * 2 + j) * 2);
        });
        if (i < GN) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
      const mat = shader(`
        varying vec3 vWorld; varying vec2 vRoad;
        void main() { vWorld = position; vRoad = uv; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`, `
        uniform vec3 uLine;
        varying vec3 vWorld; varying vec2 vRoad;
        // light through moving water (the classic iterated caustic), for the performance stage
        float caustic(vec2 p, float t) {
          vec2 q = p; float c = 0.0;
          for (int i = 0; i < 3; i++) {
            q += vec2(sin(q.y * 1.31 + t * 0.9), sin(q.x * 1.73 - t * 1.13)) * 0.55;
            c += pow(1.0 - abs(sin(q.x) * sin(q.y)), 26.0);
          }
          return c / 3.0;
        }
        void main() {
          float lat = vRoad.x * 70.0, dist = vRoad.y;
          float w1 = stageW(dist, 1), w3 = stageW(dist, 3), w4 = stageW(dist, 4);
          float road = 1.0 - smoothstep(6.8, 7.3, abs(lat));
          vec3 col = vec3(0.011, 0.012, 0.018) * mix(1.3, 0.85, road);
          col *= 0.85 + 0.3 * hash2(floor(vec2(lat, dist) * 6.0));   // asphalt
          float dash = (1.0 - smoothstep(0.07, 0.13, abs(lat))) * step(0.55, fract(dist / 7.0));
          float edge = 1.0 - smoothstep(0.05, 0.11, abs(abs(lat) - 7.0));
          col += mix(vec3(0.5, 0.55, 0.65), uLine, 0.6) * (dash * 0.16 + edge * 0.1);
          if (w1 > 0.001) { vec2 g = abs(fract(vec2(lat, dist) / 2.4) - 0.5); col += vec3(0.85, 0.84, 0.86) * smoothstep(0.465, 0.5, max(g.x, g.y)) * 0.05 * w1 * (1.0 - road); }
          if (w3 > 0.001) { col += vec3(0.9, 0.3, 0.85) * smoothstep(0.47, 0.5, abs(fract(dist / 1.4) - 0.5)) * 0.045 * w3; }
          if (w4 > 0.001) {
            vec2 p = vec2(lat * 0.34, dist * 0.3); float t = uTime * 0.55;
            vec3 cs = vec3(caustic(p, t), caustic(p * 1.015 + 0.03, t + 0.04), caustic(p * 1.03 + 0.06, t + 0.08));
            col += cs * vec3(0.55, 0.6, 1.0) * 0.5 * w4;
          }
          col += projected(vWorld, vec3(0.0)) * 0.78;
          col = mix(uFogCol, col, exp(-distance(uCam, vWorld) * uFog));
          gl_FragColor = vec4(col, 1.0);
        }`);
      mat.uniforms = Object.assign({}, U, { uLine: { value: new THREE.Color(LOOK[0].line) } });
      lineRef = mat.uniforms.uLine;
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 0; scene.add(m);
    }

    // ── Research: columns of light at figure height, drifting past like people would ─────
    // (Lucy: abstract, no people.) Stage five brings them back as a crowd lit by the show.
    {
      const list = [];
      for (let dist = 0; dist < BOUND[1] + 30;) {
        const F = frameAt(dist), side = rand() < 0.5 ? -1 : 1, dir = rand() < 0.5 ? -1 : 1;
        const n = rand() < 0.45 ? 1 : rand() < 0.7 ? 2 : 3 + Math.floor(rand() * 3);
        const lat0 = side * (7.8 + rand() * 11), sp = 0.85 + rand() * 0.8, ph = rand();
        for (let k = 0; k < n; k++) {
          const base = place(F, lat0 + (rand() - 0.5) * 1.6, GROUND, (rand() - 0.5) * 2.4);
          list.push({ iBase: v3(base), iDir: v3(F.tan.clone().multiplyScalar(dir)), iMeta: [sp * (0.94 + rand() * 0.12), 1.48 + rand() * 0.46, 0.1 + rand() * 0.13, (ph + k * 0.013) % 1], iKind: 0 });
        }
        dist += 0.7 + rand() * 2.6;
      }
      for (let dist = 36; dist < BOUND[1]; dist += 16 + rand() * 22) {
        const F = frameAt(dist), n = 1 + Math.floor(rand() * 4), dir = rand() < 0.5 ? -1 : 1;
        for (let k = 0; k < n; k++) {
          const base = place(F, -dir * 26 + (rand() - 0.5) * 3, GROUND, (rand() - 0.5) * 3);
          list.push({ iBase: v3(base), iDir: v3(F.right.clone().multiplyScalar(dir)), iMeta: [1.0 + rand() * 0.45, 1.5 + rand() * 0.4, 0.11 + rand() * 0.11, rand()], iKind: 0 });
        }
      }
      for (let dist = BOUND[4] - 10; dist < PL; dist += 1.1) {
        const F = frameAt(dist), side = rand() < 0.5 ? -1 : 1;
        const base = place(F, side * (8.5 + rand() * 7), GROUND);
        list.push({ iBase: v3(base), iDir: [0, 0, 0], iMeta: [0, 1.5 + rand() * 0.45, 0.17 + rand() * 0.07, rand()], iKind: 1 });
      }
      const g = instanced(quadGeo(list.length, true), { iBase: 3, iDir: 3, iMeta: 4, iKind: 1 }, list);
      const mat = shader(`
        attribute vec2 corner; attribute vec3 iBase; attribute vec3 iDir; attribute vec4 iMeta; attribute float iKind;
        uniform mat4 uVP; uniform vec3 uCam; uniform float uTime; uniform float uBeat;
        varying vec2 vLocal; varying vec3 vWorld; varying float vFade; varying float vKind;
        void main() {
          float sp = iMeta.x, h = iMeta.y, hw = iMeta.z, ph = iMeta.w, L = 60.0;
          float s = mod(uTime * sp + ph * L, L);
          vec3 c = iBase + iDir * s;
          float stepT = uTime * sp * 1.9 + ph * 6.2831;
          float bob = iKind < 0.5 ? abs(sin(stepT * 3.1416)) * 0.045 : pow(0.5 + 0.5 * sin(uBeat - ph * 2.5), 3.0) * 0.24;
          float sway = iKind < 0.5 ? sin(stepT * 1.5708) * 0.05 : sin(uBeat * 0.5 + ph * 4.0) * 0.14;
          vec3 toCam = uCam - c; toCam.y = 0.0;
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam + vec3(1e-4)));
          float yy = corner.y * 0.5 + 0.5;
          vec3 wp = c + right * (corner.x * hw * 2.6 + sway * yy) + vec3(0.0, yy * h + bob, 0.0);
          vFade = iKind < 0.5 ? smoothstep(0.0, 8.0, s) * smoothstep(L, L - 8.0, s) : 1.0;
          vLocal = vec2(corner.x * 2.6, yy); vWorld = wp; vKind = iKind;
          gl_Position = uVP * vec4(wp, 1.0);
        }`, `
        varying vec2 vLocal; varying vec3 vWorld; varying float vFade; varying float vKind;
        void main() {
          float x = vLocal.x, y = vLocal.y;
          float a = exp(-x * x * 1.6) * smoothstep(1.0, 0.86, y) * smoothstep(0.0, 0.1, y) * vFade;
          if (a < 0.004) discard;
          // brightest through the body, the legs lost to motion, like a long exposure of a walker
          vec3 tint = vKind < 0.5 ? vec3(0.74, 0.79, 0.88) * (0.1 + 0.42 * smoothstep(0.12, 0.8, y)) : vec3(0.42, 0.62, 1.0) * (0.75 + 1.5 * pow(0.5 + 0.5 * sin(uBeat), 8.0));
          vec3 col = tint * a + projected(vWorld, vec3(0.0)) * a * 1.1;
          col *= exp(-distance(uCam, vWorld) * uFog);
          gl_FragColor = vec4(col, 1.0);
        }`, ADD);
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 2; scene.add(m);
    }

    // ── Product Design: translucent printed sheets, layered like an installation, some of
    // them locked inside tracking boxes ──────────────────────────────────────────────────
    {
      const list = [];
      for (let dist = BOUND[1] - 20; dist < BOUND[2] + 20; dist += 7) {
        const F = frameAt(dist);
        for (const side of [-1, 1]) {
          if (rand() < 0.25) continue;
          const lat = side * (9 + rand() * 12), stack = 1 + Math.floor(rand() * 3);
          const ang = side * (0.5 + rand() * 0.6);   // turned toward the oncoming road
          const axis = F.right.clone().multiplyScalar(Math.cos(ang)).addScaledVector(F.tan, Math.sin(ang)).normalize();
          const w = 3.2 + rand() * 2.4, h = w * (1.3 + rand() * 0.3);
          for (let k = 0; k < stack; k++) {
            const c = place(F, lat, GROUND + h / 2 + 0.3, -k * 1.4);
            list.push({ iCenter: v3(c), iAxis: v3(axis), iSize: [w, h], iSeed: rand(), iFrame: rand() < 0.3 ? 1 : 0 });
          }
        }
      }
      const g = instanced(quadGeo(list.length, true), { iCenter: 3, iAxis: 3, iSize: 2, iSeed: 1, iFrame: 1 }, list);
      const mat = shader(`
        attribute vec2 corner; attribute vec3 iCenter; attribute vec3 iAxis; attribute vec2 iSize; attribute float iSeed; attribute float iFrame;
        uniform mat4 uVP;
        varying vec2 vP; varying vec3 vWorld; varying vec3 vN; varying float vSeed; varying float vFrame; varying vec2 vSize;
        void main() {
          vec3 wp = iCenter + iAxis * corner.x * iSize.x * 0.5 + vec3(0.0, corner.y * iSize.y * 0.5, 0.0);
          vP = corner * 0.5 + 0.5; vWorld = wp; vN = normalize(cross(iAxis, vec3(0.0, 1.0, 0.0))); vSeed = iSeed; vFrame = iFrame; vSize = iSize;
          gl_Position = uVP * vec4(wp, 1.0);
        }`, `
        varying vec2 vP; varying vec3 vWorld; varying vec3 vN; varying float vSeed; varying float vFrame; varying vec2 vSize;
        void main() {
          vec2 p = vP;
          vec2 g = abs(fract(p * vec2(5.0, 7.0)) - 0.5);
          float grid = smoothstep(0.46, 0.5, max(g.x, g.y));
          // a red print, halftoned, somewhere on the sheet
          vec2 r0 = vec2(0.12 + 0.4 * hash1(vSeed * 7.0), 0.1 + 0.45 * hash1(vSeed * 13.0));
          vec2 r1 = r0 + vec2(0.25 + 0.3 * hash1(vSeed * 3.0), 0.2 + 0.35 * hash1(vSeed * 5.0));
          float inR = step(r0.x, p.x) * step(p.x, r1.x) * step(r0.y, p.y) * step(p.y, r1.y);
          float dots = smoothstep(0.34, 0.2, length(fract(p * vec2(34.0, 34.0 * vSize.y / vSize.x)) - 0.5));
          float speck = step(0.12, hash2(floor(p * vec2(220.0, 300.0)) + vSeed));
          float ex = min(p.x, 1.0 - p.x) * vSize.x, ey = min(p.y, 1.0 - p.y) * vSize.y;
          float rim = smoothstep(0.05, 0.0, min(ex, ey));
          float box = vFrame * smoothstep(0.045, 0.0, abs(min(ex, ey) - 0.32));
          vec3 col = vec3(0.92, 0.92, 0.95) * (0.03 + grid * 0.05 + rim * 0.12) * speck;
          col += vec3(1.0, 0.2, 0.26) * inR * dots * 0.32 * speck;
          col += vec3(0.95, 0.96, 1.0) * box * 0.85;
          col += projected(vWorld, vN) * 0.95 * speck;
          col *= exp(-distance(uCam, vWorld) * uFog);
          gl_FragColor = vec4(col, 1.0);
        }`, Object.assign({}, ADD, { side: THREE.DoubleSide }));
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 2; scene.add(m);
    }

    // ── Interaction & Motion: ribbons of light swung through the street, long exposure ────
    {
      const pos = [], uv = [], col = [], ph = [], idx = [];
      const PAL = [0x58e6d2, 0xffb15e, 0xff3b5c, 0x3b7bff, 0x58e6d2, 0xffd9a0, 0xff5a9a, 0x7ad8ff];
      const d0 = BOUND[2] - 30, d1 = BOUND[3] + 30;
      PAL.forEach((hex, r) => {
        const pts = [], a = rand() * 6.28, b = rand() * 6.28, side = r % 2 ? 1 : -1, k1 = 0.03 + rand() * 0.035, k2 = 0.025 + rand() * 0.04;
        for (let dist = d0; dist <= d1; dist += 9) {
          const F = frameAt(dist);
          // loops of light beside the road and arcing overhead, never across the lens
          const over = Math.max(0, Math.sin(dist * k2 + b));
          const lat = side * (6.5 + 8 * (0.5 + 0.5 * Math.sin(dist * k1 + a))) * (1 - 0.55 * over * over);
          pts.push(place(F, lat, GROUND + 1.2 + 3.5 * (0.5 + 0.5 * Math.sin(dist * k1 * 1.7 + b)) + 7 * over * over));
        }
        const cv = new THREE.CatmullRomCurve3(pts), N = 1400, w = 0.05 + rand() * 0.11, c = rgb(hex, 1.2), phase = rand() * 6.28, L = cv.getLength();
        const base = pos.length / 3;
        for (let j = 0; j <= N; j++) {
          const tt = j / N, p = cv.getPointAt(tt), tan = cv.getTangentAt(tt);
          const sideV = new THREE.Vector3().crossVectors(tan, UP).normalize().applyAxisAngle(tan, Math.sin(tt * 20 + phase) * 1.2);
          [-1, 1].forEach((sg) => { const v = p.clone().addScaledVector(sideV, sg * w); pos.push(v.x, v.y, v.z); uv.push(tt * L, sg); col.push(c[0], c[1], c[2]); ph.push(phase); });
          if (j < N) { const q = base + j * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1)); g.setIndex(idx);
      const mat = shader(`
        attribute vec3 aCol; attribute float aPhase;
        varying vec2 vR; varying vec3 vCol; varying float vPh; varying vec3 vWorld;
        void main() { vR = uv; vCol = aCol; vPh = aPhase; vWorld = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`, `
        varying vec2 vR; varying vec3 vCol; varying float vPh; varying vec3 vWorld;
        void main() {
          float across = exp(-vR.y * vR.y * 3.0);
          float pulse = 0.22 + 1.5 * pow(0.5 + 0.5 * sin(vR.x * 0.09 - uTime * 4.0 + vPh), 10.0);
          vec3 c = vCol * across * pulse * exp(-distance(uCam, vWorld) * uFog);
          gl_FragColor = vec4(c, 1.0);
        }`, Object.assign({}, ADD, { side: THREE.DoubleSide }));
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 2; scene.add(m);
    }

    // ── Code: data towers whose lit columns get pixel-sorted in the post pass ────────────
    {
      const list = [];
      for (let dist = BOUND[3] - 20; dist < BOUND[4] + 30; dist += 8.5) {
        const F = frameAt(dist);
        for (const side of [-1, 1]) {
          if (rand() < 0.2) continue;
          const off = 12 + rand() * 34, w = 6 + rand() * 9, dp = 6 + rand() * 9, h = 18 + rand() * 72;
          list.push({ F, side, off, w, dp, h, seed: rand() });
        }
      }
      const g = new THREE.BoxGeometry(1, 1, 1);
      g.setAttribute('iSize', new THREE.InstancedBufferAttribute(new Float32Array(list.flatMap((b) => [b.dp, b.h, b.w])), 3));
      g.setAttribute('iSeed', new THREE.InstancedBufferAttribute(new Float32Array(list.map((b) => b.seed)), 1));
      const mat = shader(`
        attribute vec3 iSize; attribute float iSeed;
        varying vec3 vL; varying vec3 vN; varying vec3 vWN; varying vec3 vWorld; varying vec3 vSize; varying float vSeed;
        void main() {
          vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vL = position; vN = normal; vWN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vWorld = wp.xyz; vSize = iSize; vSeed = iSeed;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`, `
        varying vec3 vL; varying vec3 vN; varying vec3 vWN; varying vec3 vWorld; varying vec3 vSize; varying float vSeed;
        void main() {
          vec3 n = abs(vN), col = vec3(0.007, 0.006, 0.012);
          if (n.y < 0.5) {
            float across = n.x > 0.5 ? (vL.z + 0.5) * vSize.z : (vL.x + 0.5) * vSize.x;
            float up = (vL.y + 0.5) * vSize.y;
            float c = floor(across / 0.7);
            float on = step(0.48, hash1(c * 1.7 + vSeed * 31.0));
            float stripe = smoothstep(0.5, 0.3, abs(fract(across / 0.7) - 0.5));
            float row = floor(up / 0.85);
            float blink = step(0.3, hash1(c * 3.1 + row * 7.7 + floor(uTime * 5.0 + hash1(c + vSeed) * 50.0)));
            float run = smoothstep(0.0, 1.0, fract(up / 16.0 + uTime * (0.15 + 0.5 * hash1(c * 0.7 + vSeed))));
            vec3 tint = mix(vec3(1.0, 0.24, 0.84), vec3(0.24, 0.9, 1.0), step(0.5, hash1(c * 0.37 + vSeed * 9.0)));
            col += tint * on * stripe * (0.2 + 0.8 * blink) * (0.3 + 0.7 * run) * 0.75;
            col += vec3(0.7, 0.95, 1.0) * smoothstep(0.6, 0.0, vSize.y - up) * 0.5;
          }
          col += projected(vWorld, normalize(vWN)) * 0.55;
          col = mix(uFogCol, col, exp(-distance(uCam, vWorld) * uFog));
          gl_FragColor = vec4(col, 1.0);
        }`);
      const m = new THREE.InstancedMesh(g, mat, list.length);
      const o = new THREE.Object3D();
      list.forEach((b, i) => {
        const base = place(b.F, b.side * (b.off + b.dp / 2), GROUND);
        o.position.copy(base).addScaledVector(UP, b.h / 2);
        o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
        o.lookAt(o.position.clone().add(new THREE.Vector3(b.F.tan.x, 0, b.F.tan.z).normalize()));
        o.scale.set(b.dp, b.h, b.w); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      });
      m.frustumCulled = false; m.renderOrder = 1; scene.add(m);
    }

    // ── Small lights along the road: reflectors, street lamps, the show's arches, traffic ──
    const points = [];
    const REFL = [[0xdfe6f5, 0xb8c4dc], [0xffe8e0, 0xff4a5a], [0x58e6d2, 0xffb15e], [0xff4fd8, 0x45e2ff], [0x9fc2ff, 0xc4b0ff]];
    for (let dist = 0; dist < PL; dist += 3.2) {
      const F = frameAt(dist), pal = REFL[F.stage];
      points.push({ p: v3(place(F, -7.1, GROUND + 0.08)), c: rgb(pal[1], 0.55), size: 0.06, stage: F.stage });
      points.push({ p: v3(place(F, 7.1, GROUND + 0.08)), c: rgb(pal[0], 0.5), size: 0.06, stage: F.stage });
    }
    for (let dist = 8; dist < PL; dist += 16) {
      const F = frameAt(dist), hex = [0xf0f4ff, 0xfff1e6, 0xd8fff7, 0xffd8f6, 0xdfe6ff][F.stage];
      points.push({ p: v3(place(F, -9.6, GROUND + 7.4)), c: rgb(hex, 1.3), size: 0.2, stage: F.stage });
      points.push({ p: v3(place(F, 9.6, GROUND + 7.4)), c: rgb(hex, 1.3), size: 0.2, stage: F.stage });
    }
    for (let dist = BOUND[4] - 20; dist < PL; dist += 6) {
      const F = frameAt(dist), n = 30, R = 11;
      const pal = [0xc4b0ff, 0x72adff, 0xff4d9a, 0xe8eeff];
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * i / n;
        points.push({ p: v3(place(F, Math.cos(a) * R, GROUND + Math.sin(a) * R * 0.95)), c: rgb(pal[(i + Math.round(dist / 6)) % 4], 0.7), size: 0.13, phase: dist * 0.12, pulse: 1, stage: 4 });
      }
    }
    scene.add(pointGroup(points, false));
    const cars = [];
    for (let i = 0; i < 60; i++) { const on = i % 2 === 0; cars.push({ d: BOUND[3] + rand() * (PL - BOUND[3]), speed: (on ? -1 : 1) * (55 + rand() * 40), lane: on ? -5.4 : 5.4, on }); }
    const carMesh = pointGroup(cars.flatMap((c) => [0, 1].map(() => ({ p: [0, 0, 0], c: c.on ? rgb(0xeaf3ff, 1.1) : rgb(0xff3358, 0.8), size: c.on ? 0.15 : 0.11, stage: 3 }))), true);
    scene.add(carMesh);
    const cPos = carMesh.geometry.getAttribute('iPos'), cVel = carMesh.geometry.getAttribute('iVel'), cMeta = carMesh.geometry.getAttribute('iMeta');
    function updateCars(dt) {
      cars.forEach((car, i) => {
        car.d += car.speed * dt;
        if (car.d < BOUND[3]) car.d = PL - 1;
        if (car.d > PL - 1) car.d = BOUND[3];
        const F = frameAt(car.d);
        for (let j = 0; j < 2; j++) {
          const p = place(F, car.lane + (j ? 0.75 : -0.75), GROUND + 0.7);
          cPos.setXYZ(i * 2 + j, p.x, p.y, p.z); cVel.setXYZ(i * 2 + j, F.tan.x * car.speed, F.tan.y * car.speed, F.tan.z * car.speed); cMeta.setW(i * 2 + j, F.stage);
        }
      });
      cPos.needsUpdate = cVel.needsUpdate = cMeta.needsUpdate = true;
    }

    // ── Entry: the title's letters turn to light, the full stop flies ───────────────────
    const overlay = new THREE.Scene();   // the flicked pixel: drawn over the finished frame, never masked
    let letterMesh = null, letterBase = [], letterDrift = [], letterScreen = [], pixelMesh = null, flight = null;
    let stopRest = null, DATUM = null, revC = { x: 0, y: 0 }, entryOff = { x: 0, y: 0 };
    const startCam = new THREE.PerspectiveCamera(56, 1, 0.1, 2400);
    function placeStart(cam) {
      const p0 = path.getPointAt(0), p1 = path.getPointAt(0.012);
      cam.position.copy(p0).add(new THREE.Vector3(0, 1.9, 0)); p1.y += 1.5; cam.lookAt(p1); cam.updateMatrixWorld();
    }
    // Stage pixels (relative to the canvas) to a point `depth` metres in front of the start.
    function screenToWorld(x, y, depth) {
      const ndc = new THREE.Vector3((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(startCam);
      return startCam.position.clone().add(ndc.sub(startCam.position).normalize().multiplyScalar(depth));
    }
    function buildEntry() {
      if (letterMesh) { scene.remove(letterMesh); letterMesh.geometry.dispose(); letterMesh = null; }
      startCam.aspect = W / H; startCam.updateProjectionMatrix(); placeStart(startCam);
      const base = canvas.getBoundingClientRect(), titleEl = opts.title, stopEl = opts.stop;
      if (opts.entry) { const er = opts.entry.getBoundingClientRect(); entryOff = { x: er.left - base.left, y: er.top - base.top }; }
      DATUM = screenToWorld(W * 0.5, H * 0.44, 110);
      const dn = DATUM.clone().project(startCam);
      revC = { x: (dn.x * 0.5 + 0.5) * W, y: (-dn.y * 0.5 + 0.5) * H };
      flight = null;
      if (!pixelMesh) { pixelMesh = pointGroup([{ p: [0, 0, 0], c: rgb(0xf3f6ff, 2.4), size: 0.0001, stage: 0 }], true, pixelMat); overlay.add(pixelMesh); }
      if (!titleEl || !titleEl.firstChild) return;
      const r = titleEl.getBoundingClientRect(), cs = getComputedStyle(titleEl);
      if (r.width < 1 || r.height < 1) return;
      const rl = r.left - base.left, rt = r.top - base.top;
      const cv = document.createElement('canvas'); cv.width = Math.ceil(r.width); cv.height = Math.ceil(r.height);
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; cx.fillStyle = LIGHT; cx.textBaseline = 'alphabetic';
      // each word exactly where the page set it
      const node = titleEl.firstChild, range = document.createRange(), words = node.textContent.split(' ');
      let idx = 0;
      words.forEach((wd) => {
        range.setStart(node, idx); range.setEnd(node, idx + wd.length); idx += wd.length + 1;
        const wr = range.getBoundingClientRect();
        cx.fillText(wd, wr.left - r.left, wr.bottom - r.top - parseFloat(cs.fontSize) * 0.24);
      });
      const data = cx.getImageData(0, 0, cv.width, cv.height).data, step = Math.max(3, Math.round(parseFloat(cs.fontSize) / 22));
      const list = []; letterBase = []; letterDrift = []; letterScreen = [];
      for (let y = 0; y < cv.height; y += step) for (let x = 0; x < cv.width; x += step) {
        if (data[(y * cv.width + x) * 4 + 3] < 128) continue;
        const wp = screenToWorld(rl + x, rt + y, 26);
        list.push({ p: [wp.x, wp.y, wp.z], c: rgb(rand() < 0.2 ? 0xf4f7ff : 0xc9dbff, 0.9), size: 0.035, stage: 0 });
        letterBase.push(wp); letterScreen.push([rl + x, rt + y]);
        letterDrift.push(new THREE.Vector3((rand() - 0.5) * 30, (rand() - 0.3) * 18, -rand() * 120 - 20));
      }
      if (list.length) { letterMesh = pointGroup(list, true); scene.add(letterMesh); }
      if (stopEl) {
        const sRange = document.createRange(); sRange.selectNodeContents(stopEl);
        const srr = sRange.getBoundingClientRect(), fs = parseFloat(cs.fontSize), mt = cx.measureText('.');
        const baseY = srr.bottom - base.top - fs * 0.24, sl = srr.left - base.left;
        const dl = sl - mt.actualBoundingBoxLeft, dr = sl + mt.actualBoundingBoxRight;
        const dtp = baseY - mt.actualBoundingBoxAscent, dbt = baseY + mt.actualBoundingBoxDescent;
        stopRest = { x: (dl + dr) / 2, y: (dtp + dbt) / 2, size: Math.max(4, Math.min(dr - dl, dbt - dtp)) };
      }
    }

    // ── Sky ──
    const skyMat = new THREE.ShaderMaterial({
      uniforms: { uGlow: { value: new THREE.Color(LOOK[0].sky) }, uHy: { value: 0.5 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 uGlow; uniform float uHy;
        void main(){ float y = vUv.y; vec3 col = mix(uGlow * 0.42, vec3(0.008,0.01,0.026), smoothstep(uHy - 0.02, uHy + 0.5, y));
          col += uGlow * exp(-pow((y - uHy) / 0.05, 2.0)) * 0.45; col *= mix(0.25, 1.0, smoothstep(uHy - 0.35, uHy, y)); gl_FragColor = vec4(col, 1.0); }`,
      depthTest: false, depthWrite: false,
    });
    const skyScene = new THREE.Scene(); skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat));
    const fsCam = new THREE.Camera();

    // ── Film: long exposure, bloom with halation, colour fringe, grain; per stage, a
    // photocopy at Product Design and pixel sorting with datamosh tears at Code ────────────
    const fsVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    const fs = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); fs.frustumCulled = false;
    const fsScene = new THREE.Scene(); fsScene.add(fs);
    let rtScene = null, accA = null, accB = null, blA = null, blB = null;
    const vr = opts.voidRgb || [5, 7, 16];
    const P = {
      uTex: { value: null }, uPrev: { value: null }, uDecay: { value: 0.5 }, uTexel: { value: new THREE.Vector2() },
      uAcc: { value: null }, uBloom: { value: null }, uRes: { value: new THREE.Vector2() }, uTime: U.uTime,
      uBeatN: { value: 0 }, uSpeed: { value: 0 }, uW: { value: [1, 0, 0, 0, 0] }, uRev: { value: new THREE.Vector3(0, 0, 1e6) }, uDir: { value: new THREE.Vector2() },
      uVoid: { value: new THREE.Vector3(vr[0] / 255, vr[1] / 255, vr[2] / 255) },
    };
    const pass = (fsrc) => new THREE.ShaderMaterial({ vertexShader: fsVert, fragmentShader: fsrc, uniforms: P, depthTest: false, depthWrite: false });
    const accMat = pass(`varying vec2 vUv; uniform sampler2D uTex; uniform sampler2D uPrev; uniform float uDecay;
      void main(){ vec3 a = texture2D(uTex, vUv).rgb, b = texture2D(uPrev, vUv).rgb * uDecay; gl_FragColor = vec4(max(a, b), 1.0); }`);
    const brightMat = pass(`varying vec2 vUv; uniform sampler2D uTex; uniform vec2 uTexel;
      void main(){ vec3 c = vec3(0.0);
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) c += texture2D(uTex, vUv + vec2(float(x), float(y)) * uTexel * 1.5).rgb;
        c /= 9.0; gl_FragColor = vec4(max(c - 0.72, 0.0) * 1.25, 1.0); }`);
    const blurMat = pass(`varying vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir;
      void main(){ vec3 c = texture2D(uTex, vUv).rgb * 0.2;
        c += (texture2D(uTex, vUv + uDir * 1.4).rgb + texture2D(uTex, vUv - uDir * 1.4).rgb) * 0.18;
        c += (texture2D(uTex, vUv + uDir * 3.3).rgb + texture2D(uTex, vUv - uDir * 3.3).rgb) * 0.12;
        c += (texture2D(uTex, vUv + uDir * 5.4).rgb + texture2D(uTex, vUv - uDir * 5.4).rgb) * 0.07;
        c += (texture2D(uTex, vUv + uDir * 7.6).rgb + texture2D(uTex, vUv - uDir * 7.6).rgb) * 0.03;
        gl_FragColor = vec4(c, 1.0); }`);
    const compMat = pass(`varying vec2 vUv;
      uniform sampler2D uAcc; uniform sampler2D uBloom; uniform vec2 uRes; uniform float uTime; uniform float uBeatN; uniform float uSpeed; uniform float uW[5]; uniform vec3 uRev; uniform vec3 uVoid;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
      void main() {
        vec2 uv = vUv; float w1 = uW[1], w3 = uW[3], w4 = uW[4];
        float bi = floor(uBeatN), bf = fract(uBeatN);
        if (w3 > 0.01) {   // datamosh: rows tear sideways and blocks slip on the beat
          float band = floor(uv.y * 46.0);
          float moving = smoothstep(0.04, 0.3, uSpeed);
          uv.x += step(0.92, hash(vec2(band, bi))) * step(bf, 0.2) * (hash(vec2(band, bi + 7.0)) - 0.5) * 0.09 * w3 * (0.25 + 0.75 * moving);
          vec2 blk = floor(uv * vec2(22.0, 13.0));
          uv += step(0.972, hash(blk + bi * 3.1)) * step(bf, 0.32) * (vec2(hash(blk + 1.3), hash(blk + 2.7)) - 0.5) * 0.07 * w3 * moving;
        }
        vec2 cd = uv - 0.5; float ca = 0.0012 + 0.0055 * uSpeed + 0.0035 * w4 + 0.0015 * w3;
        vec3 col = vec3(texture2D(uAcc, uv + cd * ca).r, texture2D(uAcc, uv).g, texture2D(uAcc, uv - cd * ca).b);
        if (w3 > 0.01) {   // pixel sorting: bright pixels drip down their column
          float colId = floor(uv.x * uRes.x / 2.0);
          float live = step(0.56, hash(vec2(colId, floor(uTime * 2.5))));
          vec3 drip = vec3(0.0);
          for (int k = 1; k <= 26; k++) {
            vec3 s = texture2D(uAcc, uv + vec2(0.0, float(k) * 5.0 / uRes.y)).rgb;
            drip = max(drip, s * smoothstep(0.6, 1.0, lum(s)) * (1.0 - float(k) / 27.0));
          }
          col = max(col, drip * live * w3 * (0.4 + 0.6 * smoothstep(0.04, 0.3, uSpeed)));
        }
        vec3 bl = texture2D(uBloom, uv).rgb;
        col += bl * vec3(1.0, 0.66, 0.56) * 0.9 + bl * vec3(0.3, 0.06, 0.03) * 0.8;   // bloom, and red halation like film
        if (w1 > 0.01) {   // photocopy: toner speckle, a little posterising, red out of register
          float sp = hash(floor(uv * uRes / 2.0) + floor(uTime * 12.0));
          col = mix(col, floor(col * 5.0 + 0.5) / 5.0, 0.3 * w1);
          col *= 1.0 - step(0.968, sp) * 0.55 * w1;
          col.r = mix(col.r, texture2D(uAcc, uv + vec2(2.5, 1.5) / uRes).r, 0.6 * w1);
        }
        float l = lum(col);
        col += (hash(uv * uRes + fract(uTime * 7.3) * 91.0) - 0.5) * (0.035 + 0.06 * (1.0 - smoothstep(0.0, 0.5, l)));
        col *= mix(0.5, 1.0, smoothstep(1.2, 0.3, length(cd * vec2(uRes.x / uRes.y, 1.0))));
        // the reveal: outside the circle it is still the page
        float dr = distance(gl_FragCoord.xy, uRev.xy);
        col = mix(uVoid, col, 1.0 - smoothstep(uRev.z - 1.0, uRev.z + 1.0, dr));
        if (uRev.z > 0.5 && uRev.z < 1e5) col += vec3(0.62, 0.78, 1.0) * (0.32 * exp(-pow((dr - uRev.z) / 1.2, 2.0)) + 0.05 * exp(-pow((dr - uRev.z) / 14.0, 2.0)));
        gl_FragColor = vec4(max(col, 0.0), 1.0);
      }`);
    function makeTargets() {
      const v = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(1, v.x), h = Math.max(1, v.y);
      const samples = renderer.capabilities.isWebGL2 && level < 1 ? 4 : 0;
      // Font readiness and the first ResizeObserver delivery repeat the initial size.
      // Keep the GPU buffers and exposure history until size or quality actually changes.
      if (rtScene && rtScene.width === w && rtScene.height === h && rtScene.samples === samples) return;
      [rtScene, accA, accB, blA, blB].forEach((x) => x && x.dispose());
      const opt = { type: HDR, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
      rtScene = new THREE.WebGLRenderTarget(w, h, Object.assign({}, opt, { depthBuffer: true, samples }));
      accA = new THREE.WebGLRenderTarget(w, h, opt); accB = new THREE.WebGLRenderTarget(w, h, opt);
      blA = new THREE.WebGLRenderTarget(Math.max(1, w >> 2), Math.max(1, h >> 2), opt); blB = new THREE.WebGLRenderTarget(Math.max(1, w >> 2), Math.max(1, h >> 2), opt);
      P.uRes.value.set(w, h);
      accRead = null;
    }
    function runPass(mat, target) { fs.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }

    // ── The flicked pixel ──────────────────────────────────────────────────────────────
    // On the creature's blade it is a lit DOM square; struck, it becomes a point of light in
    // the world that flies to its landing point, where the drive begins.
    const tip = (i) => cr.data.tip_path[Math.max(0, Math.min(t.ACT, i))];
    function buildFlight() {
      const c = cr.data.contact, at = cr.spriteToStage(c.point[0], c.point[1]);
      const P0 = screenToWorld(at.x, at.y, 26);
      const J = screenToWorld(at.x + c.direction[0], at.y + c.direction[1], 26).sub(P0);
      const lat = J.multiplyScalar(c.suggested_launch_speed_px_per_frame * at.k);
      const fw = new THREE.Vector3(); startCam.getWorldDirection(fw);
      const v0 = lat.clone().addScaledVector(fw, lat.length() * 0.9);
      const z = -P0.clone().applyMatrix4(startCam.matrixWorldInverse).z;
      return { P0, P1: P0.clone().addScaledVector(v0, t.FLY / 6), P2: DATUM.clone().addScaledVector(UP, 4), P3: DATUM.clone(), size: 0.735 * 3 * at.k * DPR * z / U.uPx.value };
    }
    function bez(F, tt, out) { const u = 1 - tt; return out.set(0, 0, 0).addScaledVector(F.P0, u * u * u).addScaledVector(F.P1, 3 * u * u * tt).addScaledVector(F.P2, 3 * u * tt * tt).addScaledVector(F.P3, tt * tt * tt); }
    const pWorld = new THREE.Vector3(), pPrev = new THREE.Vector3(), pVel = new THREE.Vector3();
    let pHas = false;
    function setPixel3D(p, size, dt, from) {
      const a = pixelMesh.geometry.getAttribute('iPos'), v = pixelMesh.geometry.getAttribute('iVel'), m = pixelMesh.geometry.getAttribute('iMeta');
      if (pHas && dt > 0) pVel.copy(p).sub(pPrev).divideScalar(dt); else pVel.set(0, 0, 0);
      if (from) { const run = pVel.length() * U.uExp.value, back = p.distanceTo(from); if (run > back && run > 0) pVel.multiplyScalar(back / run); }
      a.setXYZ(0, p.x, p.y, p.z); v.setXYZ(0, pVel.x, pVel.y, pVel.z); m.setX(0, size);
      a.needsUpdate = v.needsUpdate = m.needsUpdate = true;
      pPrev.copy(p); pHas = size > 0.001;
    }
    function movePixel(f, dt) {
      const pixelEl = opts.pixel, stopEl = opts.stop;
      if (!pixelMesh) return;
      if (!cr || !stopRest) { setPixel3D(pWorld, 0.0001, dt); return; }
      if (stopEl) stopEl.style.opacity = f < 4 ? '' : '0';
      if (f > t.CONTACT) {
        if (!flight) flight = buildFlight();
        const tau = clamp01((f - t.CONTACT) / t.FLY), tt = 1 - (1 - tau) * (1 - tau);
        if (pixelEl) pixelEl.style.opacity = '0';
        const caught = cr.caught(performance.now());   // he has it
        setPixel3D(bez(flight, tt, pWorld), flight.size * (1 + 1.4 * Math.exp(-(f - t.CONTACT) * 0.9)) * (1 + 2.4 * caught), dt, flight.P0);
        return;
      }
      flight = null;
      setPixel3D(pWorld, 0.0001, dt);
      if (!pixelEl) return;
      if (f < 4) { pixelEl.style.opacity = '0'; return; }
      const k = cr.spriteToStage(0, 0).k, grid = 3 * k, S = stopRest;
      const hang = { x: S.x + 6, y: S.y + 10 }, t46 = tip(46);
      let x, y, size = S.size, lit = 1;
      if (f < 27) {
        const u = ease(clamp01((f - 4) / 23));
        x = S.x + (hang.x - S.x) * u; y = S.y + (hang.y - S.y) * u + Math.sin(f * 0.5) * 1.5 * u;
        lit = ease(clamp01((f - 4) / 6));
      } else if (f < 46) {
        const u = ease((f - 27) / 19), e = cr.spriteToStage(t46[0], t46[1]);
        const lift = Math.max(40, Math.hypot(e.x - hang.x, e.y - hang.y) * 0.14);
        x = hang.x + (e.x - hang.x) * u; y = hang.y + (e.y - hang.y) * u - Math.sin(Math.PI * u) * lift;
        size = S.size + (grid - S.size) * u;
      } else {
        const fr = Math.round(f), u = ease((fr - 46) / 9), tp = tip(fr);
        const p = cr.spriteToStage(Math.round(t46[0] + (tp[0] - t46[0]) * u), Math.round(t46[1] + (tp[1] - t46[1]) * u));
        x = p.x; y = p.y; size = grid;
      }
      pixelEl.style.opacity = '1';
      pixelEl.style.boxShadow = '0 0 ' + (8 * lit).toFixed(1) + 'px ' + lit.toFixed(2) + 'px rgba(160,200,255,' + (0.7 * lit).toFixed(2) + ')';
      pixelEl.style.width = pixelEl.style.height = size.toFixed(2) + 'px';
      pixelEl.style.transform = 'translate(' + (x - size / 2).toFixed(1) + 'px,' + (y - size / 2).toFixed(1) + 'px)';
    }
    // The leap: his centre travels toward where the pixel is now, as the live camera sees it.
    const dn2 = new THREE.Vector3();
    function leapCreature(s, e) {
      dn2.copy(DATUM).project(camera);
      cr.leap(e, s, t, { x: (dn2.x * 0.5 + 0.5) * W, y: (-dn2.y * 0.5 + 0.5) * H });
    }
    // The reveal hides the page header where the circle has passed (the letters carry on as light).
    let maskState = '';
    function maskEntry(rv, R) {
      const en = opts.entry;
      if (!en) return;
      if (rv >= 1) {
        if (maskState !== 'gone') { en.style.maskImage = en.style.webkitMaskImage = ''; en.style.opacity = '0'; maskState = 'gone'; }
        return;
      }
      if (rv <= 0) {
        if (maskState !== 'none') { en.style.maskImage = en.style.webkitMaskImage = ''; en.style.opacity = ''; maskState = 'none'; }
        return;
      }
      if (maskState !== 'on') { en.style.opacity = ''; maskState = 'on'; }
      const m = 'radial-gradient(circle at ' + (revC.x - entryOff.x).toFixed(1) + 'px ' + (revC.y - entryOff.y).toFixed(1) + 'px, transparent ' + R.toFixed(1) + 'px, black ' + (R + 1.5).toFixed(1) + 'px)';
      en.style.maskImage = en.style.webkitMaskImage = m;
    }

    // ── Frame ──────────────────────────────────────────────────────────────────────────
    let progress = 0, prevPos = null, speed = 0, roll = 0, accRead = null, accWrite = null;
    const hist = [], glow = new THREE.Color(LOOK[0].sky), glowTo = new THREE.Color(), fogTo = new THREE.Color(), lineTo = new THREE.Color();
    const pos = new THREE.Vector3(), look = new THREE.Vector3(), fwd = new THREE.Vector3(), hz = new THREE.Vector3(), flat = new THREE.Vector3();
    const info = { s: 0, speed: 0, stage: 0, rv: 0, R: 0, f: 0, e: 0, level: 0, revC: revC, frames: 0 };
    // Quality steps down when frames run long: first the scene's antialiasing, then half the
    // film's resolution. window.__ndKeepQuality turns this off for headless checks.
    let avgMs = 16, slowFor = 0;
    function stepDown(dt) {
      if (level >= 2 || dt <= 0 || window.__ndKeepQuality) return;
      avgMs = avgMs * 0.9 + dt * 1000 * 0.1;
      slowFor = avgMs > 24 ? slowFor + dt : 0;
      if (slowFor > 2) { level++; slowFor = 0; avgMs = 16; if (level >= 2) resize(); else makeTargets(); }
    }
    function frame(now, dt) {
      stepDown(dt);
      const s = clamp01(progress);
      const u = camU(s);
      path.getPointAt(u, pos); path.getPointAt(Math.min(0.999, u + 0.012), look);
      pos.y += 1.9; look.y += 1.5;
      const vel = prevPos ? pos.distanceTo(prevPos) / Math.max(dt, 1e-3) : 0;
      prevPos = (prevPos || new THREE.Vector3()).copy(pos);
      speed += (Math.min(1, vel / 340) - speed) * (1 - Math.exp(-dt * 8));
      const t1 = path.getTangentAt(u), t2 = path.getTangentAt(Math.min(0.999, u + 0.01));
      const drive = ease(clamp01((s - t.eDrive) / 0.02));
      // banks into curves only when moving, so every stop is level and its words read straight
      roll += (THREE.MathUtils.clamp((t1.x * t2.z - t1.z * t2.x) * 900 * speed, -0.45, 0.45) * drive - roll) * (1 - Math.exp(-dt * 3));
      const crest = Math.exp(-Math.pow((u - CREST_U) / 0.012, 2));
      camera.position.copy(pos).addScaledVector(UP, crest * 1.2);
      camera.lookAt(look); camera.rotateZ(roll);
      camera.rotateX((Math.sin(now * 0.031) + Math.sin(now * 0.017)) * speed * speed * 0.004 * drive);
      camera.fov = 56 + (26 * Math.pow(speed, 1.3) - 12 * crest) * drive; camera.updateProjectionMatrix(); camera.updateMatrixWorld();

      U.uExp.value = (0.07 + 0.11 * speed) * (1 - 0.7 * crest);
      const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      hist.push({ t: now, m: vp });
      while (hist.length > 2 && hist[1].t < now - U.uExp.value * 1000) hist.shift();
      U.uVP.value.copy(vp); U.uPrevVP.value.copy(hist[0].m);
      U.uPx.value = camera.projectionMatrix.elements[5] * 0.5 * H * DPR;
      U.uTime.value = now / 1000; U.uBeat.value = now / 1000 * Math.PI * 2 * (124 / 60) / 2; U.uCam.value.copy(camera.position);
      P.uBeatN.value = now / 1000 * (124 / 60) / 2;

      // Entry: the creature, the pixel on his blade and in the air, his leap, the toe print
      const fr = M.creatureFrames(s, t);
      if (cr) cr.draw(dt, s, t);
      movePixel(fr.f, dt);
      if (cr) { leapCreature(s, fr.e); cr.print(fr.e, s, t); }
      // the world opens like the theme toggle, from where the pixel landed
      const rs = t.revealS(W <= 768), rv = clamp01((s - t.eReveal) / rs);
      const rmax = Math.hypot(Math.max(revC.x, W - revC.x), Math.max(revC.y, H - revC.y)) + 2;
      const R = easeToggle(rv) * rmax;
      P.uRev.value.set(revC.x * DPR, (H - revC.y) * DPR, rv >= 1 ? 1e6 : R * DPR);
      maskEntry(rv, R);
      // the title's letters turn to points of light where the circle's edge passes, and drift off
      const Rv = rv < 1 ? R : rmax + (s - t.eReveal - rs) / t.rate * 600;
      if (letterMesh) {
        const a = letterMesh.geometry.getAttribute('iPos'), m = letterMesh.geometry.getAttribute('iMeta');
        for (let i = 0; i < letterBase.length; i++) {
          const b = letterBase[i], dr = letterDrift[i], sc = letterScreen[i];
          const ed = Rv - Math.hypot(sc[0] - revC.x, sc[1] - revC.y), tt = ease(clamp01(ed / 380));
          a.setXYZ(i, b.x + dr.x * tt, b.y + dr.y * tt, b.z + dr.z * tt);
          m.setX(i, rv > 0 ? 0.03 + 0.05 * tt + 0.05 * Math.exp(-Math.pow(ed / 40, 2)) : 0.0001);
        }
        a.needsUpdate = m.needsUpdate = true;
      }

      // Stage: the world's colour, the film's character, which capability is projected
      const st = M.stageAt(s), w = M.weightsAt(s, P.uW.value);
      for (let i = 0; i < 5; i++) {
        gain[i] += ((i === st ? 1.15 : 0.75) - gain[i]) * (1 - Math.exp(-dt * 2));
        U.uProjOn.value[i] = M.projectorOn(i, s, w[i], t.eDrive);
      }
      const k = 1 - Math.exp(-dt * 1.5);
      glowTo.setHex(LOOK[st].sky); glow.lerp(glowTo, k); skyMat.uniforms.uGlow.value.copy(glow);
      fogTo.setHex(LOOK[st].fog); U.uFogCol.value.lerp(fogTo, k);
      lineTo.setHex(LOOK[st].line); lineRef.value.lerp(lineTo, k);
      camera.getWorldDirection(fwd);
      hz.copy(camera.position).addScaledVector(flat.set(fwd.x, 0, fwd.z).normalize(), 1000).project(camera);
      skyMat.uniforms.uHy.value = hz.y * 0.5 + 0.5;
      updateCars(dt);
      P.uSpeed.value = speed;
      info.s = s; info.speed = speed; info.stage = st; info.rv = rv; info.R = R; info.f = fr.f; info.e = fr.e; info.level = level; info.revC = revC; info.frames++;

      // 1. the world
      renderer.setRenderTarget(rtScene); renderer.clear();
      renderer.render(skyScene, fsCam); renderer.clearDepth(); renderer.render(scene, camera);
      // 2. long exposure: light lingers in proportion to speed, longest at Interaction & Motion
      if (!accRead) { accRead = accA; accWrite = accB; }
      const tau = 0.025 + 0.11 * speed + 0.22 * w[0] + w[2] * (0.08 + 0.4 * speed) + 0.05 * w[4];
      P.uTex.value = rtScene.texture; P.uPrev.value = accRead.texture; P.uDecay.value = Math.exp(-dt / tau);
      runPass(accMat, accWrite);
      // 3. bloom, a quarter size
      P.uTex.value = accWrite.texture; P.uTexel.value.set(1 / accWrite.width, 1 / accWrite.height);
      runPass(brightMat, blA);
      P.uTex.value = blA.texture; P.uDir.value.set(1 / blA.width, 0); runPass(blurMat, blB);
      P.uTex.value = blB.texture; P.uDir.value.set(0, 1 / blA.height); runPass(blurMat, blA);
      // 4. film, to the screen, then the flicked pixel over it
      P.uAcc.value = accWrite.texture; P.uBloom.value = blA.texture;
      renderer.setRenderTarget(null); renderer.clear();
      fs.material = compMat; renderer.render(fsScene, fsCam);
      renderer.render(overlay, camera);
      const tmp = accRead; accRead = accWrite; accWrite = tmp;
    }

    // ── Size, fonts, the loop ───────────────────────────────────────────────────────────
    function resize() {
      if (disposed) return;
      W = Math.max(1, canvas.clientWidth); H = Math.max(1, canvas.clientHeight);
      DPR = dprFor();
      renderer.setPixelRatio(DPR);
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      const v = renderer.getDrawingBufferSize(new THREE.Vector2());
      U.uView.value.set(v.x, v.y);
      makeTargets(); buildEntry(); aimProjectors();
      if (cr) cr.measure(canvas.getBoundingClientRect());
    }
    let disposed = false, lost = false, raf = 0, running = false, visible = true, last = performance.now(), frameAcc = 0, paintDt = 0;
    function loop(now) {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      // A 120/144 Hz panel otherwise runs every world, exposure and bloom pass that often.
      // Keep the same scene at up to 60 fps; accumulate real time so movement never slows.
      frameAcc += dt; paintDt += dt;
      if (frameAcc + 1e-4 >= 1 / 60) {
        frame(now, paintDt); paintDt = 0;
        frameAcc = Math.max(0, frameAcc - Math.floor((frameAcc + 1e-4) * 60) / 60);
      }
      if (running) raf = requestAnimationFrame(loop);
    }
    function start() { if (running || disposed || lost) return; running = true; frameAcc = paintDt = 0; last = performance.now(); raf = requestAnimationFrame(loop); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function update() { if (visible && !canvas.closest('[inert]') && !document.hidden && !document.body.classList.contains('about-locked')) start(); else stop(); }
    const io = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; update(); }, { threshold: 0 }) : null;
    if (io) io.observe(canvas);
    document.addEventListener('visibilitychange', update);
    document.addEventListener('lucy:scene-visibility', update);
    let roTimer = 0;
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { clearTimeout(roTimer); roTimer = setTimeout(resize, 120); }) : null;
    if (ro) ro.observe(canvas);
    function onLost(e) { e.preventDefault(); lost = true; stop(); if (opts.onLost) opts.onLost(); }
    canvas.addEventListener('webglcontextlost', onLost);

    resize();
    drawAtlas();
    const fontsReady = document.fonts
      ? document.fonts.load('820 150px Anybody').then(() => Promise.all([document.fonts.load('italic 500 46px "DM Sans"'), document.fonts.load('22px "Space Mono"'), document.fonts.ready]))
      : Promise.resolve();
    fontsReady.catch(() => {}).then(() => { if (!disposed) { drawAtlas(); resize(); } });
    frame(performance.now(), 0);   // the first frame now, so the canvas never shows empty
    update();

    function dispose() {
      if (disposed) return;
      disposed = true; stop();
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      clearTimeout(roTimer);
      document.removeEventListener('visibilitychange', update);
      document.removeEventListener('lucy:scene-visibility', update);
      canvas.removeEventListener('webglcontextlost', onLost);
      [scene, overlay, skyScene, fsScene].forEach((sc) => sc.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }));
      [pointMat, pixelMat, accMat, brightMat, blurMat, compMat, skyMat].forEach((m) => m.dispose());
      atlasTex.dispose();
      [rtScene, accA, accB, blA, blB].forEach((x) => x && x.dispose());
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) { /* already gone */ }
      const en = opts.entry;
      if (en) { en.style.maskImage = en.style.webkitMaskImage = ''; en.style.opacity = ''; }
      if (opts.stop) opts.stop.style.opacity = '';
      if (opts.pixel) { const p = opts.pixel.style; p.opacity = p.transform = p.width = p.height = p.boxShadow = ''; }
      if (cr) cr.reset();
    }

    return {
      setProgress(s) { progress = s; },
      setCreature(p) { cr = p || null; if (cr) cr.measure(canvas.getBoundingClientRect()); },
      // Where stop i's projector throws its frame, as the live camera sees it: [left, top, right, bottom] in canvas px.
      // The projector stands at the stop's eye, so at the stop this is exact whatever the words land on. For the checks
      // (scripts/night-drive-check.mjs): nothing on the page may sit on the words.
      words(i) {
        const pc = projCams[i == null ? M.stageAt(clamp01(progress)) : i], v = new THREE.Vector3(), b = [Infinity, Infinity, -Infinity, -Infinity];
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([nx, ny]) => {
          v.set(nx, ny, 0.5).unproject(pc).sub(pc.position).normalize().multiplyScalar(40).add(pc.position).project(camera);
          const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
          b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
        });
        return b;
      },
      resize,
      dispose,
      info,
    };
  }

  window.NightDrive = { supported, mount };
})();
