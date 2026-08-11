/* global React */
const { useEffect, useRef, useState } = React;

function Nav(props) {
  const onNavClick = props && props.onNavClick;
  // FlowingMenu rows: each reveals an image marquee on hover. text + link + image.
  const items = [
    { text: 'Work', ariaLabel: 'View all work', link: 'work.html', image: 'assets/live-visuals-nyc/cover.jpg' },
    { text: 'About', ariaLabel: 'About Lucy Liu', link: '#about', image: 'assets/headshot.jpg' },
    { text: 'Contact', ariaLabel: 'Email Lucy Liu', link: 'mailto:wl3512@nyu.edu', image: 'assets/lucy-tooth-gem.webp' },
    { text: 'Resume', ariaLabel: 'View resume (opens in new tab)', link: 'assets/resume.pdf', external: true, image: 'assets/driftwood/cover.webp' },
  ];
  const socialItems = [
    { label: 'LinkedIn', link: 'https://www.linkedin.com/in/lucy-liu-9b812127b/' },
    { label: 'GitHub', link: 'https://github.com/wl3512-lab' },
    { label: 'Instagram', link: 'https://www.instagram.com/lucyy.liuu/' },
  ];
  return (
    <>
      {typeof FlowMenu !== 'undefined' && (
        <FlowMenu
          logoText="lucy liu"
          items={items}
          socialItems={socialItems}
          speed={16}
          onNavClick={onNavClick}
        />
      )}
      <div className="scroll-progress" />
    </>
  );
}

function Cursor() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const cursor = document.querySelector('.cursor');
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    const label = document.querySelector('.cursor-label');
    if (!cursor) return;

    let mx = 0, my = 0, dx = 0, dy = 0, rx = 0, ry = 0, visible = false;
    let pvx = 0, pvy = 0, ringScale = 1;
    const onMove = e => { mx = e.clientX; my = e.clientY; if (!visible && window.gsap) { gsap.set(cursor, { opacity: 1 }); visible = true; } };
    window.addEventListener('mousemove', onMove, { passive: true });

    const tick = () => {
      dx += (mx - dx) * 0.75; dy += (my - dy) * 0.75;
      rx += (mx - rx) * 0.10; ry += (my - ry) * 0.10;
      const speed = Math.sqrt((mx - pvx) ** 2 + (my - pvy) ** 2);
      ringScale += (Math.min(1 + speed * 0.024, 1.75) - ringScale) * 0.12;
      pvx = mx; pvy = my;
      if (window.gsap) {
        gsap.set(dot, { x: dx, y: dy });
        gsap.set(ring, { x: rx, y: ry, scale: ringScale });
      }
    };
    if (window.gsap) gsap.ticker.add(tick);

    const enter = (text) => () => { cursor.classList.add('is-hovering'); if (label && text) { label.textContent = text; label.style.opacity = '1'; } };
    const leave = () => { cursor.classList.remove('is-hovering'); if (label) { label.style.opacity = '0'; label.textContent = ''; } };

    const hovers = document.querySelectorAll('a, button, [role="button"]');
    hovers.forEach(el => {
      const text = el.dataset.cursor || (el.tagName === 'A' ? 'view' : null);
      el.addEventListener('mouseenter', enter(text));
      el.addEventListener('mouseleave', leave);
    });
    document.querySelectorAll('.project-card-v2').forEach(el => {
      el.addEventListener('mouseenter', enter('view ↗'));
      el.addEventListener('mouseleave', leave);
    });

    const toolkit = document.querySelector('.hero-toolkit-icons');
    if (toolkit) {
      toolkit.addEventListener('mouseenter', () => {
        if (window.gsap) gsap.to(cursor, { opacity: 0, duration: 0.12, overwrite: true });
      });
      toolkit.addEventListener('mouseleave', () => {
        if (window.gsap) gsap.to(cursor, { opacity: 1, duration: 0.12, overwrite: true });
      });
    }

    return () => {
      window.removeEventListener('mousemove', onMove);
      if (window.gsap) gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true">
      <div className="cursor-dot" />
      <div className="cursor-ring"><span className="cursor-label" /></div>
    </div>
  );
}

window.Nav = Nav;
window.Cursor = Cursor;
