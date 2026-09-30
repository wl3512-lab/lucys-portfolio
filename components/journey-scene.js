/* global THREE */
/*
  journey-scene.js — the Lit Archive flight.

  One persistent Three.js scene that the whole page travels through. Scroll is the camera:
  progress 0..1 moves it along a CatmullRom path, so the page reads as one continuous
  journey rather than a stack of sections with separate backdrops.

  Framework-free on purpose, matching the site's other engines (letter-glitch.js,
  faulty-terminal-core.js): it needs THREE on window and nothing else, exposes
  window.JourneyScene, and never touches the DOM outside the canvas it is handed.

  Everything is procedural. There are no .glb assets to load, which keeps the payload
  small and keeps the scene in the same generative language as the rest of Lucy's work.

  Contract:
    const j = JourneyScene.mount({ canvas, nodes })   // nodes: [{ t, label }]
    j.setProgress(p)   // 0..1, called from the scroll driver
    j.resize()
    j.dispose()

  The caller owns scroll. This never reads window.scrollY itself, so it composes with the
  page's single Lenis/ScrollTrigger system instead of fighting it.
*/
(function () {
  'use strict';

  var VOID = 0x050710;
  var SIGNAL = 0x72adff;
  var ATMOS = 0xa0c8ff;
  var LAVENDER = 0xc4b0ff;

  // Soft radial dot, generated once and shared by every point material. A texture beats a
  // shader here: it gives the points their bloom without a post-processing pass, which on
  // this many sprites is the difference between smooth and not.
  function dotTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.28, 'rgba(255,255,255,0.65)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    var t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  // The flight path. Deliberately not a straight line: the lateral drift is what makes the
  // starfield parallax read as travel rather than as a zoom.
  function buildPath() {
    var pts = [];
    var LEN = 14;
    for (var i = 0; i <= LEN; i++) {
      var t = i / LEN;
      pts.push(new THREE.Vector3(
        Math.sin(t * Math.PI * 1.9) * 26,
        Math.sin(t * Math.PI * 1.15) * 11 + t * 6,
        -t * 620
      ));
    }
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  }

  function mount(opts) {
    opts = opts || {};
    var canvas = opts.canvas;
    if (!canvas || typeof THREE === 'undefined') return null;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
      });
    } catch (e) { return null; }
    // Capped at 1.75: the scene is mostly additive sprites, so full DPR on a 5K display
    // costs a lot of fill rate and buys almost nothing visually.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(VOID, 1);

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(VOID, 0.0036);

    var camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1400);

    var path = buildPath();
    var tex = dotTexture();
    var disposables = [tex];

    // ---- starfield ----
    // Distributed in a tube around the path rather than a box, so density stays even for
    // the whole flight instead of thinning out where the path wanders.
    var STARS = 5200;
    var sPos = new Float32Array(STARS * 3);
    var sCol = new Float32Array(STARS * 3);
    var sSize = new Float32Array(STARS);
    var cA = new THREE.Color(ATMOS), cS = new THREE.Color(SIGNAL), cL = new THREE.Color(LAVENDER);
    for (var i = 0; i < STARS; i++) {
      var t = Math.random();
      var base = path.getPointAt(t);
      var ang = Math.random() * Math.PI * 2;
      var rad = 26 + Math.pow(Math.random(), 0.55) * 190;
      sPos[i * 3] = base.x + Math.cos(ang) * rad;
      sPos[i * 3 + 1] = base.y + Math.sin(ang) * rad * 0.7;
      sPos[i * 3 + 2] = base.z + (Math.random() - 0.5) * 120;
      var r = Math.random();
      var col = r > 0.86 ? cL : (r > 0.5 ? cS : cA);
      var dim = 0.35 + Math.random() * 0.65;
      sCol[i * 3] = col.r * dim; sCol[i * 3 + 1] = col.g * dim; sCol[i * 3 + 2] = col.b * dim;
      sSize[i] = 0.7 + Math.pow(Math.random(), 2.2) * 3.4;
    }
    var starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sSize, 1));
    var starMat = new THREE.PointsMaterial({
      map: tex, size: 2.2, sizeAttenuation: true, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9,
    });
    var stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    // ---- the filament ----
    // The light trail the camera rides. It is the same curve the camera follows, so it
    // always reads as the route: ahead of you it is where you are going, behind it is
    // where you have been.
    var tubeGeo = new THREE.TubeGeometry(path, 420, 0.34, 8, false);
    var tubeMat = new THREE.MeshBasicMaterial({
      color: SIGNAL, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    var filament = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(filament);
    disposables.push(tubeGeo, tubeMat);

    // A wider, fainter sheath gives the filament its glow without a bloom pass.
    var glowGeo = new THREE.TubeGeometry(path, 300, 1.7, 8, false);
    var glowMat = new THREE.MeshBasicMaterial({
      color: ATMOS, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    var glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);
    disposables.push(glowGeo, glowMat);

    // ---- archive nodes ----
    // One lit point per waypoint, set off to the side of the path so the camera passes it
    // rather than flying through it. These are the "pieces lit by their own aura".
    var nodeDefs = (opts.nodes && opts.nodes.length) ? opts.nodes : [];
    var nodeGroup = new THREE.Group();
    var nodeMeshes = [];
    nodeDefs.forEach(function (n, idx) {
      var p = path.getPointAt(Math.max(0, Math.min(1, n.t)));
      var side = idx % 2 === 0 ? -1 : 1;
      var off = 15 + (idx % 3) * 5;
      var g = new THREE.SphereGeometry(0.5, 16, 16);
      var m = new THREE.MeshBasicMaterial({
        color: ATMOS, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      var mesh = new THREE.Mesh(g, m);
      mesh.position.set(p.x + side * off, p.y + (idx % 2 ? 5 : -4), p.z);
      nodeGroup.add(mesh);

      var hg = new THREE.SphereGeometry(3.1, 16, 16);
      var hm = new THREE.MeshBasicMaterial({
        color: SIGNAL, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      var halo = new THREE.Mesh(hg, hm);
      halo.position.copy(mesh.position);
      nodeGroup.add(halo);

      nodeMeshes.push({ mesh: mesh, halo: halo, mat: m, halomat: hm, t: n.t, label: n.label });
      disposables.push(g, m, hg, hm);
    });
    scene.add(nodeGroup);

    // ---- drive ----
    var progress = 0, shown = 0;
    var look = new THREE.Vector3();
    var pos = new THREE.Vector3();
    var raf = 0, running = true, clock = 0;

    function place() {
      // Eased toward the target so a flung scroll glides instead of snapping. The camera is
      // the only thing that lags; the HUD and content stay locked to real scroll.
      shown += (progress - shown) * 0.085;
      var t = Math.max(0, Math.min(0.999, shown));
      path.getPointAt(t, pos);
      camera.position.copy(pos);
      // Look a little further down the path, so turns bank into view before you reach them.
      path.getPointAt(Math.min(0.9999, t + 0.022), look);
      camera.lookAt(look);
      // A slow roll keeps a static stretch of path from feeling frozen.
      camera.rotation.z = Math.sin(t * Math.PI * 2.4) * 0.07;
    }

    function frame() {
      if (!running) return;
      clock += 0.016;
      place();
      // Nodes breathe, and brighten as the camera comes level with them.
      for (var i = 0; i < nodeMeshes.length; i++) {
        var n = nodeMeshes[i];
        var d = 1 - Math.min(1, Math.abs(shown - n.t) / 0.1);
        var pulse = 0.72 + Math.sin(clock * 1.7 + i) * 0.16;
        n.mat.opacity = (0.35 + d * 0.6) * pulse;
        n.halomat.opacity = (0.05 + d * 0.16) * pulse;
        var s = 1 + d * 0.5;
        n.halo.scale.setScalar(s);
      }
      stars.rotation.z = clock * 0.004;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function resize() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    resize();
    place();
    shown = progress; // no glide on the very first frame
    raf = requestAnimationFrame(frame);

    return {
      setProgress: function (p) { progress = Math.max(0, Math.min(1, p)) || 0; },
      resize: resize,
      // Where a node currently sits on screen, so the HUD can hang a label off it.
      project: function (i) {
        var n = nodeMeshes[i];
        if (!n) return null;
        var v = n.mesh.position.clone().project(camera);
        if (v.z > 1) return null; // behind the camera
        return { x: (v.x * 0.5 + 0.5), y: (-v.y * 0.5 + 0.5), label: n.label };
      },
      nodeCount: function () { return nodeMeshes.length; },
      dispose: function () {
        running = false;
        cancelAnimationFrame(raf);
        disposables.forEach(function (d) { try { d.dispose(); } catch (e) {} });
        try { renderer.dispose(); } catch (e) {}
      },
    };
  }

  window.JourneyScene = { mount: mount };
})();
