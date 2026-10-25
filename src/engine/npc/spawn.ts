import { NPCS } from '../../content';
import { lookFrom } from '../assets/humanoid';
import { initialMorale, type Combatant } from '../combat/rules';
import { randomAppearance } from '../data/appearance';
import { addItem, emptyInventory, equip, makeItem, reload, syncGear, type Inventory } from '../inventory/inventory';
import { itemDef } from '../inventory/items';
import { Actor } from '../scene/actor';
import type { Grid } from '../scene/grid';
import { derived, emptySheet, type CharacterSheet } from '../stats/sheet';
import { ATTRIBUTES, xpForLevel } from '../stats/rules';
import type { NpcDef, NpcPlacement } from './defs';

/** Build an NPC's character sheet + inventory from its definition. */
export function buildNpcStats(def: NpcDef): { sheet: CharacterSheet; inv: Inventory } {
  const sheet = emptySheet(def.name);
  for (const a of ATTRIBUTES) sheet.baseAttrs[a] = def.attrs?.[a] ?? 5;
  for (const [k, v] of Object.entries(def.skills ?? {})) sheet.skillBought[k as keyof typeof sheet.skillBought] = v!;
  sheet.tagged = def.tagged ?? [];
  sheet.traits = def.traits ?? [];
  sheet.perks = { ...(def.perks ?? {}) };
  sheet.level = def.level;
  sheet.xp = xpForLevel(def.level);
  const inv = emptyInventory();
  for (const [id, n] of def.inventory ?? []) addItem(inv, makeItem(id, n));
  for (const id of def.equip ?? []) {
    addItem(inv, makeItem(id));
    const idx = inv.items.findIndex((i) => i.def === id);
    const d = itemDef(id);
    if (d.weapon) equip(inv, idx, inv.equipped.primary ? 'secondary' : 'primary');
    else equip(inv, idx);
  }
  if (def.tolls) inv.tolls += def.tolls;
  for (const slot of ['primary', 'secondary'] as const) if (inv.equipped[slot]) reload(inv, slot);
  syncGear(sheet, inv);
  sheet.hp = derived(sheet).maxHp;
  return { sheet, inv };
}

export interface NpcRuntime {
  id: string;
  def: NpcDef;
  actor: Actor;
  combatant: Combatant;
  hostile: boolean;
}

export function spawnNpc(p: NpcPlacement, grid: Grid): NpcRuntime {
  const def = NPCS[p.def];
  if (!def) throw new Error(`Unknown NPC ${p.def}`);
  const id = p.id ?? def.id;
  const app = randomAppearance(def.look.seed, { frame: def.look.frame, ...(def.look.over ?? {}) });
  const actor = new Actor({ id, x: p.x, y: p.y, facing: p.facing ?? 0, look: lookFrom(app, def.outfit) }, grid);
  const { sheet, inv } = buildNpcStats(def);
  const combatant: Combatant = {
    id, name: def.name, team: def.team, sheet, inv, x: p.x, y: p.y, ap: 0, morale: initialMorale(def.courage), evasion: 0,
    natural: def.natural, courage: def.courage,
  };
  return { id, def, actor, combatant, hostile: !!def.hostile };
}
