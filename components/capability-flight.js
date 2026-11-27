/* global THREE */
/* A first-person camera ride through the portfolio's aura. Scroll owns time. There is
   no physical coaster, idle animation loop, external model, or post-processing pass. */
(function () {
  'use strict';

  function mount(canvas) {
    if (!canvas || typeof THREE === 'undefined') return null;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x050710, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050710, 0.008);
    var camera = new THREE.PerspectiveCamera(54, 1, 0.1, 500);
    var root = canvas.closest('.scene-skills');
    var resources = [], ribbons = [], veils = [];
    var progress = 0, frame = 0, disposed = false, lost = false;
    var pointer = { x: 0, y: 0 };
    var position = new THREE.Vector3(), ahead = new THREE.Vector3();
    var forward = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
    var projected = new THREE.Vector3();
    var anchors = [];
    var points = [];
    for (var i = 0; i <= 32; i++) {
      var t = i / 32;
      points.push(new THREE.Vector3(
        Math.sin(t * Math.PI * 3.2) * 32 + Math.sin(t * Math.PI * 6) * 8,
        Math.sin(t * Math.PI * 4.5) * 23,
        -t * 900
      ));
    }
    var path = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    path.arcLengthDivisions = 1000;
    function keep(item) { resources.push(item); return item; }
    function at(p) { return 0.025 + p * 0.84; }

    function place(p, targetCamera) {
      var t = at(p);
      path.getPointAt(t, position);
      path.getPointAt(Math.min(0.999, t + 0.038), ahead);
      targetCamera.position.copy(position);
      targetCamera.lookAt(ahead);
      // A measured bank gives the rise and drop a physical direction without spinning
      // the reading plane. Pointer movement is a small glance, never an orbit control.
      targetCamera.rotateZ(Math.sin(p * Math.PI * 5) * 0.065);
      if (targetCamera === camera) {
        targetCamera.rotateY(pointer.x * 0.018);
        targetCamera.rotateX(pointer.y * 0.012);
      }
      targetCamera.updateMatrixWorld();
    }

    // The HTML is billboarded at five points in actual world space. At each pause its
    // anchor occupies the same reading position; between pauses it moves with the scene.
    function anchorStops() {
      var probe = new THREE.PerspectiveCamera(54, camera.aspect, 0.1, 500);
      for (var i = 0; i < 5; i++) {
        place(i / 4, probe);
        probe.getWorldDirection(forward);
        right.setFromMatrixColumn(probe.matrixWorld, 0);
        up.setFromMatrixColumn(probe.matrixWorld, 1);
        var y = camera.aspect < 1.3 ? (canvas.clientHeight < 390 ? 0.06 : 0.13) : (canvas.clientHeight < 480 ? 0.06 : 0.16);
        var offset = 90 * Math.tan(27 * Math.PI / 180) * (1 - y * 2);
        anchors[i] = probe.position.clone().addScaledVector(forward, 90).addScaledVector(up, offset);
      }
      place(progress, camera);
    }

    // Unpaired light ribbons describe the turns and pass at the edge of vision. Their
    // different trajectories keep this atmospheric, rather than suggesting train rails.
    function ribbon(side, phase, color) {
      var curve = new THREE.Curve();
      curve.getPoint = function (t, target) {
        var p = path.getPointAt(t, target || new THREE.Vector3());
        p.x += side * (30 + Math.sin(t * 19 + phase) * 12);
        p.y += Math.sin(t * 14 + phase) * 16 + (side < 0 ? -13 : 16);
        return p;
      };
      var core = keep(new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.45, depthWrite: false }));
      var halo = keep(new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.BackSide }));
      scene.add(new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 360, 0.045, 5, false)), core));
      scene.add(new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 240, 0.8, 6, false)), halo));
      ribbons.push({ core: core, halo: halo, color: color });
    }
    ribbon(-1, 0.4, 0x72adff);
    ribbon(1, 2.2, 0xc4b0ff);
    ribbon(-1, 4.4, 0xa0c8ff);

    var count = window.innerWidth <= 900 ? 360 : 800;
    var dustPositions = new Float32Array(count * 3);
    var dustColors = new Float32Array(count * 3);
    var blue = new THREE.Color(0x72adff), lavender = new THREE.Color(0xc4b0ff);
    for (var n = 0; n < count; n++) {
      var base = path.getPointAt(n / count);
      var angle = Math.random() * Math.PI * 2;
      var radius = 24 + Math.random() * 65;
      dustPositions[n * 3] = base.x + Math.cos(angle) * radius;
      dustPositions[n * 3 + 1] = base.y + Math.sin(angle) * radius;
      dustPositions[n * 3 + 2] = base.z;
      var color = n % 4 ? blue : lavender;
      color.toArray(dustColors, n * 3);
    }
    var dustGeo = keep(new THREE.BufferGeometry());
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    var dustMat = keep(new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false }));
    scene.add(new THREE.Points(dustGeo, dustMat));

    // Soft light lives in world space too: the camera passes through it, rather than
    // zooming a flat gradient. One tiny shared texture is enough for the whole flight.
    var glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 64;
    var context = glowCanvas.getContext('2d');
    if (context) {
      var gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(226,238,255,0.8)');
      gradient.addColorStop(0.35, 'rgba(226,238,255,0.2)');
      gradient.addColorStop(1, 'rgba(226,238,255,0)');
      context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
      var glowTexture = keep(new THREE.CanvasTexture(glowCanvas));
      for (var v = 0; v < 14; v++) {
        var veilMat = keep(new THREE.SpriteMaterial({ map: glowTexture, color: v % 2 ? 0xc4b0ff : 0x72adff, transparent: true, opacity: 0.17, depthWrite: false }));
        var veil = new THREE.Sprite(veilMat);
        veil.position.copy(path.getPointAt(0.03 + v * 0.068));
        veil.position.x += v % 2 ? 42 : -42;
        veil.position.y += Math.sin(v * 1.7) * 20;
        veil.scale.set(110, 85, 1); scene.add(veil);
        veils.push(veilMat);
      }
    }

    // Open, offset contours pass like folds of light, leaving the centre clear for type.
    var contourMaterials = [];
    for (var c = 0; c < 18; c++) {
      var t = 0.04 + c * 0.051;
      var center = path.getPointAt(t);
      var contourPoints = [];
      for (var k = 0; k <= 60; k++) {
        var a = k / 60 * Math.PI * 1.35 + c * 0.53;
        contourPoints.push(new THREE.Vector3(
          center.x + Math.cos(a) * (43 + Math.sin(a * 2) * 8),
          center.y + Math.sin(a) * 30,
          center.z + Math.sin(a * 2) * 8
        ));
      }
      var contourMat = keep(new THREE.LineBasicMaterial({ color: c % 2 ? 0xc4b0ff : 0x72adff, transparent: true, opacity: 0.11 }));
      contourMaterials.push(contourMat);
      scene.add(new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(contourPoints)), contourMat));
    }

    function draw() {
      frame = 0;
      if (!disposed && !lost) renderer.render(scene, camera);
    }
    function requestDraw() { if (!frame && !disposed) frame = requestAnimationFrame(draw); }
    function resize() {
      if (disposed) return;
      var width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
      anchorStops(); requestDraw();
    }
    function theme() {
      var light = document.documentElement.classList.contains('theme-light');
      scene.fog.color.setHex(light ? 0xeaf1fa : 0x050710);
      dustMat.opacity = light ? 0.6 : 0.55;
      ribbons.forEach(function (r, i) {
        r.core.color.setHex(light ? (i === 1 ? 0x77579f : 0x3f74bc) : r.color);
        r.core.opacity = light ? 0.4 : 0.45;
        r.halo.opacity = light ? 0.025 : 0.035;
      });
      contourMaterials.forEach(function (mat, i) {
        mat.color.setHex(light ? (i % 2 ? 0x77579f : 0x3f74bc) : (i % 2 ? 0xc4b0ff : 0x72adff));
      });
      veils.forEach(function (mat, i) {
        mat.color.setHex(light ? (i % 2 ? 0x9977bd : 0x658fc9) : (i % 2 ? 0xc4b0ff : 0x72adff));
        mat.opacity = light ? 0.1 : 0.17;
      });
      requestDraw();
    }
    function move(event) {
      if (event.pointerType === 'touch') return;
      var rect = root.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
      place(progress, camera); requestDraw();
    }
    function leave() { pointer.x = pointer.y = 0; place(progress, camera); requestDraw(); }
    function contextLost(event) {
      event.preventDefault(); lost = true; delete root.dataset.flight;
      if (typeof canvas.onFlightUnavailable === 'function') canvas.onFlightUnavailable();
    }
    function contextRestored() {
      lost = false; root.dataset.flight = 'true';
      if (typeof canvas.onFlightUnavailable === 'function') canvas.onFlightUnavailable();
      requestDraw();
    }
    var resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    var themeObserver = new MutationObserver(theme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    root.addEventListener('pointermove', move); root.addEventListener('pointerleave', leave);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    theme(); resize(); anchorStops();

    return {
      setProgress: function (value) {
        progress = Math.max(0, Math.min(1, value)) || 0;
        place(progress, camera); requestDraw();
      },
      projectStop: function (index) {
        if (!anchors[index]) return null;
        projected.copy(anchors[index]).applyMatrix4(camera.matrixWorldInverse);
        var depth = -projected.z;
        projected.copy(anchors[index]).project(camera);
        return {
          x: (projected.x * 0.5 + 0.5) * canvas.clientWidth,
          y: (-projected.y * 0.5 + 0.5) * canvas.clientHeight,
          scale: Math.max(0.15, Math.min(2.5, 90 / Math.max(1, depth))),
          visible: depth > 1,
        };
      },
      available: function () { return !lost; },
      resize: resize,
      dispose: function () {
        disposed = true; cancelAnimationFrame(frame);
        resizeObserver.disconnect(); themeObserver.disconnect();
        root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave);
        canvas.removeEventListener('webglcontextlost', contextLost);
        canvas.removeEventListener('webglcontextrestored', contextRestored);
        resources.forEach(function (resource) { resource.dispose(); });
        renderer.dispose(); renderer.forceContextLoss();
      },
    };
  }
  window.CapabilityFlight = { mount: mount };
})();
