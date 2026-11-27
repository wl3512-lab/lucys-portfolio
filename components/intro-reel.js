/* No libraries, canvas, video decoders or permanent animation loop. */
(function () {
  'use strict';
  var api = window.LucyIntro, root = document.getElementById('ll-loader');
  // ?heist plays the paperclip heist instead (components/heist-opening.js).
  if (!api || !root || window.__heist) return;
  var frames = Array.from(root.querySelectorAll('.intro-frame'));
  var raf = 0, start = 0, px = 0, py = 0, tx = 0, ty = 0, last = 0, mobile = false, spacing = 0, height = 0;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function resize() {
    mobile = innerWidth < 651;
    // Layout width stays stable while the reel is transformed.
    var w = frames[0].offsetWidth;
    spacing = w * .87; height = Math.min(innerHeight * .12, 100);
  }
  function paint(ms) {
    if (!root.classList.contains('intro-active') || root.classList.contains('is-done') || document.hidden) { raf = 0; return; }
    var dt = Math.min(48, ms - (last || ms)); last = ms;
    var a = 1 - Math.exp(-dt / 110); px += (tx - px) * a; py += (ty - py) * a;
    var t = (ms - start) / 1000;
    var open = 1 - Math.pow(1 - clamp(t / 1.05, 0, 1), 3);
    var phase = t * .55 + px * .8;
    frames.forEach(function (el, i) {
      var j = i - 3;
      var travel = mobile ? spacing * (1.6 - 3.2 * clamp(t / 3.1, 0, 1)) : 0;
      var x = j * spacing * (.16 + .84 * open) + travel + px * (mobile ? 150 : 130);
      var y = Math.sin(j * .72 + phase) * height + py * 40;
      var z = Math.cos(j * .72 + phase) * 95;
      var ry = Math.sin(j * .72 + phase) * 44;
      var rz = Math.cos(j * .6 + phase) * 8;
      el.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,' + z.toFixed(2) + 'px) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg)';
    });
    raf = requestAnimationFrame(paint);
  }
  function move(e) { tx = clamp(e.clientX / innerWidth * 2 - 1, -1, 1); ty = clamp(e.clientY / innerHeight * 2 - 1, -1, 1); }
  function stop() { cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', resize); root.removeEventListener('pointermove', move); }
  function begin() {
    stop(); px = py = tx = ty = 0; last = 0; start = performance.now();
    frames.forEach(function (el) { var img = el.querySelector('img'); if (img.dataset.src && !img.getAttribute('src')) img.src = img.dataset.src; });
    root.classList.add('intro-live');
    resize(); window.addEventListener('resize', resize, { passive: true }); root.addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(paint);
  }
  api.mount(begin, stop);
})();
