/* global React */
// ============================================================
// s0mped: the gem chapter
// One rendered brilliant (GemSequence) as the hero, and everything about s0mped on the same
// screen beside and under it: what it is and what Lucy made (the wordmark, a line, a paragraph,
// the facts, the site), every shape the shop has in stock with its finishes, and her own work
// on the tooth. Lucy, 2026-10-28: the four beats that faded in one at a time read "picture by
// picture" with "not enough words", five cuts were fewer shapes than she offers, the spotlight
// rays went, and the scroll was too long. So nothing steps in any more: once the creature's gag
// (gem-caught.js) hands the stone over, the whole chapter is there at once, and the short pin
// only tumbles the stone from profile to face-up while you read.
//
// The stone is drawn where the layout leaves room for it: CSS places an empty slot
// (.gem-stone-slot) and this component measures it and hands GemSequence the position, so the
// stone and the text can never collide at any screen size.
//
// Two chapter layouts, both pinned: "wide" (>= 900 x 640) is one screen, the stone left, the
// words right, the shapes along the bottom; "compact" (phones, >= 560px tall) pins a first
// screen of the stone over the words, and the shapes and the photos follow in the page.
// Reduced motion and very short screens get the same markup as a plain stacked section with a
// still of the stone. Nothing is hidden at rest. Exposed as window.GemStory.
// ============================================================
const GEM_CHAPTER_LENGTH = 1.0;   // viewport heights of scroll the chapter pins for (the stone's tumble)
// The opening before it, where the creature is caught with the stone (gem-caught.js).
const GEM_GAG_LENGTH = 0.5;
// The stone's square frame against the slot's shorter side: the rendered frames carry a
// transparent margin, so a frame a little bigger than the slot puts the stone itself in it. 1.12 fitted the stone to
// the slot; Lucy (2026-10-28: "scale dragon and gem up") wanted it larger, so it now reaches a little past the slot,
// held clear of the words and the shapes (gem-snap.mjs checks the stone's real pixels against them).
const GEM_FRAME = 1.35;

// Every shape in the shop's stock (s0mped-site components/InStock.tsx), one photo each from the
// shop's own product shots, cut out by scratchpad tooling into assets/gems/cuts/ (all fifteen
// finishes are there; one is shown per shape). The Butterfly Set is the menu's design of four
// navettes (Services.tsx), drawn from the same clear navette photo.
const GEM_AB = 'AB';
const GEM_SHAPES = [
  { group: 'Full size', items: [
    { name: 'Round',   src: 'assets/gems/cuts/round-clear.webp', fin: ['clear', GEM_AB, 'purple'] },
    { name: 'Star',    src: 'assets/gems/cuts/star-pink.webp',   fin: ['pink', 'purple', 'clear', GEM_AB] },
    { name: 'Fang',    src: 'assets/gems/cuts/fang-clear.webp',  fin: ['clear'] },
    { name: 'Diamond', src: 'assets/gems/cuts/diamond-ab.webp',  fin: ['clear', GEM_AB] },
    { name: 'Navette', src: 'assets/gems/cuts/navette-ab.webp',  fin: ['clear', GEM_AB] },
  ] },
  { group: 'Micro', items: [
    { name: 'Micro Diamond', src: 'assets/gems/cuts/micro-diamond-clear.webp',  fin: ['clear'] },
    { name: 'Micro Navette', src: 'assets/gems/cuts/micro-navette-chrome.webp', fin: ['chrome'] },
    { name: 'Micro Moon',    src: 'assets/gems/cuts/micro-moon-clear.webp',     fin: ['clear'] },
  ] },
  { group: 'Design', items: [
    { name: 'Butterfly Set', src: 'assets/gems/cuts/butterfly-set.webp', note: 'four navettes' },
  ] },
];
const GEM_SETS = [
  { src: 'assets/gems/sets/nails.webp',    alt: 'Rows of clear crystals set on the canines, matched to crystal nails' },
  { src: 'assets/gems/sets/smile.webp',    alt: 'A butterfly of crystals on an upper tooth, side view' },
  { src: 'assets/gems/sets/portrait.webp', alt: 'A smile with scattered crystals and a star across the upper teeth' },
];

