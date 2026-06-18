/* global React */

function SkillsSection() {
  const gridRef = React.useRef(null);

  const skills = [
    { n: '01', title: 'Product Design', meta: 'Craft', span: 'feature',
      desc: 'UX/UI, user research, flows, and high-fidelity prototypes. Psychology-first: I design for how people actually behave, not how we wish they would.',
      tags: ['UX/UI', 'User Research', 'Prototyping', 'Design Systems'] },
    { n: '02', title: 'Interaction', meta: 'Motion', span: 'wide',
      desc: 'Motion, micro-interactions, and state transitions. The feel matters as much as the flow.' },
    { n: '03', title: 'Coding', meta: 'Dev', span: 'wide',
      desc: 'React, TypeScript, CSS. I ship what I design; Driftwood is the most recent.' },
    { n: '04', title: 'Creative Coding', meta: 'Play', span: 'third',
      desc: 'p5.js, Processing, Arduino. Tools as medium, see H2Know.' },
    { n: '05', title: 'Research', meta: 'Rigor', span: 'third',
      desc: 'Interviews, usability testing, and behavioral analysis.' },
    { n: '06', title: 'Strategy', meta: 'Framing', span: 'third',
      desc: 'From problem framing to design system. s0mped + VZA experience.' },
  ];

  // Cursor-following spotlight + border glow (MagicBento-style)
  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  };

  // Self-contained scroll reveal: cards stay visible if JS is off (js-reveal is only added when JS runs)
  React.useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.classList.add('js-reveal');
    const cards = grid.querySelectorAll('.skill-card');
    cards.forEach((c, i) => c.style.setProperty('--reveal-delay', (i * 70) + 'ms'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  return (
    <section className="scene scene-skills" id="skills" data-screen-label="03 Skills">
      <div className="container">
        <header className="skills-head">
          <span className="scene-kicker">— III / Capabilities</span>
          <h2 className="skills-title">What I bring to a <em>product team</em></h2>
        </header>
        <div className="skills-grid" ref={gridRef}>
          {skills.map((s) => (
            <article
              key={s.title}
              className={'skill-card skill-' + s.span}
              data-skill-card
              onMouseMove={onMove}
            >
              <div className="skill-top">
                <span className="skill-meta">{s.meta}</span>
                <span className="skill-num">{s.n}</span>
              </div>
              <div className="skill-body">
                <h3 className="skill-title">{s.title}</h3>
                <p className="skill-desc">{s.desc}</p>
              </div>
              {s.tags && (
                <ul className="skill-tags" aria-label="focus areas">
                  {s.tags.map((t) => <li key={t} className="skill-tag">{t}</li>)}
                </ul>
              )}
            </article>
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
          <div className="about-mark-wrap">
            <img src="assets/lucy-mark.jpg" alt="Lucy Liu mark" className="about-mark" />
          </div>
        </div>
        <div className="about-right">
          <div className="about-headshot-wrap">
            <img src="assets/headshot.jpg" alt="Lucy Liu" className="about-headshot" width="1600" height="2000" loading="lazy" />
          </div>
          <p className="about-para">
            Design strategist studying Interactive Media Arts at NYU. Right now I'm designing a pediatric health literacy app with NYU's Department of Neural Science: Figma wireframes, informal user testing, and a lot of thinking about how kids actually read an interface.
          </p>

          <div className="about-facts">
            <div className="fact"><span className="fact-k">Based in</span><span className="fact-v">New York, NY</span></div>
            <div className="fact"><span className="fact-k">From</span><span className="fact-v">Vancouver, BC</span></div>
            <div className="fact fact-wide"><span className="fact-k">Studying</span><span className="fact-v">Interactive Media Arts @ NYU Tisch '29</span><span className="fact-minor">Business of Entertainment, Media and Technology (BEMT) minor</span></div>
            <div className="fact"><span className="fact-k">Available</span><span className="fact-v">Summer 2026</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.SkillsSection = SkillsSection;
window.AboutSection = AboutSection;
