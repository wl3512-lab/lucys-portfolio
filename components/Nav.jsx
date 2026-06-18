/* global React */
const { useEffect, useRef, useState } = React;

function Nav({ onNavClick }) {
  const navRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => navRef.current?.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);
  const closeAndNav = (cb) => () => { close(); cb?.(); };

  return (
    <>
      <nav className="nav" ref={navRef}>
        <div className="nav-inner">
          <a href="/" className="nav-logo" aria-label="Lucy Liu, back to top">lucy liu</a>
          <ul className="nav-links">
            <li><a href="work.html" className="nav-link">all work</a></li>
            <li><a href="#about"   className="nav-link" onClick={onNavClick}>about</a></li>
            <li><a href="#contact" className="nav-link" onClick={onNavClick}>contact</a></li>
            <li><a href="assets/resume.pdf" className="nav-link" target="_blank" rel="noopener noreferrer" aria-label="View resume (opens in new tab)">resume ↗</a></li>
          </ul>

          <button
            className={'nav-hamburger' + (menuOpen ? ' is-open' : '')}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="nav-mobile-menu"
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </nav>

      <div
        id="nav-mobile-menu"
        className={'nav-mobile-menu' + (menuOpen ? ' is-open' : '')}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-label="Navigation menu"
      >
        <ul className="nav-mobile-links">
          <li><a href="work.html"          className="nav-mobile-link" onClick={close}>all work</a></li>
          <li><a href="#about"             className="nav-mobile-link" onClick={closeAndNav(onNavClick)}>about</a></li>
          <li><a href="#contact"           className="nav-mobile-link" onClick={closeAndNav(onNavClick)}>contact</a></li>
          <li><a href="assets/resume.pdf"  className="nav-mobile-link" target="_blank" rel="noopener noreferrer" onClick={close}>resume ↗</a></li>
        </ul>
      </div>

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
