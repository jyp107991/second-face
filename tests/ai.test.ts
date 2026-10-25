import { describe, expect, it } from 'vitest';
import '../src/content';
import { chooseAction } from '../src/engine/combat/ai';
import { Encounter, type EncounterHost, type Unit } from '../src/engine/combat/encounter';
import { Rng } from '../src/engine/core/rng';
import { addItem, emptyInventory, equip, makeItem, reload } from '../src/engine/inventory/inventory';
import { Grid } from '../src/engine/scene/grid';
import { emptySheet } from '../src/engine/stats/sheet';
import type { MapDef } from '../src/engine/data/types';

const map: MapDef = {
  id: 't', name: 't', spawns: [{ id: 's', x: 0, y: 0 }],
  layout: ['............', '............', '.....#......', '............', '............', '............'],
  legend: { '.': { floor: 'sand' }, '#': { wall: 'concrete', wallHeight: 1 } },
  ambience: { indoor: false, fogColor: 0, fogDensity: 0, dust: 0 },
};

function setup() {
  const grid = new Grid(map);
  const host = { grid, rng: new Rng(1), fx: {} as never, shake() {}, context: () => ({ indoor: false, night: false, darkness: 0 }), previewPath() {}, showReach() {}, now: () => 0, sound() {} } as EncounterHost;
  const enc = new Encounter(host);
  const mk = (id: string, x: number, y: number, hostile: boolean, weapon?: string, ammo?: string): Unit => {
    const inv = emptyInventory();
    if (weapon) { addItem(inv, makeItem(weapon)); equip(inv, 0); }
    if (ammo) { addItem(inv, makeItem(ammo, 30)); reload(inv); }
    const sheet = emptySheet(id);
    sheet.skillBought.firearms = 40;
    grid.occupied.set(grid.index(x, y), id);
    return { c: { id, name: id, team: hostile ? 'r' : 'player', sheet, inv, x, y, ap: 8, morale: 70, evasion: 0, isPlayer: !hostile }, actor: {} as never, hostile };
  };
  return { enc, mk };
}

describe('Utility AI', () => {
  it('attacks a visible target with a loaded gun', () => {
    const { enc, mk } = setup();
    const p = mk('p', 1, 1, false), r = mk('r', 8, 1, true, 'w_pistol9', 'a_9mm');
    enc.units = [p, r]; enc.active = true;
    expect(chooseAction(enc, r).kind).toBe('attack');
  });
  it('reloads an empty gun', () => {
    const { enc, mk } = setup();
    const p = mk('p', 1, 1, false), r = mk('r', 8, 1, true, 'w_pistol9');
    addItem(r.c.inv, makeItem('a_9mm', 20));
    enc.units = [p, r]; enc.active = true;
    expect(chooseAction(enc, r).kind).toBe('reload');
  });
  it('flees with broken morale and heals when hurt', () => {
    const { enc, mk } = setup();
    const p = mk('p', 1, 1, false), r = mk('r', 6, 4, true, 'w_pistol9', 'a_9mm');
    enc.units = [p, r]; enc.active = true;
    r.c.morale = 15;
    expect(chooseAction(enc, r).kind).toBe('flee');
    r.c.morale = 70;
    r.c.sheet.hp = 4;
    addItem(r.c.inv, makeItem('c_knitkit', 1));
    expect(chooseAction(enc, r).kind).toBe('heal');
  });
  it('melee closes the distance', () => {
    const { enc, mk } = setup();
    const p = mk('p', 0, 0, false), r = mk('r', 11, 5, true, 'w_machete');
    enc.units = [p, r]; enc.active = true;
    const a = chooseAction(enc, r);
    expect(a.kind).toBe('move');
  });
});
