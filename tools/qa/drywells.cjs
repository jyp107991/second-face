// Dry Wells smoke: the track from Shale → the rifle on the approach → the family's matriarch and her key → the locked
// door → the console → the water restored, the month resolved, the Act 1 end card. node tools/qa/drywells.cjs <outdir>
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

  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.instantJourney = true; game.applyQuality('medium'); });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(29, { frame: 'broad' }), 'she', 'pump_hand'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  // Act 1 up to the hill is behind us; the month is running with nothing changed; we know where the line goes.
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.th_passed = true; g.flags.sg_station = true; g.flags.jonah_named = true; g.world.knowledge.relay_answers_city = true; g.world.knowledge.relay_log_read = true; g.world.knowledge.loc_drywells = true; g.world.knowledge.c9_pressure_constant = true; g.pc.inventory.tolls = 40; g.pc.sheet.skillBought.science = 60; g.pc.sheet.skillBought.speech = 60; game.quests.questStart('q_a1_jonah'); game.quests.questStart('q_a1_signal'); game.quests.update(); await game.loadLocation('shale', 'start'); });
  await page.waitForTimeout(6000);
  check('the hill done started the water clock', await page.evaluate(() => game.state.world.quests.q_a1_drywells?.stage === 'track' && !!game.state.world.leads.l_relay_west_line), await page.evaluate(() => JSON.stringify(Object.keys(game.state.world.quests))));
  await page.evaluate(() => game.emit('openMap', {}));
  await page.waitForTimeout(800);
  let found = 'not found';
  for (let tries = 0; tries < 40 && found === 'not found'; tries++) { await page.waitForTimeout(750); found = await page.evaluate(() => { const c = document.querySelector('.map-canvas'); const r = c.getBoundingClientRect(); for (let y = 10; y < r.height; y += 6) for (let x = 10; x < r.width; x += 6) { c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true })); if ((document.querySelector('.map-side h4')?.textContent ?? '') === 'Dry Wells') return document.querySelector('.map-side')?.textContent?.replace(/\s+/g, ' ').slice(0, 120); } return 'not found'; }); }
  console.log('map:', found);
  await page.evaluate(() => document.querySelector('.map-side [data-a=travel]')?.click());
  await page.waitForFunction((to) => game.state.locationId === to && !game.transitioning && game.npcs.size > 0, 'drywells', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('arrived:', await page.evaluate(() => `${game.state.locationId} npcs=${[...game.npcs.keys()].join(',')} player=${game.player.tx},${game.player.ty}`));
  check('reached Dry Wells with the family placed', await page.evaluate(() => game.state.locationId === 'drywells' && game.npcs.has('npc_dw_01') && game.npcs.has('npc_dw_02')));
  await shot('dw_1_track');
  // The approach: walk into the sandbags and meet the rifle.
  await page.evaluate(() => { game.placeLocal(18, 23); game.cam.recentre(); game.player.setPath(game.findPathLocal(18, 23, 22, 23, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('approach:', await dlg());
  await shot('dw_2_approach');
  check('the rifle stopped us', (await dlg()).startsWith('Sable'));
  await pick('I came from Signal Hill');
  await pick('(Go in.)');
  await pick('(Go in.)');
  check('past the perch, quest at the station stage', await page.evaluate(() => game.state.flags.dw_admitted === true && game.state.world.quests.q_a1_drywells?.stage === 'station'));
  // Oriel in her shack: the story, the key, the word.
  await page.evaluate(() => { const n = game.npcs.get('npc_dw_01'); game.player.place(n.actor.tx - 1, n.actor.ty); game.cam.recentre(); game.cam.zoomBy(0.7); game.emit('openDialogue', { npc: n }); });
  await page.waitForTimeout(2500);
  console.log('oriel:', await dlg());
  await shot('dw_3_oriel');
  await pick('Who are you people?');
  await pick('Why here?');
  await pick('Noted.');
  await pick('The room at the end of the station.');
  await pick('(Tell her what the clock sounds like');
  await pick('(Take it.)');
  await pick('That\'s all.');
  check('the ghosts began and the key is ours', await page.evaluate(() => game.state.world.quests.q_dw_ghosts?.stage === 'squat' && game.state.pc.inventory.items.some((i) => i.def === 'k_station_key') && game.state.world.knowledge.dw_override_word === true), await page.evaluate(() => JSON.stringify(game.state.pc.inventory.items.map((i) => i.def))));
  // The pump hall and the locked door.
  await page.evaluate(() => { game.placeLocal(39, 11); game.cam.recentre(); game.player.setPath(game.findPathLocal(39, 11, 42, 11, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('door:', await dlg());
  await shot('dw_4_hall');
  await pick('(Use the brass key.)');
  await pick('(Go in.)');
  check('the door is open', await page.evaluate(() => game.state.flags.dw_control_open === true && game.state.world.quests.q_a1_drywells?.stage === 'console'));
  // The console: the Cistern on the schedule (pump hand), then the pump man's word.
  await page.evaluate(() => { game.placeLocal(48, 9); game.cam.recentre(); game.interactLocal(49, 9); });
  await page.waitForTimeout(2500);
  console.log('console:', await dlg());
  await shot('dw_5_console');
  await pick('(Find the Cistern on the schedule.)');
  await pick('(Read on.)');
  await pick('(Enter the pump man');
  await pick('(Step back.)');
  const after = await page.evaluate(() => `outcome=${game.state.flags.dw_outcome} how=${game.state.flags.dw_how} quest=${game.state.world.quests.q_a1_drywells?.status}/${game.state.world.quests.q_a1_drywells?.stage} month=${game.state.flags.jonah_month_over} jonah=${game.state.world.quests.q_a1_jonah?.stage} c9=${game.state.world.knowledge.c9_fed_from_outside}`);
  console.log('after:', after);
  check('the water is restored and the month resolved with it', after.includes('outcome=restored') && after.includes('quest=done/restored') && after.includes('month=true') && after.includes('jonah=fell') && after.includes('c9=true'));
  // The end card comes three minutes later.
  await page.evaluate(() => { game.state.minutes += 4; });
  // The month's own card shows first; the end card queues behind it.
  await page.waitForFunction(() => (document.querySelector('.title-card')?.textContent ?? '').includes('ACT ONE ENDS'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
  const card = await page.evaluate(() => document.querySelector('.title-card')?.textContent?.replace(/\n/g, ' / ') ?? 'none');
  console.log('card:', card);
  check('the Act 1 end card showed', card.includes('ACT ONE ENDS'));
  await shot('dw_6_card');
  // Back in Shale: the pumps and the sheriff know.
  await page.evaluate(async () => { await game.loadLocation('shale', 'start'); });
  await page.waitForTimeout(6000);
  await page.evaluate(() => { const n = game.npcs.get('npc_sh_01'); game.state.flags.sh_ada_met = true; game.player.place(n.actor.tx, n.actor.ty + 1); game.cam.recentre(); game.emit('openDialogue', { npc: n }); });
  await page.waitForTimeout(2000);
  await pick('Dry Wells. The station there sets your water.');
  console.log('ada:', await dlg());
  check('Ada answers the water', (await dlg()).includes('pumps ran all night'));
  await shot('dw_7_ada');
  await pick('Noted.');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
