const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: +(process.env.VW||480), height: +(process.env.VW||480) } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); document.querySelectorAll('.hud,.btn').forEach(e => e.style.display='none'); });
  const specs = JSON.parse(process.argv[2]);
  for (const [i, js] of specs.entries()) {
    await page.evaluate(js);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `face${i}.png`, timeout: 180000 });
  }
  await browser.close();
})();
