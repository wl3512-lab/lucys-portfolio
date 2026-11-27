/* global React */

// The five capabilities, upstream thinking to the booth. Ordered, not ranked: the order IS the
// content, because the width of the range is what this section exists to say. Each carries one
// line, its tools, the work that shows it (slugs resolved against the projects array) and, for
// the night drive, where its projected title breaks and the small kick shown at its stop.
const SPAN = [
  { label: 'Strategy & Research', lines: ['Strategy &', 'Research'], kick: 'The people you study',
    line: 'I work upstream of the interface.', tools: 'Figma', work: 'habitabull,reptools' },
  { label: 'Product Design', lines: ['Product', 'Design'], kick: 'Framed and printed',
    line: 'Psychology-first: I design for how people actually behave.', tools: 'Figma,Illustrator', work: 'habitabull,h2know' },
  { label: 'Interaction & Motion', lines: ['Interaction &', 'Motion'], kick: 'It starts to move',
    line: 'The feel matters as much as the flow.', tools: 'Figma,After Effects', work: 'eternal-wreckening,driftwood' },
  { label: 'Code', lines: ['Code'], kick: 'Built and running',
    line: 'I ship what I design.', tools: 'p5.js,Arduino,Claude Code', work: 'driftwood', withAi: true },
  { label: 'Live Performance', lines: ['Live', 'Performance'], kick: 'The city performs',
    line: 'Generative visuals, performed live from the booth.', tools: 'TouchDesigner,Premiere Pro', work: 'live-visuals-nyc' },
];

// Retired with the recap's lights (2026-10-31, "One screen, plays itself"); kept for reference, nothing reads them.
// Each stage's light, the colour its world is lit with (LOOK[].line in night-drive.js). The drive
// ends on these five lights rising into the recap's columns.
const STAGE_LIGHT = ['216 224 240', '255 90 100', '88 230 210', '255 79 216', '114 173 255'];
// Where each project's cover sits in a light's tall window, from the look test Lucy picked
// ("Route Light Windows", 2026-10-22); otherwise the project's own coverPos.
const WIN_POS = { habitabull: 'left center', reptools: 'center', h2know: '40% center', 'eternal-wreckening': '6% 70%', driftwood: 'center', 'with-ai': 'left top', 'live-visuals-nyc': 'center 60%' };

// Same rule the Spotlight cards use, so a capability and the work grid never disagree
// about where a project lives. case-study.html forwards any non-driftwood slug to <slug>.html.
function workHref(p) {
  if (p.detailPage) return p.detailPage;
  return 'case-study.html?slug=' + encodeURIComponent(p.slug || p.id);
}

// Not a project, so it is not in the projects array: the Code stop links the With AI page
// by hand. slug stays unique so it cannot collide with a real project key.
const WITH_AI_CARD = {
  slug: 'with-ai', title: 'With AI', cover: 'assets/with-ai/menu-hover.webp', detailPage: 'with-ai.html',
  subtitle: 'How I design, constrain, test and ship AI products: I design it and set the rules, and AI writes most of the code.',
};

