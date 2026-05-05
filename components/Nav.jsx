/* global React */
const { useEffect, useRef } = React;

function Nav({ onNavClick }) {
  const navRef = useRef(null);
  useEffect(() => {
    const fn = () => navRef.current?.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      <nav className="nav" ref={navRef}>
        <div className="nav-inner">
          <a href="#" className="nav-logo">lucy liu</a>
          <ul className="nav-links">
            <li><a href="#work"    className="nav-link" onClick={onNavClick}>work</a></li>
            <li><a href="#about"   className="nav-link" onClick={onNavClick}>about</a></li>
            <li><a href="#contact" className="nav-link" onClick={onNavClick}>contact ↗</a></li>
          </ul>
        </div>
      </nav>
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
    const onMove = e => { mx = e.clientX; my = e.clientY; if (!visible && window.gsap) { gsap.set(cursor, { opacity: 1 }); visible = true; } };
    window.addEventListener('mousemove', onMove, { passive: true });

    const tick = () => {
      dx += (mx - dx) * 0.75; dy += (my - dy) * 0.75;
      rx += (mx - rx) * 0.10; ry += (my - ry) * 0.10;
      if (window.gsap) {
        gsap.set(dot, { x: dx, y: dy });
        gsap.set(ring, { x: rx, y: ry });
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
