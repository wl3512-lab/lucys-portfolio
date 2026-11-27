/* lucyliu.xyz/hell only: the opening's inline lifecycle in index.html injects this script there.
   The opening starts as the normal contact sheet. At TURN the name glitches from "lucy liu" to
   "luci fer", the scene floods red, and the creature from docs/projects/portfolio-character,
   recoloured evil by scripts/hell-creature-assets.py, glitches in and tweaks: frozen stares that
   track the pointer, stepped 24 fps spasms, head shakes, and a lunge at the viewer on exit.
   Transform-only DOM layers, no canvas and no CSS filter. The red arrives as one fade, never a
   flash. The loop runs only while the opening is up. If any layer fails to decode, the creature
   never shows; the name and the red still turn. */
(function () {
  'use strict';
  var api = window.LucyIntro, loader = document.getElementById('ll-loader');
  if (!api || !loader) return;

  var DIR = 'assets/hell/', V = '?v=1';
  // Source-pixel geometry, from assets/hell/layers.json.
  var B = [142, 78, 1330, 949], W = B[2] - B[0], H = B[3] - B[1];
  var EYE = [354, 345], FEET = [548, 949];
  var P = {
    tail: { box: [709, 538, 1280, 930], pivot: [738, 832] },
    blades: { box: [1138, 330, 1330, 694], pivot: [1234, 600], parent: 'tail' },
    body: { box: [265, 432, 826, 949], pivot: [548, 754] },
    'arm-far': { box: [303, 579, 395, 689], pivot: [369, 587] },
    head: { box: [142, 78, 748, 475], pivot: [453, 435] },
    'arm-near': { box: [384, 588, 559, 705], pivot: [492, 590] }
  };

  var css = [
    '.hc{position:absolute;z-index:3;right:3vw;bottom:calc(max(26px,env(safe-area-inset-bottom)) + 74px);width:min(40vw,74vh,640px);aspect-ratio:' + W + '/' + H + ';pointer-events:none;visibility:hidden;transform-origin:18% 31%}',
    '.hc.is-on{visibility:visible}',
    '.hc.is-blink .hc-stage{visibility:hidden}',
    '.hc-stage{position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;transform-origin:0 0}',
    '.hc-rig,.hc-ghost{position:absolute;inset:0}',
    '.hc-rig{transform-origin:' + (FEET[0] - B[0]) + 'px ' + (FEET[1] - B[1]) + 'px}',
    '.hc-part{position:absolute}',
    '.hc.is-on .hc-rig,.hc.is-on .hc-part,.hc.is-on .hc-ghost{will-change:transform}',
    '.hc-part img{display:block;width:100%;height:100%}',
    '.hc-ghost{opacity:0;-webkit-mask:url(' + DIR + 'ghost.webp' + V + ') 0 0/100% 100% no-repeat;mask:url(' + DIR + 'ghost.webp' + V + ') 0 0/100% 100% no-repeat}',
    '.hc-ghost--r{background:#ff2442}.hc-ghost--b{background:#3d7bff}',
    '.hc-eye{position:absolute;width:170px;height:170px;margin:-85px 0 0 -85px;border-radius:50%;background:radial-gradient(circle,#ff6a3a 0,#ff1f2ecc 12%,#ff14284d 30%,transparent 64%);mix-blend-mode:screen}',
    '.hc-glow{position:absolute;left:0;right:0;bottom:-10%;height:34%;background:radial-gradient(50% 50% at 42% 62%,#ff1e3c5c,transparent 70%);opacity:0}',
    '.hc.is-lunge{transform:scale(1.9);opacity:0;transition:transform 420ms cubic-bezier(.55,0,.85,.35),opacity 260ms linear 160ms}',
    '.hc.hc-reset{transition:none!important}',
    // The turn. hc-hell goes on the loader; hc-snap drops the fades while a replay resets.
    '#ll-loader.hc-snap,#ll-loader.hc-snap *{transition:none!important}',
    '#ll-loader .intro-curtains i{transition:background-color 700ms linear}',
    '#ll-loader.hc-hell .intro-curtains i{background-color:#1d0407}',
    '#ll-loader.hc-hell .intro-curtains i:nth-child(even){background-color:#270609}',
    '#ll-loader .intro-wash{transition:opacity 700ms linear}',
    '#ll-loader.hc-hell .intro-wash{opacity:0}',
    '.hc-red{position:absolute;inset:-20%;pointer-events:none;opacity:0;transition:opacity 700ms ease-out;background:radial-gradient(ellipse at 58% 56%,#ff1a2e59,transparent 48%),radial-gradient(ellipse at 28% 32%,#a3001a4d,transparent 46%),radial-gradient(ellipse at 50% 112%,#ff280052,transparent 55%)}',
    '#ll-loader.hc-hell .hc-red{opacity:1}',
    '#ll-loader .intro-frame::after{content:"";position:absolute;inset:0;background:#ff1f33;mix-blend-mode:multiply;opacity:0;transition:opacity 700ms linear;pointer-events:none}',
    '#ll-loader.hc-hell .intro-frame::after{opacity:.66}',
    '#ll-loader .intro-type span{transition:color 500ms linear}',
    '#ll-loader.hc-hell .intro-type span{color:#ff2d42}',
    '#ll-loader .intro-meta,#ll-loader .intro-hint{transition:color 700ms linear}',
    '#ll-loader.hc-hell .intro-meta,#ll-loader.hc-hell .intro-hint{color:#f0b9be}',
    '#ll-loader.hc-hell .intro-meta strong{color:#ffd9dc}',
    '@media(max-width:650px){.hc{right:1vw;width:96vw;bottom:calc(max(26px,env(safe-area-inset-bottom)) + 78px)}}',
    '@media(max-height:500px) and (min-width:651px){.hc{width:min(34vw,62vh);right:1vw;bottom:calc(max(26px,env(safe-area-inset-bottom)) + 60px)}}'
  ].join('\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function div(cls) { var d = document.createElement('div'); d.className = cls; return d; }
  var imgs = [];
  function part(id) {
    var p = P[id], o = p.parent ? P[p.parent].box : B, d = div('hc-part');
    d.style.cssText = 'left:' + (p.box[0] - o[0]) + 'px;top:' + (p.box[1] - o[1]) + 'px;width:' + (p.box[2] - p.box[0]) + 'px;height:' + (p.box[3] - p.box[1]) +
      'px;transform-origin:' + (p.pivot[0] - p.box[0]) + 'px ' + (p.pivot[1] - p.box[1]) + 'px';
    var img = new Image();
    img.alt = ''; img.decoding = 'async'; img.src = DIR + id + '.webp' + V;
    d.appendChild(img); imgs.push(img);
    return d;
  }

  var el = div('hc'), glow = div('hc-glow'), stage = div('hc-stage'), rig = div('hc-rig');
  var gR = div('hc-ghost hc-ghost--r'), gB = div('hc-ghost hc-ghost--b');
  el.setAttribute('aria-hidden', 'true');
  rig.appendChild(gR); rig.appendChild(gB);
  var parts = {};
  ['tail', 'body', 'arm-far', 'head', 'arm-near'].forEach(function (id) { parts[id] = part(id); rig.appendChild(parts[id]); });
  parts.blades = part('blades'); parts.tail.appendChild(parts.blades);
  var eye = div('hc-eye');
  eye.style.left = (EYE[0] - P.head.box[0]) + 'px'; eye.style.top = (EYE[1] - P.head.box[1]) + 'px';
  parts.head.appendChild(eye);
  stage.appendChild(rig); el.appendChild(glow); el.appendChild(stage);
  var ribbon = loader.querySelector('.intro-ribbon');
  loader.insertBefore(el, ribbon ? ribbon.nextSibling : null);
  var red = div('hc-red'), wash = loader.querySelector('.intro-wash');
  red.setAttribute('aria-hidden', 'true');
  loader.insertBefore(red, wash ? wash.nextSibling : loader.firstChild);

  // The name: "lucy" becomes "luci", "liu" becomes "fer", and the meta line follows.
  var TURN = 1.1, GLITCH = .62;
  var NAMES = [[loader.querySelector('.intro-lucy'), 'luci'], [loader.querySelector('.intro-liu'), 'fer'],
    [loader.querySelector('.intro-meta strong'), 'Lucifer']].filter(function (n) { return n[0]; });
  NAMES.forEach(function (n) { n.push(n[0].textContent); });
  var GLYPHS = 'lucifer666#%&$!?/<>~';
  var turned = false, glitchAt = 0, nextName = 0, twitchAt = 0, twitchUntil = 0, resolve = [];
  function setNames(p, t) {   // p: 0 = old name, 1 = new name; in between, letters resolve left to right
    NAMES.forEach(function (n, k) {
      var to = n[1], out = '';
      for (var i = 0; i < to.length; i++) {
        if (p >= 1 || p >= resolve[k][i]) out += to[i];
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      n[0].textContent = out;
      if (k === 1) moveFer(t - glitchAt >= GLITCH || p >= 1 || (p > .3 && Math.random() < p));   // stutters between corners, then stays
      if (k < 2) {
        var e = p < 1 ? (Math.random() * 2 - 1) * .05 : 0;
        n[0].style.transform = p < 1 ? 'translate(' + e.toFixed(3) + 'em,' + ((Math.random() * 2 - 1) * .02).toFixed(3) + 'em) skewX(' + ((Math.random() * 2 - 1) * 8).toFixed(1) + 'deg)' : '';
        n[0].style.textShadow = p < 1 ? (-.05 - Math.random() * .04).toFixed(3) + 'em 0 #ff2442,' + (.05 + Math.random() * .04).toFixed(3) + 'em 0 #3d7bff' : '';
      }
    });
  }
  function clearNames(restore) {
    NAMES.forEach(function (n) { n[0].style.transform = ''; n[0].style.textShadow = ''; if (restore) n[0].textContent = n[2]; });
    if (restore && NAMES[1]) ['left', 'top', 'right', 'bottom', 'fontSize'].forEach(function (k) { NAMES[1][0].style[k] = ''; });
  }
  // "fer" leaves its corner (where the creature stands) and joins "luci" as one word: on the same
  // line when it fits, stacked under it when it does not. Measured once, at the turn.
  var ferAt = null;
  function placeFer() {
    var a = NAMES[0][0], b = NAMES[1] && NAMES[1][0];
    if (!b || a.className.indexOf('intro-lucy') < 0) return null;
    var ta = a.textContent, tb = b.textContent, fs = getComputedStyle(a).fontSize;
    a.textContent = 'luci'; b.textContent = 'fer'; b.style.fontSize = fs;
    var w = b.offsetWidth, x = a.offsetLeft, y = a.offsetTop, aw = a.offsetWidth, ah = a.offsetHeight, room = a.offsetParent ? a.offsetParent.clientWidth : innerWidth;
    a.textContent = ta; b.textContent = tb; b.style.fontSize = '';
    var line = x + aw + w <= room * .965;
    return { left: (line ? x + aw : x) + 'px', top: (line ? y : y + ah * 1.06) + 'px', fontSize: fs };
  }
  function moveFer(on) {
    if (!ferAt || !NAMES[1]) return;
    var st = NAMES[1][0].style;
    st.left = on ? ferAt.left : ''; st.top = on ? ferAt.top : ''; st.fontSize = on ? ferAt.fontSize : '';
    st.right = on ? 'auto' : ''; st.bottom = on ? 'auto' : '';
  }

  var ready = false;
  Promise.all(imgs.map(function (i) { return i.decode ? i.decode() : Promise.resolve(); })).then(function () { ready = true; }, function () {});

  var raf = 0, t0 = 0, mode = 'wait', until = 0, nextStep = 0, tick = 0, lastBlink = -9, px = null, py = null, neck = [0, 0], s;
  function fresh() {
    return { x: 0, y: 0, r: 0, sx: 1, sy: 1, head: 0, hx: 0, hy: 0, base: 0, tail: 0, blades: 0, af: 0, an: 0,
      ghost: 0, gx: 0, gy: 0, bandR: [0, 0], bandB: [0, 0], eye: .8, blinkFrom: -1, blinkUntil: -1 };
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function f(n) { return n.toFixed(2); }
  function band() { var a = rnd(0, 70); return [a, Math.max(0, 100 - a - rnd(12, 40))]; }
  function clip(b) { return b[0] || b[1] ? 'inset(' + b[0].toFixed(1) + '% 0 ' + b[1].toFixed(1) + '% 0)' : 'none'; }

  function measure() {
    var k = el.offsetWidth / W, r = el.getBoundingClientRect();
    stage.style.transform = 'scale(' + k + ')';
    neck = [r.left + (P.head.pivot[0] - B[0]) * k, r.top + (P.head.pivot[1] - B[1]) * k];
  }
  // It faces left; positive rotation lifts the snout. Without a pointer it looks up at the viewer.
  function aim() {
    if (px == null) return 6;
    var a = Math.atan2(neck[1] - py, Math.abs(neck[0] - px)) * 180 / Math.PI;
    return Math.max(-26, Math.min(24, a));
  }
  function move(e) { px = e.clientX; py = e.clientY; }

  function enter(m, t) {
    mode = m;
    if (m === 'stare') {
      until = t + rnd(.28, .75);
      s.ghost = 0; s.r = rnd(-2, 2); s.sx = s.sy = 1; s.af = s.an = 0; s.y = 0; s.x = rnd(-6, 6);
      s.bandR = s.bandB = [0, 0];
    } else if (m === 'burst') {
      until = t + rnd(.22, .5);
      // Skips a frame like a bad cut. Kept at least 1.4s apart, well under three flashes a second.
      if (t - lastBlink > 1.4 && Math.random() < .35) { lastBlink = t; s.blinkFrom = t; s.blinkUntil = t + .07; }
    } else {
      until = t + rnd(.3, .55);
      s.base = s.head;
    }
  }

  function render(t) {
    el.classList.toggle('is-blink', t >= s.blinkFrom && t < s.blinkUntil);
    rig.style.transform = 'translate(' + f(s.x) + 'px,' + f(s.y) + 'px) rotate(' + f(s.r) + 'deg) scale(' + f(s.sx) + ',' + f(s.sy) + ')';
    parts.head.style.transform = 'translate(' + f(s.hx) + 'px,' + f(s.hy) + 'px) rotate(' + f(s.head) + 'deg)';
    parts.tail.style.transform = 'rotate(' + f(s.tail) + 'deg)';
    parts.blades.style.transform = 'rotate(' + f(s.blades) + 'deg)';
    parts['arm-far'].style.transform = 'rotate(' + f(s.af) + 'deg)';
    parts['arm-near'].style.transform = 'rotate(' + f(s.an) + 'deg)';
    gR.style.opacity = gB.style.opacity = f(s.ghost);
    gR.style.transform = 'translate(' + f(s.gx) + 'px,' + f(s.gy) + 'px)';
    gB.style.transform = 'translate(' + f(-s.gx) + 'px,' + f(-s.gy) + 'px)';
    gR.style.clipPath = clip(s.bandR); gB.style.clipPath = clip(s.bandB);
    eye.style.opacity = f(s.eye);
    glow.style.opacity = f(.3 + s.eye * .5);
  }

  function names(t, ms) {
    if (t < TURN) return;
    if (!turned) {
      turned = true; glitchAt = t; nextName = 0; twitchAt = t + GLITCH + rnd(.7, 1.3);
      ferAt = placeFer();
      loader.classList.add('hc-hell');
      resolve = NAMES.map(function (n) {
        var L = n[1].length;
        return n[1].split('').map(function (_, i) { return .2 + .72 * (i + 1) / (L + 1) + rnd(-.08, .08); });
      });
    }
    var p = Math.min(1, (t - glitchAt) / GLITCH);
    if (p < 1) { if (ms >= nextName) { nextName = ms + 45; setNames(p, t); } return; }
    if (t >= twitchAt) {   // afterwards a letter or two slips now and then
      twitchUntil = t + rnd(.09, .18); twitchAt = t + rnd(.9, 1.7);
      resolve = NAMES.map(function (n) { return n[1].split('').map(function () { return Math.random() < .3 ? 2 : 0; }); });
    }
    if (t < twitchUntil) { if (ms >= nextName) { nextName = ms + 45; setNames(.5, t); } }
    else if (nextName !== -1) { nextName = -1; setNames(1, t); }
  }

  function frame(ms) {
    if (!loader.classList.contains('intro-active') || loader.classList.contains('is-done') || document.hidden) { raf = 0; return; }
    var t = (ms - t0) / 1000;
    names(t, ms);
    if (mode === 'wait') {
      if (!ready || t < TURN + .08) { raf = requestAnimationFrame(frame); return; }
      // Glitches in: on, one dropped frame, on, straight into a spasm.
      el.classList.add('is-on'); lastBlink = t; s.blinkFrom = t + .05; s.blinkUntil = t + .11;
      enter('burst', t); until = t + .42;
    } else if (t > until) {
      enter(mode === 'stare' ? (Math.random() < .6 ? 'burst' : 'shake') : 'stare', t);
    }

    if (mode === 'stare') {
      if ((tick++ & 1) === 0) { s.x += rnd(-1.5, 1.5) - s.x * .2; s.y = rnd(-1.5, 1.5); }
      s.head += (aim() - s.head) * .18; s.hx *= .8; s.hy *= .8;
      s.tail = Math.sin(t * 3.1) * 3 - 2; s.blades = Math.sin(t * 7) * 3;
      s.eye = .85 + Math.random() * .15;
    } else if (mode === 'burst') {
      if (ms >= nextStep) {
        nextStep = ms + 42;   // 24 fps, held like stop motion
        s.x = rnd(-28, 28); s.y = rnd(-36, 4); s.r = rnd(-7, 7); s.sy = rnd(.9, 1.07); s.sx = 2 - s.sy;
        s.head = rnd(-34, 26); s.hx = rnd(-12, 12); s.hy = rnd(-10, 10);
        s.tail = rnd(-14, 4); s.blades = rnd(-16, 16); s.af = rnd(-35, 20); s.an = rnd(-35, 20);
        s.ghost = rnd(.45, .9); s.gx = rnd(10, 30) * (Math.random() < .5 ? -1 : 1); s.gy = rnd(-6, 6);
        s.bandR = band(); s.bandB = band(); s.eye = rnd(.4, 1);
      }
    } else {
      var w = Math.sin(t * Math.PI * 2 * 17);
      s.head = s.base + w * 15; s.hx = w * 5;
      s.x = Math.sin(t * Math.PI * 2 * 11) * 5; s.y = rnd(-2, 2);
      s.tail = Math.sin(t * Math.PI * 2 * 7) * 6 - 5; s.blades = rnd(-8, 8);
      if (ms >= nextStep) { nextStep = ms + 60; s.af = rnd(-20, 10); s.an = rnd(-20, 10); }
      s.ghost = .35; s.gx = -w * 14; s.gy = 0; s.bandR = s.bandB = [0, 0]; s.eye = 1;
    }
    render(t);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    removeEventListener('resize', measure);
    loader.removeEventListener('pointermove', move);
    if (turned) setNames(1, 0);
    clearNames(false);   // the exit slides the type out; inline transforms would pin it
    // On the timed exit it lunges at the viewer while the curtains open.
    if (s && el.classList.contains('is-on') && loader.classList.contains('is-done')) {
      s.ghost = .8; s.gx = 26; s.gy = 0; s.bandR = s.bandB = [0, 0]; s.blinkUntil = -1;
      render(0);
      el.classList.add('is-lunge');
    }
  }
  function begin() {
    stop();
    el.classList.add('hc-reset');
    el.classList.remove('is-lunge', 'is-on', 'is-blink');
    loader.classList.add('hc-snap');
    loader.classList.remove('hc-hell');
    clearNames(true);
    void el.offsetWidth;
    el.classList.remove('hc-reset');
    loader.classList.remove('hc-snap');
    turned = false; twitchUntil = 0;
    s = fresh(); mode = 'wait'; nextStep = 0; tick = 0; lastBlink = -9; px = py = null;
    t0 = performance.now();
    measure();
    addEventListener('resize', measure, { passive: true });
    loader.addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(frame);
  }
  api.mount(begin, stop);
})();
