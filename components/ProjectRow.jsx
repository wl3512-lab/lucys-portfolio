/* global React */

function WorkSection({ projects, onOpen }) {
  var spotlight = projects.find(function(p) { return p.spotlight; }) || null;
  var rest = spotlight ? projects.filter(function(p) { return !p.spotlight; }) : projects;
  var spotlightHref = spotlight
    ? (spotlight.detailPage || ('case-study.html?slug=' + encodeURIComponent(spotlight.slug || spotlight.id)))
    : '';

  return (
    <section className="work" id="work" data-screen-label="02 Work">
      <div className="work-inner">
        <header className="work-header">
          <div className="work-h-bar-meta">
            <span className="work-h-idx">02</span>
            <span className="work-h-rule" aria-hidden="true" />
            <span className="work-h-label">Selected Work</span>
          </div>
          <span className="work-header-count">{String(projects.length).padStart(2,'0')} projects</span>
        </header>

        {spotlight && (
          <a
            href={spotlightHref}
            className="work-spotlight"
            aria-label={'View project: ' + spotlight.title}
            onClick={() => onOpen?.(spotlight)}
          >
            <div className="work-spotlight-img">
              {spotlight.cover
                ? <img src={spotlight.cover} alt={spotlight.title} loading="lazy" />
                : <div className="work-spotlight-img-fallback"><span>{spotlight.title[0]}</span></div>
              }
              <div className="work-spotlight-img-overlay" aria-hidden="true" />
            </div>
            <div className="work-spotlight-body">
              <div className="work-spotlight-eyebrow">
                <span className="work-spotlight-live" aria-label="currently active">live</span>
                <span>Currently</span>
              </div>
              <h3 className="work-spotlight-title">{spotlight.title}</h3>
              <p className="work-spotlight-sub">{spotlight.subtitle}</p>
              <div className="work-spotlight-tags">
                {spotlight.tags.slice(0, 3).map(t => <span key={t} className="tag tag-sm">{t}</span>)}
              </div>
              <div className="work-spotlight-foot">
                <span className="work-spotlight-year">{spotlight.year}{spotlight.role ? ' · ' + spotlight.role : ''}</span>
                <span className="work-spotlight-arrow" aria-hidden="true">View project ↗</span>
              </div>
            </div>
          </a>
        )}

        <div className="work-grid">
          {rest.map((p, i) => {
            const num = String(i + 1).padStart(2, '0');
            const href = p.detailPage
              ? p.detailPage
              : `case-study.html?slug=${encodeURIComponent(p.slug || p.id)}`;
            return (
              <a
                key={p.id}
                href={href}
                className="work-card"
                data-cursor="view ↗"
                aria-label={`View case study: ${p.title}`}
                onClick={() => onOpen?.(p)}
              >
                <div className="work-card-cover">
                  {p.cover
                    ? <img src={p.cover} alt={p.title} loading="lazy" />
                    : <div className="work-card-cover-fallback"><span>{p.title[0]}</span></div>
                  }
                  <div className="work-card-aura" aria-hidden="true" />
                </div>

                <div className="work-card-body">
                  <div className="work-card-top">
                    <div className="work-card-tags">
                      {p.tags.slice(0, 3).map(t => <span key={t} className="tag tag-sm">{t}</span>)}
                    </div>
                    <span className="work-card-num" aria-hidden="true">{num}</span>
                  </div>

                  <h3 className="work-card-title">{p.title}</h3>
                  <p className="work-card-sub">{p.subtitle || p.description}</p>

                  <footer className="work-card-foot">
                    <span className="work-card-year">{p.year}{p.role ? ' · ' + p.role : ''}</span>
                    <span className="work-card-link" aria-hidden="true">↗</span>
                  </footer>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

window.WorkSection = WorkSection;
