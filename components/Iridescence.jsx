/* global React, THREE */
/*
  Iridescence — pearlescent / oil-slick shimmer background.
  Adapted from React Bits (https://reactbits.dev), which ships an OGL/ESM component.
  This site has no bundler and loads three.js as a global, so the original OGL renderer
  is re-implemented as a THREE full-screen triangle + RawShaderMaterial running upstream's
  shader (unchanged). Tinted violet for the s0mped / tooth-gems section — gems refract
  light, so the iridescence is on-theme.
  Pauses its render loop when scrolled off-screen (the page runs several WebGL layers).
  Honors prefers-reduced-motion (single static frame). Exposed as window.Iridescence.
*/
function irReduced() {
  try {
    return document.documentElement.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { return false; }
}

const IR_VERT = `
attribute vec3 position;
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const IR_FRAG = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

function Iridescence(props) {
  const p = props || {};
  const { useRef, useEffect } = React;
  const hostRef = useRef(null);

  const color = p.color || [0.62, 0.46, 1.0];   // violet tint
  const speed = p.speed != null ? p.speed : 0.7;
  const amplitude = p.amplitude != null ? p.amplitude : 0.1;
  const mouseReact = p.mouseReact != null ? p.mouseReact : true;

  useEffect(function () {
    const host = hostRef.current;
    if (!host || typeof THREE === 'undefined') return;
    const reduced = irReduced();

    let renderer, gl, scene, camera, geometry, material, mesh, ro, io, raf = 0;
    let visible = true, disposed = false;
    const mouse = { x: 0.5, y: 0.5 };

    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reduced ? 1 : 2));

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));

    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Vector3(color[0], color[1], color[2]) },
      uResolution: { value: new THREE.Vector3(1, 1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uAmplitude: { value: amplitude },
      uSpeed: { value: speed }
    };

    material = new THREE.RawShaderMaterial({ vertexShader: IR_VERT, fragmentShader: IR_FRAG, uniforms: uniforms });
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
      const cw = renderer.domElement.width, ch = renderer.domElement.height;
      uniforms.uResolution.value.set(cw, ch, cw / Math.max(ch, 1));
    }
    ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    function onMove(e) {
      const r = host.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / Math.max(r.width, 1);
      mouse.y = 1 - (e.clientY - r.top) / Math.max(r.height, 1);
      uniforms.uMouse.value.set(mouse.x, mouse.y);
    }
    if (mouseReact && !reduced) window.addEventListener('mousemove', onMove, { passive: true });

    // Pause the loop when the section is off-screen.
    io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !reduced && !raf && !disposed) raf = requestAnimationFrame(frame);
    }, { threshold: 0 });
    io.observe(host);

    function frame(t) {
      if (disposed) return;
      if (!visible) { raf = 0; return; }   // stop until visible again
      raf = requestAnimationFrame(frame);
      uniforms.uTime.value = t * 0.001;
      renderer.render(scene, camera);
    }

    if (reduced) {
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(frame);
    }

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
  }, [color[0], color[1], color[2], speed, amplitude, mouseReact]);

  return <div ref={hostRef} className={'iridescence ' + (p.className || '')} aria-hidden="true" />;
}

window.Iridescence = Iridescence;
