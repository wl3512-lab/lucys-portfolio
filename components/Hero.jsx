/* global React */
/* global React */

const TOOLS = [
  { name: 'Figma',          abbr: 'Fg',  bg: '#1E1E1E', fg: '#F24E1E',  fg2: '#A259FF' },
  { name: 'Illustrator',    abbr: 'Ai',  bg: '#300F07', fg: '#FF9A00',  fg2: null },
  { name: 'Premiere Pro',   abbr: 'Pr',  bg: '#0D0223', fg: '#9999FF',  fg2: null },
  { name: 'After Effects',  abbr: 'Ae',  bg: '#00005B', fg: '#9999FF',  fg2: null },
  { name: 'p5.js',          abbr: 'p5*', bg: '#ED225D', fg: '#FFFFFF',  fg2: null },
  { name: 'Touch Designer', abbr: '◎',   bg: '#2E2E1F', fg: '#D4C400',  fg2: null },
  { name: 'Arduino',        abbr: '∞',   bg: '#008184', fg: '#FFFFFF',  fg2: null },
  { name: 'Claude Code',    abbr: '✦',   bg: '#1A1316', fg: '#CC785C',  fg2: null },
];

function Hero() {
  return (
    <section className="scene scene-hero" data-scene="hero" data-screen-label="01 Hero">
      <div className="hero-bg-layer"><div className="hero-grain"/><div className="hero-grid-lines"/></div>
      <canvas id="hero-canvas" className="hero-canvas" aria-hidden="true" />
      <div className="hero-orb" />
      <div className="hero-orb-2" />

      {/* Editorial corner stamps */}
      <div className="hero-stamp hero-stamp-tl">
        <span>— I / Introduction</span>
      </div>
      <div className="hero-stamp hero-stamp-tr">
        <span>NYC / Vancouver</span>
        <span className="hero-stamp-sep">·</span>
        <span>Volume 01</span>
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
            {'HELLO, I\u2019M LUCY \u2014 IMA \u2019 27'.split('').map((c, i) => (
              <span key={i} className={c===' '?'eyebrow-sep':'eyebrow-char'}>{c==' '?'\u00A0':c}</span>
            ))}
          </div>
          <h1 className="hero-heading">
            <span className="word-mask"><span className="word">For people</span></span>
            <span className="word-mask"><span className="word">who actually</span></span>
            <span className="word-mask"><span className="word italic">read the interface.</span></span>
          </h1>
        </div>

        <div className="hero-right">
          <p className="hero-sub">
            IMA student at NYU Tisch. I care most about <em>accessibility</em>, the kind that gets tested with real users, not just checked against WCAG.
          </p>
          <div className="hero-toolkit">
            <p className="hero-toolkit-label">Toolkit</p>
            <div className="hero-toolkit-icons" role="list" aria-label="Toolkit">
              {TOOLS.map(t => (
                <div key={t.name} className="tool-item" role="listitem" tabIndex={0} aria-label={t.name}>
                  <div className="tool-card">
                    <div
                      className="tool-face tool-face-front"
                      style={{ border: `1px solid ${t.fg}30`, color: t.fg }}
                    >
                      <span className="tool-abbr">{t.abbr}</span>
                    </div>
                    <div
                      className="tool-face tool-face-back"
                      style={{ background: t.bg, color: t.fg2 || t.fg }}
                    >
                      <span className="tool-abbr" style={{ fontSize: '11px' }}>{t.abbr}</span>
                      <span className="tool-name-back">{t.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-actions">
            <a href="#work" className="btn btn-secondary">View work ↓</a>
            <a href="#contact" className="btn btn-ghost">Get in touch →</a>
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
              <span className="hero-meta-v">Summer '26</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-scroll-hint"><span>scroll</span></div>
    </section>
  );
}

function Marquee() {
  const items = [
    'Selected work \u2014 2023 / 2026',
    'Psychology-driven product design',
    'Ships design + code',
    'Currently: Driftwood',
    'Available: Summer 2026',
  ];
  const all = [...items, ...items, ...items];
  return (
    <div className="scene-marquee" aria-hidden="true">
      <div className="marquee-track">
        {all.map((t, i) => <React.Fragment key={i}><span>{t}</span><span className="marquee-dot">✦</span></React.Fragment>)}
      </div>
    </div>
  );
}

window.Hero = Hero;
window.Marquee = Marquee;
