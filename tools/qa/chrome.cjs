// Chrome sheet: every visible piece fitted, seen on the self sheet front and back, and in the world up close.
// node tools/qa/chrome.cjs <outdir> [prefix]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '.', prefix = process.argv[3] || 'chrome';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 300)); } });
  const shot = async (name) => { await page.screenshot({ path: path.join(out, `${prefix}_${name}.png`), timeout: 180000 }); console.log('shot', name); };
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('high'); });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(23, { frame: 'broad' }), 'he', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const fit = (set) => page.evaluate((set) => {
    const s = game.state.pc.sheet; s.chrome = {};
    for (const [slot, id] of Object.entries(set)) s.chrome[slot] = { id, condition: 1, installedDay: 1 };
    const inv = game.state.pc.inventory; SF.unequip(inv, 'body'); SF.unequip(inv, 'head'); SF.unequip(inv, 'primary');
    game.rebuildPlayer?.(); game.emit?.('wardrobe');
  }, set);
  const self = async () => { await page.evaluate(() => document.querySelector('[data-a=wrist]')?.click()); await page.waitForTimeout(400); await page.evaluate(() => document.querySelector('.nb-top [data-t=status]')?.click()); await page.waitForTimeout(6000); };
  const turn = async () => { await page.evaluate(() => { const c = document.querySelector('canvas.figure'); const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 20, clientY: r.top + 100, pointerId: 1, bubbles: true })); c.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + 240, clientY: r.top + 100, pointerId: 1, bubbles: true })); c.dispatchEvent(new PointerEvent('pointerup', { clientX: r.left + 240, clientY: r.top + 100, pointerId: 1, bubbles: true })); }); await page.waitForTimeout(2500); };
  // Old and Mender-built pieces.
  await fit({ eyes: 'ch_eye_scope', neural: 'ch_neural_link', armR: 'ch_arm_breaker', armL: 'ch_arm_steady', legs: 'ch_legs_spring', spine: 'ch_spine_load', skin: 'ch_skin_plate' });
  await self();
  await shot('old_front');
  await turn();
  await shot('old_back');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  // Concern-grade pieces.
  await fit({ eyes: 'ch_eye_concern', neural: 'ch_neural_reflex', armR: 'ch_arm_breaker', armL: 'ch_arm_steady', legs: 'ch_legs_strider', spine: 'ch_spine_load', skin: 'ch_skin_weave' });
  await self();
  await shot('concern_front');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.evaluate(() => { game.placeLocal(8, 14); game.cam.recentre(); game.cam.viewGoal = 6; game.cam.viewHeight = 6; });
  await page.waitForTimeout(6000);
  await shot('world');
  console.log('errors:', errors);
  await browser.close();
})();
