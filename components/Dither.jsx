/* global React, THREE */
/*
  Dither — animated Perlin wave field with Bayer ordered dithering / pixelation.
  Adapted from React Bits (https://reactbits.dev), whose version needs React-Three-Fiber +
  postprocessing (can't run on this no-build site). Here the wave shader and the dither
  post-pass are FUSED into a single THREE RawShaderMaterial on a full-screen triangle, so it
  runs dependency-free against the global THREE. Output alpha = luminance, so the dithered
  waves composite over the void (dark regions stay transparent). Pauses off-screen;
  reduced-motion renders one static frame. Exposed as window.Dither.
*/
function diReduced() {
  try {
    return document.documentElement.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { return false; }
}

var DI_VERT = [
  'attribute vec3 position;',
  'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }'
].join('\n');

var DI_FRAG = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform vec3  uWaveColor;
uniform vec2  uMousePos;
uniform float uEnableMouse;
uniform float uMouseRadius;
uniform float uColorNum;
uniform float uPixelSize;

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz; vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz; vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x); vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z); vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

float fbm(vec2 p) {
  float value = 0.0; float amp = 1.0; float freq = uWaveFrequency;
  for (int i = 0; i < 4; i++) { value += amp * abs(cnoise(p)); p *= freq; amp *= uWaveAmplitude; }
  return value;
}
float pattern(vec2 p) {
  vec2 p2 = p - uTime * uWaveSpeed;
  return fbm(p + fbm(p2));
}

float bayer8(int x, int y) {
  int idx = y * 8 + x;
  float m[64];
  m[0]=0.0;m[1]=48.0;m[2]=12.0;m[3]=60.0;m[4]=3.0;m[5]=51.0;m[6]=15.0;m[7]=63.0;
  m[8]=32.0;m[9]=16.0;m[10]=44.0;m[11]=28.0;m[12]=35.0;m[13]=19.0;m[14]=47.0;m[15]=31.0;
  m[16]=8.0;m[17]=56.0;m[18]=4.0;m[19]=52.0;m[20]=11.0;m[21]=59.0;m[22]=7.0;m[23]=55.0;
  m[24]=40.0;m[25]=24.0;m[26]=36.0;m[27]=20.0;m[28]=43.0;m[29]=27.0;m[30]=39.0;m[31]=23.0;
  m[32]=2.0;m[33]=50.0;m[34]=14.0;m[35]=62.0;m[36]=1.0;m[37]=49.0;m[38]=13.0;m[39]=61.0;
  m[40]=34.0;m[41]=18.0;m[42]=46.0;m[43]=30.0;m[44]=33.0;m[45]=17.0;m[46]=45.0;m[47]=29.0;
  m[48]=10.0;m[49]=58.0;m[50]=6.0;m[51]=54.0;m[52]=9.0;m[53]=57.0;m[54]=5.0;m[55]=53.0;
  m[56]=42.0;m[57]=26.0;m[58]=38.0;m[59]=22.0;m[60]=41.0;m[61]=25.0;m[62]=37.0;m[63]=21.0;
  float v = 0.0;
  for (int k = 0; k < 64; k++) { if (k == idx) v = m[k]; }
  return v / 64.0;
}

