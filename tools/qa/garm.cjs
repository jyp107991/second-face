// usage: node garm.cjs outfits.json prefix   -- renders full-body figures wearing each outfit
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const W = +(process.env.VW || 300);
  const page = await browser.newPage({ viewport: { width: W, height: Math.round(W * 1.6) } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.text().slice(0, 200)); });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(9000);
  await page.evaluate((fr) => { document.querySelector('.overlay').classList.add('hidden'); document.querySelectorAll('.hud,.btn').forEach(e => e.style.display='none');
    const s = new SF.PortraitStage(); s.setFraming(+fr, true); s.yaw = +(window.YAW ?? 0.35); game.portrait = s; }, process.env.FR || '1');
  const specs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const [i, sp] of specs.entries()) {
    await page.evaluate(async (sp) => {
      const a = SF.randomAppearance(sp.seed ?? 7, sp.opts ?? {}); a.scars = []; a.tattoos = [];
      if (sp.app) Object.assign(a, sp.app);
      await SF.ensureProxies(SF.outfitProxyKeys(sp.outfit));
      game.portrait.yaw = sp.yaw ?? 0.35;
      game.portrait.setLook(SF.lookFrom(a, sp.outfit));
    }, sp);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${process.argv[3]}${i}.png`, timeout: 180000 });
  }
  await browser.close();
})();
