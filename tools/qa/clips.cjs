// Every captured clip on a figure, close up on the portrait stage, front and side. node tools/qa/clips.cjs <outdir> [clip,clip]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '.';
  const only = process.argv[3] ? process.argv[3].split(',') : null;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(8000);
  await page.waitForFunction(() => window.SF && SF.motionReady(), null, { timeout: 60000 });
  const clips = await page.evaluate(() => SF.motionClipNames());
  console.log('clips', clips.join(' '));
  await page.evaluate(() => {
    document.querySelector('.overlay').classList.add('hidden');
    game.paused = false; game.applyQuality('low');
    const st = new SF.PortraitStage(0x2a3038);
    st.useEnvironment(game.renderer);
    st.setAspect(900 / 700);
    st.setLook(SF.lookFrom(SF.randomAppearance(11, {}), SF.PLAYER_OUTFIT));
    st.figure.captured = true;
    st.setFraming(1, true);
    st.fitHeight = 2.1;
    st.offsetY = 0;
    window.stage = st;
    game.portrait = st;
  });
  for (const name of clips) {
    if (only && !only.includes(name)) continue;
    await page.evaluate((n) => { stage.figure.forceClip = n; stage.figure.animate(0.001, 0); stage.yaw = 0.35; }, name);
    await page.waitForTimeout(1500);
    for (const [tag, yaw, wait] of [['f', 0.35, 100], ['s', Math.PI / 2 + 0.2, 1200]]) {
      await page.evaluate(([y]) => { stage.yaw = y; }, [yaw]);
      await page.waitForTimeout(wait);
      await page.screenshot({ path: path.join(out, `clip_${name}_${tag}.png`), timeout: 120000 });
    }
    console.log(name, await page.evaluate(() => { const b = stage.figure; return `clip=${b.clipName} blend=${b.motionBlend.toFixed(2)} t=${b.play?.time?.toFixed(2)} rootY=${b.figure.bones.get('root').position.y.toFixed(3)} restY=${b.rootRestY.toFixed(3)}`; }));
  }
  await browser.close();
})();
