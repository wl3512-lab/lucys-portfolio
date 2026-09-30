/* global React */
// ============================================================
// s0mped: the gem chapter
// A pinned scroll chapter built around one rendered brilliant (GemSequence). Scroll tumbles
// the stone from profile to face-up while four beats step in around it: what s0mped is,
// the five cuts, the hand-set work, and the story card. A fan of thin refracted rays
// leaves the stone and points at the active beat (no landing spot: a pool of light on a dark
// page read as a UI spotlight, not refraction). Moving the pointer aims it, the stone's own
// fire turns to the same side, and the stone tilts toward it in 3D. At the end the stone flies up into the nav and becomes the navette
// dot on the i of "liu", which is the one place the side project and the name meet.
//
// Two chapter layouts, both pinned: "wide" (>= 900 x 640) puts the stone in the middle with
// beats left and right; "compact" (phones, >= 560px tall) puts the stone in the upper part
// and each beat in a panel underneath, and loads three of the five light columns. Reduced
// motion and very short screens get the same markup as a plain stacked section with a still
// of the stone. Nothing is hidden at rest: beats are only faded once a timeline is running.
// Exposed as window.GemStory.
// ============================================================
const GEM_CHAPTER_LENGTH = 3.2;   // viewport heights of scroll the pin lasts
// Progress windows for each beat [in, out]. The last beat stays.
const GEM_BEATS = [[0, 0.24], [0.24, 0.5], [0.5, 0.74], [0.74, 1.01]];
const GEM_FACE_UP = 0.84;         // progress at which the tumble lands face-up
const GEM_FLY = [0.86, 1];        // progress window of the fly into the nav

const GEM_CUTS = [
  { src: 'assets/gems/cuts/round.webp',   name: 'Round' },
  { src: 'assets/gems/cuts/navette.webp', name: 'Navette' },
  { src: 'assets/gems/cuts/star.webp',    name: 'Star' },
  { src: 'assets/gems/cuts/diamond.webp', name: 'Diamond' },
  { src: 'assets/gems/cuts/moon.webp',    name: 'Moon' },
];
const GEM_SETS = [
  { src: 'assets/gems/sets/nails.webp',    alt: 'Rows of clear crystals set on the canines, matched to crystal nails' },
  { src: 'assets/gems/sets/smile.webp',    alt: 'A butterfly of crystals on an upper tooth, side view' },
  { src: 'assets/gems/sets/portrait.webp', alt: 'A smile with scattered crystals and a star across the upper teeth' },
];

