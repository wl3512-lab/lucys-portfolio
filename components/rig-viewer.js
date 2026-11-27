/* His Blender rig, in the browser (How I was made, portfolio-creature.html).
   Lucy, 2026-11-02: "i want the blender rig to be able to do 360 turns and user can turn it and see details and see it
   in mesh view and greyscale too".

   <figure data-rig-viewer data-src="…/creature.glb" data-edges="…/edges.rigw"> holds a poster image (the Blender pose
   study, what shows without the script, under reduced data or before it loads), a canvas, and the controls:
   [data-rig-mode="colour|grey|mesh"] (aria-pressed), [data-rig="in|out|turn|reset"]. Built by
   scripts/creature-rig-web.py from the rig's .blend.

   - Colour: each surface's own toon shader rebuilt from the .blend (RAMPS: Blender's constant colour ramps, its
     grain and speckle, the blades' ivory roots into cobalt). Greyscale: the same shading, each colour's luminance.
     Mesh: the cage's quad edges (edges.rigw, fetched on first use) over a dark fill, so hidden edges stay hidden.
   - The lamp stays with the viewer (view space), so whichever way he is turned he is lit like the renders.
   - Drag (or one finger sideways) turns him all the way round; scroll, pinch or the buttons zoom in for details; a
     right drag or two fingers pan. Arrow keys turn him, + and - zoom, 0 resets, on the focused canvas. Phones keep
     vertical drags for the page (touch-action: pan-y).
   - three.js 0.160 (the site's version) and its loaders come from unpkg through the page's import map, only when the
     figure comes within a screen of view. It draws only when something moved, and nothing while off screen.
   - On arrival he turns once all the way round (2.4 s); never under reduced motion, which also drops the easing.
   Test hook: window.__rigViewer. */
