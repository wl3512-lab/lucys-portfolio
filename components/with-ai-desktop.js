/* With AI: click a window to select it, then open its project. Today, Internship agent and the creature open
 * full-size inside the computer. One Notes window contains Process, Decisions and Results tabs. Phone apps open
 * content with one tap. Keyboard focus follows window selection; Close and Escape restore the previous view.
 * Preview reels still respond to hover or focus, without changing window order. Without JS all content is readable.
 */
(function () {
  function mount(root) {
    if (!root || root.__desk) return root && root.__desk;
    var wins = [].slice.call(root.querySelectorAll('.dk-win'));
    var builds = wins.filter(function (w) { return !w.classList.contains('dk-doc'); });
    var docs = wins.filter(function (w) { return w.classList.contains('dk-doc'); });
    var folds = [].slice.call(root.querySelectorAll('.dk-fold'));
    var zTop = wins.length + 1;
    var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    var small = function () { return window.innerWidth <= 760; };
    var coarse = function () { return mq('(pointer: coarse)') || small(); };
    var lastBuild = root.querySelector('.dk-win.is-front') || builds[builds.length - 1];
    var openers = {};
    var note = root.querySelector('#dk-d-bench');
    var noteTabs = [].slice.call(root.querySelectorAll('[data-note-tab]'));
    var notePanels = [].slice.call(root.querySelectorAll('[data-note-panel]'));

    function noteTab(key, focus) {
      noteTabs.forEach(function (tab) {
        var on = tab.getAttribute('data-note-tab') === key;
        tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1;
        if (on && focus) tab.focus({ preventScroll: true });
      });
      notePanels.forEach(function (panel) { panel.hidden = panel.getAttribute('data-note-panel') !== key; });
      if (note) { note.classList.toggle('is-process', key === 'process'); note.querySelector('.dk-body').scrollTop = 0; }
      relayout();
    }
    noteTabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { noteTab(tab.getAttribute('data-note-tab')); });
      tab.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? (i + 1) % noteTabs.length : e.key === 'ArrowLeft' ? (i + noteTabs.length - 1) % noteTabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? noteTabs.length - 1 : -1;
        if (n < 0) return;
        e.preventDefault(); noteTab(noteTabs[n].getAttribute('data-note-tab'), true);
      });
    });
    if (noteTabs.length) { noteTab('process'); root.querySelector('.dk-note-tabs').hidden = false; }

    function phoneNote() {
      return small() && docs.filter(function (d) { return !d.hidden && d.classList.contains('is-front'); })[0];
    }
    function syncNotes() {
      var current = phoneNote();
      root.classList.toggle('has-project', docs.some(function (d) { return !d.hidden && d.classList.contains('is-front') && d.hasAttribute('data-project'); }));
      document.body.classList.toggle('dk-note-open', !!current);
      docs.forEach(function (d) {
        if (d === current) { d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); }
        else { d.removeAttribute('role'); d.removeAttribute('aria-modal'); }
      });
    }

    function select(key) {
      folds.forEach(function (f) { f.classList.toggle('is-sel', f.getAttribute('data-w') === key); });
    }
    function front(w, focus) {
      if (!w) return;
      wins.forEach(function (x) { x.classList.toggle('is-front', x === w); });
      w.style.zIndex = ++zTop;
      if (!w.classList.contains('dk-doc')) lastBuild = w;
      select(w.getAttribute('data-w'));
      syncNotes();
      if (focus) {
        var a = w.classList.contains('dk-doc') ? w.querySelector('.dk-body') : w.querySelector('.dk-open');
        if (a) a.focus({ preventScroll: true });
      }
    }
    function byKey(k) {
      for (var i = 0; i < wins.length; i++) if (wins[i].getAttribute('data-w') === k) return wins[i];
      return null;
    }
    function openBuild(w) {
      var link = w && w.querySelector('.dk-open');
      if (link) link.click();
    }
    function relayout() { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }

    function openDoc(d, target, from) {
      if (!d) return;
      var panel = target && target.closest('[data-note-panel]');
      if (panel) noteTab(panel.getAttribute('data-note-panel'));
      if (from) openers[d.id] = from.getClientRects().length ? from : root.querySelector('.dk-fold[data-w="' + d.getAttribute('data-project') + '"]');
      var was = !d.hidden;
      d.hidden = false;
      front(d, true);
      root.classList.add('has-doc');
      var body = d.querySelector('.dk-body');
      if (!was) relayout();   // the bench inside measures itself when its window first shows
      if (body) {
        if (target && target !== d) {
          requestAnimationFrame(function () { body.scrollTop += target.getBoundingClientRect().top - body.getBoundingClientRect().top - 12; });
        } else if (!was) body.scrollTop = 0;
      }
    }
    function closeDoc(d) {
      if (!d || d.hidden) return;
      d.hidden = true;
      var open = docs.filter(function (x) { return !x.hidden; });
      root.classList.toggle('has-doc', open.length > 0);
      var next = open.sort(function (a, b) { return (+b.style.zIndex || 0) - (+a.style.zIndex || 0); })[0] || lastBuild;
      front(next);
      var back = openers[d.id];
      if (next && next.classList.contains('dk-doc')) {
        var body = next.querySelector('.dk-body');
        if (body) body.focus({ preventScroll: true });
      }
      else if (back && document.contains(back) && back.getClientRects().length) back.focus({ preventScroll: true });
      else { var f = root.querySelector('.dk-fold[data-w="' + (d.getAttribute('data-project') || d.getAttribute('data-w')) + '"]'); if (f) f.focus({ preventScroll: true }); }
    }
    function docFor(el) { return el && el.closest ? el.closest('.dk-doc') : null; }

    builds.forEach(function (w) {
      var open = w.querySelector('.dk-open');
      var was = false;
      w.addEventListener('pointerdown', function () {
        was = w.classList.contains('is-front');
        if (!was) front(w);
      }, true);
      w.addEventListener('focusin', function () { if (!w.classList.contains('is-front')) front(w); });
      // A touch or mouse press (event.detail > 0) on a window that was behind only brings it forward.
      if (open) open.addEventListener('click', function (e) { if (e.detail && !was) e.preventDefault(); was = true; });
      var v = w.querySelector('video');
      if (v && window.CoverReel) window.CoverReel(v, w, { arrival: false });
    });
    docs.forEach(function (d) {
      d.hidden = true;
      var body = d.querySelector('.dk-body');
      if (body) body.tabIndex = -1;
      d.addEventListener('pointerdown', function () { if (!d.classList.contains('is-front')) front(d); }, true);
      d.addEventListener('focusin', function () { if (!d.classList.contains('is-front')) front(d); });
      var x = d.querySelector('.dk-x');
      if (x) x.addEventListener('click', function () { closeDoc(d); });
    });

    window.addEventListener('resize', syncNotes);

    folds.forEach(function (f) {
      var w = byKey(f.getAttribute('data-w'));
      var isDoc = w && w.classList.contains('dk-doc');
      var bring = function (focus) {
        if (isDoc) openDoc(w, null, f);
        else if (small()) openBuild(w);
        else front(w, focus);
      };
      f.addEventListener('click', function () { bring(false); });
      f.addEventListener('dblclick', function () { bring(true); });
      f.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bring(!coarse()); }
      });
    });
    [].forEach.call(root.querySelectorAll('[data-open]'), function (b) {
      b.addEventListener('click', function () { openDoc(byKey(b.getAttribute('data-open')), null, b); });
    });

    // A link to anything inside a note opens the note there (the Today and Internship agent windows, the notes' own
    // cross-links). It runs after the window's own handler, which may have kept a press on a back window.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented) return;
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      var el = id && document.getElementById(id);
      var d = docFor(el);
      if (!d) return;
      e.preventDefault();
      openDoc(d, el, a);
    });
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || document.querySelector('dialog[open]')) return;
      var current = phoneNote();
      if (e.key === 'Tab' && current) {
        var items = [].slice.call(current.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex="0"]')).filter(function (el) {
          return !el.disabled && el.getClientRects().length;
        });
        var first = items[0], last = items[items.length - 1], active = document.activeElement;
        if (!items.length) { e.preventDefault(); current.querySelector('.dk-body').focus(); }
        else if (!items.includes(active) || (e.shiftKey && active === first) || (!e.shiftKey && active === last)) {
          e.preventDefault(); (e.shiftKey ? last : first).focus();
        }
        return;
      }
      if (e.key !== 'Escape') return;
      var top = docs.filter(function (x) { return !x.hidden; }).sort(function (a, b) { return (+b.style.zIndex || 0) - (+a.style.zIndex || 0); })[0];
      if (top) { e.preventDefault(); closeDoc(top); }
    });

    var clock = root.querySelector('[data-dk-clock]');
    var timer = 0;
    function tick() {
      if (!clock) return;
      var d = new Date();
      clock.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '') +
        '  ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (clock) { tick(); timer = setInterval(tick, 30000); }

    front(lastBuild);
    function fromHash() {
      var id = decodeURIComponent((location.hash || '').slice(1));
      if (!id) return;
      var m = /^dk-w-([a-z-]+)$/.exec(id);
      var w = m && byKey(m[1]);
      if (w) { front(w); if (small()) { openBuild(w); return; } }
      else { var el = document.getElementById(id), d = docFor(el); if (d) openDoc(d, el); else return; }
      // land on the whole computer, its menu bar at the top
      var bring = function () { root.scrollIntoView({ block: 'start' }); };
      requestAnimationFrame(bring);
      if (!window.__loaderExited && document.getElementById('ll-loader')) window.addEventListener('loader:exit', function () { requestAnimationFrame(bring); }, { once: true });
    }
    fromHash();
    window.addEventListener('hashchange', fromHash);
    root.classList.add('is-live');
    root.__desk = { front: front, select: select, open: openDoc, close: closeDoc, wins: wins, docs: docs, folds: folds, stop: function () { clearInterval(timer); } };
    return root.__desk;
  }

  window.WithAiDesktop = { mount: mount };
  function all() { [].forEach.call(document.querySelectorAll('[data-desktop]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all);
  else all();
})();
