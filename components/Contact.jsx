/* global React */
const { useState: useStateC } = React;

function ContactSection() {
  const [copied, setCopied] = useStateC(false);
  const email = 'wl3512@nyu.edu';
  const sectionRef = React.useRef(null);
  const nearView = typeof useInView === 'function' ? useInView(sectionRef) : true;
  const showAurora = typeof Aurora !== 'undefined' && window.__webglOK !== false && window.innerWidth >= 760 && nearView;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <>
      <section ref={sectionRef} className="scene scene-contact" id="contact" data-screen-label="05 Contact">
        {showAurora && (
          <Aurora className="contact-aurora" colorStops={['#4A8FEF', '#C4B0FF', '#72ADFF']} amplitude={0.9} blend={0.55} speed={0.5} />
        )}
        <div className="container contact-inner">
          <span className="scene-kicker">V / Get in touch</span>
          <h2 className="contact-head">
            <span className="contact-accent">Let’s</span>
            <span className="contact-line">work <span className="ascii-word">together</span>.</span>
          </h2>
          <a href={`mailto:${email}`} className="contact-email" data-cursor="write">
            {email}
            <span className="contact-arrow">↗</span>
          </a>
          <button
            type="button"
            className={'contact-copy' + (copied ? ' is-copied' : '')}
            onClick={copy}
            data-cursor={copied ? 'copied!' : 'copy'}
            aria-live="polite"
            aria-atomic="true"
          >
            {copied ? 'copied ✓' : 'copy email'}
          </button>

          <div className="contact-socials">
            <a href="https://www.linkedin.com/in/lucy-liu-9b812127b/" className="hover-underline" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in new tab)">LinkedIn ↗</a>
            <span className="contact-sep">·</span>
            <a href="https://github.com/wl3512-lab" className="hover-underline" target="_blank" rel="noopener noreferrer" aria-label="GitHub (opens in new tab)">GitHub ↗</a>
            <span className="contact-sep">·</span>
            <a href="https://www.instagram.com/lucyy.liuu/" className="hover-underline" target="_blank" rel="noopener noreferrer" aria-label="Instagram (opens in new tab)">Instagram ↗</a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>© 2026 Lucy Liu</span>
          <span className="footer-mid">Designed & built in NYC</span>
          <a href="#" className="hover-underline">back to top ↑</a>
        </div>
      </footer>
    </>
  );
}

window.ContactSection = ContactSection;
