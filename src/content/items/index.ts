import type { ItemDef } from '../../engine/inventory/items';
import { AMMO } from './ammo';
import { ARMOR } from './armor';
import { CONSUMABLES } from './consumables';
import { MISC } from './misc';
import { WEAPONS } from './weapons';
import { STORY_CH1 } from './story_ch1';
import { STORY_A1 } from './story_a1';
import { STORY_A2 } from './story_a2';
import { CHROME_ITEMS } from './chrome';

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [...WEAPONS, ...AMMO, ...ARMOR, ...CONSUMABLES, ...MISC, ...STORY_CH1, ...STORY_A1, ...STORY_A2, ...CHROME_ITEMS].map((d) => [d.id, d]),
);
