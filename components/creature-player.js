/*
 * The creature at the Capabilities entrance: plays the frames the creature project ships
 * (docs/projects/portfolio-character/, copied to assets/creature/) under a fixed contract.
 *   loop    the idle loop, seamless
 *   action  notice and flick; frame 0 is pixel-identical to loop frame 0
 *   exit    the hunt into the world; frame 0 is the last action frame
 * Frames are 256x171 (Medium density), drawn at a whole-number scale with
 * image-rendering: pixelated. Moving into the action from any other loop frame dissolves over
 * 0.25s. The exit is placed by translation only: his centre in the leap (exit.anchor) travels
 * from his seat toward the landing point by each frame's `path`, raised by its `lift`; at
 * `vanish_frame` he is gone and the pixel flares, as if caught.
 *
 * Plain script, needs window.NightDriveMath. window.CreaturePlayer = { load, create, pick }.
 */
(function () {
  'use strict';
  var M = window.NightDriveMath;
  var cache = {};

  function bitmap(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.blob();
    }).then(function (b) {
      if (typeof createImageBitmap === 'function') return createImageBitmap(b);
      return new Promise(function (resolve, reject) {
        var im = new Image();
        im.onload = function () { resolve(im); };
        im.onerror = reject;
        im.src = URL.createObjectURL(b);
      });
    });
  }
  // The data first (the drive's timing comes from it), then the three sheets and the print.
  // Cached per folder, so a remount after the engine was released downloads nothing.
  // load(base, { exit: false }) skips the exit sheet and the print: the home page's With AI band only idles and flicks
  // (Lucy, 2026-10-31: the night drive moved to capabilities.html).
  function load(base, opts) {
    var withExit = !(opts && opts.exit === false), key = base + (withExit ? '' : '#loop');
    if (cache[key]) return cache[key];
    var p = fetch(base + 'flick.json').then(function (r) {
      if (!r.ok) throw new Error('flick.json ' + r.status);
      return r.json();
    }).then(function (data) {
      var file = function (src) { return base + String(src).split('/').pop(); };
      var pr = withExit && data.exit && data.exit.prints && data.exit.prints[0];
      return Promise.all([
        bitmap(file(data.sheets.loop.src)), bitmap(file(data.sheets.action.src)),
        withExit ? bitmap(file(data.sheets.exit.src)).catch(function () { return null; }) : null,
        pr ? bitmap(file(pr.src)).catch(function () { return null; }) : null,
      ]).then(function (b) {
        return { data: data, sheets: { loop: b[0], action: b[1], exit: b[2], print: b[3] } };
      });
    });
    cache[key] = p;
    p.catch(function () { delete cache[key]; });
    return p;
  }

  // Which frame shows at progress s (st carries the loop clock and the dissolve between calls).
  function pick(st, s, t, dt, data, hasExit) {
    var N = data.sheets.loop.frames, fr = M.creatureFrames(s, t), sheet, frame;
    if (s >= t.A1 && hasExit) { sheet = 'exit'; frame = Math.min(data.exit.frames - 1, Math.round(fr.e)); st.mode = 'action'; }
    else if (s >= t.A0) {
      if (st.mode === 'loop') {
        var lf = Math.floor(st.loopF) % N;
        if (lf !== 0) { st.from = { sheet: 'loop', frame: lf }; st.fade = 1; }
        st.mode = 'action';
      }
      sheet = 'action'; frame = Math.round(fr.f);
    } else {
      if (st.mode === 'action') { st.loopF = 0; st.mode = 'loop'; }
      st.loopF = (st.loopF + dt * data.fps) % N;
      sheet = 'loop'; frame = Math.floor(st.loopF);
    }
    var out = { sheet: sheet, frame: frame, fadeFrom: st.fade > 0 ? st.from : null, fadeAlpha: st.fade };
    if (st.fade > 0) { st.fade -= dt / 0.25; if (st.fade < 1e-6) st.fade = 0; }
    return out;
  }

  function create(o) {
    var canvas = o.canvas, data = o.data, sheets = o.sheets;
    var FW = data.frame_size[0], FH = data.frame_size[1];
    var ctx = canvas.getContext('2d');
    canvas.width = FW; canvas.height = FH;
    ctx.imageSmoothingEnabled = false;
    var pc = o.printCanvas, pctx = pc ? pc.getContext('2d') : null;
    if (pc) { pc.width = FW; pc.height = FH; pctx.imageSmoothingEnabled = false; }
    var st = { mode: 'loop', loopF: 0, from: null, fade: 0 };
    var last = '', prLast = '', rest = null, gone = false, caughtAt = 0;

    function blit(sheet, frame, alpha) {
      var r = data.sheets[sheet].rects[frame], img = sheets[sheet];
      if (!r || !img) return;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, FW, FH);
    }
    function draw(dt, s, t) {
      var p = pick(st, s, t, dt, data, !!sheets.exit);
      var key = p.sheet + p.frame + (p.fadeFrom ? ':' + p.fadeAlpha.toFixed(2) : '');
      if (key !== last) {
        ctx.clearRect(0, 0, FW, FH);
        blit(p.sheet, p.frame, 1);
        if (p.fadeFrom) blit(p.fadeFrom.sheet, p.fadeFrom.frame, p.fadeAlpha);
        ctx.globalAlpha = 1;
        last = key;
      }
      return p;
    }
    // The reduced-motion still (named by the data): the held look up after the flick.
    function still() {
      ctx.clearRect(0, 0, FW, FH);
      blit('action', data.reduced_motion_frame, 1);
      ctx.globalAlpha = 1;
      last = '';
    }
    // His resting rect, relative to the stage canvas (`base`), with any leap transform removed.
    function measure(base) {
      var tf = canvas.style.transform;
      canvas.style.transform = 'none';
      var r = canvas.getBoundingClientRect();
      canvas.style.transform = tf;
      rest = { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
      return rest;
    }
    // Sprite pixels (y down) to stage pixels, through the resting rect.
    function spriteToStage(x, y) {
      var k = rest ? rest.width / FW : 1;
      return { x: (rest ? rest.left : 0) + x * k, y: (rest ? rest.top : 0) + y * k, k: k };
    }
    // The leap toward the pixel's landing point (stage pixels).
    function leap(e, s, t, landing) {
      if (!data.exit || !rest) return;
      var fr = Math.min(data.exit.frames - 1, Math.round(e)), pf = data.exit.per_frame[fr], k = rest.width / FW;
      var seat = spriteToStage(data.exit.anchor[0], data.exit.anchor[1]);
      var ax = seat.x + (landing.x - seat.x) * pf.path, ay = seat.y + (landing.y - seat.y) * pf.path - pf.lift * k;
      var nowGone = s >= t.A1 && fr >= data.exit.vanish_frame;
      if (nowGone && !gone) caughtAt = performance.now();
      gone = nowGone;
      canvas.style.transform = s < t.A1 ? 'none' : 'translate(' + Math.round(ax - seat.x) + 'px,' + Math.round(ay - seat.y) + 'px)';
      canvas.style.opacity = gone ? '0' : '1';
    }
    // 1 as he vanishes, decaying over ~220ms: the pixel flares, as if caught.
    function caught(now) { return gone ? Math.exp(-(now - caughtAt) / 220) : 0; }
    // The push-off toe print stays on the floor at his seat and dissolves one frame per exit frame.
    function print(e, s, t) {
      if (!pctx) return;
      var fr = Math.round(e), prints = (s >= t.A1 && sheets.print && data.exit && data.exit.prints) || [];
      var live = prints.filter(function (p) { return fr >= p.frame && fr < p.frame + p.dissolve_frames; });
      var key = live.map(function (p) { return p.frame + ':' + (fr - p.frame); }).join();
      if (key === prLast) return;
      prLast = key;
      pctx.clearRect(0, 0, FW, FH);
      live.forEach(function (p) {
        var pw = p.frame_size[0], ph = p.frame_size[1];
        pctx.drawImage(sheets.print, (fr - p.frame) * pw, 0, pw, ph, Math.round(p.sprite_px[0] - pw / 2), Math.round(p.sprite_px[1] - ph * 0.6), pw, ph);
      });
    }
    function reset() {
      canvas.style.transform = ''; canvas.style.opacity = '';
      ctx.clearRect(0, 0, FW, FH);
      if (pctx) pctx.clearRect(0, 0, FW, FH);
      last = ''; prLast = ''; gone = false;
      st.mode = 'loop'; st.loopF = 0; st.fade = 0; st.from = null;
    }
    return {
      data: data, draw: draw, still: still, measure: measure, spriteToStage: spriteToStage, leap: leap,
      caught: caught, print: print, reset: reset, get gone() { return gone; },
    };
  }

  window.CreaturePlayer = { load: load, create: create, pick: pick };
})();
