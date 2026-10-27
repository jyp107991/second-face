// Tollhouse 9 smoke: Act 1 started → field map from Shale → the highway → the gate talk → pay → through the wall →
// the east exit opens the map. node tools/qa/tollhouse.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 300)); } });
  const shot = async (name) => { await page.screenshot({ path: path.join(out, `${name}.png`), timeout: 180000 }); };
  const dlg = () => page.evaluate(() => (document.querySelector('.dlg-name')?.textContent ?? 'none') + ' | ' + (document.querySelector('.dlg-text')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 110));
  const pick = async (sub) => { const ok = await page.evaluate((sub) => { const li = [...document.querySelectorAll('.dlg-opts li')].find((l) => l.textContent.includes(sub)); if (!li) return false; li.click(); return true; }, sub); await page.waitForTimeout(500); console.log(`  > ${sub} → ${ok ? await dlg() : 'NO OPTION: ' + await page.evaluate(() => [...document.querySelectorAll('.dlg-opts li')].map((l) => l.textContent.trim()).join(' | '))}`); return ok; };
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };

  await page.goto('http://127.0.0.1:5173/?dev');
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(31, { frame: 'narrow' }), 'she', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  // Chapter One is behind us: read map, Act 1 open, coin in the pocket.
  await page.evaluate(async () => { const g = game.state; g.flags.c9_door_open = true; g.flags.ch1_done = true; g.world.knowledge.name1_decoded = true; g.world.knowledge.loc_shale = true; g.pc.inventory.tolls = 60; game.quests.questStart('q_a1_tollhouse'); await game.loadLocation('shale', 'start'); });
  await page.waitForTimeout(6000);
  check('Act 1 quest active with the Tollhouse known', await page.evaluate(() => game.state.world.quests.q_a1_tollhouse?.stage === 'road' && !!game.state.world.knowledge.loc_tollhouse));
  // Field map → Tollhouse 9.
  await page.evaluate(() => game.emit('openMap', {}));
  await page.waitForTimeout(800);
  let found = 'not found';
  for (let tries = 0; tries < 40 && found === 'not found'; tries++) { await page.waitForTimeout(750); found = await page.evaluate(() => { const c = document.querySelector('.map-canvas'); const r = c.getBoundingClientRect(); for (let y = 10; y < r.height; y += 6) for (let x = 10; x < r.width; x += 6) { c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true })); if ((document.querySelector('.map-side h4')?.textContent ?? '') === 'Tollhouse 9') return document.querySelector('.map-side')?.textContent?.replace(/\s+/g, ' ').slice(0, 120); } return 'not found'; }); }
  console.log('map:', found);
  await shot('th_0_map');
  await page.evaluate(() => document.querySelector('.map-side [data-a=travel]')?.click());
  await page.waitForFunction((to) => game.state.locationId === to && !game.transitioning && game.npcs.size > 0, 'tollhouse', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('arrived:', await page.evaluate(() => `${game.state.locationId} at=${game.state.world.at} npcs=${game.npcs.size} player=${game.player.tx},${game.player.ty} day=${Math.floor(game.state.minutes / 1440) + 1}`));
  check('reached Tollhouse 9', (await page.evaluate(() => game.state.locationId)) === 'tollhouse');
  await shot('th_1_arrive');
  // Walk up to the gate.
  // Headless frames are slow: stand at the apron, then walk the last tiles through the gate.
  await page.evaluate(() => { game.player.place(26, 23); game.cam.recentre(); game.cam.zoomBy(0.6); });
  await page.waitForTimeout(1500);
  await shot('th_2_wall');
  await page.evaluate(() => { game.player.setPath(game.loc.grid.findPath(26, 23, 34, 23, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('gate:', await dlg());
  await shot('th_3_gate');
  check('the gate talk opened', (await dlg()).startsWith('Sergeant'));
  await pick('Who are you people?');
  await pick('Rates, then.');
  await pick('(Pay. 20 Tolls)');
  await pick('(Go through.)');
  check('paid and stamped', await page.evaluate(() => game.state.flags.th_passed === true && game.state.pc.inventory.tolls === 40), await page.evaluate(() => `quest=${game.state.world.quests.q_a1_tollhouse?.status}/${game.state.world.quests.q_a1_tollhouse?.stage}`));
  // Inside: the clerk, the yard, the east road.
  await page.evaluate(() => { game.player.place(40, 23); game.cam.recentre(); game.cam.zoomBy(1 / 0.6); });
  await page.waitForTimeout(1500);
  await shot('th_4_inside');
  await page.evaluate(() => { game.player.place(59, 23); game.player.setPath(game.loc.grid.findPath(59, 23, 63, 23, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => !!document.querySelector('.map-canvas'), null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => `${game.state.locationId} mapOpen=${!!document.querySelector('.map-canvas')} player=${game.player?.tx},${game.player?.ty}`);
  console.log('east:', after);
  check('the east exit opens the field map', after.includes('mapOpen=true'));
  await shot('th_5_east_map');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
