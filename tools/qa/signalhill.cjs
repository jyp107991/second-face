// Signal Hill smoke: through the wall → the track up → the camp talk → the station → the relay and the voice.
// node tools/qa/signalhill.cjs <outdir>
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
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(37, { frame: 'broad' }), 'he', 'pump_hand'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.th_passed = true; g.flags.visited_tollhouse = true; g.world.knowledge.loc_signalhill = true; g.pc.inventory.tolls = 40; g.pc.sheet.skillBought.science = 60; game.quests.questStart('q_a1_signal'); await game.loadLocation('tollhouse', 'inside'); });
  await page.waitForTimeout(6000);
  await page.evaluate(() => game.emit('openMap', {}));
  await page.waitForTimeout(800);
  const found = await page.evaluate(() => { const c = document.querySelector('.map-canvas'); const r = c.getBoundingClientRect(); for (let y = 10; y < r.height; y += 6) for (let x = 10; x < r.width; x += 6) { c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true })); if ((document.querySelector('.map-side h4')?.textContent ?? '') === 'Signal Hill') return document.querySelector('.map-side')?.textContent?.replace(/\s+/g, ' ').slice(0, 120); } return 'not found'; });
  console.log('map:', found);
  await page.evaluate(() => document.querySelector('.map-side [data-a=travel]')?.click());
  await page.waitForFunction((to) => game.state.locationId === to && !game.transitioning && game.npcs.size > 0, 'signalhill', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('arrived:', await page.evaluate(() => `${game.state.locationId} npcs=${game.npcs.size} player=${game.player.tx},${game.player.ty}`));
  check('reached Signal Hill', (await page.evaluate(() => game.state.locationId)) === 'signalhill');
  await shot('sg_1_foot');
  // Up the first climb to the camp trigger.
  await page.evaluate(() => { game.player.place(33, 38); game.cam.recentre(); game.player.setPath(game.loc.grid.findPath(33, 38, 33, 34, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('camp:', await dlg());
  await shot('sg_2_camp');
  check('the camp talk opened', (await dlg()).startsWith('Tally'));
  await pick('(Pay the track toll. 15 Tolls)');
  await pick('(Go up.)');
  check('past the camp', await page.evaluate(() => game.state.flags.sg_camp_passed === true));
  // The top: the station and the mast.
  await page.evaluate(() => { game.player.place(20, 16); game.cam.recentre(); game.player.setPath(game.loc.grid.findPath(20, 16, 25, 13, { ignore: 'player', adjacentOk: false })); });
  await page.waitForTimeout(8000);
  check('reached the station', await page.evaluate(() => game.state.flags.sg_station === true), await page.evaluate(() => `quest=${game.state.world.quests.q_a1_signal?.stage} windpumps=${!!game.state.world.knowledge.loc_lm_sallow_02}`));
  await page.evaluate(() => { game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1500);
  await shot('sg_3_top');
  // Inside: the relay.
  await page.evaluate(() => { game.player.place(23, 8); game.cam.recentre(); game.tryInteract(23, 6); });
  await page.waitForTimeout(2500);
  console.log('relay:', await dlg());
  await shot('sg_4_relay');
  await pick('(Read the traffic log.)');
  await pick('(Type at the cursor.)');
  await pick('(Type nothing.');
  await pick('(Step back.)');
  check('the relay was read and the hill quest ended', await page.evaluate(() => game.state.world.quests.q_a1_signal?.status === 'done' && !!game.state.world.knowledge.loc_drywells));
  await page.evaluate(() => { game.player.place(29, 7); game.tryInteract(29, 6); });
  await page.waitForTimeout(2500);
  console.log('speaker:', await dlg());
  await pick('(Patch the speaker line');
  await pick('(Done.)');
  check('the broadcast went on the mast', await page.evaluate(() => game.state.flags.broadcast_amplified === true), await page.evaluate(() => `quest=${game.state.world.quests.q_a1_broadcast?.stage}`));
  await shot('sg_5_after');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
