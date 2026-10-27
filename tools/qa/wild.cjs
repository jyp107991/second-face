// The ground between places: stand just outside three places (three regions) and look. node tools/qa/wild.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(7, {}), 'they', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(() => { const g = game.state; g.flags.ch1_done = true; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 11 * 60; });
  for (const [id, side, dist] of [['c9_mouth', 'e', 10], ['shale', 'w', 12], ['ninebridge', 'e', 14], ['openfield', 'n', 12]]) {
    await page.evaluate(async (id) => { await game.loadLocation(id, 'start'); }, id);
    await page.evaluate(([side, dist]) => {
      const p = SF.sitePlacement(game.state.locationId);
      const x = side === 'w' ? p.x - dist : side === 'e' ? p.x + p.w + dist : p.x + Math.floor(p.w / 2);
      const z = side === 'n' ? p.z - dist : side === 's' ? p.z + p.h + dist : p.z + Math.floor(p.h / 2);
      game.player.place(x, z); game.cam.recentre();
    }, [side, dist]);
    await page.waitForFunction(() => game.world.chunks.size >= 8, null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(out, `wild_${id}.png`), timeout: 180000 });
    console.log(id, await page.evaluate(() => `${game.state.locationId} chunks=${game.world.chunks.size} draws=${game.perf().draws}`));
  }
  await browser.close();
})();
