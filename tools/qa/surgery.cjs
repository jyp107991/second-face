// The surgeon's table: Yusra fits a piece. node tools/qa/surgery.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 300)); } });
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; await game.loadLocation('shale', 'start'); });
  await page.waitForFunction(() => game.state.locationId === 'shale' && game.npcs.size >= 10, null, { timeout: 120000 });
  await page.evaluate(() => { game.state.pc.inventory.tolls += 3000; SF.addItem(game.state.pc.inventory, SF.makeItem('ci_ch_legs_spring', 1)); });
  // Through the dialogue: learn the work, ask to be fitted, sit down.
  await page.evaluate(() => { const n = game.npcs.get('npc_sh_08'); if (!n) throw new Error('no mender'); game.player.place(n.actor.tx, n.actor.ty + 1); game.cam.recentre(); game.emit('openDialogue', { npc: n }); });
  await page.waitForTimeout(1500);
  const opts = () => page.evaluate(() => [...document.querySelectorAll('.dlg-opts li')].map((l) => l.textContent.trim().replace(/\s+/g, ' ')));
  const pick = async (text) => { const ok = await page.evaluate((t) => { const li = [...document.querySelectorAll('.dlg-opts li')].find((l) => l.textContent.includes(t)); if (!li) return false; li.click(); return true; }, text); console.log(`pick "${text}" → ${ok}`); if (!ok) console.log('  options:', (await opts()).join(' | ')); await page.waitForTimeout(900); };
  await pick('The work?');
  await pick('Could you fit something');
  await page.screenshot({ path: path.join(out, 'surgery_1_talk.png'), timeout: 120000 });
  await pick('(Sit down.)');
  await page.waitForTimeout(1500);
  console.log('table open:', await page.evaluate(() => !!document.querySelector('.surgery')), 'offers:', await page.evaluate(() => document.querySelectorAll('.surgery [data-fit]').length));
  await page.screenshot({ path: path.join(out, 'surgery_2_table.png'), timeout: 120000 });
  // Fit the Gyro Hand (first offer) with a fixed good roll.
  await page.evaluate(() => { game.rng.next = () => 0.95; });
  await page.evaluate(() => document.querySelector('.surgery [data-fit="0"]')?.click());
  await page.waitForTimeout(1500);
  console.log('after fit:', await page.evaluate(() => JSON.stringify({ armL: game.state.pc.sheet.chrome?.armL?.id, tolls: game.state.pc.inventory.tolls, note: document.querySelector('.surgery .note')?.textContent?.slice(0, 80), offers: document.querySelectorAll('.surgery [data-fit]').length })));
  await page.screenshot({ path: path.join(out, 'surgery_3_fitted.png'), timeout: 120000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(4000);
  console.log('figure gear:', await page.evaluate(() => game.playerOutfit().gear.map((g) => g.kind).join(',')), 'errors:', errors);
  await page.screenshot({ path: path.join(out, 'surgery_4_world.png'), timeout: 120000 });
  await browser.close();
})();
