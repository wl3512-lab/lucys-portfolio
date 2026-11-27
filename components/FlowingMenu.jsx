/* global React, gsap */
/*
  FlowingMenu — vertical menu where hovering an item slides in a looping marquee
  (text + image) from the nearest edge. Adapted from React Bits (https://reactbits.dev)
  to the no-build globals pattern (gsap + React globals, CSS in styles.css). Added an
  onItemClick callback so items close the overlay; #about / #contact route through the
  site's existing hash handlers. Exposed as window.FlowingMenu.
*/
function FlowingMenu(props) {
  const p = props || {};
  const items = p.items || [];
  const speed = p.speed != null ? p.speed : 16;
  return (
    <nav className="flow-menu" aria-label="Menu">
      {items.map(function (item, idx) {
        return React.createElement(FlowMenuItem, Object.assign({ key: idx, speed: speed, onItemClick: p.onItemClick }, item));
      })}
    </nav>
  );
}

function FlowMenuItem(p) {
  const { useRef, useEffect, useState } = React;
  const itemRef = useRef(null);
  const marqueeRef = useRef(null);
  const marqueeInnerRef = useRef(null);
  const animRef = useRef(null);
  const [reps, setReps] = useState(4);
  const defaults = { duration: 0.6, ease: 'expo' };

  function distMetric(x, y, x2, y2) { var dx = x - x2, dy = y - y2; return dx * dx + dy * dy; }
  function closestEdge(mx, my, w, h) {
    return distMetric(mx, my, w / 2, 0) < distMetric(mx, my, w / 2, h) ? 'top' : 'bottom';
  }

  useEffect(function () {
    function calc() {
      if (!marqueeInnerRef.current) return;
      var part = marqueeInnerRef.current.querySelector('.flow-marquee__part');
      if (!part) return;
      var cw = part.offsetWidth || 1;
      setReps(Math.max(4, Math.ceil(window.innerWidth / cw) + 2));
    }
    calc();
    window.addEventListener('resize', calc);
    return function () { window.removeEventListener('resize', calc); };
  }, [p.text, p.image]);

  useEffect(function () {
    // Skip the looping marquee under reduced-motion; the slide-in on hover still works.
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    var timer = setTimeout(function () {
      if (!marqueeInnerRef.current || typeof gsap === 'undefined') return;
      var part = marqueeInnerRef.current.querySelector('.flow-marquee__part');
      if (!part) return;
      var cw = part.offsetWidth;
      if (!cw) return;
      if (animRef.current) animRef.current.kill();
      animRef.current = gsap.to(marqueeInnerRef.current, { x: -cw, duration: p.speed, ease: 'none', repeat: -1 });
    }, 60);
    return function () { clearTimeout(timer); if (animRef.current) animRef.current.kill(); };
  }, [p.text, p.image, reps, p.speed]);

  function onEnter(ev) {
    if (!itemRef.current || typeof gsap === 'undefined') return;
    var r = itemRef.current.getBoundingClientRect();
    var edge = closestEdge(ev.clientX - r.left, ev.clientY - r.top, r.width, r.height);
    gsap.timeline({ defaults: defaults })
      .set(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .set(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0)
      .to([marqueeRef.current, marqueeInnerRef.current], { y: '0%' }, 0);
  }
  function onLeave(ev) {
    if (!itemRef.current || typeof gsap === 'undefined') return;
    var r = itemRef.current.getBoundingClientRect();
    var edge = closestEdge(ev.clientX - r.left, ev.clientY - r.top, r.width, r.height);
    gsap.timeline({ defaults: defaults })
      .to(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .to(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0);
  }

  var partsArr = [];
  for (var i = 0; i < reps; i++) partsArr.push(i);

  return (
    <div className="flow-menu__item" ref={itemRef}>
      <a
        className="flow-menu__link"
        href={p.link}
        target={p.external ? '_blank' : undefined}
        rel={p.external ? 'noopener noreferrer' : undefined}
        aria-label={p.ariaLabel || p.text}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={function (ev) { if (p.onItemClick) p.onItemClick(ev, p); }}
      >
        {p.text}
      </a>
      <div className="flow-marquee" ref={marqueeRef}>
        <div className="flow-marquee__wrap">
          <div className="flow-marquee__inner" ref={marqueeInnerRef} aria-hidden="true">
            {partsArr.map(function (idx) {
              return (
                <div className="flow-marquee__part" key={idx}>
                  <span>{p.text}</span>
                  <div className="flow-marquee__img" style={{ backgroundImage: 'url(' + p.image + ')' }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

window.FlowingMenu = FlowingMenu;

// Home's menu and About share a focus scope. Walk up the React tree so siblings
// inside #root are held too; inerting only body children would leave them active.
window.LucyFocusScope = function (root, initialFocus, fallbackFocus) {
  if (!root) return function () {};
  const previous = document.activeElement;
  const held = [];
  for (let branch = root; branch && branch !== document.body; branch = branch.parentElement) {
    if (!branch.parentElement) break;
    Array.from(branch.parentElement.children).forEach(function (node) {
      if (node === branch || node.inert || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(node.tagName)) return;
      node.inert = true;
      held.push(node);
    });
  }
  function available(node) {
    return node && node.isConnected && !node.closest('[inert], [aria-hidden="true"]') &&
      node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  }
  function onKey(e) {
    if (e.key !== 'Tab' || e.defaultPrevented) return;
    const links = Array.from(root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')).filter(available);
    if (!links.length) { e.preventDefault(); return; }
    const first = links[0], last = links[links.length - 1], at = document.activeElement;
    if (e.shiftKey ? (at === first || at === root || !root.contains(at)) : (at === last || at === root || !root.contains(at))) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus({ preventScroll: true });
    }
  }
  document.addEventListener('keydown', onKey);
  if (initialFocus) initialFocus.focus({ preventScroll: true });
  return function () {
    document.removeEventListener('keydown', onKey);
    held.forEach(function (node) { node.inert = false; });
    if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
    const back = available(previous) && previous !== document.body ? previous : fallbackFocus;
    if (available(back)) back.focus({ preventScroll: true });
  };
};

/*
  FlowMenu — the site's menu shell built around FlowingMenu. A fixed wordmark +
  toggle button opens a full-screen overlay containing the flowing marquee menu and
  a socials footer. Handles open/close (GSAP fade + item stagger), Escape, body lock,
  and routes item clicks through the page's onNavClick (#about overlay, #contact smooth
  scroll); work.html / resume navigate normally. Replaces StaggeredMenu. window.FlowMenu.
*/
function FlowMenu(props) {
  const p = props || {};
  const { useState, useRef, useEffect, useCallback } = React;
  const items = p.items || [];
  const socialItems = p.socialItems || [];
  const logoText = p.logoText || 'lucy liu';

  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const overlayRef = useRef(null);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);
  const tlRef = useRef(null);
  const wordmarkRef = useRef(null);

  // The wordmark engine (components/wordmark.js) owns this span's children, which is
  // why it renders empty below. Without the engine the name falls back to plain text.
  // The one-time sweep waits for the loader handoff, so it plays where you can see it.
  useEffect(function () {
    const el = wordmarkRef.current;
    if (!el) return;
    if (typeof WordmarkMount === 'undefined') { el.textContent = logoText; return; }
    const wm = WordmarkMount(el, logoText);
    let timer = 0;
    // When the loader wore the same wordmark, it already swept and flies in at rest, so the
    // nav only picks up the breath. Otherwise the nav does its own sweep.
    const start = window.__loaderWave ? wm.breathe : wm.sweep;
    const sweep = function () { timer = setTimeout(start, window.__loaderFast ? 200 : 900); };
    if (window.__loaderExited) sweep();
    else window.addEventListener('loader:exit', sweep, { once: true });
    return function () {
      clearTimeout(timer);
      window.removeEventListener('loader:exit', sweep);
      wm();
    };
  }, [logoText]);

  const animate = useCallback(function (opening) {
    const overlay = overlayRef.current;
    if (!overlay) return;
    if (typeof gsap === 'undefined') {
      overlay.style.visibility = opening ? 'visible' : 'hidden';
      overlay.style.opacity = opening ? '1' : '0';
      overlay.style.pointerEvents = opening ? 'auto' : 'none';
      return;
    }
    tlRef.current && tlRef.current.kill();
    const tl = gsap.timeline();
    if (opening) {
      const rows = overlay.querySelectorAll('.flow-menu__item');
      const foot = overlay.querySelector('.flow-menu__footer');
      tl.set(overlay, { visibility: 'visible', pointerEvents: 'auto' });
      tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0);
      if (rows.length) tl.fromTo(rows, { yPercent: 9, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power4.out', stagger: 0.07 }, 0.04);
      if (foot) tl.fromTo(foot, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.22);
    } else {
      tl.to(overlay, { opacity: 0, duration: 0.28, ease: 'power3.in' });
      tl.set(overlay, { pointerEvents: 'none', visibility: 'hidden' });
    }
    tlRef.current = tl;
  }, []);

  const setOpenState = useCallback(function (next) {
    openRef.current = next;
    setOpen(next);
    animate(next);
  }, [animate]);

  const toggle = useCallback(function () { setOpenState(!openRef.current); }, [setOpenState]);
  const close = useCallback(function () { if (openRef.current) setOpenState(false); }, [setOpenState]);

  useEffect(function () {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const release = window.LucyFocusScope(rootRef.current, toggleRef.current, toggleRef.current);
    const onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    document.addEventListener('keydown', onKey);
    return function () {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      release();
    };
  }, [open, close]);

  // Route the click through the page handler (handles #about / #contact), then close.
  // onNavClick no-ops for non-hash hrefs, so work.html / resume navigate normally.
  const onItemClick = function (ev) {
    if (p.onNavClick) p.onNavClick(ev);
    close();
  };

  return (
    <div className="flow-menu-root" ref={rootRef} role={open ? 'dialog' : undefined} aria-modal={open ? true : undefined} aria-label={open ? 'Site menu' : undefined}>
      <header className={'flow-menu-header' + (open ? ' is-open' : '')}>
        <a href="/" className="flow-menu-logo" aria-label="Lucy Liu, back to top">
          <span className="flow-menu-logo-text" ref={wordmarkRef} />
        </a>
        <div className="flow-menu-header-actions">
          <button
            type="button"
            ref={toggleRef}
            className="flow-menu-toggle"
            data-open={open || undefined}
            aria-expanded={open}
            aria-controls="flow-menu-overlay"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={toggle}
          >
            <span className="flow-menu-toggle-label">{open ? 'Close' : 'Menu'}</span>
            <span className="flow-menu-toggle-icon" aria-hidden="true"><span /><span /></span>
          </button>
        </div>
      </header>

      <div id="flow-menu-overlay" ref={overlayRef} className="flow-menu-overlay" aria-hidden={!open}>
        <FlowingMenu items={items} speed={p.speed} onItemClick={onItemClick} />
        {socialItems.length > 0 && (
          <div className="flow-menu__footer" role="group" aria-label="Elsewhere">
            <span className="flow-menu__footer-label">Elsewhere</span>
            <ul>
              {socialItems.map(function (s, i) {
                return (
                  <li key={s.label + i}>
                    <a href={s.link} target={s.internal ? undefined : '_blank'} rel={s.internal ? undefined : 'noopener noreferrer'}><span>{s.label}</span><span className="flow-menu__social-arrow" aria-hidden="true">{s.internal ? '→' : '↗'}</span></a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

window.FlowMenu = FlowMenu;
