/* global React */
/*
  BorderGlow — cursor-reactive mesh-gradient border + edge glow card. Adapted from
  React Bits (https://reactbits.dev) to this site's no-build globals pattern:
  ESM/CSS imports removed (hooks off the global React, styles live in styles.css),
  recolored to the Lit Archive brand, and extended with `as` / `innerClassName` so it
  can render as a link and host a CSS grid (the standout-work cards use both). The
  pointer handler writes --edge-proximity / --cursor-angle; the CSS masks do the rest.
  Exposed as window.BorderGlow.
*/
(function () {
  var GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
  var GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
  var COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

  function parseHSL(hslStr) {
    var m = String(hslStr).match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
    if (!m) return { h: 40, s: 80, l: 80 };
    return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
  }

  function buildGlowVars(glowColor, intensity) {
    var c = parseHSL(glowColor);
    var base = c.h + 'deg ' + c.s + '% ' + c.l + '%';
    var op = [100, 60, 50, 40, 30, 20, 10];
    var keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
    var vars = {};
    for (var i = 0; i < op.length; i++) {
      vars['--glow-color' + keys[i]] = 'hsl(' + base + ' / ' + Math.min(op[i] * intensity, 100) + '%)';
    }
    return vars;
  }

  function buildGradientVars(colors) {
    var vars = {};
    for (var i = 0; i < 7; i++) {
      var c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
      vars[GRADIENT_KEYS[i]] = 'radial-gradient(at ' + GRADIENT_POSITIONS[i] + ', ' + c + ' 0px, transparent 50%)';
    }
    vars['--gradient-base'] = 'linear-gradient(' + colors[0] + ' 0 100%)';
    return vars;
  }

  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInCubic(x) { return x * x * x; }

  function animateValue(opts) {
    var start = opts.start != null ? opts.start : 0;
    var end = opts.end != null ? opts.end : 100;
    var duration = opts.duration != null ? opts.duration : 1000;
    var delay = opts.delay || 0;
    var ease = opts.ease || easeOutCubic;
    var t0 = 0;
    function tick(now) {
      var t = Math.min((now - t0) / duration, 1);
      opts.onUpdate(start + (end - start) * ease(t));
      if (t < 1) requestAnimationFrame(tick);
      else if (opts.onEnd) opts.onEnd();
    }
    setTimeout(function () { t0 = performance.now(); requestAnimationFrame(tick); }, delay);
  }

  function BorderGlow(props) {
    var p = props || {};
    var useRef = React.useRef, useCallback = React.useCallback, useEffect = React.useEffect;
    var Tag = p.as || 'div';
    var cardRef = useRef(null);

    var onPointerMove = useCallback(function (e) {
      var card = cardRef.current;
      if (!card) return;
      var rect = card.getBoundingClientRect();
      var cx = rect.width / 2, cy = rect.height / 2;
      var dx = (e.clientX - rect.left) - cx;
      var dy = (e.clientY - rect.top) - cy;
      var kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
      var ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
      var edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      var angle = 0;
      if (dx !== 0 || dy !== 0) {
        angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;
      }
      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
      card.style.setProperty('--cursor-angle', angle.toFixed(3) + 'deg');
    }, []);

    // Optional intro sweep (off by default; honors reduced-motion).
    useEffect(function () {
      if (!p.animated || !cardRef.current) return;
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;
      var card = cardRef.current;
      var a = 110, b = 465;
      card.classList.add('sweep-active');
      card.style.setProperty('--cursor-angle', a + 'deg');
      animateValue({ duration: 500, onUpdate: function (v) { card.style.setProperty('--edge-proximity', v); } });
      animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: function (v) { card.style.setProperty('--cursor-angle', ((b - a) * (v / 100) + a) + 'deg'); } });
      animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: function (v) { card.style.setProperty('--cursor-angle', ((b - a) * (v / 100) + a) + 'deg'); } });
      animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0,
        onUpdate: function (v) { card.style.setProperty('--edge-proximity', v); },
        onEnd: function () { card.classList.remove('sweep-active'); } });
    }, [p.animated]);

    var intensity = p.glowIntensity != null ? p.glowIntensity : 1.0;
    var colors = p.colors && p.colors.length ? p.colors : ['#72ADFF', '#C4B0FF', '#A0C8FF'];
    var style = Object.assign({
      '--card-bg': p.backgroundColor || '#141930',
      '--edge-sensitivity': p.edgeSensitivity != null ? p.edgeSensitivity : 30,
      '--border-radius': (p.borderRadius != null ? p.borderRadius : 28) + 'px',
      '--glow-padding': (p.glowRadius != null ? p.glowRadius : 40) + 'px',
      '--cone-spread': p.coneSpread != null ? p.coneSpread : 25,
      '--fill-opacity': p.fillOpacity != null ? p.fillOpacity : 0.5
    }, buildGlowVars(p.glowColor || '215 100 72', intensity), buildGradientVars(colors), p.style || {});

    var tagProps = {
      ref: cardRef,
      onPointerMove: onPointerMove,
      className: 'border-glow-card' + (p.className ? ' ' + p.className : ''),
      style: style
    };
    if (p.href) tagProps.href = p.href;
    if (p.onClick) tagProps.onClick = p.onClick;
    if (p.target) tagProps.target = p.target;
    if (p.rel) tagProps.rel = p.rel;
    if (p.ariaLabel) tagProps['aria-label'] = p.ariaLabel;
    if (p.dataCursor) tagProps['data-cursor'] = p.dataCursor;

    return React.createElement(
      Tag,
      tagProps,
      React.createElement('span', { className: 'edge-light', 'aria-hidden': 'true' }),
      React.createElement('div', { className: 'border-glow-inner' + (p.innerClassName ? ' ' + p.innerClassName : '') }, p.children)
    );
  }

  window.BorderGlow = BorderGlow;
})();
