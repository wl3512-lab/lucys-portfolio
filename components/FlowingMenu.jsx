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
  const tlRef = useRef(null);

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
    document.body.style.overflow = next ? 'hidden' : '';
    animate(next);
  }, [animate]);

  const toggle = useCallback(function () { setOpenState(!openRef.current); }, [setOpenState]);
  const close = useCallback(function () { if (openRef.current) setOpenState(false); }, [setOpenState]);

  useEffect(function () {
    const onKey = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('keydown', onKey); };
  }, [close]);

  // Route the click through the page handler (handles #about / #contact), then close.
  // onNavClick no-ops for non-hash hrefs, so work.html / resume navigate normally.
  const onItemClick = function (ev) {
    if (p.onNavClick) p.onNavClick(ev);
    close();
  };

  return (
    <div className="flow-menu-root">
      <header className="flow-menu-header">
        <a href="/" className="flow-menu-logo" aria-label="Lucy Liu, back to top">
          <span className="flow-menu-logo-mark" aria-hidden="true">✶</span>
          <span className="flow-menu-logo-text">{logoText}</span>
        </a>
        <div className="flow-menu-header-actions">
          {typeof AnimatedThemeToggler !== 'undefined' && <AnimatedThemeToggler />}
          <button
            type="button"
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
          <div className="flow-menu__footer">
            <span className="flow-menu__footer-label">Elsewhere</span>
            <ul>
              {socialItems.map(function (s, i) {
                return (
                  <li key={s.label + i}>
                    <a href={s.link} target="_blank" rel="noopener noreferrer">{s.label}</a>
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
