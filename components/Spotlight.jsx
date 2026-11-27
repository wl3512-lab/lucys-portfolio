/* global React */
// Standout work: three case-study cards (Lucy, 2026-10-31, after her user testing: "Too much going on, especially in
// the standout work and on phone ui"; "cant tell its presenting case studys i can open just looks like ur supposted
// to watch it"; "reduce amount of work shown"). She picked plain cards: the cover, the title, one line, the result
// and a clear "Read the case study". Each card is one link to its case study. Nothing plays on its own: a cover reel
// rests on its poster and plays only while its card is hovered or focused (CoverReel with arrival off).
// The projector (the screening room, the navette remote, the phone story) is retired; its source is kept in
// docs/projects/projection-standout/retired-2026-10-31/.

// The three cards, in order. Swapping one is this line: a slug with a case-study page (STANDOUT_PAGES, or the
// project's detailPage) shows up; its result line comes from STANDOUT_RESULTS. Demon Nights moved to About (Lucy,
// 2026-10-31), so rep.tools holds the third place for now.
const STANDOUT_SLUGS = ['driftwood', 'habitabull', 'reptools'];
const STANDOUT_PAGES = { driftwood: 'case-study.html', habitabull: 'habitabull.html', reptools: 'reptools.html' };
// One sentence each, the lead part set in bold. Every claim is the case study's own:
// Driftwood and HabitaBull from their outcomes (index.html), rep.tools from reptools.html's Outcome tile.
const STANDOUT_RESULTS = {
  driftwood: ['About 76%', ' of visitors named their pet’s flaw without a prompt at the 2026 IMA Spring Show.'],
  habitabull: ['Shipped', ' an installable app with workout logging, progress history and shared challenges.'],
  reptools: ['Live and in use:', ' the founder shipped the redesigned catalogue and product pages.'],
};
// Covers show whole, never cropped (Lucy, 2026-10-31: "i want full covers shown"): each sits in a 3:2 slot at its own
// shape (contain), and a cover of another shape is letterboxed in its own background colour, read off its edges, so
// the bands look like the picture. rep.tools' screenshot is 16:9 on #0a0a0a.
const STANDOUT_COVER_BG = { reptools: 'rgb(10, 10, 10)' };
// "See all N projects": N is All Work's card count. deploy.sh stamps it here from work.html's cards at build time
// (it looks for this exact line); the source shows "See all work".
const ALL_WORK_COUNT = null;

function StandoutCard(props) {
  const p = props.project;
  const cardRef = React.useRef(null), videoRef = React.useRef(null);
  React.useEffect(() => {
    const v = videoRef.current, card = cardRef.current;
    if (!v || !card || typeof window.CoverReel !== 'function') return;
    return window.CoverReel(v, card, { arrival: false });
  }, [p.coverVideo]);
  const id = 'standout-' + p.slug;
  const result = STANDOUT_RESULTS[p.slug];
  return (
    <li className="standout-item">
      <a ref={cardRef} className="standout-card" href={STANDOUT_PAGES[p.slug] || p.detailPage}
        aria-labelledby={id + '-title ' + id + '-cta'} aria-describedby={id + '-line' + (result ? ' ' + id + '-result' : '')}>
        <span className="standout-cover" style={STANDOUT_COVER_BG[p.slug] ? { '--cover-bg': STANDOUT_COVER_BG[p.slug] } : undefined}>
          {p.coverVideo
            ? <video ref={videoRef} className="standout-picture" src={p.coverVideo} poster={p.coverPoster || p.cover} muted playsInline preload="none" aria-hidden="true" />
            : <img className="standout-picture" src={p.coverPoster || p.cover} alt="" loading="lazy" decoding="async" />}
        </span>
        <span className="standout-body">
          <span className="standout-meta">{p.year} · {p.role}{p.wip ? ' · In\u00a0progress' : ''}</span>
          <h3 className="standout-name" id={id + '-title'}>{p.title}</h3>
          <p className="standout-line" id={id + '-line'}>{p.subtitle || p.description}</p>
          {result && <p className="standout-result" id={id + '-result'}><span className="standout-result-label">Result</span><strong>{result[0]}</strong>{result[1]}</p>}
          <span className="standout-cta" id={id + '-cta'}>Read the case study <span className="standout-arrow" aria-hidden="true">→</span></span>
        </span>
      </a>
    </li>
  );
}

function Spotlight(props) {
  const all = (props && props.projects) || [];
  const projects = STANDOUT_SLUGS.map(slug => all.find(p => p.slug === slug)).filter(p => p && (STANDOUT_PAGES[p.slug] || p.detailPage));
  if (!projects.length) return null;
  return (
    <section className="standout" id="projection-standout" data-screen-label="02 Standout work" data-landing="0" aria-labelledby="standout-heading">
      {/* The page's #spotlight anchor (hero-gate.js restores it after the opening) lands on the section's top. */}
      <span id="spotlight" className="standout-anchor" aria-hidden="true" />
      <div className="standout-inner">
        <header className="standout-head">
          <p className="standout-kicker"><span>01</span><span className="standout-rule" aria-hidden="true" /><span>Case studies</span></p>
          <h2 className="standout-heading" id="standout-heading">Standout work</h2>
          <p className="standout-intro">Three projects, each written up in full: the problem, the process and the result.</p>
        </header>
        <ul className="standout-list">
          {projects.map(p => <StandoutCard key={p.slug} project={p} />)}
        </ul>
        <a className="standout-all" href="work.html">{ALL_WORK_COUNT ? 'See all ' + ALL_WORK_COUNT + ' projects' : 'See all work'} <span className="standout-arrow" aria-hidden="true">→</span></a>
      </div>
    </section>
  );
}
window.StandoutCard = StandoutCard;
window.Spotlight = Spotlight;
