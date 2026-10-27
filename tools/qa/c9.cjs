// Cistern 9 smoke: new game → screenshot the dorm, walk to the clinic, talk to Pell, screenshot the great door. node tools/qa/c9.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.goto('http://127.0.0.1:5173/?dev');
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; });
  // Start a new game through the engine (skips the creator): default sheet + appearance.
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(5, { frame: 'broad' }), 'they', 'pump_hand'); });
  await page.waitForTimeout(9000);
  console.log(await page.evaluate(() => `${game.state.locationId} npcs=${game.npcs.size} quests=${JSON.stringify(game.state.world.quests)}`));
  await page.screenshot({ path: path.join(out, 'c9_dorm.png'), timeout: 180000 });
  // Teleport to the clinic and open Pell's conversation.
  await page.evaluate(() => { game.player.place(6, 15); game.cam.recentre(); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const n = game.npcs.get('npc_c9_02'); game.emit('openDialogue', { npc: n }); });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(out, 'c9_pell.png'), timeout: 180000 });
  await page.evaluate(() => document.querySelector('.dlg-opts li')?.click());
  await page.waitForTimeout(1000);
  console.log('dialogue text:', await page.evaluate(() => document.querySelector('.dlg-text')?.textContent?.slice(0, 120)));
  await page.keyboard.press('Escape');
  // The terminal (tree dialogue, no face).
  await page.evaluate(() => { document.querySelector('.dlg')?.remove(); game.portrait = undefined; game.paused = false; game.player.place(18, 2); game.cam.recentre(); game.tryInteract(18, 1); });
  await page.waitForTimeout(3000);
  console.log('terminal:', await page.evaluate(() => document.querySelector('.dlg-name')?.textContent + ' | ' + document.querySelector('.dlg-text')?.textContent?.slice(0, 100)));
  await page.screenshot({ path: path.join(out, 'c9_mother.png'), timeout: 180000 });
  await page.evaluate(() => { document.querySelector('.dlg')?.remove(); game.paused = false; game.state.flags.c9_door_open = true; game.player.place(6, 4); game.cam.recentre(); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, 'c9_hall.png'), timeout: 180000 });
  // Walk out through the great door → the Cistern mouth.
  await page.evaluate(() => { game.player.setPath(game.loc.grid.findPath(6, 4, 5, 1, { ignore: "player", adjacentOk: false })); });
  await page.waitForTimeout(9000);
  console.log(await page.evaluate(() => `${game.state.locationId} left=${game.state.flags.c9_left} quest=${game.state.world.quests.q_ch1_door?.status}`));
  await page.screenshot({ path: path.join(out, 'c9_mouth.png'), timeout: 180000 });
  console.log(JSON.stringify(await page.evaluate(() => game.perf())));
  await browser.close();
})();
