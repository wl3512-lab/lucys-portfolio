/* global React */
const { useState: useStateC } = React;

// Characters the email decodes through on hover. Same alphabet the loader's LetterGlitch
// uses, so the two effects read as one language rather than two ideas.
const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._-/\\|<>[]{}*+=#%&';

function ContactSection() {
  const [copied, setCopied] = useStateC(false);
  const email = 'wl3512@nyu.edu';
  const sectionRef = React.useRef(null);
  const nearView = typeof useInView === 'function' ? useInView(sectionRef, '60% 0px') : true;
  const showAurora = typeof Aurora !== 'undefined' && window.__webglOK !== false && window.innerWidth > 760 && !window.matchMedia('(pointer: coarse)').matches && nearView;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  // Her local time, live. Real instrumentation rather than decorative chrome: it is
  // computed from the machine's clock in her zone, so it is never a fabricated readout.
  const [clock, setClock] = useStateC('');
  React.useEffect(() => {
    const fmt = () => {
      try {
        return new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit',
          hour12: false,
        }).format(new Date());
      } catch (e) { return ''; }
    };
    setClock(fmt());
    const id = setInterval(() => setClock(fmt()), 10000);
    return () => clearInterval(id);
  }, []);

  // Decode-in on hover. Held in a ref and written straight to the node rather than through
  // state, so a 60fps scramble never re-renders the section.
  const emailRef = React.useRef(null);
  const rafRef = React.useRef(0);
  const runScramble = () => {
    const el = emailRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.documentElement.classList.contains('reduce-motion')) return;
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const DUR = 520;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / DUR);
      // Characters resolve left to right; each one settles once the wave passes it.
      const settled = Math.floor(p * email.length * 1.35);
      el.textContent = email
        .split('')
        .map((c, i) => {
          if (i < settled || c === '@' || c === '.') return c;
          return SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
        })
        .join('');
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else el.textContent = email;
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <>
      <section ref={sectionRef} className="scene scene-contact" id="contact" data-screen-label="05 Contact">
        {showAurora && (
          <Aurora className="contact-aurora" colorStops={['#4A8FEF', '#C4B0FF', '#72ADFF']} amplitude={0.9} blend={0.55} speed={0.5} />
        )}
        <div className="container contact-inner">
          {/* Header rail: section index on the left, channel status on the right, with the
              rule drawn between them. Reads as an instrument header, not a centred kicker. */}
          <div className="contact-rail">
            <span className="scene-kicker">V / Contact</span>
            <span className="contact-rule" aria-hidden="true" />
            <span className="contact-status">
              <span className="contact-status-dot" aria-hidden="true" />
              channel open
            </span>
          </div>

          <p className="contact-lede">I read everything.</p>

          {/* The email is the display element. It used to sit under a huge "Let's work
              together." headline, which is the one line every portfolio template ends on,
              and it buried the single thing this section exists to get someone to do. */}
          <div className="contact-channel">
            <a
              href={`mailto:${email}`}
              className="contact-email"
              data-cursor="write"
              onMouseEnter={runScramble}
              onFocus={runScramble}
            >
              <span className="contact-email-text" ref={emailRef}>{email}</span>
              <span className="contact-arrow" aria-hidden="true">↗</span>
            </a>
            <button
              type="button"
              className={'contact-copy' + (copied ? ' is-copied' : '')}
              onClick={copy}
              data-cursor={copied ? 'copied!' : 'copy'}
              aria-live="polite"
              aria-atomic="true"
            >
              {copied ? 'copied ✓' : 'copy'}
            </button>
          </div>

          {/* Readout. Every value here is a fact that already exists elsewhere on the site
              (the About ledger), set as instrumentation rather than prose. */}
          <dl className="contact-readout">
            <div className="cr-row">
              <dt>Location</dt>
              <dd>New York, NY</dd>
              <dd className="cr-aux">40.7128° N / 74.0060° W</dd>
            </div>
            <div className="cr-row">
              <dt>Local time</dt>
              <dd><span className="cr-clock">{clock || '--:--'}</span></dd>
              <dd className="cr-aux">EST</dd>
            </div>
            <div className="cr-row">
              <dt>Available</dt>
              <dd>Summer 2027</dd>
              <dd className="cr-aux" />
            </div>
            <div className="cr-row">
              <dt>Channels</dt>
              <dd className="cr-links">
                <a href="https://www.linkedin.com/in/lucyliuxyz/" className="hover-underline" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in new tab)">LinkedIn ↗</a>
                <a href="https://github.com/wl3512-lab" className="hover-underline" target="_blank" rel="noopener noreferrer" aria-label="GitHub (opens in new tab)">GitHub ↗</a>
                <a href="https://www.instagram.com/lucyy.liuu/" className="hover-underline" target="_blank" rel="noopener noreferrer" aria-label="Instagram (opens in new tab)">Instagram ↗</a>
              </dd>
              <dd className="cr-aux" />
            </div>
          </dl>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>© 2026 Lucy Liu</span>
          <span className="footer-mid">Designed &amp; built in NYC</span>
          <a href="#" className="hover-underline">back to top ↑</a>
        </div>
      </footer>
    </>
  );
}

window.ContactSection = ContactSection;
