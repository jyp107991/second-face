// usage: node tools/qa/ancestry.cjs specs.json prefix -- spec: {seed, ancestry, frame, role?, life?, yaw?}  (head framing)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const W = +(process.env.VW || 300);
  const page = await browser.newPage({ viewport: { width: W, height: Math.round(W * 1.6) } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); document.querySelectorAll('.hud,.btn').forEach(e => e.style.display='none');
    const s = new SF.PortraitStage(); s.setFraming(0, true); game.portrait = s; });
  const specs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const [i, sp] of specs.entries()) {
    const lab = await page.evaluate(async (sp) => {
      const role = sp.role || 'settler';
      const a = SF.randomAppearance(sp.seed, { frame: sp.frame, ancestry: sp.ancestry, ...SF.roleLook(role), ...(sp.life ? { life: sp.life } : {}) });
      const o = SF.dressFor(sp.seed, role, sp.frame === 'broad' ? 'm' : 'f');
      o.gear = [];
      await SF.ensureProxies(SF.outfitProxyKeys(o));
      game.portrait.yaw = sp.yaw ?? 0.3;
      game.portrait.setLook(SF.lookFrom(a, o, 'high'));
      return `${a.ancestry} tone ${a.skinTone.toFixed(2)} ${sp.frame}`;
    }, sp);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${process.argv[3]}${i}.png`, timeout: 180000 });
    fs.appendFileSync(`${process.argv[3]}labels.txt`, lab + '\n');
  }
  await browser.close();
})();
