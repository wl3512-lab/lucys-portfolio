/* The With AI band's creature: he guides you to the work (spec:
   docs/superpowers/specs/2026-10-22-band-creature-guide-design.md; Lucy approved the board,
   https://claude.ai/artifact/WGbduKzfVde7tMsXnXv4kC, 2026-10-23).

   He sits on the band's tiles in his idle loop (the drive's loop sheet). Hover him: his tail
   flick. Hover or focus a tile: he looks at it (four rendered looks, by where the tile is from
   where he sits and the way he faces) while his tail lifts and fans its blades. Click him: he
   hops along the tiles' tops, one hop per tile, to the tile you last looked at (or the next one
   the way he faces), glitch-turning first when it is behind him; he faces right by playing
   mirrored. On landing he looks down at his tile once. A tap on touch hops him to the next tile.
   He hops only while the four tiles sit in one row (over 800px); otherwise a click or tap is the
   flick, as it was.

   window.BandGuide.mount(canvas, hit, { data, sheets, tiles, base }) -> handle
     data, sheets: CreaturePlayer.load()'s (flick.json and the loop/action images)
     tiles: the four tile links, left to right; base: 'assets/creature/'
   The looks and hop sheets (assets/creature/band/, from scripts/band-guide-assets.py) load when
   he comes near the viewport; until then he idles and flicks. The pure helpers are exported for
   tests/band-guide.test.js. Plain JS: precompiled pages load it as-is (window globals only). */