function GemStory() {
  const sectionRef = React.useRef(null);
  const driveRef = React.useRef({ orbit: 0, light: 0.5, moved: 0 });
  const [chapter, setChapter] = React.useState(null);     // null | 'wide' | 'compact'
  const nearView = typeof useInView === 'function' ? useInView(sectionRef, '100% 0px') : true;   // a viewport early: the frames need fetching
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  // Canvas wherever a chapter runs, or on a wide fine-pointer screen that scrubs it plainly.
  const showGem = typeof GemSequence !== 'undefined' && nearView &&
    (chapter !== null || (window.innerWidth > 760 && finePointer));
  const place = chapter === 'compact' ? { x: 0.5, y: 0.31, scale: 0.94 } : { x: 0.47, y: 0.5, scale: 0.62, maxW: 0.36 };
  const lights = chapter === 'compact' ? [1, 2, 3] : [0, 1, 2, 3, 4];

  React.useEffect(() => {
    const root = sectionRef.current;
    if (!root || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    // Phones show and hide the address bar mid-scroll; without this every toggle refreshes
    // every trigger and a pinned section visibly jumps.
    ScrollTrigger.config({ ignoreMobileResize: true });
    const drive = driveRef.current;
    const beats = Array.from(root.querySelectorAll('.gem-beat'));
    const mm = gsap.matchMedia();

    // Pointer: the light follows the hand across the section. In chapter mode the spotlight
    // loop reads px/py; outside it, light is simply the pointer's x.
    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      if (!r.width) return;
      drive.light = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      drive.px = e.clientX - r.left;
      drive.py = e.clientY - r.top;
      drive.moved = performance.now();
    };
    root.addEventListener('pointermove', onMove);

    mm.add({
      wideOK: '(min-width: 900px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)',
      compactOK: '(max-width: 899px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)',
      wide: '(min-width: 761px)',
      reduce: '(prefers-reduced-motion: reduce)',
    }, (ctx) => {
      const { wideOK, compactOK, wide, reduce } = ctx.conditions;
      if (reduce) { drive.orbit = 0.7; return; }
      const mode = wideOK ? 'wide' : compactOK ? 'compact' : null;
      if (!mode) {
        // Wide enough for the canvas but not the chapter: tumble with plain scroll.
        if (!wide) return;
        const plain = ScrollTrigger.create({
          trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.6,
          onUpdate: (self) => { drive.orbit = self.progress; },
        });
        return () => plain.kill();
      }
      setChapter(mode);
      root.dataset.chapter = mode;
      const host = () => root.querySelector('.gem-sequence');
      let caught = false;
      let activeBeat = 0;
      const clamp = (v) => Math.max(0, Math.min(1, v));
      const ease = (t) => 1 - Math.pow(1 - t, 3);

      const render = (p) => {
        drive.orbit = clamp(p / GEM_FACE_UP);
        beats.forEach((b, i) => {
          const [a, z] = GEM_BEATS[i];
          const fin = i === 0 ? 1 : clamp((p - a) / 0.05);
          const fout = z > 1 ? 1 : clamp((z - p) / 0.05);
          const v = Math.min(fin, fout);
          b.style.opacity = String(v);
          b.style.setProperty('--beat-lift', ((1 - v) * 26).toFixed(1) + 'px');
          b.inert = v < 0.5;
          if (v > 0.5) activeBeat = i;
        });
        // The fly: the drawn stone travels to the nav navette and shrinks to its size.
        const h = host();
        const f = clamp((p - GEM_FLY[0]) / (GEM_FLY[1] - GEM_FLY[0]));
        const lightLayer = root.querySelector('.gem-light');
        if (lightLayer) lightLayer.style.opacity = f > 0 ? String(1 - f) : '';
        if (h) {
          if (f <= 0) { h.style.transform = ''; h.style.opacity = ''; }
          else {
            const target = document.querySelector('.flow-menu-logo .wm-gem');
            // Measure the section, never the host: the host carries this very transform, so
            // its own rect would feed each frame's movement back into the next.
            const hr = root.getBoundingClientRect();
            const cx = hr.left + (drive.cx || hr.width / 2), cy = hr.top + (drive.cy || hr.height / 2);
            let tx = 40, ty = 30, ts = 6;
            if (target) { const t = target.getBoundingClientRect(); tx = t.left + t.width / 2; ty = t.top + t.height / 2; ts = t.height; }
            const k = ease(f);
            // Geometric, not linear: a linear scale was still ~15% size (a 40px blob over the
            // logo) when the position had nearly arrived. Equal ratios per step shrink it in
            // step with the travel, so it lands at the navette's size.
            const s = Math.pow(Math.max(0.001, ts / Math.max(1, (drive.w || 600) * 0.75)), k);
            h.style.transformOrigin = (drive.cx || hr.width / 2) + 'px ' + (drive.cy || hr.height / 2) + 'px';
            h.style.transform = 'translate(' + ((tx - cx) * k).toFixed(1) + 'px,' + ((ty - cy) * k).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
            h.style.opacity = String(f > 0.85 ? clamp((1 - f) / 0.15) : 1);
          }
        }
        // The catch: the nav navette answers when the stone arrives.
        if (f > 0.96 && !caught) {
          caught = true;
          const logo = document.querySelector('.flow-menu-logo');
          if (logo) { logo.classList.add('wm-catch'); setTimeout(() => logo.classList.remove('wm-catch'), 900); }
        } else if (f < 0.9) caught = false;
      };

      // The rays: a fan from the stone toward the active beat, or toward the pointer while it
      // moves. The fan's length is the distance, and the rays fade out as they arrive. Transforms only, so nothing repaints; the
      // loop runs only while the stage is pinned.
      const spot = { x: 0, y: 0, init: false };
      let lightRaf = 0;
      const lightLoop = () => {
        lightRaf = requestAnimationFrame(lightLoop);
        const beam = root.querySelector('.gem-beam');
        const cv = root.querySelector('.gem-seq-canvas');
        if (!beam || drive.cx == null) return;
        const rr = root.getBoundingClientRect();
        const now = performance.now();
        let tx, ty;
        if (drive.px != null && now - (drive.moved || 0) < 2500) { tx = drive.px; ty = drive.py; }
        else {
          const r = beats[activeBeat].getBoundingClientRect();
          tx = r.left - rr.left + r.width / 2; ty = r.top - rr.top + r.height * 0.45;
        }
        if (!spot.init) { spot.x = tx; spot.y = ty; spot.init = true; }
        spot.x += (tx - spot.x) * 0.08; spot.y += (ty - spot.y) * 0.08;
        const dx = spot.x - drive.cx, dy = spot.y - drive.cy;
        const dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
        beam.style.transform = 'translate3d(' + drive.cx.toFixed(1) + 'px,' + drive.cy.toFixed(1) + 'px,0) rotate(' + ang.toFixed(4) + 'rad) scaleX(' + (dist / 1000).toFixed(4) + ')';
        // The stone's fire turns to the side the light leaves from, and the stone leans in.
        drive.steer = true;
        drive.light = clamp(0.5 + (dx / rr.width) * 1.6);
        if (cv) cv.style.transform = 'perspective(900px) rotateY(' + ((dx / rr.width) * 16).toFixed(2) + 'deg) rotateX(' + ((-dy / rr.height) * 12).toFixed(2) + 'deg)';
      };
      const lightOn = () => { if (!lightRaf) lightRaf = requestAnimationFrame(lightLoop); };
      const lightOff = () => { cancelAnimationFrame(lightRaf); lightRaf = 0; };

      const st = ScrollTrigger.create({
        id: 'gem-chapter', trigger: root, start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * GEM_CHAPTER_LENGTH),
        pin: true, pinSpacing: true, anticipatePin: 1, scrub: 0.6, invalidateOnRefresh: true,
        // While the stage is pinned it owns the screen: the page-flow rail keeps its dots but
        // hides its labels, whose column would otherwise run into the right-hand beats.
        toggleClass: { targets: document.body, className: 'gem-stage' },
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => render(self.progress),
        onToggle: (self) => (self.isActive ? lightOn() : lightOff()),
      });
      if (st.isActive) lightOn();
      render(0);
      root.__gemChapter = { render, trigger: st };   // test hook: scripts/ and headless checks
      return () => {
        delete root.__gemChapter;
        lightOff();
        drive.steer = false;
        const cv = root.querySelector('.gem-seq-canvas');
        if (cv) cv.style.transform = '';
        st.kill();
        delete root.dataset.chapter;
        setChapter(null);
        beats.forEach((b) => { b.style.opacity = ''; b.style.removeProperty('--beat-lift'); b.inert = false; });
        const h = host();
        if (h) { h.style.transform = ''; h.style.opacity = ''; h.style.transformOrigin = ''; }
      };
    });

    return () => { mm.revert(); root.removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <section ref={sectionRef} className="gem-section" id="gems" aria-label="s0mped, tooth gems">
      {showGem && (
        <GemSequence className="gem-iridescence" driveRef={driveRef} place={place} lights={lights} />
      )}
      <div className="gem-bg-glow" aria-hidden="true" />
      {chapter && (
        <div className="gem-light" aria-hidden="true">
          <div className="gem-beam">
            <span className="gem-haze" />
            <span className="gem-ray" /><span className="gem-ray" /><span className="gem-ray" /><span className="gem-ray" />
          </div>
        </div>
      )}
      <div className="gem-particles" aria-hidden="true">
        <span className="gem-p"/><span className="gem-p"/><span className="gem-p"/>
        <span className="gem-p"/><span className="gem-p"/><span className="gem-p"/>
        <span className="gem-p"/><span className="gem-p"/>
      </div>

      <div className="gem-chapter">
        {/* 1. What it is */}
        <div className="gem-beat gem-beat--left gem-beat--intro">
          <div className="gem-left-top">
            <span className="gem-left-idx">03</span>
            <div className="gem-left-rule" aria-hidden="true" />
            <span className="gem-left-cat">Side project</span>
          </div>
          <img src="assets/somped-vector.svg" alt="s0mped" className="gem-wordmark" draggable="false" loading="lazy" />
          <p className="gem-left-desc">
            Dental jewellery as personal brand, applied design beyond the screen.
          </p>
          {!showGem && (
            <img className="gem-still" src="assets/gems/grid/o35_l2.webp" alt="" aria-hidden="true" loading="lazy" />
          )}
          {chapter === 'wide' && finePointer && <p className="gem-hint" aria-hidden="true">Move to aim the light through the stone</p>}
        </div>

        {/* 2. The cuts */}
        <div className="gem-beat gem-beat--right gem-beat--cuts">
          <p className="gem-kicker">Swarovski crystal</p>
          <h3 className="gem-beat-title">Five cuts to choose from.</h3>
          <ul className="gem-cuts">
            {GEM_CUTS.map((c) => (
              <li key={c.name} className="gem-cut">
                <img src={c.src} alt="" loading="lazy" draggable="false" />
                <span>{c.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. The work */}
        <div className="gem-beat gem-beat--left gem-beat--hand">
          <p className="gem-kicker">Placed by hand</p>
          <h3 className="gem-beat-title">Set by hand in New York.</h3>
          <ul className="gem-sets">
            {GEM_SETS.map((s) => (
              <li key={s.src}><img src={s.src} alt={s.alt} loading="lazy" draggable="false" /></li>
            ))}
          </ul>
          <div className="gem-left-metas">
            <div className="gem-left-meta"><span className="gem-lmk">Handle</span><span className="gem-lmv">@sompednyc</span></div>
            <div className="gem-left-meta"><span className="gem-lmk">Platform</span><span className="gem-lmv">Instagram</span></div>
            <div className="gem-left-meta"><span className="gem-lmk">Since</span><span className="gem-lmv">2023</span></div>
          </div>
        </div>

        {/* 4. The story card and the site */}
        <div className="gem-beat gem-beat--right gem-beat--card">
          <a
            href="https://www.instagram.com/sompednyc/"
            className="gem-story-card"
            data-gem-story
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View tooth gems on Instagram @sompednyc (opens in a new tab)"
          >
            <div className="gem-photo" aria-hidden="true">
              <img className="gem-photo-base" src="assets/lucy-tooth-gem.webp" alt="" loading="lazy" />
              <div className="gem-photo-reveal">
                <img src="assets/lucy-tooth-gem.webp" alt="" loading="lazy" />
              </div>
            </div>
            <div className="gem-bars" aria-hidden="true">
              <div className="gem-bar gem-bar--done"><div className="gem-bar-fill"></div></div>
              <div className="gem-bar"><div className="gem-bar-fill gem-bar-active"></div></div>
              <div className="gem-bar gem-bar--empty"></div>
            </div>
            <div className="gem-user" aria-hidden="true">
              <span className="gem-avatar"></span>
              <span className="gem-username">sompednyc</span>
            </div>
            <div className="gem-content">
              <p className="gem-eyebrow" aria-hidden="true">also:</p>
              <h2 className="gem-title">tooth<br/>gems</h2>
            </div>
            <div className="gem-cta" aria-hidden="true">
              <span className="gem-cta-line"></span>
              <span>view story</span>
              <span className="gem-cta-arrow">↗</span>
            </div>
          </a>
          <a
            href="https://s0mped.xyz"
            className="gem-site-cta"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit s0mped.xyz: pricing and services (opens in a new tab)"
          >
            <span className="gem-site-cta-line" aria-hidden="true" />
            <span className="gem-site-cta-url">s0mped.xyz</span>
            <span className="gem-site-cta-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}

window.GemStory = GemStory;
