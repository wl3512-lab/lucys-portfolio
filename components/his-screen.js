/* On his screen (Lucy, 2026-10-24: "P2, with P1's discipline", from the look test
   https://claude.ai/artifact/SgAsktQLCPmwsn7EVhprbb). Demon Nights and Audio Reactive are screen work, so each
   piece plays on his projector screen in the home page's screening room: projection-room.js draws the room, the
   projector and him from behind in the hero's palette, unchanged; this places the screen, runs the channel list
   and plays the picture. The picture is never pixelated: it sits sharp above the room.
   - The channel list is a tablist (arrow keys, Home, End). Changing channel flickers like the home page's
     `.pr-film` (Spotlight.jsx): the picture goes and comes back at 24 fps, so its dark beats are the room's own
     dim wall, and the new piece lands on the second of them. Reduced motion swaps at once.
   - Each piece sits on the screen at its own shape; phones frame the vertical loops 4:5 (CLAUDE.md,
     "Video covers on phones").
   - Videos keep their posters and preload nothing. Only the piece on the screen can play; it plays muted when
     the screen is on screen (never under reduced motion or Save-Data), pauses off screen and in a hidden tab,
     and the Play button holds it. "Watch with sound" opens the piece, or its full-length recording where there
     is one, in a window with its own controls.
   The pieces' words live in the page's HTML (one tabpanel each); plain JS, window.HisScreen, auto-mounts
   [data-his-screen]. The pure helpers are module.exports in Node (tests/project-templates.test.js). */
