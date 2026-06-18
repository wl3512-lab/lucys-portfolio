/* global React */
// ============================================================
// TOOTH GEMS: story card
// s0mped side project — editorial context column + Instagram story card.
// Self-contained presentational section, exposed as window.GemStory.
// ============================================================
function GemStory() {
  const showIridescence = typeof Iridescence !== 'undefined' && window.innerWidth >= 760;
  return (
    <section className="gem-section" id="gems">
      {/* Atmospheric environment: stays behind everything */}
      {showIridescence && (
        <Iridescence className="gem-iridescence" color={[0.6, 0.45, 1.0]} speed={0.6} amplitude={0.05} />
      )}
      <div className="gem-bg-glow" aria-hidden="true" />
      <div className="gem-particles" aria-hidden="true">
        <span className="gem-p"/><span className="gem-p"/><span className="gem-p"/>
        <span className="gem-p"/><span className="gem-p"/><span className="gem-p"/>
        <span className="gem-p"/><span className="gem-p"/>
      </div>

      <div className="gem-layout">
        {/* Left: editorial context column */}
        <div className="gem-left">
          <div className="gem-left-ghost" aria-hidden="true">03</div>
          <div className="gem-left-top">
            <span className="gem-left-idx">03</span>
            <div className="gem-left-rule" aria-hidden="true" />
            <span className="gem-left-cat">Side project</span>
          </div>
          <img
            src="assets/somped-vector.svg"
            alt="s0mped"
            className="gem-wordmark"
            draggable="false"
            loading="lazy"
          />
          <p className="gem-left-desc">
            Dental jewellery as personal brand, applied design beyond the screen.
          </p>
          <div className="gem-left-metas">
            <div className="gem-left-meta">
              <span className="gem-lmk">Handle</span>
              <span className="gem-lmv">@sompednyc</span>
            </div>
            <div className="gem-left-meta">
              <span className="gem-lmk">Platform</span>
              <span className="gem-lmv">Instagram</span>
            </div>
            <div className="gem-left-meta">
              <span className="gem-lmk">Since</span>
              <span className="gem-lmv">2023</span>
            </div>
          </div>
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

        {/* Right: Instagram story card */}
        <a
          href="https://www.instagram.com/sompednyc/"
          className="gem-story-card"
          data-gem-story
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View tooth gems on Instagram @sompednyc (opens in a new tab)"
        >
          <div className="gem-photo" aria-hidden="true">
            <img className="gem-photo-base" src="assets/lucy-tooth-gem.png" alt="" loading="lazy" />
            <div className="gem-photo-reveal">
              <img src="assets/lucy-tooth-gem.png" alt="" loading="lazy" />
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
      </div>
    </section>
  );
}

window.GemStory = GemStory;
