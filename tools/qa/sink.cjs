// The Sink smoke: down the Precinct stair → the shelf and the tally wall → the stilt-walk and the spring line → the
// pump board, the keeper, the dial retimed → the clinic: Pell, Ocho, Vash's heart, the clamp and the Code → the Pale on
// the east bank → the stair up and down again. node tools/qa/sink.cjs <outdir>
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
  const prop = async (px, py, sx, sy) => { await page.evaluate(([px, py, sx, sy]) => { game.placeLocal(sx, sy); game.cam.recentre(); game.interactLocal(px, py); }, [px, py, sx, sy]); await page.waitForTimeout(1500); console.log(`prop ${px},${py}:`, await dlg()); };
  const walk = async (fx, fy, tx, ty, until) => { await page.evaluate(([fx, fy, tx, ty]) => { game.placeLocal(fx, fy); game.cam.recentre(); game.walkLocal(tx, ty); }, [fx, fy, tx, ty]); await page.waitForFunction(until, null, { timeout: 90000 }).catch(() => {}); await page.waitForTimeout(1200); };
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const has = (id) => page.evaluate((id) => JSON.stringify(game.state.pc.inventory.items).includes(`"${id}"`), id);

  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(83, { frame: 'broad' }), 'he', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.dw_restored = true; g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true; g.pc.inventory.tolls = 300; g.pc.sheet.skillBought.speech = 90; g.pc.sheet.skillBought.mechanics = 90; g.pc.sheet.skillBought.medicine = 90; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 11 * 60; await game.loadLocation('md_sink', 'start'); g.world.at = 'meridian'; game.quests.update(); });
  await page.waitForTimeout(8000);
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('the Sink is peopled: Ocho, the keeper, Vash, the Pale\'s Elder, the wardens', await page.evaluate(() => ['npc_sk_01', 'npc_sk_03', 'npc_sk_05', 'npc_sk_06', 'npc_sk_w1'].every((id) => game.npcs.has(id)) && game.npcs.size >= 15), await page.evaluate(() => `npcs=${game.npcs.size}`));
  // the shelf
  await walk(36, 2, 36, 5, () => game.state.flags.md_sink_open === true);
  check('the arrival fired', await page.evaluate(() => game.state.world.knowledge.seen_sink === true));
  await page.evaluate(() => { game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1500);
  await shot('sk_1_shelf');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  await prop(20, 1, 20, 2);
  await pick('(Read the newest.)');
  await pick('(Leave it.)');
  check('the tally wall names the keeper\'s son', await page.evaluate(() => game.state.world.knowledge.sk_dagny_son === true));
  // the stilt-walk and the spring line
  await walk(36, 9, 36, 12, () => game.state.world.quests.q_sk_highwater?.stage === 'queue' || !!game.state.world.quests.q_sk_highwater);
  check('the spring line opened High Water', await page.evaluate(() => game.state.world.quests.q_sk_highwater?.stage === 'rising'), await page.evaluate(() => `player=${game.player.tx},${game.player.ty}`));
  await page.evaluate(() => { game.placeLocal(36, 20); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('sk_2_walk');
  // the pump house: the board, the keeper, the dial
  await prop(14, 23, 15, 23);
  await pick('(Copy the schedule, clause and all.)');
  await pick('(Leave it.)');
  check('the schedule is copied', await has('k_sk_schedule') && await page.evaluate(() => game.state.world.knowledge.sk_schedule_known === true));
  await talk('npc_sk_03');
  await pick('Roos, H. Spring before last. Stair.');
  await pick('Then let me at the dial.');
  await pick('That\'s all.');
  check('the keeper gave her leave', await page.evaluate(() => game.state.flags.sk_pump_leave === true));
  await page.evaluate(() => { game.placeLocal(15, 25); game.cam.recentre(); game.cam.zoomBy(1 / 0.7); });
  await page.waitForTimeout(1500);
  await shot('sk_3_pumps');
  await prop(5, 22, 5, 23);
  await pick('(Break the seal and retime pumps 2 and 3 to the Sink.)');
  await pick('(Leave it running.)');
  check('the pumps were retimed and the spring is settled', await page.evaluate(() => game.state.flags.sk_pumps === 'retimed' && game.state.world.quests.q_sk_highwater?.status === 'done'));
  // the clinic
  await page.evaluate(() => { game.placeLocal(36, 46); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('sk_4_clinic');
  await talk('npc_sk_02');
  await pick('The big man on the end cot.');
  await pick('That\'s all.');
  await talk('npc_sk_01');
  await shot('sk_5_ocho');
  await pick('Tam Oduya. The heart.');
  await pick('Then let me bring one.');
  await pick('That\'s all.');
  check('Organ Run opened', await page.evaluate(() => game.state.world.quests.q_sk_organ?.stage === 'need'));
  await talk('npc_sk_05');
  await pick('A heart. For Ocho\'s patient.');
  await pick('(Pay. 150 Tolls)');
  await pick('That\'s all.');
  check('a heart from the cold box', await has('k_sk_heart'));
  await talk('npc_sk_01');
  await pick('(Put the cooler on the table.)');
  await pick('Vash. He says the water.');
  await pick('(The clamp.)');
  await pick('(Hold it steady.)');
  await pick('(Wash.)');
  check('the heart was fitted and the words said', await page.evaluate(() => game.state.flags.sk_organ_fitted === true && game.state.world.quests.q_sk_organ?.status === 'done' && !!game.state.world.membership?.menders));
  // the Pale
  await walk(55, 26, 57, 24, () => game.state.flags.sk_pale_warned === true);
  check('the Pale stood up from their fire', await page.evaluate(() => game.state.flags.sk_pale_warned === true), await page.evaluate(() => `player=${game.player.tx},${game.player.ty}`));
  await talk('npc_sk_06');
  await shot('sk_6_pale');
  await pick('Call yours off the walk.');
  await pick('That\'s all.');
  check('the Pale let you come and go', await page.evaluate(() => game.state.flags.sk_pale_leave === true));
  // the stair up, and down again
  await walk(36, 1, 36, 0, () => game.state.locationId === 'md_precinct');
  await page.waitForTimeout(5000);
  check('the stair came up in the Precinct\'s back lane', await page.evaluate(() => game.state.locationId === 'md_precinct'), await page.evaluate(() => `at=${game.state.locationId} player=${game.player.tx},${game.player.ty}`));
  await walk(40, 52, 40, 53, () => game.state.locationId === 'md_sink');
  await page.waitForTimeout(5000);
  check('and down again', await page.evaluate(() => game.state.locationId === 'md_sink'), await page.evaluate(() => `at=${game.state.locationId} player=${game.player.tx},${game.player.ty}`));
  await page.evaluate(() => { game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('sk_7_back');
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
