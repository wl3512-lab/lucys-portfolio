/*
  ASCIIText core — framework-free engine (no React/JSX/ESM).
  Adapted from React Bits (https://reactbits.dev) ASCIIText (itself ported from
  codepen.io/JuanFuentes/pen/eYEeoyE). Renders text on a wavy 3D plane (THREE) then
  ASCII-ifies it into a <pre>. Loaded as <script defer> (after three.js) so it's ready
  before the loader's fonts.ready animation. Uses the site's Space Mono (already loaded)
  to avoid an extra font fetch. Exposes window.AsciiTextMount(container, opts) -> dispose.

  Bottom: a self-contained loader init that renders 'lucy liu' into #ll-asciitext and
  disposes on the loader's existing 'loader:exit' event — the loader IIFE and its guards
  are untouched. If THREE is unavailable, it reveals the #ll-ascii fallback instead.
*/
(function () {
  'use strict';

  var vertexShader = [
    'varying vec2 vUv;',
    'uniform float uTime;',
    'uniform float uEnableWaves;',
    'void main() {',
    '  vUv = uv;',
    '  float time = uTime * 5.;',
    '  float waveFactor = uEnableWaves;',
    '  vec3 transformed = position;',
    '  transformed.x += sin(time + position.y) * 0.5 * waveFactor;',
    '  transformed.y += cos(time + position.z) * 0.15 * waveFactor;',
    '  transformed.z += sin(time + position.x) * waveFactor;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);',
    '}'
  ].join('\n');

  var fragmentShader = [
    'varying vec2 vUv;',
    'uniform float uTime;',
    'uniform sampler2D uTexture;',
    'void main() {',
    '  float time = uTime;',
    '  vec2 pos = vUv;',
    '  float r = texture2D(uTexture, pos + cos(time * 2. - time + pos.x) * .01).r;',
    '  float g = texture2D(uTexture, pos + tan(time * .5 + pos.x - time) * .01).g;',
    '  float b = texture2D(uTexture, pos - cos(time * 2. + time + pos.y) * .01).b;',
    '  float a = texture2D(uTexture, pos).a;',
    '  gl_FragColor = vec4(r, g, b, a);',
    '}'
  ].join('\n');

  function mapRange(n, a, b, c, d) { return ((n - a) / (b - a)) * (d - c) + c; }
  var PX_RATIO = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  var MONO = "'Space Mono', 'Courier New', monospace";

  function AsciiFilter(renderer, opts) {
    opts = opts || {};
    this.renderer = renderer;
    this.domElement = document.createElement('div');
    var s = this.domElement.style;
    s.position = 'absolute'; s.top = '0'; s.left = '0'; s.width = '100%'; s.height = '100%';
    this.pre = document.createElement('pre');
    this.domElement.appendChild(this.pre);
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.domElement.appendChild(this.canvas);
    this.deg = 0;
    this.invert = opts.invert != null ? opts.invert : true;
    this.fontSize = opts.fontSize || 12;
    this.fontFamily = opts.fontFamily || MONO;
    this.charset = opts.charset || " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
    this.context.imageSmoothingEnabled = false;
    this.onMouseMove = this.onMouseMove.bind(this);
    document.addEventListener('mousemove', this.onMouseMove);
  }
  AsciiFilter.prototype.setSize = function (w, h) {
    this.width = w; this.height = h;
    this.renderer.setSize(w, h);
    this.reset();
    this.center = { x: w / 2, y: h / 2 };
    this.mouse = { x: this.center.x, y: this.center.y };
  };
  AsciiFilter.prototype.reset = function () {
    this.context.font = this.fontSize + 'px ' + this.fontFamily;
    var charWidth = this.context.measureText('A').width;
    this.cols = Math.floor(this.width / (this.fontSize * (charWidth / this.fontSize)));
    this.rows = Math.floor(this.height / this.fontSize);
    this.canvas.width = this.cols; this.canvas.height = this.rows;
    var ps = this.pre.style;
    ps.fontFamily = this.fontFamily; ps.fontSize = this.fontSize + 'px';
    ps.margin = '0'; ps.padding = '0'; ps.lineHeight = '1em';
    ps.position = 'absolute'; ps.left = '0'; ps.top = '0'; ps.zIndex = '9';
    ps.backgroundAttachment = 'fixed'; ps.mixBlendMode = 'difference';
  };
  AsciiFilter.prototype.render = function (scene, camera) {
    this.renderer.render(scene, camera);
    var w = this.canvas.width, h = this.canvas.height;
    this.context.clearRect(0, 0, w, h);
    if (this.context && w && h) this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
    this.asciify(this.context, w, h);
    this.hue();
  };
  AsciiFilter.prototype.onMouseMove = function (e) { this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO }; };
  AsciiFilter.prototype.hue = function () {
    var dx = this.mouse.x - this.center.x, dy = this.mouse.y - this.center.y;
    var deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    this.deg += (deg - this.deg) * 0.075;
    this.domElement.style.filter = 'hue-rotate(' + this.deg.toFixed(1) + 'deg)';
  };
  AsciiFilter.prototype.asciify = function (ctx, w, h) {
    if (!w || !h) return;
    var imgData = ctx.getImageData(0, 0, w, h).data;
    var str = '';
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = x * 4 + y * 4 * w;
        var r = imgData[i], g = imgData[i + 1], b = imgData[i + 2], a = imgData[i + 3];
        if (a === 0) { str += ' '; continue; }
        var gray = (0.3 * r + 0.6 * g + 0.1 * b) / 255;
        var idx = Math.floor((1 - gray) * (this.charset.length - 1));
        if (this.invert) idx = this.charset.length - idx - 1;
        str += this.charset[idx];
      }
      str += '\n';
    }
    this.pre.innerHTML = str;
  };
  AsciiFilter.prototype.dispose = function () { document.removeEventListener('mousemove', this.onMouseMove); };

  function CanvasTxt(txt, opts) {
    opts = opts || {};
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.txt = txt;
    this.fontSize = opts.fontSize || 200;
    this.fontFamily = opts.fontFamily || MONO;
    this.color = opts.color || '#fdf9f3';
    this.font = '600 ' + this.fontSize + 'px ' + this.fontFamily;
  }
  CanvasTxt.prototype.resize = function () {
    this.context.font = this.font;
    var m = this.context.measureText(this.txt);
    this.canvas.width = Math.ceil(m.width) + 20;
    this.canvas.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 20;
  };
  CanvasTxt.prototype.render = function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = this.color;
    this.context.font = this.font;
    var m = this.context.measureText(this.txt);
    this.context.fillText(this.txt, 10, 10 + m.actualBoundingBoxAscent);
  };

  function CanvAscii(o, container, width, height) {
    this.textString = o.text; this.asciiFontSize = o.asciiFontSize; this.textFontSize = o.textFontSize;
    this.textColor = o.textColor; this.planeBaseHeight = o.planeBaseHeight; this.enableWaves = o.enableWaves;
    this.container = container; this.width = width; this.height = height;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    this.camera.position.z = 30;
    this.scene = new THREE.Scene();
    this.mouse = { x: width / 2, y: height / 2 };
    this.onMouseMove = this.onMouseMove.bind(this);
  }
  CanvAscii.prototype.init = function () {
    var self = this;
    return (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
      self.setMesh(); self.setRenderer();
    });
  };
  CanvAscii.prototype.setMesh = function () {
    this.textCanvas = new CanvasTxt(this.textString, { fontSize: this.textFontSize, fontFamily: MONO, color: this.textColor });
    this.textCanvas.resize(); this.textCanvas.render();
    this.texture = new THREE.CanvasTexture(this.textCanvas.canvas);
    this.texture.minFilter = THREE.NearestFilter;
    var aspect = this.textCanvas.canvas.width / this.textCanvas.canvas.height;
    var planeH = this.planeBaseHeight, planeW = planeH * aspect;
    this.geometry = new THREE.PlaneGeometry(planeW, planeH, 36, 36);
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexShader, fragmentShader: fragmentShader, transparent: true,
      uniforms: { uTime: { value: 0 }, mouse: { value: 1.0 }, uTexture: { value: this.texture }, uEnableWaves: { value: this.enableWaves ? 1.0 : 0.0 } }
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  };
  CanvAscii.prototype.setRenderer = function () {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.filter = new AsciiFilter(this.renderer, { fontFamily: MONO, fontSize: this.asciiFontSize, invert: true });
    this.container.appendChild(this.filter.domElement);
    this.setSize(this.width, this.height);
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('touchmove', this.onMouseMove);
  };
  CanvAscii.prototype.setSize = function (w, h) {
    this.width = w; this.height = h;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.filter.setSize(w, h); this.center = { x: w / 2, y: h / 2 };
  };
  CanvAscii.prototype.load = function () {
    var self = this;
    (function frame() { self.animationFrameId = requestAnimationFrame(frame); self.render(); })();
  };
  CanvAscii.prototype.onMouseMove = function (evt) {
    var e = evt.touches ? evt.touches[0] : evt;
    var b = this.container.getBoundingClientRect();
    this.mouse = { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  CanvAscii.prototype.render = function () {
    var time = new Date().getTime() * 0.001;
    this.textCanvas.render(); this.texture.needsUpdate = true;
    this.mesh.material.uniforms.uTime.value = Math.sin(time);
    var x = mapRange(this.mouse.y, 0, this.height, 0.5, -0.5);
    var y = mapRange(this.mouse.x, 0, this.width, -0.5, 0.5);
    this.mesh.rotation.x += (x - this.mesh.rotation.x) * 0.05;
    this.mesh.rotation.y += (y - this.mesh.rotation.y) * 0.05;
    this.filter.render(this.scene, this.camera);
  };
  CanvAscii.prototype.dispose = function () {
    cancelAnimationFrame(this.animationFrameId);
    if (this.filter) { this.filter.dispose(); if (this.filter.domElement.parentNode) try { this.container.removeChild(this.filter.domElement); } catch (e) {} }
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('touchmove', this.onMouseMove);
    try { this.geometry && this.geometry.dispose(); this.material && this.material.dispose(); } catch (e) {}
    if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); }
  };

  function AsciiTextMount(container, opts) {
    opts = opts || {};
    if (!container || typeof THREE === 'undefined') return function () {};
    var rect = container.getBoundingClientRect();
    var w = rect.width || container.offsetWidth || 1, h = rect.height || container.offsetHeight || 1;
    var inst = new CanvAscii({
      text: opts.text || 'Hello',
      asciiFontSize: opts.asciiFontSize != null ? opts.asciiFontSize : 8,
      textFontSize: opts.textFontSize != null ? opts.textFontSize : 200,
      textColor: opts.textColor || '#fdf9f3',
      planeBaseHeight: opts.planeBaseHeight != null ? opts.planeBaseHeight : 8,
      enableWaves: opts.enableWaves != null ? opts.enableWaves : true
    }, container, w, h);
    var disposed = false, ro = null;
    inst.init().then(function () {
      if (disposed) { inst.dispose(); return; }
      inst.load();
      ro = new ResizeObserver(function (entries) {
        if (!entries[0]) return;
        var r = entries[0].contentRect;
        if (r.width > 0 && r.height > 0) inst.setSize(r.width, r.height);
      });
      ro.observe(container);
      if (opts.onReady) opts.onReady();
    }).catch(function () {});
    return function () { disposed = true; if (ro) try { ro.disconnect(); } catch (e) {} inst.dispose(); };
  }
  window.AsciiTextMount = AsciiTextMount;

  // ── Loader "lucy liu" name ─────────────────────────────────────────────
  try {
    var loaderEl = document.getElementById('ll-loader');
    var host = document.getElementById('ll-asciitext');
    var reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (loaderEl && host && !reduced && !document.body.classList.contains('loader-done')) {
      if (typeof THREE === 'undefined') {
        loaderEl.classList.remove('has-asciitext');  // fall back to #ll-ascii
      } else {
        var disposeAscii = AsciiTextMount(host, {
          text: 'lucy liu', asciiFontSize: 8, textFontSize: 200, planeBaseHeight: 8,
          enableWaves: true, textColor: '#A0C8FF',
          onReady: function () { loaderEl.classList.add('has-asciitext'); }  // hide the #ll-ascii fallback once we're rendering
        });
        window.addEventListener('loader:exit', function () {
          setTimeout(function () { try { if (disposeAscii) disposeAscii(); } catch (e) {} }, 700);
        }, { once: true });
      }
    }
  } catch (e) {}
})();
