/* All Work: his file cabinet, eight files (rebuilt 2026-10-31). Lucy: "reduce amount of work shown"; "files all work
 * dont display covers all at once"; "i want full covers shown". She kept the file-cabinet look and asked for every file
 * to show its own whole cover beside its title, visible as you scroll; the single preview window, the phone's docked
 * card, the reading line and the filters went.
 *
 * work.html carries the files: each one link with its cover, title, line and meta. Without this script the page is the
 * same list, unfiled. The script files them in his drawer, by year, newest first, keeping the page's order within a
 * year: a back panel (FILES 2024–2026), year divider tabs, a FILE 01 / 08 tab on each file staggered along its top
 * edge, the drawer front ("That’s all 8", counted from the page, never typed) and him sitting on the cabinet, blinking
 * only while he is on screen and the tab is visible. The two reels rest on their posters and play only while their file
 * is hovered or focused (CoverReel's arrival: false, as the home page's case-study cards did). Nothing runs at rest:
 * no animation-frame loop, no scroll listener.
 * Plain JS, no dependencies. window.WorkIndex holds the pure filing rule (tests/work-index.test.js) and, once mounted,
 * the count the browser check reads (scripts/work-layout-check.mjs). */
(function () {
  'use strict';

  // "Coding + UX Design · 2023–2026 · In progress" -> "2023–2026": the last year or span in the meta.
  function whenOf(meta) {
    var m = String(meta || '').match(/\d{4}(?:\s*[–-]\s*\d{4})?/g);
    return m ? m[m.length - 1] : '';
  }
  // The year a file is filed under is its last.
  function yearOf(meta) {
    var m = whenOf(meta).match(/\d{4}/g);
    return m ? m[m.length - 1] : '';
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // cards: [{ meta, ... }] in the page's order -> { years (newest first), files: [{ card, year, n }] }.
  function file(cards) {
    var years = [];
    cards.forEach(function (c) { var y = yearOf(c.meta); if (years.indexOf(y) < 0) years.push(y); });
    years.sort(function (a, b) { return a === b ? 0 : !a ? 1 : !b ? -1 : a < b ? 1 : -1; });
    var files = [];
    years.forEach(function (y) { cards.forEach(function (c) { if (yearOf(c.meta) === y) files.push({ card: c, year: y }); }); });
    files.forEach(function (f, i) { f.n = pad(i + 1); });
    return { years: years, files: files };
  }
  var api = { whenOf: whenOf, yearOf: yearOf, pad: pad, file: file };
  if (typeof window !== 'undefined') window.WorkIndex = api;
  if (typeof document === 'undefined') return;

  var doc = document, root = doc.documentElement, list = doc.getElementById('wk-grid');
  if (!list || root.classList.contains('work-index-ready')) return;
  var items = Array.from(list.querySelectorAll('.cover-item'));
  if (!items.length) return;

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var HIM = 'assets/with-ai/workshop-him.png', BLINK = 'assets/with-ai/workshop-him-blink.png';
  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var cards = items.map(function (item) {
    return { item: item, idx: item.querySelector('.cap-idx'),
      title: item.querySelector('.cap-title').textContent.trim(), meta: item.querySelector('.cap-meta').textContent.trim() };
  });
  var filed = file(cards), total = filed.files.length, years = filed.years.filter(Boolean);
  var span = years.length ? years[years.length - 1] + (years.length > 1 ? '–' + years[0] : '') : '';

  // The cabinet: the back panel over the drawer, a divider tab per year, the files numbered down the drawer.
  var wrap = list.parentElement;
  var back = el('div', 'wi-back', '<span>FILES ' + span + '</span>');
  back.setAttribute('aria-hidden', 'true');
  wrap.insertBefore(back, list);
  var lastYear = null, k = 0;
  filed.files.forEach(function (f) {
    if (f.year !== lastYear) {
      var d = el('li', 'wi-year', '<span>' + (f.year || 'UNDATED') + '</span>');
      d.setAttribute('aria-hidden', 'true'); d.dataset.year = f.year;
      list.appendChild(d); lastYear = f.year; k = 0;
    }
    var c = f.card;
    c.item.dataset.year = f.year;
    // Tabs stagger along the top edge: left, middle, right (left, right on phones), restarting at each divider.
    c.item.style.setProperty('--x', String(k % 3)); c.item.style.setProperty('--x2', String(k % 2)); k++;
    if (c.idx) c.idx.textContent = 'FILE ' + f.n + ' / ' + pad(total);
    list.appendChild(c.item);
  });

  // The drawer front: a link to the Other work page (Lucy, 2026-11-09: "change this to other work link", then "bring
  // other work at bottom to other work page"; it read "That's all N").
  var end = el('a', 'wi-end', '<span class="wi-plate" aria-hidden="true">WORK</span><span class="wi-end-t">Other work <b aria-hidden="true">→</b></span><i aria-hidden="true"></i>');
  end.href = 'other-work.html';
  wrap.appendChild(end);

  // He sits on top of the cabinet. He blinks every few seconds, only while he is on screen and the tab is visible;
  // reduced motion keeps him still.
  var him = el('img', 'wi-him');
  him.src = HIM; him.alt = ''; him.width = 106; him.height = 120; him.decoding = 'async'; him.setAttribute('aria-hidden', 'true');
  wrap.appendChild(him);
  var onScreen = false, blinkT = 0, eyes = HIM, preloaded = false;
  function eyesTo(src) { if (eyes === src) return; eyes = src; him.src = src; }
  function blink() {
    clearTimeout(blinkT); eyesTo(HIM);
    if (reduce.matches || !onScreen || doc.hidden) return;
    blinkT = setTimeout(function () { eyesTo(BLINK); blinkT = setTimeout(blink, 140); }, 2600 + Math.random() * 2400);
  }
  function seen(v) {
    if (v === onScreen) return;
    onScreen = v;
    if (v && !preloaded) { preloaded = true; new Image().src = BLINK; }
    blink();
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen(es[es.length - 1].isIntersecting); }).observe(him);
  doc.addEventListener('visibilitychange', blink);
  if (reduce.addEventListener) reduce.addEventListener('change', blink);
  window.addEventListener('pagehide', function () { clearTimeout(blinkT); eyesTo(HIM); });
  window.addEventListener('pageshow', function (event) { if (event.persisted) blink(); });

  // The reels rest on their posters; hovering or focusing their file plays them (never under reduced motion).
  if (typeof window.CoverReel === 'function') {
    Array.from(list.querySelectorAll('video[data-cover-reel-hover]')).forEach(function (v) {
      window.CoverReel(v, v.closest('a') || v.parentElement, { arrival: false });
    });
  }

  root.classList.add('work-index-ready');
  api.count = total;
  api.end = end;
  api.onScreen = function () { return onScreen; };
})();
