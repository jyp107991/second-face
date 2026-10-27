import { NPCS } from '../../content';
import { lookFrom } from '../assets/humanoid';
import { initialMorale, type Combatant } from '../combat/rules';
import { randomAppearance, type Appearance } from '../data/appearance';
import { dressFor, roleLook } from '../data/outfits';
import type { Outfit } from '../assets/humanoid';
import { addItem, emptyInventory, equip, makeItem, reload, syncGear, type Inventory } from '../inventory/inventory';
import { itemDef } from '../inventory/items';
import { Actor } from '../scene/actor';
import type { Grid } from '../scene/grid';
import { derived, emptySheet, type CharacterSheet } from '../stats/sheet';
import { ATTRIBUTES, xpForLevel } from '../stats/rules';
import { wardrobeOutfit } from '../inventory/wardrobe';
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
  appearance: Appearance;
  outfit: Outfit;
  actor: Actor;
  combatant: Combatant;
  /** In conversation with the player: schedules leave the body alone. */
  talking?: boolean;
  hostile: boolean;
  /** Travelling with the player: follows, fights alongside, kept across maps. */
  companion?: boolean;
  /** Off the map for now (schedule says 'away'). */
  away?: boolean;
  /** Placement-specific conversation (overrides the def's). */
  dialogue?: string;
  /** Placement-specific routine (overrides the def's). */
  schedule?: import('./schedule').ScheduleEntry[];
}

export function spawnNpc(p: NpcPlacement, grid: Grid, keep?: { sheet: CharacterSheet; inv: Inventory }): NpcRuntime {
  const def = NPCS[p.def];
  if (!def) throw new Error(`Unknown NPC ${p.def}`);
  const id = p.id ?? def.id;
  const { app, outfit: dressed } = npcLook(def);
  const { sheet, inv } = keep ?? buildNpcStats(def);
  // Worn armour and the weapon in hand show on the body.
  const outfit = wardrobeOutfit({ sheet, inventory: inv, appearance: app }, dressed);
  const actor = new Actor({ id, x: p.x, y: p.y, facing: p.facing ?? 0, look: lookFrom(app, outfit, 'low') }, grid);
  const combatant: Combatant = {
    id, name: def.name, team: def.team, sheet, inv, x: p.x, y: p.y, ap: 0, morale: initialMorale(def.courage), evasion: 0,
    natural: def.natural, courage: def.courage,
  };
  return { id, def, appearance: app, outfit, actor, combatant, hostile: !!def.hostile, dialogue: p.dialogue, schedule: p.schedule };
}

/** An NPC's appearance and clothing: generated from seed + role unless the definition fixes them. */
export function npcLook(def: NpcDef): { app: Appearance; outfit: Outfit } {
  const role = def.role ?? 'settler';
  const app = randomAppearance(def.look.seed, { frame: def.look.frame, age: def.look.age, ancestry: def.look.ancestry, over: def.look.over, ...roleLook(role) });
  const fit = def.look.frame ? (def.look.frame === 'broad' ? 'm' : 'f') : app.shape.gender > 0.5 ? 'm' : 'f';
  return { app, outfit: def.outfit ?? dressFor(def.look.seed, role, fit, def.faction) };
}
