/* global React */

// Tool marks. Each capability on the span carries the tools it works in, as a quiet mono
// run under its line. Colors are each tool's brand hue, tuned to read on the void (no pure #fff).
const TOOLS = [
  { name: 'Figma', abbr: 'Fg', fg: '#F24E1E' },
  { name: 'Illustrator', abbr: 'Ai', fg: '#FF9A00' },
  { name: 'Premiere Pro', abbr: 'Pr', fg: '#9E9BFF' },
  { name: 'After Effects', abbr: 'Ae', fg: '#C9A0FF' },
  { name: 'p5.js', abbr: 'p5*', fg: '#F45D9A' },
  { name: 'Touch Designer', abbr: '◎', fg: '#D4C400' },
  { name: 'Arduino', abbr: '∞', fg: '#37B7BD' },
  { name: 'Claude Code', abbr: '✶', fg: '#CC785C' },
];
const TOOL_BY_NAME = {};
TOOLS.forEach((t) => { TOOL_BY_NAME[t.name] = t; });

// The span: five capabilities plotted from upstream thinking to live performance.
// Ordered, not ranked — the order IS the content, because the width of the range is what
// this section exists to say. Each node carries a label, one line, and its tools; there is
// no hidden depth layer, since "range at a glance" does not need a paragraph behind a
// hover, and hiding content behind hover costs keyboard and touch users.
//
// This replaced a 7-tile bento (17 sentences, ~108 words, ~32s of reading) that spent the
// whole attention budget the site gets. Product Design / Interaction / Research / Strategy
// were four cuts at one discipline, Coding and Creative Coding were hard to tell apart, and
// the per-tile meta labels (craft, dev, play, rigor, framing) carried no information.
// `tools` names must match TOOLS[].name exactly.
// Each capability also carries a state for the Dither field behind the section. The span
// runs from upstream thinking to a live booth, so the backdrop runs from nearly still to
// fully driven: the section performs the range it is describing instead of sitting on a
// decorative loop. Hues stay inside the site's blue-to-lavender aura, so the Restrained
// colour decision holds; only motion changes character.
//   speed/freq/amp map to the shader's uWaveSpeed / uWaveFrequency / uWaveAmplitude.
const SPAN = [
  { label: 'Strategy & Research', line: 'I work upstream of the interface.', tools: 'Figma', work: 'habitabull,reptools',
    field: { speed: 0.010, frequency: 1.4, amplitude: 0.20, color: [0.08, 0.30, 0.78] } },
  { label: 'Product Design', line: 'Psychology-first: I design for how people actually behave.', tools: 'Figma,Illustrator', work: 'habitabull,h2know',
    field: { speed: 0.028, frequency: 2.2, amplitude: 0.34, color: [0.14, 0.46, 0.96] } },
  { label: 'Interaction & Motion', line: 'The feel matters as much as the flow.', tools: 'Figma,After Effects', work: 'eternal-wreckening,driftwood',
    field: { speed: 0.080, frequency: 3.0, amplitude: 0.52, color: [0.34, 0.54, 1.00] } },
  { label: 'Code', line: 'I ship what I design.', tools: 'p5.js,Arduino,Claude Code', work: 'driftwood', withAi: true,
    field: { speed: 0.044, frequency: 4.8, amplitude: 0.40, color: [0.18, 0.64, 1.00] } },
  { label: 'Live Performance', line: 'Generative visuals, performed live from the booth.', tools: 'Touch Designer,Premiere Pro', work: 'live-visuals-nyc',
    field: { speed: 0.165, frequency: 3.6, amplitude: 0.60, color: [0.50, 0.36, 0.94] } },
];
// At rest: the field the section has always had, so nothing looks broken before you engage.
const FIELD_REST = { speed: 0.04, frequency: 3.0, amplitude: 0.30, color: [0.149, 0.545, 1.0] };
// Four and a half screens give the five stops room to breathe. Scroll distance, not a
// timer: people can pause, reverse, or use the numbered stops to move at their own pace.
const TRAIL_LENGTH = 4.5;
const TRAIL_STOPS = [
  { x: 240, y: 260 }, { x: 920, y: 200 }, { x: 1600, y: 290 },
  { x: 2280, y: 210 }, { x: 2960, y: 260 },
];
const TRAIL_PATH = TRAIL_STOPS.reduce((path, point, i) => {
  if (!i) return 'M ' + point.x + ' ' + point.y;
  const previous = TRAIL_STOPS[i - 1];
  const middle = (previous.x + point.x) / 2;
  return path + ' C ' + middle + ' ' + previous.y + ', ' + middle + ' ' + point.y + ', ' + point.x + ' ' + point.y;
}, '');

