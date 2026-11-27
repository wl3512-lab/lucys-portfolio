/* s0mped: the creature, caught with the stone.
   Frames from docs/projects/portfolio-character/s0mped-caught-v1 (caught.json + three sheets).
   A short opening before the gem chapter. As the chapter arrives the gag plays at its own pace:
   admire, caught, clench, innocent, shine, busted. Then the creature waits, frozen, until the
   shine is clicked or tapped (or Enter on its button). A click plays the push into the blades;
   the camera keeps closing in until his pixel stone sits where the chapter draws its stone, and
   its pixels resolve into the real one while the page glides to the chapter. Scrolling on
   without a click plays the same push, scrubbed, so nobody gets stuck (Lucy, 2026-10-21: "click is the reward"). Plain JS, window.GemCaught. */
(function () {
  'use strict';
  // The push's own frames end at 95. From there the camera keeps closing in on the stone until
  // it sits exactly where, and as big as, the chapter draws it (ZOOM); the close-up then fades
  // over the real render (FADE) while the render's pixels resolve to full detail (RES), and the
  // chapter's identical frame takes over (SWAP) before this canvas lets go (END).
  var FPS = 24, WAIT = 71, PUSH0 = 72, PUSH_END = 95, SHINE = [90, 104], ZOOM = [95, 110], FADE = [101, 111], RES = [110, 122], SWAP = 122, END = 128;
  // Where the stone sits in the chapter's first frame (o00_l2, 768 px): its alpha box is
  // 87,257 to 681,585, so its centre is 37 px below the frame's and its size (the square root of
  // its area) is 0.575 of the frame.
  var GEM_DY = 37 / 768, GEM_SIZE = Math.sqrt(594 * 328) / 768;
  // Where he is drawn in his 256 x 171 frames: the union of his opaque pixels over the gag and wait sheets
  // (x0, y0, x1, y1, measured; the push frames are the close-up, framed by viewMap).
  var DRAWN = [20, 8, 228, 159];
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  var WAIT_ZONE = 0.42;   // how much of the opening you can scroll, unclicked, before the push starts

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function load(src) { return new Promise(function (res, rej) { var im = new Image(); im.decoding = 'async'; im.onload = function () { res(im); }; im.onerror = rej; im.src = src; }); }

  function mount(root, opts) {
    var base = opts.base, coarse = window.matchMedia('(pointer: coarse)').matches;
    var cv = document.createElement('canvas'); cv.className = 'gem-caught'; cv.setAttribute('aria-hidden', 'true');
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gem-shine'; btn.hidden = true;
    btn.setAttribute('aria-label', 'Look closer at the shine');
    var hint = document.createElement('span'); hint.className = 'gem-shine-hint'; hint.setAttribute('aria-hidden', 'true');
    hint.textContent = coarse ? 'Tap the shine' : 'Click the shine';
    root.appendChild(cv); root.appendChild(btn); root.appendChild(hint);
    var ctx = cv.getContext('2d');
    // The close-up frames were cropped for a framed stage; on the open page their edges would
    // be hard lines, so each one is softened into the dark through an oval mask.
    var soft = document.createElement('canvas'), sx = soft.getContext('2d');
    var gem = document.createElement('canvas'), gx = gem.getContext('2d');

    var D = null, sheets = {}, stoneImg = null, pushLoading = false;
    var g = 0, frame = 0, started = false, arrivedAt = 0, gagDone = false, clicked = false, waitTick = 0, waitAt = 0;
    var raf = 0, last = 0, acc = 0, disposed = false, chapterOn = -1, hold = false, dirty = true, visible = true;

    Promise.all([fetch(base + 'caught.json?v=stone3').then(function (r) { return r.json(); }), load(base + 'caught.webp?v=stone3'), load(base + 'wait.webp?v=stone3'), load(opts.gemSrc)])
      .then(function (a) { D = a[0]; sheets.gag = a[1]; sheets.wait = a[2]; stoneImg = a[3]; kick(); })
      .catch(function (e) { console.error('gem-caught', e); opts.onChapter(1); });
    function loadPush() {
      if (pushLoading) return; pushLoading = true;
      load(base + 'push.webp?v=stone3').then(function (im) { sheets.push = im; dirty = true; kick(); }).catch(function () {});
    }

    function stoneEnd() {
      var b = D.stone_end_px;
      if (b) return { cx: b[0] + b[2] / 2, cy: b[1] + b[3] / 2, size: Math.sqrt(b[2] * b[3]) };
      return { cx: 136, cy: 91.5, size: 23.6 };   // measured from push frame 23 until the frames carry it
    }
    // Frame pixels to device pixels for push frame pi at time `frame`: the drawn push follows
    // push_view_px, then the camera eases on toward the chapter's stone (T, device px).
    function viewMap(pi, bw, x0, y0, T) {
      var v = D.push_view_px ? D.push_view_px[pi] : [0, 0, 256, 171];
      var m = bw / v[2], ox = x0 - v[0] * m, oy = y0 - v[1] * m;
      if (frame <= PUSH_END) return { m: m, ox: ox, oy: oy };
      var e = easeInOut(clamp((frame - ZOOM[0]) / (ZOOM[1] - ZOOM[0]))), S = stoneEnd();
      var cx0 = ox + S.cx * m, cy0 = oy + S.cy * m, mt = T.size / S.size;
      var mm = Math.exp(Math.log(m) + (Math.log(mt) - Math.log(m)) * e);
      var cx = cx0 + (T.cx - cx0) * e, cy = cy0 + (T.cy - cy0) * e;
      return { m: mm, ox: cx - S.cx * mm, oy: cy - S.cy * mm };
    }
    function frameAt(kind, i) {
      var S = D.sheets[kind], w = S.frame_size[0], h = S.frame_size[1];
      return [sheets[kind], (i % S.cols) * w, Math.floor(i / S.cols) * h, w, h];
    }
    // The current frame: time owns the gag and a clicked push; scroll owns an unclicked push.
    function step(dt) {
      if (hold) return;   // test hook (__gemCaughtSeek): a seeked frame stays put
      // Start as the section arrives: its top in the upper fifth of the screen, held for a beat,
      // so a layout still settling at page load cannot start it off screen.
      var top = root.getBoundingClientRect().top, vh = window.innerHeight;
      if (!started) {
        var here = g > 0 || (top <= vh * 0.22 && top > -vh * 0.5);
        if (!here) { arrivedAt = 0; frame = 0; return; }
        if (!arrivedAt) arrivedAt = performance.now();
        if (performance.now() - arrivedAt < 250) { frame = 0; return; }
        started = true; loadPush();
      }
      // Gone well above or below the section, unclicked or finished: it plays again next time.
      if ((top > vh || top < -vh * (opts.total() + 0.5)) && (!clicked || frame >= END)) { started = false; gagDone = false; clicked = false; frame = 0; arrivedAt = 0; return; }
      if (clicked && frame >= END && g < WAIT_ZONE * 0.5) clicked = false;   // scrolled back up after the push: busted again
      if (clicked) { acc += dt; while (acc >= 1 / FPS) { acc -= 1 / FPS; if (frame < END) frame++; } return; }
      if (g > WAIT_ZONE) { frame = PUSH0 + Math.round(clamp((g - WAIT_ZONE) / (1 - WAIT_ZONE)) * (END - PUSH0)); gagDone = true; return; }
      if (!gagDone) { acc += dt; while (acc >= 1 / FPS) { acc -= 1 / FPS; if (frame < WAIT) frame++; else { gagDone = true; waitAt = performance.now(); } } return; }
      frame = WAIT;
      acc += dt; while (acc >= 1 / FPS) { acc -= 1 / FPS; waitTick++; }
    }
    function draw() {
      var r = root.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = false;
      var stone = opts.stone();   // { cx, cy, s } in section px, where the chapter draws the stone
      var fw = D.sheets.gag.frame_size[0], fh = D.sheets.gag.frame_size[1];
      // He takes the stage: the largest whole number of device pixels per sprite pixel that fits HIM
      // (DRAWN, his outline over every gag and wait frame, not the frame's empty margins) in nearly
      // all the width and four fifths of the height, centred (Lucy, 2026-10-28: "scale dragon and gem up").
      var k = Math.max(1, Math.floor(Math.min(W * 0.96 / (DRAWN[2] - DRAWN[0]), H * 0.8 / (DRAWN[3] - DRAWN[1]))));
      var sh = D.shine_px;
      var x0 = Math.round(W / 2 - (DRAWN[0] + DRAWN[2]) / 2 * k), y0 = Math.round(H * 0.52 - (DRAWN[1] + DRAWN[3]) / 2 * k);
      var waiting = started && gagDone && !clicked && g <= WAIT_ZONE;
      if (waiting) {
        var a = frameAt('wait', waitTick % D.sheets.wait.frames); ctx.drawImage(a[0], a[1], a[2], a[3], a[4], x0, y0, a[3] * k, a[4] * k);
      } else if (frame <= WAIT) {
        var b = frameAt('gag', frame); ctx.drawImage(b[0], b[1], b[2], b[3], b[4], x0, y0, b[3] * k, b[4] * k);
      } else if (frame < END && sheets.push) {
        var pi = Math.min(frame - PUSH0, D.sheets.push.frames - 1), c = frameAt('push', pi);
        var sd = stone.s * dpr, T = { cx: stone.cx * dpr, cy: stone.cy * dpr + GEM_DY * sd, size: GEM_SIZE * sd };
        var vm = viewMap(pi, fw * k, x0, y0, T), S = stoneEnd();
        var scx = vm.ox + S.cx * vm.m, scy = vm.oy + S.cy * vm.m;   // the stone's centre on screen now
        var fade = smooth(FADE[0], FADE[1], frame);
        // Under the close-up: the real stone, the same size and place as his pixel stone and in
        // pixels just as big, resolving to the render. It shows as the close-up fades off it.
        if (frame >= FADE[0] - 1 && stoneImg) {
          var imgS = S.size * vm.m / GEM_SIZE, ix = scx - imgS / 2, iy = scy - GEM_DY * imgS - imgS / 2;
          var r = smooth(RES[0], RES[1], frame), B = Math.exp(Math.log(Math.max(1, vm.m)) * (1 - r));
          var hand = 1 - smooth(SWAP, END, frame);   // the chapter's identical frame is underneath by now
          var crisp = smooth(1.15, 1.9, B);         // the last steps cross into the smooth render
          ctx.globalAlpha = fade * hand * crisp;
          if (ctx.globalAlpha > 0.01) {
            var n = Math.max(2, Math.round(imgS / B));
            if (gem.width !== n || gem.height !== n) { gem.width = n; gem.height = n; }
            gx.clearRect(0, 0, n, n); gx.imageSmoothingEnabled = true; gx.imageSmoothingQuality = 'high'; gx.drawImage(stoneImg, 0, 0, n, n);
            ctx.imageSmoothingEnabled = false; ctx.drawImage(gem, ix, iy, imgS, imgS);
          }
          ctx.globalAlpha = fade * hand * (1 - crisp);
          if (ctx.globalAlpha > 0.01) { ctx.imageSmoothingEnabled = true; ctx.drawImage(stoneImg, ix, iy, imgS, imgS); }
          ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
        }
        // The close-up magnifies his Medium frames (Lucy: keep the pixel density she picked): the
        // view is stretched over the stage with smoothing off, so the pixels themselves grow as
        // the camera closes in. Its edge fades into the dark through an oval.
        if (fade < 1) {
          var bw = fw * k, bh = fh * k;
          if (soft.width !== bw || soft.height !== bh) { soft.width = bw; soft.height = bh; }
          sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, bw, bh); sx.imageSmoothingEnabled = false;
          sx.drawImage(c[0], c[1], c[2], c[3], c[4], vm.ox - x0, vm.oy - y0, c[3] * vm.m, c[4] * vm.m);
          sx.globalCompositeOperation = 'destination-in';
          sx.save(); sx.translate(bw / 2, bh / 2); sx.scale(1, bh / bw);
          var mk = sx.createRadialGradient(0, 0, bw * 0.22, 0, 0, bw * 0.5);
          mk.addColorStop(0, 'rgba(0,0,0,1)'); mk.addColorStop(1, 'rgba(0,0,0,0)');
          sx.fillStyle = mk; sx.fillRect(-bw / 2, -bw / 2, bw, bw); sx.restore();
          ctx.globalAlpha = 1 - fade; ctx.drawImage(soft, x0, y0); ctx.globalAlpha = 1;
        }
        // The slim shine opens on the stone as the camera closes in, then lets go.
        if (frame >= SHINE[0] && frame < SHINE[1]) {
          var reach = smooth(SHINE[0], SHINE[0] + 8, frame), fadeS = 1 - smooth(SHINE[1] - 8, SHINE[1], frame);
          var L = Math.min(W, H) * (0.06 + 0.3 * reach), lw = Math.max(1, dpr);
          ctx.globalAlpha = fadeS;
          [[1, 0, 1], [-1, 0, 1], [0, 1, .8], [0, -1, .8], [.7, .7, .3], [-.7, .7, .3], [.7, -.7, .3], [-.7, -.7, .3]].forEach(function (v) {
            var gr = ctx.createLinearGradient(scx, scy, scx + v[0] * L * v[2], scy + v[1] * L * v[2]);
            gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.35, 'rgba(214,228,255,.55)'); gr.addColorStop(1, 'rgba(196,176,255,0)');
            ctx.strokeStyle = gr; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(scx, scy); ctx.lineTo(scx + v[0] * L * v[2], scy + v[1] * L * v[2]); ctx.stroke();
          });
          var core = ctx.createRadialGradient(scx, scy, 0, scx, scy, 14 * dpr + 30 * dpr * reach);
          core.addColorStop(0, 'rgba(255,255,255,.9)'); core.addColorStop(1, 'rgba(160,200,255,0)');
          ctx.fillStyle = core; ctx.fillRect(scx - 60 * dpr, scy - 60 * dpr, 120 * dpr, 120 * dpr);
          ctx.globalAlpha = 1;
        }
      } else if (frame < END) {   // the close-up is still loading: hold the busted pose
        var d = frameAt('wait', 0); ctx.drawImage(d[0], d[1], d[2], d[3], d[4], x0, y0, d[3] * k, d[4] * k);
      }
      // The shine as a real button while he waits, with a hint once he has waited a second.
      var bx = (x0 + sh[0] * k) / dpr, by = (y0 + sh[1] * k) / dpr;
      btn.hidden = !waiting; btn.style.left = bx + 'px'; btn.style.top = by + 'px';
      // the pill sits clear above the stone and the blade tips, never over the stone itself
      hint.style.left = bx + 'px'; hint.style.top = (by - 22 * k / dpr) + 'px';
      hint.classList.toggle('on', waiting && performance.now() - waitAt > 1100);
      // Hand over: the chapter's own stone takes the frame the gag grew.
      var on = frame >= SWAP ? 1 : 0;
      if (on !== chapterOn) { chapterOn = on; opts.onChapter(on); }
      cv.style.opacity = frame >= END ? '0' : '1';
    }
    function tick(now) {
      raf = 0;
      if (disposed || !D || !visible || document.hidden || document.body.classList.contains('about-locked')) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      var f0 = frame, w0 = waitTick, s0 = started;
      step(dt);
      if (dirty || frame !== f0 || waitTick !== w0 || started !== s0) { dirty = false; draw(); }
      // Run only while something moves on its own: the gag, a clicked push, the wait loop, or
      // the beat of arrival. A scrubbed push is drawn on each scroll update instead.
      var waiting = started && gagDone && !clicked && g <= WAIT_ZONE;
      var playing = started && ((!gagDone && !clicked) || (clicked && frame < END));
      if (waiting || playing || (!started && arrivedAt > 0)) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf && !disposed && visible && !document.hidden && !document.body.classList.contains('about-locked')) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    btn.addEventListener('click', function () {
      if (clicked) return;
      clicked = true; frame = Math.max(frame, PUSH0); acc = 0;
      opts.onLook(); kick();
    });
    // Before the pin, ScrollTrigger reports nothing; watch the scroll until the gag has started.
    function onScroll() { var r = root.getBoundingClientRect(); if (r.top < window.innerHeight * 2 && r.bottom > -window.innerHeight) { dirty = true; kick(); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    var seen = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (es) {
      visible = es[es.length - 1].isIntersecting;
      if (visible) { dirty = true; kick(); } else { cancelAnimationFrame(raf); raf = 0; }
    }, { rootMargin: '100% 0px' }) : null;
    if (seen) seen.observe(root);
    window.__gemCaught = function () { return { g: g, frame: frame, started: started, gagDone: gagDone, clicked: clicked }; };
    window.__gemCaughtSeek = function (f) { hold = f !== null; if (f === null) return; started = true; gagDone = true; clicked = true; frame = f; draw(); };
    function onVis() { if (document.hidden || document.body.classList.contains('about-locked')) { cancelAnimationFrame(raf); raf = 0; } else { dirty = true; kick(); } }
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('lucy:scene-visibility', onVis);
    return {
      update: function (v) { if (g !== v) dirty = true; g = v; kick(); },
      dispose: function () {
        disposed = true; cancelAnimationFrame(raf);
        document.removeEventListener('visibilitychange', onVis);
        document.removeEventListener('lucy:scene-visibility', onVis);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        if (seen) seen.disconnect();
        [cv, btn, hint].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        opts.onChapter(1);
      },
    };
  }
  window.GemCaught = { mount: mount, WAIT_ZONE: WAIT_ZONE };
})();
