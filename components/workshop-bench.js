/* With AI's bench (Lucy, 2026-10-24: look test A, "the workshop", https://claude.ai/artifact/X7LNipjHMLN8ZebrgvonGi).
   His workbench as a pixel room in the hero's palette: four stations on a shelf (design, constrain, evaluate, ship),
   each under a hanging lamp. Choosing one lights its lamp, he hops along the bench to sit under it, and its card
   types its line beside the proof. On phones the room zooms to the chosen station and slides between them.
   The stations' words live in with-ai.html (they read without this script); this draws the room and runs the
   choice. Plain JS, auto-mounts [data-workshop]; also opens "The long version" for links into it. */
(function () {
  'use strict';
  var W = 720, H = 260, ZOOM_W = 260;              // the room in pixels; a phone shows a 260-wide window of it
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16; });

  function room(cv, xs, active) {
    var g = cv.getContext('2d');
    var R = function (c, x, y, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    var dither = function (x0, y0, w, h, c, d) { g.fillStyle = c; for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) if (BAY[((y & 3) << 2) | (x & 3)] < d(x, y)) g.fillRect(x, y, 1, 1); };
    R('#090b1e', 0, 0, W, H);
    // the wall: a pegboard, darker toward the top
    dither(0, 0, W, 205, '#0e122e', function (x, y) { return 0.25 + 0.6 * y / 205; });
    for (var py = 10; py < 200; py += 12) for (var px = 8; px < W; px += 12) R('#05060f', px, py, 2, 2);
    // lamps on short cords over the shelf; the chosen station's lamp is on, its light falls on the station and on him
    xs.forEach(function (lx, i) {
      var on = i === active;
      R('#1e2033', lx - 1, 0, 2, 8);
      R(on ? '#444a75' : '#1e2033', lx - 12, 8, 24, 6); R('#090b1e', lx - 12, 14, 24, 2);
      R(on ? '#ecf0ff' : '#2f3352', lx - 4, 16, 8, 2);
      if (on) {
        dither(lx - 80, 18, 160, 190, '#213452', function (x, y) { var t = (y - 18) / 190; return Math.abs(x - lx) < 10 + 70 * t ? 0.55 - 0.3 * t : 0; });
        dither(lx - 80, 18, 160, 190, '#2f4b75', function (x, y) { var t = (y - 18) / 190; return Math.abs(x - lx) < 6 + 46 * t ? 0.38 - 0.25 * t : 0; });
      }
    });
    // the shelf the stations stand on
    R('#5c649e', 0, 84, W, 2); R('#444a75', 0, 86, W, 4); R('#1e2033', 0, 90, W, 2);
    [40, 186, 360, 534, 680].forEach(function (x) { R('#1e2033', x, 92, 4, 10); R('#1e2033', x, 92, 10, 3); });
    // the bench he sits on, and the floor
    R('#5c649e', 0, 205, W, 2); R('#444a75', 0, 207, W, 5); R('#1e2033', 0, 212, W, 2);
    R('#2f3352', 0, 214, W, 22);
    dither(0, 214, W, 22, '#1e2033', function (x, y) { return 0.15 + 0.5 * (y - 214) / 22; });
    if (active >= 0) dither(xs[active] - 70, 207, 140, 5, '#94a1ff', function () { return 0.5; });
    R('#090b1e', 0, 236, W, 24);
    for (var fy = 242; fy < H; fy += 8) R('#0e122e', 0, fy, W, 1);
    design(R, xs[0], active === 0); fence(R, xs[1], active === 1); rig(R, xs[2], active === 2); crate(R, xs[3], active === 3);
  }
  function design(R, c, on) {          // a sketch board of flows on a little stand, a pencil on its ledge
    R('#3e3352', c - 22, 70, 4, 14); R('#3e3352', c + 18, 70, 4, 14);
    R('#090b1e', c - 32, 30, 64, 42); R(on ? '#ecf0ff' : '#ced6fc', c - 30, 32, 60, 38);
    var ink = on ? '#3f659e' : '#5283cc';
    R(ink, c - 24, 37, 13, 8); R(ink, c + 10, 37, 13, 8); R(ink, c - 7, 56, 15, 9);
    R(ink, c - 11, 41, 21, 1); R(ink, c, 45, 1, 11); R(ink, c - 18, 45, 1, 15); R(ink, c - 18, 59, 11, 1);
    R('#594975', c - 32, 72, 64, 3); R('#c29eff', c - 18, 69, 22, 3); R('#ecf0ff', c + 4, 69, 3, 3);
  }
  function fence(R, c, on) {           // a short picket fence with a rules sign over it
    var rail = on ? '#5c649e' : '#444a75';
    for (var i = -3; i <= 3; i++) { var x = c + i * 12; R('#090b1e', x - 3, 56, 7, 28); R(rail, x - 2, 58, 5, 26); R('#090b1e', x - 2, 54, 5, 3); }
    R('#090b1e', c - 41, 64, 82, 5); R(rail, c - 41, 65, 82, 3); R('#090b1e', c - 41, 75, 82, 5); R(rail, c - 41, 76, 82, 3);
    R('#090b1e', c - 28, 26, 56, 22); R('#1e2033', c - 26, 28, 52, 18); R(on ? '#c29eff' : '#594975', c - 26, 28, 52, 2);
    R('#2f3352', c - 16, 48, 2, 7); R('#2f3352', c + 14, 48, 2, 7);
  }
  function rig(R, c, on) {             // a test rig: a box with a screen, two dials and a light
    R('#090b1e', c - 40, 32, 80, 52); R('#2f3352', c - 38, 34, 76, 50); R('#444a75', c - 38, 34, 76, 3);
    R('#05060f', c - 31, 40, 62, 20); R(on ? '#142133' : '#0e122e', c - 29, 42, 58, 16);
    R('#1e2033', c - 29, 66, 11, 11); R('#5c649e', c - 24, 68, 2, 6); R('#1e2033', c - 12, 66, 11, 11); R('#5c649e', c - 7, 71, 5, 2);
    R(on ? '#66a3ff' : '#213452', c + 18, 68, 10, 8); if (on) R('#ecf0ff', c + 20, 70, 3, 2);
  }
  function crate(R, c, on) {           // a slatted crate, ready to go out
    R('#090b1e', c - 38, 36, 76, 48);
    for (var y = 38; y < 82; y += 9) { R(on ? '#78629e' : '#594975', c - 36, y, 72, 7); R('#3e3352', c - 36, y + 7, 72, 2); }
    R('#3e3352', c - 36, 38, 6, 44); R('#3e3352', c + 30, 38, 6, 44); R(on ? '#9b7ecc' : '#78629e', c - 36, 38, 72, 2);
  }

  function mount(root) {
    if (root.__workshop) return root.__workshop;
    var cv = root.querySelector('.ws-canvas'), pan = root.querySelector('.ws-pan'), him = root.querySelector('.ws-him');
    var tabs = [].slice.call(root.querySelectorAll('.ws-station')), panels = [].slice.call(root.querySelectorAll('.ws-panel'));
    var counter = root.querySelector('.ws-counter'), stamp = root.querySelector('.ws-stamp');
    if (!cv || !tabs.length) return null;
    var xs = tabs.map(function (t) { return Number(getComputedStyle(t).getPropertyValue('--c')) || 0; });
    var lines = panels.map(function (p) { var l = p.querySelector('.ws-line'); return l ? l.textContent : ''; });
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)'), phone = window.matchMedia('(max-width: 760px)');
    var active = -1, typer = 0, ticker = 0, blinkT = 0, visible = true;
    root.classList.add('is-live');
    cv.width = W; cv.height = H;

    function type(i) {
      var el = panels[i].querySelector('.ws-line'); clearInterval(typer);
      if (!el) return;
      if (reduce.matches || story) { el.textContent = lines[i]; return; }   // phones read every card whole as it scrolls by
      var n = 0; el.textContent = '';
      typer = setInterval(function () { n = Math.min(lines[i].length, n + 2); el.textContent = lines[i].slice(0, n); if (n >= lines[i].length) clearInterval(typer); }, 28);
    }
    function count(to) {
      clearInterval(ticker);
      if (!counter) return;
      if (reduce.matches) { counter.textContent = to + ' ✓'; return; }
      var v = 0;
      ticker = setInterval(function () { v = Math.min(to, v + Math.ceil(to / 18)); counter.textContent = String(v).padStart(3, '0') + (v === to ? ' ✓' : ''); if (v === to) clearInterval(ticker); }, 34);
    }
    function place() {
      // phones: the window slides so the chosen station sits in the middle, stopping at the room's ends
      var z = parseFloat(getComputedStyle(root.querySelector('.ws-room') || root).getPropertyValue('--ws-zoom')) || ZOOM_W;   // the computer's Notes show a wider window
      var off = phone.matches ? Math.max(0, Math.min(W - z, xs[active] - z / 2)) : 0;
      pan.style.setProperty('--pan', (-off / W * 100).toFixed(3) + '%');
    }
    function go(i, focus) {
      i = (i + tabs.length) % tabs.length;
      if (i === active) return;
      active = i;
      room(cv, xs, active);
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === active)); t.tabIndex = k === active ? 0 : -1; });
      panels.forEach(function (p, k) { if (story) { p.hidden = false; p.classList.toggle('is-active', k === active); } else p.hidden = k !== active; });
      if (focus) tabs[active].focus({ preventScroll: true });
      him.style.setProperty('--x', xs[active] - 53);
      if (!reduce.matches) { him.classList.remove('hop'); void him.offsetWidth; him.classList.add('hop'); }
      type(active);
      if (active === 2) count(824); else if (counter) counter.textContent = '824 ✓';
      if (stamp) { stamp.classList.remove('thump'); if (active === 3 && !reduce.matches) { void stamp.offsetWidth; stamp.classList.add('thump'); } }
      place();
    }
    // Scroll walks the bench (Lucy, 2026-10-25: "scroll has to force move The bench · design, constrain, evaluate, ship
    // then can scroll down to Four builds"). Where it fits on the screen (not on phones, which keep their arrows), the
    // bench holds under the nav (sticky, in a track taller than itself) for a stretch of scroll per station, the scroll
    // chooses the station, and then the page goes on. Every station's card takes the tallest one's height, so nothing
    // below moves, and the room scales down if that is what it takes to fit. A click or key moves the scroll to the
    // station it chose, so the two never disagree. No timer: the stations change only on scroll or a choice.
    var track = null, walking = false, STEP = 0, stick = 0, hold = 0, ticking = false, fitH = 0;
    // Phones walk it too (Lucy, 2026-11-01: "force users to scroll through this before going down"; they had kept the
    // arrows, because a card there is up to 652px and the room and one card cannot both hold on screen). The room holds
    // under the header (.ws-stick, sticky), all four cards follow it in order, and the card that comes up under the room
    // chooses the station: the room pans there and he hops over. So the page cannot reach Four builds without the four
    // cards passing under him. The arrows and tabs scroll to their card.
    var story = false, stickEl = null, roomEl = root.querySelector('.ws-room');
    function storyOn() {
      if (!stickEl) { stickEl = document.createElement('div'); stickEl.className = 'ws-stick'; roomEl.parentNode.insertBefore(stickEl, roomEl); stickEl.appendChild(roomEl); }
      track.classList.add('is-story'); story = true;
      stickEl.style.top = Math.round(navEl ? Math.max(0, navEl.getBoundingClientRect().bottom) : 0) + 'px';
      panels.forEach(function (p, k) { p.hidden = false; p.classList.toggle('is-active', k === active); var l = p.querySelector('.ws-line'); if (l) l.textContent = lines[k]; });
      clearInterval(typer);
      read();
    }
    function storyOff() {
      if (stickEl) { stickEl.parentNode.insertBefore(roomEl, stickEl); stickEl.remove(); stickEl = null; }
      story = false;
      panels.forEach(function (p, k) { p.classList.remove('is-active'); p.hidden = k !== active; });
    }
    // halfway down the space under the room: a card chooses its station while its heading is still in view below the room
    function readLine() { var b = stickEl.getBoundingClientRect().bottom; return b + (window.innerHeight - b) * 0.45; }
    function read() {   // the last card whose top has come up past the reading line
      if (!story || Date.now() < hold) return;
      var line = readLine(), i = 0;
      panels.forEach(function (p, k) { if (p.getBoundingClientRect().top <= line) i = k; });
      if (i !== active) go(i);
    }
    var navEl = document.querySelector('[data-site-header]');   // the shared header (components/site-header.js)
    // Inside With AI's computer (13 November 2026) the bench is a note in its own window, which scrolls by itself:
    // no walk, no story; the tabs, the arrows and the keys choose the station.
    var inDesk = !!(root.closest && root.closest('[data-desktop]'));
    function fit() {
      if (inDesk) { place(); return; }
      if (!track) { track = document.createElement('div'); track.className = 'ws-track'; root.parentNode.insertBefore(track, root); track.appendChild(root); }
      track.classList.remove('is-walk', 'is-story'); root.style.removeProperty('--ws-room-max'); root.style.top = ''; track.style.height = '';
      walking = false;
      if (phone.matches) { storyOn(); return; }
      if (story) storyOff();
      track.classList.add('is-walk');                       // the cards share one cell from here: the height is the tallest's
      var navB = navEl ? Math.max(0, navEl.getBoundingClientRect().bottom) : 0, avail = window.innerHeight - navB - 12, h = root.offsetHeight;
      if (h > avail) {
        var need = root.querySelector('.ws-room').offsetHeight - (h - avail);
        if (need < 200) { track.classList.remove('is-walk'); return; }   // a screen too short for it: the tabs alone
        root.style.setProperty('--ws-room-max', need + 'px'); h = root.offsetHeight;
      }
      walking = true; fitH = h;
      STEP = Math.round(Math.min(420, Math.max(260, window.innerHeight * 0.42)));
      stick = Math.round(navB + Math.max(0, (avail - h) / 2));
      root.style.top = stick + 'px';
      track.style.height = (h + STEP * (tabs.length - 1)) + 'px';
      follow();
    }
    function offset() { return stick - track.getBoundingClientRect().top; }   // how far into the walk the scroll is
    function follow() {
      ticking = false;
      if (story) { read(); return; }
      if (!walking || Date.now() < hold) return;
      var i = Math.max(0, Math.min(tabs.length - 1, Math.round(offset() / STEP)));
      if (i !== active) go(i);
    }
    function choose(i, focus) {
      i = (i + tabs.length) % tabs.length;
      go(i, focus);
      if (story) {   // bring its card up under the room; hold the reading until the glide is done
        var to = Math.round(window.scrollY + panels[i].getBoundingClientRect().top - (stickEl.getBoundingClientRect().bottom + 16));
        hold = Date.now() + 900;
        try { window.scrollTo({ top: to, behavior: reduce.matches ? 'instant' : 'smooth' }); } catch (e) { window.scrollTo(0, to); }
        return;
      }
      if (!walking) return;
      var off = offset(), pinned = off >= -2 && off <= STEP * (tabs.length - 1) + 2, y = Math.round(window.scrollY - off + i * STEP);
      // while it holds, the jump is invisible (the bench stays put); from outside the walk, glide there
      if (!pinned) hold = Date.now() + 900;
      try { window.scrollTo({ top: y, behavior: pinned ? 'instant' : 'smooth' }); } catch (e) { window.scrollTo(0, y); }
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { choose(k); });
      t.addEventListener('keydown', function (e) {
        var n = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (n) { e.preventDefault(); choose(active + n, true); } else if (e.key === 'Home') { e.preventDefault(); choose(0, true); } else if (e.key === 'End') { e.preventDefault(); choose(tabs.length - 1, true); }
      });
    });
    [].forEach.call(root.querySelectorAll('[data-ws-step]'), function (b) { b.addEventListener('click', function () { choose(active + Number(b.getAttribute('data-ws-step'))); }); });
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(follow); } }, { passive: true });
    var refit = 0;
    window.addEventListener('resize', function () { clearTimeout(refit); refit = setTimeout(fit, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    // a picture or a font that settles after the fit changes the bench's height: fit again, so it stays whole on screen
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (walking && Math.abs(root.offsetHeight - fitH) > 1) fit(); }).observe(root);
    var onPhone = function () { fit(); place(); };
    if (phone.addEventListener) phone.addEventListener('change', onPhone);
    // he blinks now and then, only while the bench is on screen
    function blink() {
      clearTimeout(blinkT);
      if (reduce.matches || !visible || document.hidden) return;
      blinkT = setTimeout(function () { him.src = him.getAttribute('data-blink'); setTimeout(function () { him.src = him.getAttribute('data-open'); blink(); }, 140); }, 2600 + Math.random() * 2400);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; blink(); }).observe(root);
    document.addEventListener('visibilitychange', blink);
    go(0); blink(); fit();
    // under the loading screen (page-loader.js) he hops to the first station and types its line again as the screen lifts
    if (document.body.classList.contains('intro-playing') && !window.__loaderExited) window.addEventListener('loader:exit', function () { var a = active; active = -1; go(a); }, { once: true });
    return (root.__workshop = { go: go, choose: choose, fit: fit, get active() { return active; }, get walking() { return walking; }, get story() { return story; }, get step() { return STEP; } });
  }

  // "The long version" is folded; a link into it (the home page's With AI tiles, the builds below the bench)
  // opens the fold before the browser scrolls, so the anchor lands.
  function openFor(hash) {
    if (!hash || hash.length < 2) return;
    var el = document.getElementById(decodeURIComponent(hash.slice(1)));
    var fold = el && el.closest('details');
    if (fold && !fold.open) { fold.open = true; requestAnimationFrame(function () { el.scrollIntoView({ block: 'start' }); }); }
  }
  function boot() {
    [].forEach.call(document.querySelectorAll('[data-workshop]'), mount);
    openFor(location.hash);
    window.addEventListener('hashchange', function () { openFor(location.hash); });
    document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) openFor(a.getAttribute('href')); }, true);
  }
  window.WorkshopBench = { mount: mount, room: room, W: W, H: H };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