// With AI lives in the drive's recap (Lucy, 2026-10-21: "merge my With AI part with this to
// save space and scrolling"). It was the home page's WithAiTeaser section. Each tile is one static
// cover, its build's first screenshot (Lucy, 2026-11-01: "make static covers"; they had cycled two
// or three captioned screenshots, with a Pause thumbnails button). Each tile links to its build on
// the With AI page (Lucy, 2026-10-22: the creature on the band guides you to the work, so a tile
// has to go somewhere).
// Each tile is the same window as on With AI's desktop (Lucy, 2026-11-13: "think of how with ai ui changes on home
// screen ... so its not confusing"): the same cover, and its link opens the desktop with that window in front.
const WITH_AI_TILES = [
  { title: 'Today', cover: 'assets/covers/withai-today/reel.webp', app: 'today', icon: 'assets/with-ai/icons/today.svg' },
  { title: 'Internship agent', cover: 'assets/covers/withai-agent/reel.webp', app: 'agent', icon: 'assets/with-ai/icons/agent.svg' },
  { title: 'HabitaBull', cover: 'assets/covers/withai-habitabull/reel.webp', app: 'bull', icon: 'assets/habitabull/icon-512.png' },
  { title: 'Driftwood', cover: 'assets/covers/withai-driftwood/tomato.webp', app: 'fox', icon: 'icons/fox.svg' },
];
// He sits on the band's screenshots in his idle loop (Lucy, 2026-10-22: "what i built w ai add
// dragon"), playing only while the band is on screen and the tab is visible. Reduced motion, the
// list, or no sheets yet: his still. He guides you to the work (Lucy, 2026-10-22, "make him more
// interactive, more blender animation and then render in 2d style"; the board she approved is
// https://claude.ai/artifact/WGbduKzfVde7tMsXnXv4kC): hover a tile and he looks at it, click him
// and he hops along the tiles to it, and hovering him still plays the drive's flick.
// components/band-guide.js (window.BandGuide) runs all of it; only his body takes the pointer,
// since his frame's transparent margins overlap the tiles below.
function BandCreature({ assets, live }) {
  const ref = React.useRef(null), hitRef = React.useRef(null);
  const data = assets && assets.data, sheets = assets && assets.sheets;
  const play = !!(live && data && sheets && sheets.loop) && typeof BandGuide !== 'undefined' &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;
  React.useEffect(() => {
    if (!play) return;
    const canvas = ref.current, band = canvas.closest('.nd-ai');
    const tiles = band ? Array.from(band.querySelectorAll('.wat-tiles .wat-link')) : [];
    const guide = BandGuide.mount(canvas, hitRef.current, { data, sheets, tiles, base: CREATURE_BASE });
    return () => guide.destroy();
  }, [play, data, sheets]);
  return (
    <span className="nd-ai-pet-box">
      {play
        ? <canvas className="nd-ai-pet" ref={ref} aria-hidden="true" width="256" height="171" />
        : <img className="nd-ai-pet" src={CREATURE_BASE + 'still.webp'} alt="" aria-hidden="true" width="256" height="171" />}
      {play && <span className="nd-ai-pet-hit" ref={hitRef} aria-hidden="true" />}
    </span>
  );
}
function WithAiBand({ creature, drive, room = false }) {
  return (
    <div className="nd-ai wat-entry-section" role="group" aria-labelledby="nd-ai-title">
      <h2 className="visually-hidden" id="nd-ai-title">My AI workspace</h2>
      <div className="wat-entry-wrap">
        <a className="wat-entry" href="with-ai.html" aria-label="Enter my AI workspace">
          <div className="wat-monitor" aria-hidden="true">
            <div className="wat-monitor-bar"><svg viewBox="0 0 13 18"><path d="M9.5 6v8.2a2.5 2.5 0 0 1-5 0V3.6a3.3 3.3 0 0 1 6.6 0V14a4.6 4.6 0 0 1-9.2 0V6.5" fill="none" stroke="#0b1030" strokeWidth="1.6" strokeLinecap="round" /></svg><b>With AI</b></div>
            <div className="wat-monitor-desk">
              <span className="wat-monitor-folders"><img src="assets/with-ai/icons/today.svg" alt="" /><img src="assets/with-ai/icons/agent.svg" alt="" /><img src="assets/with-ai/icons/notes.svg" alt="" /></span>
              <ul className="wat-tiles">
                {WITH_AI_TILES.map((t) => (
                  <li className="wat-tile" key={t.title}>
                    <span className="wat-link">
                      <span className="wat-window-bar"><i /><i /><i /><span>{t.title}</span></span>
                      <span className="wat-shot"><img src={t.cover} alt="" loading="lazy" decoding="async" /></span>
                      <span className={'wat-app-icon wat-app-icon--' + t.app}>
                        {t.icon ? <img src={t.icon} alt="" loading="lazy" width="54" height="54" />
                          : t.app === 'today' ? <span>Today</span>
                            : <svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" fill="#f7f8fa" /><path d="M15 3v4h4" fill="#cfd9e8" /><path d="M8.5 11h8M8.5 14h8M8.5 17h5" stroke="#214b8c" strokeWidth="1.4" /></svg>}
                      </span>
                      <span className="wat-name">{t.title}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {room && <div className="wat-mini-desktop">
                <b className="wat-mini-title">With AI</b>
                <span className="wat-mini-app"><img src="assets/covers/withai-today/reel.webp" alt="" loading="lazy" /><span>Today</span></span>
                <span className="wat-mini-app"><img src="assets/covers/withai-agent/reel.webp" alt="" loading="lazy" /><span>Agent</span></span>
              </div>}
            </div>
          </div>
          <span className="wat-entry-label">Enter workspace <span aria-hidden="true">→</span></span>
        </a>
        {!room && <BandCreature assets={creature} live={drive} />}
      </div>
    </div>
  );
}

// ── Capabilities ─────────────────────────────────────────────────────────────────────────────────
// Home has no Capabilities section since 2026-10-31 (Lucy, "7": her tools run in the hero instead; see WithAiSection).
// It was a quiet list for a day (Lucy: "strip down capabilies"; "Strip down + drive page").
//
// The night drive lives on capabilities.html (CapabilitiesDrive): on desktop one screen that plays itself (Lucy,
// 2026-10-31, after user testers scrolled back up at the pinned drive: "One screen, plays itself"), like the phone
// (PhoneCapabilities.jsx): the world moves through the five stops on its own under the story bar
// (components/story-bar.js), each stop's name under its segment; a click on the scene's right or left side, the arrow
// keys, Home / End and the segments jump. No pin, no scroll-jacking. When the section first comes into view the
// creature's entry plays once on its own clock (the flick, the world opening, his hunt) and ends on stop 1; later
// visits start at the current stop. Each stop is what the drive showed: the projected name and line in the world, the
// kick and the "Seen in" card; the last offers "All work". Reduced motion, no WebGL or a screen under 640px tall get
// the list. components/night-drive.js draws the world (spec:
// docs/superpowers/specs/2026-10-21-capabilities-night-drive-design.md). Retired with the pin, still on disk:
// NightDriveMath's reading brake and scroll auto drive, the route, the dial, the counter and the recap's lights.
const DRIVE_MEDIA = '(min-height: 640px) and (prefers-reduced-motion: no-preference)';
const CREATURE_BASE = 'assets/creature/';
const VOID_RGB = [5, 7, 16];   // --void: the page under the reveal
const pad2 = (n) => String(n).padStart(2, '0');
const toolList = (s) => s.tools.split(',').join(' · ');
const noStory = () => null;
// The work each capability names, for pages without the home page's project list (capabilities.html). The same fields
// as index.html's DEFAULT_PROJECTS, which tests/night-drive-site.test.js keeps them in step with.
const CAP_WORK = [
  { slug: 'driftwood', title: 'Driftwood', cover: 'assets/driftwood/cover-reel.webp?v=20261002b', subtitle: 'Grow a garden with AI animal helpers and catch the moment their advice goes wrong.' },
  { slug: 'habitabull', title: 'HabitaBull Lifting', cover: 'assets/habitabull/cover-wall.webp?v=20260930b', coverPos: 'left center', subtitle: 'Log a lift, track progress, and pick up again after a break.' },
  { slug: 'reptools', detailPage: 'reptools.html', title: 'rep.tools', cover: 'assets/reptools/cover.webp?v=20261022', subtitle: 'Information architecture and brand for a 6,900-item e-commerce catalogue.' },
  { slug: 'live-visuals-nyc', detailPage: 'live-visuals-nyc.html', title: 'Demon Nights', cover: 'assets/live-visuals-nyc/cover.jpg', subtitle: 'Live TouchDesigner visuals for Demon Nights at Maison Nur, New York.' },
  { slug: 'h2know', title: 'H2Know', cover: 'assets/h2know/slides/slide-01.jpg', subtitle: 'Check your plant’s soil moisture through a sensor and companion app.' },
  { slug: 'eternal-wreckening', title: 'Eternal Wreckening', cover: 'assets/eternal-wreckening/slides/slide-01.jpg', subtitle: 'A four-versus-one mobile horror concept with motion controls and haptics.' },
];

// Home: the With AI band alone (Lucy, 2026-10-31, "7" on "Capabilities Layouts": "or no capabilites and put a carasol of
// apps i use in between standout work cards and dragon on hero"). Home has no Capabilities section: her tools run in the
// hero (Hero.jsx HeroTools) and the night drive keeps its own page (capabilities.html, CapabilitiesDrive below), which
// nothing on home links to now. The band follows the hero on laptops and desktops, its own page landing, with its
// creature and guide (CreaturePlayer's loop and action sheets only: no three.js, no night drive on home). Phones get
// the same four direct links as app icons, matching With AI's phone workspace.
function WithAiSection() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const journey = window.WorkspaceJourney && window.WorkspaceJourney.mount(ref.current);
    return () => { if (journey) journey.destroy(); };
  }, []);
  return (
    <div className="with-ai-section">
      <div ref={ref} className="nd-band workspace-journey" id="with-ai" data-screen-label="02 With AI" data-landing="-80">
        <div className="journey-stage">
          <div className="journey-computer"><WithAiBand room /></div>
          <div className="journey-room"><EndSection workspace /></div>
          <canvas className="journey-foreground" aria-hidden="true" />
          <p className="journey-scroll" aria-hidden="true">Scroll to look around <span>↓</span></p>
        </div>
        <div className="journey-outro">
          <p className="end-line">That's everything. Come back anytime.</p>
          <button className="intro-replay end-replay" type="button" onClick={() => window.LucyIntro && window.LucyIntro.replay()}>Replay opening</button>
        </div>
      </div>
    </div>
  );
}

// The night drive's own page (capabilities.html): the one-screen story on desktop, PhoneCapabilities on phones.
function CapabilitiesDrive(props) {
  const [phone, setPhone] = React.useState(() => matchMedia('(max-width: 640px)').matches);
  React.useEffect(() => {
    const media = matchMedia('(max-width: 640px)');
    const change = () => setPhone(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const work = (props && props.projects) || CAP_WORK;
  return <div className="capability-layout">
    {phone && typeof PhoneCapabilities !== 'undefined'
      ? <PhoneCapabilities {...props} projects={work} stops={SPAN} withAi={WITH_AI_CARD} />
      : <DesktopSkillsSection {...props} projects={work} />}
  </div>;
}

// The night drive on desktop: one screen that plays itself.
function DesktopSkillsSection(props) {
  const projects = (props && props.projects) || [];
  const onOpen = props && props.onOpen;
  const bySlug = {};
  projects.forEach((p) => { bySlug[p.slug || p.id] = p; });
  const related = (s) => {
    const rel = (s.work || '').split(',').map((k) => bySlug[k.trim()]).filter(Boolean);
    if (s.withAi) rel.push(WITH_AI_CARD);
    return rel;
  };
  const openWork = (p) => { if (onOpen && p !== WITH_AI_CARD) onOpen(p); };

  const sectionRef = React.useRef(null), stageRef = React.useRef(null), cardRef = React.useRef(null);
  const entryRef = React.useRef(null), titleRef = React.useRef(null), stopRef = React.useRef(null);
  const creatureRef = React.useRef(null), printRef = React.useRef(null), pixelRef = React.useRef(null);
  const engineRef = React.useRef(null), tweenRef = React.useRef(null), timingRef = React.useRef(null);
  const prog = React.useRef({ s: 0 });   // the drive's progress, written every frame and never rendered
  const introRef = React.useRef(true), selectedRef = React.useRef(0);
  const [mode, setMode] = React.useState('list');   // 'story', or the list
  const [assets, setAssets] = React.useState(null);
  const [live, setLive] = React.useState(false);    // the world is drawing
  const [selected, setSelected] = React.useState(0);
  const [intro, setIntro] = React.useState(true);   // the creature's entry has not played yet
  const [rest, setRest] = React.useState(false);    // the drive rests at the selected stop: the kick, card and next show
  const story = mode === 'story';
  // The world mounts near the section (and is released far from it); the creature's ~1MB of sheets start loading a
  // little earlier so they are in by the time he is on screen.
  const nearView = typeof useInView === 'function' ? useInView(sectionRef, '60% 0px') : true;
  const soon = typeof useInView === 'function' ? useInView(sectionRef, '200% 0px', { keep: true }) : true;

  // In light mode the fixed nav sits on this dark section; while it is under the nav, the nav takes its dark tokens
  // (styles.css).
  React.useEffect(() => {
    const els = [sectionRef.current].filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    let io;
    const under = new Map();
    const apply = () => document.body.classList.toggle('nd-under-nav', Array.from(under.values()).some(Boolean));
    const observeNav = () => {
      if (io) io.disconnect();
      // Percentage root margins resolve against width, not height. Observe a one-pixel
      // strip through the actual header so phone sections below it cannot change its ink.
      const header = document.querySelector('.flow-menu-header');
      const box = header && header.getBoundingClientRect();
      const y = Math.max(0, Math.min(innerHeight - 1, Math.round(box ? box.top + box.height / 2 : 40)));
      els.forEach((el) => { const r = el.getBoundingClientRect(); under.set(el, r.top <= y && r.bottom > y); });
      apply();
      io = new IntersectionObserver((es) => { es.forEach((e) => under.set(e.target, e.isIntersecting)); apply(); }, {
        rootMargin: `-${y}px 0px -${Math.max(0, innerHeight - y - 1)}px 0px`,
      });
      els.forEach((el) => io.observe(el));
    };
    observeNav(); window.addEventListener('resize', observeNav, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('resize', observeNav); document.body.classList.remove('nd-under-nav'); };
  }, []);

  // The story or the list. Changes with the media (a short window, reduced motion).
  React.useEffect(() => {
    if (typeof NightDrive === 'undefined' || typeof NightDriveMath === 'undefined' || typeof CreaturePlayer === 'undefined') return;
    if (!NightDrive.supported() || document.documentElement.classList.contains('reduce-motion')) return;
    const media = matchMedia(DRIVE_MEDIA);
    const apply = () => setMode(media.matches ? 'story' : 'list');
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  // The creature's sheets and data (cached, so a remount downloads nothing).
  React.useEffect(() => {
    if (!story || !soon || assets) return;
    let alive = true;
    CreaturePlayer.load(CREATURE_BASE).then(
      (a) => { if (alive) setAssets(a); },
      () => { if (alive) setAssets({ data: null, sheets: null }); },   // the world goes on without him
    );
    return () => { alive = false; };
  }, [story, soon, assets]);

  // The world: mounted near the section, released (WebGL context and all) when far from it. A fresh canvas per mount:
  // a released world force-loses its context, and a canvas whose context was lost cannot give a new renderer one.
  React.useEffect(() => {
    if (!story || !nearView || !assets) return;
    const M = NightDriveMath, data = assets.data;
    const timing = data && data.exit ? M.entryTiming(data.exit.frames, data.exit.beats && data.exit.beats.launch) : M.entryTiming();
    timingRef.current = timing;
    const creature = data ? CreaturePlayer.create({ canvas: creatureRef.current, printCanvas: printRef.current, data, sheets: assets.sheets }) : null;
    const canvas = document.createElement('canvas');
    canvas.className = 'nd-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stageRef.current.insertBefore(canvas, stageRef.current.firstChild);
    const engine = NightDrive.mount(canvas, {
      stops: SPAN.map((s) => ({ lines: s.lines, line: s.line })),
      timing, title: titleRef.current, stop: stopRef.current, entry: entryRef.current, pixel: pixelRef.current,
      creature, voidRgb: VOID_RGB, onLost: () => setMode('list'),
    });
    if (!engine) { canvas.remove(); setMode('list'); return; }
    if (!introRef.current) prog.current.s = M.STOP_S[selectedRef.current];   // later visits start at the current stop
    engine.setProgress(prog.current.s);
    engineRef.current = engine;
    setLive(true);
    return () => {
      if (tweenRef.current) { tweenRef.current.kill(); tweenRef.current = null; prog.current.s = M.STOP_S[selectedRef.current]; setRest(true); }
      engineRef.current = null;
      setLive(false);
      engine.dispose();
      canvas.remove();
    };
  }, [story, nearView, assets]);

  // A stop: the drive goes there (NightDriveMath.hopSeconds), and the kick, card and next come in when it rests. Any
  // choice during the creature's entry ends the entry: a segment goes to its stop, "next" (a click on the scene's right,
  // an arrow) to stop 1.
  const select = (i, how) => {
    if (i < 0 || i >= SPAN.length) return;
    const M = NightDriveMath;
    if (introRef.current) {
      if (how !== 'jump' && i === selectedRef.current + 1) i = selectedRef.current;
      introRef.current = false;
      setIntro(false);
    }
    selectedRef.current = i;
    setSelected(i);
    if (tweenRef.current) tweenRef.current.kill();
    tweenRef.current = null;
    const engine = engineRef.current, from = prog.current.s, to = M.STOP_S[i];
    if (engine && typeof gsap !== 'undefined' && Math.abs(to - from) > 1e-4) {
      setRest(false);
      tweenRef.current = gsap.to(prog.current, {
        s: to, duration: M.hopSeconds(from, to), ease: 'power2.inOut', overwrite: true,
        onUpdate: () => { if (engineRef.current) engineRef.current.setProgress(prog.current.s); },
        onComplete: () => { tweenRef.current = null; setRest(true); },
      });
    } else {
      prog.current.s = to;
      if (engine) engine.setProgress(to);
      setRest(true);
    }
  };
  const st = (typeof useStory === 'function' ? useStory : noStory)({
    id: 'capabilities', count: SPAN.length, index: selected, enabled: story, hold: intro,
    duration: typeof NightDriveMath !== 'undefined' ? NightDriveMath.STORY_MS : 6000,
    watchRef: stageRef, rootRef: sectionRef, select: (i, how) => select(i, how),
  });

  // The creature's entry: once, on its own clock, while the section is on screen, the tab visible and the story not
  // paused; it ends resting on stop 1, and the story's clock starts.
  const playIntro = story && live && intro && !!st && st.inView && !st.hidden && !st.paused;
  React.useEffect(() => {
    if (!playIntro) return;
    const M = NightDriveMath, t = timingRef.current || M.entryTiming(), ent = M.newEntry(prog.current.s);
    let raf = 0, last = performance.now();
    const frame = (now) => {
      if (!introRef.current) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const s = M.entryStep(ent, prog.current.s, dt, t);
      prog.current.s = s;
      if (engineRef.current) engineRef.current.setProgress(s);
      if (s >= M.STOP_S[0]) { introRef.current = false; setIntro(false); setRest(true); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playIntro]);

  // An off-stage card stays out of the tab order.
  React.useEffect(() => { if (cardRef.current) cardRef.current.inert = !(rest && !intro); }, [rest, intro, story]);

  // A test hook for scripts/night-drive-check.mjs.
  React.useEffect(() => {
    if (!story) return;
    window.__capStory = {
      get s() { return prog.current.s; }, get selected() { return selectedRef.current; }, get intro() { return introRef.current; },
      get live() { return !!engineRef.current; }, get moving() { return !!tweenRef.current; },
      get words() { return engineRef.current && engineRef.current.words ? engineRef.current.words(selectedRef.current) : null; },
    };
    return () => { delete window.__capStory; };
  }, [story]);

  const step = (d) => { if (st) st.go(d); else select(selectedRef.current + d); };
  const onKey = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); step(['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); const i = e.key === 'Home' ? 0 : SPAN.length - 1;
      if (st) st.jump(i); else select(i, 'jump');
    }
  };
  const cur = SPAN[selected], shown = story && rest && !intro;
  return (
    <React.Fragment>
      <section
        ref={sectionRef}
        className="scene scene-skills"
        id="skills"
        data-screen-label="02 Capabilities"
        data-drive={story ? 'story' : 'off'}
        data-landing="0"
        data-selected-stop={story ? selected : undefined}
        data-world-live={story ? String(live) : undefined}
      >
        <div className={'nd-stage' + (live ? ' is-live' : '')} ref={stageRef}>
          <header className="nd-entry" ref={entryRef}>
            <div className="skills-meta">
              <span className="skills-label">The night drive · 5 stops</span>
            </div>
            <h1 className="skills-head-title nd-title" ref={titleRef}>Research, design, code, performance<span className="nd-stop" ref={stopRef}>.</span></h1>
          </header>
          {story ? (
            <React.Fragment>
              <img className="nd-creature nd-creature-still" src={CREATURE_BASE + 'still.webp'} alt="" aria-hidden="true" width="256" height="171" />
              <canvas className="nd-creature nd-crprint" ref={printRef} aria-hidden="true" />
              <canvas className="nd-creature" ref={creatureRef} aria-hidden="true" />
              <div className="nd-pixel" ref={pixelRef} aria-hidden="true" />
              <div className="cap-scene" role="region" tabIndex="0" onKeyDown={onKey} onDragStart={(e) => e.preventDefault()}
                aria-label="Capability scene. Click the right side for the next stop, the left side for the one before; the arrow keys step through the stops."
                {...(st ? st.gestures : {})} />
              {st && typeof StoryBar === 'function' && <StoryBar story={st} labels={SPAN.map((s) => s.label)} label="Capability stops" names className="cap-bar" />}
              <div className={'nd-hud' + (shown ? '' : ' is-out')} aria-hidden="true">
                {shown && <div className="nd-kick" key={selected}><span>{pad2(selected + 1)} / 05</span><b /><span>{cur.kick}</span></div>}
              </div>
              <aside className={'nd-card' + (shown ? ' is-on' : '')} ref={cardRef} aria-label="Work for this capability">
                <span className="nd-card-k">Seen in</span>
                {related(cur).map((p) => (
                  <a className="nd-card-work" key={p.slug || p.id} href={workHref(p)} onClick={() => openWork(p)}>
                    <img src={p.cover} alt="" loading="lazy" style={p.coverPos ? { objectPosition: p.coverPos } : undefined} />
                    <span><b>{p.title}</b><i>{p.subtitle || p.description}</i></span>
                  </a>
                ))}
                <span className="nd-card-k nd-card-tools">{toolList(cur)}</span>
              </aside>
              {/* At the last stop, somewhere to go: the work (Lucy's user tests, 2026-10-31: the end of Capabilities did not
                  read as an end). On its own page "Next: sompednyc" pointed nowhere. */}
              {shown && selected === SPAN.length - 1 && (
                <a className="nd-next" href="work.html">All work <span className="nd-next-arrow" aria-hidden="true">→</span></a>
              )}
              <p className="sr-only" aria-live={st ? st.live : 'polite'} aria-atomic="true">{intro ? '' : 'Stop ' + (selected + 1) + ' of 5: ' + cur.label + '. ' + cur.line}</p>
            </React.Fragment>
          ) : (
            <img className="nd-still" src={CREATURE_BASE + 'still.webp'} alt="" width="256" height="171" />
          )}
        </div>

        {/* The list: the section itself for reduced motion, no WebGL or a short screen. The real list of
            capabilities for those readers. */}
        {!story && (
          <div className="nd-recap">
            <div className="nd-recap-in">
              <ol className="nd-list">
                {SPAN.map((s, i) => (
                  <li key={s.label}>
                    <span className="nd-n" aria-hidden="true">{pad2(i + 1)} / 05</span>
                    <h3 className="nd-name">{s.label}</h3>
                    <p className="nd-line">{s.line}</p>
                    <div className="nd-work">
                      {related(s).map((p) => <a key={p.slug || p.id} href={workHref(p)} onClick={() => openWork(p)}>{p.title}</a>)}
                    </div>
                    <p className="nd-tools">{toolList(s)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </section>
    </React.Fragment>
  );
}

/* The one hand-maintained string in this section. The AS OF stamp is not decoration:
   it lets a reader judge freshness for themselves, so a line that goes stale reads as
   dated rather than as a claim that is no longer true. Update both together. */
const CURRENTLY = {
  doing: 'UX/UI team lead at AStudio',   // Lucy, 2026-11-01: "Team lead at AStudio" (the resume and CV: since Sep 2026)
  asOf: 'Oct 2026',
};

/* Off hours, its own section and page (Lucy, 2026-11-01: "off hours should be seperate section and page"; it was a strip
   under About's room that morning). Her VJ work and her four art pieces, each a whole cover and a link to its page, in
   two groups whose ids are off-hours.html's anchors (the drawer's headphones open #visuals, the paintbrush #art). The
   covers are 560 px tall WebP (scripts/off-hours-covers.py); off-hours.html lists the same pieces in the same order. */
const OFF_HOURS = [
  { id: 'visuals', name: 'Live visuals', items: [
    { title: 'Demon Nights', href: 'live-visuals-nyc.html', img: 'demon-nights', w: 840, meta: 'Live · Thursdays · NYC' },
    { title: 'Audio Reactive', href: 'audio-reactive.html', img: 'audio-reactive', w: 560, meta: 'TouchDesigner · 2026' },
  ] },
  { id: 'art', name: 'Art', items: [
    { title: 'Anticipation', href: 'anticipation.html', img: 'anticipation', w: 756, meta: 'Fine Arts · 2024' },
    { title: 'Arrested Motion', href: 'handpainting.html', img: 'arrested-motion', w: 461, meta: 'Fine Arts · 2023' },
    { title: 'Agar Alphabet', href: 'agar-alphabet.html', img: 'agar-alphabet', w: 1080, meta: 'Design · 2025' },
    { title: 'Telnex', href: 'telnex.html', img: 'telnex', w: 373, meta: 'Design · 2024', note: 'Scholastic honourable mention' },
  ] },
];

/* The home page's Off hours (after the With AI band; on phones, after the hero): the six covers at one height, grouped,
   lazy, with the way to the page. */
function OffHoursSection() {
  return (
    <section className="scene scene-offhours" id="off-hours" data-screen-label="03 Off hours" data-landing="0" aria-labelledby="oh-h">
      <div className="oh-in">
        <div className="oh-head">
          <span className="scene-kicker oh-kicker">01 · Off hours</span>
          <h2 className="oh-h" id="oh-h">What I make on my own time.</h2>
          <a className="link-caps oh-all" href="off-hours.html">See Off hours <b aria-hidden="true">&rarr;</b></a>
        </div>
        <div className="oh-groups">
          {OFF_HOURS.map(g => (
            <div className="oh-group" key={g.id}>
              <h3 className="oh-k">{g.name}</h3>
              <ul className="oh-list">
                {g.items.map(p => (
                  <li key={p.title}>
                    <a className="oh-item" href={p.href}>
                      <img src={'assets/off-hours/' + p.img + '.webp'} alt="" width={p.w} height="560" loading="lazy" decoding="async" />
                      <span className="oh-t">{p.title} <b aria-hidden="true">&rarr;</b></span>
                      <span className="oh-m">{p.meta}</span>
                      {p.note && <span className="oh-m oh-note">{p.note}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Under the Lucky Drawer ticket's silver (Lucy, 2026-10-29: "personalize my about"; then the postcard became a scratch
   ticket): what she does off the clock. The bonus went: her Spotify and Pinterest first ("i dont like spotify and
   pinterest on the lucky scratch"; they lie in the drawer now, a CD and a collage book, the engine's cards), then the
   keychain that took their place ("remove keychain i made on the scratch ticket"; it has its own card in the drawer).
   Not in the Channels lists. */
const OFF_THE_CLOCK = ['finding new brands on IG', 'the gym', 'making things: laser cutting, 3D printing, drawing, Roblox games, anything by hand', 'cooking: new recipes, seasonal veggies from the farmers market', 'music'];   // Lucy, 2026-10-29: "making things i like making"; cooking, Nov 18: "trying new recieps and going to farmers market and buying seasonal veggies"

/* The back of the ticket (Lucy, 2026-10-29: "and be able to flip it over"): its terms, in her voice (kept as written,
   Lucy, 2026-11-01). On a narrow ticket the first four show. */
const TICKET_TERMS = [
  'Valid summer 2027.',
  'Redeemable for one intern: product design, UX research, or creative technology.',
  'No purchase necessary. Pick the lock to enter.',
  'Void where the brief is boring.',
  'Odds of a reply: high.',
  'Prizes may contain pixels.',
];

/* About is the lockpick drawer (Lucy, 2026-10-22: "replace", of The Set's VJ stage; the
   look test is docs/superpowers/plans/2026-10-22-about-drawer/round6.html). This renders
   static markup only: the canvas, the hit areas, the pixel-window card and the plain links.
   components/about-drawer.js (window.AboutDrawerMount) finds them by data-dr and owns the
   scene; index.html's aboutOpen effect mounts it. Nothing here carries a src: the engine
   fetches the drawer's data and sheets on the first open. onBook closes About and scrolls to
   Contact (a bare #contact href would fight the stopped Lenis and the scroll lock). About is
   one screen (Lucy, 2026-10-22: "i don't want anything in about to scroll, the whole about
   should be on one page"): the room's gradient fills the overlay, the engine's fit() sizes
   the stage to what the viewport leaves, and the facts flank it ("include other info on both
   sides"): the old setlist and notes, with the resume and CV under Files. No lede. The card
   is a window with a bar to drag and a grip to resize. Contact is no section any more (Lucy,
   2026-10-22: "remove the [contact] at the end and only keep it in the dropdown menu"), so
   Booking mails her, with the subject set. */
function AboutSection({ open = true }) {
  const [file, setFile] = React.useState(null);
  const triggerRef = React.useRef(null), fileCloseRef = React.useRef(null);
  const files = [
    // one short line each, like the facts beside the stage (Lucy, 2026-11-01: "too much description", then "da akk")
    { name: 'Background', title: 'Background', text: "Based in New York. Studying IMA at NYU Tisch ’29." },
    { name: 'Now', title: 'What I’m up to', text: CURRENTLY.doing + '. Side project: sompednyc, tooth gems.' },
  ];   // the Booking file is gone (Lucy, 2026-11-01: "remove 03 / FILE Summer 2027 ..."): Email under the files and the drawer's Booking fact carry it
  // The ticket's crumple, silver and coin are components/lucky-ticket.js; closing About gives a fresh ticket.
  const ticketRef = React.useRef(null), ticket = React.useRef(null);
  React.useEffect(() => {
    if (ticketRef.current && window.LuckyTicket) ticket.current = window.LuckyTicket.mount(ticketRef.current);
    return () => { if (ticket.current) ticket.current.destroy(); ticket.current = null; };
  }, []);
  React.useEffect(() => { if (!open) { setFile(null); if (ticket.current) ticket.current.reset(); } }, [open]);
  React.useEffect(() => { if (file !== null && fileCloseRef.current) fileCloseRef.current.focus({ preventScroll: true }); }, [file]);
  const closeFile = () => { setFile(null); if (triggerRef.current) triggerRef.current.focus({ preventScroll: true }); };
  const chooseFile = (i, e) => {
    triggerRef.current = e.currentTarget;
    const root = e.currentTarget.closest('.scene-about'), oldCard = root.querySelector('[data-dr="proj"]');
    if (oldCard && !oldCard.hidden) root.querySelector('[data-dr="proj-x"]').click();
    setFile(current => current === i ? null : i);
  };
  return (
    <section className="scene scene-about" id="about" data-screen-label="04 About"
      onKeyDown={e => { if (e.key === 'Escape' && file !== null) { e.preventDefault(); e.stopPropagation(); closeFile(); } }}
      onPointerDownCapture={e => { if (e.target.closest && e.target.closest('.dr-dochit')) setFile(null); }}>
      <div className="about-drawer">
        <span className="scene-kicker about-kicker">
          <img className="about-portrait" src="assets/headshot.jpg" alt="Portrait of Lucy Liu" width="44" height="55" loading="lazy" decoding="async" />
          <span>About</span>
        </span>
        <div className="dr-room">
          <dl className="dr-side dr-side-l">
            {/* One short line a fact (Lucy, 2026-11-01, of both columns: "too much description"); the ticket keeps the as-of stamp */}
            <div><dt>Now</dt><dd>{CURRENTLY.doing}</dd></div>
            <div><dt>Based</dt><dd>New York</dd></div>
            <div><dt>Studying</dt><dd>IMA, NYU Tisch '29</dd></div>
            <div><dt>Files</dt><dd>
              <a href="assets/Lucy_Liu_Resume.pdf" className="about-link" target="_blank" rel="noopener">Resume (PDF) <span aria-hidden="true">&#8599;</span></a>
              <span className="dr-sub"><a href="assets/Lucy_Liu_CV.pdf" target="_blank" rel="noopener noreferrer" className="about-link" data-cursor="read">CV <span aria-hidden="true">&rarr;</span></a></span>
            </dd></div>
          </dl>

          <div className="dr-stage" data-dr="stage">
            <canvas className="dr-canvas" data-dr="canvas" width="1024" height="768" role="img"
              aria-label="Pixel animation: the creature in his drawer bends a paperclip into a key and picks the lock of the drawer below" />
            <button type="button" className="dr-hit" data-dr="clip-hit" aria-label="Unlock the drawer with the key he bent from the paperclip" hidden />
            <div className="dr-label" data-dr="clip-label" aria-hidden="true" hidden>
              <span className="dr-label-k">paperclip key</span><span>&#8601; click the key</span>
            </div>
            <button type="button" className="dr-skip" data-dr="skip" aria-label="Skip to the drawer" hidden>Skip <span aria-hidden="true">↓</span></button>
            <div className="dr-card" data-dr="proj" role="region" aria-live="polite" aria-labelledby="dr-card-title" hidden>
              <div className="dr-card-bar" data-dr="proj-bar" aria-hidden="true" />
              <button type="button" className="dr-card-x" data-dr="proj-x" aria-label="Close">&times;</button>
              <div className="dr-card-body" data-dr="proj-body">
                <span className="dr-sr" data-dr="proj-n">01</span>
                <h3 id="dr-card-title" className="dr-sr" data-dr="proj-title">Resume</h3>
                <canvas className="dr-card-head" data-dr="proj-head" aria-hidden="true" />
                <p className="dr-card-what"><span data-dr="proj-what" /><i className="dr-cur" data-dr="proj-cur" hidden /></p>
                {/* The Lucky Drawer (Lucy, 2026-10-29: "instead of post card its a lottery ticket", "make it look like kinda
                    crumpled in drawer and when i scratch it its an animation of a coin, also make the ticket bigger", then
                    round 2: "make spotify and pinterest link more creative", "and be able to flip it over"; the look test
                    is docs/superpowers/plans/2026-10-29-postcard/lucky-ticket-v2.html). A crumpled scratch ticket, the
                    whole card for this file (the pixel window steps aside, styles.css). Front: two silver spots, the
                    stub's jackpot (a summer 2027 intern) and what she does off the clock; both thunk a WINNER stamp
                    on. Under its title, what you won by picking the lock (Lucy, Oct 29: "like the user won the lottery
                    and gets a deep dive in my life"): the grand prize, a deep dive into her life. Its folded corner
                    turns it over: how to play, the terms, and the prizes to claim, each locked till scratched.
                    components/lucky-ticket.js draws and runs it. Both faces share one cell, about 228 px at laptop
                    widths, so the card opens under the picture like the CV. className stays fixed: the engine toggles
                    .in on it. */}
                <div className="dr-ticket" data-dr="proj-card" ref={ticketRef} hidden>
                  <div className="dr-tk-wrap">
                    <div className="dr-tk-turn">
                      <section className="dr-tk-face dr-tk-front" aria-label="The Lucky Drawer ticket">
                        <div className="dr-tk">
                          <div className="dr-tk-stub">
                            <div className="dr-tk-jack">
                              <a href="mailto:wl3512@nyu.edu?subject=Summer%202027" inert="" aria-label="Jackpot: a summer 2027 intern. Email Lucy"><b>JACKPOT</b><svg className="dr-tk-star" viewBox="0 0 9 6" aria-hidden="true" /><span>intern<br />&rsquo;27</span></a>
                              <button type="button" className="dr-tk-scratch" data-claim="intern" aria-label="Reveal the jackpot"><canvas /></button>
                            </div>
                            <span className="dr-tk-admit" aria-hidden="true">Admit<br />one</span><span className="dr-tk-serial" aria-hidden="true">No 2027</span>
                          </div>
                          <div className="dr-tk-main">
                            <div className="dr-tk-head"><svg className="dr-tk-title" role="img" aria-label="Lucky Drawer" /><span className="dr-tk-badge">Reveal 2 &middot; win</span></div>
                            <p className="dr-tk-grand"><b>Grand prize</b> a deep dive into my life</p>
                            <div className="dr-tk-panels">
                              <div className="dr-tk-panel">
                                <div className="dr-tk-prize" inert=""><span className="dr-tk-k">Off the clock</span><ol>{OFF_THE_CLOCK.map(t => <li key={t}>{t}</li>)}</ol></div>
                                <button type="button" className="dr-tk-scratch" data-claim="clock" aria-label="Reveal the off-the-clock panel"><canvas /></button>
                              </div>
                            </div>
                          </div>
                          <span className="dr-tk-stamp" aria-hidden="true">Winner<small>every ticket wins</small></span>
                          <canvas className="dr-tk-crumple" aria-hidden="true" />
                          <button type="button" className="dr-tk-flip" aria-label="Turn the ticket over"><span>turn over &#8600;</span></button>
                        </div>
                      </section>
                      <section className="dr-tk-face dr-tk-back" aria-label="The back of the ticket: how to play, the terms, your prizes" inert="">
                        <div className="dr-tk">
                          <div className="dr-tk-stub" aria-hidden="true"><svg className="dr-tk-bar" viewBox="0 0 10 40" /><span className="dr-tk-serial">No 2027</span></div>
                          <div className="dr-tk-bmain">
                            <p className="dr-tk-k">How to play</p>
                            <p className="dr-tk-how">Click or tap the silver panels to reveal. Every ticket wins.</p>
                            <p className="dr-tk-k">Terms &amp; conditions</p>
                            <ol className="dr-tk-tc">{TICKET_TERMS.map(t => <li key={t}>{t}</li>)}</ol>
                            <p className="dr-tk-k">Claim your prize</p>
                            <a className="dr-tk-hire" href="mailto:wl3512@nyu.edu?subject=Claiming%20my%20prize%3A%20hiring%20you%20for%20summer%202027" aria-label="Claim your prize: hire Lucy for summer 2027. Email Lucy"><b>One intern, summer 2027</b><span>Hire me &#9993;</span></a>
                          </div>
                          <canvas className="dr-tk-crumple" aria-hidden="true" />
                          <button type="button" className="dr-tk-flip" aria-label="Turn the ticket back over"><span>turn back</span></button>
                        </div>
                      </section>
                    </div>
                    <canvas className="dr-tk-fx" aria-hidden="true" />
                  </div>
                </div>
                <div className="dr-mail" data-dr="proj-mail" hidden>
                  <span className="dr-mail-k">Email</span>
                  <span className="dr-mail-v" data-dr="mail-v">wl3512@nyu.edu</span>
                  <button type="button" className="dr-copy" data-dr="copy-mail">Copy</button>
                  <span className="dr-copied" data-dr="copied" aria-live="polite" />
                </div>
                <div className="dr-gos">
                  <a className="dr-go" data-dr="proj-go" href="assets/Lucy_Liu_Resume.pdf" target="_blank" rel="noopener">Open</a>
                  <a className="dr-go2" data-dr="proj-go2" href="#gems" rel="noopener" hidden>More</a>
                </div>
              </div>
              <div className="dr-card-grip" data-dr="proj-grip" aria-hidden="true" />
            </div>
          </div>

          <dl className="dr-side dr-side-r">
            <div><dt>Side project</dt><dd>sompednyc, tooth gems</dd></div>
            <div><dt>Booking</dt><dd>
              <a href="mailto:wl3512@nyu.edu?subject=Summer%202027" className="about-link">Summer 2027</a>
              <span className="dr-sub"><a href="mailto:wl3512@nyu.edu" className="about-link">wl3512@nyu.edu</a></span>
            </dd></div>
          </dl>
        </div>
        <div className="dr-phone-dock dr-direct">
          <p className="dr-phone-intro">Product designer, researcher, and creative technologist.</p>
          <div className="dr-phone-tabs" aria-label="About files">
            {files.map((f, i) => <button type="button" key={f.name} aria-expanded={file === i} aria-controls="dr-phone-file" onClick={e => chooseFile(i, e)}>{f.name}</button>)}
          </div>
          <div className="dr-phone-links">
            <a href="assets/Lucy_Liu_Resume.pdf" target="_blank" rel="noopener">Resume ↗</a>
            <a href="assets/Lucy_Liu_CV.pdf" target="_blank" rel="noopener noreferrer">CV →</a>
            <a href="mailto:wl3512@nyu.edu">Email →</a>
          </div>
          <div className="dr-phone-file dr-card" id="dr-phone-file" role="dialog" aria-labelledby="dr-phone-file-title" hidden={file === null}>
            <button ref={fileCloseRef} className="dr-phone-file-close" type="button" aria-label="Close file" onClick={closeFile}>×</button>
            <span className="dr-phone-file-index">{file === null ? '' : String(file + 1).padStart(2, '0') + ' / FILE'}</span>
            <h3 id="dr-phone-file-title">{file === null ? '' : files[file].title}</h3>
            <p>{file === null ? '' : files[file].text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* The home page's last screen: lights out (Lucy, 2026-10-22: a conclusion after s0mped, "b, but make it connected to
   About somehow if you pick cabinet"). About's cabinet, closed for the night; components/end-scene.js
   (window.EndSceneMount) draws it and owns the door. Knocking opens About (#about), where the same drawer slides out
   and he pops up; closing About sends him back down. The room and its line only: the shared footer right under it carries
   the links (Lucy, 2026-10-31: "Lights out keeps the room and its line; the footer carries the links"). */
function EndSection({ workspace = false }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (window.EndSceneMount && ref.current) window.EndSceneMount(ref.current); }, []);
  return (
    <section ref={ref} className="scene scene-end" id="end" data-screen-label="05 Lights out" data-landing={workspace ? undefined : "0"} data-workspace-room={workspace ? "" : undefined}>
      <div className="end-room">
        <div className="end-stage" data-end="stage">
          <canvas className="end-canvas" data-end="canvas" aria-hidden="true" />
          <button type="button" className="end-door" data-end="door" aria-label="Tap the drawer to give him a gift: open About" />
          {workspace ? <a className="journey-about" href="#about" onClick={(e) => { e.preventDefault(); e.currentTarget.closest('.scene-end').querySelector('.end-door').click(); }}>Give him a paperclip for a surprise <span aria-hidden="true">→</span></a> : <>
          <p className="end-line">That's everything. Come back anytime.</p>
          <p className="end-hint" aria-hidden="true">tap the drawer to give him a gift</p></>}   {/* Lucy, 2026-10-29: "change to tap the drawer to give him a gift" (was "give him a paperclip for About") */}
        </div>
        {!workspace && <button className="intro-replay end-replay" type="button" onClick={() => window.LucyIntro && window.LucyIntro.replay()}>Replay opening</button>}
      </div>
    </section>
  );
}

window.WithAiSection = WithAiSection;
window.CapabilitiesDrive = CapabilitiesDrive;
window.EndSection = EndSection;
window.OffHoursSection = OffHoursSection;
window.AboutSection = AboutSection;
