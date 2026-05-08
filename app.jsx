/* global React, ReactDOM, gsap, ScrollTrigger, Lenis */
const { useEffect, useState, useRef } = React;

// ============================================================
// PROJECTS — clearly labeled placeholders
// ============================================================
const PROJECTS = [
  {
    id: 'p01', slug: 'driftwood',
    title: 'Driftwood',
    subtitle: 'An AI ethics game — adopt a pet, discover its flaw, train it to be better.',
    tags: ['AI Ethics', 'Game Design', 'p5.js', 'IMA'],
    year: '2025',
    category: 'creative',
  },
  {
    id: 'p02', slug: 'habitabull',
    title: 'HabitaBull',
    subtitle: 'A lifting app built around streak-forgiveness and the psychology of showing up.',
    tags: ['UX/UI', 'Research'],
    year: '2024',
    category: 'ux',
  },
  {
    id: 'p03', slug: 'h2know',
    title: 'H2Know',
    subtitle: 'Arduino-driven plant companion — the soil talks back.',
    tags: ['Arduino', 'IoT'],
    year: '2024',
    category: 'creative',
  },
  {
    id: 'p04', slug: 'eternal-wreckening',
    title: 'Eternal Wreckening',
    subtitle: 'Game design exploring grief and repetition as core mechanic.',
    tags: ['Game Design', 'Narrative'],
    year: '2023',
    category: 'ux',
  },
];

// ============================================================
// TWEAKS
// ============================================================
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroVariant": "stack",
  "reduceMotion": false
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  if (t.reduceMotion) root.classList.add('reduce-motion');
  else root.classList.remove('reduce-motion');
}

// ============================================================
// IS-TOUCH detection (used to disable cursor + heavy parallax)
// ============================================================
const IS_TOUCH = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);

