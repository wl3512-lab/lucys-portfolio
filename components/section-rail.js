/*
  Section rail: the "jump to section" nav on every project page. Framework-free, window
  globals only, and self-contained like wordmark.js: it brings its own styles.

  It replaces the zigzag constellation each page used to draw (Lucy, 2026-10-02: "fix up
  this scroll"). That one placed seven evenly spaced dots on a random zigzag, named only the
  lit one, called the opening "Hero" and kept it lit through the whole overview, and could
  never light the stops folded inside "Read the full process". Now:
    - one straight line that fills as you read, so it shows how far through the page you are;
    - each stop sits where its section actually becomes the one being read, so a long section
      takes up more of the line and the fill reaches a stop exactly as it lights;
    - the lit stop is named; hovering or focusing the rail names them all;
    - "Hero" reads as Overview;
    - a stop whose section is folded away is a hollow ring at the fold. Clicking it opens
      the fold (window.__csOpenMoreFor, set by pages that fold) and jumps there.

  Markup contract (already on every project page): <nav id="cs-section-nav"> holding
  .cs-const-g[data-snav="<section id>"] groups and .cs-const-label-el[data-label] labels.
  The script reads those, then swaps the whole nav for a fresh one, so the page's old
  inline rail script keeps writing to a detached element and can no longer fight it.
  Hidden below 900px, as before. window.SectionRail exposes the pure helpers for tests.
*/
(function () {
  var TRIGGER = 0.3;   // a section is "being read" once its top crosses 30% down the viewport

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function stopAt(top, vh, maxScroll) {
    if (!(maxScroll > 0)) return 0;
    return clamp01((top - vh * TRIGGER) / maxScroll);
  }
  function progress(y, maxScroll) { return maxScroll > 0 ? clamp01(y / maxScroll) : 0; }
  // values: each stop's position (or top), null for a folded one. The last at or before the
  // threshold wins; before the first, the first is lit.
  function activeIndex(tops, trigger) {
    var best = -1, first = -1;
    for (var i = 0; i < tops.length; i++) {
      if (tops[i] === null) continue;
      if (first < 0) first = i;
      if (tops[i] <= trigger) best = i;
    }
    return best < 0 ? first : best;
  }
  function labelFor(text) {
    text = (text || '').trim();
    return /^hero$/i.test(text) ? 'Overview' : text;
  }

  var CSS =
    ".sr-rail{position:fixed;right:clamp(14px,1.8vw,28px);top:50%;z-index:50;" +
    "height:min(58vh,480px);width:150px;transform:translateY(-50%);" +
    "opacity:0;pointer-events:none;transition:opacity .5s ease}" +
    ".sr-rail.is-visible{opacity:1;pointer-events:auto}" +
    ".sr-track,.sr-fill{position:absolute;right:11px;top:0;bottom:0;width:1px;border-radius:1px}" +
    ".sr-track{background:var(--border-strong,rgba(160,200,255,.2))}" +
    ".sr-fill{width:2px;right:10.5px;background:linear-gradient(180deg,var(--accent,#72ADFF),#C4B0FF);" +
    "transform-origin:50% 0;transform:scaleY(0);will-change:transform}" +
    ".sr-stop{position:absolute;right:0;width:150px;height:22px;margin:-11px 0 0;padding:0;" +
    "display:flex;align-items:center;justify-content:flex-end;gap:12px;" +
    "background:none;border:0;cursor:pointer;color:var(--fg3,#7d88aa);font:inherit}" +
    ".sr-dot{flex:0 0 auto;width:7px;height:7px;margin-right:8px;border-radius:50%;box-sizing:border-box;" +
    "background:var(--bg,#05060F);border:1px solid var(--fg3,rgba(160,200,255,.5));" +
    "transition:transform .3s ease,background .3s ease,border-color .3s ease,box-shadow .3s ease}" +
    ".sr-stop.is-passed .sr-dot{background:var(--accent,#72ADFF);border-color:var(--accent,#72ADFF)}" +
    ".sr-stop.is-active .sr-dot{transform:scale(1.5);background:var(--accent,#72ADFF);" +
    "border-color:var(--accent,#72ADFF);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent,#72ADFF) 22%,transparent)}" +
    ".sr-stop.is-folded .sr-dot{background:var(--bg,#05060F);border-style:dashed}" +
    ".sr-label{font-family:var(--font-code,'Space Mono',monospace);font-size:9.5px;letter-spacing:.16em;" +
    "text-transform:uppercase;white-space:nowrap;padding:3px 7px;border-radius:3px;" +
    "background:color-mix(in srgb,var(--bg,#05060F) 82%,transparent);" +
    "opacity:0;transform:translateX(4px);transition:opacity .25s ease,transform .25s ease,color .25s ease}" +
    ".sr-stop.is-active .sr-label{opacity:1;transform:none;color:var(--fg-accent,#72ADFF)}" +
    ".sr-rail:hover .sr-label,.sr-rail:focus-within .sr-label{opacity:1;transform:none}" +
    ".sr-stop:hover .sr-label,.sr-stop:focus-visible .sr-label{color:var(--fg1,#F6FAFF)}" +
    ".sr-stop:focus-visible{outline:none}" +
    ".sr-stop:focus-visible .sr-dot{outline:2px solid var(--accent,#72ADFF);outline-offset:3px}" +
    "@media (max-width:900px){.sr-rail{display:none}}" +
    "@media (prefers-reduced-motion:reduce){.sr-rail,.sr-dot,.sr-label{transition:none}}";

  function injectStyles() {
    if (document.getElementById('sr-styles')) return;
    var st = document.createElement('style');
    st.id = 'sr-styles';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function mount() {
    var old = document.getElementById('cs-section-nav');
    if (!old || old.__sectionRail) return;
    var groups = [].slice.call(old.querySelectorAll('.cs-const-g[data-snav]'));
    if (!groups.length) return;
    var names = {};
    [].slice.call(old.querySelectorAll('.cs-const-label-el[data-label]')).forEach(function (l) {
      names[l.dataset.label] = l.textContent;
    });
    var stops = groups.map(function (g) {
      var id = g.dataset.snav;
      return { id: id, el: document.getElementById(id), name: labelFor(names[id] || id.replace(/^cs-s-/, '')) };
    }).filter(function (s) { return !!s.el; });
    if (!stops.length) return;

    injectStyles();
    var nav = document.createElement('nav');
    nav.id = 'cs-section-nav';
    nav.className = 'sr-rail';
    nav.setAttribute('aria-label', 'Jump to section');
    nav.__sectionRail = true;
    var track = document.createElement('span'); track.className = 'sr-track';
    var fill = document.createElement('span'); fill.className = 'sr-fill';
    track.setAttribute('aria-hidden', 'true'); fill.setAttribute('aria-hidden', 'true');
    nav.appendChild(track); nav.appendChild(fill);

    stops.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sr-stop';
      var label = document.createElement('span'); label.className = 'sr-label'; label.textContent = s.name;
      var dot = document.createElement('span'); dot.className = 'sr-dot'; dot.setAttribute('aria-hidden', 'true');
      b.appendChild(label); b.appendChild(dot);
      b.addEventListener('click', function () {
        if (window.__csOpenMoreFor) window.__csOpenMoreFor(s.el);
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // After a fold opens, the target only gets a position on the next frame.
        requestAnimationFrame(function () { s.el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
      });
      s.btn = b;
      nav.appendChild(b);
    });
    old.parentNode.replaceChild(nav, old);

    // Where a folded section's stop goes: the nearest ancestor that is on the page.
    function anchorTop(el) {
      var n = el;
      while (n && n !== document.body && !n.getClientRects().length) n = n.parentElement;
      if (n && n !== el && n.previousElementSibling && n.previousElementSibling.getClientRects().length) n = n.previousElementSibling;
      return n && n.getClientRects().length ? n.getBoundingClientRect().top : null;
    }

    var maxScroll = 0, vh = 0, raf = 0;
    function layout() {
      vh = window.innerHeight;
      maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
      var y = window.scrollY || window.pageYOffset || 0;
      stops.forEach(function (s) {
        s.folded = !s.el.getClientRects().length;
        var t = s.folded ? anchorTop(s.el) : s.el.getBoundingClientRect().top;
        s.at = stopAt((t === null ? 0 : t) + y, vh, maxScroll);
        s.btn.classList.toggle('is-folded', s.folded);
        s.btn.setAttribute('aria-label', 'Jump to ' + s.name + (s.folded ? ' (opens the full process)' : ''));
      });
      // Keep stops at least a label apart: two folded sections share one anchor, and short
      // sections would otherwise stack their names on top of each other.
      var gap = Math.min(0.12, 26 / Math.max(1, nav.clientHeight));
      for (var i = 1; i < stops.length; i++) stops[i].at = Math.max(stops[i].at, stops[i - 1].at + gap);
      for (var j = stops.length - 1; j >= 0; j--) {
        var cap = j === stops.length - 1 ? 1 : stops[j + 1].at - gap;
        stops[j].at = Math.max(0, Math.min(stops[j].at, cap));
      }
      stops.forEach(function (s) {
        s.btn.style.top = (s.at * 100).toFixed(3) + '%';
      });
      update();
    }
    function update() {
      raf = 0;
      var y = window.scrollY || window.pageYOffset || 0;
      var p = progress(y, maxScroll);
      fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      // Lit by position, not by a section's top: a stop lights exactly as the fill reaches it.
      // On a short page the last sections can never scroll up to the trigger line; their
      // positions clamp to the end of the line, so they still light as you reach the bottom.
      var a = activeIndex(stops.map(function (s) { return s.folded ? null : s.at; }), p + 0.001);
      stops.forEach(function (s, i) {
        var on = i === a;
        s.btn.classList.toggle('is-active', on);
        s.btn.classList.toggle('is-passed', !on && !s.folded && s.at <= p);
        if (on) s.btn.setAttribute('aria-current', 'location'); else s.btn.removeAttribute('aria-current');
      });
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(update); }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', layout, { passive: true });
    window.addEventListener('load', layout);
    // Folds opening, images landing and late layout all change where the sections sit.
    if (typeof ResizeObserver !== 'undefined') {
      try { new ResizeObserver(function () { layout(); }).observe(document.body); } catch (e) {}
    }
    // Visible once the opening section has left, as before.
    var first = stops[0].el;
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (es) {
        nav.classList.toggle('is-visible', !es[es.length - 1].isIntersecting);
      }, { threshold: 0.15 }).observe(first);
    } else {
      nav.classList.add('is-visible');
    }
    layout();
  }

  window.SectionRail = { stopAt: stopAt, progress: progress, activeIndex: activeIndex, labelFor: labelFor, mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
