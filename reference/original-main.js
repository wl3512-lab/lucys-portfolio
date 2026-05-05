/* ============================================
   MAIN.JS — High-end animation system
   Lenis + GSAP ScrollTrigger
   ============================================ */

window.addEventListener('load', () => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  requestAnimationFrame(() => {
    if (typeof gsap === 'undefined') { initFallback(); return; }

    gsap.registerPlugin(ScrollTrigger);

    if (reduced) { initFallback(); return; }

    const lenis = initLenis();
    initNav();
    initMobileNav();
    initScrollProgress();
    initActiveNavLinks();
    initCursor();
    initMagnetic();
    initHeroEntrance();
    initHeroScrollReact();
    initMarquee();
    initClipReveal();
    initSkillsScene();
    initAboutScene();
    initContactReveal();
    initAnchorScroll(lenis);
  });
});


/* ============================================
   LENIS — Smooth inertia scroll
   Drives ALL ScrollTrigger updates
   ============================================ */
function initLenis() {
  const lenis = new window.Lenis({
    duration: 1.15,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.85,
  });

  // Sync Lenis → ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}


/* ============================================
   FALLBACK — reduced motion / no GSAP
   ============================================ */
function initFallback() {
  document.querySelectorAll(
    '.word, .eyebrow-char, .eyebrow-sep, .hero-sub, ' +
    '.hero-statement, .hero-actions, .hero-photo-wrap, ' +
    '.hero-scroll-hint, [data-reveal]'
  ).forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.style.filter = 'none';
    el.style.clipPath = 'none';
  });
  initNav();
  initMobileNav();
  initScrollProgress();
  initAnchorScroll(null);
}


/* ============================================
   NAV
   ============================================ */
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const fn = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', fn, { passive: true });
  fn();
}

function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

function initAnchorScroll(lenis) {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 64;
      if (lenis) {
        lenis.scrollTo(target, { offset: -navH - 16, duration: 1.4 });
      } else {
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH - 16, behavior: 'smooth' });
      }
    });
  });
}

function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  const update = () => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
    bar.style.width = pct + '%';
  };
  window.addEventListener('scroll', update, { passive: true });
}

function initActiveNavLinks() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting)
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
    });
  }, { threshold: 0.4 }).observe;

  sections.forEach(s => {
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting)
          navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
      });
    }, { threshold: 0.4 }).observe(s);
  });
}


/* ============================================
   CURSOR — Dual layer, magnetic-aware, label
   ============================================ */
function initCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const cursor = document.querySelector('.cursor');
  const dot    = document.querySelector('.cursor-dot');
  const ring   = document.querySelector('.cursor-ring');
  const label  = document.querySelector('.cursor-label');
  if (!cursor) return;

  let mx = 0, my = 0, dx = 0, dy = 0, rx = 0, ry = 0;
  let visible = false;

  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    if (!visible) { gsap.set(cursor, { opacity: 1 }); visible = true; }
  }, { passive: true });

  gsap.ticker.add(() => {
    dx += (mx - dx) * 0.75;
    dy += (my - dy) * 0.75;
    rx += (mx - rx) * 0.10;
    ry += (my - ry) * 0.10;
    gsap.set(dot,  { x: dx, y: dy });
    gsap.set(ring, { x: rx, y: ry });
  });

  // Interactive element bindings
  document.querySelectorAll('a, button, [role="button"]').forEach(el => {
    const text = el.dataset.cursor || (el.tagName === 'A' ? 'view' : null);

    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-hovering');
      if (label && text) { label.textContent = text; label.style.opacity = '1'; }
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-hovering');
      if (label) { label.style.opacity = '0'; label.textContent = ''; }
    });
  });

  // Project cards get a "view" label
  document.querySelectorAll('.project-card-v2').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-hovering', 'is-view');
      if (label) { label.textContent = 'view ↗'; label.style.opacity = '1'; }
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-hovering', 'is-view');
      if (label) { label.style.opacity = '0'; }
    });
  });
}


/* ============================================
   MAGNETIC — Buttons/links pull toward cursor
   ============================================ */
function initMagnetic() {
  document.querySelectorAll('.btn, .nav-logo, .contact-email').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r  = el.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      gsap.to(el, {
        x: (e.clientX - cx) * 0.32,
        y: (e.clientY - cy) * 0.32,
        duration: 0.4,
        ease: 'power2.out',
      });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
    });
  });
}


