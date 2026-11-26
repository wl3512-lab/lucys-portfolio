const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  for (const [name, opts] of [['laptop', { viewport: { width: 1440, height: 900 } }], ['phone', { ...devices['iPhone 14'] }]]) {
    const ctx = await b.newContext({ ...opts, ...(name === 'laptop' ? { deviceScaleFactor: 1 } : {}) });
    if (process.env.LOCAL_CDN) await require('./cdn.cjs')(ctx);   // sandbox only: unpkg/cdnjs blocked
    const pg = await ctx.newPage();
    const errs = [], fails = [];
    pg.on('pageerror', e => errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    pg.on('requestfailed', r => fails.push(r.url()));
    pg.on('response', r => { if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1')) fails.push(r.status() + ' ' + r.url()); });
    await pg.goto('' + (process.env.BASE || 'http://127.0.0.1:8931') + '/portfolio-pet.html', { waitUntil: 'load' });
    await pg.waitForTimeout(2500);
    const h = await pg.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 400) { await pg.evaluate(v => scrollTo(0, v), y); await pg.waitForTimeout(80); }
    await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(800);
    const m = await pg.evaluate(() => {
      const main = document.querySelector('main');
      const visible = el => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden'; };
      const words = main.innerText.trim().split(/\s+/).length;
      const vid = document.querySelector('video');
      return { words, height: document.documentElement.scrollHeight, sideways: document.documentElement.scrollWidth > innerWidth, video: vid && { paused: vid.paused, src: vid.currentSrc, w: vid.getBoundingClientRect().width } };
    });
    console.log(name, JSON.stringify(m), 'errors:', JSON.stringify(errs.slice(0, 5)), 'fails:', JSON.stringify(fails.filter(u => !/fonts\.g|_vercel/.test(u)).slice(0, 8)));
    await pg.screenshot({ path: `${out}/pp-${name}.png`, fullPage: true });
    await ctx.close();
  }
  await b.close();
})();