(function () {
  'use strict';
  var THREE_URL = 'https://unpkg.com/three@0.160.0/';
  // Blender's ramps (linear RGB; constant interpolation), read from lucy-creature-rig-v2.1.blend
  var COBALT = { pos: [0.04, 0.2, 0.42, 0.65, 0.82], col: [[0.003, 0.007, 0.071], [0.023, 0.061, 0.485], [0.099, 0.156, 0.914], [0.349, 0.29, 0.935], [0.547, 0.612, 1.0]], speck: 1 };
  var RAMPS = {
    'Ivory — flat toon proxy': { pos: [0.05, 0.18, 0.34, 0.53, 0.72], col: [[0.004, 0.013, 0.126], [0.066, 0.133, 0.579], [0.375, 0.485, 0.893], [0.832, 0.813, 0.699], [1.0, 0.957, 0.813]], speck: 0 },
    'Cobalt fin': COBALT,
    'Fin membrane': COBALT,
    'Ivory roots → terminal cobalt': { pos: COBALT.pos, col: COBALT.col, speck: 1, blade: 1 },
    'Lavender horn': { pos: [0.04, 0.2, 0.42, 0.65, 0.82], col: [[0.02, 0.018, 0.156], [0.112, 0.099, 0.547], [0.325, 0.268, 0.873], [0.547, 0.5, 1.0], [0.736, 0.718, 1.0]], speck: 1 },
    'Eye highlight': { pos: [0, 0.26, 0.53, 2, 2], col: [[0.437, 0.451, 0.46], [0.693, 0.715, 0.73], [0.95, 0.98, 1.0], [0.95, 0.98, 1.0], [0.95, 0.98, 1.0]], speck: 0 },
    'Ink contour': { pos: [0, 0.26, 0.53, 2, 2], col: [[0.012, 0.018, 0.044], [0.018, 0.029, 0.069], [0.025, 0.04, 0.095], [0.025, 0.04, 0.095], [0.025, 0.04, 0.095]], speck: 0 },
    'Forked tongue — violet': { pos: [0, 2, 2, 2, 2], col: [[0.43, 0.19, 0.68], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], speck: 0, flat: 1 }
  };
  var FALLBACK = { pos: [0, 0.3, 0.6, 2, 2], col: [[0.08, 0.08, 0.1], [0.35, 0.36, 0.42], [0.75, 0.77, 0.82], [0.75, 0.77, 0.82], [0.75, 0.77, 0.82]], speck: 0 };

  var VERT = [
    'varying vec3 vN; varying vec3 vP; varying float vBlade;',
    '#include <common>',
    '#include <color_pars_vertex>',
    'void main() {',
    '  vBlade = 0.0;',
    '  #ifdef USE_COLOR',
    '  vBlade = color.r;',
    '  #endif',
    '  vN = normalize(normalMatrix * normal); vP = position;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'].join('\n');
  var FRAG = [
    'uniform vec3 uCol[5]; uniform float uPos[5]; uniform float uSpeck; uniform float uBlade; uniform float uGrey; uniform float uFlat;',
    'varying vec3 vN; varying vec3 vP; varying float vBlade;',
    'float h3(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }',
    'vec3 ramp(float t) { vec3 c = uCol[0]; for (int i = 1; i < 5; i++) { if (t >= uPos[i]) c = uCol[i]; } return c; }',
    'void main() {',
    '  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;',
    '  vec3 K = normalize(vec3(-0.45, 0.62, 0.64)), Fl = normalize(vec3(0.7, -0.1, 0.5));',
    '  float g = h3(floor(vP * 180.0));',
    '  float L = 0.16 + 0.7 * max(dot(n, K), 0.0) + 0.16 * max(dot(n, Fl), 0.0) + (g - 0.5) * 0.14;',
    '  vec3 c = uFlat > 0.5 ? uCol[0] : ramp(L);',
    '  if (uSpeck > 0.5 && h3(floor(vP * 260.0) + 7.0) > 0.91) c = mix(c, vec3(0.612, 0.736, 1.0), 0.25);',
    '  if (uBlade > 0.5) c = mix(vec3(0.94, 0.94, 0.91) * (0.7 + 0.3 * smoothstep(0.2, 0.6, L)), c, vBlade);',
    '  if (uGrey > 0.5) c = vec3(dot(c, vec3(0.2126, 0.7152, 0.0722)));',
    '  gl_FragColor = vec4(c, 1.0);',
    '  #include <colorspace_fragment>',
    '}'].join('\n');

  function decodeEdges(buf, THREE) {
    var dv = new DataView(buf), o = 4, nv = dv.getUint32(o, true), ne = dv.getUint32(o + 4, true); o += 8;
    var mn = [], mx = [], i, c;
    for (i = 0; i < 3; i++) mn.push(dv.getFloat32(o + i * 4, true));
    for (i = 0; i < 3; i++) mx.push(dv.getFloat32(o + 12 + i * 4, true));
    o += 24;
    var pos = new Float32Array(nv * 3);
    for (c = 0; c < 3; c++) {
      var q = 0, s = (mx[c] - mn[c]) / 65535;
      for (i = 0; i < nv; i++) { q = (q + dv.getInt16(o, true)) & 0xffff; o += 2; pos[i * 3 + c] = mn[c] + q * s; }
    }
    var idx = new Uint32Array(ne * 2), a = 0;
    for (i = 0; i < ne; i++) { a += dv.getUint16(o, true); o += 2; idx[i * 2] = a; }
    for (i = 0; i < ne; i++) { idx[i * 2 + 1] = idx[i * 2] + dv.getUint16(o, true); o += 2; }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    return geo;
  }
  function gunzip(buf) {
    var b = new Uint8Array(buf);
    if (!(b[0] === 0x1f && b[1] === 0x8b)) return Promise.resolve(buf);   // a server that already unzipped it
    var ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(ds).arrayBuffer();
  }

  function mount(fig) {
    if (fig.__rig) return fig.__rig;
    var canvas = fig.querySelector('canvas'), stage = fig.querySelector('.rig-stage');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var state = { ready: false, mode: 'colour', renders: 0, edges: false, error: null, turning: false };
    var h = { state: state };
    fig.__rig = h;
    var started = false;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        state.onScreen = e.isIntersecting;
        if (e.isIntersecting && !started) { started = true; start(); }
        if (h.kick) h.kick();
      });
    }, { rootMargin: '100% 0px' });
    io.observe(fig);

    function start() {
      Promise.all([
        import(THREE_URL + 'build/three.module.js'),
        import(THREE_URL + 'examples/jsm/loaders/GLTFLoader.js'),
        import(THREE_URL + 'examples/jsm/loaders/DRACOLoader.js'),
        import(THREE_URL + 'examples/jsm/controls/OrbitControls.js')
      ]).then(function (m) { build(m[0], m[1].GLTFLoader, m[2].DRACOLoader, m[3].OrbitControls); })
        .catch(function (err) { state.error = String(err); fig.classList.add('rig-failed'); });
    }

    function build(THREE, GLTFLoader, DRACOLoader, OrbitControls) {
      var renderer;
      try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
      catch (err) { state.error = 'webgl'; fig.classList.add('rig-failed'); return; }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
      var controls = new OrbitControls(camera, canvas);
      controls.enableDamping = !reduce.matches; controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.8; controls.zoomSpeed = 0.9; controls.panSpeed = 0.6;
      controls.minPolarAngle = 0.15; controls.maxPolarAngle = Math.PI - 0.15;
      canvas.style.touchAction = 'pan-y';   // a vertical swipe scrolls the page; sideways turns him

      var mats = [], wire = null, fill = null, root = new THREE.Group(), home = null, dirty = true, raf = 0, last = 0;
      scene.add(root);
      function matFor(name) {
        var r = RAMPS[name] || FALLBACK;
        var m = new THREE.ShaderMaterial({
          vertexShader: VERT, fragmentShader: FRAG, vertexColors: true, side: THREE.DoubleSide,
          uniforms: {
            uCol: { value: r.col.map(function (c) { return new THREE.Vector3(c[0], c[1], c[2]); }) },
            uPos: { value: r.pos.slice() }, uSpeck: { value: r.speck ? 1 : 0 }, uBlade: { value: r.blade ? 1 : 0 },
            uGrey: { value: 0 }, uFlat: { value: r.flat ? 1 : 0 }
          },
          polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
        });
        mats.push(m);
        return m;
      }

      var draco = new DRACOLoader();
      draco.setDecoderPath(THREE_URL + 'examples/jsm/libs/draco/gltf/');
      var loader = new GLTFLoader(); loader.setDRACOLoader(draco);
      loader.load(fig.getAttribute('data-src'), function (gltf) {
        var cache = {};
        gltf.scene.traverse(function (o) {
          if (!o.isMesh) return;
          var name = o.material && o.material.name;
          o.material = cache[name] || (cache[name] = matFor(name));
        });
        root.add(gltf.scene);
        var box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
        root.position.sub(centre);   // turn about his middle
        var r = size.length() / 2, dist = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.82;
        controls.minDistance = dist * 0.18; controls.maxDistance = dist * 2.2;
        // the renders' three-quarter: from his front-left, a little above
        home = { pos: new THREE.Vector3(-0.55, 0.28, 1).normalize().multiplyScalar(dist), target: new THREE.Vector3(0, 0, 0) };
        camera.near = dist / 100; camera.far = dist * 10; camera.updateProjectionMatrix();
        reset(true);
        size_();
        state.ready = true; state.faces = 0;
        root.traverse(function (o) { if (o.isMesh) state.faces += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; });
        fig.classList.add('rig-ready');
        draco.dispose();
        if (!reduce.matches) turn();
        kick();
      }, undefined, function (err) { state.error = String(err && err.message || err); fig.classList.add('rig-failed'); });

      function size_() {
        var w = stage.clientWidth, hgt = stage.clientHeight;
        if (!w || !hgt) return;
        renderer.setSize(w, hgt, false); camera.aspect = w / hgt; camera.updateProjectionMatrix(); dirty = true;
      }
      new ResizeObserver(function () { size_(); kick(); }).observe(stage);

      var spin = null;   // a full turn: { t0, from, ms }
      function turn() {
        if (!home) return;
        var off = camera.position.clone().sub(controls.target);
        spin = { t0: performance.now(), from: Math.atan2(off.x, off.z), ms: reduce.matches ? 0 : 2400 };
        state.turning = true; kick();
      }
      function reset(now) {
        if (!home) return;
        spin = null; state.turning = false;
        controls.target.copy(home.target); camera.position.copy(home.pos); controls.update(); dirty = true; kick();
      }
      function zoom(k) {
        var off = camera.position.clone().sub(controls.target), d = THREE.MathUtils.clamp(off.length() * k, controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).add(off.setLength(d)); controls.update(); dirty = true; kick();
      }
      function orbit(dAz, dEl) {
        var off = camera.position.clone().sub(controls.target), s = new THREE.Spherical().setFromVector3(off);
        s.theta += dAz; s.phi = THREE.MathUtils.clamp(s.phi - dEl, controls.minPolarAngle, controls.maxPolarAngle);
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s)); controls.update(); dirty = true; kick();
      }

      function setMode(mode) {
        state.mode = mode;
        mats.forEach(function (m) { m.uniforms.uGrey.value = mode === 'grey' ? 1 : 0; m.visible = mode !== 'mesh'; });
        fig.querySelectorAll('[data-rig-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-rig-mode') === mode)); });
        if (mode === 'mesh') showMesh(); else { if (wire) wire.visible = false; if (fill) fill.visible = false; }
        dirty = true; kick();
      }
      function showMesh() {
        if (!fill) {   // his parts again in one dark colour, so the edges behind him stay hidden
          fill = new THREE.Group(); fill.matrixAutoUpdate = false;
          var dark = new THREE.MeshBasicMaterial({ color: 0x080b1f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
          root.updateMatrixWorld(true);
          root.traverse(function (o) { if (o.isMesh) { var c = new THREE.Mesh(o.geometry, dark); c.matrixAutoUpdate = false; c.matrix.copy(o.matrixWorld); fill.add(c); } });
          scene.add(fill);
        }
        fill.visible = true;
        if (wire) { wire.visible = true; return; }
        fig.classList.add('rig-loading');
        fetch(fig.getAttribute('data-edges')).then(function (r) { if (!r.ok) throw new Error('edges ' + r.status); return r.arrayBuffer(); })
          .then(gunzip).then(function (buf) {
            var geo = decodeEdges(buf, THREE);
            wire = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc4b0ff, transparent: true, opacity: 0.62 }));
            wire.position.copy(root.position);
            scene.add(wire); state.edges = true;
            wire.visible = state.mode === 'mesh';
            fig.classList.remove('rig-loading'); dirty = true; kick();
          }).catch(function (err) { state.error = String(err); fig.classList.remove('rig-loading'); });
      }

      controls.addEventListener('change', function () { dirty = true; kick(); });
      controls.addEventListener('start', function () { spin = null; state.turning = false; fig.classList.add('rig-touched'); });
      canvas.addEventListener('keydown', function (e) {
        var k = e.key, step = e.shiftKey ? 0.6 : 0.26;
        if (k === 'ArrowLeft') orbit(-step, 0); else if (k === 'ArrowRight') orbit(step, 0);
        else if (k === 'ArrowUp') orbit(0, step / 2); else if (k === 'ArrowDown') orbit(0, -step / 2);
        else if (k === '+' || k === '=') zoom(0.8); else if (k === '-' || k === '_') zoom(1.25);
        else if (k === '0') reset(); else return;
        e.preventDefault(); spin = null; state.turning = false;
      });
      fig.addEventListener('click', function (e) {
        var b = e.target.closest('[data-rig-mode],[data-rig]'); if (!b || !fig.contains(b)) return;
        var mode = b.getAttribute('data-rig-mode'), act = b.getAttribute('data-rig');
        if (mode) setMode(mode);
        else if (act === 'in') zoom(0.75); else if (act === 'out') zoom(1.33);
        else if (act === 'turn') turn(); else if (act === 'reset') reset();
      });

      function frame(now) {
        raf = 0;
        if (!state.onScreen || document.hidden) return;
        if (spin) {
          var t = spin.ms ? Math.min(1, (now - spin.t0) / spin.ms) : 1, e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          var off = camera.position.clone().sub(controls.target), s = new THREE.Spherical().setFromVector3(off);
          s.theta = spin.from + e * Math.PI * 2;
          camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
          if (t >= 1) { spin = null; state.turning = false; }
          dirty = true;
        }
        var moving = controls.update() || spin;
        if (dirty) { renderer.render(scene, camera); state.renders++; dirty = false; }
        if (moving || spin) kick();
        last = now;
      }
      function kick() { if (!raf && state.onScreen && !document.hidden) raf = requestAnimationFrame(frame); }
      h.kick = kick;
      document.addEventListener('visibilitychange', kick);
      h.setMode = setMode; h.reset = reset; h.zoom = zoom; h.orbit = orbit; h.turn = turn;
      h.camera = function () { var o = camera.position.clone().sub(controls.target), s = new THREE.Spherical().setFromVector3(o); return { theta: s.theta, phi: s.phi, dist: s.radius }; };
      h.limits = function () { return { min: controls.minDistance, max: controls.maxDistance }; };
    }
    return h;
  }

  function init() {
    var figs = document.querySelectorAll('[data-rig-viewer]');
    figs.forEach(function (f) { mount(f); });
    window.__rigViewer = figs[0] ? figs[0].__rig : null;
  }
  window.RigViewer = { mount: mount, RAMPS: RAMPS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
