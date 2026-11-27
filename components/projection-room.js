/* Same stage, palette and Bayer grid as HeroRoom. Cached room + foreground, no idle RAF.
   The new rear drawing is never used as a side-view stand-in or a fake rotation. */
(function (root) {
  'use strict';
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16 - 0.5; });
  var table = null;
  function paletteLUT(pal) {
    if (table) return table;
    table = new Uint8Array(32768);
    for (var r = 0; r < 32; r++) for (var g = 0; g < 32; g++) for (var b = 0; b < 32; b++) {
      var best = 0, dist = Infinity;
      pal.forEach(function (c, i) { var dr = r * 255 / 31 - c[0], dg = g * 255 / 31 - c[1], db = b * 255 / 31 - c[2], d = 0.8 * dr * dr + 1.1 * dg * dg + 0.7 * db * db; if (d < dist) { dist = d; best = i; } });
      table[(r << 10) | (g << 5) | b] = best;
    }
    return table;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mount(host, bg, fg) {
    var H = root.HeroRoom;
    if (!H || !bg || !fg) return null;
    var disposed = false, timer = 0, dirty = true, visible = false, W = 0, HH = 0;
    var bx = bg.getContext('2d'), fx = fg.getContext('2d');
    if (!bx || !fx) return null;
    var lut = H.paletteLUT ? H.paletteLUT() : paletteLUT(H.PAL);
    var pal = new Uint32Array(H.PAL.map(function (c) { return ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; }));
    var sprite = new Image(); sprite.decoding = 'async';
    var cut = document.createElement('canvas'), mask = document.createElement('canvas');
    var info = { renders: 0, roomPaints: 0, running: false, ready: false, W: 0, H: 0 };
    function prepare() {
      // Render the high-res source onto the hero's coarse sprite grid. Ignore the image
      // tool's translucent atmosphere, keeping the opaque pixel silhouette and its shading.
      cut.width = 192; cut.height = 128; mask.width = 192; mask.height = 128;
      var cx = cut.getContext('2d', { willReadFrequently: true }); cx.imageSmoothingEnabled = false;
      cx.drawImage(sprite, 0, 0, 192, 128);
      var d = cx.getImageData(0, 0, 192, 128), m = mask.getContext('2d').createImageData(192, 128);
      for (var i = 0; i < d.data.length; i += 4) {
        var alpha = d.data[i + 3] >= 220 ? 255 : 0;
        d.data[i + 3] = alpha; m.data[i] = 9; m.data[i + 1] = 11; m.data[i + 2] = 30; m.data[i + 3] = alpha;
      }
      cx.putImageData(d, 0, 0); mask.getContext('2d').putImageData(m, 0, 0);
      info.ready = true; dirty = true; paint();
    }
    function paint() {
      if (disposed || !dirty || !visible || document.hidden || document.body.classList.contains('about-locked')) return;
      var box = host.querySelector('.pr-world').getBoundingClientRect(), rp = H.roomPixel(box.width, box.height, Math.min(devicePixelRatio || 1, 3));
      W = Math.ceil(box.width * Math.min(devicePixelRatio || 1, 3) / rp.K); HH = Math.ceil(box.height * Math.min(devicePixelRatio || 1, 3) / rp.K);
      var cap = Math.min(1, Math.sqrt(135000 / (W * HH))); W = Math.round(W * cap); HH = Math.round(HH * cap);
      bg.width = fg.width = W; bg.height = fg.height = HH; info.W = W; info.H = HH;
      var phone = box.width < 761, hz = Math.round(HH * (phone ? 0.67 : 0.68));
      var im = bx.createImageData(W, HH), out = new Uint32Array(im.data.buffer);
      var st = H.stageOf(W, HH, false), vpy = hz - HH * 0.95, P = 2400 / (HH - vpy);
      // The hero's albedo, ambient falloff, footlight fields and palette quantization.
      for (var y = 0, k = 0; y < HH; y++) for (var x = 0; x < W; x++, k++) {
        var a = [0.86, 0.89, 0.98], f = [];
        if (y >= hz) {
          var sp = P * (y - vpy) / 100, u = (x - W * 0.5) / (y - vpy) * 100 / P;
          var seam = Math.abs(((u % 1) + 1.5) % 1 - 0.5) * sp < 0.55 ? 0.7 : 1;
          a = [0.36 * seam, 0.38 * seam, 0.5 * seam];
        }
        if (y >= hz - 1 && y <= hz + 1) a = a.map(function (v) { return v * 0.4; });
        for (var li = 0; li < 2; li++) {
          var lx = st.lamps[li].x;
          if (y < hz) { var gx = (x - lx) / (W * 0.6), vy = (hz - y) / hz; f[li] = Math.exp(-gx * gx) * (1 - 0.5 * vy * vy) * st.lamps[li].k; }
          else { var hx = (x - lx) / (W * 0.32), hy = (HH + 10 - y) / (HH - hz + 34); f[li] = Math.exp(-(hx * hx + hy * hy) * 1.3) * 1.35 * st.lamps[li].k; }
        }
        var vign = 1 - 0.55 * Math.pow(Math.hypot((x / W - 0.5) * 1.1, y / HH - 0.42), 2), dd = BAYER[((y & 3) << 2) | (x & 3)] * 0.075;
        var c = [0, 0, 0], ambient = [0.03, 0.036, 0.085], blue = [0.4, 0.64, 1], lav = [0.76, 0.62, 1];
        for (var ch = 0; ch < 3; ch++) c[ch] = clamp(Math.round((a[ch] * (ambient[ch] * vign + (blue[ch] * f[0] + lav[ch] * f[1]) * H.LIGHT) + dd) * 31), 0, 31);
        out[k] = pal[lut[(c[0] << 10) | (c[1] << 5) | c[2]]];
      }
      bx.putImageData(im, 0, 0); info.roomPaints++;
      // He sits on the projector (Lucy, 2026-10-24: "i want him to be on the projector"): its back faces
      // us, he sits on its top face and his tail hangs over the back edge. The rear drawing's feet are at
      // 0.745 of its height and its seat is centred at 0.47 of its width.
      var cw = W * (phone ? 0.42 : 0.25), chh = cw * 2 / 3, dx = W * 0.04;
      var floor = HH * (phone ? 0.985 : 0.875), foot = Math.max(1, Math.round(cw * 0.015));
      var bw = Math.round(cw * 0.6), bh = Math.round(cw * 0.2), td = Math.max(2, Math.round(cw * 0.05));
      var bl = Math.round(dx + cw * 0.47 - bw / 2), fb = Math.round(floor) - foot, ft = fb - bh;
      var dy = ft - td * 0.45 - chh * 0.745;
      // The beam leaves the lens at the front of the projector, behind him, and fans out to the real
      // screen; the screen itself is left dark here because the picture blends over it with screen.
      var world = host.querySelector('.pr-world'), scr = host.querySelector('.pr-screen');
      var sx = W / world.offsetWidth, sy = HH / world.offsetHeight;
      var s0 = { x: scr.offsetLeft * sx, y: scr.offsetTop * sy }, s1 = { x: (scr.offsetLeft + scr.offsetWidth) * sx, y: (scr.offsetTop + scr.offsetHeight) * sy };
      var lens = { x: bl + bw / 2, y: ft - td };
      // The beam is the lens joined to each edge of the screen: a point is lit if it falls in one of
      // those four triangles, wherever the lens sits.
      var corners = [s0, { x: s1.x, y: s0.y }, s1, { x: s0.x, y: s1.y }];
      var side = function (p, q, x, y) { return (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x); };
      var inside = function (x, y) {
        for (var i = 0; i < 4; i++) {
          var a = corners[i], b = corners[(i + 1) % 4], d1 = side(lens, a, x, y), d2 = side(a, b, x, y), d3 = side(b, lens, x, y);
          if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true;
        }
        return false;
      };
      bx.fillStyle = 'rgba(170,186,252,.18)';
      for (y = Math.max(0, Math.floor(s0.y)); y < lens.y; y++) for (x = 0; x < W; x++) {
        if (x >= s0.x && x < s1.x && y >= s0.y && y < s1.y) continue;
        // Densest at the lens, thinning to the room's old 0.2 cut by the screen, so the light reads as his.
        var t = Math.min(1, (lens.y - y) / Math.max(1, lens.y - s1.y));
        if (BAYER[((y & 3) << 2) | (x & 3)] > 0.35 * t - 0.15 && inside(x + 0.5, y + 0.5)) bx.fillRect(x, y, 1, 1);
      }
      fx.clearRect(0, 0, W, HH); fx.imageSmoothingEnabled = false;
      if (info.ready) {
        // A rear silhouette enlarged upward from the stage lights, just as in HeroRoom.
        fx.save();
        fx.beginPath(); fx.rect(0, 0, W, hz); fx.clip(); fx.globalAlpha = 0.55;
        fx.drawImage(mask, dx - cw * 0.15, dy - chh * 1.7, cw * 1.65, chh * 2.9); fx.restore();
      }
      // The projector from behind, in the hero's colours: its top face, the back panel with vent slats
      // lit by the lamp inside, a power LED, two feet and a cable to the floor.
      var put = function (c, x, y, w, h) { fx.fillStyle = c; fx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
      fx.fillStyle = 'rgba(5,6,15,.7)'; fx.beginPath(); fx.ellipse(bl + bw / 2, fb + foot, bw * 0.62, Math.max(2, HH * 0.008), 0, 0, Math.PI * 2); fx.fill();
      put('#05060f', bl + 2, fb, 3, foot); put('#05060f', bl + bw - 5, fb, 3, foot);
      for (var r = 0; r < td; r++) { var ins = Math.round((td - r) * 0.6); put(r === 0 ? '#5c649e' : '#2f3352', bl + ins, ft - td + r, bw - ins * 2, 1); }
      // The lens faces the screen, away from us, so its light shows as a glow off the far lip, either side of him.
      for (x = bl + td; x < bl + bw - td; x++) {
        var lb = BAYER[(((ft - td - 1) & 3) << 2) | (x & 3)];
        if (lb > -0.1) put(lb > 0.25 ? '#ced6fc' : '#7681cc', x, ft - td - 1, 1, 1);
        if (lb > 0.3) put('#5c649e', x, ft - td - 2, 1, 1);
      }
      put('#0e122e', bl, ft, bw, bh); put('#444a75', bl, ft, bw, 1); put('#090b1e', bl, fb - 1, bw, 1);
      put('#1e2033', bl, ft + 1, 1, bh - 2); put('#1e2033', bl + bw - 1, ft + 1, 1, bh - 2);
      var vx = Math.round(bl + bw * 0.12), vw = Math.round(bw * 0.5);
      for (y = ft + 3; y < fb - 2; y += 3) {
        put('#05060f', vx, y, vw, 1);
        for (x = vx; x < vx + vw; x++) {
          var b = BAYER[((y & 3) << 2) | (x & 3)], mid = 1 - Math.abs((x - vx) / vw - 0.5) * 2;
          if (b + mid * 0.35 > 0.25) put(mid > 0.55 && b > 0 ? '#9b7ecc' : '#594975', x, y, 1, 1);
        }
      }
      put('#1e2033', bl + bw * 0.7, ft + bh * 0.55, bw * 0.2, Math.max(2, bh * 0.2));
      put('#2f4b75', bl + bw * 0.8 - 1, ft + bh * 0.3, 4, 1); put('#66a3ff', bl + bw * 0.8, ft + bh * 0.3, 2, 1);
      var cx0 = Math.round(bl + bw * 0.88);
      put('#090b1e', cx0, fb - 2, 1, foot + 3);
      for (var i = 0; i < cw * 0.4; i++) put('#090b1e', cx0 + i, floor + 1 + Math.round(Math.sin(i / (cw * 0.4) * Math.PI) * 1.5), 1, 1);
      info.projector = { x: bl, y: ft - td, w: bw, h: fb + foot - (ft - td), W: W, H: HH };
      if (info.ready) {
        // He sits on its top face; his tail hangs over the back panel, toward us.
        fx.drawImage(cut, dx, dy, cw, chh);
        info.creature = { x: dx, y: dy, w: cw, h: chh };
      }
      dirty = false; info.renders++;
    }
    function relayout() { dirty = true; paint(); }
    function schedule() { clearTimeout(timer); timer = setTimeout(relayout, 130); }
    function visibility() { if (!document.hidden && !document.body.classList.contains('about-locked')) paint(); }
    var io = new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; if (visible) paint(); }); io.observe(host);
    var ro = new ResizeObserver(schedule); ro.observe(host.querySelector('.pr-world'));
    sprite.onload = prepare; sprite.src = 'assets/projection/rear.webp';
    document.addEventListener('visibilitychange', visibility); document.addEventListener('lucy:scene-visibility', visibility);
    return { info: info, relayout: relayout, dispose: function () { disposed = true; clearTimeout(timer); io.disconnect(); ro.disconnect(); sprite.onload = null; document.removeEventListener('visibilitychange', visibility); document.removeEventListener('lucy:scene-visibility', visibility); bg.width = fg.width = 0; } };
  }
  root.ProjectionRoom = { mount: mount };
})(window);
