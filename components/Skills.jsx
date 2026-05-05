/* global React */

function SkillsSection() {
  const skills = [
    { title: 'Product Design', desc: 'UX/UI, user research, flows, high-fidelity prototypes. Psychology-first: I design for how people actually behave, not how we wish they would.', meta: 'Figma · FigJam', size: 'lg' },
    { title: 'Interaction', desc: 'Motion, micro-interactions, state transitions. The feel matters as much as the flow.', meta: 'craft', size: 'sm' },
    { title: 'Coding', desc: 'React, TypeScript, CSS. I ship what I design; Driftwood is the most recent.', meta: 'dev', size: 'md' },
    { title: 'Creative Coding', desc: 'p5.js, Processing, Arduino. Tools as medium, see H2Know.', meta: 'play', size: 'md' },
    { title: 'Research', desc: 'Interviews, usability testing, behavioral analysis.', meta: 'rigor', size: 'sm' },
    { title: 'Strategy', desc: 'From problem framing to design system. Sourced + VZA experience.', meta: 'framing', size: 'sm' },
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
          <span className="scene-kicker">— IV / About</span>
          <h2 className="scene-title" data-split-reveal>I design products <br/>through the lens of <em>psychology.</em></h2>
        </div>
        <div className="about-right">
          <div className="about-headshot-wrap">
            <img src="assets/headshot.jpg" alt="Lucy Liu" className="about-headshot" />
          </div>
          <p className="about-para">
            Design strategist studying Interactive Media Arts at NYU. Right now I'm designing a pediatric health literacy app with NYU's Department of Neural Science: Figma wireframes, informal user testing, and a lot of thinking about how kids actually read an interface.
          </p>

          <div className="about-facts">
            <div className="fact"><span className="fact-k">Based in</span><span className="fact-v">New York, NY</span></div>
            <div className="fact"><span className="fact-k">From</span><span className="fact-v">Vancouver, BC</span></div>
            <div className="fact"><span className="fact-k">Studying</span><span className="fact-v">IMA @ NYU Tisch '29</span></div>
            <div className="fact"><span className="fact-k">Available</span><span className="fact-v">Summer 2026</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.SkillsSection = SkillsSection;
window.AboutSection = AboutSection;
