/* global React, THREE */
/*
  Aurora — flowing aurora-ribbon light backdrop.
  Adapted from React Bits (https://reactbits.dev), which ships an OGL/ESM component using
  a GLSL ES 3.00 shader. This site has no bundler and loads three.js as a global, so it's
  re-implemented as a THREE full-screen triangle + RawShaderMaterial with glslVersion GLSL3
  and premultiplied-alpha blending (matching the upstream gl.blendFunc(ONE, ONE_MINUS_SRC_ALPHA)).
  Used behind the "Let's work together" contact section. Tinted to the brand blues/lavender.
  Pauses off-screen; reduced-motion renders a single static frame. Exposed as window.Aurora.
*/
function auReduced() {
  try {
    return document.documentElement.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { return false; }
}
function auHexToVec3(hex) {
  var h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  var n = parseInt(h, 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/* #version 300 es is prepended by THREE when glslVersion = GLSL3 — do not include it here. */
var AU_VERT = [
  'in vec3 position;',
  'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }'
].join('\n');

var AU_FRAG = `precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop { vec3 color; float position; };

#define COLOR_RAMP(colors, factor, finalColor) {            \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                             \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  vec3 auroraColor = intensity * rampColor;
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}`;

function Aurora(props) {
  const p = props || {};
  const { useRef, useEffect } = React;
  const hostRef = useRef(null);

  const colorStops = p.colorStops || ['#4A8FEF', '#C4B0FF', '#72ADFF'];
  const amplitude = p.amplitude != null ? p.amplitude : 1.0;
  const blend = p.blend != null ? p.blend : 0.5;
  const speed = p.speed != null ? p.speed : 0.6;

  useEffect(function () {
    const host = hostRef.current;
    if (!host || typeof THREE === 'undefined') return;
    const reduced = auReduced();

    let renderer, scene, camera, geometry, material, mesh, ro, io, raf = 0;
    let visible = true, disposed = false;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, premultipliedAlpha: true, antialias: true, powerPreference: 'low-power' });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reduced ? 1 : 2));
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));

    const uniforms = {
      uTime: { value: 0 },
      uAmplitude: { value: amplitude },
      uBlend: { value: blend },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorStops: { value: colorStops.map(auHexToVec3) }
    };

    material = new THREE.RawShaderMaterial({
      vertexShader: AU_VERT,
      fragmentShader: AU_FRAG,
      uniforms: uniforms,
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor
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
    ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !reduced && !raf && !disposed) raf = requestAnimationFrame(frame);
    }, { threshold: 0 });
    io.observe(host);

    function frame(t) {
      if (disposed) return;
      if (!visible) { raf = 0; return; }
      raf = requestAnimationFrame(frame);
      uniforms.uTime.value = t * 0.001 * speed;
      renderer.render(scene, camera);
    }

    if (reduced) renderer.render(scene, camera);
    else raf = requestAnimationFrame(frame);

    return function () {
      disposed = true;
      cancelAnimationFrame(raf);
      try { ro.disconnect(); } catch (e) {}
      try { io.disconnect(); } catch (e) {}
      try { if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement); } catch (e) {}
      try { geometry.dispose(); material.dispose(); renderer.dispose(); } catch (e) {}
      const lose = renderer.getContext().getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amplitude, blend, speed, colorStops.join(',')]);

  return <div ref={hostRef} className={'aurora ' + (p.className || '')} aria-hidden="true" />;
}

window.Aurora = Aurora;
