/* The site header on every page but home (plain JS, window.SiteHeader; mounts itself on [data-site-header]).
   Lucy, 2026-10-31, from user testing: "headers and footers dpnt match about all work etc and build w ai page". She
   picked one set everywhere: every page gets the home page's header, the logo left and MENU right, opening the same
   menu. It is built from home's own classes in styles.css (.flow-menu-header, .flow-menu-logo, .flow-menu-toggle,
   .flow-menu-overlay, .flow-menu__item, .flow-marquee, .flow-menu__footer), so the two cannot drift apart: the same
   rows in the same order with the same images (ITEMS mirrors Nav.jsx, and tests/site-chrome.test.js holds them
   equal), the same marquee sliding in from the nearer edge on hover, the same Elsewhere row. Home keeps its React
   FlowingMenu; this is the same menu without React or GSAP (about 200KB a case study would otherwise download for one
   button), animated with the Web Animations API at home's timings and eases.

   About links to index.html#about, which opens About on the home page. The resume is the designed PDF, in a new tab.
   The CV is reached only from About, so it is not here.

   Open, the menu holds focus: everything else on the page is inert, Tab wraps through the logo, the toggle and the
   links, and Escape closes it and hands focus back to the toggle. The page under it does not scroll. Reduced motion
   keeps the fades and drops the movement: no looping marquee (as on home), no lift on the rows, and the hover band
   appears without sliding. The marquee images load on the first open (or as the pointer or focus reaches MENU), and
   the loops run only while the menu is open.

   Past the top of the page the header takes a frosted backing, so text scrolling under it never meets the logo. The
   logo is the breathing wordmark ([data-wordmark], components/wordmark.js): this script mounts it when the engine is
   already in, and the engine's own auto-mount finds it otherwise; under a loading screen it sweeps in as the screen
   lifts. Print hides the header and the menu. */
