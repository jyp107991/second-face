// Immersion sweep evidence: the hover label and ring, a head turned to the player, lamps by hour. node tools/qa/immersion.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 300)); } });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.weatherOverride = 'clear'; await game.loadLocation('shale', 'start'); });
  await page.waitForFunction(() => game.state.locationId === 'shale' && game.npcs.size >= 10, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  // Hover over the sheriff: label and ring.
  const at = await page.evaluate(() => { const n = game.npcs.get('npc_sh_01'); game.player.place(n.actor.tx, n.actor.ty + 2); game.cam.recentre(); game.cam.viewGoal = 7; game.cam.viewHeight = 7; game.cam.target.copy(game.player.object.position); game.cam.focus.copy(game.cam.target); return [n.actor.tx, n.actor.ty]; });
  await page.waitForFunction(() => { const t = game.pickTile(640, 360); return !!t && Math.abs(t.x - game.player.tx) <= 2 && Math.abs(t.y - game.player.ty) <= 2; }, null, { timeout: 30000 }).catch(() => console.log('camera never settled on the player'));
  await page.waitForTimeout(1500);
  const screen = await page.evaluate(([tx, ty]) => { let sx = 0, sy = 0, n = 0; for (let y = 40; y < 700; y += 4) for (let x = 40; x < 1240; x += 4) { const t = game.pickTile(x, y); if (t && t.x === tx && t.y === ty) { sx += x; sy += y; n++; } } return n ? [sx / n, sy / n] : [640, 360]; }, at);
  console.log('screen:', screen.map((v) => Math.round(v)), 'picks:', await page.evaluate(([x, y]) => JSON.stringify(game.pickTile(x, y)), screen));
  await page.mouse.move(screen[0] - 40, screen[1] - 40);
  await page.mouse.move(screen[0], screen[1], { steps: 6 });
  await page.waitForTimeout(800);
  const label = await page.evaluate(() => { const l = document.querySelector('.hover-label'); return l && l.style.display !== 'none' ? l.textContent : 'none'; });
  console.log('hover label:', label, 'cursor scale:', await page.evaluate(() => game.cursor?.scale?.x ?? 'n/a'));
  await page.screenshot({ path: path.join(out, 'imm_1_hover.png'), timeout: 120000 });
  // Stand beside her: her head turns.
  await page.evaluate(() => { const n = game.npcs.get('npc_sh_01'); game.player.place(n.actor.tx + 1, n.actor.ty + 1); game.cam.recentre(); game.cam.viewGoal = 4.5; game.cam.viewHeight = 4.5; game.cam.target.copy(game.player.object.position); game.cam.focus.copy(game.cam.target); });
  await page.waitForFunction(() => { const n = game.npcs.get('npc_sh_01'); if (!n.actor.body.lookTarget) { game.player.place(n.actor.tx + 1, n.actor.ty + 1); } return !!n.actor.body.lookTarget; }, null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { game.cam.target.copy(game.player.object.position); game.cam.focus.copy(game.cam.target); });
  await page.waitForFunction(() => { const t = game.pickTile(640, 360); return !!t && Math.abs(t.x - game.player.tx) <= 2 && Math.abs(t.y - game.player.ty) <= 2; }, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  console.log('look target set:', await page.evaluate(() => !!game.npcs.get('npc_sh_01').actor.body.lookTarget));
  await page.screenshot({ path: path.join(out, 'imm_2_headturn.png'), timeout: 120000 });
  // Lamps: the lamp post at the wells plaza by day and at dusk.
  for (const [h, name] of [[13, 'imm_3_lamps_noon'], [19.6, 'imm_4_lamps_dusk']]) {
    await page.evaluate((h) => { game.state.minutes = Math.floor(game.state.minutes / 1440) * 1440 + h * 60; game.placeLocal(27, 21); game.cam.recentre(); game.cam.viewGoal = 9; game.cam.viewHeight = 9; game.cam.target.copy(game.player.object.position); game.cam.focus.copy(game.cam.target); }, h);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(out, `${name}.png`), timeout: 120000 });
  }
  // The hurt pulse (the post uniform) can be driven directly.
  await page.evaluate(() => { game.post.hurt = 1; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, 'imm_5_hurt.png'), timeout: 120000 });
  console.log('errors:', errors);
  await browser.close();
})();
