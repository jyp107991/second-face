// Wilds smoke: a trip stopped by a road encounter (the guild patrol on a roadside map, the trip continuing from its exit),
// a hidden place noticed from the track, and a hunt at camp under the dead windpumps. node tools/qa/wilds.cjs <outdir>
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
  const travel = async (name, to) => {
    await page.evaluate(() => game.emit('openMap', {}));
    let found = 'not found';
    for (let tries = 0; tries < 40 && found === 'not found'; tries++) { await page.waitForTimeout(750); found = await page.evaluate((name) => { const c = document.querySelector('.map-canvas'); const r = c.getBoundingClientRect(); for (let y = 10; y < r.height; y += 6) for (let x = 10; x < r.width; x += 6) { c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true })); if ((document.querySelector('.map-side h4')?.textContent ?? '') === name) return 'found'; } return 'not found'; }, name); }
    console.log(`map: ${name} ${found}`);
    const before = await page.evaluate(() => game.state.world.at);
    await page.evaluate(() => document.querySelector('.map-side [data-a=travel]')?.click());
    await page.waitForFunction((b) => game.state.world.at !== b && !game.transitioning && game.npcs.size >= 0 && !!game.loc, before, { timeout: 90000 }).catch(() => {});
    await page.waitForFunction((to) => game.state.locationId === to && !game.transitioning, to, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1500);
  };

  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(53, { frame: 'broad' }), 'he', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.th_passed = true; g.world.knowledge.loc_drywells = true; g.world.knowledge.loc_lm_sallow_02 = true; g.pc.inventory.tolls = 30; g.pc.sheet.skillBought.survival = 70; SF.addItem(g.pc.inventory, SF.makeItem('k_pass_stamped')); SF.addItem(g.pc.inventory, SF.makeItem('j_wiring', 2)); SF.addItem(g.pc.inventory, SF.makeItem('j_scrap', 2)); await game.loadLocation('shale', 'start'); game.state.world.at = 'shale'; });
  await page.waitForTimeout(5000);

  // 1. The patrol stops the trip to Dry Wells on the track.
  await page.evaluate(() => { game.forceEncounter = 're_patrol'; });
  await travel('Dry Wells', 'wild_track');
  console.log('stopped:', await page.evaluate(() => `${game.state.locationId} trip=${JSON.stringify(game.state.world.trip && { to: game.state.world.trip.to, left: game.state.world.trip.hoursLeft })} npcs=${[...game.npcs.keys()].join(',')}`));
  check('the trip stopped on the roadside map with the patrol placed', await page.evaluate(() => game.state.locationId === 'wild_track' && game.npcs.has('npc_w_outrider_a') && !!game.state.world.trip));
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('patrol:', await dlg());
  await shot('wild_1_patrol');
  check('the patrol spoke', (await dlg()).startsWith('Outrider'));
  await pick('(Show the stamped pass.)');
  await pick('(Walk on.)');
  // Leave by the east end: the trip continues to Dry Wells.
  await page.evaluate(() => { game.player.place(37, 11); game.cam.recentre(); game.player.setPath(game.loc.grid.findPath(37, 11, 39, 11, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => game.state.locationId === 'drywells' && !game.transitioning, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('continued:', await page.evaluate(() => `${game.state.locationId} at=${game.state.world.at} trip=${!!game.state.world.trip} seen=${JSON.stringify(game.state.world.roadSeen)}`));
  check('leaving the roadside map finished the trip', await page.evaluate(() => game.state.locationId === 'drywells' && game.state.world.at === 'drywells' && !game.state.world.trip && game.state.world.roadSeen?.re_patrol === true));
  await shot('wild_2_arrived');

  // 2. A passing thing, told on arrival; and a hidden place noticed from the track.
  await page.evaluate(() => { game.forceEncounter = 're_salt_wind'; });
  await travel('Shale', 'shale');
  const toast = await page.evaluate(() => document.querySelector('.toast, .msg, .message')?.textContent ?? '');
  console.log('passing:', await page.evaluate(() => `${game.state.locationId} seen=${JSON.stringify(game.state.world.roadSeen)}`), '|', toast.slice(0, 80));
  check('a passing thing happened on the way', await page.evaluate(() => game.state.locationId === 'shale' && game.state.world.roadSeen?.re_salt_wind === true && game.state.world.knowledge.seen_salt_wind === true));
  await page.evaluate(() => { game.forceEncounter = 're_dust_devil'; });
  await travel('Cistern 9', 'c9_mouth');
  check('the salt-pan wreck was noticed from the way to the Cistern', await page.evaluate(() => game.state.world.knowledge.loc_lm_sallow_01 === true), await page.evaluate(() => JSON.stringify(Object.keys(game.state.world.knowledge).filter((k) => k.startsWith('loc_')))));

  // 3. Camp under the windpumps: a hunt, then traps.
  await page.evaluate(async () => { await game.loadLocation('windpumps', 'start'); game.state.world.at = 'lm_sallow_02'; game.state.minutes = Math.floor(game.state.minutes / 1440) * 1440 + 6 * 60; });
  await page.waitForTimeout(6000);
  await page.evaluate(() => { game.player.place(43, 13); game.cam.recentre(); game.cam.zoomBy(0.8); });
  await page.waitForTimeout(1500);
  await shot('wild_3_windpumps');
  check('the windpump graveyard has its scavenger', await page.evaluate(() => game.npcs.has('npc_wp_01')));
  await page.evaluate(() => game.openCamp());
  await page.waitForTimeout(800);
  const campText = await page.evaluate(() => document.querySelector('.camp')?.textContent?.replace(/\s+/g, ' ') ?? 'no camp');
  check('camp offers a hunt here', campText.includes('Hunt (three hours)'), campText.slice(0, 120));
  await shot('wild_4_camp');
  await page.evaluate(() => document.querySelector('[data-a=hunt]')?.click());
  await page.waitForTimeout(600);
  const meat = await page.evaluate(() => game.state.pc.inventory.items.find((i) => i.def === 'c_meat')?.qty ?? 0);
  console.log('hunt:', await page.evaluate(() => document.querySelector('.toast')?.textContent ?? ''), 'meat', meat);
  check('the hunt brought meat', meat >= 1);
  await page.evaluate(() => document.querySelector('[data-a=traps-set]')?.click());
  await page.waitForTimeout(400);
  check('traps were set', await page.evaluate(() => !!game.state.world.traps?.windpumps));
  await page.evaluate(() => { game.state.minutes += 36 * 60; document.querySelector('[data-a=close]')?.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => game.openCamp());
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('[data-a=traps-check]')?.click());
  await page.waitForTimeout(400);
  const meat2 = await page.evaluate(() => game.state.pc.inventory.items.find((i) => i.def === 'c_meat')?.qty ?? 0);
  check('the traps yielded after a day and a half', meat2 > meat, `${meat} → ${meat2}`);
  await page.evaluate(() => document.querySelector('[data-a=close]')?.click());

  // 4. The wreck on the pan: the thing in the ring wakes for Shale.
  await page.evaluate(async () => { const g = game.state; g.pc.sheet.skillBought.science = 60; SF.addItem(g.pc.inventory, SF.makeItem('k_hound_controller')); SF.addItem(g.pc.inventory, SF.makeItem('k_convoy_manifest')); game.quests.questStart('q_sw_wreck'); await game.loadLocation('saltpan', 'start'); g.world.at = 'lm_sallow_01'; });
  await page.waitForTimeout(6000);
  await page.evaluate(() => { game.player.place(18, 13); game.cam.recentre(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1500);
  await shot('wild_5_saltpan');
  await page.evaluate(() => { game.tryInteract(18, 12); });
  await page.waitForTimeout(2500);
  console.log('hound:', await dlg());
  await pick('(Hold up the controller.)');
  await pick('(Tell it to stand');
  await pick('(Walk.)');
  check('the machine woke for Shale', await page.evaluate(() => game.state.flags.hound_for_shale === true && game.state.world.quests.q_sw_wreck?.stage === 'shale'), await page.evaluate(() => JSON.stringify(game.state.world.quests.q_sw_wreck)));

  // 5. The orchard at night: the thieves at the beds.
  await page.evaluate(async () => { const g = game.state; g.flags.or_stakeout = true; g.pc.sheet.skillBought.speech = 60; game.quests.questStart('q_orchard'); g.minutes = Math.floor(g.minutes / 1440) * 1440 + 23 * 60 + 30; await game.loadLocation('orchard', 'start'); g.world.at = 'orchard'; });
  await page.waitForTimeout(6000);
  console.log('orchard npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('the thieves are at the beds at night', await page.evaluate(() => game.npcs.has('npc_or_04') && game.npcs.has('npc_or_05')));
  await page.evaluate(() => { game.player.place(34, 32); game.cam.recentre(); game.player.setPath(game.loc.grid.findPath(34, 32, 37, 32, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 150000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('thieves:', await dlg());
  await shot('wild_6_orchard_night');
  await pick('Don\'t. Nobody here');
  await pick('Stay. The Choir feeds you first');
  await pick('(Wake Petra.)');
  check('the thieves stayed with the Choir', await page.evaluate(() => game.state.flags.or_outcome === 'choir' && game.state.world.quests.q_orchard?.stage === 'choir'));
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
