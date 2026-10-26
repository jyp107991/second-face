import type { ItemDef } from '../../engine/inventory/items';

/** Chapter One key items and notes. */
export const STORY_CH1: ItemDef[] = [
  { id: 'k_photo', name: 'Photograph', desc: 'A creased print: you, older, in a ruined city of towers. On the back, a date forty-one years gone.', category: 'key', weight: 0, value: 0 },
  { id: 'k_mask', name: "Stranger's Mask", desc: 'Leather and tin, sun-split. A painted sign on the brow: half a sun, or an open hand.', category: 'key', weight: 0.4, value: 0 },
  { id: 'k_notebook', name: "Stranger's Notebook", desc: 'Pages of tight marks that are not quite letters. Some are crossed out with care.', category: 'note', weight: 0.1, value: 0 },
  { id: 'k_door_order', name: 'Council Order', desc: 'Elder Halloran\'s seal on a slip of ration paper: "Open the great door for the bearer."', category: 'key', weight: 0, value: 0 },
];
