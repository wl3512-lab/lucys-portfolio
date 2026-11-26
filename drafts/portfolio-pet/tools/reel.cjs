// node reel.cjs <outDir> [query]  → outDir/f0000.png … f0359.png
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, q = ''] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await pg.goto('' + (process.env.BASE || 'http://127.0.0.1:8931') + '/_reel/reel.html' + q, { waitUntil: 'load' });
  await pg.evaluate(() => window.ready);
  for (let i = 0; i < 360; i++) {
    const data = await pg.evaluate(n => { renderAt(n); return document.getElementById('c').toDataURL('image/png'); }, i);
    fs.writeFileSync(`${out}/f${String(i).padStart(4, '0')}.png`, Buffer.from(data.split(',')[1], 'base64'));
  }
  await b.close();
})();
