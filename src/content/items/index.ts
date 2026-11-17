import type { ItemDef } from '../../engine/inventory/items';
import { AMMO } from './ammo';
import { ARMOR } from './armor';
import { CONSUMABLES } from './consumables';
import { MISC } from './misc';
import { WEAPONS } from './weapons';
import { STORY_CH1 } from './story_ch1';
import { STORY_A1 } from './story_a1';
import { STORY_A2 } from './story_a2';
import { STORY_B4 } from './story_b4';
import { STORY_B5 } from './story_b5';
import { DS_ITEMS } from './ds_shore';
import { CHROME_ITEMS } from './chrome';

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [...WEAPONS, ...AMMO, ...ARMOR, ...CONSUMABLES, ...MISC, ...STORY_CH1, ...STORY_A1, ...STORY_A2, ...STORY_B4, ...STORY_B5, ...DS_ITEMS, ...CHROME_ITEMS].map((d) => [d.id, d]),
);
