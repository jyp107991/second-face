import type { NpcDef } from '../../engine/npc/defs';

/**
 * Carrick, Meridian's docks across the dry river (B5b, the last piece): the Line's terminus, the tide boat's water stairs, the
 * guild's floor and its weighbridge, the Concern's Bond, the Customs House where the Harbour Master keeps the port by the
 * pre-war Harbour Act, the Stand where the call-on picks the day's gangs, the Boxes where the dockers live, and the Hulls on
 * the dry bed. Dockers wear what the quay wears out: canvas and oilskin patched with tarp, re-dyed work jackets, gloves cut
 * from tyre; the Bond's people wear the Concern's clean grey and the Crown's surveyor a coat nobody on the quay could buy.
 * Story notes: story/B5b_NOTES_SECRET.md (Carrick).
 */
const DK = { team: 'neutral', settlement: 'meridian' } as const;
const sleep = (spot: string, from = 22, to = 5) => ({ from, to, spot, activity: 'sleep' as const });
/** The Concern's guards at the Bond: they turn on a thief caught at the desk, and only then. */
const bond = { team: 'concern', settlement: 'meridian', faction: 'concern', hostileIf: { flag: 'dk_bond_fight' }, courage: 50 };
/** The hired men from the Ring the guild sends for when the Stand blacks the Bond: they turn when the player stands in their way. */
const hired = {
  team: 'hired', settlement: 'meridian', hostileIf: { flag: 'dk_breakers_fight' }, courage: 45,
  // a lost fight on the Stand is the stoppage broken, not the end of the game
  beaten: [{ set: 'dk_black', value: 'broken' }, { set: 'dk_stand', value: 'broken' }],
};