// ============================================================
// NAV
// ============================================================
function Nav({ onNavClick, page }) {
  const navRef = useRef(null);
  useEffect(() => {
    const fn = () => navRef.current?.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = page === 'index'
    ? [
        { href: '#work', label: 'work' },
        { href: '#about', label: 'about' },
        { href: '#contact', label: 'contact ↗' },
      ]
    : [
      { href: 'index.html#work', label: 'work' },
      { href: 'index.html#about', label: 'studio' },
      { href: 'index.html#contact', label: 'contact ↗' },
    ];

  return (
    <>
      <nav className="nav" ref={navRef}>
        <a href="index.html" className="nav-logo">
          lucy liu
          <span className="nav-logo-mark">vol. 01</span>
        </a>
        <div className="nav-status">
          <span className="nav-status-dot" />
          <span>Available — Summer 2026</span>
        </div>
        <ul className="nav-links">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="nav-link"
                onClick={l.href.startsWith('#') ? onNavClick : undefined}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="scroll-progress" />
    </>
  );
}

// ============================================================
// CURSOR
// ============================================================
function Cursor() {
  useEffect(() => {
    if (IS_TOUCH) return;
    const cursor = document.querySelector('.cursor');
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    const label = document.querySelector('.cursor-label');
    if (!cursor) return;

    let mx = 0, my = 0, dx = 0, dy = 0, rx = 0, ry = 0, visible = false;
    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      if (!visible && window.gsap) {
        gsap.set(cursor, { opacity: 1 });
        visible = true;
      }
    };
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

    const setLabel = (text) => { if (label) label.textContent = text || ''; };
    const enter = (el) => {
      const text = el.dataset.cursor || (el.classList.contains('work-row') ? 'view ↗' : '');
      cursor.classList.add(el.classList.contains('work-row') ? 'is-row' : 'is-hovering');
      setLabel(text);
    };
    const leave = () => {
      cursor.classList.remove('is-hovering', 'is-row');
      setLabel('');
    };

    const bind = () => {
      const els = document.querySelectorAll('a, button, [role="button"], .work-row, [data-cursor]');
      els.forEach((el) => {
        el.addEventListener('mouseenter', () => enter(el));
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
    };
    setTimeout(bind, 200);

    return () => {
      window.removeEventListener('mousemove', onMove);
      if (window.gsap) gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div className="cursor">
      <div className="cursor-dot" />
      <div className="cursor-ring"><span className="cursor-label" /></div>
    </div>
  );
}

// ============================================================
// HERO (3 variants — stack / wordmark / margin)
// ============================================================
function Hero({ variant = 'stack' }) {
  const isWordmark = variant === 'wordmark';
  const isMargin = variant === 'margin';

  return (
    <section
      className="hero"
      data-variant={variant}
      data-screen-label="01 Hero"
    >
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="hero-orb" aria-hidden="true" />
      <div className="hero-orb-2" aria-hidden="true" />

      <div className="hero-stamps" aria-hidden="true">
        <div className="hero-stamp hero-stamp-tl">
          <span>— I / Introduction</span>
        </div>
        <div className="hero-stamp hero-stamp-tr">
          <span>NYC × Vancouver</span>
          <span className="hero-stamp-sep">·</span>
          <span>Volume 01</span>
        </div>
        <div className="hero-stamp hero-stamp-bl">
          <span>©2026 Lucy Liu</span>
        </div>
      </div>

      <div className="hero-content">
        <div className="hero-text">
          <div className="hero-eyebrow" aria-label="Hello, I'm Lucy — IMA '27">
            {"HELLO, I\u2019M LUCY \u2014 IMA \u2019 27".split('').map((c, i) => (
              <span key={i} className={c === ' ' ? 'eyebrow-sep' : 'eyebrow-char'}>
                {c === ' ' ? '\u00A0' : c}
              </span>
            ))}
          </div>
          {isWordmark ? (
            <h1 className="hero-heading">
              <span className="word-mask"><span className="word">lucy</span></span>
              <span className="word-mask"><span className="word italic-aura">liu.</span></span>
            </h1>
          ) : isMargin ? (
            <h1 className="hero-heading">
              <span className="word-mask"><span className="word">A studio of</span></span>
              <span className="word-mask"><span className="word italic-aura">one,</span></span>
              <span className="word-mask"><span className="word">at the threshold.</span></span>
            </h1>
          ) : (
            <h1 className="hero-heading">
              <span className="word-mask"><span className="word">Design</span></span>
              <span className="word-mask"><span className="word">for the</span></span>
              <span className="word-mask"><span className="word italic-aura">human</span></span>
              <span className="word-mask"><span className="word">mind.</span></span>
            </h1>
          )}
        </div>

        <div className="hero-right">
          <p className="hero-sub">
            Design Strategist from Vancouver, based in NYC. I put emphasis on <em>accessibility</em>, user research, and interaction design — creating digital experiences that are intuitive and inclusive.
          </p>
          <div className="hero-actions">
            <a href="#work" className="btn btn-primary" data-magnetic data-cursor="view">
              View work <span className="btn-arrow">↓</span>
            </a>
            <a href="#contact" className="btn btn-ghost" data-magnetic data-cursor="write">
              Get in touch <span className="btn-arrow">→</span>
            </a>
          </div>

          <div className="hero-meta">
            <div className="hero-meta-item">
              <span className="hero-meta-k">Based</span>
              <span className="hero-meta-v">New York, NY</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-k">Studying</span>
              <span className="hero-meta-v">IMA · NYU Tisch</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-k">Open for</span>
              <span className="hero-meta-v">Summer ’26 internship</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// MARQUEE
// ============================================================
function Marquee() {
  const items = [
    'Selected work — 2023 / 2026',
    'Psychology-driven product design',
    'Design + Code',
    'Currently: Driftwood — AI ethics game',
    'Open for Summer 2026',
  ];
  const all = [...items, ...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {all.map((t, i) => (
          <React.Fragment key={i}>
            <span>{t}</span>
            <span className="marquee-dot">✦</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// WORK — horizontal scroll track
// ============================================================
function WorkSection() {
  return (
    <section className="work" id="work" data-screen-label="02 Work">
      <div className="work-h-stage">
        <header className="work-h-bar">
          <div className="work-h-bar-meta">
            <span className="eyebrow-idx">02</span>
            <span className="eyebrow-rule" aria-hidden="true" />
            <span className="eyebrow-label">Selected Work</span>
          </div>
          <div className="work-h-counter" aria-live="polite" aria-atomic="true">
            <span className="work-h-cur">01</span>
            <span aria-hidden="true">/</span>
            <span className="work-h-tot">0{PROJECTS.length}</span>
          </div>
        </header>

        <div className="work-track-clip">
          <div className="work-track">
            {PROJECTS.map((p, i) => (
              <article className="work-panel" key={p.id}>
                <div className="work-panel-aura" aria-hidden="true" />
                <div className="work-panel-inner">
                  <div className="work-panel-top">
                    <span className="work-panel-ghost" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <div className="work-panel-tags">
                      {p.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </div>
                  <div className="work-panel-body">
                    <h3 className="work-panel-title">{p.title}</h3>
                    <p className="work-panel-sub">{p.subtitle}</p>
                  </div>
                  <footer className="work-panel-foot">
                    <span className="work-panel-year">{p.year}</span>
                    <a
                      href={p.slug === 'driftwood' ? 'ui_kits/portfolio/case-study.html' : (p.link || '#')}
                      className="work-panel-link"
                      aria-label={`View ${p.title}`}
                      onClick={(!p.link && p.slug !== 'driftwood') ? (e) => e.preventDefault() : undefined}
                    >↗</a>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="work-h-progress" aria-hidden="true">
          <div className="work-h-fill" />
        </div>
      </div>
    </section>
  );
}

// ============================================================
// ABOUT (inline)
// ============================================================
function AboutInline() {
  return (
    <section className="about" id="about" data-screen-label="03 About">
      <div className="eyebrow-row">
        <span className="eyebrow-idx">03</span>
        <span className="eyebrow-label">About</span>
        <span className="eyebrow-rule" />
      </div>
      <div className="about-grid">
        <h2 className="about-title">
          I design products through<br />
          the lens of <em>psychology.</em>
        </h2>
        <div className="about-body">
          <div className="about-profile">
            <div className="about-photo-wrap">
              <img
                src="assets/headshot.jpg"
                alt="Lucy Liu"
                className="about-photo"
                loading="lazy"
                decoding="async"
                width="200"
                height="200"
              />
            </div>
          </div>
          <p className="about-para">
            Design Strategist from Vancouver, based in NYC, focused on human-centered, accessible digital experiences.
          </p>
          <p className="about-para">
            I put emphasis on user research, accessibility, and interaction design — creating experiences that are <em>intuitive and inclusive</em>.
          </p>
          <p className="about-para">
            Previously: design strategist at <strong>Sourced</strong> in NYC, architecture intern at <strong>VZA</strong>, and lead designer for NYU's <strong>Korean Student Association</strong>. I ship what I design — Driftwood is the most recent.
          </p>
          <div className="about-facts">
            <div className="fact"><span className="fact-k">Based in</span><span className="fact-v">New York, NY</span></div>
            <div className="fact"><span className="fact-k">From</span><span className="fact-v">Vancouver, BC</span></div>
            <div className="fact"><span className="fact-k">Studying</span><span className="fact-v">IMA @ NYU Tisch</span></div>
            <div className="fact"><span className="fact-k">Available</span><span className="fact-v">Summer 2026</span></div>
            <div className="fact"><span className="fact-k">Languages</span><span className="fact-v">English, Mandarin</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// CONTACT (inline + page)
// ============================================================
function ContactSection() {
  const [copied, setCopied] = useState(false);
  const email = 'wl3512@nyu.edu';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <section className="contact" id="contact" data-screen-label="04 Contact">
      <div className="contact-label">
        <div className="eyebrow-row">
          <span className="eyebrow-idx">04</span>
          <span className="eyebrow-label">Get in touch</span>
        </div>
      </div>
      <div className="contact-inner">
        <h2 className="contact-head">
          <span className="contact-accent">Let's make</span>
          <span className="contact-italic">something inclusive.</span>
        </h2>
        <a href={`mailto:${email}`} className="contact-email" data-magnetic data-cursor="write">
          {email}
          <span className="contact-arrow">↗</span>
        </a>
        <button type="button" className="contact-copy" onClick={copy}>
          {copied ? 'copied ✓' : 'copy email'}
        </button>
        <div className="contact-socials">
          <a href="https://linkedin.com" className="hover-underline" rel="noreferrer">LinkedIn</a>
          <span className="contact-sep">·</span>
          <a href="https://github.com/wl3512-lab" className="hover-underline" rel="noreferrer">GitHub</a>
          <span className="contact-sep">·</span>
          <a href="https://read.cv" className="hover-underline" rel="noreferrer">Read.cv</a>
          <span className="contact-sep">·</span>
          <a href="https://instagram.com" className="hover-underline" rel="noreferrer">Instagram</a>
        </div>
      </div>
      <footer className="site-footer">
        <span>© 2026 Lucy Liu</span>
        <span className="footer-mid">Designed & built in NYC</span>
        <a href="#top" className="hover-underline">back to top ↑</a>
      </footer>
    </section>
  );
}

// ============================================================
// TWEAKS PANEL
// ============================================================
function TweaksPanel({ tweaks, set, open, onClose }) {
  return (
    <div className={'tweaks-panel' + (open ? ' is-open' : '')}>
      <div className="tweaks-head">
        <h4>Tweaks</h4>
        <small>live</small>
      </div>
      <div className="tweak-row">
        <label>hero variant</label>
        <div className="tweak-chips">
          {[
            { k: 'stack', l: 'editorial stack' },
            { k: 'wordmark', l: 'wordmark' },
            { k: 'margin', l: 'margin-note' },
          ].map((v) => (
            <button
              key={v.k}
              className={'tweak-chip' + (tweaks.heroVariant === v.k ? ' on' : '')}
              onClick={() => set('heroVariant', v.k)}
            >
              {v.l}
            </button>
          ))}
        </div>
      </div>
      <div className="tweak-row">
        <label>motion</label>
        <div className="tweak-chips">
          <button
            className={'tweak-chip' + (!tweaks.reduceMotion ? ' on' : '')}
            onClick={() => set('reduceMotion', false)}
          >full</button>
          <button
            className={'tweak-chip' + (tweaks.reduceMotion ? ' on' : '')}
            onClick={() => set('reduceMotion', true)}
          >reduced</button>
        </div>
      </div>
      <button className="tweak-close" onClick={onClose}>close ×</button>
    </div>
  );
}

// ============================================================
// APP
// ============================================================
function HomeApp() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [open, setOpen] = useState(false);
  const set = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    applyTweaks(next);
    window.parent?.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };

  useEffect(() => { applyTweaks(tweaks); }, []);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const onNavClick = (e) => {
    const href = e.currentTarget.getAttribute('href');
    if (href?.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target && window.__lenis) window.__lenis.scrollTo(target, { offset: -80 });
      else target?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <Cursor />
      <Nav onNavClick={onNavClick} page="index" />
      <main id="top">
        <Hero variant={tweaks.heroVariant} />
        <Marquee />
        <WorkSection />
        <AboutInline />
        <ContactSection />
      </main>
      <TweaksPanel
        tweaks={tweaks}
        set={set}
        open={open}
        onClose={() => {
          setOpen(false);
          window.parent?.postMessage({ type: '__edit_mode_dismissed' }, '*');
        }}
      />
    </>
  );
}

// Expose for index.html
window.HomeApp = HomeApp;
window.Nav = Nav;
window.Cursor = Cursor;
window.ContactSection = ContactSection;
window.IS_TOUCH = IS_TOUCH;

// ============================================================
// ANIMATIONS — only loaded if GSAP is present
// ============================================================
window.initLucyAnimations = function initLucyAnimations() {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const reduce =
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion');

  // --- Lenis (skip on touch / reduced motion) ---
  if (window.Lenis && !reduce && !IS_TOUCH) {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // --- Scroll progress ---
  gsap.to('.scroll-progress', {
    width: '100%', ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
  });

  if (reduce) return;

  // --- 1. Atmosphere enters before text (orbs + grid fade in) ---
  gsap.set(['.hero-orb', '.hero-orb-2', '.hero-grid-bg'], { opacity: 0 });
  gsap.to('.hero-orb',     { opacity: 1, duration: 1.8, ease: 'expo.out', delay: 0 });
  gsap.to('.hero-orb-2',   { opacity: 1, duration: 2.2, ease: 'expo.out', delay: 0.15 });
  gsap.to('.hero-grid-bg', { opacity: 0.6, duration: 2.4, ease: 'expo.out', delay: 0.1 });

  // --- 2. Eyebrow chars ---
  gsap.from('.eyebrow-char', {
    yPercent: 120, opacity: 0,
    duration: 0.6, stagger: 0.016,
    ease: 'expo.out', delay: 0.18,
  });

  // --- 3. Hero heading: char split wipe up from masks ---
  document.querySelectorAll('.hero-heading .word').forEach((w) => {
    const txt = w.textContent;
    w.textContent = '';
    [...txt].forEach((c) => {
      const s = document.createElement('span');
      s.className = 'char';
      s.textContent = c === ' ' ? '\u00A0' : c;
      w.appendChild(s);
    });
  });
  const chars = document.querySelectorAll('.hero-heading .char');
  if (chars.length) {
    gsap.set(chars, { yPercent: 115, skewX: 6, opacity: 0 });
    gsap.to(chars, {
      yPercent: 0, skewX: 0, opacity: 1,
      duration: 1.05, stagger: { each: 0.02 },
      ease: 'expo.out', delay: 0.28,
    });
  }

  // --- 4. Hero right column: stagger x-slide ---
  gsap.from('.hero-sub',     { x: 24, opacity: 0, duration: 0.9, ease: 'expo.out', delay: 0.65 });
  gsap.from('.hero-actions', { x: 24, opacity: 0, duration: 0.9, ease: 'expo.out', delay: 0.78 });
  gsap.from('.hero-meta',    { x: 24, opacity: 0, duration: 0.9, ease: 'expo.out', delay: 0.9 });

  // --- 5. Hero stamps settle last ---
  gsap.from(['.hero-stamp-tl', '.hero-stamp-tr', '.hero-stamp-bl'], {
    opacity: 0, y: 6,
    duration: 0.7, stagger: 0.08, ease: 'expo.out', delay: 1.1,
  });

  // --- 6. Aura orb parallax + mouse parallax ---
  if (!IS_TOUCH) {
    gsap.to('.hero-orb', {
      y: '-12%', scale: 1.08, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
    });
    gsap.to('.hero-orb-2', {
      y: '8%', x: '4%', ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 },
    });
    gsap.to('.hero-grid-bg', {
      y: '6%', ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });

    let mx = 0, my = 0, ox = 0, oy = 0;
    window.addEventListener('mousemove', (e) => {
      mx = (e.clientX / innerWidth - 0.5) * 50;
      my = (e.clientY / innerHeight - 0.5) * 36;
    }, { passive: true });
    gsap.ticker.add(() => {
      ox += (mx - ox) * 0.04;
      oy += (my - oy) * 0.04;
      gsap.set('.hero-orb', { x: ox, y: oy });
    });
  }

  // --- 7. Eyebrow rows (scroll) ---
  gsap.utils.toArray('.eyebrow-row').forEach((el) => {
    gsap.from(el.children, {
      opacity: 0, y: 8,
      duration: 0.6, stagger: 0.06, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  // --- 8. About title: clip-path wipe up ---
  const aboutTitle = document.querySelector('.about-title');
  if (aboutTitle) {
    gsap.from(aboutTitle, {
      clipPath: 'inset(0 0 100% 0)',
      opacity: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: aboutTitle, start: 'top 82%' },
    });
  }

  // --- 9. About body: clip-path stagger ---
  gsap.utils.toArray('.about-para').forEach((el, i) => {
    gsap.from(el, {
      clipPath: 'inset(0 0 100% 0)',
      opacity: 0, duration: 0.85, ease: 'expo.out',
      delay: i * 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
  gsap.from('.about-photo-wrap', {
    opacity: 0, scale: 0.96, duration: 0.9, ease: 'expo.out',
    scrollTrigger: { trigger: '.about-grid', start: 'top 80%' },
  });
  gsap.from('.fact', {
    y: 16, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'expo.out',
    scrollTrigger: { trigger: '.about-facts', start: 'top 90%' },
  });

  // --- 10. Horizontal work track ---
  const workSection = document.querySelector('.work');
  const workTrack = document.querySelector('.work-track');
  const workPanels = workTrack ? [...workTrack.querySelectorAll('.work-panel')] : [];
  const counterCur = document.querySelector('.work-h-cur');
  const progressFill = document.querySelector('.work-h-fill');

  if (workSection && workTrack && workPanels.length && !IS_TOUCH) {
    const numPanels = workPanels.length;
    const panelDist = () => (numPanels - 1) * window.innerWidth;

    const setHeight = () => {
      workSection.style.height = (window.innerHeight + panelDist()) + 'px';
    };
    setHeight();
    ScrollTrigger.addEventListener('refreshInit', setHeight);

    const trackTween = gsap.to(workTrack, {
      x: () => -panelDist(),
      ease: 'none',
      scrollTrigger: {
        trigger: workSection,
        start: 'top top',
        end: () => `+=${panelDist()}`,
        scrub: 1.2,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const idx = Math.min(Math.floor(self.progress * numPanels), numPanels - 1);
          if (counterCur) counterCur.textContent = String(idx + 1).padStart(2, '0');
          if (progressFill) progressFill.style.width = (self.progress * 100) + '%';
        },
      },
    });

    // First panel: clip-path wipe on scroll into view
    const p0 = workPanels[0];
    const p0Els = [p0.querySelector('.work-panel-title'), p0.querySelector('.work-panel-sub')].filter(Boolean);
    if (p0Els.length) {
      gsap.from(p0Els, {
        clipPath: 'inset(0 0 100% 0)', opacity: 0,
        stagger: 0.1, duration: 1.0, ease: 'expo.out',
        scrollTrigger: { trigger: workSection, start: 'top 80%' },
      });
    }
    const p0Foot = p0.querySelector('.work-panel-foot');
    if (p0Foot) gsap.from(p0Foot, {
      opacity: 0, y: 12, duration: 0.7, ease: 'expo.out',
      scrollTrigger: { trigger: workSection, start: 'top 75%' },
    });

    // Remaining panels: clip-path wipe as they scroll in
    workPanels.slice(1).forEach((panel) => {
      const titleEl = panel.querySelector('.work-panel-title');
      const subEl   = panel.querySelector('.work-panel-sub');
      const footEl  = panel.querySelector('.work-panel-foot');
      if (titleEl || subEl) {
        gsap.from([titleEl, subEl].filter(Boolean), {
          clipPath: 'inset(0 0 100% 0)', opacity: 0,
          stagger: 0.1, duration: 1.0, ease: 'expo.out',
          scrollTrigger: { containerAnimation: trackTween, trigger: panel, start: 'left 85%' },
        });
      }
      if (footEl) gsap.from(footEl, {
        opacity: 0, y: 12, duration: 0.7, ease: 'expo.out',
        scrollTrigger: { containerAnimation: trackTween, trigger: panel, start: 'left 80%' },
      });
    });
  }

  // --- 11. Contact: clip-path wipe per line ---
  gsap.from('.contact-accent', {
    clipPath: 'inset(0 0 100% 0)', opacity: 0,
    duration: 1.0, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact', start: 'top 78%' },
  });
  gsap.from('.contact-italic', {
    clipPath: 'inset(0 0 100% 0)', opacity: 0,
    duration: 1.0, ease: 'expo.out', delay: 0.12,
    scrollTrigger: { trigger: '.contact', start: 'top 78%' },
  });
  gsap.from('.contact-email', {
    y: 24, opacity: 0, duration: 0.85, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact', start: 'top 70%' },
  });
  gsap.from(['.contact-copy', '.contact-socials'], {
    y: 12, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact', start: 'top 65%' },
  });

  // --- 12. Marquee velocity reaction ---
  const track = document.querySelector('.marquee-track');
  if (track) {
    let vel = 0, lastY = window.scrollY;
    const baseDur = matchMedia('(max-width: 768px)').matches ? 30 : 22;
    gsap.ticker.add(() => {
      const dy = Math.abs(window.scrollY - lastY);
      vel += (dy - vel) * 0.08;
      lastY = window.scrollY;
      track.style.animationDuration = Math.max(6, baseDur - vel * 0.3) + 's';
    });
  }

  // --- 13. Magnetic CTAs ---
  if (!IS_TOUCH) {
    document.querySelectorAll('[data-magnetic], .nav-logo').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - (r.left + r.width / 2)) * 0.32,
          y: (e.clientY - (r.top + r.height / 2)) * 0.32,
          duration: 0.4, ease: 'power2.out',
        });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }
};
