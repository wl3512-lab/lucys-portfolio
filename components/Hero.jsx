/* global React */

const TOOLS = [
  {
    name: 'Figma', abbr: 'Fg', bg: '#1E1E1E', fg: '#F24E1E', fg2: '#A259FF',
    desc: 'End-to-end product design: user flows, component libraries, auto-layout, and interactive prototypes. Used on HabitaBull, H2Know, and SoundCloud Critique for research synthesis, wireframing, and spec handoff.',
  },
  {
    name: 'Illustrator', abbr: 'Ai', bg: '#300F07', fg: '#FF9A00', fg2: null,
    desc: 'Vector illustration and asset production. Used in H2Know for app layout and UI illustration, and in Eternal Wreckening for custom game assets and visual identity work.',
  },
  {
    name: 'Premiere Pro', abbr: 'Pr', bg: '#0D0223', fg: '#9999FF', fg2: null,
    desc: 'Video editing and post-production.',
  },
  {
    name: 'After Effects', abbr: 'Ae', bg: '#00005B', fg: '#9999FF', fg2: null,
    desc: 'Motion graphics and compositing.',
  },
  {
    name: 'p5.js', abbr: 'p5*', bg: '#ED225D', fg: '#FFFFFF', fg2: null,
    desc: 'Creative coding for interactive, web-based work. Used in Driftwood for facial-emotion detection and AI-driven interaction, and in Under the Weather to build a real-time weather-to-mood app.',
  },
  {
    name: 'Touch Designer', abbr: '◎', bg: '#2E2E1F', fg: '#D4C400', fg2: null,
    desc: 'Real-time visual generation. Primary tool for Audio Reactive (four sound-responsive visual systems) and the Demon Nights VJ residency at Studio Maison Nur (217 Bowery, NYC): node-based pipelines that respond to audio and MIDI in real time.',
  },
  {
    name: 'Arduino', abbr: '∞', bg: '#008184', fg: '#FFFFFF', fg2: null,
    desc: 'Physical computing and sensor integration. Used in H2Know: an Arduino Nano reads a capacitive soil moisture sensor to detect dry soil and triggers an LED, bridging hardware with the companion app.',
  },
  {
    name: 'Claude Code', abbr: '✶', bg: '#1A1316', fg: '#CC785C', fg2: null,
    desc: 'AI-assisted development. Built this portfolio from the ground up: component architecture, CSS systems, animation logic, and design decisions made through collaborative iteration.',
  },
];

function Hero() {
  const [activePopup, setActivePopup] = React.useState(null);

  React.useEffect(() => {
    if (activePopup === null) return;
    const onKey = function(e) { if (e.key === 'Escape') setActivePopup(null); };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [activePopup]);

  var tool = activePopup !== null ? TOOLS[activePopup] : null;

  return (
    <section className="scene scene-hero" data-scene="hero" data-screen-label="01 Hero">
      <div className="hero-bg-layer"><div className="hero-grain"/><div className="hero-grid-lines"/></div>
      {typeof FaultyTerminal !== 'undefined' && (
        <FaultyTerminal
          tint="#72ADFF"
          brightness={0.9}
          scale={1.5}
          digitSize={1.4}
          scanlineIntensity={0.4}
          glitchAmount={1}
          flickerAmount={0.5}
          curvature={0.1}
          mouseStrength={0.1}
        />
      )}
      <canvas id="hero-canvas" className="hero-canvas" aria-hidden="true" />
      <div className="hero-orb" />
      <div className="hero-orb-2" />

      {/* Editorial corner stamps */}
      <div className="hero-stamp hero-stamp-tl">
        <span>I / Introduction</span>
      </div>
      <div className="hero-stamp hero-stamp-tr">
        <span>NYC / Vancouver</span>
      </div>
      <div className="hero-stamp hero-stamp-bl">
        <span>©2026</span>
        <span className="hero-stamp-sep">·</span>
        <span>Lucy Liu</span>
      </div>
      <div className="hero-stamp hero-stamp-br">
        <span className="hero-stamp-dot">●</span>
        <span>Available: Summer 2026</span>
      </div>

      <div className="container hero-content">
        <div className="hero-text">
          <div className="hero-eyebrow">
            {"HELLO, I'M LUCY · IMA '29".split('').map((c, i) => (
              <span key={i} className={c===' '?'eyebrow-sep':'eyebrow-char'}>{c===' '?' ':c}</span>
            ))}
          </div>
          <h1 className="hero-heading">
            <span className="word-mask"><span className="word">For people who actually</span></span>
            <span className="word-mask"><span className="word" data-ascii="interface">read the interface.</span></span>
          </h1>
        </div>

        <div className="hero-right">
          <p className="hero-sub">
            IMA student at NYU Tisch. I care most about <em>accessibility</em>, the kind that gets tested with real users, not just checked against WCAG.
          </p>
          <div className="hero-toolkit">
            <p className="hero-toolkit-label">Toolkit <span className="hero-toolkit-hint">click any</span></p>
            <div className="toolkit-strip-wrap" id="toolkit-strip-wrap">
              <div className="toolkit-strip-track" id="toolkit-strip-track" role="list" aria-label="Toolkit">
                {[...TOOLS, ...TOOLS, ...TOOLS].map((t, i) => (
                  <div
                    key={i}
                    className="toolkit-chip"
                    role="button"
                    tabIndex={i < TOOLS.length ? 0 : -1}
                    aria-label={t.name + ': click for details'}
                    onClick={function() { setActivePopup(i % TOOLS.length); }}
                    onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePopup(i % TOOLS.length); } }}
                  >
                    <span className="chip-abbr" style={{ color: t.fg }}>{t.abbr}</span>
                    <span className="chip-sep" aria-hidden="true">·</span>
                    <span className="chip-name">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="hero-actions">
            <a href="#work" className="btn btn-secondary">View standout work <span className="btn-arrow" aria-hidden="true">↓</span></a>
            <a href="#contact" className="btn btn-ghost">Get in touch <span className="btn-arrow" aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>

      {tool && (
        <div className="toolkit-popup-overlay" onClick={function() { setActivePopup(null); }} role="dialog" aria-modal="true" aria-label={tool.name}>
          <div className="toolkit-popup" onClick={function(e) { e.stopPropagation(); }}>
            <button className="toolkit-popup-close" onClick={function() { setActivePopup(null); }} aria-label="Close">✕</button>
            <div className="toolkit-popup-abbr" style={{ color: tool.fg }}>{tool.abbr}</div>
            <div className="toolkit-popup-name">{tool.name}</div>
            <p className="toolkit-popup-desc">{tool.desc}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Marquee() {
  var items = [
    'Selected work: 2023 / 2026',
    'Design for how people actually behave',
    'Ships design + code, no handoffs',
    'Weekly VJ: Demon Nights @ 217 Bowery',
    'NYU IMA · BEMT · Available Summer 2026',
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