// Same rule the Spotlight cards use, so a capability and the work grid never disagree
// about where a project lives. case-study.html forwards any non-driftwood slug to <slug>.html.
function workHref(p) {
  if (p.detailPage) return p.detailPage;
  return 'case-study.html?slug=' + encodeURIComponent(p.slug || p.id);
}

// Not a project, so it is not in the projects array: the Code stop links the With AI page
// by hand. slug stays unique so it cannot collide with a real project key. Keep that stop at
// two cards: a third ran past the footer on phones (journey-check, 393px).
const WITH_AI_CARD = {
  slug: 'with-ai', title: 'With AI', cover: 'assets/with-ai/menu-hover.webp', detailPage: 'with-ai.html',
  subtitle: 'How I build with Claude Code and Codex: I design it and set the rules, they write most of the code.',
};

function SkillsSection(props) {
  const projects = (props && props.projects) || [];
  const onOpen = props && props.onOpen;
  const bySlug = {};
  projects.forEach((p) => { bySlug[p.slug || p.id] = p; });
  const sectionRef = React.useRef(null);
  const journeyRef = React.useRef(null);
  const [journeyEnabled, setJourneyEnabled] = React.useState(false);
  // Which capability the reader is on. Pointer or keyboard: a hover-only version would
  // leave the whole effect unreachable by keyboard, so focus drives it identically.
  const [hovered, setHovered] = React.useState(null);
  // And scroll: a playhead walks the span as the section passes, so reading down the page
  // literally travels from upstream thinking to the booth. A deliberate pointer wins over
  // the playhead, otherwise scrolling would yank the panel out from under the cursor.
  const [scrolled, setScrolled] = React.useState(null);
  const active = hovered != null ? hovered : scrolled;
  const setActive = setHovered;
  const field = (active != null && SPAN[active] && SPAN[active].field) || FIELD_REST;

  // One playhead owns the camera, the drawn path, depth, and the active stop. All
  // animation styles are applied only inside a reversible media context; the ordinary
  // list remains the fallback for short screens, reduced motion, print, or failed GSAP.
  React.useEffect(() => {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    if (document.documentElement.classList.contains('reduce-motion')) return;
    gsap.registerPlugin(ScrollTrigger);
    const root = sectionRef.current;
    const viewport = root.querySelector('.skills-viewport');
    const world = root.querySelector('.span');
    const path = root.querySelector('.journey-path');
    const light = root.querySelector('.journey-light');
    const nodes = Array.from(root.querySelectorAll('.span-node'));
    const mm = gsap.matchMedia();
    mm.add('(min-height: 640px) and (prefers-reduced-motion: no-preference)', () => {
      root.dataset.journey = 'true';
      setJourneyEnabled(true);
      const length = path.getTotalLength();
      // The curve is monotonic in x. Locate the exact arc-length at each stop so the
      // travelling light reaches its marker at the same moment the camera settles.
      const distances = TRAIL_STOPS.map(point => {
        let lo = 0, hi = length;
        for (let n = 0; n < 24; n++) {
          const middle = (lo + hi) / 2;
          if (path.getPointAtLength(middle).x < point.x) lo = middle;
          else hi = middle;
        }
        return (lo + hi) / 2;
      });
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      gsap.set(world, { x: 0, y: 0, force3D: true });
      gsap.set(nodes, { xPercent: -50, opacity: 1, transformOrigin: '50% 0%', force3D: true });
      const cameraX = gsap.quickSetter(world, 'x', 'px');
      const cameraY = gsap.quickSetter(world, 'y', 'px');
      const transforms = nodes.map(node => ({
        z: gsap.quickSetter(node, 'z', 'px'),
        turn: gsap.quickSetter(node, 'rotationY', 'deg'),
        opacity: gsap.quickSetter(node, 'opacity'),
      }));
      let viewportWidth = viewport.clientWidth, viewportHeight = viewport.clientHeight;
      let current = -1;
      let disposed = false;
      const cursor = { distance: 0 };
      const render = () => {
        if (disposed) return;
        const point = path.getPointAtLength(cursor.distance);
        const travel = (point.x - TRAIL_STOPS[0].x) / 680;
        const step = Math.max(0, Math.min(SPAN.length - 1, Math.round(travel)));
        cameraX(viewportWidth / 2 - point.x);
        // Phones: each capability's block (label, tools, trail, "seen in" cards) hangs mostly
        // below the trail, so anchoring the trail at 51% sat the block ~40px low between the
        // title and the "follow the trail" footer. 0.455 centres it (Lucy, 2026-09-29).
        cameraY(viewportHeight * (viewportWidth <= 760 ? 0.455 : 0.51) - point.y);
        path.style.strokeDashoffset = String(length - cursor.distance);
        light.setAttribute('cx', point.x);
        light.setAttribute('cy', point.y);
        nodes.forEach((node, i) => {
          const delta = i - travel;
          const distance = Math.min(1, Math.abs(delta));
          transforms[i].z(-200 * distance);
          transforms[i].turn(18 * Math.max(-1, Math.min(1, delta)));
          transforms[i].opacity(Math.max(0.16, 1 - distance * 0.84));
          node.inert = i !== step;
          node.tabIndex = i === step ? 0 : -1;
        });
        root.style.setProperty('--journey-progress', String(cursor.distance / length));
        if (step !== current) {
          current = step;
          setHovered(null);
          setScrolled(step);
        }
      };
      const tl = gsap.timeline({
        onUpdate: render,
        scrollTrigger: {
          id: 'capabilities-journey', trigger: root,
          start: 'top top',
          end: () => '+=' + Math.round(root.offsetHeight * TRAIL_LENGTH),
          pin: true, pinSpacing: true, anticipatePin: 1,
          scrub: 0.65, invalidateOnRefresh: true,
          onRefresh: () => {
            viewportWidth = viewport.clientWidth;
            viewportHeight = viewport.clientHeight;
            render();
          },
        },
      });
      const arrivals = [0.2];
      tl.to(cursor, { distance: 0, duration: 0.4 });
      for (let i = 1; i < SPAN.length; i++) {
        tl.to(cursor, { distance: distances[i], duration: 0.75, ease: 'power1.inOut' });
        arrivals.push(tl.duration() + 0.15);
        tl.to(cursor, { distance: distances[i], duration: 0.3 });
      }
      journeyRef.current = { timeline: tl, arrivals };
      render();
      // Fonts and the work section above can settle after this effect. Refresh after
      // fonts load, with an unmount guard so an old page cannot restart a dead pin.
      if (document.fonts) document.fonts.ready.then(() => {
        if (!disposed) ScrollTrigger.refresh();
      });
      return () => {
        disposed = true;
        journeyRef.current = null;
        delete root.dataset.journey;
        root.style.removeProperty('--journey-progress');
        path.style.removeProperty('stroke-dashoffset');
        nodes.forEach(node => {
          node.inert = false;
          node.tabIndex = 0;
          node.style.removeProperty('opacity');
          node.style.removeProperty('transform');
        });
        setJourneyEnabled(false);
        setScrolled(null);
      };
    });
    return () => mm.revert();
  }, []);

  const goToStop = (index) => {
    const journey = journeyRef.current;
    if (!journey) return;
    const trigger = journey.timeline.scrollTrigger;
    const progress = journey.arrivals[index] / journey.timeline.duration();
    const top = trigger.start + (trigger.end - trigger.start) * progress;
    if (window.__lenis) window.__lenis.scrollTo(top, { duration: 0.7 });
    else window.scrollTo({ top, behavior: 'smooth' });
  };
  // Latches true when the section nears the viewport; falls back to eager mount
  // if the hook failed to load. Gate is stable across renders (rules-of-hooks safe).
  const nearView = typeof useInView === 'function' ? useInView(sectionRef, '60% 0px') : true;
  const showDither = typeof Dither !== 'undefined' && window.__webglOK !== false && window.innerWidth > 760 && !window.matchMedia('(pointer: coarse)').matches && nearView;

  return (
    <section
      ref={sectionRef}
      className={'scene scene-skills' + (hovered != null ? ' is-probing' : '')}
      id="skills"
      data-screen-label="02 Capabilities"
    >
      {showDither && (
        <Dither className="skills-dither" colorNum={4} pixelSize={3} mouseRadius={0.6}
          waveColor={field.color} waveAmplitude={field.amplitude}
          waveFrequency={field.frequency} waveSpeed={field.speed} />
      )}
      <div className="container">
        <header className="skills-header">
          <div className="skills-meta">
            <span className="skills-idx">02</span>
            <span className="skills-rule" aria-hidden="true" />
            <span className="skills-label">Capabilities &amp; tools</span>
          </div>
          <h2 className="skills-head-title">Research, design, code, performance.</h2>
        </header>

        {/* A list, plotted — not a chart. The axis and markers are decoration over an
            ordinary <ol>, so the reading order and semantics survive with CSS off. */}
        <div className="skills-viewport">
        <div className="span">
          <svg className="journey-route" viewBox="0 0 3200 520" aria-hidden="true">
            <path className="journey-contour" d={TRAIL_PATH} />
            <path className="journey-route-base" d={TRAIL_PATH} />
            <path className="journey-path" d={TRAIL_PATH} />
            {TRAIL_STOPS.map((point, i) => <circle className="journey-waypoint" key={i} cx={point.x} cy={point.y} r="8" />)}
            <circle className="journey-light" r="5" cx={TRAIL_STOPS[0].x} cy={TRAIL_STOPS[0].y} />
          </svg>
          <span className="span-end span-end-a" aria-hidden="true">upstream</span>
          <ol className="span-list">
            {SPAN.map((s, i) => (
              <li
                className={'span-node' + (active === i ? ' is-active' : '')}
                key={s.label}
                style={{ '--i': i, '--stop-x': TRAIL_STOPS[i].x + 'px', '--stop-y': TRAIL_STOPS[i].y + 'px' }}
                tabIndex={0}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
              >
                <span className="span-marker" aria-hidden="true" />
                <div className="span-body">
                  <h3 className="span-label">{s.label}</h3>
                  <p className="span-line">{s.line}</p>
                  <div className="span-tools" aria-label={'Tools for ' + s.label}>
                    {s.tools.split(',').map((n) => {
                      const t = TOOL_BY_NAME[n.trim()];
                      return t ? (
                        <span key={t.name} className="span-tool">
                          <span className="span-tool-abbr" style={{ color: t.fg }}>{t.abbr}</span>
                          {t.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                {(() => {
                  const rel = (s.work || '').split(',').map((k) => bySlug[k.trim()]).filter(Boolean);
                  if (s.withAi) rel.push(WITH_AI_CARD);
                  if (!rel.length) return null;
                  const open = journeyEnabled ? scrolled === i : (active === i || window.matchMedia('(max-width: 900px)').matches);
                  return (
                    <div className="span-work" aria-hidden={!open}>
                      <span className="span-work-cap">Seen in</span>
                      {rel.map((p) => (
                        <a
                          className="span-work-card"
                          key={p.slug || p.id}
                          href={workHref(p)}
                          tabIndex={open ? 0 : -1}
                          onClick={() => { if (onOpen && p !== WITH_AI_CARD) onOpen(p); }}
                        >
                          <span className="span-work-shot">
                            <img src={p.cover} alt="" loading="lazy" style={p.coverPos ? { objectPosition: p.coverPos } : undefined} />
                          </span>
                          <span className="span-work-txt">
                            <span className="span-work-title">{p.title}</span>
                            <span className="span-work-desc">{p.subtitle || p.description}</span>
                          </span>
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </li>
            ))}
          </ol>
          <span className="span-end span-end-b" aria-hidden="true">on stage</span>
        </div>
        </div>
        <div className="skills-journey-footer">
          <span className="journey-instruction">Follow the trail</span>
          <nav className="skills-journey-nav" aria-label="Explore capabilities">
            {SPAN.map((stop, i) => (
              <button key={stop.label} type="button" onClick={() => goToStop(i)}
                aria-label={'Go to ' + stop.label} aria-current={scrolled === i ? 'step' : undefined}>
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </nav>
          <span className="journey-destination">Upstream to on stage</span>
        </div>
      </div>
    </section>
  );
}

/* The one hand-maintained string in this section. The AS OF stamp is not decoration:
   it lets a reader judge freshness for themselves, so a line that goes stale reads as
   dated rather than as a claim that is no longer true. Update both together. */
const CURRENTLY = {
  doing: 'User testing HabitaBull',
  detail: 'Gym habit PWA, live tester wave',
  asOf: 'Sep 2026',
};

/* Facts as an editorial index. CURRENTLY is rendered separately and first, because it is
   the only row that changes; the rest are stable. */
const ABOUT_FACTS = [
  { k: 'Based in', v: 'New York, NY', note: '40.7128\u00B0 N / 74.0060\u00B0 W \u00B7 EST' },
  { k: 'From', v: 'Vancouver, BC', note: '49.2827\u00B0 N / 123.1207\u00B0 W \u00B7 PST' },
  { k: 'Studying', v: "IMA @ NYU Tisch '29", minor: 'Business of Entertainment, Media and Technology (BEMT) minor', note: '370 Jay St, Brooklyn' },
  { k: 'Available', v: 'Summer 2027', note: 'wl3512@nyu.edu' },
  { k: 'CV', v: 'Read the full CV', href: 'cv.html', note: 'The long record; the one-page resume is in the menu' },
];

/* Stills from the Thursday residency at Maison Nur. Vertical phone captures, 520K to 1.1MB
   each, already in the site's blue-violet palette: the work argues for the aesthetic better
   than any adjective in the bio does. Posters are shown until the overlay opens. */
const ABOUT_LOOPS = [
  { src: 'assets/live-visuals-nyc/live-av-3.mp4', poster: 'assets/live-visuals-nyc/live-av-3-poster.jpg' },
  { src: 'assets/live-visuals-nyc/live-av-1.mp4', poster: 'assets/live-visuals-nyc/live-av-1-poster.jpg' },
  { src: 'assets/live-visuals-nyc/live-av-4.mp4', poster: 'assets/live-visuals-nyc/live-av-4-poster.jpg' },
  { src: 'assets/live-visuals-nyc/live-av-2.mp4', poster: 'assets/live-visuals-nyc/live-av-2-poster.jpg' },
];

function AboutSection() {
  return (
    <section className="scene scene-about" id="about" data-screen-label="04 About">
      <div className="container about-spread">
        <div className="about-top">
        <header className="about-head">
          <span className="scene-kicker">IV / About</span>
          {/* No emphasis markup on "code": the triplet puts it last, which is emphasis enough.
              An <em> with no visual treatment would only mislead a screen reader. */}
          <h2 className="scene-title about-title">I do the research,<br/>the design,<br/>and the code.</h2>
        </header>

        {/* Portrait + bio ride at the top right, opposite the headline: a face belongs with
            the first-person paragraph, and both belong before the ledger rather than after it. */}
        <div className="about-note">
          <figure className="about-portrait">
            <img src="assets/headshot.jpg" alt="Lucy Liu" width="1184" height="1480" loading="lazy" />
          </figure>
          <p className="about-para">
            Design engineer studying Interactive Media Arts at NYU. I run the research, design the screens, and write the code. HabitaBull came out of six interviews and three accessibility audits; Driftwood, a browser game about AI failure modes, was played by 100+ people at the IMA Spring Show. On Thursdays I hold a VJ residency at Maison Nur on the Bowery, designing audio-reactive visuals for Demon Nights.
          </p>
        </div>
        </div>

        {/* The ledger is the section's spine rather than its footer: the rules run the full
            width and the portrait interrupts them, so the facts carry the composition. */}
        <div className="about-body">
          <dl className="about-ledger">
            <div className="ledger-row ledger-row-live" style={{ '--i': 0 }}>
              <dt className="ledger-k">Currently</dt>
              <dd className="ledger-v"><span className="ledger-v-in">{CURRENTLY.doing}</span></dd>
              <dd className="ledger-live">
                <span className="ledger-live-dot" aria-hidden="true" />
                live
              </dd>
              <dd className="ledger-minor">{CURRENTLY.detail}</dd>
              <dd className="ledger-note">As of {CURRENTLY.asOf}</dd>
            </div>
            {ABOUT_FACTS.map((f, i) => (
              <div className="ledger-row" key={f.k} style={{ '--i': i + 1 }}>
                <dt className="ledger-k">{f.k}</dt>
                <dd className="ledger-v">
                  <span className="ledger-v-in">
                    {f.href
                      ? <a href={f.href} className="ledger-link" data-cursor="read">{f.v} <span aria-hidden="true">&rarr;</span></a>
                      : f.v}
                  </span>
                </dd>
                {f.minor && <dd className="ledger-minor">{f.minor}</dd>}
                {f.note && <dd className="ledger-note">{f.note}</dd>}
              </div>
            ))}
          </dl>

          {/* Breaks out of the ledger's third column and crosses the rules. Centred on the
              spine rather than pinned to a row, so it keeps working as rows change.
              The loops are silent, lazy, and carry no src until the overlay opens (see the
              aboutOpen effect in index.html): About is a menu view, so the home page should
              pay nothing for three videos nobody has asked to see yet. */}
          <div className="about-wall" role="group" aria-label="Live visuals from the Thursday residency at Maison Nur">
            {ABOUT_LOOPS.map((v) => (
              <figure className="about-tile" key={v.src}>
                <video
                  className="about-loop"
                  data-src={v.src}
                  poster={v.poster}
                  preload="none"
                  muted loop playsInline aria-hidden="true" tabIndex={-1}
                />
              </figure>
            ))}
          </div>
        </div>

        {/* Prose lands after six ruled facts, not before them, and sits under the value
            column so it reads as a note against the spine. */}
      </div>
    </section>
  );
}

window.SkillsSection = SkillsSection;
window.AboutSection = AboutSection;
