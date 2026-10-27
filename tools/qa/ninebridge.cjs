// Ninebridge smoke: arrive on the west bank → the toll at the sandbags → the deck, the Span, the Exchange hall →
// the packet delivered → the Grand Factor sells the line → the block → Odile joins. node tools/qa/ninebridge.cjs <outdir>
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
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(61, { frame: 'narrow' }), 'she', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  // Act 1 is behind us: the finale's hand-over, a sealed packet in the pack, coin, the map.
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.th_passed = true; g.flags.jonah_month_over = true; g.pc.inventory.tolls = 300; g.pc.sheet.skillBought.speech = 40; SF.addItem(g.pc.inventory, SF.makeItem('k_packet')); SF.addItem(g.pc.inventory, SF.makeItem('k_map')); game.quests.questStart('q_a2_ninebridge'); g.minutes = Math.floor(g.minutes / 1440) * 1440 + 11 * 60; await game.loadLocation('ninebridge', 'start'); g.world.at = 'ninebridge'; g.flags.visited_ninebridge = true; game.quests.update(); });
  await page.waitForTimeout(7000);
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('the road east is on and Ninebridge is peopled', await page.evaluate(() => game.state.world.quests.q_a2_ninebridge?.stage === 'road' && game.npcs.has('npc_nb_01') && game.npcs.has('npc_nb_03') && game.npcs.has('npc_nb_05') && game.npcs.size >= 15), await page.evaluate(() => `npcs=${game.npcs.size}`));
  await page.evaluate(() => { game.player.place(6, 21); game.cam.recentre(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1500);
  await shot('nb_1_west_bank');
  // Walk into the toll trigger at the sandbags.
  await page.evaluate(() => { game.player.place(20, 22); game.cam.recentre(); game.walkTo(22, 22); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('toll:', await dlg());
  check('the toll talk opened at the sandbags', (await dlg()).startsWith('Toll-warden'));
  await pick('(Pay. 12 Tolls)');
  await pick('(Cross.)');
  check('paid the crossing', await page.evaluate(() => game.state.flags.nb_toll_paid === true && game.state.pc.inventory.tolls === 288));
  // The deck.
  await page.evaluate(() => { game.player.place(32, 22); game.cam.recentre(); game.cam.zoomBy(1 / 0.7); });
  await page.waitForTimeout(1800);
  await shot('nb_2_deck');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  // The hall door: courier.
  // Headless frames are ~1/s, so one tile of walking is several seconds; start at the door's threshold.
  await page.evaluate(() => { game.player.place(37, 26); game.cam.recentre(); game.walkTo(37, 25); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('hall:', await dlg());
  await pick('(Show the sealed packet.)');
  await pick('(In.)');
  check('the floor opened to a courier', await page.evaluate(() => game.state.flags.nb_floor_ok === true && game.state.flags.nb_office_ok === true));
  await page.evaluate(() => { game.player.place(36, 21); game.cam.recentre(); game.cam.zoomBy(0.6); });
  await page.waitForTimeout(1500);
  await shot('nb_3_floor');
  // The Grand Factor: the packet, then the line.
  await talk('npc_nb_01');
  await shot('nb_4_sarr');
  await pick('(Put the packet on the desk.) From Tollhouse 9. Sealed.');
  await pick('Water.');
  await pick('That\'s all.');
  check('the packet was delivered unopened and paid for', await page.evaluate(() => game.state.flags.nb_packet_delivered === true && game.state.pc.inventory.tolls === 328));
  await talk('npc_nb_01');
  await pick('Who paid for the riders');
  await pick('(Pay. 200 Tolls)');
  await pick('That\'s all.');
  check('the Exchange beat ends on the bought line', await page.evaluate(() => game.state.world.quests.q_a2_ninebridge?.status === 'done' && game.state.world.quests.q_a2_ninebridge?.stage === 'paid' && !!game.state.world.knowledge.nb_paid_truth), await page.evaluate(() => JSON.stringify(game.state.world.quests.q_a2_ninebridge)));
  // The block on the east bank.
  await page.evaluate(() => { game.player.place(56, 14); game.cam.recentre(); game.cam.zoomBy(1 / 0.6); });
  await page.waitForTimeout(1500);
  await shot('nb_5_block');
  await talk('npc_nb_02');
  await pick('Lot four.');
  await pick('That\'s all.');
  check('lot four is a quest', await page.evaluate(() => game.state.world.quests.q_nb_auction?.stage === 'block'));
  // The Span: Odile.
  await page.evaluate(() => { game.player.place(27, 18); game.cam.recentre(); game.cam.zoomBy(0.6); });
  await page.waitForTimeout(1500);
  await talk('npc_nb_03');
  await shot('nb_6_odile');
  await pick('Who are you?');
  await pick('What trade?');
  await pick('It\'s still there.');
  await pick('Come with me.');
  await pick('(Go.)');
  check('Odile joined', await page.evaluate(() => game.state.world.party.includes('npc_nb_03') && game.state.flags.odile_joined === true));
  await page.waitForTimeout(2500);
  check('Odile follows on the deck', await page.evaluate(() => { const n = game.npcs.get('npc_nb_03'); return !!n && Math.hypot(n.actor.tx - game.player.tx, n.actor.ty - game.player.ty) < 4; }), await page.evaluate(() => `${game.npcs.get('npc_nb_03')?.actor.tx},${game.npcs.get('npc_nb_03')?.actor.ty} vs ${game.player.tx},${game.player.ty}`));
  await shot('nb_7_party');
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
