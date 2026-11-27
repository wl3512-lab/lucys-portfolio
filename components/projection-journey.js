/* A reversible GSAP scrub through the hero's room. No custom wheel/touch listener. */
(function (root) {
  'use strict';
  // Laptops: lights out, projector on (Lucy, 2026-10-29: "i dont like standout work transition"; her pick of three, over a
  // crossfade that showed two of him and both titles at once). The hero's footlights die (HeroRoom.setDim) while he stays
  // lit a moment, as the spotlight leaves him; the dark comes down over his room in the room's own Bayer dither, at his
  // room pixel; a beat of black while the rooms change places; then the projector's lamp comes on and its light spreads
  // from the lens through the dark until the screening room is all there; the screen switches on with the film's flicker
  // (.pr-switch), then the heading, then the remote. It is all the scrub, so scrolling back plays it backwards.
  var OUT = [0.1, 0.34], ON = [0.44, 0.72], SWITCH = 0.56, DIM = 0.22;
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], BLACK = 0xff0f0605;   // the journey's #05060f
  // How dark a cell is at progress p (0 clear, 1 black); d: its distance from the lens over the farthest corner's.
  function darkAt(p, d) {
    if (p <= OUT[0] || p >= ON[1]) return 0;
    if (p < OUT[1]) { var t = (p - OUT[0]) / (OUT[1] - OUT[0]); return t * t * (3 - 2 * t); }
    if (p <= ON[0]) return 1;
    var q = (p - ON[0]) / (ON[1] - ON[0]);
    return Math.max(0, Math.min(1, (d - (q * 1.35 - 0.3)) * 3.2));
  }
  function offsetIn(el, top) { var x = 0, y = 0; while (el && el !== top) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return [x, y]; }
  // The dark: a canvas over the stage, one pixel a room pixel, black where a cell's Bayer threshold is under darkAt.
  function darkness(stage, minCell) {
    if (!stage || !stage.appendChild || typeof document.createElement !== 'function') return null;
    var cv = document.createElement('canvas'), cx = cv.getContext && cv.getContext('2d');
    if (!cx) return null;
    cv.className = 'rj-dark'; cv.setAttribute('aria-hidden', 'true'); stage.appendChild(cv);
    var W = 0, H = 0, img = null, d32 = null, dist = null, key = -1, lens = false;
    function size() {
      var dpr = Math.min(root.devicePixelRatio || 1, 3), K = root.HeroRoom ? root.HeroRoom.roomPixel(root.innerWidth, root.innerHeight, dpr).K : 3 * dpr, cell = Math.max(minCell || 0, K / dpr);
      W = Math.max(1, Math.ceil(stage.clientWidth / cell)); H = Math.max(1, Math.ceil(stage.clientHeight / cell));
      cv.width = W; cv.height = H; cv.style.width = W * cell + 'px'; cv.style.height = H * cell + 'px';
      img = cx.createImageData(W, H); d32 = new Uint32Array(img.data.buffer);
      // the lens, from the projector room (Spotlight.jsx's __projectionRoom); until it has drawn, about where it stands
      var lx = 0.16 * W, ly = 0.8 * H, pr = root.__projectionRoom && root.__projectionRoom.info.projector, world = stage.querySelector('.pr-world');
      lens = !!(pr && world);
      if (lens) { var o = offsetIn(world, stage); lx = (o[0] + (pr.x + pr.w / 2) / pr.W * world.offsetWidth) / cell; ly = (o[1] + pr.y / pr.H * world.offsetHeight) / cell; }
      var far = Math.hypot(Math.max(lx, W - lx), Math.max(ly, H - ly));
      dist = new Float32Array(W * H);
      for (var y = 0, i = 0; y < H; y++) for (var x = 0; x < W; x++, i++) dist[i] = Math.hypot(x + 0.5 - lx, y + 0.5 - ly) / far;
      key = -1;
    }
    function draw(p) {
      if (!W || (!lens && root.__projectionRoom && root.__projectionRoom.info.projector)) size();
      var k = Math.round(p * 600);   // finer than a scrub step draws nothing new
      if (k === key) return;
      key = k;
      if (!darkAt(p, 0) && !darkAt(p, 1)) { cv.style.visibility = 'hidden'; return; }
      cv.style.visibility = 'visible';
      for (var y = 0, i = 0; y < H; y++) { var by = (y & 3) << 2; for (var x = 0; x < W; x++, i++) d32[i] = (BAYER[by | (x & 3)] + 0.5) / 16 < darkAt(p, dist[i]) ? BLACK : 0; }
      cx.putImageData(img, 0, 0);
    }
    return { draw: draw, resize: function () { W = 0; }, remove: function () { cv.remove(); } };
  }
  function mount(journey) {
    if (!journey || !root.gsap || !root.ScrollTrigger) return function () {};
    var g = root.gsap, ST = root.ScrollTrigger, stage = journey.querySelector('.room-journey-stage');
    var hero = journey.querySelector('.scene-hero'), room = journey.querySelector('.projection-standout'), anchor = journey.querySelector('#spotlight');
    if (!hero || !room) return function () {};
    var mm = g.matchMedia(), ro, timer = 0, offLanding, timeline, previous = null, dark = null;
    function setState(progress) {
      var showing = progress > 0.72;
      if (previous === showing) return;
      previous = showing; journey.dataset.view = showing ? 'projection' : 'hero';
      hero.inert = showing; room.inert = !showing;
      if (root.__heroRoom && root.__heroRoom.setCovered) root.__heroRoom.setCovered(showing);
      document.dispatchEvent(new CustomEvent('lucy:scene-visibility'));
    }
    function measure() {
      // Read once at setup/resize, never in the scrub update. svh prevents URL bar jumps.
      var vh = document.documentElement.clientHeight, h = Math.max(vh, hero.scrollHeight);
      journey.style.setProperty('--room-height', h + 'px');
      journey.style.setProperty('--room-top', Math.min(0, vh - h) + 'px');
      journey.style.setProperty('--room-travel', Math.round(vh * (innerWidth < 761 ? 0.75 : 1.05)) + 'px');
    }
    mm.add({ animated: '(prefers-reduced-motion: no-preference) and (min-width: 761px) and (min-height: 560px)' }, function (context) {
      if (!context.conditions.animated || document.documentElement.classList.contains('reduce-motion')) {
        hero.inert = false; room.inert = false; setState(0); room.inert = false; return;
      }
      // Teardown exposes both rooms and wakes the hero. Re-entering at the same scroll
      // position must reapply input and render-loop ownership, even when progress is unchanged.
      previous = null;
      measure(); journey.classList.add('is-cinematic');
      dark = darkness(stage);
      var screen = room.querySelector('.pr-screen'), switched = false;
      // the scrub's own playhead (smoothed), not the scroll's: the dark, the hero's lights and the screen's switch-on
      function onScrub() {
        var p = timeline ? timeline.progress() : 0;
        if (dark) dark.draw(p);
        if (root.__heroRoom && root.__heroRoom.setDim) root.__heroRoom.setDim(Math.min(1, p / DIM));
        var on = p >= SWITCH;
        if (on === switched || !screen || !screen.classList) return;
        switched = on; screen.classList.remove('pr-switch');
        if (on) { void screen.offsetWidth; screen.classList.add('pr-switch'); }
      }
      timeline = g.timeline({ defaults: { ease: 'none' }, onUpdate: onScrub, scrollTrigger: {
        id: 'projection-journey', trigger: journey,
        start: function () { return 'top+=' + Math.max(0, hero.offsetHeight - document.documentElement.clientHeight) + ' top'; },
        end: function () { return '+=' + parseFloat(getComputedStyle(journey).getPropertyValue('--room-travel')); },
        scrub: 0.35, invalidateOnRefresh: true,
        onUpdate: function (s) { setState(s.progress); }, onRefresh: function (s) { setState(s.progress); },
      } });
      // Positions are progress: the timeline is 1 long. The rooms change places in the black, never seen together.
      timeline.to(hero.querySelector('.hero-content'), { opacity: 0, y: -16, duration: 0.12 }, 0)
        .to(hero.querySelector('.hero-room-type'), { opacity: 0, duration: 0.16 }, 0.04)
        .fromTo(hero, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.001 }, OUT[1])
        .fromTo(room, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001 }, OUT[1])
        .fromTo(room.querySelector('.pr-world'), { scale: 1.035 }, { scale: 1, duration: 0.5 }, OUT[1])   // a slow push in as the light comes
        .fromTo(screen, { opacity: 0 }, { opacity: 1, duration: 0.001 }, SWITCH)                            // on; its flicker is .pr-switch
        .fromTo(room.querySelector('.pr-heading'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.12 }, 0.62)
        .fromTo(room.querySelector('.pr-controls'), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.18 }, 0.7)
        .to({}, { duration: 0.12 });
      offLanding = root.ScrollLandings && root.ScrollLandings.add(function () { return timeline && timeline.scrollTrigger ? [timeline.scrollTrigger.end] : []; });
      ST.refresh();
      return function () {
        if (offLanding) offLanding(); timeline = null; journey.classList.remove('is-cinematic'); hero.inert = room.inert = false;
        if (root.__heroRoom && root.__heroRoom.setCovered) root.__heroRoom.setCovered(false);
        if (root.__heroRoom && root.__heroRoom.setDim) root.__heroRoom.setDim(0);
        if (dark) { dark.remove(); dark = null; }
        if (screen && screen.classList) screen.classList.remove('pr-switch');
      };
    });
    // Phones: a change of scene, like a cinema (Lucy, 2026-10-28: Standout "needs smt else to make it more standing
    // out and viewers don't just scroll right past, maybe make the transition between hero and standout work like a
    // fade"). As Standout comes up, the hero's lights go down to black, the projector room comes up out of the dark,
    // and the screen switches on with the film's own flicker (.pr-switch, project-layouts.css); the heading and the
    // story bar come in last. Scrubbed, so scrolling back up reverses it; the switch-on replays on each entry.
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 641px) and (max-width: 760px), (prefers-reduced-motion: no-preference) and (max-width: 640px) and (max-height: 559px)', function () {
      if (document.documentElement.classList.contains('reduce-motion')) return;
      var screen = room.querySelector('.pr-screen'), bar = room.querySelector('.story-bar');
      var mobile = g.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: room, start: 'top 100%', end: 'top 0%', scrub: 0.25 } });
      mobile.fromTo(hero, { opacity: 1 }, { opacity: 0, duration: 0.45 }, 0)
        .fromTo(room.querySelector('.pr-world'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45 }, 0.3)
        .fromTo(room.querySelector('.pr-heading'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25 }, 0.6);
      if (bar) mobile.fromTo(bar, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.6);
      mobile.to({}, { duration: 0.15 });
      var on = ST.create({ trigger: room, start: 'top 30%',
        onEnter: function () { if (!screen) return; screen.classList.remove('pr-switch'); void screen.offsetWidth; screen.classList.add('pr-switch'); },
        onLeaveBack: function () { if (screen) screen.classList.remove('pr-switch'); } });
      return function () { mobile.kill(); on.kill(); g.set(hero, { clearProps: 'opacity' }); if (screen) screen.classList.remove('pr-switch'); };
    });
    function resize() { clearTimeout(timer); timer = setTimeout(function () { if (journey.classList.contains('is-cinematic')) { measure(); if (dark) dark.resize(); ST.refresh(); } }, 180); }
    root.addEventListener('resize', resize, { passive: true });
    function jump() { if (location.hash === '#spotlight' && timeline && timeline.scrollTrigger) { var y = timeline.scrollTrigger.end; root.__lenis ? root.__lenis.scrollTo(y, { immediate: true, force: true }) : root.scrollTo(0, y); ST.update(); timeline.progress(1); setState(1); } }
    root.addEventListener('hashchange', jump); setTimeout(jump, 50);
    return function () { clearTimeout(timer); mm.revert(); root.removeEventListener('resize', resize); root.removeEventListener('hashchange', jump); journey.style.removeProperty('--room-height'); journey.style.removeProperty('--room-top'); journey.style.removeProperty('--room-travel'); };
  }
  // Lucy, 30 Oct: a scene change, not panels travelling up the screen. The sticky stage never reparents React's
  // nodes. Only the projector's longer reading content pans; both actual handovers keep the rooms stationary.
  function mountPhone(caps) {
    var host = caps && caps.closest('.phone-scenes'), stage = host && host.querySelector('.phone-scenes-stage');
    if (!stage || !root.gsap || !root.ScrollTrigger) return function () {};
    var g = root.gsap, ST = root.ScrollTrigger, mm = g.matchMedia();
    mm.add('(max-width: 640px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)', function () {
      if (document.documentElement.classList.contains('reduce-motion')) return;
      var hero = stage.querySelector('.scene-hero'), room = stage.querySelector('.projection-standout');
      if (!hero || !room) return;
      host.classList.add('is-phone-cinematic');
      var vh = 0, read = 0, leaveAt = 0, endAt = 0, previous = null, switchOn = false, tl, timer = 0;
      var dark = darkness(stage, 2), screen = room.querySelector('.pr-screen');
      function measure() {
        vh = stage.clientHeight || document.documentElement.clientHeight;
        read = Math.max(0, room.scrollHeight - vh);
        leaveAt = 2.4; endAt = leaveAt + 1.25;
        host.style.setProperty('--phone-height', vh + 'px');
        host.style.setProperty('--phone-travel', endAt * vh + 'px');
        if (dark) dark.resize();
      }
      function state(name) {
        if (name === previous) return;
        previous = name; host.dataset.phoneView = name;
        hero.inert = name !== 'hero'; room.inert = name !== 'projection'; caps.inert = name !== 'capabilities';
        if (root.__heroRoom) root.__heroRoom.setCovered(name !== 'hero');
        document.dispatchEvent(new CustomEvent('lucy:scene-visibility'));
      }
      measure(); state('hero');
      function scrub() {
        if (!tl) return;
        var t = tl.time(), second = t >= leaveAt, p = second ? Math.min(1, t - leaveAt) : Math.min(1, t);
        if (dark) dark.draw(p);
        if (root.__heroRoom && root.__heroRoom.setDim) root.__heroRoom.setDim(Math.min(1, t / DIM));
        state(t < OUT[1] ? 'hero' : t < leaveAt + OUT[1] ? 'projection' : 'capabilities');
        var on = t >= SWITCH && t < leaveAt;
        if (screen && on !== switchOn) { switchOn = on; screen.classList.remove('pr-switch'); if (on) { void screen.offsetWidth; screen.classList.add('pr-switch'); } }
      }
      tl = g.timeline({ defaults: { ease: 'none' }, onUpdate: scrub, scrollTrigger: {
        id: 'phone-scenes', trigger: host, start: 'top top', end: function () { return '+=' + endAt * vh; },
        scrub: .28, invalidateOnRefresh: true, onRefreshInit: measure,
      } });
      tl.to(hero.querySelector('.hero-content'), { opacity: 0, duration: .2 }, .04)
        .to(hero.querySelector('.hero-room-type'), { opacity: 0, duration: .2 }, .04)
        .fromTo(hero, { autoAlpha: 1 }, { autoAlpha: 0, duration: .001 }, OUT[1])
        .fromTo(room, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, duration: .001 }, OUT[1])
        .fromTo(room.querySelector('.pr-world'), { scale: 1.025 }, { scale: 1, duration: .45 }, ON[0])
        .fromTo(room.querySelector('.pr-heading'), { opacity: 0 }, { opacity: 1, duration: .22 }, .62)
        .fromTo(screen, { opacity: 0 }, { opacity: 1, duration: .001 }, SWITCH)
        .to(room, { y: function () { return -read; }, duration: 1 }, 1.2)
        .to(room, { autoAlpha: 0, duration: .001 }, leaveAt + OUT[1])
        .fromTo(caps, { autoAlpha: 0 }, { autoAlpha: 1, duration: .001 }, leaveAt + OUT[1])
        .fromTo(caps.querySelector('.pc-stage'), { scale: 1.04 }, { scale: 1, duration: .5 }, leaveAt + ON[0])
        .fromTo(caps.querySelector('.pc-heading'), { opacity: 0 }, { opacity: 1, duration: .22 }, leaveAt + .6)
        .fromTo(caps.querySelector('.pc-evidence'), { opacity: 0 }, { opacity: 1, duration: .2 }, leaveAt + .72)
        .to({}, { duration: .25 }, leaveAt + 1);
      function goTo(hash) {
        if (hash !== '#spotlight' && hash !== '#skills') return false;
        var t = hash === '#spotlight' ? 1 : endAt;
        var y = tl.scrollTrigger.start + t * vh;
        root.__lenis ? root.__lenis.scrollTo(y, { immediate: true, force: true }) : root.scrollTo(0, y);
        ST.update(); tl.time(t); scrub(); return true;
      }
      var handle = { goTo: goTo, timeline: tl, range: function () { return { vh: vh, read: read, leaveAt: leaveAt, endAt: endAt }; } };
      root.__phoneScenes = handle;
      function jump() { if (!(root.HeroGate && root.HeroGate.gate.state.held)) goTo(location.hash); }
      function resize() { clearTimeout(timer); timer = setTimeout(function () { ST.refresh(); }, 180); }
      var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
      if (ro) ro.observe(room);
      root.addEventListener('hashchange', jump); root.addEventListener('hero:ready', jump); root.addEventListener('resize', resize, { passive: true });
      ST.refresh(); jump();
      return function () {
        clearTimeout(timer); if (ro) ro.disconnect();
        root.removeEventListener('hashchange', jump); root.removeEventListener('hero:ready', jump); root.removeEventListener('resize', resize);
        if (dark) dark.remove(); host.classList.remove('is-phone-cinematic'); delete host.dataset.phoneView;
        host.style.removeProperty('--phone-height'); host.style.removeProperty('--phone-travel');
        hero.inert = room.inert = caps.inert = false;
        if (screen) screen.classList.remove('pr-switch');
        if (root.__heroRoom) { root.__heroRoom.setCovered(false); root.__heroRoom.setDim(0); }
        if (root.__phoneScenes === handle) delete root.__phoneScenes;
        document.dispatchEvent(new CustomEvent('lucy:scene-visibility'));
      };
    });
    return function () { mm.revert(); };
  }
  root.ProjectionJourney = { mount: mount, mountPhone: mountPhone, darkAt: darkAt, OUT: OUT, ON: ON, SWITCH: SWITCH, DIM: DIM };
})(window);
