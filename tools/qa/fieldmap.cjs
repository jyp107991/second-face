// The field map drawn from the world: relief, sea, river, the Line, known ways, and where you stand.
// node tools/qa/fieldmap.cjs <outdir>
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
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('low'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(7, {}), 'they', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  // Early game: the Cistern and Shale known, standing on the track between them.
  await page.evaluate(async () => { game.state.flags.c9_door_open = true; await game.loadLocation('c9_mouth', 'door'); game.player.place(5560, 4470); game.state.locationId = 'wild:sallow'; });
  await page.evaluate(() => game.emit('openMap', {}));
  await page.waitForFunction(() => !!document.querySelector('.map-canvas'), null, { timeout: 20000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: path.join(out, 'map_1_early.png'), timeout: 180000 });
  console.log('early map drawn');
  await page.keyboard.press('Escape');
  // Later: most of the Reach known.
  await page.evaluate(() => { const w = game.state.world; w.knownLocations = Object.keys(SF.WORLD_MAP.locations).filter((id) => !SF.WORLD_MAP.locations[id].hidden); });
  await page.evaluate(() => game.emit('openMap', {}));
  await page.waitForFunction(() => !!document.querySelector('.map-canvas'), null, { timeout: 20000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(out, 'map_2_reach.png'), timeout: 180000 });
  console.log('full map drawn');
  await browser.close();
})();
