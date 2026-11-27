const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  if (process.env.LOCAL_CDN) await require('./cdn.cjs')(ctx);
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:8931/portfolio-pet.html', { waitUntil: 'load' });
  await pg.waitForTimeout(1500);
  for (const [id, f] of [['pp-cover-h', 'a'], ['pp-res-h', 'b'], ['pp-learn-h', 'c']]) {
    await pg.evaluate(i => document.getElementById(i).scrollIntoView(), id); await pg.waitForTimeout(700);
    await pg.screenshot({ path: `${process.argv[2]}/ph-${f}.png` });
  }
  await b.close();
})();
