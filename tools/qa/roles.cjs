// usage: node roles.cjs specs.json prefix  -- spec: {seed, role, frame}
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const W = +(process.env.VW || 300);
  const page = await browser.newPage({ viewport: { width: W, height: Math.round(W * (+(process.env.AR || 1.6))) } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(9000);
  await page.evaluate((fr) => { document.querySelector('.overlay').classList.add('hidden'); document.querySelectorAll('.hud,.btn').forEach(e => e.style.display='none');
    const s = new SF.PortraitStage(); s.setFraming(+fr, true); game.portrait = s; }, process.env.FR || '1');
  const specs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const [i, sp] of specs.entries()) {
    const lab = await page.evaluate(async (sp) => {
      const a = SF.randomAppearance(sp.seed, { frame: sp.frame, ...SF.roleLook(sp.role) });
      const o = SF.dressFor(sp.seed, sp.role, sp.frame === 'broad' ? 'm' : 'f');
      await SF.ensureProxies(SF.outfitProxyKeys(o));
      game.portrait.yaw = sp.yaw ?? 0.3;
      game.portrait.setLook(SF.lookFrom(a, o, sp.lod));
      return sp.role + ' ' + a.ancestry + '|' + o.layers.map((g) => g.name.replace(/^[a-z0-9]+_/, '')).join(',');
    }, sp);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${process.argv[3]}${i}.png`, timeout: 180000 });
    fs.appendFileSync(`${process.argv[3]}labels.txt`, lab + '\n');
  }
  await browser.close();
})();
