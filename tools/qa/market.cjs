// Old Market smoke: the avenue in → the mall's court and the gigs board → the Broker's hatch → the kiosk that knows
// your name → the boy and the wire, cut → the standpipe square talked down → Sato's card → the Loop to the Precinct
// and back. node tools/qa/market.cjs <outdir>
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
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const has = (id) => page.evaluate((id) => JSON.stringify(game.state.pc.inventory.items).includes(`"${id}"`), id);

  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(81, { frame: 'narrow' }), 'she', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.dw_restored = true; g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.pc.inventory.tolls = 200; g.pc.sheet.skillBought.speech = 90; g.pc.sheet.skillBought.barter = 90; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 11 * 60; await game.loadLocation('md_market', 'start'); g.world.at = 'meridian'; game.quests.update(); });
  await page.waitForTimeout(8000);
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('the market is peopled: the Broker, Sato, Lark, Vell', await page.evaluate(() => game.npcs.has('npc_mk_01') && game.npcs.has('npc_mk_05') && game.npcs.has('npc_mk_08') && game.npcs.has('npc_mk_09') && game.npcs.size >= 10), await page.evaluate(() => `npcs=${game.npcs.size}`));
  // the avenue in
  await page.evaluate(() => { game.player.place(3, 28); game.cam.recentre(); game.cam.zoomBy(0.7); game.walkTo(6, 28); });
  await page.waitForFunction(() => game.state.flags.md_market_open === true, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('the arrival fired and opened the market', await page.evaluate(() => game.state.world.knowledge.seen_market === true && game.state.flags.md_market_open === true));
  await shot('mk_1_avenue');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  // the court
  await page.evaluate(() => { game.player.place(29, 28); game.cam.recentre(); game.walkTo(31, 28); });
  await page.waitForFunction(() => game.state.world.knowledge.seen_broker === true, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('the court is seen', await page.evaluate(() => game.state.world.knowledge.seen_broker === true));
  await page.evaluate(() => { game.cam.recentre(); game.cam.zoomBy(1 / 0.7); });
  await page.waitForTimeout(1500);
  await shot('mk_2_court');
  // the gigs board
  await prop(38, 24, 38, 25);
  await shot('mk_3_board');
  await pick('A SEALED CASE');
  await pick('(Another.)');
  await pick('KNIT KITS');
  await pick('(That\'s enough.)');
  check('two gigs taken off the board', await page.evaluate(() => game.state.world.quests.q_gig_case?.stage === 'taken' && game.state.world.quests.q_gig_meds?.stage === 'taken') && await has('k_gig_case') && await has('c_knitkit'));
  // the Broker's hatch
  await talk('npc_mk_01');
  await shot('mk_4_hatch');
  await pick('Who are you?');
  await pick('That\'s all.');
  check('the Broker spoke', await page.evaluate(() => game.state.flags.broker_met === true));
  // the kiosk
  await prop(64, 37, 64, 38);
  await shot('mk_5_kiosk');
  await pick('How do you know my name?');
  await pick('(Step back.)');
  check('the kiosk said the name and the quest opened', await page.evaluate(() => game.state.world.quests.q_md_kiosk?.stage === 'name' && game.state.world.knowledge.kiosk_lamp_feeds === true));
  await talk('npc_mk_08');
  await pick('What does it eat?');
  await pick('That\'s all.');
  await talk('npc_mk_08');
  await pick('Who put the wire up the post?');
  await pick('That\'s all.');
  check('the boy named the wire', await page.evaluate(() => game.state.world.leads.l_kiosk_wire === true));
  await prop(64, 37, 64, 38);
  await pick('(Cut the wire where it leaves the post.)');
  await pick('(Leave it.)');
  check('the wire is cut', await page.evaluate(() => game.state.flags.mk_kiosk_outcome === 'cut' && game.state.world.quests.q_md_kiosk?.status === 'done'));
  // the standpipe square
  await page.evaluate(() => { game.player.place(36, 46); game.cam.recentre(); game.walkTo(36, 49); });
  await page.waitForFunction(() => game.state.world.quests.q_md_riot?.stage === 'queue', null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('the square is brewing', await page.evaluate(() => game.state.world.quests.q_md_riot?.stage === 'queue'), await page.evaluate(() => `player=${game.player.tx},${game.player.ty} seen=${game.state.flags.mk_riot_seen}`));
  await shot('mk_6_square');
  await talk('npc_mk_09');
  await pick('Forty names on a sheet');
  await pick('That\'s all.');
  check('the square was talked down', await page.evaluate(() => game.state.flags.mk_riot_outcome === 'talked' && game.state.world.quests.q_md_riot?.status === 'done'));
  // Sato, under the stair
  await talk('npc_mk_05');
  await shot('mk_7_sato');
  await pick('I need papers.');
  await pick('(Pay. 120 Tolls)');
  await pick('That\'s all.');
  check('Sato sold a dead citizen\'s card', await page.evaluate(() => game.state.flags.md_forged_papers === true) && await has('k_md_papers_forged'));
  // the Loop, both ways
  await prop(11, 4, 11, 5);
  await shot('mk_8_loop');
  await pick('The Precinct. (2 Tolls)');
  await page.waitForFunction(() => game.state.locationId === 'md_precinct', null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);
  check('the tram reached the Precinct', await page.evaluate(() => game.state.locationId === 'md_precinct'), await page.evaluate(() => `at=${game.state.locationId} player=${game.player.tx},${game.player.ty}`));
  await page.evaluate(() => { game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('mk_9_precinct');
  await prop(59, 25, 60, 24);
  await pick('Old Market. (2 Tolls)');
  await page.waitForFunction(() => game.state.locationId === 'md_market', null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);
  check('and back to Old Market', await page.evaluate(() => game.state.locationId === 'md_market'), await page.evaluate(() => `at=${game.state.locationId} player=${game.player.tx},${game.player.ty} tolls=${game.state.pc.inventory.tolls}`));
  await page.evaluate(() => { game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('mk_10_back');
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
