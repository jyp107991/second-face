// The ways across the land: a track, a road, the Line, the river, the coast, and the far ground when zoomed out.
// node tools/qa/ways.cjs <outdir>
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
  await page.evaluate(() => { const g = game.state; g.flags.ch1_done = true; g.flags.c9_door_open = true; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 10 * 60; });
  await page.evaluate(async () => { await game.loadLocation('c9_mouth', 'door'); });
  // Stand on the ways themselves (they wander): the middle of a track, a road, the Line, the river's bank.
  const on = await page.evaluate(() => {
    const w = SF.ways();
    const mid = (x) => x.pts[Math.floor(x.pts.length / 2)];
    const rail = mid(w.find((x) => x.kind === 'rail')), road = mid(w.find((x) => x.kind === 'road')), river = mid(w.filter((x) => x.kind === 'river')[1]);
    return { rail: [Math.round(rail[0]), Math.round(rail[1]) + 4], road: [Math.round(road[0]) + 3, Math.round(road[1])], river: [Math.round(river[0]) + 26, Math.round(river[1])] };
  });
  const spots = [
    ['track_to_shale', 5550, 4452, 1.0],
    ['road', on.road[0], on.road[1], 1.0],
    ['rail', on.rail[0], on.rail[1], 1.0],
    ['river', on.river[0], on.river[1], 1.0],
    ['coast', 440, 5040, 1.0],
    ['far_zoom_out', 5550, 4452, 2.6],
  ];
  for (const [name, x, z, zoom] of spots) {
    await page.evaluate(([x, z]) => { game.player.place(x, z); game.cam.target.copy(game.player.object.position); game.cam.recentre(); game.cam.snapToTarget(); }, [x, z]);
    await page.waitForFunction(() => game.world.ringComplete(game.player.tx, game.player.ty), null, { timeout: 120000 }).catch(() => {});
    await page.evaluate((zoom) => { game.cam.target.copy(game.player.object.position); game.cam.recentre(); game.cam.snapToTarget(); game.cam.zoomBy(zoom); }, zoom);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { game.cam.target.copy(game.player.object.position); game.cam.snapToTarget(); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, `way_${name}.png`), timeout: 180000 });
    console.log(name, await page.evaluate(() => `${game.state.locationId} h=${game.world.heightAt(game.player.tx + 0.5, game.player.ty + 0.5).toFixed(1)} chunks=${game.world.chunks.size} draws=${game.perf().draws} walk=${game.grid.passable(game.player.tx, game.player.ty)}`));
    await page.evaluate((zoom) => game.cam.zoomBy(1 / zoom), zoom);
  }
  await browser.close();
})();
