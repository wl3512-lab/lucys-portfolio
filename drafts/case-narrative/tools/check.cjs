// Load a case study at 1440 x 900 and 390 x 844: words, structure, console errors, failed requests, sideways
// scroll, the hero under reduced motion, full-page screenshots. Chromium always; WebKit too where it is installed.
//   node drafts/case-narrative/tools/check.cjs <page.html> <out-dir> [--before]
// BASE (default http://127.0.0.1:8931) is the site root being served. --before skips the narrative checks.
const { chromium, webkit } = require('playwright');
const fs = require('fs');
const [page, out = '.', flag] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://127.0.0.1:8931';
const SIZES = [
  ['laptop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: +(process.env.DSF || 1) }],
  ['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: +(process.env.DSF || 1), isMobile: true, hasTouch: true }],
];
// The narrative order (case-narrative.css): every section carries data-nr; process sections may repeat.
const ORDER = ['hero', 'over', 'prob', 'hmw', 'goal', 'proc', 'res', 'learn', 'credit', 'next'];
// edit-mode.js is Lucy's localhost-only editor, loaded on 127.0.0.1 and never deployed.
const ignore = u => /fonts\.g|\/_vercel\/|\/edit-mode\.js/.test(u);

async function run(browserType, name) {
  let b; try { b = await browserType.launch(); } catch (e) { console.log(`${name}: not installed here (${e.message.split('\n')[0]})`); return true; }
  let ok = true;
  for (const [size, opts] of SIZES) for (const motion of ['no-preference', 'reduce']) {
    const ctx = await b.newContext({ ...opts, reducedMotion: motion });
    const pg = await ctx.newPage();
    const errs = [], fails = [];
    pg.on('pageerror', e => errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error' && !ignore(m.text()) && !ignore(m.location().url || '')) errs.push(m.text()); });
    pg.on('requestfailed', r => { if (!ignore(r.url()) && !/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(r.failure()?.errorText || '')) fails.push(r.url() + ' ' + r.failure()?.errorText); });
    pg.on('response', r => { if (r.status() >= 400 && !ignore(r.url())) fails.push(r.status() + ' ' + r.url()); });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' });
    await pg.waitForTimeout(2800);                      // past the trailer's 2 s start
    // Every video on the page: under reduced motion each must rest on its poster.
    const hero = await pg.evaluate(() => [...document.querySelectorAll('main video')].map(v => ({ paused: v.paused, t: +v.currentTime.toFixed(2), poster: !!v.poster })));
    const h = await pg.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) { await pg.evaluate(v => scrollTo(0, v), y); await pg.waitForTimeout(60); }
    await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(600);
    const m = await pg.evaluate((ORDER) => {
      const main = document.querySelector('main');
      const words = main.innerText.trim().split(/\s+/).length;
      const sideways = document.documentElement.scrollWidth > innerWidth + 1;
      const wide = [...main.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).slice(0, 3).map(e => e.tagName + '.' + e.className);
      const order = [...main.querySelectorAll('[data-nr]')].map(e => e.dataset.nr);
      // Pictures in one row: figures of a .nr-media sharing a top edge. Small screens may go three across (.nr-grid3),
      // a matched pair two; everything else is one picture per row, full width.
      const rows = [...main.querySelectorAll('.nr-media')].map(g => {
        const tops = {}; [...g.children].forEach(f => { const t = Math.round(f.getBoundingClientRect().top); tops[t] = (tops[t] || 0) + 1; });
        const most = Math.max(0, ...Object.values(tops));
        const max = g.classList.contains('nr-grid3') ? 3 : g.classList.contains('nr-match') ? 2 : 1;
        return { most, max };
      });
      // The hero cover fills the first screen behind the title (object-fit: cover, as in the reference): not checked for cropping.
      const imgs = [...main.querySelectorAll('img')].map(i => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, alt: i.alt.length, ratio: i.closest('.nr-hero-bg') ? null : i.naturalWidth ? Math.abs(i.getBoundingClientRect().width / i.getBoundingClientRect().height - i.naturalWidth / i.naturalHeight) < 0.02 : null }));
      const marks = main.querySelectorAll('.nr-hmw mark').length;
      const h1 = main.querySelectorAll('h1').length;
      const drafts = main.querySelectorAll('[data-draft]').length;
      return { words, sideways, wide, order, rows, imgs, marks, h1, drafts, height: document.documentElement.scrollHeight };
    }, ORDER);
    const bad = [], note = [];
    if (errs.length) bad.push('console errors');
    if (fails.length) bad.push('failed requests');
    if (m.sideways) bad.push('sideways scroll ' + JSON.stringify(m.wide));
    if (m.imgs.some(i => !i.ok)) bad.push('broken image');
    if (motion === 'reduce' && hero.some(v => !(v.paused && v.t === 0))) bad.push('a video moves under reduced motion');
    if (flag !== '--before') {
      if (m.words < 400 || m.words > 650) bad.push(`words ${m.words} (want 400-650)`);
      if (JSON.stringify(m.order.filter((v, i, a) => a.indexOf(v) === i)) !== JSON.stringify(ORDER.filter(k => m.order.includes(k)))) bad.push('section order ' + m.order.join(','));
      for (const k of ORDER) if (k !== 'credit' && !m.order.includes(k)) bad.push('missing ' + k);
      if (!m.order.includes('credit')) note.push('no credits section (the old page states no AI use)');
      if (m.rows.some(r => r.most > r.max)) bad.push('too many pictures in a row ' + JSON.stringify(m.rows));
      if (m.marks < 1 || m.marks > 2) bad.push(`HMW marks ${m.marks}`);
      if (m.h1 !== 1) bad.push('h1 count ' + m.h1);
      if (m.imgs.some(i => i.alt === 0 && i.src && !/him/.test(i.src))) bad.push('image without alt');
      if (m.imgs.some(i => i.ratio === false)) bad.push('cropped or stretched image');
    }
    if (bad.length) ok = false;
    console.log(`${name} ${size} motion=${motion}: words=${m.words} height=${m.height} drafts=${m.drafts || 0} hero=${JSON.stringify(hero)} ${bad.length ? 'FAIL ' + bad.join('; ') : 'ok'}${note.length ? ' (note: ' + note.join('; ') + ')' : ''}`);
    if (errs.length) console.log('  errors:', JSON.stringify(errs.slice(0, 5)));
    if (fails.length) console.log('  fails:', JSON.stringify(fails.slice(0, 8)));
    if (motion === 'no-preference' && name === 'chromium') {
      const base = `${out}/${page.replace(/\.html$/, '')}${flag === '--before' ? '-before' : ''}-${size}`;
      await pg.screenshot({ path: `${base}-full.png`, fullPage: true });
      await pg.screenshot({ path: `${base}-first-screen.png` });
    }
    await ctx.close();
  }
  await b.close();
  return ok;
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const a = await run(chromium, 'chromium');
  const w = await run(webkit, 'webkit');
  process.exit(a && w ? 0 : 1);
})();
