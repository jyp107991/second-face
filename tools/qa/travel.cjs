// Travel smoke: new game → open the field map in the Cistern mouth → travel to Shale → screenshot the map and the arrival.
// node tools/qa/travel.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; game.instantJourney = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(7, { frame: 'narrow' }), 'she', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => { game.state.flags.c9_door_open = true; await game.loadLocation('c9_mouth', 'door'); });
  await page.waitForTimeout(5000);
  await page.evaluate(() => game.emit('openMap', {}));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'map_1.png'), timeout: 180000 });
  // Select Shale on the canvas by its projected point and set out.
  const ok = await page.evaluate(() => {
    const c = document.querySelector('.map-canvas'); if (!c) return 'no canvas';
    const r = c.getBoundingClientRect();
    // Find Shale's pixel by brute force: click a grid and see which selection appears.
    return `${r.width}x${r.height}`;
  });
  console.log('canvas', ok);
  const clicked = await page.evaluate(() => {
    const c = document.querySelector('.map-canvas'); const r = c.getBoundingClientRect();
    for (let y = 10; y < r.height; y += 8) for (let x = 10; x < r.width; x += 8) {
      c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true }));
      const h = document.querySelector('.map-side h4')?.textContent;
      if (h === 'Shale') return `shale at ${x},${y}`;
    }
    return 'not found';
  });
  console.log(clicked);
  await page.waitForTimeout(500);
  console.log('side:', await page.evaluate(() => document.querySelector('.map-side')?.textContent?.replace(/\s+/g, ' ').slice(0, 200)));
  await page.screenshot({ path: path.join(out, 'map_2.png'), timeout: 180000 });
  await page.evaluate(() => document.querySelector('.map-side [data-a=travel]')?.click());
  await page.waitForTimeout(9000);
  console.log(await page.evaluate(() => `${game.state.locationId} at=${game.state.world.at} minutes=${Math.round(game.state.minutes)} quest=${game.state.world.quests.q_ch1_shale?.stage} player=${game.player.tx},${game.player.ty}`));
  await page.screenshot({ path: path.join(out, 'map_3_arrive.png'), timeout: 180000 });
  await browser.close();
})();
