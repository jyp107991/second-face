// Meridian smoke: the road to the Wall → the lens knows the face → admitted on sight → the Precinct avenue → the
// assessor reads the diary and joins → the desk warden's fines → the Loop platform. node tools/qa/meridian.cjs <outdir>
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
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(79, { frame: 'broad' }), 'he', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.dw_restored = true; g.pc.inventory.tolls = 120; SF.addItem(g.pc.inventory, SF.makeItem('k_c4_diary')); SF.addItem(g.pc.inventory, SF.makeItem('k_photo')); game.quests.questStart('q_c4_diary'); game.quests.questStart('q_a2_precinct'); g.minutes = Math.floor(g.minutes / 1440) * 1440 + 10 * 60; await game.loadLocation('md_precinct', 'start'); g.world.at = 'meridian'; game.quests.update(); });
  await page.waitForTimeout(8000);
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('the Precinct is peopled, the assessor at its desk', await page.evaluate(() => game.npcs.has('npc_md_01') && game.npcs.has('npc_md_nine') && game.npcs.has('npc_md_12') && game.npcs.size >= 18), await page.evaluate(() => `npcs=${game.npcs.size}`));
  await page.evaluate(() => { game.player.place(5, 29); game.cam.recentre(); game.cam.zoomBy(0.65); });
  await page.waitForTimeout(1800);
  await shot('md_1_wall');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  // the gate
  await page.evaluate(() => { game.player.place(9, 29); game.cam.recentre(); game.walkTo(11, 29); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('gate:', await dlg());
  await shot('md_2_gate');
  await pick('(Face the lens.)');
  await pick('What status?');
  await shot('md_3_status');
  await pick('Then admit me on sight.');
  await pick('(Through.)');
  check('the file admitted on sight', await page.evaluate(() => game.state.flags.md_status === 'flagged' && game.state.world.quests.q_a2_precinct?.status === 'done'), await page.evaluate(() => JSON.stringify(game.state.world.quests.q_a2_precinct?.stage)));
  // the avenue
  await page.evaluate(() => { game.player.place(30, 29); game.cam.recentre(); game.cam.zoomBy(1 / 0.65); });
  await page.waitForTimeout(1800);
  await shot('md_4_avenue');
  // the assessor: the diary, then the road
  await talk('npc_md_nine');
  await shot('md_5_nine');
  await pick('(Put the Cistern 4 diary on the desk.)');
  await pick('What is the other one?');
  await pick('Come and see where they come from.');
  await pick('(Go.)');
  check('the diary was read and the assessor joined', await page.evaluate(() => game.state.flags.c4_diary_delivered === true && game.state.world.party.includes('npc_md_nine') && game.state.world.quests.q_c4_diary?.status === 'done'));
  await page.waitForTimeout(2500);
  await shot('md_6_party');
  // the desk warden
  await talk('npc_md_g5');
  await pick('(Pay. 45 Tolls)');
  await pick('That\'s all.');
  check('fined in advance and paid', await page.evaluate(() => game.state.flags.md_fines_paid === true && game.state.world.quests.q_md_fines?.status === 'done'));
  // the Loop platform
  await page.evaluate(() => { game.player.place(60, 24); game.cam.recentre(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { game.tryInteract(59, 25); });
  await page.waitForTimeout(1500);
  console.log('loop:', await dlg());
  await shot('md_7_loop');
  await pick('(The lines through the names.)');
  await pick('(Leave it.)');
  check('the Loop board reads', await page.evaluate(() => game.state.world.knowledge.md_loop_works === true));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
