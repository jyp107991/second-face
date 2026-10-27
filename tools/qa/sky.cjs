// Weather in the open: rain on the Shore, snow in the Teeth, fog in the Wet, smoke over Shale's fires, a dust devil
// and a flock over the Sallow. node tools/qa/sky.cjs <outdir>
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
  await page.evaluate(async () => { game.state.flags.c9_door_open = true; game.state.minutes = Math.floor(game.state.minutes / 1440) * 1440 + 11 * 60; await game.loadLocation('c9_mouth', 'door'); });
  const shots = [['rain_shore', 900, 4000, 'rain'], ['snow_teeth', 7600, 2200, 'snow'], ['fog_wet', 3600, 1200, 'fog'], ['devil_sallow', 5700, 4560, 'clear']];
  for (const [name, x, z, weather] of shots) {
    await page.evaluate(([x, z]) => { game.player.place(x, z); game.cam.target.copy(game.player.object.position); game.cam.snapToTarget(); }, [x, z]);
    await page.waitForFunction(() => game.world.ringComplete(game.player.tx, game.player.ty), null, { timeout: 120000 }).catch(() => {});
    await page.evaluate((w) => { game.weatherNow = () => w; if (w === 'clear') { game.life.devilWait = 0; game.life.flockWait = 0; } }, weather);
    await page.waitForTimeout(weather === 'clear' ? 9000 : 5000);
    await page.evaluate(() => { game.cam.target.copy(game.player.object.position); game.cam.snapToTarget(); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, `sky_${name}.png`), timeout: 180000 });
    console.log(name, await page.evaluate(() => `weather=${game.atmosphere.weather} sound=${game.soundBed} devil=${game.life.devil.visible} flock=${game.life.flock.visible} draws=${game.perf().draws}`));
  }
  // Smoke over a town's fires at dusk.
  await page.evaluate(async () => { game.weatherNow = () => 'clear'; game.state.minutes = Math.floor(game.state.minutes / 1440) * 1440 + 19 * 60 + 30; await game.loadLocation('shale', 'start'); game.placeLocal(31, 28); game.cam.target.copy(game.player.object.position); game.cam.recentre(); game.cam.snapToTarget(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(7000);
  await page.evaluate(() => { game.cam.target.copy(game.player.object.position); game.cam.snapToTarget(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'sky_smoke_shale.png'), timeout: 180000 });
  console.log('smoke', await page.evaluate(() => `fires=${game.atmosphere.sources.filter((s) => s.flicker >= 0.3 && !s.lamp).length} smoke=${!!game.atmosphere.smoke && game.atmosphere.smoke.visible}`));
  await browser.close();
})();
