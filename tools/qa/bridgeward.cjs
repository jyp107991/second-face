// Bridgeward smoke: the street and the three paints → the chop-shop haul → the tithe → the chain held with a word →
// the tower, the girl who hears, kept → the old haunt and the cache → the bridge and the drop → the Loop home.
// node tools/qa/bridgeward.cjs <outdir>
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
  const talk = async (id) => { await page.evaluate((id) => { const n = game.npcs.get(id); if (!n) throw new Error('no npc ' + id); game.player.place(n.actor.tx, n.actor.ty + 1); game.cam.recentre(); game.emit('openDialogue', { npc: n }); }, id); await page.waitForTimeout(1200); console.log(`${id}:`, await dlg()); };
  const prop = async (px, py, sx, sy) => { await page.evaluate(([px, py, sx, sy]) => { game.player.place(sx, sy); game.cam.recentre(); game.tryInteract(px, py); }, [px, py, sx, sy]); await page.waitForTimeout(1500); console.log(`prop ${px},${py}:`, await dlg()); };
  const walk = async (fx, fy, tx, ty, until) => { await page.evaluate(([fx, fy, tx, ty]) => { game.player.place(fx, fy); game.cam.recentre(); game.walkTo(tx, ty); }, [fx, fy, tx, ty]); await page.waitForFunction(until, null, { timeout: 90000 }).catch(() => {}); await page.waitForTimeout(1200); };
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const has = (id) => page.evaluate((id) => JSON.stringify(game.state.pc.inventory.items).includes(`"${id}"`), id);

  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(89, { frame: 'broad' }), 'he', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true; g.flags.md_lantern_open = true; g.flags.wren_exodus = true; g.pc.inventory.tolls = 300; g.pc.sheet.skillBought.mechanics = 90; g.pc.sheet.skillBought.speech = 90; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 15 * 60; await game.loadLocation('md_bridgeward', 'start'); g.world.at = 'meridian'; game.quests.update(); });
  await page.waitForTimeout(8000);
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('Bridgeward is peopled: the Boss, the Hand, Petrov, Verity, Immy, Fenn, Jax', await page.evaluate(() => ['npc_bw_01', 'npc_bw_02', 'npc_bw_03', 'npc_bw_04', 'npc_bw_05', 'npc_bw_09', 'npc_bw_08'].every((id) => game.npcs.has(id)) && game.npcs.size >= 17), await page.evaluate(() => `npcs=${game.npcs.size}`));
  await walk(2, 28, 6, 28, () => game.state.world.quests.q_bw_turf?.stage === 'three');
  check('the arrival opened Turf', await page.evaluate(() => game.state.world.quests.q_bw_turf?.stage === 'three' && game.state.flags.md_bridgeward_open === true));
  await page.evaluate(() => { game.player.place(24, 28); game.cam.recentre(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1800);
  await shot('bw_1_street');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  await page.evaluate(() => { game.cam.zoomBy(1 / 0.7); });
  // the tithe: a haul from the chop-shop, the Hand, the Boss
  await talk('npc_bw_01');
  await pick('How does one become a Rustmouth?');
  await pick('That\'s all.');
  await talk('npc_bw_03');
  await pick('The Hand sent me. The wreck.');
  await pick('That\'s all.');
  check('the wreck is cut for the yard', await has('k_bw_haul'));
  await talk('npc_bw_02');
  await pick('(Hand over the haul ticket.)');
  await pick('That\'s all.');
  check('a hauler, by the haul', await page.evaluate(() => !!game.state.world.membership?.rustmouths && game.state.world.membership.rustmouths.status === 'member'), await page.evaluate(() => JSON.stringify(game.state.world.membership)));
  await talk('npc_bw_01');
  await pick('I\'ll hold the chain for you.');
  await pick('That\'s all.');
  await talk('npc_bw_08');
  await shot('bw_2_chain');
  await pick('Pull back off the chain, Jax.');
  await pick('That\'s all.');
  check('the chain held with a word: Turf settled', await page.evaluate(() => game.state.flags.bw_turf === 'rustmouths' && game.state.world.quests.q_bw_turf?.status === 'done'));
  // the tower: the girl who hears, kept
  await walk(40, 21, 40, 15, () => game.state.world.knowledge.seen_tower === true);
  check('the tower is seen', await page.evaluate(() => game.state.world.knowledge.seen_tower === true));
  await talk('npc_bw_05');
  await shot('bw_3_tower');
  await pick('Say it again. The rest of it.');
  await pick('That\'s all.');
  check('the girl was heard and Static opened', await page.evaluate(() => game.state.world.knowledge.bw_immy_heard === true && game.state.world.quests.q_bw_static?.stage === 'hiss'));
  await talk('npc_bw_04');
  await pick('Keep her here.');
  await pick('That\'s all.');
  check('sworn on the hiss: she stays', await page.evaluate(() => game.state.flags.bw_static === 'kept' && game.state.world.quests.q_bw_static?.status === 'done' && game.state.world.leads.l_static_forecast === true));
  // the old haunt
  await prop(13, 36, 13, 35);
  await pick('(Go in.)');
  await prop(15, 40, 15, 41);
  await pick('(Leave it.)');
  check('the garage wall remembers', await page.evaluate(() => game.state.world.knowledge.bw_wall_wren === true && game.state.world.quests.q_bw_haunt?.stage === 'garage'));
  await talk('npc_bw_09');
  await shot('bw_4_garage');
  await pick('The cache. Under the bench.');
  await pick('Because the Dogs are coming back for the bridge');
  await pick('(The locker.)');
  check('Fenn lifted the bench', await page.evaluate(() => game.state.flags['unlocked:md_bridgeward/bw_haunt_cache'] === true && game.state.world.quests.q_bw_haunt?.status === 'done'));
  // the bridge and the drop
  await prop(50, 35, 50, 36);
  await pick('(Leave it.)');
  await walk(56, 27, 61, 27, () => game.state.world.knowledge.docks_seen === true);
  check('the drop, and the Docks across it', await page.evaluate(() => game.state.world.knowledge.docks_seen === true), await page.evaluate(() => `player=${game.player.tx},${game.player.ty}`));
  await page.evaluate(() => { game.cam.recentre(); game.cam.zoomBy(0.8); });
  await page.waitForTimeout(1500);
  await shot('bw_5_bridge');
  // the Loop home
  await page.evaluate(() => { game.cam.zoomBy(1 / 0.8); });
  await prop(65, 5, 65, 6);
  await pick('The Precinct. (3 Tolls)');
  await page.waitForFunction(() => game.state.locationId === 'md_precinct', null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  check('the Loop runs to the Precinct', await page.evaluate(() => game.state.locationId === 'md_precinct'), await page.evaluate(() => `at=${game.state.locationId}`));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
