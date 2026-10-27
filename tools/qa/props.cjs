// Real props in places: Shale's street, the Old Market, a Meridian flat. node tools/qa/props.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(7, {}), 'they', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(() => { const g = game.state; g.flags.ch1_done = true; g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 11 * 60; });
  for (const [id, lx, lz, zoom] of [['shale', 31, 28, 0.6], ['md_market', 36, 28, 0.6], ['overpass', 30, 23, 0.6], ['drywells', 28, 24, 0.6]]) {
    await page.evaluate(async (id) => { await game.loadLocation(id, 'start'); }, id);
    await page.waitForFunction(() => game.world.ringComplete(game.player.tx, game.player.ty), null, { timeout: 120000 }).catch(() => {});
    await page.evaluate(([lx, lz, zoom]) => { game.placeLocal(lx, lz); game.cam.target.copy(game.player.object.position); game.cam.recentre(); game.cam.snapToTarget(); game.cam.zoomBy(zoom); }, [lx, lz, zoom]);
    await page.waitForTimeout(6000);
    await page.evaluate(() => { game.cam.target.copy(game.player.object.position); game.cam.snapToTarget(); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, `props_${id}.png`), timeout: 180000 });
    console.log(id, await page.evaluate(() => { const s = game.siteHere(); let props = 0, meshes = 0; s.built.root.traverse((o) => { if (o.name?.startsWith('prop ')) { props += o.userData.count ?? 0; meshes++; } }); return `modelProps=${s.built.modelProps.length} drawn=${props} propMeshes=${meshes} draws=${game.perf().draws}`; }));
    await page.evaluate((zoom) => game.cam.zoomBy(1 / zoom), zoom);
  }
  await browser.close();
})();
