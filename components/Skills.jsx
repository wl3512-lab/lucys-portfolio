/* global React */

// Tools live directly inside each capability card (no separate strip) so the
// relationship between a capability and the tools it uses is always visible.
// Colors are each tool's brand hue, tuned to read on the void (no pure #fff).
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

function SkillsSection() {
  const sectionRef = React.useRef(null);
  // Latches true when the section nears the viewport; falls back to eager mount
  // if the hook failed to load. Gate is stable across renders (rules-of-hooks safe).
  const nearView = typeof useInView === 'function' ? useInView(sectionRef) : true;
  const showDither = typeof Dither !== 'undefined' && window.__webglOK !== false && window.innerWidth >= 760 && nearView;
  // `tools` names must match TOOLS[].name exactly — they render the tool chips on each card.
  const skills = [
    { title: 'Product Design', desc: 'UX/UI, user research, flows, high-fidelity prototypes. Psychology-first: I design for how people actually behave, not how we wish they would.', meta: 'Figma · FigJam', size: 'lg', tools: 'Figma,Illustrator' },
    { title: 'Interaction', desc: 'Motion, micro-interactions, state transitions. The feel matters as much as the flow.', meta: 'craft', size: 'sm', tools: 'Figma,After Effects' },
    { title: 'Live VJ', desc: 'TouchDesigner. Generative systems performed live, audio-reactive visuals from the booth. Weekly Thursday residency at Maison Nur, 217 Bowery, NYC.', meta: 'live av', size: 'sm', tools: 'Touch Designer,Premiere Pro' },
    { title: 'Coding', desc: 'React, p5.js, CSS systems. I ship what I design, no handoffs needed. Driftwood is the most recent.', meta: 'dev', size: 'md', tools: 'p5.js,Claude Code' },
    { title: 'Creative Coding', desc: 'p5.js, Processing, Arduino. Tools as medium, not just output. See H2Know and Under the Weather.', meta: 'play', size: 'md', tools: 'p5.js,Arduino' },
    { title: 'Research', desc: 'User interviews, usability testing, behavioral heuristics. I surface the patterns people can\'t articulate.', meta: 'rigor', size: 'sm', tools: 'Figma' },
    { title: 'Strategy', desc: 'From problem framing to system design. I work upstream of the interface.', meta: 'framing', size: 'sm', tools: 'Figma' },
  ];

  return (
    <section ref={sectionRef} className="scene scene-skills" id="skills" data-screen-label="02 Capabilities">
      {showDither && (
        <Dither className="skills-dither" waveColor={[0.149, 0.545, 1.0]} colorNum={4} pixelSize={3}
          waveAmplitude={0.3} waveFrequency={3} waveSpeed={0.04} mouseRadius={0.6} />
      )}
      <div className="container">
        <header className="skills-header">
          <div className="skills-meta">
            <span className="skills-idx">02</span>
            <span className="skills-rule" aria-hidden="true" />
            <span className="skills-label">Capabilities &amp; tools</span>
          </div>
          <h2 className="skills-head-title">What I do.</h2>
        </header>
        <div className="skills-grid">
          {skills.map((s) => (
            <div key={s.title} className={'skill-card skill-' + s.size} data-skill-card>
              <div className="skill-top">
                <span className="skill-meta">{s.meta}</span>
                <span className="skill-dot" />
              </div>
              <h3 className="skill-title">{s.title}</h3>
              <p className="skill-desc">{s.desc}</p>
              <div className="skill-tools" aria-label="Tools">
                {s.tools.split(',').map((n) => {
                  const t = TOOL_BY_NAME[n.trim()];
                  return t ? (
                    <span key={t.name} className="skill-tool">
                      <span className="skill-tool-abbr" style={{ color: t.fg }}>{t.abbr}</span>
                      {t.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="scene scene-about" id="about" data-screen-label="04 About">
      <div className="container about-grid">
        <div className="about-left">
          <span className="scene-kicker">IV / About</span>
          <h2 className="scene-title" data-split-reveal>I design products <br/>through the lens of <em>psychology.</em></h2>
          <div className="about-mark-wrap">
            <img src="assets/lucy-mark.jpg" alt="Lucy Liu mark" className="about-mark" loading="lazy" />
          </div>
        </div>
        <div className="about-right">
          {/* Portrait + bio share a row; the portrait is an editorial plate, not an avatar. */}
          <div className="about-intro">
            <div className="about-headshot-wrap">
              <img src="assets/headshot.jpg" alt="Lucy Liu" className="about-headshot" width="1184" height="1480" loading="lazy" />
            </div>
            <p className="about-para">
              Design strategist studying Interactive Media Arts at NYU. I hold a weekly VJ residency at Maison Nur (217 Bowery), the downtown room created by Nur Khan, where I design fresh audio-reactive visuals every Thursday for Demon Nights, the underground party DJ and diamond-certified producer Diablo brought over from LA.
            </p>
          </div>

          {/* The Ledger: facts as an editorial index, not cards. Each rule draws in and its
              value rises from behind it when the overlay opens (see .about-overlay.is-open). */}
          <dl className="about-ledger">
            {[
              { k: 'Based in', v: 'New York, NY', note: '40.7128° N / 74.0060° W · EST' },
              { k: 'From', v: 'Vancouver, BC', note: '49.2827° N / 123.1207° W · PST' },
              { k: 'Studying', v: "IMA @ NYU Tisch '29", minor: 'Business of Entertainment, Media and Technology (BEMT) minor', note: '370 Jay St, Brooklyn' },
              { k: 'Available', v: 'Summer 2026', note: 'wl3512@nyu.edu' },
            ].map((f, i) => (
              <div className="ledger-row" key={f.k} style={{ '--i': i }}>
                <dt className="ledger-k">{f.k}</dt>
                <dd className="ledger-v"><span className="ledger-v-in">{f.v}</span></dd>
                {f.minor && <dd className="ledger-minor">{f.minor}</dd>}
                {f.note && <dd className="ledger-note">{f.note}</dd>}
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

window.SkillsSection = SkillsSection;
window.AboutSection = AboutSection;
