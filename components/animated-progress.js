/*
  Animated circular progress gauge — vanilla adaptation of the Magic UI
  AnimatedCircularProgressBar (https://magicui.design). The original is a React/TS +
  Tailwind component; this site has no bundler, so it's reimplemented as a dependency-free
  enhancer: any <div class="acp" data-acp-value="71" ...> becomes an SVG ring gauge that
  fills its arc and counts up when scrolled into view.

  Data attributes:
    data-acp-value   0-100 target (required)
    data-acp-label   small caption under the number (optional)
    data-acp-prefix  e.g. "~" (optional)
    data-acp-suffix  default "%" — pass "" for none
  Style hooks (CSS custom props on the element):
    --acp-size, --acp-primary, --acp-track, --acp-stroke
  Honors prefers-reduced-motion (renders the final state, no animation).
*/
(function () {
  'use strict';
  var R = 42;
  var C = 2 * Math.PI * R;

  function build(el) {
    if (el.__acpDone) return;
    el.__acpDone = true;
    var value = Math.max(0, Math.min(100, parseFloat(el.getAttribute('data-acp-value')) || 0));
    var label = el.getAttribute('data-acp-label') || '';
    var prefix = el.getAttribute('data-acp-prefix') || '';
    var suffix = el.getAttribute('data-acp-suffix');
    if (suffix === null) suffix = '%';

    el.innerHTML =
      '<svg class="acp-svg" viewBox="0 0 100 100" aria-hidden="true">' +
        '<circle class="acp-track" cx="50" cy="50" r="' + R + '"></circle>' +
        '<circle class="acp-bar" cx="50" cy="50" r="' + R + '" ' +
          'style="stroke-dasharray:' + C.toFixed(2) + ';stroke-dashoffset:' + C.toFixed(2) + '"></circle>' +
      '</svg>' +
      '<div class="acp-center">' +
        '<span class="acp-num">' + prefix + '0' + suffix + '</span>' +
        (label ? '<span class="acp-label">' + label + '</span>' : '') +
      '</div>';

    var bar = el.querySelector('.acp-bar');
    var num = el.querySelector('.acp-num');
    var reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    var target = C * (1 - value / 100);

    function run() {
      if (reduced) {
        bar.style.strokeDashoffset = target.toFixed(2);
        num.textContent = prefix + Math.round(value) + suffix;
        return;
      }
      requestAnimationFrame(function () { bar.style.strokeDashoffset = target.toFixed(2); });
      var start = 0, dur = 1400;
      function tick(t) {
        if (!start) start = t;
        var p = Math.min((t - start) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);
        num.textContent = prefix + Math.round(value * e) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    if (!('IntersectionObserver' in window)) { run(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { run(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
  }

  function init() {
    var nodes = document.querySelectorAll('.acp[data-acp-value]');
    for (var i = 0; i < nodes.length; i++) build(nodes[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
