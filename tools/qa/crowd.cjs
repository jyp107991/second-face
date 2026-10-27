// Crowd scene screenshots at two zoom levels: node tools/qa/crowd.cjs <outdir> [prefix]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.', prefix = process.argv[3] || 'crowd';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); await game.loadLocation('bench_crowd', 'start'); });
  await page.waitForTimeout(6000);
  for (const view of [9, 20]) {
    await page.evaluate((v) => { game.cam.viewGoal = v; game.cam.viewHeight = v; }, view);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, `${prefix}_v${view}.png`), timeout: 180000 });
    console.log(view, await page.evaluate(() => JSON.stringify(game.perf())));
  }
  await browser.close();
})();
