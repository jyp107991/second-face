// Character creation: the attributes tab with a rolled start. node tools/qa/creator.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { game.applyQuality('medium'); [...document.querySelectorAll('button')].find((b) => b.textContent === 'New Game')?.click(); });
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.querySelector('.creator [data-t=attributes]')?.click());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'creator_attributes_standard.png'), timeout: 120000 });
  const rolls = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => document.querySelector('.creator [data-r=roll]')?.click());
    await page.waitForTimeout(600);
    rolls.push(await page.evaluate(() => document.querySelector('.creator .pts')?.textContent));
  }
  console.log('rolls:', rolls.join(' | '));
  await page.evaluate(() => document.querySelector('.creator [data-r=keep]')?.click());
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.creator [data-r=roll]')?.click());
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.creator [data-r=recall]')?.click());
  await page.waitForTimeout(800);
  console.log('after recall:', await page.evaluate(() => document.querySelector('.creator .pts')?.textContent), '| recall button:', await page.evaluate(() => document.querySelector('.creator [data-r=recall]')?.textContent));
  await page.screenshot({ path: path.join(out, 'creator_attributes_rolled.png'), timeout: 120000 });
  await browser.close();
})();
