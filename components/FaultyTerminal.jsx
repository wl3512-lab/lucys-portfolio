/* global React, THREE */
/*
  FaultyTerminal — CRT terminal "digit rain" background.
  Adapted from React Bits (https://reactbits.dev) to this site's no-build globals
  pattern: the upstream component imports the OGL library via ESM. This page has
  no bundler and already loads three.js as a global (THREE) for LaserFlow/AsciiText,
  so the original OGL renderer is re-implemented as a THREE full-screen triangle +
  RawShaderMaterial. The fragment shader is upstream's, unchanged in spirit, with
  two edits for this site:
    - gl_FragColor alpha is the digit luminance, so the layer composites as glowing
      digits over the void (not an opaque black rectangle) — matches "glow over shadow".
    - mouse tracking listens on window (the container is pointer-events:none so it
      never blocks hero interactions).
  Honors prefers-reduced-motion / .reduce-motion: renders a single static frame.
  Exposed as window.FaultyTerminal.
*/

function ftReducedMotion() {
  try {
    return (
      document.documentElement.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch (e) {
    return false;
  }
}

function ftHexToRgb(hex) {
  let h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  const num = parseInt(h, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

const FT_VERT = `
attribute vec3 position;
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FT_FRAG = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;

uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;

float time;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;

  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545;

  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;

  mat2 modify2 = rotate(time * 0.08);
  f += amp * noise(p);

  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time);
  mat2 rot1 = rotate(0.1);

  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;

    if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;

        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }

    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);

        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
    }

    p = fract(p);
    p *= uDigitSize;

    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);

    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;

    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);

    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){

    float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
    bar *= uScanlineIntensity;

    float displacement = displace(p);
    p.x += displacement;

    if (uGlitchAmount != 1.0) {
      float extra = displacement * (uGlitchAmount - 1.0);
      p.x += extra;
    }

    float middle = digit(p);

    const float off = 0.002;
    float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));

    vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    vec2 uv = vUv;

    if(uCurvature != 0.0){
      uv = barrel(uv);
    }

    vec2 p = uv * uScale;
    vec3 col = getColor(p);

    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }

    col *= uTint;
    col *= uBrightness;

    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }

    // Alpha = luminance so the digits composite as glow over the void (see header note).
    float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
    gl_FragColor = vec4(col, a);
}
`;

function FaultyTerminal(props) {
  const p = props || {};
  const { useEffect, useRef, useMemo } = React;

  const scale = p.scale != null ? p.scale : 1;
  const gridMul = p.gridMul || [2, 1];
  const digitSize = p.digitSize != null ? p.digitSize : 1.5;
  const timeScale = p.timeScale != null ? p.timeScale : 0.3;
  const scanlineIntensity = p.scanlineIntensity != null ? p.scanlineIntensity : 0.3;
  const glitchAmount = p.glitchAmount != null ? p.glitchAmount : 1;
  const flickerAmount = p.flickerAmount != null ? p.flickerAmount : 1;
  const noiseAmp = p.noiseAmp != null ? p.noiseAmp : 0;
  const chromaticAberration = p.chromaticAberration != null ? p.chromaticAberration : 0;
  const dither = p.dither != null ? p.dither : 0;
  const curvature = p.curvature != null ? p.curvature : 0.2;
  const tint = p.tint || '#72ADFF';
  const mouseReact = p.mouseReact != null ? p.mouseReact : true;
  const mouseStrength = p.mouseStrength != null ? p.mouseStrength : 0.2;
  const brightness = p.brightness != null ? p.brightness : 1;
  const className = p.className || '';

  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const tintVec = useMemo(function () { return ftHexToRgb(tint); }, [tint]);

  useEffect(function () {
    const ctn = containerRef.current;
    if (!ctn || typeof THREE === 'undefined') return;

    const reduced = ftReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : 2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    const gl = renderer.getContext();

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      uScale: { value: scale },
      uGridMul: { value: new THREE.Vector2(gridMul[0], gridMul[1]) },
      uDigitSize: { value: digitSize },
      uScanlineIntensity: { value: scanlineIntensity },
      uGlitchAmount: { value: glitchAmount },
      uFlickerAmount: { value: flickerAmount },
      uNoiseAmp: { value: noiseAmp },
      uChromaticAberration: { value: chromaticAberration },
      uDither: { value: typeof dither === 'boolean' ? (dither ? 1 : 0) : dither },
      uCurvature: { value: curvature },
      uTint: { value: new THREE.Vector3(tintVec[0], tintVec[1], tintVec[2]) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseStrength: { value: mouseStrength },
      uUseMouse: { value: mouseReact && !reduced ? 1 : 0 },
      uPageLoadProgress: { value: reduced ? 1 : 0 },
      uUsePageLoadAnimation: { value: reduced ? 0 : 1 },
      uBrightness: { value: brightness },
    };

    const material = new THREE.RawShaderMaterial({
      vertexShader: FT_VERT,
      fragmentShader: FT_FRAG,
      uniforms: uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    ctn.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    function resize() {
      const w = ctn.offsetWidth || 1;
      const h = ctn.offsetHeight || 1;
      renderer.setSize(w, h, false);
      const cw = gl.canvas.width;
      const ch = gl.canvas.height;
      uniforms.iResolution.value.set(cw, ch, cw / Math.max(ch, 1));
    }
    const ro = new ResizeObserver(resize);
    ro.observe(ctn);
    resize();

    function onMove(e) {
      const rect = ctn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const y = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
      mouseRef.current = { x: x, y: y };
    }
    if (mouseReact && !reduced) window.addEventListener('mousemove', onMove, { passive: true });

    const timeOffset = Math.random() * 100;
    const loadStart = performance.now();
    let raf = 0;

    function frame(t) {
      raf = requestAnimationFrame(frame);
      const elapsed = (t * 0.001 + timeOffset) * timeScale;
      uniforms.iTime.value = elapsed;

      if (!reduced) {
        const progress = Math.min((t - loadStart) / 2000, 1);
        uniforms.uPageLoadProgress.value = progress;
        if (mouseReact) {
          const sm = smoothMouseRef.current;
          const m = mouseRef.current;
          sm.x += (m.x - sm.x) * 0.08;
          sm.y += (m.y - sm.y) * 0.08;
          uniforms.uMouse.value.set(sm.x, sm.y);
        }
      }
      renderer.render(scene, camera);
    }

    if (reduced) {
      // Single static frame, no animation loop.
      resize();
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return function () {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (mouseReact && !reduced) window.removeEventListener('mousemove', onMove);
      if (renderer.domElement.parentElement === ctn) ctn.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, digitSize, timeScale, scanlineIntensity, glitchAmount, flickerAmount,
      noiseAmp, chromaticAberration, dither, curvature, tintVec, mouseReact, mouseStrength, brightness]);

  return <div ref={containerRef} className={'faulty-terminal ' + className} aria-hidden="true" />;
}

window.FaultyTerminal = FaultyTerminal;
