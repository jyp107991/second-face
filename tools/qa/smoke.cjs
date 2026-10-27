// Smoke test of the UI screens against the dev server: node tools/qa/smoke.cjs <outdir>
// Opens the game, hides the title, then exercises camp, Dust, barter, settings and the notebook, logging page errors.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 300)); });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/`);
  await page.waitForTimeout(10000);
  const shot = async (name) => { await page.waitForTimeout(600); await page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 }); };
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; });
  // Camp
  await page.evaluate(() => game.openCamp());
  await shot('camp');
  await page.keyboard.press('Escape');
  // Barter with the dev guide
  await page.evaluate(() => { const n = [...game.npcs.values()].find((x) => x.def.merchant); game.openBarter(n); });
  await page.evaluate(() => { document.querySelectorAll('.wl .item[data-s=buy]')[0]?.click(); document.querySelectorAll('.wl .item[data-s=sell]')[0]?.click(); });
  await shot('barter');
  await page.keyboard.press('Escape');
  // Dust
  await page.evaluate(() => { const n = [...game.npcs.values()].find((x) => x.def.merchant); game.state.pc.inventory.tolls = 20; game.emit('openDust', { npc: n, stake: 5 }); });
  await page.evaluate(() => document.querySelector('[data-a=roll]')?.click());
  await shot('dust');
  await page.evaluate(() => { document.querySelectorAll('.wl').forEach((e) => e.remove()); game.paused = false; });
  // Notebook journal → letters / log
  await page.evaluate(() => { game.state.world.log = [{ who: 'Rook', text: 'Something said earlier.', minutes: 0 }]; game.state.world.post = [{ from: 'dev_guide', text: 'A reply came.', day: 2 }]; });
  await page.keyboard.press('KeyJ');
  await page.evaluate(() => document.querySelector('[data-v=letters]')?.click());
  await shot('letters');
  await page.evaluate(() => document.querySelector('[data-v=log]')?.click());
  await shot('log');
  await page.keyboard.press('Escape');
  // Settings
  await page.keyboard.press('Escape');
  await page.evaluate(() => [...document.querySelectorAll('.menu button.item')].find((b) => b.textContent.includes('Settings'))?.click());
  await shot('settings');
  // Companion following: adopt Rook into the party and walk.
  await page.evaluate(() => { document.querySelectorAll('.overlay').forEach((e) => e.classList.add('hidden')); game.paused = false; game.state.world.party.push('dev_guide'); });
  await page.waitForTimeout(1200);
  const party = await page.evaluate(() => { const n = game.npcs.get('dev_guide'); return { companion: !!n?.companion, dist: Math.max(Math.abs(n.actor.tx - game.player.tx), Math.abs(n.actor.ty - game.player.ty)) }; });
  console.log('party', JSON.stringify(party));
  await page.evaluate(() => { const p = game.player; const path = game.loc.grid.findPath(p.tx, p.ty, p.tx + 6, p.ty, { ignore: p.id, adjacentOk: true }); p.setPath(path); });
  await page.waitForTimeout(6000);
  const after = await page.evaluate(() => { const n = game.npcs.get('dev_guide'); return { dist: Math.max(Math.abs(n.actor.tx - game.player.tx), Math.abs(n.actor.ty - game.player.ty)), moving: n.actor.moving }; });
  console.log('after walk', JSON.stringify(after));
  await shot('follow');
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  await browser.close();
})();
