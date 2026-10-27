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
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate((q) => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality(q); }, quality);
  const out = { quality, scenes: {} };
  for (const scene of ['dev_yard', 'bench_crowd', 'combat']) {
    if (scene === 'combat') {
      await page.evaluate(async () => {
        await game.loadLocation('dev_yard', 'start');
        const p = game.player, defs = ['dev_raider_boss', 'dev_raider', 'dev_raider_knife', 'dev_raider'];
        defs.forEach((def, i) => { for (let r = 0; r < 8; r++) { const x = p.tx + 5 + i, y = p.ty - 4 + r; const st = game.siteHere(); if (st && game.grid.passable(x, y)) { game.spawn({ def, x: x - st.place.x, y: y - st.place.z, id: 'bench_r' + i }, st); break; } } });
        game.startCombat();
      });
    } else await page.evaluate(async (s) => { await game.loadLocation(s, 'start'); }, scene);
    // Wall time of a second load of the same scene (assets cached): figure building + scene setup.
    const loadSceneMs = scene === 'combat' ? 0 : await page.evaluate(async (s) => { const t = performance.now(); await game.loadLocation(s, 'start'); return Math.round(performance.now() - t); }, scene);
    await page.waitForTimeout(8000);
    out.scenes[scene] = { ...(await page.evaluate(() => game.perf())), loadSceneMs };
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
