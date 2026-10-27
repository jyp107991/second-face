// Openfield smoke: arrive from the west → the fields and the green → the Elder asks → the well's tracks name the son →
// the son is told on → the Sky Rite at the burial ground → Brother Ash joins. node tools/qa/openfield.cjs <outdir>
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
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(67, { frame: 'broad' }), 'he', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  // Ninebridge is behind us; the orchard thieves went to the Choir; survival for the tracks.
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.or_thieves_choir = true; g.pc.inventory.tolls = 80; g.pc.sheet.skillBought.survival = 60; g.world.knowledge.word_larkspur = true; game.quests.questStart('q_a2_openfield'); g.minutes = Math.floor(g.minutes / 1440) * 1440 + 10 * 60; await game.loadLocation('openfield', 'start'); g.world.at = 'openfield'; g.flags.visited_openfield = true; game.quests.update(); });
  await page.waitForTimeout(7000);
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('Openfield is peopled, the orchard thieves among them', await page.evaluate(() => game.npcs.has('npc_of_01') && game.npcs.has('npc_of_03') && game.npcs.has('of_kip') && game.npcs.size >= 14), await page.evaluate(() => `npcs=${game.npcs.size}`));
  await page.evaluate(() => { game.placeLocal(8, 27); game.cam.recentre(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1500);
  await shot('of_1_lane');
  await page.evaluate(() => { game.placeLocal(32, 24); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('of_2_green');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  // The Elder asks.
  await talk('npc_of_01');
  await pick('What\'s killing them?');
  await pick('I\'ll look at the well.');
  check('the Elder asked', await page.evaluate(() => game.state.flags.of_blight_told === true));
  // The well: the tracks.
  await page.evaluate(() => { game.placeLocal(32, 24); game.interactLocal(32, 22); });
  await page.waitForTimeout(1500);
  console.log('well:', await dlg());
  await shot('of_3_well');
  await pick('(Read the ground round the north trough.)');
  await pick('(The son.)');
  check('the tracks named the son', await page.evaluate(() => game.state.world.knowledge.of_poisoner_known === true && game.state.world.quests.q_a2_openfield?.stage === 'found'));
  // The son, told on.
  await talk('npc_of_04');
  await shot('of_4_tobias');
  await pick('Your father hears it.');
  await pick('(Leave them to it.)');
  check('the beat ends with the Elder told', await page.evaluate(() => game.state.flags.of_blight_outcome === 'exposed' && game.state.world.quests.q_a2_openfield?.status === 'done'), await page.evaluate(() => JSON.stringify(game.state.world.quests.q_a2_openfield?.stage)));
  // The hatch, with the word.
  await page.evaluate(() => { game.placeLocal(15, 38); game.cam.recentre(); game.cam.zoomBy(0.7); game.walkLocal(14, 38); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('hatch:', await dlg());
  await pick('(Say it to the iron.)');
  await pick('(Go down.)');
  await shot('of_5_cellar');
  await pick('(Go up.)');
  check('the hatch opened to the word', await page.evaluate(() => game.state.flags.unwritten_met === true && game.state.world.knowledge.stranger_name === true));
  // The Sky Rite with Petra, then Ash.
  await page.evaluate(() => { game.cam.zoomBy(1 / 0.7); });
  await talk('npc_of_02');
  await pick('The Choir\'s door is a burial');
  await pick('The man who died at my door.');
  await pick('(Keep the stone.)');
  check('a sibling of the Open Sky', await page.evaluate(() => game.state.flags.sky_rite === true && game.state.world.quests.q_of_rite?.status === 'done'));
  await page.evaluate(() => { game.placeLocal(55, 22); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('of_6_burial');
  await talk('npc_of_03');
  await shot('of_7_ash');
  await pick('Come east.');
  await pick('(Go.)');
  check('Ash joined', await page.evaluate(() => game.state.world.party.includes('npc_of_03') && game.state.flags.ash_joined === true));
  await page.waitForTimeout(2500);
  await shot('of_8_party');
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