vec3 dither(vec2 uvScreen, vec3 color) {
  vec2 scaledCoord = floor(uvScreen * uResolution / uPixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayer8(x, y) - 0.25;
  float stp = 1.0 / (uColorNum - 1.0);
  color += threshold * stp;
  color = clamp(color - 0.2, 0.0, 1.0);
  return floor(color * (uColorNum - 1.0) + 0.5) / (uColorNum - 1.0);
}

void main() {
  vec2 uvScreen = gl_FragCoord.xy / uResolution;
  vec2 normPix = uPixelSize / uResolution;
  vec2 uvPix = normPix * floor(uvScreen / normPix);

  vec2 uv = uvPix - 0.5;
  uv.x *= uResolution.x / uResolution.y;
  float f = pattern(uv);

  if (uEnableMouse > 0.5) {
    vec2 mouseNDC = (uMousePos / uResolution - 0.5) * vec2(1.0, -1.0);
    mouseNDC.x *= uResolution.x / uResolution.y;
    float dist = length(uv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, uMouseRadius, dist);
    f -= 0.5 * effect;
  }

  vec3 col = mix(vec3(0.0), uWaveColor, f);
  col = dither(uvScreen, col);
  float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}
`;

function Dither(props) {
  const p = props || {};
  const { useRef, useEffect } = React;
  const hostRef = useRef(null);

  const waveColor = p.waveColor || [0.149, 0.545, 1.0];
  const waveSpeed = p.waveSpeed != null ? p.waveSpeed : 0.05;
  const waveFrequency = p.waveFrequency != null ? p.waveFrequency : 3.0;
  const waveAmplitude = p.waveAmplitude != null ? p.waveAmplitude : 0.3;
  const colorNum = p.colorNum != null ? p.colorNum : 5.0;
  const pixelSize = p.pixelSize != null ? p.pixelSize : 3.0;
  const mouseReact = p.enableMouseInteraction != null ? p.enableMouseInteraction : true;
  const mouseRadius = p.mouseRadius != null ? p.mouseRadius : 1.0;

  useEffect(function () {
    const host = hostRef.current;
    if (!host || typeof THREE === 'undefined') return;
    const reduced = diReduced();

    let renderer, scene, camera, geometry, material, mesh, ro, io, raf = 0;
    let visible = true, disposed = false;
    const mouse = { x: 0, y: 0 };

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (e) { return; }
    const dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));

    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uWaveSpeed: { value: waveSpeed },
      uWaveFrequency: { value: waveFrequency },
      uWaveAmplitude: { value: waveAmplitude },
      uWaveColor: { value: new THREE.Vector3(waveColor[0], waveColor[1], waveColor[2]) },
      uMousePos: { value: new THREE.Vector2(0, 0) },
      uEnableMouse: { value: mouseReact && !reduced ? 1 : 0 },
      uMouseRadius: { value: mouseRadius },
      uColorNum: { value: colorNum },
      uPixelSize: { value: pixelSize }
    };

    material = new THREE.RawShaderMaterial({
      vertexShader: DI_VERT, fragmentShader: DI_FRAG, uniforms: uniforms,
      transparent: true, depthTest: false, depthWrite: false
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    function resize() {
      const w = host.offsetWidth || 1, h = host.offsetHeight || 1;
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
    }
    ro = new ResizeObserver(resize); ro.observe(host); resize();

    function onMove(e) {
      const r = host.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * dpr;
      mouse.y = (e.clientY - r.top) * dpr;
      uniforms.uMousePos.value.set(mouse.x, mouse.y);
    }
    if (mouseReact && !reduced) window.addEventListener('mousemove', onMove, { passive: true });

    io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !reduced && !raf && !disposed) raf = requestAnimationFrame(frame);
    }, { threshold: 0 });
    io.observe(host);

    function frame(t) {
      if (disposed) return;
      if (!visible) { raf = 0; return; }
      raf = requestAnimationFrame(frame);
      uniforms.uTime.value = t * 0.001;
      renderer.render(scene, camera);
    }
    if (reduced) renderer.render(scene, camera);
    else raf = requestAnimationFrame(frame);

    return function () {
      disposed = true;
      cancelAnimationFrame(raf);
      try { ro.disconnect(); } catch (e) {}
      try { io.disconnect(); } catch (e) {}
      if (mouseReact && !reduced) window.removeEventListener('mousemove', onMove);
      try { if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement); } catch (e) {}
      try { geometry.dispose(); material.dispose(); renderer.dispose(); } catch (e) {}
      const lose = renderer.getContext().getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveColor.join(','), waveSpeed, waveFrequency, waveAmplitude, colorNum, pixelSize, mouseReact, mouseRadius]);

  return <div ref={hostRef} className={'dither ' + (p.className || '')} aria-hidden="true" />;
}

window.Dither = Dither;
