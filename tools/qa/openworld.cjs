// Open-world smoke (docs/UPGRADE.md U2): out of the Cistern's mouth into the wild with no screen between, terrain
// streaming round the player, into Shale from the open ground (its people appear), a door into a cell and back,
// save/load in the wild and in a place, the map's "you are here".
// node tools/qa/openworld.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 300)); } });
  const shot = async (name) => { await page.screenshot({ path: path.join(out, `${name}.png`), timeout: 180000 }); };
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const where = () => page.evaluate(() => `${game.state.locationId} @${game.player.tx},${game.player.ty} sites=[${[...game.world.sites.keys()].join(',')}] chunks=${game.world.chunks.size} npcs=${game.npcs.size}`);
  const t0 = Date.now();

  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(() => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('low'); game.quietRoads = true; });
  await page.evaluate(() => { const s = game.state; game.newGame(s.pc.sheet, SF.randomAppearance(31, { frame: 'lean' }), 'she', 'door_watch'); });
  await page.waitForFunction(() => game.state.locationId === 'cistern9' && game.npcs.size >= 9, null, { timeout: 120000 });
  console.log('cistern:', await where());
  check('a cell: the open world is parked while inside', await page.evaluate(() => game.world.mode === 'cell' && game.world.chunks.size === 0));

  // Through the great door: a short fade, no loading screen.
  await page.evaluate(() => { game.state.flags.c9_door_open = true; });
  const tDoor = Date.now();
  await page.evaluate(() => { game.placeLocal(6, 4); game.player.setPath(game.findPathLocal(6, 4, 5, 1, { ignore: 'player', adjacentOk: false })); });
  await page.waitForFunction(() => game.state.locationId === 'c9_mouth' && !game.transitioning, null, { timeout: 60000 }).catch(() => {});
  console.log(`door → mouth in ${Date.now() - tDoor} ms:`, await where());
  check('the door opens onto the mouth', await page.evaluate(() => game.state.locationId === 'c9_mouth' && game.world.mode === 'open'));
  await page.waitForFunction(() => game.world.chunks.size >= 5, null, { timeout: 60000 }).catch(() => {});
  check('terrain streams round the mouth', await page.evaluate(() => game.world.chunks.size >= 5), await where());
  await page.evaluate(() => { game.applyQuality('medium'); game.cam.recentre(); game.cam.zoomBy(0.75); });
  await page.waitForTimeout(2500);
  await shot('ow_1_mouth');
  await page.evaluate(() => { game.applyQuality('low'); game.cam.zoomBy(1 / 0.75); });
  console.log('perf mouth:', JSON.stringify(await page.evaluate(() => game.perf())));

  // East out of the mouth, over the stripped rim, into the Sallow.
  const edge = await page.evaluate(() => { const s = game.siteHere(); return { x: s.place.x + s.place.w - 2, z: s.place.z + Math.floor(s.place.h / 2), w: s.place.w }; });
  await page.evaluate(({ x, z }) => { game.player.place(x, z); game.cam.recentre(); game.walkTo(x + 14, z); }, edge);
  await page.waitForFunction(() => game.state.locationId.startsWith('wild:'), null, { timeout: 240000 }).catch(() => {});
  console.log('out:', await where());
  check('no screen between the mouth and the wild', await page.evaluate(() => game.state.locationId === 'wild:sallow' && !game.transitioning));
  await page.evaluate(() => game.applyQuality('medium'));
  await page.waitForTimeout(2500);
  await shot('ow_2_wild');
  await page.evaluate(() => game.applyQuality('low'));
  console.log('perf wild:', JSON.stringify(await page.evaluate(() => game.perf())));
  // Save in the wild (once the walk is done), load, still in the wild at the same tile.
  await page.waitForFunction(() => !game.player.moving && !game.walkGoal, null, { timeout: 240000 }).catch(() => {});
  const posWild = await page.evaluate(() => ({ x: game.player.tx, y: game.player.ty }));
  await page.evaluate(() => game.save('slot1'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => game.loadSlot('slot1'));
  await page.waitForFunction(() => !game.transitioning && game.player, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  check('save/load in the wild keeps the tile', await page.evaluate(({ x, y }) => game.state.locationId === 'wild:sallow' && game.player.tx === x && game.player.ty === y, posWild), await where());

  // To Shale across the open ground: set down just outside its edge and walk in.
  const shale = await page.evaluate(() => { const p = SF.sitePlacement('shale'); return { x: p.x, z: p.z, w: p.w, h: p.h }; });
  console.log('shale at', JSON.stringify(shale));
  await page.evaluate(({ x, z, h }) => { game.player.place(x - 12, z + Math.floor(h / 2)); game.cam.recentre(); }, shale);
  await page.waitForFunction(() => game.world.sites.has('shale'), null, { timeout: 120000 }).catch(() => {});
  console.log('near shale:', await where());
  check('Shale is built as you near it', await page.evaluate(() => game.world.sites.has('shale')), await where());
  await page.evaluate(({ x, z, h }) => { game.walkTo(x + 6, z + Math.floor(h / 2)); }, shale);
  await page.waitForFunction(() => game.state.locationId === 'shale', null, { timeout: 240000 }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('shale:', await where());
  check('walked into Shale: its people are there', await page.evaluate(() => game.state.locationId === 'shale' && [...game.npcs.values()].filter((n) => n.site === 'shale').length >= 8), await where());
  check('the map knows where you are', await page.evaluate(() => game.nearestLocation() === 'shale'));
  await page.evaluate(() => { game.applyQuality('medium'); game.cam.recentre(); });
  await page.waitForTimeout(2500);
  await shot('ow_3_shale');
  await page.evaluate(() => game.applyQuality('low'));
  console.log('perf shale:', JSON.stringify(await page.evaluate(() => game.perf())));
  // Save in a place (once the walk is done), load: same tile, same place.
  await page.waitForFunction(() => !game.player.moving && !game.walkGoal, null, { timeout: 240000 }).catch(() => {});
  const posShale = await page.evaluate(() => ({ x: game.player.tx, y: game.player.ty }));
  await page.evaluate(() => game.save('slot2'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => game.loadSlot('slot2'));
  await page.waitForFunction(() => !game.transitioning && game.player, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  check('save/load in Shale keeps the tile', await page.evaluate(({ x, y }) => game.state.locationId === 'shale' && game.player.tx === x && game.player.ty === y, posShale), await where());
  const sv = await page.evaluate(async () => { const f = await game.saves.read('slot2'); return { v: f.version, p: f.state.player, loc: f.state.locationId }; });
  console.log('save file:', JSON.stringify(sv));
  check('the save keeps the player map-local', sv.v === 6 && sv.p.x < 200 && sv.p.y < 200);

  // Far from the Cistern now: its mouth has been let go.
  check('the mouth was unloaded behind you', await page.evaluate(() => !game.world.sites.has('c9_mouth')), await where());
  console.log(`\n${fails.length ? 'FAILED: ' + fails.join('; ') : 'ALL PASS'}; page errors: ${errors}; ${Math.round((Date.now() - t0) / 1000)} s`);
  await browser.close();
})();
