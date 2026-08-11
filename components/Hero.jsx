/* global React */

/* "designer" is the fixed anchor word (4th big row), so the rotating slot cycles the
   other facets — avoids a "designer / Designer" stutter between the two. */
const HERO_ROLES = ['researcher', 'creative coder', 'ai engineer', 'vj', 'strategist'];

function Hero() {
  const [roleIdx, setRoleIdx] = React.useState(0);

  // Cursor spotlight for the FaultyTerminal backdrop: track the pointer (relative to the
  // hero) into --mx/--my so the CSS radial mask reveals digits only around the cursor.
  React.useEffect(() => {
    const section = document.querySelector('.scene-hero');
    if (!section) return;
    if (window.matchMedia && !window.matchMedia('(pointer: fine)').matches) return;
    let raf = null, px = 0, py = 0;
    const apply = function() {
      raf = null;
      section.style.setProperty('--mx', px + 'px');
      section.style.setProperty('--my', py + 'px');
    };
    const onMove = function(e) {
      const rect = section.getBoundingClientRect();
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return function() {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="scene scene-hero" data-scene="hero" data-screen-label="01 Hero">
      <div className="hero-bg-layer"><div className="hero-grain"/></div>
      {typeof FaultyTerminal !== 'undefined' && window.__webglOK !== false && (
        <FaultyTerminal
          tint="#72ADFF"
          brightness={1.05}
          scale={1.7}
          digitSize={1.4}
          timeScale={0.62}
          scanlineIntensity={0.45}
          glitchAmount={1.5}
          flickerAmount={0.9}
          noiseAmp={1.1}
          curvature={0.42}
          mouseStrength={0.12}
        />
      )}
      <canvas id="hero-canvas" className="hero-canvas" aria-hidden="true" />
      <div className="hero-orb" />
      <div className="hero-orb-2" />

      <div className="container hero-content">
        {/* Editorial masthead (Nicki Vuong feel): four full-width rows, each a big word
            on one side and a small text block on the other, alternating left/right and
            separated by horizontal rules. The 3rd big word is the live, morphing role
            field (gooey/liquid, signal-blue). The small blocks read as one intentional
            spec sheet, not floating stamps. */}
        <h1 className="hero-heading hero-name" aria-label="Lucy Liu — designer, researcher, creative coder, ai engineer, vj, strategist">
          <span className="hero-row hero-row--lead">
            <span className="word-mask hero-name-row"><span className="word">Lucy</span></span>
          </span>

          <span className="hero-row">
            <span className="hero-name-aside" aria-hidden="true">
              Design&nbsp;Strategy <span className="dot">·</span> Product&nbsp;&amp;&nbsp;UX <span className="dot">·</span> Creative&nbsp;Code <span className="dot">·</span> Live&nbsp;Visuals
            </span>
            <span className="word-mask hero-name-row"><span className="word">Liu</span></span>
          </span>

          <span className="hero-row">
            <span className="hero-name-row--role" aria-hidden="true">
              <span className="hero-name-caret" />
              {typeof MorphingText !== 'undefined'
                ? <MorphingText gooey className="hero-name-morph" texts={HERO_ROLES} onIndexChange={setRoleIdx} />
                : <span className="hero-name-morph">researcher</span>}
            </span>
          </span>

          <span className="hero-row">
            <span className="hero-name-aside hero-name-aside--loc" aria-hidden="true">
              New&nbsp;York <span className="dot">/</span> Vancouver <span className="dot">·</span> Available&nbsp;Summer&nbsp;2026
            </span>
            <span className="word-mask hero-name-row"><span className="word">Designer</span></span>
          </span>
        </h1>
        {/* Positioning statement, top-right of the masthead (opposite the "Lucy" wordmark).
            A real <p> outside the h1 so screen readers get it (the h1 carries its own aria-label). */}
        <div className="hero-lede">
          <span className="hero-lede-eyebrow" aria-hidden="true">Practice</span>
          <p className="hero-lede-body">
            I research, design, and ship: <b>products, interactions, and the live visuals</b> in between. Strategy upstream, accessibility throughout.
          </p>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  var items = [
    'Selected work: 2023 / 2026',
    'Design for how people actually behave',
    'Ships design + code, no handoffs',
    'Weekly VJ: Demon Nights @ Maison Nur, thursdays 11pm',
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
