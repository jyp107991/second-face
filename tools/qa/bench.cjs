// Performance benchmark against the dev server: node tools/qa/bench.cjs [quality]
// Loads each scene, settles, then reports the game's perf snapshot (draws, tris, texture/geometry MB, frame ms).
// Headless Chromium runs on swiftshader, so frame times are only comparable between runs on this machine;
// draw calls, triangles and memory are real.
const { chromium } = require('playwright');
(async () => {
  const quality = process.argv[2] || 'medium';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto('http://127.0.0.1:5173/?dev');
  await page.waitForTimeout(9000);
  await page.evaluate((q) => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality(q); }, quality);
  const out = { quality, scenes: {} };
  for (const scene of ['dev_yard', 'bench_crowd', 'combat']) {
    if (scene === 'combat') {
      await page.evaluate(async () => { await game.loadLocation('dev_yard', 'start'); for (let k = 0; k < 4; k++) document.querySelector('.dev-toggle') && game.spawn({ def: 'dev_raider', x: 10 + k, y: 6, id: 'r' + k }); });
    } else await page.evaluate(async (s) => { await game.loadLocation(s, 'start'); }, scene);
    await page.waitForTimeout(8000);
    out.scenes[scene] = await page.evaluate(() => game.perf());
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