export const DOCKS_NPCS: NpcDef[] = [
  {
    // the Harbour Master: the guild's factor at Carrick, who keeps the port by the Harbour Act and hears the quay's quarrels
    id: 'npc_dk_01', name: 'Factor Henrike Dahl', look: { seed: 9801, frame: 'narrow', age: 56, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0xb4b0a8 }, weathering: 0.3 } }, role: 'trader',
    level: 6, ...DK, faction: 'tollmen', courage: 55, dialogue: 'd_dk_dahl', attrs: { wits: 9, presence: 8, grit: 6 }, skills: { speech: 60, barter: 60 }, tolls: 160,
    schedule: [{ from: 6, to: 20, spot: 'dahl', activity: 'work' }, { from: 20, to: 6, activity: 'away' }],
    barks: ['The Act is the Act. I didn\'t write it; I keep it.', 'Freight by the ton, labour by the gang, dues by the berth.', 'If it isn\'t written, it isn\'t a grievance. It\'s weather.'],
  },
  {
    // drives Crane Two and speaks for the dockers at the Stand; nobody elected her and everybody asks her
    id: 'npc_dk_02', name: 'Constance Okoye', look: { seed: 9802, frame: 'narrow', age: 48, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x16120e }, weathering: 0.6, scars: ['brow_cut'] } }, role: 'labourer',
    level: 5, ...DK, courage: 70, dialogue: 'd_dk_connie', attrs: { brawn: 6, grit: 8, presence: 7 }, skills: { mechanics: 45, speech: 40, melee: 35 }, tolls: 12,
    schedule: [{ from: 4, to: 9, spot: 'stand', activity: 'work' }, { from: 9, to: 18, spot: 'crane2', activity: 'work' }, { from: 18, to: 22, spot: 'connie', activity: 'idle' }, sleep('connie_bed', 22, 4)],
    barks: ['Gang Nine stood down. Eight families. Count them.', 'Two lifts what you give it. Six lifts what it\'s told.', 'Stand on the line. Look like you mean it.'],
  },
  {
    // the guild's night gang-master: a docker who rose; hard, fair by his lights, and short-handed by order
    id: 'npc_dk_03', name: 'Mattias Platt', look: { seed: 9803, frame: 'broad', age: 44, ancestry: 'north_european', over: { hair: { style: 'paint_buzz', color: 0x3a3028 }, facialHair: 'stubble_heavy', weathering: 0.6 } }, role: 'labourer',
    level: 5, ...DK, faction: 'tollmen', courage: 55, dialogue: 'd_dk_platt', attrs: { brawn: 8, grit: 7 }, skills: { melee: 45, speech: 30, mechanics: 30 }, tolls: 30,
    schedule: [{ from: 18, to: 6, spot: 'platt', activity: 'work' }, { from: 6, to: 10, spot: 'platt_day', activity: 'idle' }, { from: 10, to: 18, activity: 'away' }],
    barks: ['Five on, three short. Move.', 'The board says what it says.', 'I called Nine. I call who I\'m told I can call.'],
  },
  {
    // the dead man's widow: she guts fish on the steps and her girl coughs all night in the Boxes
    id: 'npc_dk_04', name: 'Oksana Lysenko', look: { seed: 9804, frame: 'narrow', age: 33, ancestry: 'north_european', over: { hair: { style: 'ponytail01', color: 0x6a5440 }, weathering: 0.55 } }, role: 'fisher',
    level: 2, ...DK, courage: 40, dialogue: 'd_dk_oksana', attrs: { grit: 7, wits: 6 }, skills: { survival: 30, barter: 25 }, tolls: 3,
    schedule: [{ from: 5, to: 15, spot: 'oksana', activity: 'work' }, { from: 15, to: 22, spot: 'oksana_home', activity: 'idle' }, sleep('oksana_bed', 22, 5)],
    barks: ['Don\'t stand on the tarp. Please.', 'Zoya. Breathe slow. Slow.', 'He knew the hooks. He knew them.'],
  },
  {
    // the Concern's bond officer: courteous, exact, and nothing in the Bond happens he does not sign for
    id: 'npc_dk_05', name: 'Lucien Roux', look: { seed: 9805, frame: 'broad', age: 42, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x221a14 }, weathering: 0.08 } }, role: 'corp',
    level: 5, team: 'concern', settlement: 'meridian', faction: 'concern', courage: 35, dialogue: 'd_dk_roux', attrs: { wits: 9, presence: 7 }, skills: { barter: 65, speech: 55 }, tolls: 240,
    schedule: [{ from: 7, to: 20, spot: 'roux', activity: 'work' }, { from: 20, to: 7, activity: 'away' }],
    barks: ['Everything inside the line is under bond.', 'The seal is the manifest. I find that restful.', 'Shall we keep this pleasant? It costs nothing.'],
  },
  {
    // House Vane's surveyor at the far end of the Crown's road
    id: 'npc_dk_06', name: 'Imogen Thrale', look: { seed: 9806, frame: 'narrow', age: 31, ancestry: 'north_european', over: { hair: { style: 'culturalibre_hair_02', color: 0x7a5a3c }, weathering: 0.05 } }, role: 'gilded',
    level: 3, team: 'neutral', settlement: 'meridian', faction: 'tenured', courage: 30, dialogue: 'd_dk_imogen', attrs: { wits: 9, presence: 6 }, skills: { science: 55, speech: 45, barter: 40 }, tolls: 120,
    schedule: [{ from: 8, to: 18, spot: 'imogen', activity: 'work' }, { from: 18, to: 8, activity: 'away' }],
    barks: ['Eleven metres to bedrock. Good stone. Good stone.', 'Please don\'t move the stakes. They\'re only paint, but they\'re expensive paint.', 'A bridge is a sentence with two ends.'],
  },
  {
    // the Hulls' speaker, master of the oldest hull, and the cradle's winchman at night ("Kobby")
    id: 'npc_dk_07', name: 'Kwabena Ofori', look: { seed: 9807, frame: 'broad', age: 61, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x9a948c }, facialHair: 'short_beard', weathering: 0.75, scars: ['cheek_slash'] } }, role: 'drifter',
    level: 4, ...DK, courage: 60, dialogue: 'd_dk_kwabena', attrs: { brawn: 7, grit: 8, presence: 6 }, skills: { mechanics: 40, survival: 40, speech: 35 }, tolls: 20,
    schedule: [{ from: 20, to: 4, spot: 'cradle', activity: 'work' }, { from: 4, to: 8, activity: 'away' }, { from: 8, to: 20, spot: 'kwabena_day', activity: 'idle' }],
    barks: ['Five a head. Ten if you\'re heavy. Twenty if you\'re trouble.', 'The Star\'s been a ship a hundred and twenty years. Ninety of them dry.', 'Swing the lamp twice. Wait. Once.'],
  },
  {
    // his granddaughter: rides the basket over the bed and back, and keeps the Hulls' crew books
    id: 'npc_dk_08', name: 'Abena Ofori', look: { seed: 9808, frame: 'narrow', age: 19, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x120e0b }, weathering: 0.4 } }, role: 'street',
    level: 2, ...DK, courage: 55, dialogue: 'd_dk_abena', attrs: { reflex: 8, senses: 7 }, skills: { stealth: 40, survival: 30 }, tolls: 6,
    schedule: [{ from: 20, to: 4, spot: 'cradle_b', activity: 'work' }, { from: 4, to: 8, activity: 'away' }, { from: 8, to: 20, spot: 'abena_day', activity: 'idle' }],
    barks: ['Don\'t look down. There\'s nothing to see but the bed.', 'Grandad\'s rope. Grandad\'s rules.', 'I write the crews in the book every Sunday. Every name.'],
  },
  {
    // a girl off the through, hidden at the back of the cookshop
    id: 'npc_dk_09', name: 'Mirela Stan', look: { seed: 9809, frame: 'narrow', age: 15, ancestry: 'north_european', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x3a2a1c }, weathering: 0.35 } }, role: 'street',
    level: 1, ...DK, courage: 35, dialogue: 'd_dk_mirela', attrs: { wits: 7, reflex: 6 }, skills: { stealth: 35 }, tolls: 0,
    schedule: [],
    barks: ['I\'m washing pots.', 'Six days in the dark. You count by the stops.', 'Don\'t say my name near the fence.'],
  },
  {
    // the fish steps: mullet off the Basin wall, bait, lines to rent at dawn
    id: 'npc_dk_10', name: 'Grigor Avakian', look: { seed: 9810, frame: 'broad', age: 67, ancestry: 'mediterranean', over: { hair: { style: 'none', color: 0xa09a90 }, facialHair: 'full_beard', weathering: 0.7 } }, role: 'fisher',
    level: 3, ...DK, courage: 45, dialogue: 'd_dk_grigor', attrs: { senses: 7, grit: 6 }, skills: { survival: 55, barter: 45 }, tolls: 40,
    merchant: { buys: ['consumable', 'junk'], cash: 90, restockDays: 3, markup: 1.2, stock: [['c_dk_mullet', 6], ['c_smoked_fish', 4], ['c_dirtywater', 6], ['j_cloth', 2]] },
    schedule: [{ from: 4, to: 14, spot: 'grigor', activity: 'trade' }, { from: 14, to: 4, activity: 'away' }],
    barks: ['Mullet. Small. Alive. That\'s three things more than the river.', 'Line\'s two at dawn. Bring it back.', 'Mind the third step. It\'s been green since my father.'],
  },
  {
    // the cookshop in a container: soup, bread, rice when there's rice, and a bunk to let next door
    id: 'npc_dk_11', name: 'Esperanza Cardenas', look: { seed: 9811, frame: 'narrow', age: 52, ancestry: 'latin_american', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x2a2018 }, weathering: 0.55 } }, role: 'trader',
    level: 3, ...DK, courage: 50, dialogue: 'd_dk_espe', attrs: { wits: 7, presence: 7 }, skills: { barter: 50, speech: 40, medicine: 25 }, tolls: 50,
    merchant: { buys: ['consumable'], cash: 100, restockDays: 2, markup: 1.2, stock: [['c_dk_soup', 6], ['c_water', 4], ['c_bitters', 3], ['c_tin', 2]] },
    schedule: [{ from: 5, to: 23, spot: 'espe', activity: 'trade' }, { from: 23, to: 5, activity: 'away' }],
    barks: ['Soup\'s hot. That\'s the recipe.', 'Pay first. Then I like you.', 'Bunk next door, twenty. Clean blanket. Mostly clean.'],
  },
  {
    // the guild's ticket clerk at the Line's last window
    id: 'npc_dk_12', name: 'Femi Adebayo', look: { seed: 9812, frame: 'broad', age: 23, ancestry: 'west_african', over: { hair: { style: 'paint_fade', color: 0x120e0b }, weathering: 0.3 } }, role: 'trader',
    level: 2, ...DK, faction: 'tollmen', courage: 35, dialogue: 'd_dk_line', attrs: { wits: 7 }, skills: { barter: 35 }, tolls: 25,
    schedule: [{ from: 6, to: 20, spot: 'femi', activity: 'work' }, { from: 20, to: 6, activity: 'away' }],
    barks: ['Seven o\'clock east. Twenty-five a leg.', 'Through? Through doesn\'t sell tickets. Through doesn\'t stop.', 'Face for the card. Hold still.'],
  },
  {
    // the weighbridge clerk: writes NOT WEIGHED every night in a register nobody reads; keeps the floor's counter
    id: 'npc_dk_13', name: 'Tomas Hruska', look: { seed: 9813, frame: 'broad', age: 58, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0xa8a49c }, facialHair: 'moustache', weathering: 0.55 } }, role: 'trader',
    level: 3, ...DK, faction: 'tollmen', courage: 35, dialogue: 'd_dk_tomas', attrs: { wits: 8 }, skills: { barter: 45, science: 35 }, tolls: 40,
    merchant: { buys: ['tool', 'junk', 'misc'], cash: 140, restockDays: 5, markup: 1.4, faction: 'tollmen', stock: [['t_repair', 2], ['t_lamp', 1], ['j_wiring', 3], ['c_bandage', 3], ['j_fuel', 2]] },
    schedule: [{ from: 6, to: 22, spot: 'tomas', activity: 'trade' }, { from: 22, to: 6, activity: 'away' }],
    barks: ['Everything on the plate gets a number. Nearly everything.', 'The register doesn\'t care who reads it.', 'Floor\'s open. Guild prices. Don\'t argue with me, argue with the guild.'],
  },
  {
    // the Hulls' fence: what comes over the cradle, what falls off the boxes
    id: 'npc_dk_14', name: 'Nadia Kassab', look: { seed: 9814, frame: 'narrow', age: 38, ancestry: 'mediterranean', over: { hair: { style: 'cut_pixie', color: 0x1a1410 }, weathering: 0.5, scars: ['lip_split'] } }, role: 'street',
    level: 4, ...DK, courage: 45, dialogue: 'd_dk_nadia', attrs: { wits: 8, reflex: 6 }, skills: { barter: 55, stealth: 40 }, tolls: 70,
    merchant: { buys: 'all', cash: 160, restockDays: 4, markup: 1.6, stock: [['j_electronics', 2], ['a_9mm', 20], ['c_knitkit', 1], ['c_dk_inhaler', 2], ['t_picks', 1]] },
    schedule: [{ from: 9, to: 21, spot: 'nadia', activity: 'trade' }, { from: 21, to: 9, activity: 'away' }],
    barks: ['Nothing I sell fell off anything.', 'Concern goods, Crown prices, Hulls manners.', 'Ask Kobby about the rope. Don\'t ask me.'],
  },
  // ---------------------------------------------------------------- the guild's guards, the Bond's, the hired men
  {
    id: 'npc_dk_g1', name: 'Guild Guard', look: { seed: 9821, frame: 'broad', age: 34, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x4a3a2c }, facialHair: 'stubble', weathering: 0.5 } }, role: 'guard',
    level: 5, team: 'tollmen', settlement: 'meridian', faction: 'tollmen', minor: true, courage: 50, attrs: { brawn: 6, reflex: 5 }, skills: { firearms: 45, melee: 40 }, tolls: 10,
    equip: ['w_pump', 'r_duster'], inventory: [['a_12ga', 8]], schedule: [{ from: 0, to: 24, spot: 'steps_guard', activity: 'patrol' }],
    barks: ['Steps are for the court.', 'The Harbour Master\'s busy. She\'s always busy.'],
  },
  {
    id: 'npc_dk_g2', name: 'Guild Guard', look: { seed: 9822, frame: 'broad', age: 41, ancestry: 'south_asian', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, facialHair: 'short_beard', weathering: 0.55 } }, role: 'guard',
    level: 5, team: 'tollmen', settlement: 'meridian', faction: 'tollmen', minor: true, courage: 50, attrs: { brawn: 6, reflex: 5 }, skills: { firearms: 40, melee: 45 }, tolls: 10,
    equip: ['w_revolver38', 'r_duster'], inventory: [['a_38', 10]], schedule: [{ from: 0, to: 24, spot: 'quay_patrol', activity: 'patrol' }],
    barks: ['Quay\'s guild. Theft\'s the hook.', 'Keep off the box. It\'s evidence. Of something.'],
  },
  {
    id: 'npc_dk_c1', name: 'Bond guard', look: { seed: 9823, frame: 'broad', age: 29, ancestry: 'east_asian', over: { hair: { style: 'cut_crop', color: 0x16120e }, weathering: 0.1 } }, role: 'corp',
    level: 6, ...bond, minor: true, attrs: { reflex: 6, senses: 6 }, skills: { firearms: 55, melee: 40 }, tolls: 15,
    equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 20]], schedule: [{ from: 0, to: 24, spot: 'bond_gate', activity: 'patrol' }],
    barks: ['Please stay outside the line.', 'The Bond is closed to the quay.'],
  },
  {
    id: 'npc_dk_c2', name: 'Bond guard', look: { seed: 9824, frame: 'narrow', age: 33, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x2a1e16 }, weathering: 0.1 } }, role: 'corp',
    level: 6, ...bond, minor: true, attrs: { reflex: 6, senses: 6 }, skills: { firearms: 55, melee: 40 }, tolls: 15,
    equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 14]], schedule: [{ from: 7, to: 21, spot: 'bond_in', activity: 'patrol' }, { from: 21, to: 7, activity: 'away' }],
    barks: ['Under bond. Under seal.', 'Mind the lights. They mind you.'],
  },
  {
    id: 'npc_dk_h1', name: 'Hired man', look: { seed: 9825, frame: 'broad', age: 36, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x5a4a3a }, facialHair: 'short_beard', weathering: 0.7 } }, role: 'labourer',
    level: 5, ...hired, minor: true, leader: true, attrs: { brawn: 7, grit: 6 }, skills: { melee: 50, firearms: 35 }, tolls: 20,
    equip: ['w_sledge'], barks: ['Day\'s pay to stand here. Night\'s pay to do more.', 'Off the line.'],
  },
  {
    id: 'npc_dk_h2', name: 'Hired man', look: { seed: 9826, frame: 'broad', age: 27, ancestry: 'east_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, weathering: 0.6 } }, role: 'street',
    level: 4, ...hired, minor: true, attrs: { brawn: 6, reflex: 6 }, skills: { melee: 45 }, tolls: 12,
    equip: ['w_pipe'], barks: ['Ring pays in water. Guild pays in Tolls. We go where it\'s wet.'],
  },
  {
    id: 'npc_dk_h3', name: 'Hired man', look: { seed: 9827, frame: 'broad', age: 44, ancestry: 'latin_american', over: { hair: { style: 'cut_messy', color: 0x2a2018 }, facialHair: 'stubble_heavy', weathering: 0.75 } }, role: 'drifter',
    level: 4, ...hired, minor: true, attrs: { brawn: 6, grit: 6 }, skills: { melee: 40, firearms: 40 }, tolls: 12,
    equip: ['w_zip38'], inventory: [['a_38', 6]], barks: ['Nothing personal. It\'s the guild\'s.'],
  },
];