function GemFinishes({ fin }) {
  return fin.map((f, i) => (
    <React.Fragment key={f}>
      {i > 0 && ', '}
      {f === GEM_AB ? <abbr title="Aurora Borealis">AB</abbr> : f}
    </React.Fragment>
  ));
}

function GemStory() {
  const sectionRef = React.useRef(null);
  const stageRef = React.useRef(null);
  const slotRef = React.useRef(null);
  const driveRef = React.useRef({ orbit: 0, light: 0.5, moved: 0 });
  const [chapter, setChapter] = React.useState(null);     // null | 'wide' | 'compact'
  const [place, setPlace] = React.useState(null);         // where the slot is, as GemSequence wants it
  const nearView = typeof useInView === 'function' ? useInView(sectionRef, '100% 0px') : true;   // a viewport early: the frames need fetching
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  // Canvas wherever a chapter runs, or on a wide fine-pointer screen that scrubs it plainly.
  const canGem = typeof GemSequence !== 'undefined' && (chapter !== null || (window.innerWidth > 760 && finePointer));
  const showGem = canGem && nearView && !!place;
  const lights = chapter === 'compact' ? [1, 2, 3] : [0, 1, 2, 3, 4];

  // The slot, in the stage's coordinates: { x, y } its centre as fractions, scale the frame's
  // size against the stage's shorter side (GemSequence's own terms).
  const measure = React.useCallback(() => {
    const stage = stageRef.current, slot = slotRef.current;
    if (!stage || !slot) return null;
    const a = stage.getBoundingClientRect(), b = slot.getBoundingClientRect();
    if (!a.width || !a.height || !b.width || !b.height) return null;
    const size = Math.min(b.width, b.height) * GEM_FRAME;
    return {
      x: (b.left - a.left + b.width / 2) / a.width,
      y: (b.top - a.top + b.height / 2) / a.height,
      scale: size / Math.min(a.width, a.height),
      px: { cx: b.left - a.left + b.width / 2, cy: b.top - a.top + b.height / 2, s: Math.round(size) },
    };
  }, []);

  // Keep the stone on its slot through resizes, the chapter switching layouts and the pin.
  React.useLayoutEffect(() => {
    const stage = stageRef.current, slot = slotRef.current;
    if (!stage || !slot) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = measure();
      if (!p) return;
      const st = stage.style;
      st.setProperty('--slot-x', p.px.cx.toFixed(1) + 'px');
      st.setProperty('--slot-y', p.px.cy.toFixed(1) + 'px');
      st.setProperty('--slot-s', p.px.s + 'px');
      setPlace((q) => (q && Math.abs(q.x - p.x) < 0.0005 && Math.abs(q.y - p.y) < 0.0005 && Math.abs(q.scale - p.scale) < 0.0005 ? q : p));
    };
    const soon = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    let ro = null;
    try { ro = new ResizeObserver(soon); ro.observe(stage); ro.observe(slot); } catch (e) {}
    window.addEventListener('resize', soon);
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); window.removeEventListener('resize', soon); };
  }, [measure, chapter]);

  React.useEffect(() => {
    const root = sectionRef.current, stage = stageRef.current;
    if (!root || !stage || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    // Phones show and hide the address bar mid-scroll; without this every toggle refreshes
    // every trigger and a pinned section visibly jumps.
    ScrollTrigger.config({ ignoreMobileResize: true });
    const drive = driveRef.current;
    const mm = gsap.matchMedia();

    // Pointer: the stone's light follows the hand across the section (GemSequence turns the
    // studio toward it; with no pointer for a while it drifts on its own). Nothing else moves.
    const onMove = (e) => {
      if (drive.gag) return;   // the creature's hand-over needs the middle light
      const r = root.getBoundingClientRect();
      if (!r.width) return;
      drive.light = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
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
      const gagOn = typeof GemCaught !== 'undefined';
      const lead = gagOn ? GEM_GAG_LENGTH : 0;
      const total = lead + GEM_CHAPTER_LENGTH;
      let gag = null, st = null, steerT = 0;
      const clamp = (v) => Math.max(0, Math.min(1, v));
      if (gagOn) {
        root.dataset.gag = 'on';
        drive.gag = true; drive.steer = true; drive.light = 0.5;
        // The gag mounts on the stage: one screen tall in every layout, the same box the stone
        // is drawn in, so his pixel stone and the render line up.
        gag = GemCaught.mount(stage, {
          base: 'assets/creature/s0mped-caught/', gemSrc: 'assets/gems/grid/o00_l2.webp',
          compact: () => mode === 'compact',
          total: () => total,
          // where the chapter draws the stone, so the creature hands it over exactly there
          stone: () => {
            if (drive.cx != null && drive.w) return { cx: drive.cx, cy: drive.cy, s: drive.w };
            const p = measure();
            if (p) return p.px;
            const r = stage.getBoundingClientRect();
            return { cx: r.width * 0.3, cy: r.height * 0.42, s: Math.round(Math.min(r.width, r.height) * 0.6) };
          },
          onChapter: (v) => {
            root.style.setProperty('--gem-on', String(v));
            clearTimeout(steerT);
            if (v < 1) { drive.gag = true; drive.steer = true; drive.light = 0.5; return; }
            // While the creature has the stone the chapter's stone holds its middle light, so the
            // one he hands over is the very frame the chapter shows next; it lets go of the light
            // only once his canvas has faded off it.
            drive.gag = false;
            steerT = setTimeout(() => { drive.steer = false; }, 700);
          },
          // the reward for clicking: the page glides on to the chapter while the push plays
          onLook: () => {
            if (!st) return;
            const y = st.start + window.innerHeight * GEM_GAG_LENGTH;
            if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: 'smooth' });
          },
        });
      }

      // The chapter's only motion: the stone tumbles from profile to face-up across the pin.
      const render = (p) => { drive.orbit = clamp(p); };
      const renderAll = (prog) => {
        const q = prog * total;
        if (gag) gag.update(clamp(q / GEM_GAG_LENGTH));
        render(clamp((q - lead) / GEM_CHAPTER_LENGTH));
      };
      st = ScrollTrigger.create({
        id: 'gem-chapter', trigger: root, start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * total),
        pin: true, pinSpacing: true, anticipatePin: 1, scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: (self) => renderAll(self.progress),
        onRefresh: (self) => renderAll(self.progress),
      });
      renderAll(0);
      root.__gemChapter = { render, renderAll, trigger: st, gagLength: lead, chapterLength: GEM_CHAPTER_LENGTH, total };   // test hook
      // Scroll landings (components/scroll-landings.js): one flick never carries past the gag's
      // end (the chapter arrived) or the end of the pin.
      const unland = window.ScrollLandings ? window.ScrollLandings.add(() => {
        const ys = [st.start];
        if (gagOn) ys.push(st.start + window.innerHeight * lead);
        ys.push(st.end);
        return ys;
      }) : null;
      return () => {
        delete root.__gemChapter;
        if (unland) unland();
        clearTimeout(steerT);
        if (gag) gag.dispose();
        delete root.dataset.gag; root.style.removeProperty('--gem-on');
        drive.gag = false; drive.steer = false;
        st.kill();
        delete root.dataset.chapter;
        setChapter(null);
      };
    });

    return () => { mm.revert(); root.removeEventListener('pointermove', onMove); };
  }, [measure]);

  return (
    <section ref={sectionRef} className="gem-section" id="gems" aria-label="sompednyc, tooth gems">
      {/* The visual layer, one screen tall in a chapter: the stone, its glow, the creature's gag. */}
      <div ref={stageRef} className="gem-stage">
        <div className="gem-bg-glow" aria-hidden="true" />
        {showGem && (
          <GemSequence className="gem-iridescence" driveRef={driveRef} place={place} lights={lights} />
        )}
        <div className="gem-particles" aria-hidden="true">
          <span className="gem-p"/><span className="gem-p"/><span className="gem-p"/>
          <span className="gem-p"/><span className="gem-p"/><span className="gem-p"/>
          <span className="gem-p"/><span className="gem-p"/>
        </div>
      </div>

      <div className="gem-chapter">
        <div className="gem-lead">
          <div ref={slotRef} className="gem-stone-slot" aria-hidden="true">
            {!canGem && <img className="gem-still" src="assets/gems/grid/o35_l2.webp" alt="" loading="lazy" draggable="false" />}
          </div>
          <div className="gem-intro">
            <div className="gem-left-top">
              <span className="gem-left-idx">01</span>
              <div className="gem-left-rule" aria-hidden="true" />
              <span className="gem-left-cat">Side project</span>
            </div>
            <h2 className="gem-wordmark-h">
              <img src="assets/somped-vector.svg" alt="sompednyc" className="gem-wordmark" draggable="false" loading="lazy" />
            </h2>
            <p className="gem-para">
              Clients find sompednyc on Instagram, and I come to their home to bond premium crystals with
              a tooth-friendly adhesive, no drilling. I design each layout on the tooth, and built the site
              to read in one scroll on a phone.
            </p>
            <div className="gem-left-metas">
              <div className="gem-left-meta">
                <span className="gem-lmk">Handle</span>
                <a className="gem-lmv" href="https://www.instagram.com/sompednyc/" target="_blank" rel="noopener noreferrer"
                  aria-label="@sompednyc on Instagram (opens in a new tab)">@sompednyc</a>
              </div>
              <div className="gem-left-meta"><span className="gem-lmk">Platform</span><span className="gem-lmv">Instagram</span></div>
              <div className="gem-left-meta"><span className="gem-lmk">Since</span><span className="gem-lmv">2024</span></div>
              <a
                href="https://s0mped.xyz"
                className="gem-site-cta"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit s0mped.xyz: the work, pricing and booking (opens in a new tab)"
              >
                <span className="gem-site-cta-line" aria-hidden="true" />
                <span className="gem-site-cta-url">s0mped.xyz</span>
                <span className="gem-site-cta-arrow" aria-hidden="true">↗</span>
              </a>
            </div>
            {/* Her other side work lives in one list, the Other work page since 2026-11-09 (Lucy, 2026-10-31: "where should i put my
                side work?"; she picked "After sompednyc + one list"). */}
            <a className="link-caps gem-more" href="other-work.html">More side work <b aria-hidden="true">→</b></a>
          </div>
        </div>

        <div className="gem-shapes">
          <div className="gem-shapes-head">
            <h3 className="gem-shapes-title">Every shape in stock.</h3>
            <p className="gem-shapes-note">Swarovski crystal unless noted; the micro navette is cubic zirconia.</p>
          </div>
          <div className="gem-shape-groups">
            {GEM_SHAPES.map((g) => (
              <div key={g.group} className="gem-shape-group" style={{ '--n': g.items.length }}>
                <p className="gem-group-label" id={'gem-group-' + g.group.replace(/\s+/g, '-').toLowerCase()}>{g.group}</p>
                <ul className="gem-shape-list" aria-labelledby={'gem-group-' + g.group.replace(/\s+/g, '-').toLowerCase()}>
                  {g.items.map((s) => (
                    <li key={s.name} className="gem-shape">
                      <img src={s.src} alt="" loading="lazy" draggable="false" />
                      <span className="gem-shape-name">{s.name}</span>
                      <span className="gem-shape-fin">{s.fin ? <GemFinishes fin={s.fin} /> : s.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="gem-work">
          <p className="gem-kicker">On the tooth</p>
          <ul className="gem-sets">
            {GEM_SETS.map((s) => (
              <li key={s.src}><img src={s.src} alt={s.alt} loading="lazy" draggable="false" /></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

window.GemStory = GemStory;
