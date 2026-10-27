// The Crown smoke: the invitation car and the lens → a chit past the sergeant → the terraces under glass → the hall
// door and the Masque → the hostess, the lectern and the Chair → the studio and the print → the parapet → the car down.
// node tools/qa/crown.cjs <outdir>
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
  const settle = async () => { await page.waitForFunction(() => game.state.locationId === 'md_crown' && game.npcs.size >= 10, null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(4000); };
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const has = (id) => page.evaluate((id) => JSON.stringify(game.state.pc.inventory.items).includes(`"${id}"`), id);

  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(91, { frame: 'narrow' }), 'she', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true; g.flags.md_lantern_open = true; g.pc.inventory.tolls = 300; g.pc.sheet.skillBought.speech = 90; SF.addItem(g.pc.inventory, SF.makeItem('k_masque_chit')); SF.addItem(g.pc.inventory, SF.makeItem('k_photo')); g.minutes = Math.floor(g.minutes / 1440) * 1440 + 20 * 60; await game.loadLocation('md_precinct', 'loop'); g.world.at = 'meridian'; game.quests.update(); });
  await page.waitForTimeout(6000);
  // the invitation car from the Precinct platform
  await prop(59, 25, 59, 26);
  const car = await pick('The Crown. (The invitation car.)');
  if (!car) { await page.evaluate(async () => { await game.loadLocation('md_crown', 'lift'); }); }
  await settle();
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('the car came up to the Crown', await page.evaluate(() => game.state.locationId === 'md_crown'), await page.evaluate(() => `at=${game.state.locationId} npcs=${game.npcs.size}`));
  await walk(32, 48, 32, 45, () => game.state.world.quests.q_cr_masque?.stage === 'lift');
  check('the lobby opened The Masque', await page.evaluate(() => game.state.world.quests.q_cr_masque?.stage === 'lift' && game.state.flags.md_crown_open === true));
  await page.evaluate(() => { game.placeLocal(32, 46); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('cr_1_lobby');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  // the sergeant and the chit
  await talk('npc_cr_08');
  await pick('(Show the chit.)');
  await pick('(Through the gate.)');
  await settle();
  check('past the lens on a chit', await page.evaluate(() => game.state.flags.cr_entry === 'chit' && game.state.locationId === 'md_crown'), await page.evaluate(() => `player=${game.player.tx},${game.player.ty} entry=${game.state.flags.cr_entry}`));
  check('the sergeant moved to his booth', await page.evaluate(() => game.npcs.has('npc_cr_08_booth') && !game.npcs.has('npc_cr_08')));
  await walk(32, 40, 32, 34, () => game.state.world.knowledge.seen_terraces === true);
  check('the terraces under glass', await page.evaluate(() => game.state.world.knowledge.seen_terraces === true));
  await page.evaluate(() => { game.placeLocal(32, 30); game.cam.recentre(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1800);
  await shot('cr_2_terraces');
  await page.evaluate(() => { game.cam.zoomBy(1 / 0.7); });
  // the glass table, the hall door, the Masque
  await prop(38, 24, 37, 24);
  await pick('(Leave it.)');
  await talk('npc_cr_03');
  await pick('(The chit.)');
  await pick('(In.)');
  await settle();
  check('Dace opened the hall', await page.evaluate(() => game.state.flags.cr_hall_open === true && game.npcs.has('npc_cr_03_side')));
  await walk(32, 12, 32, 9, () => game.state.world.knowledge.seen_masque === true);
  check('the Masque', await page.evaluate(() => game.state.world.knowledge.seen_masque === true));
  await talk('npc_cr_01');
  await shot('cr_3_masque');
  await pick('What is the Chair?');
  await pick('That\'s all.');
  check('the Chair explained', await page.evaluate(() => game.state.world.knowledge.cr_chair_heard === true));
  await talk('npc_cr_10');
  await pick('Your mother sold the Chair');
  await pick('That\'s all.');
  check('Osric says where the reel is', await page.evaluate(() => game.state.world.knowledge.cr_reel_where === true && game.state.world.leads.l_cr_concern_chair === true));
  // the lectern: a word for Ashby-Crane
  await prop(32, 4, 32, 5);
  await pick('Speak for House Ashby-Crane.');
  await pick('(Step back.)');
  check('the Chair went to Ashby-Crane on a word', await page.evaluate(() => game.state.flags.cr_chair === 'ashby' && game.state.world.quests.q_cr_masque?.status === 'done'), await page.evaluate(() => `chair=${game.state.flags.cr_chair} stage=${game.state.world.quests.q_cr_masque?.stage}`));
  // the studio
  await page.evaluate(() => { game.placeLocal(44, 22); game.cam.recentre(); });
  await walk(44, 22, 48, 23, () => game.state.world.knowledge.seen_studio === true);
  check('the studio and its queue', await page.evaluate(() => game.state.world.knowledge.seen_studio === true && game.state.world.quests.q_cr_studio?.stage === 'portraits'));
  await talk('npc_cr_05');
  await shot('cr_4_studio');
  await pick('Render me. (50 Tolls)');
  await pick('(Hold it beside the photograph.)');
  await pick('(Keep the print.)');
  check('the renderer had you already', await has('k_cr_render') && await page.evaluate(() => game.state.world.leads.l_studio_render === true && game.state.world.quests.q_cr_studio?.status === 'done'));
  // the parapet, and down
  await walk(50, 29, 59, 29, () => game.state.world.knowledge.crown_view === true);
  check('the city from the parapet', await page.evaluate(() => game.state.world.knowledge.crown_view === true), await page.evaluate(() => `player=${game.player.tx},${game.player.ty}`));
  await page.evaluate(() => { game.cam.recentre(); game.cam.zoomBy(0.8); });
  await page.waitForTimeout(1500);
  await shot('cr_5_parapet');
  await page.evaluate(() => { game.cam.zoomBy(1 / 0.8); });
  await prop(36, 48, 35, 48);
  await pick('Down. The Precinct platform.');
  await page.waitForFunction(() => game.state.locationId === 'md_precinct', null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  check('the car went down to the Precinct', await page.evaluate(() => game.state.locationId === 'md_precinct'), await page.evaluate(() => `at=${game.state.locationId}`));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
