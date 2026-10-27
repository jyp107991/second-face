// Look check: screenshots of several places at set hours, for before/after comparison of the visual upgrade.
// node tools/qa/look.cjs <outdir> [tag]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SHOTS = [
  { map: 'shale', spawn: 'start', hour: 11, zoom: 1, name: 'shale_noon' },
  { map: 'shale', spawn: 'start', hour: 11, zoom: 0.45, name: 'shale_close' },
  { map: 'drywells', spawn: 'start', hour: 9, zoom: 1, name: 'drywells_morning' },
  { map: 'orchard', spawn: 'start', hour: 17, zoom: 1, name: 'orchard_evening' },
  { map: 'ninebridge', spawn: 'start', hour: 12, zoom: 1, name: 'ninebridge_noon' },
  { map: 'md_market', spawn: 'start', hour: 13, zoom: 1, name: 'market_noon' },
  { map: 'md_lantern', spawn: 'start', hour: 22, zoom: 1, name: 'lantern_night' },
  { map: 'md_crown', spawn: 'terraces', hour: 15, zoom: 1, name: 'crown_afternoon' },
];

(async () => {
  const out = process.argv[2] || '.';
  const tag = process.argv[3] || '';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 300)); } });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(23, { frame: 'broad' }), 'he', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(() => { const g = game.state; g.flags.ch1_done = true; g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true; g.flags.md_lantern_open = true; g.flags.cr_entry = 'chit'; });
  for (const s of SHOTS) {
    await page.evaluate(async ({ map, spawn, hour }) => { const g = game.state; g.minutes = Math.floor(g.minutes / 1440) * 1440 + hour * 60; await game.loadLocation(map, spawn); g.world.at = map.startsWith('md_') ? 'meridian' : map; }, s);
    await page.waitForFunction((m) => game.state.locationId === m, s.map, { timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(7000);
    await page.evaluate((z) => { game.cam.recentre(); if (z !== 1) game.cam.zoomBy(z); }, s.zoom);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, `${s.name}${tag ? '_' + tag : ''}.png`), timeout: 180000 });
    const perf = await page.evaluate(() => game.perf());
    console.log(`${s.name}: draws=${perf.draws} tris=${perf.tris} tex=${perf.textureMB}MB`);
    if (s.zoom !== 1) await page.evaluate((z) => game.cam.zoomBy(1 / z), s.zoom);
  }
  console.log(`done; page errors: ${errors}`);
  await browser.close();
})();
