/* global React */
const { useState } = React;

/* ===========================================================
   EDITORIAL WORK SECTION
   Each project = a sticky cinematic spread.
   Layout intentionally asymmetric: oversized index number on
   the left edge, project meta as marginalia, narrative beats
   (Problem · Approach · Outcome) as horizontal scroll-paced
   captions. Image lives full-bleed with clip-path mask reveal.
   =========================================================== */

function ProjectSpread({ project, index, onOpen, total }) {
  const num = String(index + 1).padStart(2, '0');
  const href = `case-study.html?slug=${encodeURIComponent(project.slug || project.id)}`;
  return (
    <a
      href={href}
      className="spread"
      data-spread
      data-cursor="open ↗"
      onClick={() => onOpen?.(project)}
    >
      {/* Left margin: giant editorial number */}
      <div className="spread-margin">
        <div className="spread-num" data-spread-num>{num}</div>
        <div className="spread-rule" />
        <div className="spread-meta-stack">
          <span className="spread-meta-k">Year</span>
          <span className="spread-meta-v">{project.year}</span>
        </div>
        <div className="spread-meta-stack">
          <span className="spread-meta-k">Role</span>
          <span className="spread-meta-v">{project.role || '—'}</span>
        </div>
        <div className="spread-meta-stack">
          <span className="spread-meta-k">Index</span>
          <span className="spread-meta-v">{num} / {String(total).padStart(2,'0')}</span>
        </div>
      </div>

      {/* Center: image plate with mask reveal */}
      <div className="spread-plate" data-spread-plate>
        <div className="spread-plate-mask" data-spread-mask>
          {project.cover ? (
            <div className="spread-plate-fill spread-plate-fill--photo">
              <img src={project.cover} alt={project.title} className="spread-plate-img" loading="lazy" />
            </div>
          ) : (
            <div className="spread-plate-fill" style={{
              background: `linear-gradient(135deg, var(--surface-2), var(--surface-3))`,
            }}>
              <span className="spread-plate-glyph">{project.title.charAt(0)}</span>
            </div>
          )}
        </div>
        <span className="spread-plate-caption">Fig. {num}: {project.title}</span>
      </div>

      {/* Right column: narrative beats */}
      <div className="spread-narrative">
        <span className="spread-kicker" data-spread-kicker>{project.category === 'ux' ? 'UX / UI' : project.category === 'code' ? 'Design + Code' : 'Creative Coding'}</span>
        <h3 className="spread-title" data-spread-title>
          <span className="line-mask"><span className="line">{project.title}</span></span>
        </h3>
        <p className="spread-subtitle" data-spread-subtitle>{project.subtitle || project.description}</p>

        <div className="spread-beats">
          <div className="spread-beat" data-spread-beat>
            <span className="spread-beat-k">— Problem</span>
            <p className="spread-beat-v">{project.problem}</p>
          </div>
          <div className="spread-beat" data-spread-beat>
            <span className="spread-beat-k">— Approach</span>
            <p className="spread-beat-v">{project.approach}</p>
          </div>
          <div className="spread-beat" data-spread-beat>
            <span className="spread-beat-k">— Outcome</span>
            <p className="spread-beat-v">{project.outcome}</p>
          </div>
        </div>

        <div className="spread-tags">
          {project.tags.map(t => <span key={t} className="tag tag-sm">{t}</span>)}
        </div>

        <div className="spread-cta">
          <span className="spread-cta-line" />
          <span className="spread-cta-text">Read the case study</span>
          <span className="spread-cta-arrow">↗</span>
        </div>
      </div>
    </a>
  );
}

function WorkSection({ projects }) {
  return (
    <section className="work" id="work" data-screen-label="02 Work">
      <div className="work-h-stage">
        <header className="work-h-bar">
          <div className="work-h-bar-meta">
            <span className="work-h-idx">02</span>
            <span className="work-h-rule" aria-hidden="true" />
            <span className="work-h-label">Selected Work</span>
          </div>
          <div className="work-h-counter" aria-live="polite" aria-atomic="true">
            <span className="work-h-cur">01</span>
            <span aria-hidden="true"> / </span>
            <span className="work-h-tot">{String(projects.length).padStart(2, '0')}</span>
          </div>
        </header>

        <div className="work-track-clip">
          <div className="work-track">
            {projects.map((p, i) => {
              const num = String(i + 1).padStart(2, '0');
              const href = `case-study.html?slug=${encodeURIComponent(p.slug || p.id)}`;
              return (
                <a className="work-panel" key={p.id} href={href} data-panel aria-label={`View case study: ${p.title}`}>
                  {p.cover && (
                    <div className="work-panel-cover" aria-hidden="true">
                      <img src={p.cover} alt="" loading="lazy" />
                    </div>
                  )}
                  <div className="work-panel-aura" aria-hidden="true" />
                  <div className="work-panel-inner">
                    <div className="work-panel-top">
                      <span className="work-panel-ghost" aria-hidden="true">{num}</span>
                      <div className="work-panel-tags">
                        {p.tags.slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}
                      </div>
                    </div>
                    <div className="work-panel-body">
                      <h3 className="work-panel-title">{p.title}</h3>
                      <p className="work-panel-sub">{p.subtitle || p.description}</p>
                    </div>
                    <footer className="work-panel-foot">
                      <span className="work-panel-year">{p.year}{p.role ? ' · ' + p.role : ''}</span>
                      <span className="work-panel-link" aria-hidden="true">↗</span>
                    </footer>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <div className="work-h-progress" aria-hidden="true">
          <div className="work-h-fill" />
        </div>
      </div>
    </section>
  );
}

window.ProjectSpread = ProjectSpread;
window.WorkSection = WorkSection;
