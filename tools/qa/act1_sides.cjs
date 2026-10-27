// Act 1 side lines: the seed errand, the Choir tent, Mags's books, a letter for Bram. node tools/qa/act1_sides.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 300)); } });
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`), timeout: 120000 });
  const dlg = () => page.evaluate(() => (document.querySelector('.dlg-name')?.textContent ?? 'none') + ' | ' + (document.querySelector('.dlg-text')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 90));
  const opts = () => page.evaluate(() => [...document.querySelectorAll('.dlg-opts li')].map((l) => l.textContent.trim().replace(/\s+/g, ' ')));
  const pick = async (sub) => { const ok = await page.evaluate((sub) => { const li = [...document.querySelectorAll('.dlg-opts li')].find((l) => l.textContent.includes(sub)); if (!li) return false; li.click(); return true; }, sub); await page.waitForTimeout(600); if (!ok) console.log(`  no option "${sub}" among: ${(await opts()).join(' | ')}`); return ok; };
  const talk = async (id) => { await page.evaluate((id) => { const n = game.npcs.get(id); if (!n) throw new Error('no npc ' + id); game.player.place(n.actor.tx, n.actor.ty + 1); game.cam.recentre(); game.emit('openDialogue', { npc: n }); }, id); await page.waitForTimeout(1200); console.log(`talk ${id}: ${await dlg()}`); };
  const quest = (id) => page.evaluate((id) => { const q = game.state.world.quests?.[id]; return q ? `${q.status}/${q.stage}` : 'none'; }, id);
  const knows = (k) => page.evaluate((k) => !!game.state.world.knowledge[k], k);
  const load = async (map, spawn = 'start', min = 1) => { await page.evaluate(async ([m, sp]) => { await game.loadLocation(m, sp); game.state.world.at = m; }, [map, spawn]); await page.waitForFunction(([m, n]) => game.state.locationId === m && game.npcs.size >= n, [map, min], { timeout: 120000 }); await page.waitForTimeout(1500); };
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(31, { frame: 'broad' }), 'she', 'pump_hand'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.waitForTimeout(1000);

  // --- A letter for Bram: he gives it before the door opens.
  await talk('npc_c9_04');
  await pick('If the door opens, is there anything');
  await pick('If she\'s there.');
  check('Bram hands over his letter', (await page.evaluate(() => game.state.pc.inventory.items.some((i) => i.def === 'k_bram_letter'))) && (await quest('q_a1_bram')) === 'active/carry', await quest('q_a1_bram'));

  // --- Shale: the seed, the tent, the books.
  await page.evaluate(() => { game.state.flags.visited_shale = true; game.state.world.knownLocations.push('shale'); game.state.pc.inventory.tolls += 300; });
  await load('shale', 'start', 12);
  await page.evaluate(() => { game.devApply([{ quest: 'q_a1_seed', start: true }, { give: 'k_seed_case' }, { give: 'c_water', count: 4 }, { give: 'c_splint' }]); });
  check('the seed errand is on with the case in the pack', (await quest('q_a1_seed')) === 'active/deliver', await quest('q_a1_seed'));
  await talk('npc_sh_05');
  await pick('What do you have?');
  await pick('(Give her the Cistern\'s seed case.)');
  await pick('Under the sky.');
  check('the seed went to the Choir', (await quest('q_a1_seed')) === 'done/given' && (await knows('seed_given_choir')), await quest('q_a1_seed'));
  // The tent.
  await pick('You\'ve three on cots and one of you.');
  await pick('Slow it is.');
  await pick('Take care.');
  check('the tent job is on', (await quest('q_a1_tents')) === 'active/tend', await quest('q_a1_tents'));
  await page.evaluate(() => { game.placeLocal(12, 37); game.cam.recentre(); game.cam.viewGoal = 8; game.cam.viewHeight = 8; });
  await page.waitForTimeout(2500);
  await shot('sides_1_tent');
  await talk('npc_sh_20');
  await pick('(Give him water, a sip at a time.)');
  await pick('Rest.');
  await talk('npc_sh_21');
  const sawDog = (await opts()).some((o) => o.includes('overpass'));
  await pick('(Replace the board with a proper splint.)');
  await pick('Rest.');
  if (sawDog) { await talk('npc_sh_21'); await pick('You\'re from the overpass.'); await pick('I didn\'t see anything.'); await pick('Rest.'); }
  await talk('npc_sh_22');
  await pick('(Sit with him an hour and keep him drinking.)');
  await pick('Rest.');
  check('three seen to', (await quest('q_a1_tents')) === 'active/tended', `${await quest('q_a1_tents')} dog=${sawDog}`);
  await talk('npc_sh_05');
  await pick('Let me see.');
  await pick('The three are seen to.');
  await pick('I\'ll try.');
  check('a lay healer of the Choir', (await quest('q_a1_tents')) === 'done/done_stage' && (await knows('tents_thanked')), await quest('q_a1_tents'));
  // Mags's books.
  await page.evaluate(() => { game.devApply([{ trust: { npc: 'npc_sh_03', by: 10 } }]); });
  await talk('npc_sh_03');
  await pick('What have you got?');
  await pick('You look like someone with a problem.');
  await pick('I\'ll read them.');
  check('Mags hands over the books', (await page.evaluate(() => game.state.pc.inventory.items.some((i) => i.def === 'k_mags_books'))) && (await quest('q_a1_books')) === 'active/audit', await quest('q_a1_books'));
  await page.evaluate(() => game.emit('openDialogue', { tree: 'd_mags_books', name: 'The Dry Well\'s books' }));
  await page.waitForTimeout(1200);
  console.log('books:', await dlg());
  const cooked = (await opts()).some((o) => o.includes('buyout'));
  await pick(cooked ? '(It is a buyout, and she is hiding it.)' : '(Water in, water out. Nothing here.)');
  await page.waitForTimeout(500);
  await talk('npc_sh_03');
  await pick('Let\'s see.');
  if (cooked) {
    await pick('About your books.');
    await pick('I can make these balance');
    const helped = await pick('Always, then.');
    if (!helped) { await pick('I won\'t.'); }
  } else {
    await pick('Your books. There\'s no thief in them.');
    await pick('Thanks.');
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  check('the books are settled one way or another', ['done/helped', 'done/clean'].includes(await quest('q_a1_books')), `${await quest('q_a1_books')} cooked=${cooked}`);
  // Hesper answers Bram's letter.
  await talk('npc_sh_14');
  await pick('I\'ve a letter for Edda Vale.');
  await pick('Write him the truth. Kindly.');
  await pick('I\'ll carry it.');
  check('Hesper writes back', (await page.evaluate(() => game.state.pc.inventory.items.some((i) => i.def === 'k_hesper_reply'))) && (await quest('q_a1_bram')) === 'active/answer', await quest('q_a1_bram'));
  await shot('sides_2_hesper');
  // Back to the Cistern.
  await page.evaluate(() => { game.state.flags.c9_door_open = true; });
  await load('cistern9', 'start', 5);
  await talk('npc_c9_04');
  await pick('(Give him Hesper\'s letter.)');
  await pick('(Leave him to it.)');
  check('Bram knows', (await quest('q_a1_bram')) === 'done/truth', await quest('q_a1_bram'));
  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL PASS', '; page errors:', errors);
  await browser.close();
})();