/* ============================================
   HERO ENTRANCE — Char-level with skew distortion
   ============================================ */
function initHeroEntrance() {
  // --- Split heading words into characters ---
  const words = document.querySelectorAll('.word');
  const allChars = [];

  words.forEach(wordEl => {
    const text = wordEl.textContent;
    wordEl.innerHTML = '';
    gsap.set(wordEl, { opacity: 1, y: 0 });
    [...text].forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.classList.add('char');
      wordEl.appendChild(span);
      allChars.push(span);
    });
  });

  // --- Eyebrow chars ---
  const eyebrowChars = document.querySelectorAll('.eyebrow-char, .eyebrow-sep');
  const photo   = document.querySelector('.hero-photo-wrap');
  const sub     = document.querySelector('.hero-sub');
  const toolkit = document.querySelector('.hero-toolkit');
  const actions = document.querySelector('.hero-actions');
  const hint    = document.querySelector('.hero-scroll-hint');

  // Prime right-column elements
  if (toolkit) gsap.set(toolkit, { opacity: 0, y: 16 });

  gsap.set(allChars, { yPercent: 120, skewX: 10, opacity: 0 });
  gsap.set(eyebrowChars, { yPercent: 100, opacity: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  // Eyebrow chars cascade
  tl.to(eyebrowChars, {
    yPercent: 0,
    opacity: 1,
    duration: 0.7,
    stagger: 0.03,
  }, 0.1);

  // Heading chars — skewed cascade
  tl.to(allChars, {
    yPercent: 0,
    skewX: 0,
    opacity: 1,
    duration: 1.1,
    stagger: { each: 0.022, from: 'start' },
    ease: 'expo.out',
  }, 0.2);

  // Right column: photo first, then bio, toolkit, actions
  tl.fromTo(photo, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.55);
  tl.fromTo(sub,   { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.75);
  tl.fromTo(toolkit, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.95);
  tl.fromTo(actions, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 1.1);

  // Scroll hint
  tl.to(hint, { opacity: 1, duration: 0.5 }, 1.4);

  // Hint fades as user scrolls
  ScrollTrigger.create({
    trigger: '.scene-hero',
    start: 'top top',
    end: '12% top',
    scrub: true,
    onUpdate: self => hint && gsap.set(hint, { opacity: Math.max(0, 1 - self.progress * 8) }),
  });
}


/* ============================================
   HERO SCROLL REACTION
   Text pushes away, photo stays, bg shears
   ============================================ */
function initHeroScrollReact() {
  const heroText  = document.querySelector('.hero-text');
  const photo     = document.querySelector('.hero-photo-wrap');
  const bgLayer   = document.querySelector('.hero-bg-layer');
  const orb       = document.querySelector('.hero-orb');

  // Text drifts up and fades out
  if (heroText) {
    gsap.to(heroText, {
      y: -80,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '.scene-hero',
        start: 'top top',
        end: '40% top',
        scrub: 1.2,
      },
    });
  }

  // Photo scales up slightly (depth zoom)
  if (photo) {
    gsap.to(photo, {
      scale: 1.08,
      y: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: '.scene-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
      },
    });
  }

  // Background parallax (slower than foreground)
  if (bgLayer) {
    gsap.to(bgLayer, {
      y: '18%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.scene-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  // Orb drifts up faster (creates layered depth)
  if (orb) {
    gsap.to(orb, {
      y: '-12%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.scene-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.8,
      },
    });
  }

  // Mouse parallax on orb
  let orbX = 0, orbY = 0, ox = 0, oy = 0;
  window.addEventListener('mousemove', e => {
    orbX = (e.clientX / window.innerWidth  - 0.5) * 70;
    orbY = (e.clientY / window.innerHeight - 0.5) * 50;
  }, { passive: true });
  gsap.ticker.add(() => {
    ox += (orbX - ox) * 0.04;
    oy += (orbY - oy) * 0.04;
    if (orb) gsap.set(orb, { x: ox, y: oy });
  });
}


/* ============================================
   MARQUEE — Velocity-based speed
   ============================================ */
function initMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;

  let velocity = 0, lastY = window.scrollY;

  gsap.ticker.add(() => {
    const delta = Math.abs(window.scrollY - lastY);
    velocity += (delta - velocity) * 0.08;
    lastY = window.scrollY;
    track.style.animationDuration = Math.max(5, 22 - velocity * 0.4) + 's';
  });
}


/* ============================================
   CLIP-PATH REVEALS — Project rows + headings
   Wipes up from bottom (no generic fade)
   ============================================ */
function initClipReveal() {
  // Section title — line sweep
  document.querySelectorAll('[data-split-reveal]').forEach(el => {
    const text = el.textContent;
    el.innerHTML = text.split('').map(ch =>
      ch === ' '
        ? '<span style="display:inline-block;width:.28em"></span>'
        : `<span class="ch" style="display:inline-block;clip-path:inset(0 0 100% 0)">${ch}</span>`
    ).join('');

    gsap.to(el.querySelectorAll('.ch'), {
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.7,
      stagger: 0.022,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // Project rows — clip wipe from bottom
  gsap.utils.toArray('.project-row').forEach((row, i) => {
    gsap.fromTo(row,
      { clipPath: 'inset(0 0 100% 0)', opacity: 1 },
      {
        clipPath: 'inset(0 0 0% 0)',
        duration: 0.9,
        ease: 'expo.out',
        delay: i * 0.07,
        scrollTrigger: { trigger: row, start: 'top 90%' },
      }
    );
  });

  // About columns — slide from opposite edges
  const leftCol  = document.querySelector('.about-left');
  const rightCol = document.querySelector('.about-right');

  if (leftCol) {
    gsap.fromTo(leftCol,
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: '.scene-about', start: 'top 75%' } }
    );
  }
  if (rightCol) {
    gsap.fromTo(rightCol,
      { x: 50, opacity: 0 },
      { x: 0, opacity: 1, duration: 1.1, ease: 'expo.out', delay: 0.12,
        scrollTrigger: { trigger: '.scene-about', start: 'top 75%' } }
    );
  }
}


/* ============================================
   SKILLS — Wave stagger from center
   ============================================ */
function initSkillsScene() {
  const cards = gsap.utils.toArray('[data-skill-card]');
  if (!cards.length) return;

  gsap.to(cards, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.75,
    stagger: { each: 0.06, from: 'center' },
    ease: 'back.out(1.5)',
    scrollTrigger: {
      trigger: '.scene-skills',
      start: 'top 78%',
    },
  });
}


/* ============================================
   ABOUT — Depth zoom bg text
   ============================================ */
function initAboutScene() {
  const bgText   = document.querySelector('.about-bg-text');
  const skillTags = gsap.utils.toArray('.about-skills-list .tag');

  if (bgText) {
    gsap.fromTo(bgText,
      { scale: 1.5, opacity: 0 },
      {
        scale: 1, opacity: 0.035,
        ease: 'none',
        scrollTrigger: {
          trigger: '.scene-about',
          start: 'top 80%',
          end: 'center center',
          scrub: 1.8,
        },
      }
    );

    gsap.to(bgText, {
      y: '-18%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.scene-about',
        start: 'center center',
        end: 'bottom top',
        scrub: 1,
      },
    });
  }

  // Tags: spring stagger
  if (skillTags.length) {
    gsap.fromTo(skillTags,
      { y: 18, opacity: 0, scale: 0.85 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 0.55,
        stagger: { each: 0.04, from: 'start' },
        ease: 'back.out(2)',
        scrollTrigger: { trigger: '.about-skills', start: 'top 87%' },
      }
    );
  }
}


/* ============================================
   CONTACT — Letter-spacing stretch + reveal
   ============================================ */
function initContactReveal() {
  const scene   = document.querySelector('.scene-contact');
  if (!scene) return;

  const reveals = gsap.utils.toArray('[data-reveal]', scene);

  gsap.fromTo(reveals,
    { y: 48, opacity: 0 },
    {
      y: 0, opacity: 1,
      duration: 1,
      stagger: 0.1,
      ease: 'expo.out',
      scrollTrigger: { trigger: scene, start: 'top 78%' },
    }
  );

  // "something inclusive." — letter-spacing expands on scroll
  const accent = document.querySelector('.contact-accent');
  if (accent) {
    gsap.fromTo(accent,
      { letterSpacing: '-0.04em' },
      {
        letterSpacing: '0.06em',
        ease: 'none',
        scrollTrigger: {
          trigger: scene,
          start: 'top 60%',
          end: 'center center',
          scrub: 2,
        },
      }
    );
  }
}
