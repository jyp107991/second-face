// Buildings evidence: several places at a readable zoom, including from inside a room (its roof lifts).
// node tools/qa/buildings.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = [
  { map: 'shale', x: 45, y: 22, view: 10, name: 'bld_shale_sheriff' },
  { map: 'shale', x: 24, y: 48, view: 7, name: 'bld_shale_homes' },
  { map: 'shale', x: 15, y: 23, view: 11, name: 'bld_shale_saloon' },
  { map: 'shale', x: 15, y: 17, view: 9, name: 'bld_shale_saloon_inside' },
  { map: 'shale', x: 32, y: 21, view: 8, name: 'bld_shale_pumps' },
  { map: 'shale', x: 57, y: 22, view: 10, name: 'bld_shale_mender' },
  { map: 'tollhouse', x: 43, y: 18, view: 12, name: 'bld_tollhouse_main' },
  { map: 'tollhouse', x: 43, y: 10, view: 10, name: 'bld_tollhouse_inside' },
  { map: 'overpass', x: 25, y: 25, view: 10, name: 'bld_overpass_shed' },
  { map: 'orchard', x: 14, y: 33, view: 9, name: 'bld_orchard_house' },
  { map: 'drywells', x: 38, y: 23, view: 13, name: 'bld_drywells_hall' },
  { map: 'drywells', x: 9, y: 19, view: 9, name: 'bld_drywells_sheds' },
];
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.weatherOverride = 'clear'; game.state.minutes = Math.floor(game.state.minutes / 1440) * 1440 + 11 * 60; });
  let last = '';
  for (const s of SHOTS) {
    await page.evaluate(async (s) => {
      if (game.state.locationId !== s.map) await game.loadLocation(s.map, 'start');
      game.player.place(s.x, s.y); game.cam.recentre(); game.cam.viewGoal = s.view; game.cam.viewHeight = s.view;
    }, s);
    await page.waitForTimeout(s.map === last ? 3500 : 8000);
    last = s.map;
    console.log(s.name, await page.evaluate(() => `${game.state.locationId} rooms=${game.loc.buildings.list.length} hide=${game.loc.buildings.at[game.loc.grid.index(game.player.tx, game.player.ty)]} ${JSON.stringify(game.perf())}`.slice(0, 160)));
    await page.screenshot({ path: path.join(out, `${s.name}.png`), timeout: 180000 });
  }
  await browser.close();
})();
