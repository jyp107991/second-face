const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(12000);
  await page.evaluate(() => document.querySelector('.overlay').classList.add('hidden'));
  await page.waitForTimeout(3000);
  console.log(await page.evaluate(() => `draws ${game.renderer.info.render.calls} npcs ${game.npcs.size}`));
  await page.screenshot({ path: process.argv[2] });
  await browser.close();
})();
