import type { ItemDef } from '../../engine/inventory/items';

/** The Drowned Shore (B5b): Gull Stilts, the Rigs, Blackcap. Story notes: story/B5b_NOTES_SECRET.md. */
export const DS_ITEMS: ItemDef[] = [
  // gear and goods
  { id: 't_rebreather', icon: 'halfmask', name: 'Diving Bag', desc: 'A pre-Burn rebreather in a patched canvas harness: a mouthpiece, a scrubber can, a counterlung that has been glued more often than it has been filled. Twenty minutes on the bottom, if you breathe slow. Yewande says nobody breathes slow down there.', category: 'tool', weight: 3, value: 120 },
  { id: 'j_controller', icon: 'board', name: 'Pump Controller', desc: 'A controller board out of a drowned machine, sealed in its potting, pins still bright: pre-Burn silicon that thinks. On the frontier a working one is worth more than a rifle, and somebody always wants it.', category: 'junk', weight: 0.3, value: 120 },
  { id: 'c_smoked_fish', icon: 'jerky', name: 'Smoked Fish', desc: 'A split mackerel, smoked hard over driftwood in Hassan\'s racks at Gull Stilts. Salt, smoke, and, this season, a faint taste of engine.', category: 'consumable', weight: 0.2, value: 4,
    consumable: { effects: [{ kind: 'food', amount: 1 }, { kind: 'heal', amount: 3 }] } },
  // Oil on the Water
  { id: 'k_ds_net', icon: 'cloth', name: 'Kai\'s Net', desc: 'A small hand net of green twine, the kind a child is given to learn on, black to the cork line with crude. A brass fitting is still knotted in its mesh where it caught: a pipe collar, stamped SALTIRE — EXPORT — JOINT 14.', category: 'key', weight: 0.5, value: 0 },
  { id: 'k_ds_seal', icon: 'ring', name: 'Guild Seal', desc: 'A lead seal on a twist of wire, cut from the wheel of Hum\'s export valve under the sea. Pressed into the lead in the guild\'s neat letters: TOLLMEN — LINE ACCOUNT. It is not three months old.', category: 'key', weight: 0.1, value: 0 },
  { id: 'k_ds_tally', icon: 'book', name: 'Tide Post Tally', desc: 'Factor Thorne\'s day-book from the tide post: fish bought, salt sold, anchorage paid to the court. In the back, ruled off: BLACKCAP — LINE ACCOUNT, two loads a month against one paid to Hum, and a column headed SHRINKAGE. Further back still, the press: names, debts, dates, and who gave each one up.', category: 'note', weight: 0.3, value: 0, read: 'd_ds_tally' },
  { id: 'k_ds_manifest', icon: 'page', name: 'Barge Manifest', desc: 'The night barge\'s manifest in the bargemaster\'s square hand: BLACKCAP — CRUDE — LINE ACCOUNT, a load a fortnight, signed off by C. Thorne. Nothing in it says where the crude came from.', category: 'key', weight: 0.1, value: 0 },
  { id: 'k_ds_sleeve', icon: 'wrench', name: 'Pipe Sleeve', desc: 'A split steel sleeve with its bolts, gaskets cut from a tyre and a tin of Hum\'s own pitch: Leila Farouk\'s answer to a line that leaks at every joint. Fitted at the valve, it takes the strain off the old line so it runs clean to Blackcap.', category: 'key', weight: 2, value: 0 },
  // False Light
  { id: 'k_ds_salt', icon: 'tin', name: 'Guild Salt', desc: 'A sack of grey sea salt from Coker\'s store, still dry inside its tarred lining, with the guild\'s seal stamped on the neck: SALT — TIDE POST — NOT FOR RESALE. It came off a barge on the Jesty\'s roof, or one before it.', category: 'key', weight: 2, value: 0 },
];
