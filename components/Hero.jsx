/* global React */

/* "Engineer" is the fixed anchor word (4th big row), so the rotating slot cycles the
   facets in front of it: design engineer first, then ai, which arrives within ~3s and holds
   twice as long because it carries the With AI link. */
const HERO_ROLES = ['design', 'ai', 'creative', 'ux', 'interaction'];
const HERO_AI_IDX = HERO_ROLES.indexOf('ai');

function Hero() {
  const [roleIdx, setRoleIdx] = React.useState(0);
  const heroRef = React.useRef(null);
  // Released once the hero is far behind, so its shader context is not held all page long.
  const heroNear = typeof useInView === 'function' ? useInView(heroRef, '40% 0px') : true;

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
    <section ref={heroRef} className="scene scene-hero" data-scene="hero" data-screen-label="01 Hero">
      <div className="hero-bg-layer"><div className="hero-grain"/></div>
      {/* The core caps mobile rendering and pauses this backdrop outside the hero. */}
      {heroNear && typeof FaultyTerminal !== 'undefined' && window.__webglOK !== false && (
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
        <h1 className="hero-heading hero-name" aria-label="Lucy Liu, design engineer">
          <span className="hero-row hero-row--lead">
            <span className="word-mask hero-name-row"><span className="word">Lucy</span></span>
          </span>

          <span className="hero-row hero-row--surname">
            <span className="hero-name-aside" aria-hidden="true">
              <span className="hero-discipline">Design&nbsp;Strategy</span><span className="dot"> · </span>
              <span className="hero-discipline">Product&nbsp;&amp;&nbsp;UX</span><span className="dot"> · </span>
              <span className="hero-discipline">Creative&nbsp;Code</span><span className="dot"> · </span>
              <span className="hero-discipline">Live&nbsp;Visuals</span>
            </span>
            <span className="word-mask hero-name-row"><span className="word">Liu</span></span>
          </span>

          <span className="hero-row hero-row--role">
            <span className="hero-name-row--role" aria-hidden="true">
              <span className="hero-name-caret" />
              {typeof MorphingText !== 'undefined'
                ? <MorphingText gooey className="hero-name-morph" texts={HERO_ROLES} hold={{ ai: 2 }} onIndexChange={setRoleIdx} />
                : <span className="hero-name-morph">design</span>}
            </span>
            {/* Only on the ai beat. Reduced motion parks the morph on "design", so the link
                never shows there; the menu and the home section carry it instead. */}
            <a
              className={'hero-ai-link' + (roleIdx === HERO_AI_IDX ? ' is-on' : '')}
              href="with-ai.html"
              tabIndex={roleIdx === HERO_AI_IDX ? 0 : -1}
              aria-hidden={roleIdx === HERO_AI_IDX ? undefined : true}
            >see how I build with it <span aria-hidden="true">→</span></a>
          </span>

          <span className="hero-row hero-row--title">
            <span className="hero-name-aside hero-name-aside--loc" aria-hidden="true">
              <span className="hero-location">New&nbsp;York <span className="dot">/</span> Vancouver</span>
              <span className="dot hero-location-sep"> · </span>
              <span className="hero-availability">Available&nbsp;Summer&nbsp;2027</span>
            </span>
            <span className="word-mask hero-name-row"><span className="word">Engineer</span></span>
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
        <div className="hero-mobile-meta">
          <span>New York <span className="dot">/</span> Vancouver</span>
          <span>Available<br />Summer 2027</span>
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
