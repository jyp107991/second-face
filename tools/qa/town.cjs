// Town smoke: load a map, screenshot the start spawn and a second spot, print NPC count and perf.
// node tools/qa/town.cjs <map> <outdir> [x2,y2]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [map, out, second] = [process.argv[2], process.argv[3] || '.', process.argv[4]];
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.goto('http://127.0.0.1:5173/?dev');
  await page.waitForTimeout(9000);
  await page.evaluate(async (m) => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); await game.loadLocation(m, 'start'); }, map);
  await page.waitForTimeout(8000);
  console.log(await page.evaluate(() => `${game.state.locationId} npcs=${game.npcs.size} ${JSON.stringify(game.perf())}`));
  await page.screenshot({ path: path.join(out, `${map}_1.png`), timeout: 180000 });
  if (second) {
    const [x, y] = second.split(',').map(Number);
    await page.evaluate(([x, y]) => { game.player.place(x, y); game.cam.recentre(); game.cam.viewGoal = 11; game.cam.viewHeight = 11; }, [x, y]);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(out, `${map}_2.png`), timeout: 180000 });
  }
  await browser.close();
})();
