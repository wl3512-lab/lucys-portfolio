/* global React */

/* The centred hero (Lucy's pick 2026-10-31, layout 5 of the "Work in the Hero" look test,
   https://claude.ai/artifact/SANt1mQX9md6oJvA6ovDec): the lit name and a still role line at the top on
   one axis, him in the middle of his room below them, and
   under the stage a band with her tools (HeroTools), the three covers, two links and the availability line. The covers are the cards' stills (DEFAULT_PROJECTS in index.html),
   whole at their own shapes; each is one link to its case study. */
// The covers (Lucy, 2026-11-10: "remake covers for hero, the covers rn are too detailed for small view"): one mark
// each on its brand colour, no words, from assets/hero-covers/hero-covers.source.html.
const HERO_WORK = [
  { title: 'Chance AI', href: 'chance-ai.html', cover: 'assets/hero-covers/chance-ai.webp?v=20261124', w: 900, h: 600 },
  { title: 'Driftwood', href: 'case-study.html', cover: 'assets/hero-covers/driftwood-tomato.webp', w: 900, h: 600 },
  { title: 'HabitaBull Lifting', href: 'habitabull.html', cover: 'assets/hero-covers/habitabull.webp?v=20261110', w: 900, h: 600 },
];

/* Her tools, between him and the covers (Lucy, 2026-10-31, "7" on "Capabilities Layouts": "or no capabilites and put a
   carasol of apps i use in between standout work cards and dragon on hero"; home has no Capabilities section since).
   The marks and names are components/tool-icons.js (window.ToolIcons). Since 2026-11-15 (Lucy: "b on laptop and a on
   phones, but give the toolkit on computer more space, move the standout workstuff ... down a little") nothing moves on
   its own: laptops show every tool at once, still, in centred rows at the top of the band, which pushes the covers
   down; phones get one row that scrolls sideways (a swipe, or the arrows, which step about a screen of tools). One real
   list, read once by screen readers. */
