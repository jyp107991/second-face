// Tribute Day smoke: Shale on day 5 at 10:00 → the party appears at the wells, the trigger opens the talk. node tools/qa/tribute.cjs <outdir>
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
  await page.evaluate(async () => {
    document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium');
    game.state.flags.visited_shale = true; game.state.minutes = 4 * 1440 + 10 * 60 + 1;
    game.quests.questStart('q_ch1_tribute');
  });
  await page.waitForTimeout(6000);
  console.log(await page.evaluate(() => `events=${JSON.stringify(game.state.world.events)} tribute_day=${game.state.flags.tribute_day} stage=${game.state.world.quests.q_ch1_tribute?.stage}`));
  await page.evaluate(async () => { await game.loadLocation('shale', 'start'); });
  await page.waitForTimeout(7000);
  console.log(await page.evaluate(() => `npcs=${[...game.npcs.keys()].filter((k) => k.startsWith('tribute')).join(',')}`));
  await page.screenshot({ path: path.join(out, 'tribute_1.png'), timeout: 180000 });
  // Walk toward the wells to hit the trigger.
  await page.evaluate(() => { game.player.place(31, 28); game.cam.recentre(); game.player.setPath(game.loc.grid.findPath(31, 28, 31, 26, { ignore: 'player', adjacentOk: false })); });
  await page.waitForTimeout(6000);
  console.log('dialogue:', await page.evaluate(() => (document.querySelector('.dlg-name')?.textContent ?? 'none') + ' | ' + (document.querySelector('.dlg-text')?.textContent ?? '').slice(0, 90)));
  await page.screenshot({ path: path.join(out, 'tribute_2.png'), timeout: 180000 });
  // Play it through: listen, listen, answer, then pay from your own pocket.
  const picks = ['(Listen.)', '(Listen.)', '(Answer.)', 'Sheriff. Your call.', '(Watch them load the cart.)'];
  for (const p of picks) {
    const ok = await page.evaluate((p) => { const li = [...document.querySelectorAll('.dlg-opts li')].find((l) => l.textContent.includes(p)); if (!li) return false; li.click(); return true; }, p);
    if (!ok) { console.log('no option', p, await page.evaluate(() => [...document.querySelectorAll('.dlg-opts li')].map((l) => l.textContent.trim()).join(' | '))); break; }
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(1500);
  console.log(await page.evaluate(() => `outcome=${game.state.flags.tribute_outcome} stage=${game.state.world.quests.q_ch1_tribute?.stage} status=${game.state.world.quests.q_ch1_tribute?.status}`));
  await browser.close();
})();