(function () {
  'use strict';

  // Nav.jsx's rows and Elsewhere links, with About pointed at the home page.
  var ITEMS = [
    { text: 'Work', ariaLabel: 'View all work', link: 'work.html', image: 'assets/driftwood/cover-reel.webp' },
    { text: 'With AI', ariaLabel: 'How I build with AI', link: 'with-ai.html', image: 'assets/with-ai/menu-hover.webp' },
    { text: 'About', ariaLabel: 'About Lucy Liu', link: 'index.html#about', image: 'assets/headshot.jpg' },
    { text: 'Contact', ariaLabel: 'Email Lucy Liu', link: 'mailto:wl3512@nyu.edu', image: 'assets/lucy-tooth-gem.webp' },
    { text: 'Resume', ariaLabel: 'View resume PDF (opens in new tab)', link: 'assets/Lucy_Liu_Resume.pdf', external: true, image: 'assets/driftwood/cover.webp' }
  ];
  var SOCIALS = [
    { label: 'LinkedIn', link: 'https://www.linkedin.com/in/lucyliuxyz/' },
    { label: 'GitHub', link: 'https://github.com/wl3512-lab' },
    { label: 'Instagram', link: 'https://www.instagram.com/lucyliuxyz/' },
    { label: 'Other work', link: 'other-work.html', internal: true }
  ];
  var SPEED = 16;   // seconds per marquee loop (home: speed={16})
  // Home's GSAP eases as cubic-beziers: expo.out, power2.out, power4.out, power3.in.
  var EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)', P2OUT = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    P4OUT = 'cubic-bezier(0.23, 1, 0.32, 1)', P3IN = 'cubic-bezier(0.55, 0.055, 0.675, 0.19)';

  var api = { items: ITEMS, socials: SOCIALS };
  if (typeof window !== 'undefined') window.SiteHeader = api;
  if (typeof document === 'undefined') return;

  // Only what home's stylesheet does not already say: the backing past the top (it out-ranks styles.css's phone rule,
  // which keys home's backing to its loading screen) and print.
  var CSS =
    'body.has-site-header .site-header.flow-menu-header{transition:background-color .25s ease,box-shadow .25s ease}' +
    'body.has-site-header .site-header.flow-menu-header:not(.is-open):not(.is-scrolled){background:transparent;box-shadow:none}' +
    'body.has-site-header .site-header.flow-menu-header.is-scrolled:not(.is-open){background:var(--void);' +
    'background:color-mix(in srgb,var(--void) 90%,transparent);box-shadow:0 1px 0 var(--border);' +
    '-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%)}' +
    '@media (prefers-reduced-motion:reduce){body.has-site-header .site-header.flow-menu-header{transition:none}}' +
    '@media print{.site-header,.site-menu{display:none!important}}';

  function injectStyles() {
    if (document.getElementById('site-header-styles')) return;
    var st = document.createElement('style');
    st.id = 'site-header-styles';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function mount(host) {
    if (!host) return null;
    if (host.__siteHeader) return host.__siteHeader;
    injectStyles();
    var doc = document, body = doc.body;
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var here = decodeURIComponent((location.pathname.split('/').pop() || 'index.html'));
    var open = false, warmed = false, held = [], anims = [], prevOverflow = '';

    // The header: home's markup (FlowMenu in FlowingMenu.jsx), the logo pointing home.
    host.classList.add('flow-menu-header', 'site-header');
    host.innerHTML =
      '<a href="index.html" class="flow-menu-logo" aria-label="Lucy Liu, home"><span class="flow-menu-logo-text" data-wordmark>lucy liu</span></a>' +
      '<div class="flow-menu-header-actions"><button type="button" class="flow-menu-toggle" aria-expanded="false" aria-controls="site-menu" aria-label="Open menu">' +
      '<span class="flow-menu-toggle-label">Menu</span><span class="flow-menu-toggle-icon" aria-hidden="true"><span></span><span></span></span></button></div>';
    body.classList.add('has-site-header');
    var logo = host.querySelector('.flow-menu-logo'), toggle = host.querySelector('.flow-menu-toggle');
    var label = toggle.querySelector('.flow-menu-toggle-label'), mark = host.querySelector('[data-wordmark]');

    // The menu: one row per item (a link and the marquee that slides over it on hover), then Elsewhere.
    var overlay = el('div', 'flow-menu-overlay site-menu');
    overlay.id = 'site-menu';
    overlay.setAttribute('aria-hidden', 'true');
    var nav = el('nav', 'flow-menu');
    nav.setAttribute('aria-label', 'Menu');
    overlay.appendChild(nav);

    function addParts(r, n) {
      for (; r.parts < n; r.parts++) {
        var part = el('div', 'flow-marquee__part'), word = el('span'), img = el('div', 'flow-marquee__img');
        word.textContent = r.item.text;
        if (warmed) img.style.backgroundImage = 'url("' + r.item.image + '")';
        part.appendChild(word); part.appendChild(img); r.inner.appendChild(part);
      }
    }
    var rows = ITEMS.map(function (item) {
      var row = el('div', 'flow-menu__item'), a = el('a', 'flow-menu__link');
      a.setAttribute('href', item.link);
      a.setAttribute('aria-label', item.ariaLabel || item.text);
      if (item.external) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
      if (item.link === here) a.setAttribute('aria-current', 'page');
      a.textContent = item.text;
      var marquee = el('div', 'flow-marquee'), wrap = el('div', 'flow-marquee__wrap'), inner = el('div', 'flow-marquee__inner');
      inner.setAttribute('aria-hidden', 'true');
      wrap.appendChild(inner); marquee.appendChild(wrap); row.appendChild(a); row.appendChild(marquee); nav.appendChild(row);
      var r = { row: row, link: a, marquee: marquee, inner: inner, item: item, parts: 0, cw: 0, loop: null, loopW: 0 };
      addParts(r, 4);
      a.addEventListener('mouseenter', function (e) { slide(r, e, true); });
      a.addEventListener('mouseleave', function (e) { slide(r, e, false); });
      a.addEventListener('click', function () { setOpen(false); });
      return r;
    });
    var foot = el('div', 'flow-menu__footer'), tag = el('span', 'flow-menu__footer-label'), list = el('ul');
    foot.setAttribute('role', 'group'); foot.setAttribute('aria-label', 'Elsewhere');
    tag.textContent = 'Elsewhere';
    SOCIALS.forEach(function (s) {
      var li = el('li'), a = el('a');
      a.setAttribute('href', s.link); if (!s.internal) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
      var label = el('span'), arrow = el('span', 'flow-menu__social-arrow');
      label.textContent = s.label; arrow.textContent = s.internal ? '→' : '↗'; arrow.setAttribute('aria-hidden', 'true');
      a.appendChild(label); a.appendChild(arrow);
      li.appendChild(a); list.appendChild(li);
    });
    foot.appendChild(tag); foot.appendChild(list); overlay.appendChild(foot);
    host.parentNode.insertBefore(overlay, host.nextSibling);

    // The marquee images load once the menu is wanted, not with every page.
    function warm() {
      if (warmed) return;
      warmed = true;
      rows.forEach(function (r) {
        [].forEach.call(r.inner.querySelectorAll('.flow-marquee__img'), function (d) { d.style.backgroundImage = 'url("' + r.item.image + '")'; });
      });
    }
    // Enough copies to run past the screen's width, as home's FlowMenuItem counts them.
    function size() {
      rows.forEach(function (r) {
        var cw = r.inner.firstChild ? r.inner.firstChild.offsetWidth : 0;
        if (!cw) return;
        r.cw = cw;
        addParts(r, Math.max(4, Math.ceil(window.innerWidth / cw) + 2));
      });
    }
    function loops(run) {
      rows.forEach(function (r) {
        if (!run || reduce.matches || !r.inner.animate || !r.cw) { if (r.loop) r.loop.pause(); return; }
        if (r.loop && r.loopW === r.cw) { r.loop.play(); return; }
        if (r.loop) r.loop.cancel();
        r.loopW = r.cw;
        r.loop = r.inner.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + -r.cw + 'px)' }], { duration: SPEED * 1000, iterations: Infinity });
      });
    }

    // Hover: the band slides in from the edge the pointer came through and leaves through the one it goes out by.
    // The loop runs on transform, the slide on translate, so the two compose as GSAP's x and y did.
    function edgeOf(r, e) {
      var b = r.row.getBoundingClientRect(), x = e.clientX - b.left - b.width / 2, y = e.clientY - b.top;
      return x * x + y * y < x * x + (y - b.height) * (y - b.height) ? 'top' : 'bottom';
    }
    function move(node, prop, from, to) {
      var prev = node.__slide;
      if (prev) { try { prev.commitStyles(); } catch (err) {} prev.cancel(); node.__slide = null; }
      if (from == null) from = node.style[prop] || getComputedStyle(node)[prop];
      node.style[prop] = to;
      if (reduce.matches || !node.animate) return;
      var k0 = {}, k1 = {};
      k0[prop] = from; k1[prop] = to;
      node.__slide = node.animate([k0, k1], { duration: 600, easing: EXPO });
    }
    function slide(r, e, entering) {
      var top = edgeOf(r, e) === 'top';
      var off = top ? 'translate3d(0, -101%, 0)' : 'translate3d(0, 101%, 0)', offIn = top ? '0 101%' : '0 -101%';
      if (entering) { move(r.marquee, 'transform', off, 'translate3d(0, 0, 0)'); move(r.inner, 'translate', offIn, '0 0'); }
      else { move(r.marquee, 'transform', null, off); move(r.inner, 'translate', null, offIn); }
    }

    // Open and close: home's timeline (the panel fades in over 0.3 s, the rows rise 9% in a 0.07 s stagger, Elsewhere
    // follows; closing fades out over 0.28 s), with reduced motion keeping only the fades.
    function stopAnims() { anims.forEach(function (a) { a.cancel(); }); anims = []; }
    function show(opening) {
      stopAnims();
      var s = overlay.style;
      if (opening) {
        s.visibility = 'visible'; s.pointerEvents = 'auto'; s.opacity = '1';
        if (!overlay.animate) return;
        var still = reduce.matches;
        anims.push(overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: P2OUT }));
        rows.forEach(function (r, i) {
          anims.push(r.row.animate(still ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(9%)' }, { opacity: 1, transform: 'none' }],
            { duration: 600, delay: 40 + i * 70, easing: P4OUT, fill: 'backwards' }));
        });
        anims.push(foot.animate(still ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
          { duration: 400, delay: 220, easing: P2OUT, fill: 'backwards' }));
      } else {
        s.pointerEvents = 'none';
        var done = function () { s.visibility = 'hidden'; s.opacity = '0'; };
        if (!overlay.animate) { done(); return; }
        var a = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: P3IN, fill: 'forwards' });
        anims.push(a);
        a.onfinish = function () { done(); a.cancel(); };
      }
    }

    // While open, the rest of the page is inert and Tab stays in the header and the menu.
    function hold() {
      held = [];
      [].forEach.call(body.children, function (c) {
        if (c === host || c === overlay || c.contains(host) || c.contains(overlay) || c.inert || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(c.tagName)) return;
        c.inert = true; held.push(c);
      });
    }
    function release() { held.forEach(function (c) { c.inert = false; }); held = []; }
    function focusables() { return [logo, toggle].concat([].slice.call(overlay.querySelectorAll('a[href]'))); }

    function setOpen(next) {
      if (next === open) return;
      open = next;
      host.classList.toggle('is-open', open);
      if (open) toggle.setAttribute('data-open', ''); else toggle.removeAttribute('data-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      label.textContent = open ? 'Close' : 'Menu';
      overlay.setAttribute('aria-hidden', String(!open));
      if (open) {
        prevOverflow = body.style.overflow;
        body.style.overflow = 'hidden';
        warm(); size(); loops(true); hold();
      } else {
        body.style.overflow = prevOverflow;
        loops(false); release();
      }
      show(open);
    }

    toggle.addEventListener('click', function () { setOpen(!open); });
    toggle.addEventListener('pointerenter', warm);
    toggle.addEventListener('focus', warm);
    doc.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); toggle.focus(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(), first = f[0], last = f[f.length - 1], at = doc.activeElement;
      var inside = host.contains(at) || overlay.contains(at);
      if (e.shiftKey ? (at === first || !inside) : (at === last || !inside)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    });
    window.addEventListener('resize', function () { if (open) { size(); loops(true); } });
    // A page restored from the back-forward cache comes back closed.
    window.addEventListener('pageshow', function (e) { if (e.persisted && open) setOpen(false); });

    // The backing, once the page has moved off its top.
    var ticking = false;
    function scrolled() { ticking = false; host.classList.toggle('is-scrolled', (window.scrollY || doc.documentElement.scrollTop || 0) > 4); }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(scrolled); } }, { passive: true });
    scrolled();

    // The wordmark sweeps in once, after the loading screen if one is up (as wordmark.js's own auto-mount does).
    function sweep() {
      if (typeof window.WordmarkMount !== 'function') return;
      if (body.classList.contains('intro-playing') && !window.__loaderExited) { window.addEventListener('loader:exit', sweep, { once: true }); return; }
      window.WordmarkMount(mark).sweep();
    }
    sweep();

    var handle = { open: function () { setOpen(true); }, close: function () { setOpen(false); }, isOpen: function () { return open; }, overlay: overlay };
    host.__siteHeader = handle;
    return handle;
  }

  api.mount = mount;
  function auto() { [].forEach.call(document.querySelectorAll('[data-site-header]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