function HeroTools() {
  const tools = typeof ToolIcons !== 'undefined' ? ToolIcons : [];
  const view = React.useRef(null);
  const [ends, setEnds] = React.useState({ start: true, end: false });
  const sync = React.useCallback(() => {
    const v = view.current;
    if (!v) return;
    const max = v.scrollWidth - v.clientWidth;
    setEnds({ start: v.scrollLeft <= 12, end: max <= 12 || v.scrollLeft >= max - 12 });   // scroll-snap may rest a few px in
  }, []);
  React.useEffect(() => {
    sync();
    window.addEventListener('resize', sync, { passive: true });
    return () => window.removeEventListener('resize', sync);
  }, [sync]);
  // Laptops: one straight row along the front of the stage when it fits (Lucy, 2026-11-20: she drew an arch, then
  // picked D, "the desk dragons on isnt curved", so it stays straight like his floor). Narrow laptops, where one row
  // would not fit, keep the two centred rows; phones keep the sideways row.
  const list = React.useRef(null);
  React.useLayoutEffect(() => {
    const ul = list.current, box = ul && ul.closest('.hero-tools');
    if (!box) return;
    const wide = matchMedia('(min-width: 641px)');
    const lay = () => {
      box.classList.toggle('is-line', wide.matches);
      if (wide.matches && ul.scrollWidth > ul.clientWidth + 1) box.classList.remove('is-line');
      box.style.setProperty('--line-shift', '0px');                // centre the row on the screen, not on its parent
      if (box.classList.contains('is-line')) { const r = box.getBoundingClientRect(); box.style.setProperty('--line-shift', (document.documentElement.clientWidth / 2 - (r.left + r.width / 2)).toFixed(1) + 'px'); }
    };
    lay();
    const ro = new ResizeObserver(lay);
    const band = ul.closest('.hero-work'); if (band) ro.observe(band);
    wide.addEventListener('change', lay);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lay);
    return () => { ro.disconnect(); wide.removeEventListener('change', lay); };
  }, [tools.length]);
  if (!tools.length) return null;
  const step = (dir) => {
    const v = view.current;
    if (!v) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    v.scrollBy({ left: dir * v.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  };
  return (
    <div className="hero-tools">
      <button type="button" className="hero-tools-arrow" aria-label="Previous tools" disabled={ends.start} onClick={() => step(-1)}>‹</button>
      <div className="hero-tools-view" ref={view} onScroll={sync} role="region" aria-label="Tools I use" tabIndex={0}>
        <ul className="hero-tools-list" ref={list}>
          {tools.map((t) => (
            <li className={'hero-tool' + (t.path ? '' : ' is-word')} key={t.name}>
              {t.path && <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={t.path} /></svg>}
              <span>{t.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className="hero-tools-arrow" aria-label="More tools" disabled={ends.end} onClick={() => step(1)}>›</button>
    </div>
  );
}

/* The page does not scroll until the hero is up (components/hero-gate.js): hero:ready, once, when his room is lit with
   him in it, or at once when there is no room to wait for. */
function heroReady() {
  if (window.__heroReady) return;
  window.__heroReady = true;
  window.dispatchEvent(new Event('hero:ready'));
}

function Hero() {
  const heroRef = React.useRef(null);
  // Released once the hero is far behind, so its shader context is not held all page long.
  const heroNear = typeof useInView === 'function' ? useInView(heroRef, '40% 0px') : true;
  // Both phone and desktop point down to the computer preview on this page.
  const toBand = (e) => {
    const band = document.getElementById('with-ai');
    if (!band) return;
    e.preventDefault();
    if (window.__lenis) window.__lenis.scrollTo(band, { offset: -80 });
    else band.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  // iPhone Safari paints page content behind its translucent browser controls,
  // outside 100dvh. Extend the backdrop there without pushing the text underneath.
  React.useLayoutEffect(() => {
    const section = document.querySelector('.scene-hero');
    if (!section) return;
    const touch = window.matchMedia('(pointer: coarse)');
    const resize = () => {
      const browserHeight = Math.min(window.outerHeight, window.screen.height);
      const inset = touch.matches ? Math.max(0, browserHeight - window.innerHeight) : 0;
      section.style.setProperty('--hero-browser-inset', inset + 'px');
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    touch.addEventListener('change', resize);
    return () => {
      window.removeEventListener('resize', resize);
      touch.removeEventListener('change', resize);
      section.style.removeProperty('--hero-browser-inset');
    };
  }, []);

  // Laptops: the tools take their own rows at the top of the band and push the covers down (Lucy, 2026-11-15: "give the
  // toolkit on computer more space, move the standout workstuff ... down a little"), so the room keeps the height it had
  // without them: the stage is one screen less the rest of the band (styles.css, --hero-band-rest) and the hero grows by
  // the tools' rows. On phones the tools lie on his floor and the hero stays one screen.
  React.useLayoutEffect(() => {
    const section = heroRef.current;
    const work = section && section.querySelector('.hero-work');
    if (!work) return;
    // Lucy, 2026-11-18: "make it so in hero i cna see all of this ... i have to scroll a little to see with ai and my
    // work buttons and available": the whole band (tools included) now comes out of the stage, so the hero is one screen.
    const measure = () => {
      const h = work.offsetHeight;
      section.style.setProperty('--hero-band-rest', Math.round(h) + 'px');
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(work);
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
      section.style.removeProperty('--hero-band-rest');
    };
  }, []);

  // The hero is his room (components/hero-room.js; Lucy's pick "A, the room stays lit", spec
  // 2026-10-22-pixel-hero): the opening's stage stays, lights low, him on the deck with the clip,
  // in the middle of the stage. Mounted near the hero and released when far.
  const roomRef = React.useRef(null), typeRef = React.useRef(null), stageRef = React.useRef(null), headRef = React.useRef(null);
  React.useEffect(() => {
    const section = heroRef.current, room = roomRef.current, type = typeRef.current, stage = stageRef.current, head = headRef.current;
    if (!heroNear || !section || !room || !type) return;
    if (typeof HeroRoom === 'undefined') { heroReady(); return; }
    let r = null;
    // Lucy's pick 12 on "Hero Poses" (2026-10-23): he dozes while the lights are down, wakes as they
    // come up, then lives there: the idle, with a glance at the name, a yawn and a curious look between
    // (components/hero-creature.js; the renders are docs/projects/portfolio-character/hero-poses-v1/).
    // The idle is the Capabilities loop itself, so the two share one file. His body (paws at x 45-131,
    // row 158) stands in the middle of the room on every screen (the centred hero, 2026-10-31).
    const lives = {
      cell: [256, 171], cols: 16, box: [45, 10, 131, 158], ink: [22, 231], x: [0.5032, 0.5], drop: 0.0307,   // ink: tail tip to snout, over every clip
      still: { asleep: 'assets/hero/still-doze.webp', awake: 'assets/hero/still.webp' },
      clips: {
        doze: { src: 'assets/hero/doze.webp', frames: 96 }, wake: { src: 'assets/hero/wake.webp', frames: 60 },
        idle: { src: 'assets/creature/loop.webp', frames: 192 }, glance: { src: 'assets/hero/glance.webp', frames: 192 },
        yawn: { src: 'assets/hero/yawn.webp', frames: 192 }, tilt: { src: 'assets/hero/tilt.webp', frames: 192 },
      },
      asleep: 'doze', wake: 'wake', cycle: ['idle', 'glance', 'idle', 'yawn', 'idle', 'tilt'],
    };
    // without the player: tucked on the clip as the spotlight leaves him, breathing and blinking
    const tucked = { src: 'assets/spotlight/spotlight.webp', cell: [256, 192], cols: 8, box: [60, 32, 166, 150], rest: 22, blink: 23, breath: 114, x: [0.5, 0.5] };
    const creature = typeof HeroCreature !== 'undefined' ? lives : tucked;
    // The room ends at the stage's bottom edge (frame), so the band of work below it is page, not room,
    // and he draws as large as fits under the name and role (clear), up to the heist's room pixel.
    try { r = HeroRoom.mount(section, room, type, { creature, onReady: heroReady, frame: stage, clear: head, grow: 2 }); } catch (e) { heroReady(); return; }
    // the words are drawn in the page's faces: draw them again once those have loaded
    if (document.fonts) document.fonts.ready.then(() => r && r.relayout());
    window.__heroRoom = r;   // test hook for scripts/hero-check.mjs
    return () => { r.dispose(); if (window.__heroRoom === r) delete window.__heroRoom; r = null; };
  }, [heroNear]);

  // His world is night in both themes: in light mode the hero keeps the dark tokens, and while it
  // is under the fixed nav the nav takes them too (styles.css), as it does over Capabilities.
  React.useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let io;
    const observeNav = () => {
      if (io) io.disconnect();
      // Percentage root margins resolve against width, not height. Observe a one-pixel
      // strip through the actual header so phone sections below it cannot change its ink.
      const header = document.querySelector('.flow-menu-header');
      const box = header && header.getBoundingClientRect();
      const y = Math.max(0, Math.min(innerHeight - 1, Math.round(box ? box.top + box.height / 2 : 40)));
      const rect = el.getBoundingClientRect();
      document.body.classList.toggle('hero-under-nav', rect.top <= y && rect.bottom > y);
      io = new IntersectionObserver(es => document.body.classList.toggle('hero-under-nav', es[es.length - 1].isIntersecting), {
        rootMargin: `-${y}px 0px -${Math.max(0, innerHeight - y - 1)}px 0px`,
      });
      io.observe(el);
    };
    observeNav(); window.addEventListener('resize', observeNav, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('resize', observeNav); document.body.classList.remove('hero-under-nav'); };
  }, []);

  return (
    <section ref={heroRef} className="scene scene-hero" data-scene="hero" data-screen-label="01 Hero" data-landing="0" data-room="">
      {/* The page's hero scripts still animate these; in the room they are hidden (styles.css). */}
      <div className="hero-bg-layer"><div className="hero-grain"/></div>
      <div className="hero-orb" />
      <div className="hero-orb-2" />
      {heroNear && <canvas ref={roomRef} className="hero-room" aria-hidden="true" />}
      {heroNear && <canvas ref={typeRef} className="hero-room-type" aria-hidden="true" />}
      {/* An invisible box over the dragon: Edit Mode's "Dragon" layer. hero-room.js keeps it on his drawing and,
          when it is moved or sized by hand, draws him there. */}
      {heroNear && <div className="hero-creature-box" data-layer-name="Dragon" data-edit-layer="" aria-hidden="true" />}

      <div className="hero-content hero-a">
        {/* The stage: the room is drawn down to its bottom edge (HeroRoom's frame). The display words
            live in the room: each line stays here as text (read, selected, announced) and the room draws
            it lit, from the zero-size .bl marker's baseline. They carry no .word / .word-mask, so the
            page's char split and scroll choreography leave them alone. Until the room draws them they
            show as plain text. The first visit's heist lands its flown name on these lines. He stands in
            the middle of the stage, below them; the h1 is the room's clear (the entrance tweens only the
            role inside it, never the h1's own box). */}
        <div className="hero-stage">
          <div ref={stageRef} className="hero-room-frame" aria-hidden="true" />
          <h1 ref={headRef} className="hero-heading hero-name" aria-label="Lucy Liu, product designer">
            <span className="hero-lit hero-lit--name" data-lit="">
              <span className="hero-lit-line"><span className="bl" />Lucy</span>{' '}
              <span className="hero-lit-line"><span className="bl" />Liu</span>
            </span>
            {/* Still: a morph would re-centre the whole line on every word. .hero-name-row--role: index.html's
                hero entrance tweens it in. */}
            <span className="hero-role hero-name-row--role" aria-hidden="true">
              <span className="hero-name-morph">product</span>
              <span className="hero-role-noun">designer</span>
            </span>
          </h1>
          {/* on his floor, below his feet and above the stage's edge */}
        </div>
        {/* The band under the stage: the work, the two ways on, and when and where she is. */}
        <div className="hero-work">
          <HeroTools />
          <ul className="hero-covers" aria-label="Selected work">
            {HERO_WORK.map((w) => (
              <li key={w.href}>
                <a className="hero-cover" href={w.href}>
                  <img src={w.cover} alt="" width={w.w} height={w.h} decoding="async" />
                  <span className="hero-cover-title">{w.title}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="hero-links">
            <a className="hero-go" href="work.html">All work <span className="hero-go-arrow" aria-hidden="true">→</span></a>
            <a className="hero-go hero-go-down" href="#with-ai" onClick={toBand}>With AI <span className="hero-go-arrow" aria-hidden="true">↓</span></a>
          </div>
          <p className="hero-avail">Available summer 2027 · New York / Vancouver</p>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  // A spec line, not a tagline: the facts a recruiter scans for, in the order they ask.
  // Kept to five so the strip loops without reading as filler.
  var items = [
    'Available Summer 2027',
    'NYU IMA \u201929',
    'New York',
    'Design + code, one person',
    'wl3512@nyu.edu',
  ];
  var all = [...items, ...items, ...items];
  return (
    <div className="scene-marquee" aria-hidden="true">
      <div className="marquee-track">
        {all.map((t, i) => <React.Fragment key={i}><span>{t}</span><span className="marquee-dot">✶</span></React.Fragment>)}
      </div>
    </div>
  );
}

window.Hero = Hero;
window.Marquee = Marquee;
