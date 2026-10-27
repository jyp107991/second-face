import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';

/**
 * Bridgeward: the broken bridge and its toll, three crews and their paint, the Saints' tower and the girl who hears,
 * the Rust Dogs' old garage. Turf, Static, the old haunt.
 */

const bye = { text: 'That\'s all.', exit: true };
const SMALL_HOURS = { hour: { from: 0, to: 3 } };
/** The bridge is still three crews' argument. */
const OPEN: Cond = { not: { flag: 'bw_turf' } };
/** No chrome in any slot: the Pale's one condition. */
const NO_CHROME: Cond = { not: { any: [{ chromeSlot: 'eyes' }, { chromeSlot: 'neural' }, { chromeSlot: 'armL' }, { chromeSlot: 'armR' }, { chromeSlot: 'legs' }, { chromeSlot: 'spine' }, { chromeSlot: 'skin' }, { chromeSlot: 'organs' }] } };
/** The girl has been heard and nothing has been done about her yet. */
const STATIC_OPEN: Cond = { all: [{ knows: 'bw_immy_heard' }, { not: { flag: 'bw_static' } }] };

// ---------------------------------------------------------------- signs, the Loop, the toll

export const d_bw_loop: DialogueDef = {
  id: 'd_bw_loop', owner: 'narrator', start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'THE LOOP — BRIDGEWARD. A board with three paints on it and the fares scratched through all three: PRECINCT 3 · OLD MARKET 3 · LANTERN ROW 3 · THE STACKS 3 · THE DOCKS 4. The last is chalked over: NO BRIDGE.',
      effects: [{ learn: 'bw_loop_seen' }],
      options: [
        { id: 'bwloop.precinct', text: 'The Precinct. (3 Tolls)', if: { item: 'tolls', count: 3 }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_precinct', spawn: 'loop', minutes: 20 } }], exit: true },
        { id: 'bwloop.market', text: 'Old Market. (3 Tolls)', if: { all: [{ flag: 'md_market_open' }, { item: 'tolls', count: 3 }] }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_market', spawn: 'loop', minutes: 15 } }], exit: true },
        { id: 'bwloop.lantern', text: 'Lantern Row. (3 Tolls)', if: { item: 'tolls', count: 3 }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_lantern', spawn: 'loop', minutes: 10 } }], exit: true },
        { id: 'bwloop.stacks', text: 'The Stacks. (3 Tolls)', if: { item: 'tolls', count: 3 }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_stacks', spawn: 'loop', minutes: 15 } }], exit: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
  },
};

const SIGN = (id: string, text: string, learn: string): DialogueDef => ({ id, owner: 'narrator', start: [{ node: 'read' }], nodes: { read: { text, effects: [{ learn }], options: [{ text: '(Leave it.)', exit: true }] } } });
export const d_bw_west_sign = SIGN('d_bw_west_sign', 'The chain, from this side: WORKS, in the Gilt\'s gold, over a Rustmouth\'s rust-red X, over a white hand with the palm scored through. Three crews, one chain, and the paint is the only fighting that has happened on it so far.', 'bw_three_paints');
export const d_bw_toll_sign = SIGN('d_bw_toll_sign', 'A notice in Crown print, screwed to the booth: TOLL — BRIDGEWARD CROSSING — BY WARRANT OF HOUSE VANE — COLLECTED BY ARRANGEMENT. There is no crossing. The toll is five to stand on the near end of a bridge to nowhere, and a Tenured house holds the paper on it.', 'bw_vane_toll');
export const d_bw_drop = SIGN('d_bw_drop', 'The deck ends in torn rebar and forty feet of air. Across the dry river: the far bank, the Docks\' cranes, lamps, a tram that is not the Loop. Close enough to hear a bell. No way to reach it that does not go round by the Wall, which is a day, and a warrant.', 'docks_seen');
export const d_bw_chop_sign = SIGN('d_bw_chop_sign', 'PETROV — CUT — PARTS — ANYTHING THAT HAD WHEELS. A buggy seat nailed over the door like a trophy, with a dog\'s head burned into the leather, old.', 'bw_chop_seen');
export const d_bw_tower_sign = SIGN('d_bw_tower_sign', 'THE SAINTS OF STATIC — LISTEN. A dead relay mast with a red lamp at the top that somebody climbs to keep lit, and under it the brick shell where the radios are. People come out of it slowly, as from a church.', 'bw_tower_seen');
export const d_bw_pale_sign = SIGN('d_bw_pale_sign', 'The white hand, palm scored through, over a stair house with one door. The Pale\'s. Under the hand, small: THE SINK IS UNDER YOU.', 'bw_pale_hatch_seen');

export const d_bw_chain: DialogueDef = {
  id: 'd_bw_chain', owner: 'narrator', start: [{ if: { flag: 'bw_turf' }, node: 'after' }, { node: 'chain' }],
  nodes: {
    chain: {
      text: 'The toll chain across the deck, with a gap in it the width of a person and a Rustmouth either side of the gap. A slate: STAND — 5. Beyond the chain, the bridge, and the drop, and the view.',
      options: [
        { id: 'chain.pay', text: '(Pay five, and stand on the bridge.)', if: { all: [{ item: 'tolls', count: 5 }, { not: { flag: 'bw_toll_paid' } }] }, effects: [{ take: 'tolls', count: 5 }, { set: 'bw_toll_paid' }, { learn: 'bw_toll_paid' }], next: 'paid' },
        { id: 'chain.member', text: '(Walk through. The chain is yours.)', if: { member: 'rustmouths' }, next: 'ours' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    paid: { text: 'Five, into a box with a Crown stamp on the lid. The Rustmouth lifts the chain a hand\'s width, which is a courtesy; you could have stepped over it. The bridge is wider than the street and emptier than anything in Meridian, and from the end of it you can see the Docks.', options: [{ text: '(Walk out.)', exit: true }] },
    ours: { text: 'The Rustmouths nod. The chain does not move; you step over it, which is what the chain is for.', options: [{ text: '(Walk out.)', exit: true }] },
    after: { text: [{ if: { flag: 'bw_turf', eq: 'gilt' }, text: 'The chain is on the ground and the slate says, in gold: STAND — FREE — GILT. Two Gilt lean where the Rustmouths leaned.' }, { if: { flag: 'bw_turf', eq: 'peace' }, text: 'The chain is up, and beside the slate a second slate, in three paints: STAND — 2 — SPLIT THREE WAYS. Nobody likes it. Everybody pays it.' }, { text: 'The chain is up and the Rustmouths are either side of it, and there is a new coat of rust-red on the booth over the gold.' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the Rustmouths

export const d_bw_dagmar: DialogueDef = {
  id: 'd_bw_dagmar', owner: 'npc_bw_01',
  start: [
    { if: { flag: 'bw_fight_rustmouths' }, node: 'fight' },
    { if: { all: [{ flag: 'lr_fight_gilt' }, { dead: 'npc_bw_08' }, OPEN] }, node: 'held_blood' },
    { if: { flag: 'bw_turf' }, node: 'after' },
    { if: { flag: 'dagmar_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A woman at a table in a metal hall with a sawn-off beside her hand and a ledger beside the sawn-off, who has been Boss of the Rustmouths since the Rustmouths were a union and looks it. "Dagmar Holt. They say Auntie Scrap. Not to my face." She looks at you until you understand that she is waiting for you to say it. "The bridge is ours because we\'re on it. That is the whole of law in Bridgeward. What do you want on it?"',
      effects: [{ set: 'dagmar_met' }, { learn: 'dagmar_seen' }],
      options: [
        { id: 'dagmar.toll', text: 'The bridge goes nowhere. Why a toll?', next: 'toll', once: true },
        { id: 'dagmar.gilt', text: 'The Gilt want your chain.', next: 'gilt', once: true },
        { id: 'dagmar.hold', text: 'I\'ll hold the chain for you. Against the Gilt.', if: { all: [{ member: 'rustmouths' }, OPEN, { not: { flag: 'bw_hold_chain' } }] }, effects: [{ set: 'bw_hold_chain' }], next: 'hold' },
        { id: 'dagmar.sit', text: 'A sit-down. You, the Gilt, the Pale. At the tower, under the girl who hears.', if: { all: [{ knows: 'bw_immy_heard' }, { knows: 'bw_vane_toll' }, OPEN, { not: { flag: 'bw_dagmar_sitdown' } }] }, check: { skill: 'speech', dc: 40, mods: [{ if: { member: 'rustmouths' }, dc: -15, why: 'you pay her tithe' }, { if: { knows: 'bw_vane_road' }, dc: -10, why: 'you know what the Crown wants the bridge for' }] }, next: 'sit_ok', fail: 'sit_no' },
        { id: 'dagmar.tithe', text: 'How does one become a Rustmouth?', next: 'tithe', once: true },
        bye,
      ],
    },
    again: {
      text: '"Auntie Scrap." She says it herself, to save time.',
      options: [
        { id: 'dagmar.toll.again', text: 'Why a toll?', if: { not: { seen: 'dagmar.toll' } }, next: 'toll' },
        { id: 'dagmar.gilt.again', text: 'The Gilt want your chain.', if: { not: { seen: 'dagmar.gilt' } }, next: 'gilt' },
        { id: 'dagmar.hold.again', text: 'I\'ll hold the chain for you.', if: { all: [{ member: 'rustmouths' }, OPEN, { not: { flag: 'bw_hold_chain' } }] }, effects: [{ set: 'bw_hold_chain' }], next: 'hold' },
        { id: 'dagmar.sit.again', text: 'A sit-down, at the tower.', if: { all: [{ knows: 'bw_immy_heard' }, { knows: 'bw_vane_toll' }, OPEN, { not: { flag: 'bw_dagmar_sitdown' } }] }, check: { skill: 'speech', dc: 40, mods: [{ if: { member: 'rustmouths' }, dc: -15, why: 'you pay her tithe' }, { if: { knows: 'bw_vane_road' }, dc: -10, why: 'you know what the Crown wants the bridge for' }] }, next: 'sit_ok', fail: 'sit_no' },
        { id: 'dagmar.tithe.again', text: 'How does one become a Rustmouth?', if: { not: { seen: 'dagmar.tithe' } }, next: 'tithe' },
        bye,
      ],
    },
    toll: { text: '"It goes to the Crown\'s paper." She turns the ledger round: a warrant, Crown-printed, HOUSE VANE. "A Tenured house holds the bridge. We collect, we keep the chain, they keep the arrangement, and a woman in a clean coat comes Tuesdays for the ledger." She turns it back. "Five to stand. Nobody crosses, so nobody pays twenty. The Crown doesn\'t know there\'s no crossing; the Crown has never been down here."', effects: [{ learn: 'bw_vane_toll' }, { lead: 'l_bw_tenured_road' }], options: [bye] },
    gilt: { text: '"The Gilt want a lot." She does not look west. "Crown kids with gold in their teeth who\'ve never lifted a car. Let them come to the chain. Or go and tell Jax what a chain is; he\'s never seen one from this side."', options: [bye] },
    hold: { text: '"Then go and stand at it." She pushes a slate across: RUSTMOUTH — HOLDS. "Jax is a boy. Boys go back when a grown person says go back. If he doesn\'t, the chain\'s iron and so are you."', options: [bye] },
    sit_ok: { text: 'She looks at the warrant for a long moment. "The Crown wants the near end. The Crown always wants the near end." She closes the ledger. "I\'ll sit. Under the mast, where the girl can hear me. Get the boy there, and the white hands. If they come, I come."', effects: [{ set: 'bw_dagmar_sitdown' }, { xp: 40 }], options: [bye] },
    sit_no: { text: '"Sit with the Gilt." She almost laughs. "I\'d sooner sit with the drop."', options: [bye] },
    tithe: { text: '"A hundred, or a haul. Corvo takes both." She looks at your hands. "You\'d be a hauler. Haulers haul. In a year, a mouth, and the tolls are yours to take a cut of. In ten, maybe my hand, if Corvo\'s dead." She says it without weight; Corvo is beside her and does not look up.', effects: [{ learn: 'bw_tithe_heard' }], options: [bye] },
    held_blood: { text: 'The chain is up and Jax is on the ground beside it and the Gilt have gone back to their fire barrel without him. Dagmar Holt has come out of the hall to look, which she does not do. "Held." She says it to the chain. "Blood on it now. That\'s a chain the Gilt will remember." She looks at you. "Mouth. You\'re a mouth now. Take a cut."', effects: [{ set: 'bw_turf', value: 'rustmouths' }, { set: 'bw_held_blood' }, { promote: { faction: 'rustmouths', rank: 'crew' } }, { rep: { faction: 'rustmouths', respect: 15 } }, { rep: { faction: 'gilt', respect: -20, fear: 8 } }, { xp: 150 }, { decision: { id: 'bw_held_blood', text: 'You held the Rustmouths\' chain against the Gilt with blood on it.' } }], options: [bye] },
    after: { text: [{ if: { flag: 'bw_turf', eq: 'rustmouths' }, text: '"Held." The ledger is open at the warrant and she has written beside it, in rust-red: HELD. "The Crown\'s paper and our chain. Same as before, with you on it."' }, { if: { flag: 'bw_turf', eq: 'gilt' }, text: 'The hall is quieter. Half the yard is gone. "Gold on my booth." She does not touch the sawn-off. "I\'ve been a union and a mob. I\'ll be a union again. Get out of my hall."' }, { if: { flag: 'bw_turf', eq: 'peace' }, text: '"Split three ways." She says it like a diagnosis. "Two Tolls to stand, and the Pale\'s share goes down a hatch to buy bread for people who hate me. The girl said the Crown takes the near end by the Long Night." She shrugs. "Then we\'ll have been three crews on one chain when it comes. That\'s something."' }, { text: '"Auntie Scrap."' }], options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_bw_corvo: DialogueDef = {
  id: 'd_bw_corvo', owner: 'npc_bw_02',
  start: [{ if: { flag: 'bw_fight_rustmouths' }, node: 'fight' }, { if: { member: 'rustmouths' }, node: 'member' }, { if: { flag: 'corvo_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The Boss\'s Hand: a big man on a bench with a pipe across his knees and a revolver he has not drawn in a year, who looks at the hall door more than at you. "Corvo. The hand does the lifting." He weighs you. "Tithe\'s a hundred, or a haul. A haul\'s honest. Petrov\'s got a wreck on the blocks that wants cutting for the yard; cut it, bring me the ticket."',
      effects: [{ set: 'corvo_met' }, { learn: 'bw_tithe_heard' }],
      options: [
        { id: 'corvo.pay', text: '(Pay the tithe. 100 Tolls)', if: { item: 'tolls', count: 100 }, effects: [{ take: 'tolls', count: 100 }, { enlist: 'rustmouths', rank: 'runner' }, { set: 'bw_tithe_paid' }, { xp: 60 }, { decision: { id: 'bw_rustmouth', text: 'You paid the Rustmouths\' tithe and became a hauler.' } }], next: 'sworn' },
        { id: 'corvo.haul', text: '(Hand over the haul ticket.)', if: { item: 'k_bw_haul' }, effects: [{ take: 'k_bw_haul' }, { enlist: 'rustmouths', rank: 'runner' }, { set: 'bw_tithe_paid' }, { xp: 80 }, { decision: { id: 'bw_rustmouth', text: 'You cut a wreck for the Rustmouths\' yard and became a hauler.' } }], next: 'sworn' },
        { text: 'Not today.', exit: true },
      ],
    },
    again: { text: '"A hundred, or a haul."', options: [{ id: 'corvo.pay.again', text: '(Pay the tithe. 100 Tolls)', if: { item: 'tolls', count: 100 }, effects: [{ take: 'tolls', count: 100 }, { enlist: 'rustmouths', rank: 'runner' }, { set: 'bw_tithe_paid' }, { xp: 60 }, { decision: { id: 'bw_rustmouth', text: 'You paid the Rustmouths\' tithe and became a hauler.' } }], next: 'sworn' }, { id: 'corvo.haul.again', text: '(Hand over the haul ticket.)', if: { item: 'k_bw_haul' }, effects: [{ take: 'k_bw_haul' }, { enlist: 'rustmouths', rank: 'runner' }, { set: 'bw_tithe_paid' }, { xp: 80 }, { decision: { id: 'bw_rustmouth', text: 'You cut a wreck for the Rustmouths\' yard and became a hauler.' } }], next: 'sworn' }, { text: 'Not today.', exit: true }] },
    sworn: { text: '"Hauler." He writes it on the bench with a nail, your name under a hundred others. "You haul Fridays. You pay nobody\'s toll. You don\'t wear gold and you don\'t show the Pale your hands." He puts the nail away. "Boss\'ll want the chain held. Go and see her."', options: [bye] },
    member: { text: '"Hauler." The bench. "Friday\'s the weigh."', options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_bw_petrov: DialogueDef = {
  id: 'd_bw_petrov', owner: 'npc_bw_03',
  start: [{ if: { flag: 'petrov_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man under a car on blocks who comes out slowly, wiping a hand that does not get cleaner. "Petrov. I cut cars. The Rustmouths cut me, a tenth. That\'s the trade." He nods at the shelves. "Parts, wire, a pipe if you want a pipe. And a wreck on the blocks that wants cutting, if the Hand sent you."',
      effects: [{ set: 'petrov_met' }, { learn: 'petrov_seen' }],
      options: [
        { id: 'petrov.haul', text: 'The Hand sent me. The wreck.', if: { all: [{ knows: 'bw_tithe_heard' }, { not: { item: 'k_bw_haul' } }, { not: { flag: 'bw_haul_done' } }] }, check: { skill: 'mechanics', dc: 35 }, next: 'haul_ok', fail: 'haul_no' },
        { id: 'petrov.dogs', text: 'The seat over the door. A dog\'s head.', next: 'dogs', once: true },
        { text: 'Parts.', effects: [{ event: 'barter' }], exit: true },
        bye,
      ],
    },
    again: { text: '"Anything that had wheels."', options: [{ id: 'petrov.haul.again', text: 'The wreck on the blocks.', if: { all: [{ knows: 'bw_tithe_heard' }, { not: { item: 'k_bw_haul' } }, { not: { flag: 'bw_haul_done' } }] }, check: { skill: 'mechanics', dc: 35 }, next: 'haul_ok', fail: 'haul_no' }, { id: 'petrov.dogs.again', text: 'The seat over the door.', if: { not: { seen: 'petrov.dogs' } }, next: 'dogs' }, { text: 'Parts.', effects: [{ event: 'barter' }], exit: true }, bye] },
    haul_ok: { text: 'Four hours with a torch and a bar, and the wreck is an engine, two axles, a door and a heap, which is what the yard weighs. Petrov writes the ticket on a strip of tin with a nail. "Haul. Honest." He looks at your hands. "You\'ve done it before."', effects: [{ give: 'k_bw_haul' }, { set: 'bw_haul_done' }, { time: 240 }, { xp: 40 }], options: [bye] },
    haul_no: { text: 'An hour with a torch and the wreck is a wreck with a hole in it. "Come back when your hands know a torch."', effects: [{ time: 60 }], options: [bye] },
    dogs: { text: '"Rust Dogs. They had the garage across the street before the Rustmouths had the bridge." He looks at it. "Left me a buggy when they went to the Sallow. I cut the buggy. I kept the seat. Fenn\'s still in there; he cuts nothing and nobody."', effects: [{ learn: 'bw_dogs_garage' }], options: [bye] },
  },
};

// ---------------------------------------------------------------- the Gilt at the chain

export const d_bw_jax: DialogueDef = {
  id: 'd_bw_jax', owner: 'npc_bw_08',
  start: [
    { if: { flag: 'lr_fight_gilt' }, node: 'fight' },
    { if: { all: [{ flag: 'bw_fight_rustmouths' }, { dead: 'npc_bw_r1' }, { dead: 'npc_bw_r2' }, OPEN] }, node: 'won' },
    { if: { flag: 'bw_turf' }, node: 'after' },
    { if: { flag: 'jax_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A Gilt at the chain with gold in his hair and a pistol he keeps touching, like a man checking a pocket. "Jax. Gilt. The chain says works, and from here to the fire barrel it means ours." He looks east, at the bridge, the way a boy looks at a thing he has been promised. "Pip says the bridge is next. Pip says the runner says."',
      effects: [{ set: 'jax_met' }, { learn: 'jax_seen' }],
      options: [
        { id: 'jax.down', text: 'The chain comes down. When?', if: { all: [{ member: 'gilt' }, OPEN, { not: { flag: 'bw_fight_rustmouths' } }] }, next: 'down' },
        { id: 'jax.back', text: 'Pull back off the chain, Jax. The bridge is held.', if: { all: [{ member: 'rustmouths' }, { flag: 'bw_hold_chain' }, OPEN] }, check: { skill: 'speech', dc: 40, mods: [{ if: { member: 'rustmouths', rank: 'crew' }, dc: -10, why: 'a mouth, not a hauler' }, { if: { item: 'k_bw_dog_mark' }, dc: -10, why: 'the Dogs\' mark on your coat: the garage remembers who held this street' }] }, next: 'back_ok', fail: 'back_no' },
        { id: 'jax.sit', text: 'A sit-down, at the tower. Dagmar will come.', if: { all: [{ flag: 'bw_dagmar_sitdown' }, OPEN, { not: { flag: 'bw_jax_sitdown' } }] }, next: 'sit' },
        { id: 'jax.why', text: 'What does a Crown kid want with a bridge to nowhere?', next: 'why', once: true },
        bye,
      ],
    },
    again: { text: '"Chain says works."', options: [{ id: 'jax.down.again', text: 'The chain comes down. When?', if: { all: [{ member: 'gilt' }, OPEN, { not: { flag: 'bw_fight_rustmouths' } }] }, next: 'down' }, { id: 'jax.back.again', text: 'Pull back off the chain. The bridge is held.', if: { all: [{ member: 'rustmouths' }, { flag: 'bw_hold_chain' }, OPEN] }, check: { skill: 'speech', dc: 40, mods: [{ if: { member: 'rustmouths', rank: 'crew' }, dc: -10, why: 'a mouth, not a hauler' }, { if: { item: 'k_bw_dog_mark' }, dc: -10, why: 'the Dogs\' mark on your coat' }] }, next: 'back_ok', fail: 'back_no' }, { id: 'jax.sit.again', text: 'A sit-down, at the tower.', if: { all: [{ flag: 'bw_dagmar_sitdown' }, OPEN, { not: { flag: 'bw_jax_sitdown' } }] }, next: 'sit' }, { id: 'jax.why.again', text: 'What does a Crown kid want with a bridge?', if: { not: { seen: 'jax.why' } }, next: 'why' }, bye] },
    why: { text: '"The near end." He says it like Pip. "The Crown wants a road to the Docks and the bridge is where the road goes when they build it, and whoever holds the near end holds the toll on the Crown\'s own road." He grins, gold. "Pip\'s mother sits on the committee that votes the road. Pip says. Pip says a lot."', effects: [{ learn: 'bw_vane_road' }, { lead: 'l_bw_tenured_road' }], options: [bye] },
    down: { text: '"When you say." He draws the pistol and looks at it. "Pip said the runner says. Two at the chain, one in the yard, the Hand and Auntie. Five. We\'re four with you." He waits.', options: [{ id: 'down.go', text: 'Now.', effects: [{ set: 'bw_fight_rustmouths' }, { decision: { id: 'bw_gilt_rising', text: 'You went for the Rustmouths\' chain with the Gilt.' } }], next: 'going' }, { text: 'Not yet.', exit: true }] },
    going: { text: 'He whistles once, and the Gilt come off the fire barrel.', options: [{ text: '(Go.)', effects: [{ event: 'combat' }], exit: true }] },
    won: { text: 'The chain is on the ground and the Rustmouths who held it are beside it and the hall door is shut. Jax has a slate and is writing on it in gold: STAND — FREE — GILT. "Runner." He is shaking a little and pretending it is the cold. "Crew. Pip\'ll say crew. Tell him I said it first."', effects: [{ set: 'bw_turf', value: 'gilt' }, { promote: { faction: 'gilt', rank: 'crew' } }, { rep: { faction: 'gilt', respect: 15 } }, { rep: { faction: 'rustmouths', respect: -25, fear: 10 } }, { xp: 150 }, { decision: { id: 'bw_gilt_chain', text: 'You pulled the Rustmouths\' chain down for the Gilt.' } }, { news: { tag: 'bw_chain_down', text: 'the Gilt took the Bridgeward chain off the Rustmouths; a stranger was in it', valence: -6, size: 7, at: 'meridian' } }], options: [bye] },
    back_ok: { text: 'He looks at the chain, and at the two Rustmouths, and at you, and at the fire barrel, which is where boys go. "Pip said —" He stops. "Pip isn\'t here." The pistol goes away. "The chain\'s yours. Till it isn\'t." He walks back to the barrel without turning round, which is the bravest thing he has done today.', effects: [{ set: 'bw_turf', value: 'rustmouths' }, { promote: { faction: 'rustmouths', rank: 'crew' } }, { rep: { faction: 'rustmouths', respect: 12 } }, { rep: { faction: 'gilt', respect: -8 } }, { xp: 120 }, { decision: { id: 'bw_held_word', text: 'You held the Rustmouths\' chain against the Gilt with a word.' } }], options: [bye] },
    back_no: { text: '"Make me." The pistol is out. Behind you the chain, and behind the chain two shotguns, and nobody has moved yet.', options: [{ id: 'back.fight', text: '(Make him.)', effects: [{ set: 'lr_fight_gilt' }], next: 'make' }, { text: '(Step back.)', exit: true }] },
    make: { text: 'The Gilt come off the barrel. The Rustmouths come off the chain. Bridgeward gets what Bridgeward has been waiting three paints for.', options: [{ text: '(Go.)', effects: [{ event: 'combat' }], exit: true }] },
    sit: { text: '"Under the mast. With Auntie." He thinks about it with his whole face. "Pip\'ll kill me." Then: "Pip isn\'t here. I\'ll sit. If she sits, I sit."', effects: [{ set: 'bw_jax_sitdown' }, { xp: 30 }], options: [bye] },
    after: { text: [{ if: { flag: 'bw_turf', eq: 'gilt' }, text: '"Free to stand." He has the slate under his arm like a prize. "Pip\'s coming down to see it. Pip says."' }, { if: { flag: 'bw_turf', eq: 'peace' }, text: '"Split three ways." He does not like it and he is at the chain with a Rustmouth and a white hand, taking two Tolls, which is the thing he was promised with the gold filed off.' }, { text: 'The fire barrel, and the Gilt round it, and the chain over there.' }], options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the Pale's hatch

export const d_bw_nell: DialogueDef = {
  id: 'd_bw_nell', owner: 'npc_bw_07',
  start: [{ if: { flag: 'sk_fight_pale' }, node: 'fight' }, { if: { flag: 'nell_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman on a chair by a hatch with a machete across her knees and skin the water never saw the sun through. "Nell. Pale. Show me your hands." You show her. "The hatch is ours. The stair under it is ours. The Sink under the stair is ours. The bridge —" she tilts her head at it — "is nobody\'s. That\'s the only true thing said in Bridgeward."',
      effects: [{ set: 'nell_met' }, { learn: 'nell_seen' }, { learn: 'pale_seen' }],
      options: [
        { id: 'nell.vow', text: 'Swear me in.', if: { all: [{ not: { member: 'pale' } }, { not: { flag: 'bw_pale_refused' } }] }, next: 'vow' },
        { id: 'nell.sit', text: 'A sit-down, at the tower. The three crews.', if: { all: [{ flag: 'bw_dagmar_sitdown' }, OPEN, { not: { flag: 'bw_nell_sitdown' } }] }, next: 'sit' },
        { id: 'nell.hatch', text: 'The hatch. Where does it go?', next: 'hatch', once: true },
        bye,
      ],
    },
    again: { text: '"Hands." You show her. "Good."', options: [{ id: 'nell.vow.again', text: 'Swear me in.', if: { all: [{ not: { member: 'pale' } }, { not: { flag: 'bw_pale_refused' } }] }, next: 'vow' }, { id: 'nell.sit.again', text: 'A sit-down, at the tower.', if: { all: [{ flag: 'bw_dagmar_sitdown' }, OPEN, { not: { flag: 'bw_nell_sitdown' } }] }, next: 'sit' }, { id: 'nell.hatch.again', text: 'The hatch.', if: { not: { seen: 'nell.hatch' } }, next: 'hatch' }, bye] },
    vow: { text: [{ if: NO_CHROME, text: 'She stands and takes your hands and turns them over, and looks at your eyes, close, for the ring a lens leaves, and at your neck for the port. There is nothing. "Say it. No chrome. Ever. Not in me, not near me, and out of whoever owes me." She waits.' }, { text: 'She stands and takes your hands and turns them over, and stops. "Hands." She lets go of them as if they were hot. "You\'ve iron in you. We don\'t swear iron. Go and get it out, if you want the hand; Ocho\'ll take it out for nothing. Then come back."' }], options: [{ id: 'vow.say', text: 'No chrome. Ever.', if: NO_CHROME, effects: [{ enlist: 'pale', rank: 'runner' }, { set: 'bw_pale_sworn' }, { xp: 80 }, { rep: { faction: 'pale', respect: 10 } }, { decision: { id: 'bw_pale_sworn', text: 'You swore the Pale\'s vow at the hatch in Bridgeward: no chrome, ever.' } }], next: 'sworn' }, { id: 'vow.no', text: 'I\'ll keep what I have.', effects: [{ set: 'bw_pale_refused' }], exit: true }, bye] },
    sworn: { text: '"Sworn." She paints it on your hand with white from a tin, a palm with a line through it, which will wash off and which everyone in Meridian will have seen by dark. "The Sink\'s open to you. The hatch\'s open to you. Dray will want to see the hand."', options: [bye] },
    sit: { text: '"The Pale will come to say the bridge is nobody\'s." She does not stand. "We\'ll say it once, and go back down. If the other two hear it, that\'s a thing. They won\'t."', effects: [{ set: 'bw_nell_sitdown' }, { xp: 20 }], options: [bye] },
    hatch: { text: '"Down. A stair, and a tunnel, and the Sink\'s east bank, where Dray sits." She taps the hatch with the machete\'s flat. "The Rustmouths wanted it once. They stopped wanting it. The Gilt don\'t know it\'s here; the Gilt don\'t know anything that isn\'t gold."', effects: [{ learn: 'bw_hatch_sink' }], options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_bw_hatch: DialogueDef = {
  id: 'd_bw_hatch', owner: 'narrator', start: [{ node: 'hatch' }],
  nodes: { hatch: { text: [{ if: { member: 'pale' }, text: 'The Pale\'s hatch: a steel lid with a white hand on it, and a stair under it going down into warm dark that smells of the Sink. Yours to use now, Nell says; the east bank is a long wet walk and the Loop is faster, which is why nobody uses it but the Pale.' }, { text: 'A steel lid with a white hand painted on it and a woman with a machete sitting on it. It is not open and it is not going to be.' }], effects: [{ learn: 'bw_hatch_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

// ---------------------------------------------------------------- the Saints of Static

export const d_bw_shrine: DialogueDef = {
  id: 'd_bw_shrine', owner: 'narrator', start: [{ node: 'shrine' }],
  nodes: {
    shrine: {
      text: 'Radios. Forty of them, pre-Burn, on crates and shelves and the floor, with their dials lit by candles behind the glass because nothing else will light them. A hiss comes from one of them, or from all of them, or from the mast overhead. People sit with their ears near the speakers the way the Sink\'s hermit sits with the lift.',
      effects: [{ learn: 'bw_shrine_seen' }],
      options: [
        { id: 'shrine.vigil', text: '(Sit with a radio until the hiss changes.)', if: { all: [{ flag: 'bw_vigil_asked' }, { not: { member: 'saints' } }, SMALL_HOURS] }, check: { attr: 'senses', dc: 7, mods: [{ if: { knows: 'st_power_at_two' }, dc: -2, why: 'you know when the city\'s wire wakes' }] }, next: 'vigil_ok', fail: 'vigil_no' },
        { id: 'shrine.sit', text: '(Sit a while and listen.)', effects: [{ time: 60 }], next: 'listen' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    listen: { text: [{ if: SMALL_HOURS, text: 'An hour. Hiss. Then, at two, under it, for three minutes, something with the rhythm of speech and none of the words: the sound of a city checking itself. Then hiss.' }, { text: 'An hour. Hiss. A candle gutters. Tobin, two radios down, says "There," and you did not hear it.' }], effects: [{ learn: 'bw_listened' }], options: [{ text: '(Leave it.)', exit: true }] },
    vigil_ok: { text: 'Midnight to two with a dead radio against your ear and the candles going down. At two the hiss changes. Not words; the shape of words, counted, at the speed a machine reads, for three minutes, and in the middle of it, once, something you could swear was a name. Then hiss. Verity is standing behind you. "You heard it." She does not ask. "Listener."', effects: [{ enlist: 'saints', rank: 'runner' }, { set: 'bw_vigil_done' }, { time: 120 }, { xp: 100 }, { rep: { faction: 'saints', respect: 10 } }, { lead: 'l_static_forecast' }, { decision: { id: 'bw_saint', text: 'You sat the Saints\' vigil in Bridgeward and heard the hiss change at two.' } }], options: [bye] },
    vigil_no: { text: 'Midnight to two with a dead radio against your ear, and hiss, and at two more hiss, and a candle burning your knuckle. Verity, behind you: "Most hear the hiss. Come back; it isn\'t a test you fail, it\'s a thing you practise."', effects: [{ time: 120 }], options: [bye] },
  },
};

export const d_bw_verity: DialogueDef = {
  id: 'd_bw_verity', owner: 'npc_bw_04',
  start: [{ if: { all: [{ flag: 'bw_dagmar_sitdown' }, { flag: 'bw_jax_sitdown' }, OPEN, { not: { flag: 'bw_sitdown_failed_today' } }] }, node: 'sitdown' }, { if: { flag: 'bw_static' }, node: 'after' }, { if: { flag: 'verity_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in a grey scarf at the foot of the mast with a coil of wire over her shoulder, who looks at you as if she had been told you were coming, which, in a sense, she had. "Verity. Choirmaster, they say, because somebody has to be. We listen." She nods up at the red lamp. "The city talks to itself all night on its own wire. Most people sleep through it. We sit up."',
      effects: [{ set: 'verity_met' }, { learn: 'verity_seen' }, { learn: 'saints_heard' }],
      options: [
        { id: 'verity.hear', text: 'What do the Saints hear?', next: 'hear', once: true },
        { id: 'verity.kiosk', text: 'You put a wire up a lamp post in Old Market. A kiosk reads the file off it.', if: { knows: 'kiosk_verity' }, next: 'kiosk', once: true },
        { id: 'verity.girl', text: 'The girl at the radios.', next: 'girl', once: true },
        { id: 'verity.vigil', text: 'I\'d sit with the radios.', if: { all: [{ not: { member: 'saints' } }, { not: { flag: 'bw_vigil_asked' } }] }, next: 'vigil' },
        { id: 'verity.keep', text: 'Keep her here. Keep her yours. I\'ll tell no one.', if: STATIC_OPEN, next: 'keep' },
        bye,
      ],
    },
    again: {
      text: '"Listen."',
      options: [
        { id: 'verity.hear.again', text: 'What do the Saints hear?', if: { not: { seen: 'verity.hear' } }, next: 'hear' },
        { id: 'verity.kiosk.again', text: 'The wire up the lamp post in Old Market.', if: { all: [{ knows: 'kiosk_verity' }, { not: { seen: 'verity.kiosk' } }] }, next: 'kiosk' },
        { id: 'verity.girl.again', text: 'The girl at the radios.', if: { not: { seen: 'verity.girl' } }, next: 'girl' },
        { id: 'verity.vigil.again', text: 'I\'d sit with the radios.', if: { all: [{ not: { member: 'saints' } }, { not: { flag: 'bw_vigil_asked' } }] }, next: 'vigil' },
        { id: 'verity.keep.again', text: 'Keep her here. Keep her yours. I\'ll tell no one.', if: STATIC_OPEN, next: 'keep' },
        bye,
      ],
    },
    hear: { text: '"The hiss, mostly. Under it, at two, for three minutes, the city. It reads itself its own file, every night, on the lamp wire, and a dead radio near a live wire hears a little of it." She touches the coil. "We hear the shape. Immy hears the words. That is the only difference between a Saint and a prophet, and it is the whole difference."', effects: [{ learn: 'saints_what' }, { learn: 'saints_wire' }], options: [bye] },
    kiosk: { text: '"A toy that talks." She does not deny it. "I wanted to know if a machine could hear what Immy hears. It can. It hears names and sells fortunes with them, which is what a machine does with a prophecy." She looks at you. "Did you cut it?" She does not wait for the answer; she can see it.', effects: [{ learn: 'verity_kiosk_admitted' }], options: [bye] },
    girl: { text: '"Immy. Sixteen. She came to the tower two years ago with the hiss already in her, from a cot in the Stacks with the lift shaft on the other side of the wall." She looks at the shell. "She says true things. Names, numbers, days. She said yours before you came up the street, and a number, and a word I did not like." Quietly: "Everyone who hears of her wants her. The wardens want her silent. The guild wants her sealed. The Concern wants her wired. I want her to be sixteen."', effects: [{ learn: 'verity_immy' }], options: [bye] },
    vigil: { text: '"Midnight to two, with a dead radio, in the small hours when the wire wakes. If you hear anything but hiss, you\'re a Listener." She hands you a radio with no back. "Most hear the hiss. It isn\'t a test you fail. It\'s a thing you practise."', effects: [{ set: 'bw_vigil_asked' }, { quest: 'q_bw_static', start: true }], options: [bye] },
    keep: { text: 'She looks at you for a long time, and at the red lamp, and back. "Swear it on the hiss." You do. "Then she stays, and she is sixteen, and when the wire says something you need to know, you\'ll hear it from me and from nobody else." She unwinds a foot of wire from the coil and gives it to you, which is apparently a thing that means something here.', effects: [{ set: 'bw_static', value: 'kept' }, { lead: 'l_static_forecast' }, { trust: { npc: 'npc_bw_04', by: 20 } }, { rep: { faction: 'saints', respect: 12 } }, { xp: 120 }, { decision: { id: 'bw_static_kept', text: 'You swore on the hiss to leave the Saints\' girl where she is and tell no one.' } }], options: [bye] },
    sitdown: {
      text: 'Under the mast, at dusk, with the red lamp going: Dagmar Holt on a crate with the sawn-off across her knees; Jax on his feet because sitting would be agreeing; Nell by the door with her hands showing, if she came; forty radios; and Immy at the altar, not looking at anyone, saying under her breath the thing she has been saying all week: *Vane. The bridge. The Long Night.* Verity says, "Listen," and they do, for once, and then they look at you.',
      options: [
        { id: 'sit.speak', text: 'The Crown takes the near end by the Long Night whoever holds it. Three crews on one chain is the only thing it can\'t take. Two Tolls to stand, split three ways, and the Pale\'s share down the hatch.', check: { skill: 'speech', dc: 45, mods: [{ if: { knows: 'bw_immy_vane' }, dc: -15, why: 'the girl has said it in front of them, and they heard' }, { if: { flag: 'bw_nell_sitdown' }, dc: -10, why: 'the Pale came to say the bridge is nobody\'s' }, { if: { item: 'k_bw_toll_ledger' }, dc: -10, why: 'the Crown\'s own arrangement, in your hand' }, { if: { any: [{ member: 'rustmouths' }, { member: 'gilt' }, { member: 'pale' }] }, dc: -10, why: 'one of them is yours' }] }, next: 'peace', fail: 'no_peace' },
        { text: '(Say nothing. Let them talk.)', effects: [{ set: 'bw_sitdown_failed_today' }, { after: { minutes: 1440, id: 'bw_sitdown_reset', effects: [{ set: 'bw_sitdown_failed_today', value: false }] } }], next: 'no_peace' },
      ],
    },
    peace: { text: 'Nobody agrees. Dagmar says two Tolls is robbery and Jax says a third is an insult and Nell says the bridge is nobody\'s, and Immy, at the altar, says *the Long Night* again, and that is what does it: not you, the word. Dagmar stands. "Split three ways. Till the Crown comes. Then we\'ll see who\'s on the chain." Jax says, "Pip\'ll —" and does not finish. Nell goes down the hatch without saying anything, which is the Pale\'s yes.', effects: [{ set: 'bw_turf', value: 'peace' }, { xp: 200 }, { rep: { faction: 'rustmouths', respect: 8 } }, { rep: { faction: 'gilt', respect: 8 } }, { rep: { faction: 'pale', respect: 8 } }, { rep: { faction: 'saints', respect: 10 } }, { decision: { id: 'bw_peace', text: 'You brokered Bridgeward\'s chain three ways under the Saints\' mast.' } }, { news: { tag: 'bw_peace', text: 'three crews split the Bridgeward chain three ways after a sit-down at the Saints\' tower', valence: 8, size: 7, at: 'meridian' } }], options: [bye] },
    no_peace: { text: 'They go back to their paint. Dagmar does not look at you on her way out; Jax does, which is worse. Verity says, "Tomorrow. The wire doesn\'t stop because they did."', effects: [{ set: 'bw_sitdown_failed_today' }, { after: { minutes: 1440, id: 'bw_sitdown_reset', effects: [{ set: 'bw_sitdown_failed_today', value: false }] } }], options: [bye] },
    after: { text: [{ if: { flag: 'bw_static', eq: 'kept' }, text: '"She\'s sixteen." The wire. "Listen, when you need to. I\'ll tell you what it said."' }, { if: { flag: 'bw_static', eq: 'silenced' }, text: 'The altar has a gap in it where Immy sat, and the candles are not lit. "Wardens." She does not say your name. "They had the tower\'s name from somebody who had been here. Go and listen to your own hiss."' }, { if: { flag: 'bw_static', eq: 'sold' }, text: 'The gap at the altar. "Guild riders, at dawn, with a sealed sheet with her name on it." She winds wire round her hand until it whitens. "Somebody sold a prophecy. It\'s what they\'re for, apparently."' }, { text: 'The gap at the altar. "A man in a clean coat. She went with him; he had a radio that worked." Verity does not look up from the coil. "She\'ll hear everything now. All of it, all the time. That was the one thing I could keep from her."' }], options: [bye] },
  },
};

export const d_bw_immy: DialogueDef = {
  id: 'd_bw_immy', owner: 'npc_bw_05',
  start: [{ if: { flag: 'bw_static' }, node: 'after' }, { if: { knows: 'bw_immy_heard' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A girl at the altar of radios with her eyes open and nothing in them, saying things in a voice that is not a girl\'s: flat, exact, counted, the voice the kiosk used. "— reserve nine. Non-compliant. {name}. —" A pause with hiss in it. "— point six, as per. Thursday. Quint. A hand higher. —" She stops, and blinks, and is sixteen. "Sorry. It does that."',
      effects: [{ learn: 'bw_immy_heard' }, { quest: 'q_bw_static', start: true }, { learn: 'immy_seen' }],
      passives: [{ attr: 'senses', dc: 8, text: 'Under her hair, at the nape, a scar the shape of a port, old and badly done, with nothing in it.', effects: [{ learn: 'immy_port' }] }],
      options: [
        { id: 'immy.again', text: 'Say it again. The rest of it.', next: 'rest' },
        { id: 'immy.vane', text: 'Vane. You said Vane, under your breath.', if: { knows: 'bw_vane_toll' }, next: 'vane', once: true },
        { id: 'immy.who', text: 'Who are you?', next: 'who', once: true },
        bye,
      ],
    },
    again: { text: 'She is sixteen for a moment, and then the voice: "— as per —"', options: [{ id: 'immy.again.2', text: 'Say it again. The rest of it.', next: 'rest' }, { id: 'immy.vane.again', text: 'Vane.', if: { all: [{ knows: 'bw_vane_toll' }, { not: { seen: 'immy.vane' } }] }, next: 'vane' }, { id: 'immy.who.again', text: 'Who are you?', if: { not: { seen: 'immy.who' } }, next: 'who' }, bye] },
    rest: {
      text: [{ if: { flag: 'wren_joined' }, text: 'The voice. "— Calloway. Wren. Bridgeward. The rope. Before the Long Night. —" Hiss. "— an example. Gangs cowed. —" Then she is a girl again, and says, "Who\'s Wren?" and you do not answer.' }, { if: { flag: 'wren_exodus' }, text: 'The voice. "— Calloway. Wren. Shale. Bridgeward. The rope. Before the Long Night. —" Hiss. "— an example. —" Then she is a girl again, and says, "That one\'s new," and looks frightened for the first time.' }, { text: 'The voice. "— the Sink. A hand higher. Spring. — Openfield. The Long Night. — the Spire. Forty-nine. —" Hiss. Then she is a girl again and says, "I don\'t know what any of it is. Verity writes it down."' }],
      effects: [{ learn: 'bw_immy_rest' }, { learn: 'bw_wren_foretold' }],
      options: [bye],
    },
    vane: { text: 'The voice, at once, as if the word had been waiting: "— Vane. The bridge. Near end. A road. The Long Night. — Arrangement terminated. —" She blinks. "That one\'s every night. Verity says don\'t say it where the Rustmouths can hear. I say it anyway; it isn\'t me saying it."', effects: [{ learn: 'bw_immy_vane' }, { lead: 'l_bw_tenured_road' }], options: [bye] },
    who: { text: '"Immy. I was in the Stacks, in a cot by the lift wall, and it got in." She touches the back of her neck without seeming to know she does it. "Verity says I\'m a radio that works. I\'d rather be a radio that didn\'t. Nobody wants a radio that didn\'t."', effects: [{ learn: 'immy_who' }], options: [bye] },
    after: { text: [{ if: { flag: 'bw_static', eq: 'kept' }, text: '"— as per —" Then: "You\'re the one who swore. Verity said." She almost smiles. "Thanks. I think."' }, { text: 'The altar. A gap where she sat, and the candles not lit.' }], options: [bye] },
  },
};

export const d_bw_tobin: DialogueDef = {
  id: 'd_bw_tobin', owner: 'npc_bw_06', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'A man with a radio in his lap and his eyes shut. "Tobin. Three years." He does not open them. "I heard my own name once, the first month. Nothing since. Verity says that\'s normal. Verity says the wire doesn\'t say a thing twice." He opens them. "Immy hears it in words. I hear it in weather. Sit; the small hours are best."', effects: [{ learn: 'tobin_seen' }, { learn: 'saints_what' }], options: [bye] } },
};

// ---------------------------------------------------------------- the Dogs' old haunt

export const d_bw_haunt_door: DialogueDef = {
  id: 'd_bw_haunt_door', owner: 'narrator', start: [{ node: 'door' }],
  nodes: { door: { text: 'A garage door with a chain through its handles that has not been locked in years, only hung there, and a dog\'s head burned into the wood at the height of a child\'s hand. Through the gap, a stove going, and a man who has heard you and not got up.', effects: [{ learn: 'bw_haunt_seen' }, { quest: 'q_bw_haunt', start: true }], options: [{ text: '(Go in.)', exit: true }] } },
};

export const d_bw_haunt_wall: DialogueDef = {
  id: 'd_bw_haunt_wall', owner: 'narrator', start: [{ node: 'wall' }],
  nodes: { wall: { text: 'The garage wall, by the stove: names, burned in with a hot nail, a column of them, with a dog\'s head over the column. KESSLER. PERPETUA. VASHA. BRINDLE. FENN. JACK. And lower, at the height of a child\'s hand, in a child\'s burning: WREN. Under all of them, newer, in chalk: BACK FOR THE BRIDGE.', effects: [{ learn: 'bw_wall_wren' }, { learn: 'bw_back_for_bridge' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_bw_fenn: DialogueDef = {
  id: 'd_bw_fenn', owner: 'npc_bw_09',
  start: [{ if: { flag: 'fenn_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [{ if: { inParty: 'npc_rd_03' }, text: 'An old man on a bench by a stove who looks past you at Wren and does not say anything for a long moment, and then says, "Little Calloway," and his voice goes, and he has to start again. "Kessler said the Sallow. Perpetua said the Sallow. I said my knees." He pats the bench. "Sit. I\'ve been sitting on it nine years."' }, { text: 'An old man on a bench by a stove, in a garage with a dog\'s head on every wall and a buggy with no seat. "Fenn. I was a Dog. Dogs had this garage before the Rustmouths had the bridge; then they had the Sallow, and I had my knees." He does not get up. "Nobody comes in here. Petrov, for the stove. You\'re not Petrov."' }],
      effects: [{ set: 'fenn_met' }, { learn: 'fenn_seen' }, { learn: 'bw_dogs_garage' }],
      options: [
        { id: 'fenn.dogs', text: 'Why did the Dogs leave?', next: 'dogs', once: true },
        { id: 'fenn.cache', text: 'The cache. Under the bench.', if: { any: [{ knows: 'bw_wren_haunt' }, { knows: 'bw_wall_wren' }] }, next: 'cache' },
        { id: 'fenn.back', text: 'BACK FOR THE BRIDGE. Whose chalk?', if: { knows: 'bw_back_for_bridge' }, next: 'back', once: true },
        bye,
      ],
    },
    again: { text: '"Fenn." The bench.', options: [{ id: 'fenn.dogs.again', text: 'Why did the Dogs leave?', if: { not: { seen: 'fenn.dogs' } }, next: 'dogs' }, { id: 'fenn.cache.again', text: 'The cache.', if: { all: [{ any: [{ knows: 'bw_wren_haunt' }, { knows: 'bw_wall_wren' }] }, { not: { flag: 'unlocked:md_bridgeward/bw_haunt_cache' } }] }, next: 'cache' }, { id: 'fenn.back.again', text: 'BACK FOR THE BRIDGE.', if: { all: [{ knows: 'bw_back_for_bridge' }, { not: { seen: 'fenn.back' } }] }, next: 'back' }, bye] },
    dogs: { text: '"The Rustmouths took the bridge the year the Crown put paper on it, and the bridge was our toll, such as it was, and Kessler counted guns and counted theirs and said *the Sallow*." He pokes the stove. "Nine years. They went west and became what they became. Perpetua carried the children down the stair. I sat on this bench. Petrov cut the buggy." He looks at the wall. "We were a crew, once. Not a gang. There\'s a difference and it\'s the bridge."', effects: [{ learn: 'bw_dogs_left' }], options: [bye] },
    cache: {
      text: [{ if: { inParty: 'npc_rd_03' }, text: 'He looks at Wren, not at you. "Under me. Kessler had the key and the key went with Kessler, but I\'ve a bar." He gets up, which takes a while, and the bench comes up with the bar, and under it a locker. "Little Calloway. It\'s yours more than it\'s mine."' }, { text: '"Under me." He does not get up. "Kessler had the key. The key went with Kessler. Nobody\'s asked in nine years and I don\'t see why the tenth should be you."' }],
      options: [
        { id: 'cache.wren', text: '(Let Wren take it.)', if: { inParty: 'npc_rd_03' }, effects: [{ set: 'unlocked:md_bridgeward/bw_haunt_cache' }, { learn: 'bw_fenn_opens' }, { approval: { companion: 'npc_rd_03', by: 15 } }, { trust: { npc: 'npc_bw_09', by: 20 } }, { xp: 60 }], next: 'opened' },
        { id: 'cache.ask', text: 'Because the Dogs are coming back for the bridge, and the cache is for that.', if: { not: { inParty: 'npc_rd_03' } }, check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'bw_wall_wren' }, dc: -10, why: 'you have read the wall' }, { if: { flag: 'wren_exodus' }, dc: -15, why: 'the Dogs are in Shale on your word, and he has heard' }, { if: { knows: 'bw_dogs_left' }, dc: -5, why: 'he has told you why they left' }] }, next: 'ask_ok', fail: 'ask_no' },
        bye,
      ],
    },
    ask_ok: { text: 'He looks at the wall for a long time, at the chalk under the names. "Coming back." He gets up, which takes a while, and the bench comes up with a bar, and under it a locker. "Then it\'s for that. Tell them Fenn kept it. Tell them Fenn kept the bench."', effects: [{ set: 'unlocked:md_bridgeward/bw_haunt_cache' }, { learn: 'bw_fenn_opens' }, { trust: { npc: 'npc_bw_09', by: 15 } }, { xp: 60 }], options: [{ text: '(The locker.)', exit: true }] },
    ask_no: { text: '"Nine years." He sits more firmly, if that is possible. "The tenth isn\'t you."', options: [bye] },
    opened: { text: 'Wren kneels at it the way she knelt at the stranger\'s coat in the Sallow, and what she takes out first is not the gun or the coin but a strip of cloth with a dog\'s head on it, and she holds it for a long time and then ties it round her arm without saying anything, and Fenn turns to the stove so that neither of you has to look at him.', effects: [{ learn: 'bw_wren_mark' }], options: [{ text: '(The locker.)', exit: true }] },
    back: { text: '"Mine." He does not look at it. "Chalk. Every spring. Kessler said they\'d come back for the bridge when they were a crew again." He pokes the stove. "Perpetua said the same. She meant the children. Kessler meant the guns." A long pause. "If little Calloway ever comes back for the bridge, you tell her Fenn said the rope is what the bridge is for. The Rustmouths have one on the booth. Tell her that."', effects: [{ learn: 'bw_raid_talk' }, { lead: 'l_bw_haunt' }], options: [bye] },
  },
};

// ---------------------------------------------------------------- the Tenured's agent, the carter

export const d_bw_harrow: DialogueDef = {
  id: 'd_bw_harrow', owner: 'npc_bw_10',
  start: [{ if: { flag: 'harrow_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in a clean coat at the booth with a ledger that is not the Rustmouths\' and a pen that is not from down here. "Ms Harrow. I hold the pen on the Bridgeward arrangement for House Vane." She does not offer a hand; she offers the sentence. "The toll is the Crown\'s. The chain is theirs. The arrangement is mine, Tuesdays, ten to four. You are not a Rustmouth. You may be a question."',
      effects: [{ set: 'harrow_met' }, { learn: 'harrow_seen' }, { learn: 'bw_vane_toll' }],
      options: [
        { id: 'harrow.road', text: 'What does a Tenured house want with a bridge that stops?', next: 'road', once: true },
        { id: 'harrow.ledger', text: 'The Rustmouths keep more than the arrangement says.', if: { knows: 'bw_vane_toll' }, next: 'ledger', once: true },
        { id: 'harrow.show', text: '(Show her the toll box\'s ledger.)', if: { all: [{ item: 'k_bw_toll_ledger' }, { not: { flag: 'bw_harrow_ledger' } }] }, next: 'show' },
        { id: 'harrow.masque', text: 'Vane\'s Masque.', if: { knows: 'masque_heard' }, next: 'masque', once: true },
        bye,
      ],
    },
    again: { text: '"Tuesdays. Ten to four."', options: [{ id: 'harrow.road.again', text: 'What does Vane want with the bridge?', if: { not: { seen: 'harrow.road' } }, next: 'road' }, { id: 'harrow.ledger.again', text: 'The Rustmouths keep more than they should.', if: { all: [{ knows: 'bw_vane_toll' }, { not: { seen: 'harrow.ledger' } }] }, next: 'ledger' }, { id: 'harrow.show.again', text: '(Show her the toll box\'s ledger.)', if: { all: [{ item: 'k_bw_toll_ledger' }, { not: { flag: 'bw_harrow_ledger' } }] }, next: 'show' }, { id: 'harrow.masque.again', text: 'Vane\'s Masque.', if: { all: [{ knows: 'masque_heard' }, { not: { seen: 'harrow.masque' } }] }, next: 'masque' }, bye] },
    road: { text: '"The near end." She says it as a surveyor would. "The Docks are across the river and the Loop does not cross it. A road would. A road needs a bridge, a bridge needs a near end, and the near end needs to be held by somebody who signs. House Vane intends to sign, by the Long Night." She looks at the chain. "The Rustmouths are a temporary arrangement. Most things down here are."', effects: [{ learn: 'bw_vane_road' }, { lead: 'l_bw_tenured_road' }], options: [bye] },
    ledger: { text: '"Everyone keeps more than the arrangement says. That is what an arrangement is." A pause. "But the box keeps a ledger of its own, in a Rustmouth hand, and the box has a warden\'s stamp on it because the wardens wanted a count once, and the Rustmouths picked it before the wardens could read it. I would pay to read it. A hundred and twenty. It would be the end of the arrangement, which would be a pity for the Rustmouths and not for me."', effects: [{ learn: 'bw_ledger_wanted' }], options: [bye] },
    show: { text: 'She reads it standing, fast, and once, and closes it. "Thank you." A hundred and twenty, Crown-counted, in a paper sleeve. "The arrangement will be reviewed. You should not be on the bridge when it is." She puts the ledger in her coat; it is hers now, and so is whatever happens to the chain.', effects: [{ take: 'k_bw_toll_ledger' }, { give: 'tolls', count: 120 }, { set: 'bw_harrow_ledger' }, { rep: { faction: 'rustmouths', respect: -10 } }, { learn: 'tenured_favour' }, { xp: 60 }, { decision: { id: 'bw_harrow_ledger', text: 'You sold House Vane\'s agent the Rustmouths\' own toll ledger.' } }], options: [bye] },
    masque: { text: '"By invitation." She looks you over the way a tailor would. "You\'d need a chit, and a face the lens hasn\'t filed as something unfortunate, and clothes. The first can be bought; the second is your affair; the third is the Velvet\'s." It is the nearest thing to help she will give anyone.', effects: [{ learn: 'masque_harrow' }], options: [bye] },
  },
};

export const d_bw_sadie: DialogueDef = {
  id: 'd_bw_sadie', owner: 'npc_bw_11', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'A carter on a crate with her cart beside her and nothing in it. "Sadie. Five to stand on the bridge, five to stand under it, five to breathe, soon." She looks at the chain. "Carted for the Dogs once, when they had the garage. They paid late and they paid. The Rustmouths pay the Crown and the Crown pays nobody."', effects: [{ learn: 'sadie_seen' }], options: [{ id: 'sadie.dogs', text: 'The Dogs.', next: 'dogs', once: true }, bye] }, dogs: { text: '"A crew. Took a cut and fixed your axle. Then the Crown put paper on the bridge and the Rustmouths picked it up, and the Dogs went west and became a gang, which is what happens to a crew with no bridge." She shrugs. "Fenn\'s in the garage. Fenn\'ll tell it longer."', effects: [{ learn: 'bw_dogs_garage' }], options: [bye] } },
};

export const BRIDGEWARD_DIALOGUES: DialogueDef[] = [
  d_bw_loop, d_bw_west_sign, d_bw_toll_sign, d_bw_drop, d_bw_chop_sign, d_bw_tower_sign, d_bw_pale_sign, d_bw_chain,
  d_bw_dagmar, d_bw_corvo, d_bw_petrov, d_bw_jax, d_bw_nell, d_bw_hatch, d_bw_shrine, d_bw_verity, d_bw_immy, d_bw_tobin, d_bw_haunt_door, d_bw_haunt_wall, d_bw_fenn, d_bw_harrow, d_bw_sadie,
];
