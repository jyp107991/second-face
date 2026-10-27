// Weather and mood evidence: the same place under different skies, and moods at their hours.
// node tools/qa/weather.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = [
  { map: 'shale', spawn: 'start', hour: 13, weather: 'clear', name: 'shale_clear_noon' },
  { map: 'shale', spawn: 'start', hour: 13, weather: 'dust', name: 'shale_dust_noon' },
  { map: 'shale', spawn: 'start', hour: 17, weather: 'storm', name: 'shale_storm_evening' },
  { map: 'orchard', spawn: 'start', hour: 10, weather: 'clear', name: 'orchard_peaceful_morning' },
  { map: 'windpumps', spawn: 'start', hour: 14, weather: 'clear', name: 'windpumps_bright' },
  { map: 'overpass', spawn: 'start', hour: 11, weather: 'haze', name: 'overpass_grim_haze' },
];
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); });
  let last = '';
  for (const s of SHOTS) {
    await page.evaluate(async (s) => {
      game.weatherOverride = s.weather;
      game.state.minutes = Math.floor(game.state.minutes / 1440) * 1440 + s.hour * 60;
      await game.loadLocation(s.map, s.spawn);
      game.cam.viewGoal = 12; game.cam.viewHeight = 12;
    }, s);
    await page.waitForTimeout(s.map === last ? 4000 : 8000);
    last = s.map;
    const info = await page.evaluate(() => `${game.state.locationId} weather=${game.atmosphere.weather} mood=${game.loc.map.ambience.mood} grade=${game.post.settings.grade.toFixed(2)} sound=${game.soundBed} dust=${game.atmosphere.dustMul} npcs=${game.npcs.size} ${JSON.stringify(game.perf())}`);
    console.log(s.name, info);
    await page.screenshot({ path: path.join(out, `${s.name}.png`), timeout: 180000 });
  }
  await browser.close();
})();
