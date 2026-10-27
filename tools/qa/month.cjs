// Jonah's month smoke: drills on → Ilya at the yard → he joins and follows; the water settled at Dry Wells with nothing
// changed for Jonah → the month resolves (no clock: a milestone), the deputy is gone from the street, the card shows.
// node tools/qa/month.cjs <outdir>
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
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };

  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(41, { frame: 'narrow' }), 'they', 'archive_clerk'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  // The month is running; the drills have started; we are a talker.
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.flags.jonah_named = true; g.flags.drills_started = true; g.pc.sheet.skillBought.speech = 90; g.world.knowledge.overpass_dogs = true; game.quests.questStart('q_a1_jonah'); game.quests.questStart('q_sh_drills'); await game.loadLocation('shale', 'start'); });
  await page.waitForTimeout(7000);
  const ilya = await page.evaluate(() => { const n = game.npcs.get('npc_sh_17'); return n ? `${n.def.name}@${n.actor.tx},${n.actor.ty}` : 'absent'; });
  check('Ilya is at the yard once the drills start', ilya.startsWith('Ilya'), ilya);
  await page.evaluate(() => { const n = game.npcs.get('npc_sh_17'); game.player.place(n.actor.tx, n.actor.ty + 1); game.cam.recentre(); game.cam.zoomBy(0.7); game.emit('openDialogue', { npc: n }); });
  await page.waitForTimeout(2500);
  console.log('ilya:', await dlg());
  await shot('month_1_ilya');
  await pick('Show them, then.');
  await pick('Right.');
  await pick('Come east with me.');
  await pick('Because the militia has nine rifles');
  await pick('Keep up.');
  await page.waitForTimeout(1500);
  check('Ilya joined the party', await page.evaluate(() => game.state.world.party.includes('npc_sh_17') && game.npcs.get('npc_sh_17')?.companion === true), await page.evaluate(() => JSON.stringify(game.state.world.party)));
  // He follows: walk ten tiles and look where he is.
  await page.evaluate(() => { game.placeLocal(30, 25); game.cam.recentre(); game.player.setPath(game.findPathLocal(30, 25, 24, 25, { ignore: 'player', adjacentOk: false })); });
  const distAt = () => page.evaluate(() => { const n = game.npcs.get('npc_sh_17'); return Math.abs(n.actor.tx - game.player.tx) + Math.abs(n.actor.ty - game.player.ty); });
  const d0 = await distAt();
  await page.waitForTimeout(15000);
  const d1 = await distAt();
  const follow = await page.evaluate(() => { const n = game.npcs.get('npc_sh_17'); return `player=${game.player.tx},${game.player.ty} ilya=${n.actor.tx},${n.actor.ty} moving=${n.actor.moving}`; });
  console.log('follow:', follow, `dist ${d0} → ${d1}`);
  check('Ilya follows (headless frames are slow: he closes the distance)', d1 < d0, `${d0} → ${d1}`);
  await shot('month_2_follow');
  // The month has no clock: four hundred days pass and nothing resolves; then the water at Dry Wells is settled and it does.
  const jonahBefore = await page.evaluate(() => !!game.npcs.get('npc_sh_02'));
  await page.evaluate(() => { game.state.minutes += 400 * 1440; });
  await page.waitForTimeout(3000);
  check('no day limit: the month is still open after four hundred days', await page.evaluate(() => game.state.world.quests.q_a1_jonah?.stage === 'month' && !game.state.flags.jonah_month_over));
  await page.evaluate(() => { const g = game.state; game.quests.questStart('q_a1_drywells'); g.flags.dw_admitted = true; g.flags.dw_control_open = true; g.flags.dw_kept = true; g.flags.dw_outcome = 'kept'; game.quests.update(); });
  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => `stage=${game.state.world.quests.q_a1_jonah?.stage} dead=${game.state.flags.jonah_dead} death=${game.state.flags.jonah_death} jonahOnMap=${!!game.npcs.get('npc_sh_02') && !game.npcs.get('npc_sh_02').away} card=${document.querySelector('.title-card')?.textContent?.replace(/\n/g, ' / ')}`);
  console.log('month\'s end:', after, 'jonah before:', jonahBefore);
  check('the month resolved when the water was settled', after.includes('stage=fell') && after.includes('dead=true'));
  await page.evaluate(() => game.syncPlacements());
  await page.waitForTimeout(800);
  check('the deputy is gone from the street', await page.evaluate(() => { const n = game.npcs.get('npc_sh_02'); return !n || n.away === true; }));
  await shot('month_3_months_end');
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}`);
  await browser.close();
})();