(function (root) {
  'use strict';

  var LOOP0 = 'loop:0';

  // ── pure helpers ──────────────────────────────────────────────────────────────────────────
  // Which look aims at a tile: rel is how many tiles ahead of him it is, the way he faces.
  function lookFor(tile, perch, facing) {
    var rel = (tile - perch) * facing;
    return rel >= 2 ? 'ahead_far' : rel === 1 ? 'ahead' : rel === 0 ? 'down' : 'behind';
  }
  // Where a click sends him: the tile asked for, or (none, or his own) the next one the way he
  // faces, and at the end of the row back the other way.
  function hopTarget(target, perch, facing, count) {
    if (target == null || target === perch) target = perch + facing;
    if (target < 0 || target > count - 1) target = perch - facing;
    return target;
  }
  // The frame names of an n-tile hop: the one-tile hop up to its glitch back in, then the chain
  // once for every further tile, then the glitch and loop frame 0.
  function hopNames(seq, n) {
    var cut = seq.hop.indexOf('gi0'), names = seq.hop.slice(0, cut);
    for (var k = 1; k < n; k++) names = names.concat(seq.chain);
    return names.concat(seq.hop.slice(cut));
  }
  // Each name's travel: u in tile pitches from where he took off (the way he hops), y in px.
  // Before a jump's air he has not moved; from its landing on he is one more tile along.
  function hopTrack(names, travel) {
    var j = 0, landed = false, out = [];
    names.forEach(function (nm, idx) {
      if (nm === 'cc0') { j++; landed = false; }
      var u = j, y = 0;
      if (nm === LOOP0) u = idx ? j + 1 : 0;
      else if (travel[nm]) { u = j + travel[nm][0]; y = travel[nm][1]; if (nm === 'l0') landed = true; }
      else if (landed || /^(l|gi)/.test(nm)) u = j + 1;
      out.push({ name: nm, u: u, y: y });
    });
    return out;
  }
  // The turn's glitch frames: left to right plays t0..t2, right to left t2..t0, never mirrored.
  function turnNames(to) { return to > 0 ? ['t0', 't1', 't2'] : ['t2', 't1', 't0']; }

  // ── the engine ────────────────────────────────────────────────────────────────────────────
  function mount(canvas, hit, opts) {
    var data = opts.data, sheets = opts.sheets, tiles = opts.tiles || [], base = opts.base || 'assets/creature/';
    var L = data.sheets.loop, A = data.sheets.action;
    var canFlick = !!(sheets.action && A && data.action), flickEnd = canFlick ? data.action.ends_at_loop_frame : 0;
    var W = data.frame_size[0], H = data.frame_size[1], FPS = data.fps;
    var ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    var box = canvas.parentNode;

    var band = null, looksImg = null, hopImg = null;      // loaded when he is near
    var perch = tiles.length - 1, facing = -1;              // -1: left, the drawn way; +1: mirrored
    var mode = 'idle', f = 0, a = 0, look = null, li = 0, leaving = false, once = false;
    var seq = null, sk = 0, seqDone = null, seqDir = 0, seqFrom = 0;
    var fade = 0, from = null, hovered = null, lastHovered = null;
    var hopOn = false, offsets = null, pitch = 0;
    var raf = 0, on = false, visible = false, last = 0, drawn = '', moved = '', lastPointer = 'mouse', dead = false;

    // what to draw now: { img, i (cell index), cols, mirror, u (pitches), y, key }
    function cell(img, cols, i, mirror, u, y) { return { img: img, cols: cols, i: i, mirror: mirror, u: u || 0, y: y || 0 }; }
    function current() {
      var m = facing > 0;
      if (mode === 'look') return cell(looksImg, band.looks.cols, band.looks.clips[look] + Math.min(band.looks.parts.last, Math.floor(li)), m);
      if (mode === 'flick') return cell(sheets.action, 0, Math.min(A.frames - 1, Math.floor(a)), m);
      if (mode === 'seq') return seq[Math.min(seq.length - 1, Math.floor(sk))];
      return cell(sheets.loop, 0, Math.floor(f) % L.frames, m);
    }
    function blit(r, alpha) {
      var x, y;
      if (r.cols) { x = (r.i % r.cols) * W; y = Math.floor(r.i / r.cols) * H; }
      else { var rect = (r.img === sheets.action ? A : L).rects[r.i]; x = rect[0]; y = rect[1]; }
      ctx.save();
      ctx.globalAlpha = alpha;
      if (r.mirror) { ctx.translate(band ? band.mirror_x : 234, 0); ctx.scale(-1, 1); }
      ctx.drawImage(r.img, x, y, W, H, 0, 0, W, H);
      ctx.restore();
    }
    function draw() {
      if (document.hidden || document.body.classList.contains('about-locked') || dead) return;
      var r = current();
      // CreaturePlayer supplies ImageBitmaps, which have no .src. undefined + frame
      // was NaN for every frame, so idle advanced without repainting.
      var sheetKey = r.img === sheets.loop ? 'loop' : r.img === sheets.action ? 'action' : r.img === looksImg ? 'look' : 'hop';
      var key = sheetKey + ':' + r.i + (r.mirror ? 'm' : '') + (fade > 0 ? ':' + fade.toFixed(2) : '');
      if (key !== drawn) {
        ctx.clearRect(0, 0, W, H);
        blit(r, 1);
        if (fade > 0 && from) blit(from, fade);
        drawn = key;
      }
      // where he sits: his perch's offset, plus the hop's travel from the tile he left
      var x = 0, y = 0;
      if (hopOn && offsets) {
        x = offsets[mode === 'seq' ? seqFrom : perch];
        if (mode === 'seq') { x += r.u * pitch * seqDir; y = r.y; }
      }
      var mv = x.toFixed(1) + ',' + y.toFixed(1);
      if (mv !== moved) { box.style.transform = (x || y) ? 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)' : ''; moved = mv; }
    }
    function dissolve() { from = current(); fade = 1; }
    function idleAtZero() { return mode === 'idle' && Math.floor(f) % L.frames === 0; }

    // ── looks ──
    function startLook(name, onceOnly) {
      if (!band) return;
      var P = band.looks.parts;
      if (mode === 'idle') {
        if (!idleAtZero()) dissolve();
        mode = 'look'; look = name; li = 0; leaving = false; once = !!onceOnly; return;
      }
      if (mode !== 'look' || (name === look && !leaving)) return;
      dissolve();
      if (li >= P.holdEnd) li = Math.max(0, P.last - li);   // from an out into the new look's in
      look = name; leaving = false; once = !!onceOnly;       // a hold keeps its clock: every hold shares it
    }
    function leaveLook() {
      if (mode !== 'look' || leaving) return;
      var P = band.looks.parts;
      leaving = true;
      if (li < P.in) li = P.last - li;
      else if (li < P.holdEnd) { if (Math.floor(li) !== P.holdEnd - 1) dissolve(); li = P.holdEnd; }
    }
    function toIdle(resume) {
      mode = 'idle'; f = resume; look = null; leaving = false; once = false;
      if (hovered !== null) startLook(lookFor(hovered, perch, facing));
    }

    // ── the hop and the turn ──
    function hopCells(n, dir) {
      var m = dir > 0, H0 = band.hop;
      return hopTrack(hopNames(H0.sequences, n), H0.travel).map(function (t) {
        return t.name === LOOP0 ? cell(sheets.loop, 0, 0, m, t.u, t.y) : cell(hopImg, H0.cols, H0.index[t.name], m, t.u, t.y);
      });
    }
    function turnCells(to) {
      var out = [cell(sheets.loop, 0, 0, to < 0)];
      turnNames(to).forEach(function (nm) { out.push(cell(hopImg, band.hop.cols, band.hop.index[nm], false)); });
      var end = cell(sheets.loop, 0, 0, to > 0); end.setFacing = to;
      return out.concat([end]);
    }
    function hopTo(target) {
      if (!band || !hopOn || mode === 'seq') return;
      target = hopTarget(target, perch, facing, tiles.length);
      var dir = target > perch ? 1 : -1, n = Math.abs(target - perch);
      var cells = (dir !== facing ? turnCells(dir) : []).concat(hopCells(n, dir));
      cells[cells.length - 1].endHop = n * dir;
      if (!idleAtZero()) dissolve();
      mode = 'seq'; seq = cells; sk = 0; seqDir = dir; seqFrom = perch;
      // the turn's frames do not travel; the hop's do, from the perch he leaves
      seqDone = function () {
        if (hovered !== null) startLook(lookFor(hovered, perch, facing));
        else startLook('down', true);
      };
    }
    function flick() {
      if (!canFlick || mode !== 'idle') return;
      if (!idleAtZero()) dissolve();
      mode = 'flick'; a = 0;
    }

    // ── the clock ──
    function step(now) {
      raf = 0;
      if (!on) return;
      var dt = Math.min(0.1, last ? (now - last) / 1000 : 0); last = now;
      if (fade > 0) fade = Math.max(0, fade - dt / 0.25);
      if (mode === 'idle') f = (f + dt * FPS) % L.frames;
      else if (mode === 'look') {
        var P = band.looks.parts;
        li += dt * FPS;
        if (!leaving && li >= P.holdEnd) { if (once) leaving = true; else li -= P.holdEnd - P.in; }
        if (leaving && li >= P.last + 1) toIdle(1);           // the out's last frame is loop frame 0
      } else if (mode === 'flick') {
        a += dt * FPS;
        if (a >= A.frames - 1) { mode = 'idle'; f = flickEnd; } // the flick ends on loop frame 116
      } else if (mode === 'seq') {
        var prev = Math.floor(sk);
        sk += dt * FPS;
        for (var k = prev + 1; k <= Math.min(seq.length - 1, Math.floor(sk)); k++) if (seq[k].setFacing) facing = seq[k].setFacing;
        if (sk >= seq.length) {
          var end = seq[seq.length - 1];
          if (end.endHop) perch += end.endHop;
          if (end.setFacing) facing = end.setFacing;
          seq = null; mode = 'idle'; f = 0;
          var done = seqDone; seqDone = null;
          if (done) done();
        }
      }
      draw();
      raf = requestAnimationFrame(step);
    }
    function update() {
      var want = visible && !document.hidden && !document.body.classList.contains('about-locked') && !dead;
      if (want && !on) { on = true; last = 0; raf = requestAnimationFrame(step); }
      else if (!want && on) { on = false; cancelAnimationFrame(raf); raf = 0; }
    }

    // ── layout: a perch above each tile, measured without his transform ──
    function measure() {
      var rects = tiles.map(function (t) { return t.getBoundingClientRect(); });
      var row = rects.length > 1 && rects.every(function (r) { return Math.abs(r.top - rects[0].top) < 2 && r.width > 0; });
      var wasOn = hopOn;
      hopOn = !!(band && row && window.innerWidth > 800);
      if (!hopOn) {
        offsets = null;
        if (wasOn) { perch = tiles.length - 1; facing = -1; if (mode === 'seq') { seq = null; mode = 'idle'; f = 0; } }
        moved = ''; box.style.transform = '';
        return;
      }
      var tf = box.style.transform;
      box.style.transform = 'none';
      var b = box.getBoundingClientRect(), cw = canvas.getBoundingClientRect();
      box.style.transform = tf;
      var scale = cw.width / W, axis = cw.left + band.axis_x * scale;
      offsets = rects.map(function (r) { return r.left + r.width / 2 - axis; });
      pitch = rects[1].left - rects[0].left;
      moved = '';
      if (!b.width) hopOn = false;
    }

    // ── input ──
    var off = [];
    function listen(el, type, fn) { el.addEventListener(type, fn); off.push(function () { el.removeEventListener(type, fn); }); }
    tiles.forEach(function (el, t) {
      function enter() { hovered = t; lastHovered = t; if (mode === 'idle' || mode === 'look') startLook(lookFor(t, perch, facing)); }
      function exit() { if (hovered === t) hovered = null; if (mode === 'look') leaveLook(); }
      listen(el, 'pointerenter', function (e) { if (e.pointerType !== 'touch') enter(); });
      listen(el, 'pointerleave', function (e) { if (e.pointerType !== 'touch') exit(); });
      listen(el, 'focus', enter);
      listen(el, 'blur', exit);
    });
    listen(hit, 'pointerdown', function (e) {
      lastPointer = e.pointerType || 'mouse';
      if (lastPointer === 'touch') { if (hopOn) hopTo(null); else flick(); }
    });
    listen(hit, 'pointerenter', function (e) { if (e.pointerType !== 'touch') flick(); });
    listen(hit, 'click', function () { if (lastPointer !== 'touch' && hopOn) hopTo(lastHovered); });

    var io = new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; update(); });
    io.observe(canvas);
    listen(document, 'visibilitychange', update);
    listen(document, 'lucy:scene-visibility', update);
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () { measure(); draw(); }) : null;
    if (ro && tiles[0]) ro.observe(tiles[0].parentNode.parentNode);
    listen(window, 'resize', function () { measure(); draw(); });

    // the looks and the hop load when he is near the viewport
    var near = new IntersectionObserver(function (es) {
      if (!es[es.length - 1].isIntersecting) return;
      near.disconnect(); near = null;
      var img = function (src) { return new Promise(function (ok, no) { var im = new Image(); im.decoding = 'async'; im.onload = function () { ok(im); }; im.onerror = no; im.src = src; }); };
      fetch(base + 'band/band.json').then(function (r) { if (!r.ok) throw new Error('band.json ' + r.status); return r.json(); })
        .then(function (d) { return Promise.all([d, img(base + 'band/' + d.looks.src), img(base + 'band/' + d.hop.src)]); })
        .then(function (res) {
          if (dead) return;
          band = res[0]; looksImg = res[1]; hopImg = res[2];
          measure(); draw();
          if (hovered !== null && mode === 'idle') startLook(lookFor(hovered, perch, facing));
        })
        .catch(function () { /* he idles and flicks without them */ });
    }, { rootMargin: '150% 0px' });
    near.observe(canvas);

    draw();
    var handle = {
      destroy: function () {
        dead = true; update(); io.disconnect(); if (near) near.disconnect(); if (ro) ro.disconnect();
        off.forEach(function (fn) { fn(); }); box.style.transform = '';
      },
      info: function () {
        return { mode: mode, look: look, perch: perch, facing: facing, hopOn: hopOn, ready: !!band, offsets: offsets, pitch: pitch,
          frame: mode === 'seq' ? Math.floor(sk) : mode === 'look' ? Math.floor(li) : mode === 'flick' ? Math.floor(a) : Math.floor(f) };
      },
      hopTo: hopTo,
    };
    window.__bandGuide = handle;
    return handle;
  }

  var api = { mount: mount, lookFor: lookFor, hopTarget: hopTarget, hopNames: hopNames, hopTrack: hopTrack, turnNames: turnNames };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BandGuide = api;
})(typeof window !== 'undefined' ? window : null);
