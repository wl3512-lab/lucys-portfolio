const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  for (const [name, opts] of [['laptop', { viewport: { width: 1440, height: 900 } }], ['phone', { ...devices['iPhone 14'] }]]) {
    const ctx = await b.newContext(opts);
    if (process.env.LOCAL_CDN) await require('./cdn.cjs')(ctx);
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.goto('http://127.0.0.1:8931/work-preview.html', { waitUntil: 'load' });
    await pg.waitForTimeout(4000);
    const r = await pg.evaluate(() => ({ idx: [...document.querySelectorAll('.cap-idx')].map(e => e.textContent), front: (document.querySelector('.wi-front, [class*=front]') || {}).textContent, sideways: document.documentElement.scrollWidth > innerWidth }));
    console.log(name, JSON.stringify(r), 'errors', JSON.stringify(errs.filter(e => !/_vercel|404/.test(e)).slice(0, 3)));
    const last = pg.locator('.cover-item').last(); await last.scrollIntoViewIfNeeded(); await last.hover().catch(() => {}); await pg.waitForTimeout(1200);
    await pg.screenshot({ path: `${out}/work-${name}.png` });
    await ctx.close();
  }
  await b.close();
})();
