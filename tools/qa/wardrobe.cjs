// Wardrobe sheet: the pack figure changes as things are equipped; chrome shows on the Self tab; the world figure
// follows. node tools/qa/wardrobe.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 300)); } });
  const shot = async (name) => { await page.screenshot({ path: path.join(out, `${name}.png`), timeout: 180000 }); console.log('shot', name); };
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(23, { frame: 'broad' }), 'he', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  // Everything in the pack, nothing equipped but the coverall and shiv.
  await page.evaluate(() => { const inv = game.state.pc.inventory; for (const id of ['w_bolt308', 'r_duster', 'r_hood', 'r_scrap', 'r_helmet', 'r_gasmask', 'w_machete', 'w_pump', 'w_revolver38', 'c_bandage', 'a_308', 't_picks', 'j_scrap', 'k_photo']) SF.addItem(inv, SF.makeItem(id, id === 'a_308' ? 20 : 1)); });
  const openPack = async () => { await page.evaluate(() => document.querySelector('[data-a=wrist]')?.click()); await page.waitForTimeout(400); await page.evaluate(() => document.querySelector('.nb-top [data-t=gear]')?.click()); await page.waitForTimeout(5000); };
  await openPack();
  console.log('pack:', await page.evaluate(() => `figure=${!!document.querySelector('canvas.figure')} rows=${document.querySelectorAll('.item').length} icons=${document.querySelectorAll('img.ico').length} held=${game.playerOutfit().held}`));
  await shot('wardrobe_1_base');
  // Equip through the UI: select the rifle, Equip Hand 1; then the duster, Wear; then the hood, Wear.
  const equipByUi = async (name, btnText) => {
    const ok = await page.evaluate(({ name, btnText }) => { const row = [...document.querySelectorAll('.item')].find((r) => r.textContent.includes(name)); if (!row) return 'no row ' + name; row.click(); const b = [...document.querySelectorAll('.acts button')].find((x) => x.textContent === btnText); if (!b) return 'no button ' + btnText + ' for ' + name + ': ' + [...document.querySelectorAll('.acts button')].map((x) => x.textContent).join('|'); b.click(); return 'ok'; }, { name, btnText });
    console.log(`equip ${name} → ${ok}`);
    await page.waitForTimeout(4500);
  };
  await equipByUi('Bolt Rifle', 'Equip Hand 1');
  await equipByUi('Leather Duster', 'Wear');
  await equipByUi('Dust Hood', 'Wear');
  console.log('outfit:', await page.evaluate(() => JSON.stringify({ held: game.playerOutfit().held, gear: game.playerOutfit().gear.map((g) => g.kind), suit: game.playerOutfit().suit })));
  await shot('wardrobe_2_rifle_duster_hood');
  await equipByUi('Scrap Plate', 'Wear');
  await equipByUi('Hard Hat', 'Wear');
  await equipByUi('Pump Shotgun', 'Equip Hand 1');
  await shot('wardrobe_3_scrap_hardhat_shotgun');
  await equipByUi('Filter Mask', 'Wear');
  await equipByUi('Machete', 'Equip Hand 1');
  await shot('wardrobe_4_mask_machete');
  // Chrome: fit every visible piece and look at the self sheet.
  await page.evaluate(() => { const s = game.state.pc.sheet; s.chrome = { eyes: { id: 'ch_eye_scope', condition: 1, installedDay: 1 }, neural: { id: 'ch_neural_link', condition: 0.9, installedDay: 1 }, armR: { id: 'ch_arm_breaker', condition: 1, installedDay: 1 }, armL: { id: 'ch_arm_steady', condition: 0.7, installedDay: 1 }, legs: { id: 'ch_legs_spring', condition: 1, installedDay: 1 }, spine: { id: 'ch_spine_load', condition: 1, installedDay: 1 }, skin: { id: 'ch_skin_plate', condition: 1, installedDay: 1 } }; });
  // Take the coat and mask off so the chrome shows.
  await page.evaluate(() => { const inv = game.state.pc.inventory; SF.unequip(inv, 'body'); SF.unequip(inv, 'head'); SF.unequip(inv, 'primary'); });
  await page.evaluate(() => document.querySelector('.nb-top [data-t=status]')?.click());
  await page.waitForTimeout(6000);
  await shot('wardrobe_5_chrome_self');
  // Turn the figure to see the spine and the legs from behind.
  await page.evaluate(() => { const c = document.querySelector('canvas.figure'); const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 20, clientY: r.top + 100, pointerId: 1, bubbles: true })); c.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + 240, clientY: r.top + 100, pointerId: 1, bubbles: true })); c.dispatchEvent(new PointerEvent('pointerup', { clientX: r.left + 240, clientY: r.top + 100, pointerId: 1, bubbles: true })); });
  await page.waitForTimeout(2500);
  await shot('wardrobe_6_chrome_back');
  // Close the notebook: the world figure carries the same look.
  await page.evaluate(() => { const inv = game.state.pc.inventory; const i = inv.items.findIndex((x) => x.def === 'w_bolt308'); SF.equip(inv, i, 'primary'); const j = inv.items.findIndex((x) => x.def === 'r_duster'); SF.equip(inv, j); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.evaluate(() => { game.player.place(6, 15); game.cam.recentre(); game.cam.zoomBy(0.35); });
  await page.waitForTimeout(6000);
  console.log('world:', await page.evaluate(() => `held=${!!game.player.body.root.getObjectByName('held_rifle')} meshes=${game.player.object.children.length}`));
  await shot('wardrobe_7_world');
  console.log('perf:', JSON.stringify(await page.evaluate(() => game.perf())), 'errors:', errors);
  await browser.close();
})();
