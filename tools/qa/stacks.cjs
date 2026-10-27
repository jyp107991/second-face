// The Stacks smoke: the street and the lobby → key money for 9-14 → the stair to floor nine → the flat (rest indoors)
// → the roof: the view, the keeper's log, Lio's hours, the valve reset → Latch's card → the stair down.
// node tools/qa/stacks.cjs <outdir>
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
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(87, { frame: 'narrow' }), 'she', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true; g.pc.inventory.tolls = 400; g.pc.sheet.skillBought.mechanics = 90; g.pc.sheet.skillBought.speech = 90; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 18 * 60; await game.loadLocation('md_stacks', 'start'); g.world.at = 'meridian'; game.quests.update(); });
  await page.waitForTimeout(8000);
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('the street is peopled: Hester and Fitch', await page.evaluate(() => game.npcs.has('npc_st_01') && game.npcs.has('npc_st_07') && game.npcs.size >= 8), await page.evaluate(() => `npcs=${game.npcs.size}`));
  await walk(7, 10, 7, 13, () => game.state.flags.md_stacks_open === true);
  check('the arrival fired', await page.evaluate(() => game.state.world.knowledge.seen_stacks === true));
  await page.evaluate(() => { game.player.place(30, 20); game.cam.recentre(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1800);
  await shot('st_1_street');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  // the lobby and the committee
  await page.evaluate(() => { game.cam.zoomBy(1 / 0.7); });
  await walk(32, 29, 32, 33, () => game.state.world.knowledge.seen_lobby === true);
  check('the lobby is seen', await page.evaluate(() => game.state.world.knowledge.seen_lobby === true));
  await talk('npc_st_01');
  await pick('A flat.');
  await pick('(Pay. 250 Tolls)');
  await pick('That\'s all.');
  check('key money paid: 9-14 is yours', await page.evaluate(() => game.state.flags.st_flat === 'paid' && game.state.world.quests.q_st_flat?.status === 'done') && await has('k_st_key'));
  await shot('st_2_lobby');
  // the stair to floor nine
  await walk(32, 38, 32, 41, () => game.state.locationId === 'md_stacks_9');
  await page.waitForTimeout(5000);
  check('the stair came up on floor nine', await page.evaluate(() => game.state.locationId === 'md_stacks_9'), await page.evaluate(() => `at=${game.state.locationId} player=${game.player.tx},${game.player.ty}`));
  await walk(23, 22, 23, 26, () => game.state.world.knowledge.seen_nine === true);
  await page.evaluate(() => { game.player.place(24, 9); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('st_3_nine');
  // the flat: rest indoors on your own bed
  await prop(44, 12, 44, 13);
  await pick('(Rest, mend, write.)');
  await page.waitForTimeout(1500);
  check('the camp opened indoors from your own bed', await page.evaluate(() => !!document.querySelector('[data-rest]')));
  await shot('st_4_flat');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  await page.evaluate(() => { document.querySelectorAll('.camp, .overlay.camp').forEach((e) => e.remove()); });
  // the roof
  await walk(23, 22, 24, 18, () => game.state.locationId === 'md_stacks_roof');
  await page.waitForTimeout(5000);
  check('the stair came out on the roof', await page.evaluate(() => game.state.locationId === 'md_stacks_roof'), await page.evaluate(() => `at=${game.state.locationId} player=${game.player.tx},${game.player.ty}`));
  await walk(23, 28, 23, 25, () => game.state.world.quests.q_st_gardens?.stage === 'roof');
  check('the roof opened Rooftop Gardens', await page.evaluate(() => game.state.world.quests.q_st_gardens?.stage === 'roof'));
  await page.evaluate(() => { game.player.place(23, 18); game.cam.recentre(); game.cam.zoomBy(0.75); });
  await page.waitForTimeout(1800);
  await shot('st_5_roof');
  await page.evaluate(() => { game.cam.zoomBy(1 / 0.75); });
  await talk('npc_st_02');
  await pick('The log. Who takes what, when.');
  await pick('That\'s all.');
  check('the keeper\'s log is read', await page.evaluate(() => game.state.world.knowledge.st_tank_log === true));
  await talk('npc_st_03');
  await pick('Five to two for the beds');
  await pick('That\'s all.');
  check('Lio said the hours', await page.evaluate(() => game.state.flags.st_lio_shared === true));
  await prop(21, 13, 21, 14);
  await pick('(Reset the stops');
  await pick('(Leave it running.)');
  check('the valve gives both sides their hours: the roof is settled', await page.evaluate(() => game.state.flags.st_roof === 'shared' && game.state.world.quests.q_st_gardens?.status === 'done'));
  await shot('st_6_tank');
  await talk('npc_st_09');
  await pick('And me?');
  await pick('(Take the card.)');
  check('Latch\'s card', await has('k_latch_card'));
  await walk(23, 28, 23, 31, () => game.state.locationId === 'md_stacks_9');
  await page.waitForTimeout(5000);
  check('and the stair down again', await page.evaluate(() => game.state.locationId === 'md_stacks_9'), await page.evaluate(() => `at=${game.state.locationId}`));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
