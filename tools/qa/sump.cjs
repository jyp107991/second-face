// Sump smoke: arrive from the track → the two rims → Grel hears the Marrs' name → the mouth opens → down the tunnel
// to Cistern 4 → the crank and the caretaker → the dormitory diary → back up. node tools/qa/sump.cjs <outdir>
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
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };

  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(71, { frame: 'narrow' }), 'she', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.world.knowledge.dw_origin_known = true; g.pc.sheet.skillBought.science = 50; g.pc.inventory.tolls = 60; game.quests.questStart('q_a2_cistern4'); g.minutes = Math.floor(g.minutes / 1440) * 1440 + 10 * 60; await game.loadLocation('sump', 'start'); g.world.at = 'sump'; g.flags.visited_sump = true; game.quests.update(); });
  await page.waitForTimeout(7000);
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('the Sump is peopled on both rims', await page.evaluate(() => game.npcs.has('npc_sp_01') && game.npcs.has('npc_sp_02') && game.npcs.has('npc_sp_03') && game.npcs.size >= 12), await page.evaluate(() => `npcs=${game.npcs.size}`));
  await page.evaluate(() => { game.placeLocal(25, 30); game.cam.recentre(); game.cam.zoomBy(0.6); });
  await page.waitForTimeout(1800);
  await shot('sp_1_bowl');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  await talk('npc_sp_01');
  await shot('sp_2_grel');
  await pick('The Marrs.');
  await pick('That\'s all.');
  check('Grel remembers the name', await page.evaluate(() => game.state.flags.sp_grel_leave === true));
  // the mouth
  await page.evaluate(() => { game.placeLocal(25, 13); game.cam.recentre(); game.cam.zoomBy(1 / 0.6); game.walkLocal(25, 11); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('mouth:', await dlg());
  await shot('sp_3_mouth');
  await pick('Grel says I go down.');
  await pick('(Down.)');
  check('the tunnel is open', await page.evaluate(() => game.state.flags.sp_tunnel_open === true && game.state.world.quests.q_a2_cistern4?.stage === 'sump'));
  // down: the exit at the throat's top
  await page.evaluate(() => { game.placeLocal(25, 3); game.walkLocal(25, 1); });
  await page.waitForFunction(() => game.state.locationId === 'cistern4' && !game.transitioning, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(5000);
  console.log('below:', await page.evaluate(() => `${game.state.locationId} player=${game.player?.tx},${game.player?.ty} npcs=${game.npcs.size}`));
  check('the tunnel comes up in Cistern 4', (await page.evaluate(() => game.state.locationId)) === 'cistern4');
  await page.evaluate(() => { game.cam.recentre(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1500);
  await shot('c4_1_pumproom');
  // the machine room: the crank, then FOUR
  await page.evaluate(() => { game.placeLocal(20, 4); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('c4_2_machine');
  await page.evaluate(() => { game.interactLocal(21, 3); });
  await page.waitForTimeout(1500);
  console.log('crank:', await dlg());
  await pick('(Clear the lead');
  await pick('(Go to the terminal.)');
  check('the crank woke the caretaker', await page.evaluate(() => game.state.flags.c4_powered === true));
  await page.evaluate(() => { game.placeLocal(18, 2); game.interactLocal(18, 1); });
  await page.waitForTimeout(1500);
  console.log('FOUR:', await dlg());
  await shot('c4_3_four');
  await pick('What were you told?');
  await pick('Where are your people?');
  await pick('Cistern 9.');
  await pick('Be well, FOUR.');
  check('FOUR told what the city ordered; the beat ends', await page.evaluate(() => game.state.world.knowledge.c4_four_spoke === true && game.state.world.quests.q_a2_cistern4?.status === 'done'), await page.evaluate(() => JSON.stringify(game.state.world.quests.q_a2_cistern4?.stage)));
  // the dormitory: the diary
  await page.evaluate(() => { game.placeLocal(31, 17); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('c4_4_dorm');
  await page.evaluate(() => { game.interactLocal(30, 18); });
  await page.waitForTimeout(1500);
  console.log('diary:', await dlg());
  await pick('(Take it.)');
  await pick('(Go.)');
  check('the diary is carried for the city', await page.evaluate(() => game.state.world.quests.q_c4_diary?.stage === 'carry'));
  // back up
  await page.evaluate(() => { game.placeLocal(43, 28); game.cam.recentre(); game.walkLocal(43, 29); });
  await page.waitForFunction(() => game.state.locationId === 'sump' && !game.transitioning, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(2000);
  check('the tunnel leads back up to the Sump', (await page.evaluate(() => game.state.locationId)) === 'sump');
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
