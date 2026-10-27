// The Wheel and the escort: the camp moves with the day; Ruth tells where; Sefa gives the job; the road asks twice;
// the gate pays. node tools/qa/wheel.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 300)); } });
  const fails = [];
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`), timeout: 120000 });
  const opts = () => page.evaluate(() => [...document.querySelectorAll('.dlg-opts li')].map((l) => l.textContent.trim().replace(/\s+/g, ' ')));
  const pick = async (sub) => { const ok = await page.evaluate((sub) => { const li = [...document.querySelectorAll('.dlg-opts li')].find((l) => l.textContent.includes(sub)); if (!li) return false; li.click(); return true; }, sub); await page.waitForTimeout(600); if (!ok) console.log(`  no option "${sub}" among: ${(await opts()).join(' | ')}`); return ok; };
  const talk = async (id) => { await page.evaluate((id) => { const n = game.npcs.get(id); if (!n) throw new Error('no npc ' + id); game.player.place(n.actor.tx, n.actor.ty + 1); game.cam.recentre(); game.emit('openDialogue', { npc: n }); }, id); await page.waitForTimeout(1200); };
  const quest = (id) => page.evaluate((id) => { const q = game.state.world.quests?.[id]; return q ? `${q.status}/${q.stage}` : 'none'; }, id);
  await page.goto(`${process.env.SF_URL || 'http://127.0.0.1:5173'}/?dev`);
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { document.querySelector('.overlay').classList.add('hidden'); game.paused = false; game.applyQuality('medium'); game.quietRoads = true; await game.loadLocation('shale', 'start'); game.state.world.at = 'shale'; game.state.flags.visited_shale = true; });
  await page.waitForFunction(() => game.state.locationId === 'shale' && game.npcs.size >= 10, null, { timeout: 120000 });
  // The camp moves with the day.
  const pos = await page.evaluate(() => { const L = SF.WORLD_MAP.locations.wheel; const out = []; for (const d of [1, 5, 9, 13, 17]) { game.state.minutes = d * 1440 + 10 * 60; game.placeCamps(); out.push(`${d}:${L.x},${L.y}/${game.state.flags.wheel_near}`); } game.state.minutes = 1 * 1440 + 10 * 60; game.placeCamps(); return out.join(' '); });
  check('the Wheel stands four days at each stop and comes round', /1:446,371\/shale 5:489,384\/drywells 9:458,338\/orchard 13:437,349\/rustdogs 17:446,371\/shale/.test(pos), pos);
  // Ruth says where it is and puts the player's name on the salt wagon.
  await talk('npc_sh_13');
  await pick('Where is the Wheel camped?');
  const told = await page.evaluate(() => (document.querySelector('.dlg-text')?.textContent ?? '').slice(0, 60));
  check('Ruth tells where the Wheel is', told.includes('Close') && (await page.evaluate(() => !!game.state.world.knowledge.loc_wheel)), told);
  await pick('Thanks.');
  await pick('Any work riding beside a wagon?');
  await pick('Put my name on it.');
  await pick('Understood.');
  check('the escort job is on', (await quest('q_a1_escort')) === 'active/ride', await page.evaluate(() => String(game.state.flags.escort_active)));
  // Out to the camp.
  await page.evaluate(async () => { game.state.world.at = 'wheel'; await game.loadLocation('wheel', 'start'); });
  await page.waitForFunction(() => game.state.locationId === 'wheel' && game.npcs.size >= 4, null, { timeout: 120000 });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { game.placeLocal(22, 23); game.cam.recentre(); game.cam.viewGoal = 13; game.cam.viewHeight = 13; });
  await page.waitForTimeout(3000);
  console.log('camp:', await page.evaluate(() => `npcs=${game.npcs.size} rooms=${game.loc.buildings.list.length} ${JSON.stringify(game.perf()).slice(0, 90)}`));
  await shot('wheel_1_camp');
  await talk('npc_wh_01');
  await pick('What is the Wheel?');
  await pick('And the Tollmen let you?');
  await pick('I see.');
  check('a guest of the Wheel', await page.evaluate(() => !!game.state.world.knowledge.sefa_wheel && (game.state.world.memberships?.wheel?.rank === 'guest' || JSON.stringify(game.state.world).includes('"wheel"'))), await page.evaluate(() => JSON.stringify(game.state.world.memberships ?? {}).slice(0, 80)));
  await pick('Where do you go next?');
  const turn = await page.evaluate(() => (document.querySelector('.dlg-text')?.textContent ?? '').slice(0, 50));
  check('Sefa names the next stop by where she stands', turn.includes('East'), turn);
  await pick('Thanks.');
  await pick('Travel well.');
  await shot('wheel_2_sefa');
  // The road asks twice: force the axle, then the shakedown, on the way to the Tollhouse.
  await page.evaluate(async () => { game.state.world.at = 'shale'; await game.loadLocation('shale', 'start'); });
  await page.waitForFunction(() => game.state.locationId === 'shale', null, { timeout: 120000 });
  const travel = async (to) => {
    await page.evaluate(() => game.emit('openMap', {}));
    await page.waitForTimeout(800);
    let found = 'not found';
    for (let tries = 0; tries < 40 && found === 'not found'; tries++) { await page.waitForTimeout(750); found = await page.evaluate((to) => {
      const c = document.querySelector('.map-canvas'); if (!c) return 'no canvas'; const r = c.getBoundingClientRect();
      for (let y = 10; y < r.height; y += 6) for (let x = 10; x < r.width; x += 6) {
        c.dispatchEvent(new MouseEvent('click', { clientX: r.left + x, clientY: r.top + y, bubbles: true }));
        if ((document.querySelector('.map-side h4')?.textContent ?? '').toLowerCase() === to.toLowerCase()) return `${x},${y}`;
      }
      return 'not found';
    }, to); }
    console.log(`map: ${to} ${found}`);
    const before = await page.evaluate(() => game.state.locationId);
    await page.evaluate(() => document.querySelector('.map-side [data-a=travel]')?.click());
    await page.waitForFunction((b) => game.state.locationId !== b && !game.transitioning && game.npcs.size >= 0, before, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1500);
  };
  const walkOut = async () => {
    await page.evaluate(() => { game.placeLocal(37, 11); game.cam.recentre(); game.player.setPath(game.findPathLocal(37, 11, 39, 11, { ignore: 'player', adjacentOk: false })); });
    await page.waitForFunction(() => game.state.locationId !== 'wild_track' || !!document.querySelector('.dlg'), null, { timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(1500);
  };
  await page.evaluate(() => { game.state.world.knownLocations.push('tollhouse'); game.state.flags.th_passed = true; game.forceEncounter = 're_escort_axle'; });
  const tollsBefore = await page.evaluate(() => { game.state.pc.inventory.tolls += 100; return game.state.pc.inventory.tolls; });
  await travel('Tollhouse 9');
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 30000 }).catch(() => {});
  console.log('axle:', await page.evaluate(() => `${game.state.locationId} ` + (document.querySelector('.dlg-text')?.textContent ?? 'none').slice(0, 70)));
  check('the wheel comes off', (await opts()).some((o) => o.includes('pin')), (await opts()).join(' | '));
  await pick('(Wait for help on the road.)');
  await pick('On we go.');
  await page.waitForTimeout(800);
  await walkOut();
  await page.waitForFunction(() => game.state.locationId === 'tollhouse' && !game.transitioning, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => `${game.state.locationId} tolls=${game.state.pc.inventory.tolls} flag=${game.state.flags.escort_active}`);
  check('the gate pays and the job is done', (await quest('q_a1_escort')) === 'done/paid' && (await page.evaluate(() => game.state.pc.inventory.tolls)) === tollsBefore + 60, after + ' ' + (await quest('q_a1_escort')));
  // The other thing the road can ask, on another escort leg: the Dogs want a toll from the salt.
  await page.evaluate(() => { game.state.flags.escort_active = 'wheel'; game.forceEncounter = 're_escort_shakedown'; });
  const beforeShake = await page.evaluate(() => game.state.pc.inventory.tolls);
  await travel('Shale');
  await page.waitForFunction(() => !!document.querySelector('.dlg'), null, { timeout: 30000 }).catch(() => {});
  console.log('shakedown:', await page.evaluate(() => `${game.state.locationId} ` + (document.querySelector('.dlg-text')?.textContent ?? 'none').slice(0, 70)));
  check('the Dogs want a toll from the salt', (await opts()).some((o) => o.includes('forty')), (await opts()).join(' | '));
  await shot('wheel_3_shakedown');
  await pick('(Pay the forty.)');
  await pick('On we go.');
  await page.waitForTimeout(800);
  await walkOut();
  await page.waitForFunction(() => game.state.locationId === 'shale' && !game.transitioning, null, { timeout: 120000 }).catch(() => {});
  check('paid forty and the wagon went on', (await page.evaluate(() => game.state.pc.inventory.tolls)) === beforeShake - 40 && (await page.evaluate(() => game.state.locationId)) === 'shale', await page.evaluate(() => `${game.state.locationId} tolls=${game.state.pc.inventory.tolls}`));
  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL PASS', '; page errors:', errors);
  await browser.close();
})();
