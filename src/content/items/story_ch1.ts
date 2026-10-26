import type { ItemDef } from '../../engine/inventory/items';

/** Chapter One key items and notes. */
export const STORY_CH1: ItemDef[] = [
  { id: 'k_photo', icon: 'photo', name: 'Photograph', desc: 'A creased print: you, older, in a ruined city of towers. On the back, a date forty-one years gone.', category: 'key', weight: 0, value: 0 },
  { id: 'k_mask', icon: 'halfmask', name: "Stranger's Mask", desc: 'Leather and tin, sun-split. A painted sign on the brow: half a sun, or an open hand.', category: 'key', weight: 0.4, value: 0 },
  { id: 'k_notebook', icon: 'book', name: "Stranger's Notebook", desc: 'Pages of tight marks that are not quite letters. Some are crossed out with care.', category: 'note', weight: 0.1, value: 0 },
  { id: 'k_ring', icon: 'ring', name: 'Worn Ring', desc: 'A plain band, worn thin on the inside. Two letters and a half-sun mark, almost gone.', category: 'key', weight: 0, value: 0 },
  { id: 'k_map', icon: 'map', name: 'The Stranger\'s Map', desc: 'Soft as cloth from handling. A drawn line of road, twelve places pricked with a pin, and beside each a block of five marks in the stranger\'s cipher.', category: 'note', weight: 0, value: 0, read: 'd_map' },
  { id: 'k_cipher_key', icon: 'wheel', name: 'Tollmen Cipher Wheel', desc: 'Two brass discs on a rivet, letters on both rims. The Tollmen sell them to anyone who can pay, which tells you who writes the ciphers.', category: 'tool', weight: 0.1, value: 40 },
  { id: 'k_notebook_page', icon: 'page', name: 'Torn Notebook Page', desc: 'A leaf from the stranger\'s notebook, in the same tight marks, creased from a scout\'s hood.', category: 'note', weight: 0, value: 0 },
  { id: 'k_door_order', icon: 'order', name: 'Council Order', desc: 'Elder Halloran\'s seal on a slip of ration paper: "Open the great door for the bearer."', category: 'key', weight: 0, value: 0 },
];
