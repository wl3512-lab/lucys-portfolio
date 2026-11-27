const { chromium } = require('playwright');
const OUT = process.argv[2] || '_reel/rig'; require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
  if (process.env.LOCAL_CDN) await require('./cdn.cjs')(ctx);   // sandbox only: unpkg/cdnjs blocked
  const pg = await ctx.newPage();
  pg.on('console', m => { if (m.type() === 'error') console.error('console:', m.text().slice(0, 200)); });
  await pg.goto('' + (process.env.BASE || 'http://127.0.0.1:8931') + '/portfolio-creature.html', { waitUntil: 'load' });
  await pg.addStyleTag({ content: '[data-site-header],header[data-site-header],.page-loader,[class*=loader],.cr-rig .rig-hint{display:none!important}' });
  const fig = pg.locator('[data-rig-viewer]').first();
  await fig.scrollIntoViewIfNeeded();
  await pg.waitForFunction(() => document.querySelector('[data-rig-viewer]').classList.contains('rig-ready'), null, { timeout: 60000 });
  await pg.waitForTimeout(3500); // let the arrival turn finish
  await pg.evaluate(() => { const h = window.__rigViewer; h.reset(); });
  await pg.waitForTimeout(800);
  const canvas = fig.locator('canvas');
  const N = 48;
  for (const mode of ['colour', 'mesh']) {
    await pg.evaluate(m => window.__rigViewer.setMode(m), mode);
    await pg.waitForTimeout(mode === 'mesh' ? 2500 : 500);
    await pg.evaluate(() => window.__rigViewer.reset()); await pg.waitForTimeout(600);
    for (let i = 0; i < N; i++) {
      await canvas.screenshot({ path: `${OUT}/${mode}-${String(i).padStart(2, '0')}.png` });
      await pg.evaluate(n => { window.__rigViewer.orbit(Math.PI * 2 / n, 0); }, N);
      await pg.waitForTimeout(120);
    }
  }
  console.log(JSON.stringify(await pg.evaluate(() => window.__rigViewer.camera())));
  await b.close();
})();
