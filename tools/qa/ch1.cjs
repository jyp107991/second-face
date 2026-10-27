// Chapter One end to end, played through the real UI where it matters: new game → the clinic, the Elder, the door →
// out through the mouth → field map → Shale → the sheriff → the overpass gate → Kessler (paid route) → back to Shale →
// Pike's key → read the map from the pack → the title card → Tribute Day (pay) → save/load round trip.
// node tools/qa/ch1.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE', m.text().slice(0, 300)); } });
  let shots = 0;
  const shot = async (name) => { await page.screenshot({ path: path.join(out, `${String(++shots).padStart(2, '0')}_${name}.png`), timeout: 180000 }); };
  const dlg = () => page.evaluate(() => (document.querySelector('.dlg-name')?.textContent ?? 'none') + ' | ' + (document.querySelector('.dlg-text')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 110));
  const opts = () => page.evaluate(() => [...document.querySelectorAll('.dlg-opts li')].map((l) => l.textContent.trim().replace(/\s+/g, ' ')));
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  /** Click the first option whose text contains `sub`; report the options when it is missing. */
  const pick = async (sub) => {
    const ok = await page.evaluate((sub) => { const li = [...document.querySelectorAll('.dlg-opts li')].find((l) => l.textContent.includes(sub)); if (!li) return false; li.click(); return true; }, sub);
    await page.waitForTimeout(500);
    if (!ok) console.log(`  no option "${sub}" among: ${(await opts()).join(' | ')}`);
    else console.log(`  > ${sub}  →  ${await dlg()}`);
    return ok;
  };
  const talk = async (npcId) => {
    await page.evaluate((id) => { const n = game.npcs.get(id); if (!n) throw new Error('no npc ' + id); game.player.place(n.actor.tx, n.actor.ty + 1); game.cam.recentre(); game.emit('openDialogue', { npc: n }); }, npcId);
    await page.waitForTimeout(1200);
    console.log(`talk ${npcId}: ${await dlg()}`);
  };
  const closeDlg = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(400); };
  const flags = (...ks) => page.evaluate((ks) => ks.map((k) => `${k}=${JSON.stringify(game.state.flags[k])}`).join(' '), ks);
  const quest = (id) => page.evaluate((id) => { const q = game.state.world.quests[id]; return q ? `${q.status}/${q.stage}` : 'absent'; }, id);
  const travel = async (to) => {
    await page.evaluate(() => game.emit('openMap', {}));
    await page.waitForTimeout(800);
    let found = 'not found';
    for (let tries = 0; tries < 40 && found === 'not found'; tries++) { await page.waitForTimeout(750); found = await page.evaluate((to) => {
      const c = document.querySelector('.map-canvas'); if (!c) return 'no canvas'; const r = c.getBoundingClientRect();
      for (let y = 10; y < r.height; y += 6) for (let x = 10; x < r.width; x += 6) {
        c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true }));
        if ((document.querySelector('.map-side h4')?.textContent ?? '').toLowerCase() === to.toLowerCase()) return `${x},${y}`;
      }
      return 'not found';
    }, to); }
    console.log(`map: ${to} ${found}; side: ${await page.evaluate(() => document.querySelector('.map-side')?.textContent?.replace(/\s+/g, ' ').slice(0, 120))}`);
    const before = await page.evaluate(() => game.state.world.at);
    await page.evaluate(() => document.querySelector('.map-side [data-a=travel]')?.click());
    await page.waitForFunction((b) => game.state.world.at !== b && !game.transitioning && game.npcs.size > 0, before, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1500);
    console.log(`  arrived ${await page.evaluate(() => `${game.state.locationId} at=${game.state.world.at} day=${Math.floor(game.state.minutes / 1440) + 1} ${String(Math.floor((game.state.minutes % 1440) / 60)).padStart(2, '0')}:${String(Math.floor(game.state.minutes % 60)).padStart(2, '0')} npcs=${game.npcs.size} player=${game.player.tx},${game.player.ty}`)}`);
  };

  await page.goto('http://127.0.0.1:5173/?dev');
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(11, { frame: 'lean' }), 'they', 'pump_hand'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  check('new game in the Cistern', true, await quest('q_ch1_door'));
  await shot('c9_wake');
  await page.evaluate(() => game.emit('openMap', {}));
  await page.waitForTimeout(800);
  const inside = await page.evaluate(() => { const c = document.querySelector('.map-canvas'); if (!c) return 'no map'; const r = c.getBoundingClientRect();
    for (let y = 10; y < r.height; y += 6) for (let x = 10; x < r.width; x += 6) { c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true })); if ((document.querySelector('.map-side h4')?.textContent ?? '') === 'Shale') return document.querySelector('.map-side')?.textContent?.replace(/\s+/g, ' ').slice(0, 90) + ' travel=' + !!document.querySelector('.map-side [data-a=travel]'); } return 'shale not selectable'; });
  check('no setting out from inside the Cistern', inside.includes('travel=false'), inside);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // ---- The clinic: Pell shows you the photograph.
  await talk('npc_c9_02');
  await pick('Who was he?');
  await pick('Did he carry anything?');
  await pick('(Look at the photograph.)');
  console.log('  photo options:', (await opts()).join(' | '));
  await closeDlg();
  check('Escape closes a conversation with an exit', !(await page.evaluate(() => !!document.querySelector('.dlg'))));
  check('examined the body', (await flags('c9_examined')).includes('true'), await quest('q_ch1_door'));

  // ---- The Elder: take the order.
  await talk('npc_c9_01');
  await pick('I\'ll go. I want to know who he was.');
  await pick('I\'ll make do.');
  check('council done, order in hand', (await flags('c9_council_done')).includes('true'), await quest('q_ch1_door'));

  // ---- Bram and the great door.
  await talk('npc_c9_04');
  await pick('(Hand him the council order.)');
  await pick('Open it.');
  await shot('c9_bram_opens');
  await pick('(Step into the light.)');
  check('door open', (await flags('c9_door_open')).includes('true'), await quest('q_ch1_door'));
  await page.evaluate(() => { game.player.place(6, 4); game.cam.recentre(); game.player.setPath(game.loc.grid.findPath(6, 4, 5, 1, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => game.state.locationId === 'c9_mouth', null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(5000);
  check('walked out to the mouth', (await page.evaluate(() => game.state.locationId)) === 'c9_mouth', `${await quest('q_ch1_door')} ${await quest('q_ch1_shale')}`);
  await shot('c9_mouth');

  // ---- Field map → Shale.
  await travel('Shale');
  check('reached Shale', (await page.evaluate(() => game.state.locationId)) === 'shale', await quest('q_ch1_shale'));
  await shot('shale_arrive');

  // ---- The sheriff saw him.
  await talk('npc_sh_01');
  await pick('The salt cut. Cistern 9.');
  await pick('What\'s at the overpass?');
  console.log('  overpass options:', (await opts()).join(' | '));
  await pick('Noted.');
  await pick('Understood.');
  check('conversation closed by its exit option', !(await page.evaluate(() => !!document.querySelector('.dlg'))));
  check('quest moved to the overpass', (await quest('q_ch1_shale')) === 'active/overpass', await page.evaluate(() => JSON.stringify(game.state.world.knownLocations)));

  // ---- To the overpass (with coin in the pocket, as a trader's child might carry).
  await page.evaluate(() => { game.state.pc.inventory.tolls += 200; });
  await travel('the overpass');
  check('reached the overpass', (await page.evaluate(() => game.state.locationId)) === 'overpass', await quest('q_ch1_shale'));
  await page.evaluate(() => { game.player.setPath(game.loc.grid.findPath(game.player.tx, game.player.ty, 29, 37, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('gate:', await dlg());
  await shot('rd_gate');
  await pick('I\'m here to talk to Kessler.');
  await pick('(Walk slow.)');
  check('admitted at the gate', (await flags('rd_admitted')).includes('true'));

  // ---- Kessler, the paid route.
  await talk('npc_rd_01');
  await pick('Both. I\'m from the salt cut');
  await pick('Fair. Tell me about the paper.');
  await pick('Name a price.');
  await pick('(Pay. 80 Tolls)');
  console.log('  handover options:', (await opts()).join(' | '));
  await shot('rd_kessler');
  await closeDlg();
  check('bought the map', (await flags('have_map')).includes('true'), `${await quest('q_ch1_map')} ${await quest('q_ch1_name')} tolls=${await page.evaluate(() => game.state.pc.inventory.tolls)}`);

  // ---- Wren, briefly: the page.
  await talk('npc_rd_03');
  await pick('What did he say?');
  await pick('More.');
  console.log('  wren menu:', (await opts()).join(' | '));
  await closeDlg();
  check('left Wren\'s conversation', !(await page.evaluate(() => !!document.querySelector('.dlg'))), await flags('rd_wren_met'));

  // ---- Back to Shale; Pike sells a key.
  await travel('Shale');
  await talk('npc_sh_04');
  await pick('Who are the Tollmen?');
  console.log('  pike options:', (await opts()).join(' | '));
  await closeDlg();
  await talk('npc_sh_04');
  await pick('Do the Tollmen read this hand?');
  await pick('(Buy the wheel. 40 Tolls)');
  console.log('  key options:', (await opts()).join(' | '));
  await closeDlg();
  check('bought the cipher key', await page.evaluate(() => game.state.pc.inventory.items.some((i) => i.def === 'k_cipher_key')));

  // ---- Read the map from the pack.
  await page.evaluate(() => document.querySelector('[data-a=wrist]')?.click());
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.nb-top [data-t=gear]')?.click());
  await page.waitForTimeout(400);
  const rowOk = await page.evaluate(() => { const row = [...document.querySelectorAll('.item')].find((r) => r.textContent.includes('Stranger')); if (!row) return false; row.click(); return true; });
  await page.waitForTimeout(400);
  console.log('pack row:', rowOk, await page.evaluate(() => [...document.querySelectorAll('.acts button')].map((b) => b.textContent).join(' | ')));
  await shot('pack_map');
  await page.evaluate(() => [...document.querySelectorAll('.acts button')].find((b) => b.textContent === 'Read')?.click());
  await page.waitForTimeout(1200);
  console.log('read:', await dlg());
  await shot('map_read');
  await pick('(Set the Tollmen\'s cipher wheel to the first block.)');
  await pick('Jonah Reese. The deputy.');
  await pick('(Fold the map.)');
  await page.waitForTimeout(1500);
  const card = await page.evaluate(() => { const t = document.querySelector('.title-card'); return t ? `${t.textContent.replace(/\n/g, ' / ')} opacity=${getComputedStyle(t).opacity}` : 'none'; });
  console.log('title card:', card);
  await shot('title_card');
  check('Chapter One ends', (await flags('ch1_done')).includes('true'), `${await quest('q_ch1_name')} card=${card}`);
  check('no month timer (no day limits)', await page.evaluate(() => !(game.state.world.timers ?? []).some((t) => t.id === 'jonah_month') && game.state.world.quests.q_a1_jonah?.stage === 'month'), await page.evaluate(() => JSON.stringify((game.state.world.timers ?? []).map((t) => t.id))));

  // ---- Tribute Day waits for us: it comes at ten the next morning we are in Shale.
  await page.evaluate(() => { const g = game.state; g.minutes = (Math.floor(g.minutes / 1440) + 1) * 1440 + 10 * 60 + 1; });
  await page.waitForFunction(() => game.state.flags.tribute_day === true, null, { timeout: 30000 }).catch(() => {});
  console.log('tribute:', await flags('tribute_day'), await quest('q_ch1_tribute'), await page.evaluate(() => [...game.npcs.keys()].filter((k) => k.startsWith('tribute')).join(',')));
  await page.evaluate(() => { game.player.place(31, 28); game.cam.recentre(); game.player.setPath(game.loc.grid.findPath(31, 28, 31, 26, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log('wells:', await dlg());
  await shot('tribute_wells');
  for (const p of ['(Listen.)', '(Listen.)', '(Answer.)', 'Sheriff. Your call.', '(Watch them load the cart.)']) if (!(await pick(p))) break;
  await page.waitForTimeout(1500);
  check('Tribute Day resolved', (await flags('tribute_resolved')).includes('true'), `${await flags('tribute_outcome')} ${await quest('q_ch1_tribute')}`);
  await shot('tribute_after');

  // ---- Save and load.
  const before = await page.evaluate(() => JSON.stringify([game.state.flags, game.state.world.quests, game.state.world.timers, game.state.pc.inventory.tolls, game.state.world.knownLocations]));
  await page.evaluate(async () => { await game.save('quick'); });
  await page.evaluate(async () => { await game.loadSlot('quick'); });
  await page.waitForTimeout(8000);
  const after = await page.evaluate(() => JSON.stringify([game.state.flags, game.state.world.quests, game.state.world.timers, game.state.pc.inventory.tolls, game.state.world.knownLocations]));
  check('save/load round trip', before === after, `${await page.evaluate(() => `${game.state.locationId} npcs=${game.npcs.size}`)}${before === after ? '' : ' DIFF ' + before.length + ' vs ' + after.length}`);
  await shot('after_load');

  console.log('quests:', await page.evaluate(() => Object.entries(game.state.world.quests).map(([k, q]) => `${k}:${q.status}/${q.stage}`).join(' ')));
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors.length}`);
  await browser.close();
})();
