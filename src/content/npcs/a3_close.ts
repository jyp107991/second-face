import type { NpcDef } from '../../engine/npc/defs';

/**
 * Act 3 at the Spire's close (B6l): the people the muster's allies sent to the foot of the steps once the Ledger's card has
 * come. Each ally that counts at the close keeps its own ground the night after the steps (the Choir's vigil, the Wheel's
 * roads, Carrick's quays, Bridgeward's streets), so it sends one of its own to say so, and to be seen. The two readers
 * (Verity of the Saints, Assessor Seventeen) come in person and are placed from their own defs. Placed by
 * `tools/maps/gen_md_spire.py`; trees in `dialogue/a3_close.ts`. Story notes: story/B6_NOTES_SECRET.md §2.3 (21a), "As built" → B6l.
 * Ids are `npc_a3_31..34` (B6l's own range, clear of the slices built alongside).
 */
export const A3_CLOSE_NPCS: NpcDef[] = [
  {
    // a sister of the Choir's open-sky tents: twenty years of setting bones under canvas, and the vigil's keeper tonight
    id: 'npc_a3_31', name: 'Sister Keziah Abernethy', look: { seed: 9431, frame: 'narrow', age: 54, ancestry: 'north_european', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x9a948a }, weathering: 0.65 } },
    role: 'pilgrim', team: 'choir', faction: 'choir', settlement: 'openfield', courage: 60, level: 3, dialogue: 'd_a3_keziah',
    attrs: { grit: 7, presence: 6 }, skills: { medicine: 45, speech: 40 }, tolls: 4, inventory: [['c_bandage', 2]],
    barks: ['The sky keeps no books. We will keep the vigil.', 'Sit, if you are sitting. We have been here since the card.', 'Nobody has asked us to move. Nobody will.'],
  },
  {
    // a rider of the Wheel, sent down the pan with the word that the roads are ready
    id: 'npc_a3_32', name: 'Lucan Begay', look: { seed: 9432, frame: 'broad', age: 41, ancestry: 'indigenous_american', over: { hair: { style: 'cut_crop', color: 0x2a2622 }, facialHair: 'stubble', weathering: 0.7 } },
    role: 'nomad', team: 'wheel', faction: 'wheel', settlement: 'wheel', courage: 60, level: 4, dialogue: 'd_a3_lucan',
    attrs: { grit: 7, senses: 7 }, skills: { survival: 55, firearms: 40 }, tolls: 30, equip: ['w_revolver38'], inventory: [['a_38', 6], ['c_water', 2]],
    barks: ['Every road in the Reach has a rider on it tonight. Ask me which.', 'Sefa says hello. Sefa doesn\'t say hello.', 'City stone. Hard on the feet. Harder on the wheels.'],
  },
  {
    // a docker of the Stand, up from Carrick's quays in her work clothes with the tally hook still on her belt
    id: 'npc_a3_33', name: 'Ifeoma Okonjo', look: { seed: 9433, frame: 'narrow', age: 34, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x16120e }, weathering: 0.5 } },
    role: 'labourer', team: 'neutral', settlement: 'meridian', courage: 65, level: 4, dialogue: 'd_a3_ifeoma',
    attrs: { brawn: 7, grit: 7 }, skills: { mechanics: 40, melee: 40 }, tolls: 14,
    barks: ['Connie\'s on the quays. I\'m the one she could spare.', 'Nobody loads. Nobody unloads. That\'s the whole plan.', 'Nice stone. Somebody\'s back carried every piece.'],
  },
  {
    // a runner for the chain's three crews in Bridgeward: Rustmouth by birth, everybody's by trade
    id: 'npc_a3_34', name: 'Tuan Dinh', look: { seed: 9434, frame: 'broad', age: 23, ancestry: 'southeast_asian', over: { hair: { style: 'cut_messy', color: 0x141010 }, weathering: 0.4 } },
    role: 'street', team: 'neutral', faction: 'rustmouths', settlement: 'meridian', courage: 55, level: 3, dialogue: 'd_a3_tuan',
    attrs: { reflex: 7, wits: 7 }, skills: { stealth: 45, melee: 35 }, tolls: 9,
    barks: ['Auntie says the streets are kept. Ask me how.', 'Three crews, one chain. I run for all of them. Don\'t tell any of them.', 'I\'ve never been this close to the steps. They\'re smaller than they look from the bridge.'],
  },
];