(function (root) {
  'use strict';
  var BEATS = [0, 1, 0, 'swap', 1, 0, 1], BEAT_MS = 42;   // the home page's shutter, beat for beat
  var PHONE_W = 761;                                       // projection-room.js draws its phone projector below this
  var OSD_MS = 1400;

  // The top of him on the projector, in css px, from projection-room.js's placement (his cell's top edge).
  function himTop(w, h, phone) {
    var cw = w * (phone ? 0.42 : 0.25), chh = cw * 2 / 3, floor = h * (phone ? 0.985 : 0.875);
    var ft = floor - cw * 0.015 - cw * 0.2;
    return ft - cw * 0.05 * 0.45 - chh * 0.745;
  }
  // Where the screen may hang: right of him and the projector in a wide room, across the top over him in a
  // narrow one, and always above the floor line (the room's horizon is at 0.68 of its height, 0.67 on phones).
  function regionOf(w, h, phone) {
    if (!phone) return { x0: w * 0.34, x1: w * 0.965, y0: h * 0.055, y1: h * 0.64 };
    return { x0: w * 0.05, x1: w * 0.95, y0: h * 0.04, y1: Math.min(h * 0.64, himTop(w, h, true) - h * 0.04) };
  }
  // The largest rectangle of aspect ar inside a region, centred, in whole pixels.
  function fit(r, ar) {
    var rw = r.x1 - r.x0, rh = r.y1 - r.y0, w = rw, h = w / ar;
    if (h > rh) { h = rh; w = h * ar; }
    return { x: Math.round(r.x0 + (rw - w) / 2), y: Math.round(r.y0 + (rh - h) / 2), w: Math.round(w), h: Math.round(h) };
  }
  // A piece's shape on the screen: its own, except that phones frame the vertical loops 4:5.
  function shapeOf(w, h, phone) { var ar = w / h; return phone && ar < 0.8 ? 0.8 : ar; }
  function nn(i) { return (i < 9 ? '0' : '') + (i + 1); }

  var api = { BEATS: BEATS, BEAT_MS: BEAT_MS, PHONE_W: PHONE_W, himTop: himTop, regionOf: regionOf, fit: fit, shapeOf: shapeOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root || !root.document) return;

  function video(src, poster, label) {
    var v = document.createElement('video');
    v.className = 'ps-picture';
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
    v.playsInline = true; v.setAttribute('playsinline', '');
    v.loop = true; v.preload = 'none'; v.setAttribute('preload', 'none');
    if (poster) v.poster = poster;
    if (label) v.setAttribute('aria-label', label); else v.setAttribute('aria-hidden', 'true');
    v.src = src;
    return v;
  }
  function unload(v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* already gone */ } }
  function playSafe(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); return p; }
  // A modal dialog keeps Tab inside itself.
  function trap(dlg) {
    dlg.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [].filter.call(dlg.querySelectorAll('button, a[href], video[controls], [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !dlg.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    });
  }

  function mount(el) {
    if (el.__hisScreen) return el.__hisScreen;
    var room = el.querySelector('.ps-room'), world = el.querySelector('.pr-world'), screen = el.querySelector('.ps-screen');
    var film = el.querySelector('.ps-film'), osd = el.querySelector('.ps-osd'), live = el.querySelector('.ps-live');
    var tabs = [].slice.call(el.querySelectorAll('.ps-ch')), panels = [].slice.call(el.querySelectorAll('.ps-panel'));
    var playBtn = el.querySelector('.ps-play'), soundBtn = el.querySelector('.ps-sound'), nextBtn = el.querySelector('.ps-next'), ir = el.querySelector('.ps-ir');
    var dlg = document.querySelector('.ps-full');
    if (!room || !world || !screen || !film || !tabs.length || tabs.length !== panels.length) return null;
    var noun = el.getAttribute('data-noun') || 'Piece';
    var pieces = panels.map(function (p) {
      var d = p.dataset, h2 = p.querySelector('h2'), by = p.querySelector('.ps-by'), desc = p.querySelector('.ps-desc');
      return { video: d.video, poster: d.poster, w: +d.w || 16, h: +d.h || 9, full: d.full || '', source: d.source || '', sourcePoster: d.sourcePoster || '',
        label: d.label || '', title: h2 ? h2.textContent.trim() : '', by: by ? by.textContent.trim() : '', desc: desc ? desc.textContent.replace(/\s+/g, ' ').trim() : '' };
    });
    var reduce = root.matchMedia('(prefers-reduced-motion: reduce)');
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var active = 0, shown = -1, timers = [], osdT = 0, vids = [], inView = false, opener = null, split = 50;
    var want = !reduce.matches && !saveData;      // play when on screen; the Play button sets it from then on
    var info = { swaps: 0, flickers: 0, layouts: 0, rect: null };
    el.classList.add('is-live');
    // The sound button's label changes with the piece ("Watch in full, with sound" where a full recording exists), so
    // it keeps the room of its longest label: the row of buttons, and the remote under it, never reflow when the piece
    // changes (Lucy, 2026-10-25: "make sure remote placement is locked").
    var soundLabel = null;
    if (soundBtn) {
      soundBtn.innerHTML = '<span class="ps-sound-w"><span class="ps-sound-l"></span>' +
        (pieces.some(function (p) { return p.full; }) ? '<span class="ps-sound-size" aria-hidden="true">Watch in full, with sound</span>' : '') + '</span>';
      soundLabel = soundBtn.querySelector('.ps-sound-l');
    }

    // The room: projection-room.js, as on the home page. Without it (a script failed) the room stays its colour.
    var scene = root.ProjectionRoom ? root.ProjectionRoom.mount(room, el.querySelector('.pr-room'), el.querySelector('.pr-foreground')) : null;

    function layout() {
      if (shown < 0) return;
      var w = world.clientWidth, h = world.clientHeight;
      if (!w || !h) return;
      var phone = w < PHONE_W, p = pieces[shown], r = fit(regionOf(w, h, phone), shapeOf(p.w, p.h, phone));
      screen.style.left = r.x + 'px'; screen.style.top = r.y + 'px'; screen.style.width = r.w + 'px'; screen.style.height = r.h + 'px';
      info.rect = r; info.layouts++;
      if (scene) scene.relayout();
    }

    // The button says what it will do: it holds the choice to play, so the screen pausing off screen or in a hidden
    // tab does not flip it. A browser that refuses to play turns the choice off.
    function state() {
      if (playBtn) { playBtn.setAttribute('data-on', String(want)); playBtn.textContent = want ? 'Pause' : 'Play'; }
    }
    function sync() {
      var run = want && inView && !document.hidden && !(dlg && dlg.open);
      vids.forEach(function (v) {
        if (!run) { if (!v.paused) v.pause(); return; }
        if (!v.paused) return;
        var p = v.play();
        if (p && p.catch) p.catch(function (err) { if (err && err.name === 'NotAllowedError' && v === vids[0]) { want = false; state(); } });
      });
      state();
    }

    function compare(p, main) {
      var wrap = document.createElement('div'), before = video(p.source, p.sourcePoster, '');
      wrap.className = 'ps-before'; wrap.appendChild(before);
      film.appendChild(wrap);
      film.insertAdjacentHTML('beforeend', '<div class="ps-divider" aria-hidden="true"><span>⇆</span></div>' +
        '<span class="ps-tag ps-tag-l" aria-hidden="true">Source</span><span class="ps-tag ps-tag-r" aria-hidden="true">TouchDesigner</span>');
      var s = document.createElement('div');
      s.className = 'ps-compare'; s.tabIndex = 0;
      s.setAttribute('role', 'slider');
      s.setAttribute('aria-label', 'Compare the source footage with the TouchDesigner output');
      s.setAttribute('aria-valuemin', '0'); s.setAttribute('aria-valuemax', '100');
      film.appendChild(s);
      function set(v) {
        split = Math.max(6, Math.min(94, Math.round(v)));
        film.style.setProperty('--split', split + '%');
        s.setAttribute('aria-valuenow', String(split));
        s.setAttribute('aria-valuetext', split + '% source on the left');
      }
      function at(e) { var r = s.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
      var drag = null, x0 = 0, moved = false;
      s.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        drag = e.pointerId; x0 = e.clientX; moved = e.pointerType === 'mouse';
        if (moved) { set(at(e)); try { s.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } }
      });
      s.addEventListener('pointermove', function (e) {
        if (drag !== e.pointerId) return;
        // a touch only drags once it moves sideways; a vertical swipe stays the page's scroll (touch-action: pan-y)
        if (!moved && Math.abs(e.clientX - x0) > 6) { moved = true; try { s.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } }
        if (moved) set(at(e));
      });
      var end = function () { drag = null; };
      s.addEventListener('pointerup', end); s.addEventListener('pointercancel', end);
      s.addEventListener('keydown', function (e) {
        var d = { ArrowLeft: -4, ArrowDown: -4, ArrowRight: 4, ArrowUp: 4 }[e.key];
        if (d) { e.preventDefault(); set(split + d); }
        else if (e.key === 'Home') { e.preventDefault(); set(6); }
        else if (e.key === 'End') { e.preventDefault(); set(94); }
      });
      set(split);
      return before;
    }

    // Put piece i on the screen and its words in the panel.
    function show(i, announce) {
      vids.forEach(unload); vids = [];
      film.textContent = '';
      shown = i; info.swaps++;
      var p = pieces[i], main = video(p.video, p.poster, p.label);
      film.appendChild(main); vids.push(main);
      if (p.source) vids.push(compare(p, main));
      panels.forEach(function (x, k) { x.hidden = k !== i; });
      if (soundBtn) {
        soundLabel.textContent = p.full ? 'Watch in full, with sound' : 'Watch with sound';
        soundBtn.setAttribute('aria-label', (p.full ? 'Watch the full-length ' : 'Watch ') + p.title + ' with sound');
      }
      layout();
      if (announce) {
        if (osd) { osd.textContent = 'CH ' + nn(i); osd.classList.add('is-on'); clearTimeout(osdT); osdT = setTimeout(function () { osd.classList.remove('is-on'); }, OSD_MS); }
        if (live) { live.textContent = ''; root.requestAnimationFrame(function () { live.textContent = noun + ' ' + nn(i) + ' of ' + nn(pieces.length - 1) + ': ' + p.title; }); }
      }
      sync();
    }

    function select(i, focus) {
      var n = pieces.length;
      i = ((i % n) + n) % n;
      if (focus) tabs[i].focus();
      if (i === active) return;
      active = i;
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      timers.forEach(clearTimeout); timers = [];
      film.style.opacity = '';
      if (reduce.matches) { want = false; show(i, true); return; }
      if (ir) { ir.classList.remove('is-send'); void ir.offsetWidth; ir.classList.add('is-send'); }
      // the shutter: the picture goes and comes back, its dark beats the room's dim wall, the new piece on the second
      info.flickers++;
      var step = 0;
      (function beat() {
        if (step === BEATS.length) { film.style.opacity = ''; return; }
        var b = BEATS[step++];
        if (b === 'swap') { show(active, true); film.style.opacity = '0'; } else film.style.opacity = String(b);
        timers.push(setTimeout(beat, BEAT_MS));
      })();
    }

    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { select(k); });
      t.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (d) { e.preventDefault(); select(active + d, true); }
        else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        else if (e.key === 'End') { e.preventDefault(); select(pieces.length - 1, true); }
      });
    });
    if (nextBtn) nextBtn.addEventListener('click', function () { select(active + 1); });
    // How much of the screen is in the window right now.
    function seen() {
      var r = screen.getBoundingClientRect(), h = r.height || 1;
      return Math.max(0, Math.min(r.bottom, root.innerHeight) - Math.max(r.top, 0)) / h;
    }
    if (playBtn) playBtn.addEventListener('click', function () {
      want = !want;
      // Play from below the room (a phone's caption sits under the channel grid) brings the screen back into view;
      // the observer then starts it as it arrives. It never plays where it cannot be seen.
      if (want && seen() < 0.3) screen.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
      inView = seen() >= 0.3;
      sync();
    });

    // Watch with sound: the piece (or its full-length recording) in a window, with sound and its own controls.
    var dv = dlg && dlg.querySelector('video');
    if (dlg && dv && typeof dlg.showModal === 'function') {
      trap(dlg);
      var closeBtn = dlg.querySelector('.pt-close');
      if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', function () { unload(dv); if (opener && document.contains(opener)) opener.focus(); opener = null; sync(); });
      if (soundBtn) soundBtn.addEventListener('click', function () {
        var p = pieces[shown];
        opener = soundBtn;
        var set = function (sel, text) { var x = dlg.querySelector(sel); if (x) x.textContent = text; };
        set('.pt-win-n', nn(shown) + ' / ' + nn(pieces.length - 1));
        set('.pt-win-by', p.by);
        set('.ps-full-title', p.title);
        set('.ps-full-note', (p.full ? 'The full-length recording, with sound. ' : 'The recording, with sound. ') + p.desc);
        dv.style.setProperty('--ar', (p.w / p.h).toFixed(4));
        dv.poster = p.poster; dv.preload = 'auto'; dv.src = p.full || p.video; dv.muted = false;
        dlg.showModal();
        sync();
        if (closeBtn) closeBtn.focus();
        // asked for, so it plays; if the browser refuses sound, it plays muted and the controls can unmute it
        var pr = dv.play();
        if (pr && pr.catch) pr.catch(function () { dv.muted = true; playSafe(dv); });
      });
    } else if (soundBtn) soundBtn.hidden = true;

    if ('IntersectionObserver' in root) {
      new IntersectionObserver(function (es) { var e = es[es.length - 1]; inView = e.isIntersecting && e.intersectionRatio >= 0.3; sync(); }, { threshold: [0, 0.3, 0.6] }).observe(screen);
    } else inView = true;
    document.addEventListener('visibilitychange', sync);
    if ('ResizeObserver' in root) new ResizeObserver(function () { layout(); }).observe(world);
    else root.addEventListener('resize', layout);

    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === 0)); t.tabIndex = k === 0 ? 0 : -1; });
    show(0, false);
    var handle = { select: select, scene: scene, info: info, pieces: pieces,
      get active() { return active; }, get shown() { return shown; }, get playing() { return !!(vids[0] && !vids[0].paused); } };
    el.__hisScreen = handle;
    root.__hisScreen = handle;
    return handle;
  }

  // Folds (Lucy, 2026-10-24: "more dropdown buttons when needed"). The credits and role / process / impact are
  // open on laptops and folded on phones until the reader opens them (the markup ships them open, so they read
  // without the script). On phones a piece's line shows three lines; "More" opens the rest, and appears only when
  // the clamp actually cuts it. A panel with its own "Read more" lets that open the line instead (CSS :has).
  function folds() {
    var phone = root.matchMedia('(max-width: 760px)');
    var listen = function (fn) { if (phone.addEventListener) phone.addEventListener('change', fn); else if (phone.addListener) phone.addListener(fn); };
    var ds = [].slice.call(document.querySelectorAll('details[data-fold="phone"]'));
    ds.forEach(function (d) { var s = d.querySelector('summary'); if (s) s.addEventListener('click', function () { d.__touched = true; }); });
    function apply() { ds.forEach(function (d) { if (!d.__touched) d.open = !phone.matches; }); }
    apply(); listen(apply);
    [].forEach.call(document.querySelectorAll('.ps-panel'), function (panel, i) {
      var desc = panel.querySelector('.ps-desc');
      if (!desc || panel.querySelector('.ps-more')) return;
      if (!desc.id) desc.id = 'ps-desc-' + i;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ps-desc-more'; b.textContent = 'More'; b.hidden = true;
      b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', desc.id);
      desc.insertAdjacentElement('afterend', b);
      b.addEventListener('click', function () {
        var open = !panel.classList.contains('is-desc-open');
        panel.classList.toggle('is-desc-open', open);
        b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Less' : 'More';
      });
      function measure() { if (!panel.classList.contains('is-desc-open')) b.hidden = !(phone.matches && desc.scrollHeight > desc.clientHeight + 1); }
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(desc);
      measure(); listen(measure);
    });
  }

  api.mount = mount;
  root.HisScreen = api;
  function boot() { [].forEach.call(document.querySelectorAll('[data-his-screen]'), mount); folds(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : null);
