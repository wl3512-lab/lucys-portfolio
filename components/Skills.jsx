/* global React */

function SkillsSection() {
  const skills = [
    { title: 'Product Design', desc: 'UX/UI, user research, flows, high-fidelity prototypes. Psychology-first: I design for how people actually behave, not how we wish they would.', meta: 'Figma · FigJam', size: 'lg' },
    { title: 'Interaction', desc: 'Motion, micro-interactions, state transitions. The feel matters as much as the flow.', meta: 'craft', size: 'sm' },
    { title: 'Live VJ', desc: 'TouchDesigner. Generative systems performed live, audio-reactive visuals from the booth. Weekly residency at Studio Maison Nur, 217 Bowery, NYC.', meta: 'live av', size: 'sm' },
    { title: 'Coding', desc: 'React, p5.js, CSS systems. I ship what I design, no handoffs needed. Driftwood is the most recent.', meta: 'dev', size: 'md' },
    { title: 'Creative Coding', desc: 'p5.js, Processing, Arduino. Tools as medium, not just output. See H2Know and Under the Weather.', meta: 'play', size: 'md' },
    { title: 'Research', desc: 'User interviews, usability testing, behavioral heuristics. I surface the patterns people can\'t articulate.', meta: 'rigor', size: 'sm' },
    { title: 'Strategy', desc: 'From problem framing to system design. I work upstream of the interface.', meta: 'framing', size: 'sm' },
  ];

  return (
    <section className="scene scene-skills" id="skills" data-screen-label="03 Skills">
      <div className="container">
        <div className="skills-grid">
          {skills.map((s) => (
            <div key={s.title} className={'skill-card skill-' + s.size} data-skill-card>
              <div className="skill-top">
                <span className="skill-meta">{s.meta}</span>
                <span className="skill-dot" />
              </div>
              <h3 className="skill-title">{s.title}</h3>
              <p className="skill-desc">{s.desc}</p>
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
          <div className="about-headshot-wrap">
            <img src="assets/headshot.jpg" alt="Lucy Liu" className="about-headshot" width="1184" height="1480" loading="lazy" />
          </div>
          <p className="about-para">
            Design strategist studying Interactive Media Arts at NYU. I hold a weekly VJ residency at Studio Maison Nur (217 Bowery), a private, invite-only club, where I design fresh audio-reactive visuals every Thursday for Demon Nights with DJ Diablo.
          </p>

          <div className="about-facts">
            <div className="fact"><span className="fact-k">Based in</span><span className="fact-v">New York, NY</span></div>
            <div className="fact"><span className="fact-k">From</span><span className="fact-v">Vancouver, BC</span></div>
            <div className="fact"><span className="fact-k">Studying</span><span className="fact-v">IMA @ NYU Tisch '29</span><span className="fact-minor">Business of Entertainment, Media and Technology (BEMT) minor</span></div>
            <div className="fact"><span className="fact-k">Available</span><span className="fact-v">Summer 2026</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.SkillsSection = SkillsSection;
window.AboutSection = AboutSection;
