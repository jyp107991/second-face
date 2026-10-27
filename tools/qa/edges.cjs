// Where a place meets the terrain: four places of different regions, seen from their edge. node tools/qa/edges.cjs <outdir>
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
  await page.evaluate(() => { const g = game.state; g.flags.ch1_done = true; g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 11 * 60; });
  for (const [id, side] of [['shale', 'w'], ['md_market', 's'], ['ninebridge', 'e'], ['openfield', 'n']]) {
    await page.evaluate(async (id) => { await game.loadLocation(id, 'start'); }, id);
    await page.waitForFunction(() => game.world.chunks.size >= 6, null, { timeout: 90000 }).catch(() => {});
    await page.evaluate((side) => {
      const s = game.siteHere(); const p = s.place;
      const x = side === 'w' ? p.x + 1 : side === 'e' ? p.x + p.w - 2 : p.x + Math.floor(p.w / 2);
      const z = side === 'n' ? p.z + 1 : side === 's' ? p.z + p.h - 2 : p.z + Math.floor(p.h / 2);
      game.player.place(x, z); game.cam.recentre(); game.cam.zoomBy(0.6);
    }, side);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(out, `edge_${id}.png`), timeout: 180000 });
    console.log(id, JSON.stringify(await page.evaluate(() => { const p = game.perf(); return { draws: p.draws, tris: p.tris, textureMB: p.textureMB, chunks: game.world.chunks.size, sites: [...game.world.sites.keys()] }; })));
    await page.evaluate(() => game.cam.zoomBy(1 / 0.6));
  }
  await browser.close();
})();
