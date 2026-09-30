/*
  Wordmark — the "breathing weight" lucy liu. Framework-free, window globals only, and
  self-contained: it brings its own face and styles, so any page can adopt it with one
  <script src="components/wordmark.js"> and a data-wordmark attribute on its logo.

  Each letter is a span on Anybody's wdth/wght axes, and the dot of the i is a small
  solid navette. One number drives everything: `peak`, the letter index the heavy crest
  sits on. At rest it parks on the i (condensed, light "lucy"; wide, heavy "liu").
  dispose.sweep(ms) sends it in from the left once (eased, or over `ms` when given) and
  then it breathes: the crest eases about a letter left of the i and back on a slow 7s
  cycle, small enough to read as alive rather than moving. The weight profile is a single
  clamped hump, so far letters sit at the floor instead of wrapping round. Under a fine
  pointer the breath fades out and the crest follows the cursor, gliding home on leave.

  dispose.swing(period) runs the crest back and forth across the whole name at constant
  speed, one round trip per `period` ms, until disposed (the loader swings through the
  whole count and the fly-in); dispose.settle() glides it home to the i and hands over to
  the breath.

  WordmarkMount(el, text) -> dispose. The engine owns el's children, so a React host must
  render el empty. A visually hidden copy of `text` keeps the accessible name; the letters
  are aria-hidden. Reduced motion parks the crest and ignores the pointer.
  Elements carrying [data-wordmark] mount themselves at DOMContentLoaded and sweep in.
  WordmarkLetter(i, peak) is pure and exposed for tests.
*/
(function () {
  var REST = 6;        // index of the i in "lucy liu"
  var SPREAD = 0.75;   // radians per letter; the crest covers about three letters
  var EASE = 0.12;     // per-frame glide toward the target
  var DRIFT = 1.1;     // idle breathing: how far left of the i the crest eases
  var PERIOD = 7000;   // ms per breath
  var FROM = -2;       // where a sweep starts, off the left edge
  var NS = 'http://www.w3.org/2000/svg';

  // The face is self-hosted with font-display: block, so the name never paints in a
  // fallback face first (the loader preloads the same file). Font and letter styles are
  // forced with !important because every page's own logo rule sets an italic display face.
  var CSS =
    "@font-face{font-family:'Anybody';font-style:normal;font-weight:100 900;font-stretch:50% 150%;" +
    "font-display:block;src:url('assets/fonts/anybody-variable-latin.woff2') format('woff2');" +
    "unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+2122,U+2212;}" +
    ".wm{font-family:'Anybody',system-ui,sans-serif!important;font-style:normal!important;" +
    "font-weight:400!important;letter-spacing:-0.01em!important;text-transform:none!important;" +
    "line-height:1;position:relative}" +
    ".wm-row{display:inline-flex;align-items:baseline;white-space:pre}" +
    ".wm-ch{display:inline-block;font-variation-settings:'wdth' 100,'wght' 400}" +
    ".wm-i{position:relative}" +
    ".wm-gem{position:absolute;left:50%;bottom:.84em;width:.13em;height:.25em;" +
    "transform:translateX(-50%) scale(var(--wm-gem,1));transform-origin:50% 100%;" +
    "color:currentColor;pointer-events:none}" +
    ".wm-gem svg{display:block;width:100%;height:100%;overflow:visible}" +
    ".wm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);" +
    "clip-path:inset(50%);white-space:nowrap}";

  function injectStyles() {
    if (document.getElementById('wm-styles')) return;
    var st = document.createElement('style');
    st.id = 'wm-styles';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function WordmarkLetter(i, peak) {
    // One hump, not a repeating wave: past half a period the letter stays at the floor.
    // Unclamped, a crest near either end wrapped round and thickened the far letters.
    var a = Math.max(-Math.PI, Math.min(Math.PI, (i - peak) * SPREAD));
    var v = 0.5 + 0.5 * Math.cos(a);
    return {
      v: v,
      wdth: Math.round(60 + v * 90),     // Anybody wdth 50..150
      wght: Math.round(200 + v * 650),   // Anybody wght 100..900
      gem: +(0.78 + v * 0.5).toFixed(3)  // navette scale: heavier stem, bigger stone
    };
  }

  function navette() {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 28');
    svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M8 .5C15.5 7 15.5 21 8 27.5 .5 21 .5 7 8 .5Z');
    p.setAttribute('fill', 'currentColor');
    svg.appendChild(p);
    var span = document.createElement('span');
    span.className = 'wm-gem';
    span.appendChild(svg);
    return span;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function WordmarkMount(el, text) {
    var noop = function () {};
    noop.sweep = noop;
    noop.breathe = noop;
    noop.swing = noop;
    noop.settle = noop;
    if (!el || el.__wordmark) return noop;
    try { injectStyles(); } catch (e) {}
    text = (text || el.textContent || '').trim();
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);

    var label = document.createElement('span');
    label.className = 'wm-sr';
    label.textContent = text;
    var row = document.createElement('span');
    row.className = 'wm-row';
    row.setAttribute('aria-hidden', 'true');
    var letters = text.split('').map(function (ch) {
      var s = document.createElement('span');
      s.className = 'wm-ch';
      if (ch === 'i') { s.className += ' wm-i'; s.textContent = 'ı'; s.appendChild(navette()); }
      else s.textContent = ch;
      row.appendChild(s);
      return s;
    });
    el.textContent = '';
    el.appendChild(label);
    el.appendChild(row);
    el.classList.add('wm');
    el.__wordmark = true;

    var peak = REST;
    var target = REST;
    var raf = 0;
    var breathing = false;
    var hovering = false;
    var drift = 0;       // 0..1, how much of the idle breath is applied
    var t0 = 0;
    var timed = null;    // { start, ms } while a timed sweep runs
    var swing = null;    // { start, period } while swinging end to end

    function paint(crest) {
      letters.forEach(function (s, i) {
        var l = WordmarkLetter(i, crest);
        s.style.fontVariationSettings = "'wdth' " + l.wdth + ", 'wght' " + l.wght;
        if (s.classList.contains('wm-i')) s.style.setProperty('--wm-gem', l.gem);
      });
    }
    function frame(now) {
      now = now || 0;
      if (swing) {
        if (swing.start === null) swing.start = now;
        var span = letters.length - 1;
        // Triangle wave: constant speed end to end, no slowing into the turns.
        var ph = ((now - swing.start) / swing.period) % 1;
        peak = span * (ph < 0.5 ? ph * 2 : 2 - ph * 2);
      } else if (timed) {
        if (timed.start === null) timed.start = now;
        var k = Math.min(1, (now - timed.start) / timed.ms);
        peak = FROM + (REST - FROM) * easeOutCubic(k);
        if (k >= 1) { timed = null; peak = REST; }
      } else {
        peak += (target - peak) * EASE;
        if (Math.abs(target - peak) < 0.01) peak = target;
      }
      var want = breathing && !hovering && !timed && !swing && peak === target ? 1 : 0;
      drift += (want - drift) * 0.04;
      if (Math.abs(want - drift) < 0.001) drift = want;
      if (!t0 && want) t0 = now;
      var phase = t0 ? (now - t0) / PERIOD * Math.PI * 2 : 0;
      paint(peak - drift * DRIFT * (0.5 - 0.5 * Math.cos(phase)));
      raf = (!swing && !timed && peak === target && drift === 0 && !breathing) ? 0 : requestAnimationFrame(frame);
    }
    function go() { if (!raf) raf = requestAnimationFrame(frame); }

    paint(REST);

    var zone = el.closest('a') || el;
    function onMove(e) {
      if (timed || swing) return;
      var r = row.getBoundingClientRect();
      if (!r.width) return;
      hovering = true;
      var x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      target = x * (letters.length - 1);
      go();
    }
    function onLeave() { hovering = false; target = REST; go(); }
    if (!reduce && fine) {
      zone.addEventListener('pointermove', onMove);
      zone.addEventListener('pointerleave', onLeave);
    }

    function dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      breathing = false;
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerleave', onLeave);
      el.textContent = '';
      el.classList.remove('wm');
      el.__wordmark = false;
    }
    dispose.sweep = function (ms) {
      if (reduce) return;
      peak = FROM;
      target = REST;
      timed = ms > 0 ? { start: null, ms: ms } : null;
      breathing = true;
      go();
    };
    dispose.swing = function (period) {
      if (reduce) return;
      swing = { start: null, period: period > 0 ? period : 1200 };
      timed = null;
      go();
    };
    dispose.settle = function () {
      if (!swing) return;
      swing = null;
      target = REST;
      breathing = true;
      go();
    };
    dispose.breathe = function () {
      if (reduce) return;
      breathing = true;
      go();
    };
    return dispose;
  }

  function autoMount() {
    var els = document.querySelectorAll('[data-wordmark]');
    for (var i = 0; i < els.length; i++) {
      try { WordmarkMount(els[i]).sweep(); } catch (e) {}
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
  else autoMount();

  window.WordmarkLetter = WordmarkLetter;
  window.WordmarkMount = WordmarkMount;
})();
