import type { ItemDef } from '../../engine/inventory/items';
import { AMMO } from './ammo';
import { ARMOR } from './armor';
import { CONSUMABLES } from './consumables';
import { MISC } from './misc';
import { WEAPONS } from './weapons';
import { STORY_CH1 } from './story_ch1';

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [...WEAPONS, ...AMMO, ...ARMOR, ...CONSUMABLES, ...MISC, ...STORY_CH1].map((d) => [d.id, d]),
);
