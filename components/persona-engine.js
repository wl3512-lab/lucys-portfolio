/* Persona engine (framework-free) — the "Who are you viewing as?" gate for case studies.
   On every case-study load it asks the reader to pick a persona, then tailors the page:
   injects a persona intro card, re-sequences the cs-body sections, and emphasises /
   de-emphasises sections per components/persona-content.js. A persistent chip lets the
   reader switch personas. Skippable to the full study. Exposed as window.PersonaEngine.

   Robustness notes:
   - Pure DOM + CSS; no framework. Returns early if no content for this page's slug.
   - Section grouping follows the cs- convention: a cs-body child whose id is cs-s-<key>
     starts a section; following non-id'd children belong to it.
   - Reordering is a cross-fade (no FLIP) to stay smooth without fighting ScrollTrigger;
     ScrollTrigger.refresh() is called after if GSAP is present. */
(function () {
  'use strict';

  var PERSONAS = [
    { key: 'recruiter', label: 'Recruiter', hint: 'Impact, role, outcomes' },
    { key: 'designer',  label: 'Designer',  hint: 'Process, research, craft' },
    { key: 'engineer',  label: 'Engineer',  hint: 'Stack, build, constraints' },
    { key: 'browsing',  label: 'Just browsing', hint: 'The short, fun version' }
  ];

  var SECTION_LABELS = {
    hero: 'Intro', problem: 'The Problem', research: 'Research',
    solution: 'Solution', visual: 'Visual System', outcome: 'Outcome', reflection: 'Reflection',
    interaction: 'Interaction', technical: 'Technical', impact: 'Impact',
    design: 'Design', mechanics: 'Mechanics', storyboard: 'Storyboard',
    interface: 'Interface', engine: 'Engine', endings: 'Endings', principles: 'Design Principles'
  };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  ready(function () {
    var slug = document.body.getAttribute('data-persona-slug');
    var data = (window.PERSONA_CONTENT && slug) ? window.PERSONA_CONTENT[slug] : null;
    if (!data) return;

    var SKEY = 'lucy.persona'; // session memory: ONE global choice, remembered across every project

    var reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    var bodyWrap = document.querySelector('.cs-body');

    // ---- group the reorderable sections (cs-s-<key> + trailing continuation blocks) ----
    var groups = {}; // key -> [elements]
    var groupKeys = [];
    if (bodyWrap) {
      var cur = null;
      Array.prototype.forEach.call(bodyWrap.children, function (ch) {
        var id = ch.id || '';
        var m = id.match(/^cs-s-(.+)$/);
        if (m) { cur = m[1]; groups[cur] = [ch]; groupKeys.push(cur); }
        else if (cur && groups[cur]) { groups[cur].push(ch); }
      });
    }

    // ---------- modal (terminal) ----------
    var overlay = null, lastFocus = null, availKeys = [], rows = [], selIdx = 0, typeTimer = null;

    function setSel(i) {
      selIdx = i;
      rows.forEach(function (r, j) { r.classList.toggle('is-sel', j === i); });
    }

    function typeText(node, text, speed, onDone) {
      var i = 0; node.textContent = '';
      typeTimer = setInterval(function () {
        node.textContent = text.slice(0, i + 1); i++;
        if (i >= text.length) { clearInterval(typeTimer); typeTimer = null; if (onDone) onDone(); }
      }, speed);
    }

    function openModal() {
      if (overlay) return;
      lastFocus = document.activeElement;
      rows = []; availKeys = []; selIdx = 0;

      overlay = el('div', 'persona-overlay');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'persona-q');

      var term = el('div', 'persona-term');

      var bar = el('div', 'persona-term-bar');
      bar.innerHTML = '<span class="persona-term-dots"><i class="d-r"></i><i class="d-y"></i><i class="d-g"></i></span>' +
                      '<span class="persona-term-title">lucy@lit-archive: ~/' + (slug || 'case-study') + '</span>';
      term.appendChild(bar);

      var sr = el('h2', 'persona-q sr-only', 'Who are you viewing this as?'); sr.id = 'persona-q';
      term.appendChild(sr);

      var body = el('div', 'persona-term-body');
      term.appendChild(body);

      var l1 = el('p', 'persona-term-line');
      l1.innerHTML = '<span class="tprompt">lucy@lit-archive</span> <span class="tpath">~</span> % <span class="tcmd"></span><span class="persona-caret type-caret"></span>';
      body.appendChild(l1);

      var l2 = el('p', 'persona-term-out reveal'); l2.textContent = '// this case study re-sequences for whoever is reading.';
      body.appendChild(l2);
      var l3 = el('p', 'persona-term-out reveal'); l3.textContent = 'select a lens:';
      body.appendChild(l3);

      var menu = el('div', 'persona-term-menu');
      PERSONAS.forEach(function (p) {
        if (!data[p.key]) return;
        var idx = availKeys.length; availKeys.push(p.key);
        var b = el('button', 'persona-trow reveal'); b.type = 'button';
        b.setAttribute('data-persona', p.key);
        b.innerHTML = '<span class="tsel" aria-hidden="true">&gt;</span>' +
                      '<span class="tnum">' + (idx + 1) + '</span>' +
                      '<span class="tname">' + p.label + '</span>' +
                      '<span class="thint">' + p.hint + '</span>';
        b.addEventListener('click', function () { applyPersona(p.key); });
        b.addEventListener('mouseenter', function () { setSel(idx); });
        menu.appendChild(b); rows.push(b);
      });
      body.appendChild(menu);

      var foot = el('p', 'persona-term-foot reveal');
      foot.innerHTML = '<span class="tprompt">$</span> <span class="persona-caret"></span>';
      body.appendChild(foot);

      var skip = el('button', 'persona-term-skip reveal', 'esc — skip, explore the full study');
      skip.type = 'button'; skip.addEventListener('click', closeModal);
      body.appendChild(skip);

      var help = el('p', 'persona-term-help reveal', '↑↓ move   ·   1–4 jump   ·   enter select');
      body.appendChild(help);

      overlay.appendChild(term);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKey);
      // Only go opaque once the mono webfont can actually paint. `is-in` turns on a
      // full-viewport dark backdrop + blur; if it lands while the terminal text is
      // still in FOIT, the whole first viewport reads as a blank dark screen.
      // Capped so a slow/failed font load can never withhold the prompt.
      var showOverlay = function () {
        if (!overlay || overlay.classList.contains('is-in')) return;
        requestAnimationFrame(function () { if (overlay) overlay.classList.add('is-in'); });
      };
      if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(showOverlay);
        setTimeout(showOverlay, 600);
      } else {
        showOverlay();
      }

      var cmd = l1.querySelector('.tcmd');
      var typeCaret = l1.querySelector('.type-caret');
      var reveals = [l2, l3].concat(rows).concat([foot, skip, help]);
      var showAll = function () {
        reveals.forEach(function (n, k) { n.style.transitionDelay = (k * 0.05) + 's'; n.classList.add('is-shown'); });
        setSel(0);
        if (rows[0]) rows[0].focus();
      };

      if (reduced) {
        cmd.textContent = 'whoami';
        if (typeCaret) typeCaret.style.display = 'none';
        reveals.forEach(function (n) { n.classList.add('is-shown'); });
        setSel(0); if (rows[0]) rows[0].focus();
      } else {
        setTimeout(function () {
          if (!overlay) return;
          typeText(cmd, 'whoami', 55, function () {
            if (typeCaret) typeCaret.style.display = 'none';
            setTimeout(function () { if (overlay) showAll(); }, 170);
          });
        }, 280);
      }
    }

    function onKey(e) {
      if (!overlay) return;
      if (e.key === 'Escape') { closeModal(); return; }
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= availKeys.length) { e.preventDefault(); applyPersona(availKeys[n - 1]); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (rows.length) { setSel((selIdx + 1) % rows.length); rows[selIdx].focus(); } return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) { setSel((selIdx - 1 + rows.length) % rows.length); rows[selIdx].focus(); } return; }
      if (e.key === 'Enter') { if (rows[selIdx] && availKeys[selIdx]) { e.preventDefault(); applyPersona(availKeys[selIdx]); return; } }
      if (e.key === 'Tab') {
        var f = overlay.querySelectorAll('button');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    function closeModal() {
      if (!overlay) return;
      try { sessionStorage.setItem(SKEY, document.body.getAttribute('data-persona-active') || '__skip__'); } catch (e) {}
      if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
      document.removeEventListener('keydown', onKey);
      var o = overlay; overlay = null;
      o.classList.remove('is-in');
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 260);
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    }

    // ---------- intro card ----------
    function removeIntro() {
      var old = document.getElementById('persona-intro');
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }

    function buildIntro(key, p) {
      var meta = PERSONAS.filter(function (x) { return x.key === key; })[0] || { label: key };
      var card = el('section', 'persona-intro', '');
      card.id = 'persona-intro';
      var head = el('div', 'persona-intro-head');
      head.appendChild(el('span', 'persona-intro-badge', '<span class="pi-mark" aria-hidden="true">▸</span> viewing as <strong>' + meta.label + '</strong>'));
      var change = el('button', 'persona-intro-change', 'Switch');
      change.type = 'button';
      change.addEventListener('click', openModal);
      head.appendChild(change);
      card.appendChild(head);
      card.appendChild(el('p', 'persona-intro-blurb', p.blurb));

      if (p.order && p.order.length) {
        var nav = el('div', 'persona-intro-nav');
        nav.appendChild(el('span', 'persona-intro-nav-label', 'In this view'));
        var list = el('ol', 'persona-intro-list');
        p.order.forEach(function (k) {
          if (!groups[k]) return;
          var li = el('li', null, '');
          var a = el('a', 'persona-jump', SECTION_LABELS[k] || k);
          a.href = '#cs-s-' + k;
          if (p.emphasize && p.emphasize.indexOf(k) >= 0) a.className += ' is-key';
          li.appendChild(a);
          list.appendChild(li);
        });
        if (list.children.length) { nav.appendChild(list); card.appendChild(nav); }
      }
      return card;
    }

    /* ---------- constellation resync ----------
       The right-rail constellation dots sit at fixed geometric positions and were
       authored in document order. Reordering the sections for a persona moves the
       sections but not the dots, so scrolling would light them out of sequence
       (jumping 5 -> 4 -> 3 -> 2 -> 6 for the engineer view, say). Reassign each dot
       to whichever section now occupies its slot, top to bottom, so the rail always
       reads downward as you scroll. Geometry never moves; only the bindings do.
       Captured once at load, since after the first swap the DOM order has changed. */
    var constDots = [], constLabels = [], constText = {};
    (function captureConstellation() {
      var nav = document.getElementById('cs-section-nav');
      if (!nav) return;
      constDots = [].slice.call(nav.querySelectorAll('.cs-const-g[data-snav]'));
      constLabels = [].slice.call(nav.querySelectorAll('.cs-const-label-el[data-label]'));
      constLabels.forEach(function (l) { constText[l.dataset.label] = l.textContent; });
    })();

    function syncConstellation() {
      if (!constDots.length) return;
      var order = [].slice.call(document.querySelectorAll('[id^="cs-s-"]'))
                    .map(function (n) { return n.id; });
      if (order.length !== constDots.length) return; // shape changed unexpectedly; leave as authored
      constDots.forEach(function (g, i) { g.dataset.snav = order[i]; });
      constLabels.forEach(function (l, i) {
        l.dataset.label = order[i];
        if (constText[order[i]]) l.textContent = constText[order[i]];
      });
    }

    // ---------- apply ----------
    function applyPersona(key, instant) {
      var p = data[key];
      if (!p) { closeModal(); return; }
      document.body.setAttribute('data-persona-active', key);

      var doSwap = function () {
        removeIntro();
        // emphasis / dim on every element in each group
        Object.keys(groups).forEach(function (k) {
          var keyMatch = p.emphasize && p.emphasize.indexOf(k) >= 0;
          var dimMatch = p.dim && p.dim.indexOf(k) >= 0;
          groups[k].forEach(function (node) {
            node.classList.remove('persona-emph', 'persona-dim');
            if (keyMatch) node.classList.add('persona-emph');
            else if (dimMatch) node.classList.add('persona-dim');
          });
        });
        // reorder groups within cs-body
        if (bodyWrap && p.order) {
          p.order.forEach(function (k) {
            if (groups[k]) groups[k].forEach(function (node) { bodyWrap.appendChild(node); });
          });
          // any groups not named in order keep their relative order at the end
          groupKeys.forEach(function (k) {
            if (p.order.indexOf(k) < 0 && groups[k]) groups[k].forEach(function (node) { bodyWrap.appendChild(node); });
          });
        }
        // intro card on top
        if (bodyWrap) bodyWrap.insertBefore(buildIntro(key, p), bodyWrap.firstChild);
        syncConstellation();
        if (window.ScrollTrigger && window.ScrollTrigger.refresh) {
          try { window.ScrollTrigger.refresh(); } catch (e) {}
        }
      };

      setChip(key);
      closeModal();

      if (instant || reduced || !bodyWrap) { doSwap(); if (!instant) window.scrollTo(0, 0); return; }
      bodyWrap.classList.add('persona-swapping');
      setTimeout(function () {
        doSwap();
        window.scrollTo(0, 0);
        requestAnimationFrame(function () { bodyWrap.classList.remove('persona-swapping'); });
      }, 170);
    }

    // ---------- switcher chip ----------
    var chip = null;
    function setChip(key) {
      if (!chip) {
        chip = el('button', 'persona-chip');
        chip.type = 'button';
        chip.addEventListener('click', openModal);
        document.body.appendChild(chip);
      }
      if (key) {
        var meta = PERSONAS.filter(function (x) { return x.key === key; })[0] || { label: key };
        chip.setAttribute('aria-label', 'Change viewing persona');
        chip.innerHTML = '<span class="persona-chip-dot" aria-hidden="true"></span>' +
                         '<span class="persona-chip-text">Viewing as <strong>' + meta.label + '</strong></span>' +
                         '<span class="persona-chip-edit" aria-hidden="true">switch</span>';
      } else {
        chip.setAttribute('aria-label', 'Tailor this case study');
        chip.innerHTML = '<span class="persona-chip-dot" aria-hidden="true"></span>' +
                         '<span class="persona-chip-text">Tailor this case study</span>';
      }
      requestAnimationFrame(function () { chip.classList.add('is-in'); });
    }

    window.PersonaEngine = { open: openModal, apply: applyPersona };

    // Once per session per case study: pop the terminal on first visit, then remember
    // the choice. On later visits this session, silently re-apply the lens (no popup);
    // if it was dismissed, show a "tailor this" chip so it's still reachable.
    var seen = null;
    try { seen = sessionStorage.getItem(SKEY); } catch (e) {}
    if (seen && seen !== '__skip__' && data[seen]) {
      applyPersona(seen, true);
    } else if (seen === '__skip__') {
      setChip(null);
    } else {
      openModal();
    }
  });
})();
