import type { ItemDef } from '../../engine/inventory/items';
import { CHROME } from '../chrome/catalogue';

/**
 * Boxed chrome: every piece in the catalogue exists as an item too, so it can be found in a ruin, bought from a
 * Mender, carried in the pack, removed from a body and sold on. Fitting it is a surgeon's work (ui/surgery.ts).
 */
export const CHROME_ITEMS: ItemDef[] = Object.values(CHROME).map((c) => ({
  id: `ci_${c.id}`, name: `${c.name} (boxed)`, icon: 'chrome', category: 'misc', weight: c.slot === 'legs' || c.slot === 'spine' ? 2.5 : 0.8,
  value: c.price, chrome: c.id,
  desc: `${c.desc} ${c.grade === 'concern' ? 'Concern work, sealed and tagged.' : c.grade === 'dark' ? 'Mender-built, in a cloth.' : 'Pre-Burn, in its own case.'} A surgeon can fit it.`,
}));
