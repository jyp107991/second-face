// The lie of the land: the Sallow's dunes outside the Cistern mouth, Shale on its pad, the Teeth, the Drowned Shore.
// node tools/qa/relief.cjs <outdir>
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
  await page.evaluate(() => { const g = game.state; g.flags.ch1_done = true; g.flags.c9_door_open = true; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 15 * 60; });
  await page.evaluate(async () => { await game.loadLocation('c9_mouth', 'door'); });
  const spots = [
    ['sallow_dunes', 5700, 4560, 0.8],
    ['shale_pad', 5420, 4300, 0.8],
    ['teeth', 7600, 2200, 1.0],
    ['shore', 900, 4000, 1.0],
    ['wet_hills', 3600, 1200, 1.0],
  ];
  for (const [name, x, z, zoom] of spots) {
    await page.evaluate(([x, z]) => { game.player.place(x, z); game.cam.target.copy(game.player.object.position); game.cam.recentre(); game.cam.snapToTarget(); }, [x, z]);
    await page.waitForFunction(() => game.world.ringComplete(game.player.tx, game.player.ty), null, { timeout: 120000 }).catch(() => {});
    await page.evaluate((zoom) => { game.cam.target.copy(game.player.object.position); game.cam.recentre(); game.cam.snapToTarget(); game.cam.zoomBy(zoom); }, zoom);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { game.cam.target.copy(game.player.object.position); game.cam.snapToTarget(); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, `relief_${name}.png`), timeout: 180000 });
    console.log(name, await page.evaluate(() => `${game.state.locationId} h=${game.world.heightAt(game.player.tx + 0.5, game.player.ty + 0.5).toFixed(1)} chunks=${game.world.chunks.size} draws=${game.perf().draws} walk=${game.grid.passable(game.player.tx + 3, game.player.ty)}`));
    await page.evaluate((zoom) => game.cam.zoomBy(1 / zoom), zoom);
  }
  await browser.close();
})();
