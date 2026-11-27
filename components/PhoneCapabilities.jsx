/* global React, NightDrive, NightDriveMath, gsap, useStory, StoryBar */
// Lucy's C2 phone layout, on the night drive's own page (capabilities.html) since 2026-10-31; home has a quiet list.
// The same renderer still draws the five worlds; it owns its visibility and quality budget.
// Story style (Lucy, 2026-10-28: "and capablities tpop", "i dont liek th eprevious and continue and skip"): the
// stops play on their own while the section is on screen, under a five-segment bar (components/story-bar.js) that
// replaced the rail and Previous / Next / Continue / Skip. Tap the scene's right side or swipe left for the next stop,
// the left side or swipe right for the one before; press and hold to pause. A vertical drag scrolls the page on.
const CAP_STORY_MS = 5000;
const capNoStory = () => null;
function PhoneCapabilities({ projects = [], stops, withAi }) {
  const rootRef = React.useRef(null), sceneRef = React.useRef(null);
  const engineRef = React.useRef(null), tweenRef = React.useRef(null);
  const progressRef = React.useRef({ s: .15 });
  const selectedRef = React.useRef(0);
  const [selected, setSelected] = React.useState(0);
  const [failed, setFailed] = React.useState(false), [live, setLive] = React.useState(false);
  const [reduced, setReduced] = React.useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion'));
  const near = typeof useInView === 'function' ? useInView(rootRef, '60% 0px') : true;
  const current = stops[selected];
  const related = (current.work || '').split(',').map(slug => projects.find(p => (p.slug || p.id) === slug)).filter(Boolean);
  if (current.withAi) related.push(withAi);
  const href = p => p.detailPage || 'case-study.html?slug=' + encodeURIComponent(p.slug || p.id);
  const stopAt = i => typeof NightDriveMath !== 'undefined' ? NightDriveMath.STOP_S[i] : [.15, .34, .52, .73, .93][i];

  React.useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(m.matches || document.documentElement.classList.contains('reduce-motion'));
    m.addEventListener('change', change);
    return () => m.removeEventListener('change', change);
  }, []);

  // The three scenes share a stationary phone stage. Native scroll drives the handovers, including the heading,
  // and the owner restores ordinary flow on reduced motion, a short landscape screen, or desktop resize.
  React.useLayoutEffect(() => {
    const host = rootRef.current;
    if (!host || reduced || !window.ProjectionJourney) return;
    return ProjectionJourney.mountPhone(host);
  }, [reduced]);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let io;
    const measure = () => {
      if (io) io.disconnect();
      const header = document.querySelector('.flow-menu-header');
      const b = header && header.getBoundingClientRect();
      const y = Math.round(b ? b.top + b.height / 2 : 32);
      io = new IntersectionObserver(entries => document.body.classList.toggle('nd-under-nav', entries[entries.length - 1].isIntersecting), {
        rootMargin: `-${y}px 0px -${Math.max(0, innerHeight - y - 1)}px 0px`,
      });
      io.observe(el);
    };
    measure(); window.addEventListener('resize', measure, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('resize', measure); document.body.classList.remove('nd-under-nav'); };
  }, []);

  React.useEffect(() => {
    if (!near || reduced || failed || typeof NightDrive === 'undefined' || typeof NightDriveMath === 'undefined' || !NightDrive.supported()) return;
    const host = sceneRef.current, canvas = document.createElement('canvas');
    canvas.className = 'pc-world'; canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    const engine = NightDrive.mount(canvas, {
      stops, timing: NightDriveMath.entryTiming(), voidRgb: [5, 7, 16],
      onLost: () => { setFailed(true); setLive(false); },
    });
    if (!engine) { canvas.remove(); setFailed(true); return; }
    progressRef.current.s = stopAt(selectedRef.current);
    engine.setProgress(progressRef.current.s);
    engineRef.current = engine; setLive(true);
    let visible = true;
    const pause = () => {
      if (tweenRef.current) tweenRef.current.paused(!visible || rootRef.current.inert || document.hidden || document.body.classList.contains('about-locked'));
    };
    const io = new IntersectionObserver(entries => { visible = entries[entries.length - 1].isIntersecting; pause(); });
    io.observe(canvas);
    document.addEventListener('visibilitychange', pause);
    document.addEventListener('lucy:scene-visibility', pause);
    return () => {
      io.disconnect(); document.removeEventListener('visibilitychange', pause); document.removeEventListener('lucy:scene-visibility', pause);
      if (tweenRef.current) tweenRef.current.kill(); tweenRef.current = null;
      engine.dispose(); canvas.remove(); engineRef.current = null; setLive(false);
    };
  }, [near, reduced, failed]);

  const select = i => {
    if (i < 0 || i >= stops.length) return;
    selectedRef.current = i; setSelected(i);
    if (tweenRef.current) tweenRef.current.kill();
    const engine = engineRef.current, target = stopAt(i);
    if (engine && typeof gsap !== 'undefined' && !reduced) {
      tweenRef.current = gsap.to(progressRef.current, { s: target, duration: .65, ease: 'power2.inOut', overwrite: true,
        onUpdate: () => engine.setProgress(progressRef.current.s), onComplete: () => { tweenRef.current = null; },
      });
    } else { progressRef.current.s = target; if (engine) engine.setProgress(target); }
  };
  const story = (typeof useStory === 'function' ? useStory : capNoStory)({
    id: 'capabilities', count: stops.length, index: selected, duration: CAP_STORY_MS, enabled: true,
    watchRef: rootRef, rootRef, select: i => select(i),
  });
  const step = d => { if (story) story.go(d); else select(selectedRef.current + d); };
  // At the last stop, somewhere to go (Lucy's user tests, 2026-10-31: the end of Capabilities did not read as an end):
  // the work. Since the drive moved to its own page (capabilities.html) "Next: sompednyc" would point nowhere.
  const last = selected === stops.length - 1;
  const onKey = e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); step(['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); const i = e.key === 'Home' ? 0 : stops.length - 1;
      if (story) story.jump(i); else select(i);
    }
  };
  return (
    <section ref={rootRef} id="skills" className="scene scene-skills phone-capabilities" data-screen-label="02 Capabilities" data-landing="0" data-selected-stop={selected} data-world-live={live}>
      <header className="pc-heading">
        <p className="pc-kicker">The night drive · 5 stops</p>
        <h1>Capabilities</h1>
        <p>Research, design, code, and live performance.</p>
      </header>
      <div className="pc-main">
        <div className="pc-stage">
          {story && typeof StoryBar === 'function' && <StoryBar story={story} labels={stops.map(s => s.label)} label="Capability stops" />}
          <div ref={sceneRef} className="pc-scene" role="region" aria-label="Capability scene. Tap the right side or swipe left for the next stop, the left side or swipe right for the one before." tabIndex="0"
            {...(story ? story.gestures : {})} onKeyDown={onKey} onDragStart={e => e.preventDefault()}>
            <img className="pc-poster" src={'assets/capabilities/stop-' + selected + '.webp'} alt="" aria-hidden="true" draggable="false" width="390" height="845" loading="lazy" />
          </div>
        </div>
        <div className="pc-evidence" aria-live={story ? story.live : 'polite'} aria-atomic="true">
          <p className="pc-count">{String(selected + 1).padStart(2, '0')} / 05</p>
          <h3 className="sr-only">{current.label}</h3><p className="sr-only">{current.line}</p>
          <p className="pc-tools">{current.tools.split(',').join(' · ')}</p>
          <div className="pc-work">{related.map(p => <a key={p.slug || p.id} href={href(p)}>{p.title} <span aria-hidden="true">↗</span></a>)}</div>
        </div>
        {last && <a className="pc-next" href="work.html">All work <span className="pc-next-arrow" aria-hidden="true">→</span></a>}
      </div>
    </section>
  );
}
window.PhoneCapabilities = PhoneCapabilities;
