// Portrait latency and type check: time a cold and a warmed conversation open, and shoot the dialogue panel
// and the main menu for the typefaces. node tools/qa/portrait.cjs <outdir>
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
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  const fonts = await page.evaluate(() => Promise.race([document.fonts.ready.then(() => `ready (${[...document.fonts].filter((f) => f.status === 'loaded').length} loaded)`), new Promise((r) => setTimeout(() => r('timeout: ' + document.fonts.status), 15000))]));
  console.log('fonts:', fonts);
  await page.screenshot({ path: path.join(out, 'menu_type.png'), timeout: 180000 });
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(31, { frame: 'narrow' }), 'she', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.evaluate(async () => { const g = game.state; g.flags.ch1_done = true; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 11 * 60; await game.loadLocation('shale', 'start'); });
  await page.waitForTimeout(6000);
  // cold open: no warm-up has had the chance (first non-minor NPC, far from the player)
  const ids = await page.evaluate(() => [...game.npcs.values()].filter((n) => !n.def.minor && (n.dialogue ?? n.def.dialogue)).map((n) => n.def.id));
  const cold = await page.evaluate((id) => { const n = game.npcs.get(id); game.player.place(n.actor.tx, n.actor.ty + 1); const t = performance.now(); game.emit('openDialogue', { npc: n }); return performance.now() - t; }, ids[0]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'dialogue_type.png'), timeout: 180000 });
  await page.evaluate(() => document.querySelector('.dlg-opts li:last-child')?.click());
  await page.waitForTimeout(600);
  // warmed: stand by the next person, let the idle warm-up run, then open
  await page.evaluate((id) => { const n = game.npcs.get(id); game.player.place(n.actor.tx, n.actor.ty + 1); game.cam.recentre(); }, ids[1]);
  await page.waitForTimeout(4000);
  const warm = await page.evaluate((id) => { const n = game.npcs.get(id); const t = performance.now(); game.emit('openDialogue', { npc: n }); return performance.now() - t; }, ids[1]);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('.dlg-opts li:last-child')?.click());
  await page.waitForTimeout(400);
  // reopening the first person (now cached from the first open)
  const again = await page.evaluate((id) => { const n = game.npcs.get(id); game.player.place(n.actor.tx, n.actor.ty + 1); const t = performance.now(); game.emit('openDialogue', { npc: n }); return performance.now() - t; }, ids[0]);
  console.log(`open ms: cold=${cold.toFixed(0)} warmed=${warm.toFixed(0)} reopen=${again.toFixed(0)}; page errors: ${errors}`);
  await browser.close();
})();
