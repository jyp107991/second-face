const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(9000);
  const r = await page.evaluate(async () => {
    const out = [];
    const H = game.player.body.constructor;
    for (const role of ['raider', 'gilded', 'guard', 'street', 'drifter']) for (const lod of ['low', 'high']) {
      const a = SF.randomAppearance(77, SF.roleLook(role)); const o = SF.dressFor(77, role, a.shape.gender > 0.5 ? 'm' : 'f');
      await SF.ensureProxies(SF.outfitProxyKeys(o));
      const h = new H(SF.lookFrom(a, o, lod));
      let n = 0; h.root.traverse((m) => { if (m.isMesh) n++; });
      out.push(`${role} ${lod}: ${n} meshes (${o.layers.length} garments)`);
      h.dispose();
    }
    return out;
  });
  console.log(r.join('\n'));
  await browser.close();
})();
