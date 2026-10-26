// Beard gallery: each beard mesh (and each style) on the same two faces. node tools/qa/beards.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 300, height: 360 } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); document.querySelectorAll('.hud,.btn').forEach(e => e.style.display='none'); const s = new SF.PortraitStage(); s.setFraming(0, true); game.portrait = s; });
  const specs = JSON.parse(process.argv[3] || '[]');
  for (const [i, sp] of specs.entries()) {
    await page.evaluate(async (sp) => {
      const a = SF.randomAppearance(sp.seed, { frame: 'broad' });
      a.facialHair = sp.style || 'none'; if (sp.proxies) a.beardProxies = sp.proxies; if (sp.hairColor !== undefined) { a.hair.color = sp.hairColor; a.browColor = sp.hairColor; }
      a.hair.style = 'cut_crop';
      game.portrait.yaw = 0.3; game.portrait.setLook(SF.lookFrom(a, { layers: [] }, 'high'));
    }, sp);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(out, `b${i}.png`), timeout: 180000 });
  }
  await browser.close();
})();
