// Captured motion in the world: the player idling, talking, sitting, working, then a walk and a run through Shale.
// node tools/qa/motion.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('low'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(11, {}), 'they', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.waitForFunction(() => SF.motionReady(), null, { timeout: 60000 });
  await page.evaluate(async () => { await game.loadLocation('shale', 'start'); });
  await page.waitForFunction(() => game.world.ringComplete(game.player.tx, game.player.ty), null, { timeout: 120000 }).catch(() => {});
  await page.evaluate(() => { const g = game.state; g.minutes = Math.floor(g.minutes / 1440) * 1440 + 11 * 60; game.placeLocal(31, 28); game.player.facing = Math.PI * 0.75; game.cam.target.copy(game.player.object.position); game.cam.recentre(); game.cam.snapToTarget(); game.cam.zoomBy(0.45); });
  await page.waitForTimeout(2500);
  const state = () => page.evaluate(() => { const b = game.player.body; const n = [...game.npcs.values()].filter((n) => !n.actor.isDead).map((n) => `${n.id}:${n.actor.body.clipName ?? '-'}${n.actor.moving ? '*' : ''}`); return `player clip=${b.clipName ?? '-'} blend=${b.motionBlend?.toFixed(2)} rate=${b.play?.rate?.toFixed(2)} | ${n.slice(0, 8).join(' ')}`; });
  const shot = async (name, ms = 300) => {
    await page.evaluate(() => { game.cam.target.copy(game.player.object.position); game.cam.snapToTarget(); });
    await page.waitForTimeout(ms);
    await page.screenshot({ path: path.join(out, `motion_${name}.png`), timeout: 180000 });
    console.log(name, await state());
  };
  for (const idle of ['stand', 'talk', 'sit']) {
    await page.evaluate((k) => { game.player.idle = k; }, idle);
    await page.waitForTimeout(1500);
    await shot(idle);
  }
  await page.evaluate(() => { game.player.idle = 'stand'; game.player.running = false; game.walkLocal(38, 28); });
  await page.waitForTimeout(900);
  await shot('jog', 50);
  await page.waitForFunction(() => !game.player.moving, null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { game.player.running = true; game.walkLocal(31, 28); });
  await page.waitForTimeout(700);
  await shot('run', 50);
  await page.waitForFunction(() => !game.player.moving, null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { game.player.running = false; game.player.speed = 1.5; game.walkLocal(36, 28); });
  await page.waitForTimeout(1500);
  await shot('walk', 50);
  await browser.close();
})();
