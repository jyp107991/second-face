// Travel from the map: walk the track from the Cistern's mouth to Shale (the clock running), then board the
// Tollmen caravan at Shale for Ninebridge (fare paid, time passed). node tools/qa/journey.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 200)); } });
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const where = () => page.evaluate(() => `${game.state.locationId} @${game.player.tx},${game.player.ty} day ${Math.floor(game.state.minutes / 1440) + 1} ${String(Math.floor((game.state.minutes % 1440) / 60)).padStart(2, '0')}:${String(Math.floor(game.state.minutes % 60)).padStart(2, '0')} journey=${game.journeying} tolls=${game.state.pc.inventory.tolls}`);
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('low'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(7, {}), 'they', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { game.state.flags.c9_door_open = true; await game.loadLocation('c9_mouth', 'door'); });
  // Out on the track a third of the way to Shale (the software renderer walks slowly; the way is joined where you stand).
  await page.evaluate(() => { const t = SF.ways().find((w) => (w.a === 'cistern9' && w.b === 'shale') || (w.a === 'shale' && w.b === 'cistern9')); const p = t.a === 'cistern9' ? t.pts[Math.floor(t.pts.length * 0.62)] : t.pts[Math.floor(t.pts.length * 0.38)]; game.player.place(Math.floor(p[0]), Math.floor(p[1])); game.state.locationId = 'wild:sallow'; });
  await page.waitForFunction(() => game.world.ringComplete(game.player.tx, game.player.ty), null, { timeout: 120000 }).catch(() => {});
  console.log('start:', await where());
  // The map: pick Shale, walk there.
  await page.evaluate(() => game.emit('openMap', {}));
  await page.waitForFunction(() => !!document.querySelector('.map-canvas'), null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const picked = await page.evaluate(() => { const c = document.querySelector('.map-canvas'); const r = c.getBoundingClientRect();
    for (let y = 10; y < r.height; y += 5) for (let x = 10; x < r.width; x += 5) { c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true })); if ((document.querySelector('.map-side h4')?.textContent ?? '') === 'Shale') return document.querySelector('.map-side').textContent.replace(/\s+/g, ' ').slice(0, 200); } return 'not found'; });
  console.log('side:', picked);
  check('the map offers a walk to Shale', picked.includes('Walk there'), picked);
  await page.screenshot({ path: path.join(out, 'journey_1_map.png'), timeout: 180000 });
  const t0 = Date.now();
  const minutes0 = await page.evaluate(() => game.state.minutes);
  // The software renderer runs the simulation at a fraction of real time: let the figure stride out for the test.
  await page.evaluate(() => { game.player.speed = 30; });
  await page.evaluate(() => document.querySelector('[data-a=travel]')?.click());
  await page.waitForTimeout(1500);
  check('the walk began', await page.evaluate(() => game.journeying && game.timeScale > 1), await where());
  await page.waitForFunction(() => !game.journeying, null, { timeout: 900000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const minutes1 = await page.evaluate(() => game.state.minutes);
  console.log(`walk took ${Math.round((Date.now() - t0) / 1000)} s real, ${Math.round((minutes1 - minutes0) / 60 * 10) / 10} h game:`, await where());
  check('walked into Shale on foot from the map', await page.evaluate(() => game.state.locationId === 'shale' && !game.journeying && game.timeScale === 1), await where());
  await page.screenshot({ path: path.join(out, 'journey_2_shale.png'), timeout: 180000 });
  // The caravan: from Shale (a stop) to Ninebridge.
  await page.evaluate(() => { game.state.pc.inventory.tolls = 40; const w = game.state.world; w.knownLocations.push('ninebridge', 'tollhouse'); });
  await page.evaluate(() => game.emit('openMap', {}));
  await page.waitForFunction(() => !!document.querySelector('.map-canvas'), null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const side2 = await page.evaluate(() => { const c = document.querySelector('.map-canvas'); const r = c.getBoundingClientRect();
    for (let y = 10; y < r.height; y += 5) for (let x = 10; x < r.width; x += 5) { c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true })); if ((document.querySelector('.map-side h4')?.textContent ?? '') === 'Ninebridge') return document.querySelector('.map-side').textContent.replace(/\s+/g, ' ').slice(0, 260); } return 'not found'; });
  console.log('side:', side2);
  check('the caravan is offered at its stop', side2.includes('caravan') && side2.includes('Board'), side2);
  await page.screenshot({ path: path.join(out, 'journey_3_caravan.png'), timeout: 180000 });
  await page.evaluate(() => document.querySelector('[data-a=ride]')?.click());
  await page.waitForFunction(() => game.state.locationId === 'ninebridge' && !game.transitioning, null, { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(2000);
  check('rode the caravan to Ninebridge, fare paid', await page.evaluate(() => game.state.locationId === 'ninebridge' && game.state.pc.inventory.tolls === 16), await where());
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
