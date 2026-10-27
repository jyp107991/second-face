// Lantern Row smoke: the street at night → the card and the undercard → Mab's thirty → the bout against Anvil on the
// real combat system (nobody dies) → the purse → the Lantern: the shelf, the reel, the reverie look → the Loop.
// node tools/qa/lantern.cjs <outdir>
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
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(85, { frame: 'broad' }), 'he', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true; g.pc.inventory.tolls = 400; g.pc.sheet.skillBought.melee = 90; g.pc.sheet.skillBought.speech = 90; SF.addItem(g.pc.inventory, SF.makeItem('w_knuckles')); g.minutes = Math.floor(g.minutes / 1440) * 1440 + 21 * 60; await game.loadLocation('md_lantern', 'start'); g.world.at = 'meridian'; game.quests.update(); });
  await page.waitForTimeout(8000);
  console.log('npcs:', await page.evaluate(() => [...game.npcs.keys()].join(',')));
  check('the Row is peopled: Mab, Anvil, Ysolde, Pip, the Madame', await page.evaluate(() => ['npc_lr_01', 'npc_lr_02', 'npc_lr_05', 'npc_lr_06', 'npc_lr_08'].every((id) => game.npcs.has(id)) && game.npcs.size >= 16), await page.evaluate(() => `npcs=${game.npcs.size}`));
  // the street at night
  await walk(2, 33, 6, 33, () => game.state.world.knowledge.seen_lantern === true);
  check('the arrival fired', await page.evaluate(() => game.state.world.knowledge.seen_lantern === true && game.state.flags.md_lantern_open === true));
  await page.evaluate(() => { game.player.place(30, 19); game.cam.recentre(); game.cam.zoomBy(0.7); });
  await page.waitForTimeout(1800);
  await shot('lr_1_row');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())));
  await page.evaluate(() => { game.player.place(20, 27); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('lr_2_canal');
  // the pit: the card, the undercard, the stake
  await page.evaluate(() => { game.cam.zoomBy(1 / 0.7); });
  await prop(35, 38, 35, 37);
  await pick('(Leave it.)');
  check('the card is read', await page.evaluate(() => game.state.world.knowledge.lr_card_read === true));
  await talk('npc_lr_01');
  await pick('Twenty on the undercard.');
  await pick('Teague.');
  await pick('(Collect. Forty.)');
  await pick('That\'s all.');
  check('the undercard paid two to one', await page.evaluate(() => game.state.flags.lr_under_paid === true && game.state.pc.inventory.tolls === 420), await page.evaluate(() => `tolls=${game.state.pc.inventory.tolls}`));
  await talk('npc_lr_01');
  await pick('Thirty, and I\'m the comer.');
  await pick('(Pay. 30 Tolls)');
  await pick('(The ring.)');
  check('the stake is paid', await page.evaluate(() => game.state.flags.lr_comer_paid === true));
  await page.evaluate(() => { game.player.place(35, 44); game.cam.recentre(); });
  await page.waitForTimeout(1500);
  await shot('lr_3_pit');
  // the bout, on the real combat system
  await page.evaluate(() => { const g = game.state; const i = g.pc.inventory.items.findIndex((it) => it.id === 'w_knuckles'); if (i >= 0) SF.equip(g.pc.inventory, i); });
  await talk('npc_lr_02');
  await pick('(Fight.)');
  await page.waitForFunction(() => game.encounter.active === true, null, { timeout: 20000 }).catch(() => {});
  check('a pit bout began', await page.evaluate(() => game.encounter.active === true && game.encounter.pit === true && !!game.pitBout));
  await shot('lr_4_bout');
  // fight it out: attack when it is our turn, end the turn when we cannot
  const t0 = Date.now();
  while (Date.now() - t0 < 300000) {
    const state = await page.evaluate(async () => {
      const e = game.encounter;
      if (!e.active) return 'over';
      if (!e.isPlayerTurn) return 'wait';
      const p = e.player, foe = e.units.find((u) => u.hostile);
      if (!foe || !e.alive(foe)) return 'wait';
      const pv = e.preview(p, foe);
      if (pv.ok) { await e.attack(p, foe); return 'hit'; }
      const path = game.loc.grid.findPath(p.c.x, p.c.y, foe.c.x, foe.c.y, { ignore: p.c.id });
      if (path && path.length > 1 && p.c.ap > 0) { await e.moveUnit(p, path.slice(0, -1)); return 'move'; }
      e.endTurn(); return 'end';
    });
    if (state === 'over') break;
    await page.waitForTimeout(state === 'wait' ? 700 : 300);
  }
  await page.waitForTimeout(2500);
  console.log('bout:', await page.evaluate(() => JSON.stringify({ active: game.encounter.active, won: game.state.flags.lr_bout_won, lost: game.state.flags.lr_bout_lost, hp: game.state.pc.sheet.hp, anvilHp: game.npcs.get('npc_lr_02').combatant.sheet.hp, hostile: game.npcs.get('npc_lr_02').hostile })));
  check('the bout ended with both fighters standing and nobody hostile', await page.evaluate(() => !game.encounter.active && game.state.pc.sheet.hp > 0 && game.npcs.get('npc_lr_02').combatant.sheet.hp > 0 && game.npcs.get('npc_lr_02').hostile === false && (game.state.flags.lr_bout_won === true || game.state.flags.lr_bout_lost === true)));
  if (await page.evaluate(() => game.state.flags.lr_bout_won === true)) {
    await talk('npc_lr_01');
    await pick('(Take it.)');
    check('standing: the purse and the token', await page.evaluate(() => game.state.flags.lr_bout_paid === true && game.state.world.quests.q_lr_pits?.status === 'done') && await has('k_lr_token'));
  } else {
    await talk('npc_lr_01');
    await pick('Tomorrow, then.');
    check('floored: the slate wiped, tomorrow offered', await page.evaluate(() => game.state.flags.lr_bout_seen_lost === true));
  }
  // the Lantern: the shelf, the reel, the reverie
  await talk('npc_lr_05');
  await pick('The evidence shelf.');
  await pick('(Pay. 200 Tolls)');
  check('the reel is bought and the line opened', await has('k_lr_reel') && await page.evaluate(() => game.state.world.quests.q_lr_reverie?.stage === 'shelf'));
  await pick('(Jack in.)');
  await page.waitForTimeout(2500);
  console.log('reverie:', await dlg());
  check('the picture went cold: the reverie look is on', await page.evaluate(() => game.reverie === true));
  await shot('lr_5_reverie');
  await pick('(Listen. He is counting.)');
  await pick('(Look down, at what the hand is pressing flat.)');
  await pick('(Let the day run.)');
  await pick('(The gate. Look at who is looking.)');
  await pick('(Wake.)');
  await pick('(Sit up.)');
  await page.waitForTimeout(1500);
  check('the day was lived and the look came back', await page.evaluate(() => game.state.flags.lr_reel_seen === true && game.reverie === false && game.state.world.quests.q_lr_reverie?.status === 'done'));
  // the Loop
  await prop(11, 4, 11, 5);
  await pick('Old Market. (2 Tolls)');
  await page.waitForFunction(() => game.state.locationId === 'md_market', null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  check('the Loop runs to Old Market', await page.evaluate(() => game.state.locationId === 'md_market'), await page.evaluate(() => `at=${game.state.locationId} player=${game.player.tx},${game.player.ty}`));
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
