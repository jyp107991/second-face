import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  ASH, ASH_REFUSED, CALLA_FREE, GUILD_IN_PLAY, HOME_OPEN, ILYA, IN, KES, LN, LOWE, LOWE_DEAD, MASON_EXILED, MASON_LIVES, NINE, ODILE, OPENFIELD,
  ORME, REYES, RIDE_BUGGY, RIDE_CARTS, RIDE_COLUMN, RIDE_FIRST, TAMSIN, WREN,
} from '../world/a3_conds';

/**
 * Toll Road Home (B6c, Act 3 beat 19): the rides home by the Long Night's side, and the people on the road. Each side's ride
 * is offered by post once the order is read (`world/a3_roads.ts`) and taken from a person the player can always find, whose
 * own tree carries one small hook that opens the ride's scene: Captain Lowe at his desk (or Sergeant Reyes at the gate if he
 * is dead) for the wardens' car (`d_a3_column`), Femi's window at Carrick for the guild's first class on the Concern's
 * through, with Factor Orme going home to her stand (`d_a3_first`), the seed-keeper at Openfield for the Choir's carts
 * with water for a dry Knock (`d_a3_carts`), and the player's own buggy at the Ring (`d_a3_buggy`). A truce has every
 * side's debt to call, by asking; `none` has no side's ride. Each ride ends at Knock's stand, or lets the player down in
 * Shale to walk the last of it. Nothing waits on a date: every ride goes when the player is in it.
 *
 * The road's people (`re_a3_*`, `world/a3_roads.ts`): the Wheel, who carry their own home (`d_re_a3_wheel`); Openfield's
 * walkers after its night (`d_re_a3_refugees`); the guild's riders, for those who stood against the guild
 * (`d_re_a3_riders`); a Hollow trader with Signal Hill's news (`d_re_a3_trader`). Own travel (the Line, a caravan, on foot)
 * reaches Knock by the world map, and world event `a3_home` sees the player home.
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (19) and "As built" → B6c.
 */

const F = (flag: string, eq?: string | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TOLLS = (n: number): Cond => ({ item: 'tolls', count: n });
/** A topic not yet asked, from either of a hub's option sets (`id`, `id.h`). */
const NOT_ASKED = (id: string): Cond => NOT(ANY({ seen: id }, { seen: `${id}.h` }));
const leave: OptionDef = { text: '(Leave it.)', exit: true };

// ---------------------------------------------------------------- arriving

export type Route = 'column' | 'first' | 'carts' | 'wheel' | 'buggy' | 'foot';
/** Boarded: the ride is under way (a scene reopened before it arrives picks up at the Sallow). */
const BOARD = (how: Route): Effect => ({ set: 'a3_ride', value: how });
const ON_THE_WAY = (how: Route): Cond => ALL(F('a3_ride', how), NOT(F('a3_route_home')));
/** Down at Knock's stand: home. Sets the way home, and that the player is there; the map moves last. */
export const ARRIVE_KNOCK = (how: Route, text: string, extra: Effect[] = []): Effect[] => [
  { set: 'a3_route_home', value: how }, { set: 'a3_in_sallow' }, { set: 'a3_at_knock' }, { learn: 'loc_cistern9' }, { xp: 100 },
  { decision: { id: 'a3_route_home', text } }, ...extra,
  { event: 'goto', data: { location: 'c9_mouth', spawn: 'road' } },
];
/** Down in Shale's street instead, to walk the last of it (Knock's own arrival, world event `a3_home`, sees them home). */
export const DOWN_AT_SHALE = (how: Route, text: string): Effect[] => [
  { set: 'a3_route_home', value: how }, { set: 'a3_in_sallow' }, { learn: 'loc_shale' }, { xp: 60 },
  { decision: { id: 'a3_route_home', text } },
  { event: 'goto', data: { location: 'shale', spawn: 'from_tollhouse' } },
];
const OPEN = (tree: string, name: string): Effect => ({ event: 'dialogue', data: { tree, name } });

// ---------------------------------------------------------------- the wardens' car (the city's side)

/** Lowe's car, or his sergeant's if he is dead. */
const LOWE_LIVES: Cond = NOT(LOWE_DEAD);
const LINNET_DRIVES: Cond = F('kn_linnet_will_run');

/** The hook in Lowe's own tree (`d_md_lowe`, meridian.ts): one start entry and one node, while the road home is open. */
export const LOWE_CAR_START = { if: ALL(HOME_OPEN, RIDE_COLUMN, LOWE_LIVES), node: 'a3_car' };
export const LOWE_CAR_NODES: Record<string, NodeDef> = {
  a3_car: {
    text: [
      { if: LN('ledger'), text: '"Designate." He is on his feet before you are through the door. "The car for Reserve 9 is in the gate road. It goes when you are in it. Those are my orders, and I would rather carry you than meet you." He does not say anything about Openfield. He does not need to; it is on the wall behind him, in the Precinct\'s own hand, entered as assistance.' },
      { if: LN('truce'), text: '"Designate." He stands. "You stood between the city and the guild at Openfield, and the Precinct has entered that it owes you, which it does not like doing. I have a car going to Reserve 9, and orders to carry the attendance in it if the attendance asks." He waits. "Ask, if you want it. I will not make you."' },
      { text: '"Designate. Warden." He stands, as the charter says, and seems unsure which of the two to salute. "The car for Reserve 9 is in the gate road. A warden may ride in it, and the designate must. You are both." He waits.' },
    ],
    again: '"The car is in the gate road," Lowe says. "It goes when you are in it."',
    options: [
      { id: 'lowe.a3.car', text: [{ if: LN('truce'), text: 'I\'m asking, Captain. Carry me home.' }, { text: 'Take me home, Captain.' }], effects: [OPEN('d_a3_column', 'Captain Idris Lowe')], exit: true },
      { id: 'lowe.a3.else', text: 'Something else.', next: 'again' },
      { id: 'lowe.a3.later', text: 'Not today.', exit: true },
    ],
  },
};
/** The same hook in Reyes's tree (`d_md_reyes`) when Lowe is dead and the column is hers. */
export const REYES_CAR_START = { if: ALL(HOME_OPEN, RIDE_COLUMN, LOWE_DEAD, NOT({ dead: REYES })), node: 'a3_car' };
export const REYES_CAR_NODES: Record<string, NodeDef> = {
  a3_car: {
    text: '"Designate." Sergeant Reyes is in a captain\'s coat that is still being taken in at the shoulders, at the gate where she has always stood. "Captain Lowe\'s car for Reserve 9 is in the gate road. Mine, now. It goes when you\'re in it." She looks at the line, not at you. "He\'d have said he\'d rather carry you than meet you. I\'d rather that too."',
    again: '"The car\'s in the gate road. It goes when you\'re in it."',
    options: [
      { id: 'reyes.a3.car', text: 'Take me home, Sergeant.', effects: [OPEN('d_a3_column', 'Sergeant Paloma Reyes')], exit: true },
      { id: 'reyes.a3.else', text: 'Something else.', next: 'intro' },
      { id: 'reyes.a3.later', text: 'Not today.', exit: true },
    ],
  },
};

const COLUMN_TOPICS: OptionDef[] = [
  { id: 'col.why', text: 'Why carry me at all? You could have waited for me at the door.', if: ALL(LOWE_LIVES, NOT_ASKED('col.why')), next: 'why' },
  { id: 'col.grieve', text: 'You don\'t like this one.', if: ALL(LOWE_LIVES, NOT_ASKED('col.grieve')), next: 'grieve' },
  { id: 'col.door', text: 'What happens when I\'m standing at the door?', if: ALL(LOWE_LIVES, NOT_ASKED('col.door')), next: 'door' },
  { id: 'col.names', text: 'Who are the benches for, Captain? Say it.', if: ALL(LOWE_LIVES, NOT_ASKED('col.names')), next: 'names' },
  { id: 'col.reyes', text: 'What would Lowe have done with this order?', if: ALL(LOWE_DEAD, NOT_ASKED('col.reyes')), next: 'reyes' },
  { id: 'col.sleep', text: '(Sleep on the bench until the car stops.)', effects: [{ until: 19 }], next: 'night' },
];
const BACK_ROAD: OptionDef = { text: '(Let the road go by.)', next: 'road' };

export const d_a3_column: DialogueDef = {
  id: 'd_a3_column', owner: LOWE,
  start: [{ if: ON_THE_WAY('column'), node: 'sallow' }, { if: HOME_OPEN, node: 'car' }, { node: 'done' }],
  nodes: {
    car: {
      speaker: 'narrator',
      text: [
        { if: LOWE_DEAD, text: 'The car for Reserve 9 stands in the gate road with its engine ticking: a long grey Precinct lorry, a canvas roof on hoops, and down both sides of its bed, bolted to the floor, benches. Sixty places, each with a number in white paint, and on the tailboard a stencil: RESERVE 9 — PRECINCT SUPPLY — CAPACITY 60. Sergeant Reyes stands beside it with her cap under her arm, because Lowe always did. "Seven o\'clock," she says. "It goes when you\'re in it."' },
        { text: 'The car for Reserve 9 stands in the gate road with its engine ticking: a long grey Precinct lorry, a canvas roof on hoops, and down both sides of its bed, bolted to the floor, benches. Sixty places, each with a number in white paint, and on the tailboard a stencil: RESERVE 9 — PRECINCT SUPPLY — CAPACITY 60. Captain Lowe stands beside it with his cap under his arm, because the charter says a captain uncovers for a magistrate, designate or not. "Seven o\'clock," he says. "It goes when you are in it. That is the order."' },
      ],
      again: 'The car for Reserve 9 in the gate road, its benches numbered in white. CAPACITY 60.',
      interject: [
        { companion: TAMSIN, text: 'Tamsin has stopped at the tailboard. She counts the benches with her eyes, one side and then the other, and gets to sixty both times. "They built it," she says. "They built it before anybody asked us." She climbs up anyway, because you are going to.' },
        { companion: NINE, text: 'Nine reads the stencil. "Capacity sixty," it says. "The schedule did not provide for the designate." It considers the benches. "I will sit on the wheel arch. It is not a numbered place."' },
        { companion: ODILE, text: '"Sixty places and not one cushion," Odile says. "The city costs everything, my dear. It simply never prices comfort."' },
        { companion: WREN, text: 'Wren runs her burned hand along the bolts on bench one. "Block-sheet car," she says. "We had one at the overpass. Took the benches out and kept goats in it." She does not smile.' },
        { companion: ASH, text: '"I can walk," Ash says. Then, because you are already climbing: "No. I\'ll ride. I want to see what they built."' },
        { companion: KES, text: 'Kes sits on bench sixty, the last one, at the open end, with the road behind her. "If I\'m going to be carried," she says, "I\'m going to see where from."' },
        { companion: ILYA, text: 'Ilya counts the benches, as he counts everything. "Sixty," he says. He sits on the floor. "Right."' },
      ],
      options: [
        { id: 'col.board', text: '(Climb up into the back.)', effects: [{ until: 7 }, BOARD('column'), { time: 300 }], next: 'road' },
        { id: 'col.later', text: 'Not yet.', exit: true },
      ],
    },
    road: {
      speaker: 'narrator',
      text: [
        { if: ALL(LOWE_LIVES, LINNET_DRIVES), text: 'Out of the gate at seven, east on the toll road under a white sky, the Wall going down behind you into its own haze. Ninebridge\'s spans by noon; the guild\'s toll-warden lifts the bar for the city\'s car without a word or a coin. Lowe rides in the back, on bench one, with his knees together and his cap on them, facing you. In the cab, at the wheel, in a cadet\'s grey with the collar too big for her, is Linnet. She has not turned round once since the gate.' },
        { if: LOWE_LIVES, text: 'Out of the gate at seven, east on the toll road under a white sky, the Wall going down behind you into its own haze. Ninebridge\'s spans by noon; the guild\'s toll-warden lifts the bar for the city\'s car without a word or a coin. Lowe rides in the back, on bench one, with his knees together and his cap on them, facing you, because the front of the car is for the driver and the charter has a rule about that too.' },
        { if: LINNET_DRIVES, text: 'Out of the gate at seven, east on the toll road under a white sky. Ninebridge\'s spans by noon; the guild\'s toll-warden lifts the bar for the city\'s car. Reyes rides on bench one with Lowe\'s cap on her knees. In the cab, at the wheel, in a cadet\'s grey with the collar too big for her, is Linnet. She has not turned round once since the gate.' },
        { text: 'Out of the gate at seven, east on the toll road under a white sky. Ninebridge\'s spans by noon; the guild\'s toll-warden lifts the bar for the city\'s car. Reyes rides on bench one with Lowe\'s cap on her knees, and reads the order again, and again, the way he used to.' },
      ],
      again: 'The toll road going by under the canvas.',
      interject: [
        { companion: TAMSIN, text: 'Tamsin will not sit on a bench. She sits on the bed of the car between the rows with her back against the cab and her knees up, and every time the car goes over a pothole she looks at the numbers. When Lowe offers her his coat against the wind she says, "I\'m not cold," and she is.', effects: [A(TAMSIN, -5)] },
        { companion: NINE, text: 'Nine has its ledger open on its knee on the wheel arch. "I am noting the condition of the toll road," it says. "Nobody has asked me to. It is a habit of the record, to note the way to a thing."' },
      ],
      options: COLUMN_TOPICS,
    },
    why: {
      text: '"The order executes on the designate\'s attendance." He says it the way he says the time. "I could wait at the door for you. Then you come up the track to a column, and Knock watches you walk through it. Or you come in the city\'s car, and Knock watches you get down from it." He turns his cap round once on his knees. "My orders are to carry the attendance with the car. I would rather you came with me than came to me. I cannot tell you why that is better. I think it is."',
      again: '"I would rather you came with me than came to me."',
      effects: [{ trust: { npc: LOWE, by: 3 } }],
      options: [BACK_ROAD],
    },
    grieve: {
      text: '"I grieve every one." Plainly, the way other men say they take sugar. "Thirty-one evictions in eleven years. I checked every one, and every one was lawful. The schedule holds." He looks at the white numbers on the benches opposite. "I wish it didn\'t, here. That is not a thing a captain says. I have said it to you, and I will say it to the assessor if it asks me."',
      again: '"The schedule holds. I wish it didn\'t, here."',
      effects: [{ trust: { npc: LOWE, by: 5 } }, { memory: { npc: LOWE, tag: 'a3_grief_told', valence: 5, strength: 70 } }],
      interject: [{ companion: NINE, text: '"I will not ask," Nine says, without looking up from the ledger. "I will note that it was said." Lowe nods, as if that were a kindness, and perhaps it is.' }],
      options: [BACK_ROAD],
    },
    door: {
      text: '"Nothing, until you are standing at it. Then the order says I move them." He has read it more often than you have. "It does not say what I do if the designate tells me not to. I have read it forty times looking for that line. It is not there." He looks at you for a long moment. "I would like to know which you will say before we get there. I will not ask you to tell me."',
      again: '"The order has no line for that. I have looked."',
      effects: [{ learn: 'a3_lowe_clause' }],
      interject: [{ companion: TAMSIN, text: 'On the floor of the car, Tamsin has gone very still, the way people go still when they are listening to the one thing in the room that matters.' }],
      options: [BACK_ROAD],
    },
    names: {
      text: '"Sixty people." He does not look away from you. "The order has their names on a sheet in my coat, and their ages. I have learned them. If I carry people I will know who I am carrying." He says them, not all, a few, the way you say the names on a memorial: "Ines Halloran, Elder. Pell, the doctor. Bram, who keeps the plant. Teague. Ola Fairley. Wes Benn. Effie Calder." He stops. "I will not say the rest in front of you. You know them better than the sheet does."',
      again: '"Sixty names, on a sheet in my coat."',
      effects: [{ trust: { npc: LOWE, by: 3 } }],
      interject: [
        { companion: TAMSIN, text: '"Wes snores," Tamsin says from the floor, to nobody. "Effie\'s scared of the dark. She\'s nineteen and she\'d kill me for telling you." Then nothing, for an hour.', effects: [A(TAMSIN, 3)] },
        { companion: ASH, text: '"You learned them," Ash says. "So it would hurt." Lowe says, "Yes," and that is the end of it.' },
      ],
      options: [BACK_ROAD],
    },
    reyes: {
      speaker: REYES,
      text: '"He\'d have read the order forty times looking for a line that isn\'t there." She looks at the benches. "I\'ve read it forty-one. It says the designate attends and the column moves. It doesn\'t say what the column does if the designate says no." She folds it. "He\'d have wanted to know which you\'ll say. So do I. I won\'t ask."',
      again: '"It doesn\'t say what the column does if you say no."',
      effects: [{ learn: 'a3_lowe_clause' }],
      options: [BACK_ROAD],
    },
    night: {
      speaker: 'narrator',
      text: [
        { if: LOWE_LIVES, text: 'Tollhouse 9 at dusk. The guild\'s gate opens for the city\'s car without anyone asking it to, and the car stands in the yard under the tower with its canvas rolled up and the wardens\' tents pitched beside it. Lowe sits on the tailboard with a tin cup of tea, looking at the road down into the Sallow. When you sit beside him he says, without turning: "When you\'re at the door. What will you say?"' },
        { text: 'Tollhouse 9 at dusk. The guild\'s gate opens for the city\'s car without anyone asking it to, and the car stands in the yard under the tower with the wardens\' tents pitched beside it. Reyes sits on the tailboard with Lowe\'s cap beside her and does not ask you anything.' },
      ],
      again: 'The yard at Tollhouse 9, the car under the tower, the road down into the Sallow.',
      options: [
        { id: 'col.ask.down', text: 'Stand down, Captain. That\'s what I\'ll say.', if: LOWE_LIVES, effects: [{ set: 'a3_lowe_asked', value: 'down' }, { trust: { npc: LOWE, by: 5 } }], next: 'ask_down' },
        { id: 'col.ask.unsure', text: 'I don\'t know yet. That\'s the truth.', if: LOWE_LIVES, effects: [{ set: 'a3_lowe_asked', value: 'unsure' }, { trust: { npc: LOWE, by: 5 } }], next: 'ask_unsure' },
        { id: 'col.ask.on', text: 'Carry on, Captain. It\'s the order.', if: LOWE_LIVES, effects: [{ set: 'a3_lowe_asked', value: 'on' }], next: 'ask_on' },
        { id: 'col.ask.none', text: '(Say nothing. Drink the tea.)', if: LOWE_LIVES, effects: [{ set: 'a3_lowe_asked', value: 'none' }], next: 'ask_none' },
        { id: 'col.tamsin', text: '(Go and sit with Tamsin by the wheel.)', if: ALL(IN(TAMSIN), NOT_ASKED('col.tamsin')), next: 'tamsin' },
        { id: 'col.sleep2', text: '(Sleep.)', if: LOWE_DEAD, effects: [{ until: 6 }], next: 'sallow' },
      ],
    },
    ask_down: {
      text: 'He nods slowly, and drinks his tea, and does not say whether he will. "Then I will hear it at the door," he says. "From you. In front of them." He sets the cup down on the tailboard. "That is how it should be heard. Thank you for not making me guess."',
      again: '"I will hear it at the door."',
      options: [{ id: 'col.sleep.down', text: '(Sleep.)', effects: [{ until: 6 }], next: 'sallow' }],
    },
    ask_unsure: {
      text: '"No," he says. "Nor do I." It is the first thing you have heard him say that was not in a clause. He gives you the cup to hold while he finds his tobacco, and does not take it back.',
      again: '"Nor do I."',
      options: [{ id: 'col.sleep.unsure', text: '(Sleep.)', effects: [{ until: 6 }], next: 'sallow' }],
    },
    ask_on: {
      text: '"Lawful," he says, and looks at the road, and does not look pleased. "I had thought you might say something else." He drinks his tea to the bottom. "I will carry it out as written. I always have."',
      again: '"Lawful."',
      interject: [{ companion: TAMSIN, text: 'Tamsin, at the wheel, has heard. She gets up and walks out of the lamplight to the gate, and stands there with her back to the yard for a long time.', effects: [A(TAMSIN, -10)] }],
      options: [{ id: 'col.sleep.on', text: '(Sleep.)', effects: [{ until: 6 }], next: 'sallow' }],
    },
    ask_none: {
      text: 'You drink the tea. He lets you. After a while he says, to the road, "That is an answer too," and goes to his tent.',
      again: '"That is an answer too."',
      options: [{ id: 'col.sleep.none', text: '(Sleep.)', effects: [{ until: 6 }], next: 'sallow' }],
    },
    tamsin: {
      speaker: TAMSIN,
      text: 'She is sitting with her back against the car\'s back wheel, out of the lamp, with her arms round her knees. "I keep thinking they\'ll all have to sit facing each other," she says. "Thirty a side. Ines across from Teague. Two days of it." She laughs, not well. "I\'d have got off and walked. They won\'t be allowed to walk." She leans, very slightly, until her shoulder is against yours. "Don\'t say anything clever. Just sit."',
      again: 'Tamsin against the wheel, her shoulder against yours.',
      effects: [A(TAMSIN, 5)],
      options: [{ id: 'col.tamsin.sit', text: '(Sit with her until she sleeps.)', next: 'night' }],
    },
    sallow: {
      speaker: 'narrator',
      text: 'Down out of the Tollhouse\'s pass at first light into the Sallow: the salt pans white to the edge of the world, and the road running straight across them as if somebody had ruled it. Shale by noon. The car slows through its street, and people come to their doors to look at the city\'s car with RESERVE 9 on its tailboard, and at you, on bench thirty-one, looking back.',
      again: 'Shale\'s street, people at their doors, the car slowing.',
      effects: [{ set: 'a3_in_sallow' }, { time: 300 }],
      interject: [
        { companion: ILYA, text: 'Ilya watches Shale go by under the canvas: the saloon, the pumps, the sheriff\'s office. "They\'ll talk," he says. "About this. For years." He looks at the stencil. "Right."' },
        { companion: WREN, text: '"Shale\'s seen us," Wren says. "By tonight the whole Sallow knows the designate rode in the city\'s car." She shrugs. "You want it known, or you don\'t."' },
      ],
      options: [
        { id: 'col.knock', text: '(Ride on up the track to Knock.)', next: 'knock' },
        { id: 'col.shale', text: '(Get down in Shale. Walk the last of it.)', effects: DOWN_AT_SHALE('column', 'I rode home in the city\'s car for Reserve 9, as far as Shale, and walked the last of it to Knock on my own feet.'), exit: true },
      ],
    },
    knock: {
      speaker: 'narrator',
      text: [
        { if: LOWE_LIVES, text: 'Up the track from Shale, and Knock: the windpump not turning, the stand with its awning, and on the toll road beside it the column\'s camp, tents in a row and four wardens straightening as the car comes in. The car stops at the stand. Lowe gets down first and puts his cap on. Knock comes to its doors and watches you climb down from the city\'s relocation car: faces you have known all your life, every one of them looking at the stencil on the tailboard, and then at you.' },
        { text: 'Up the track from Shale, and Knock: the windpump not turning, the stand with its awning, and on the toll road beside it the column\'s camp, tents in a row and four wardens straightening as the car comes in. Reyes gets down first. Knock comes to its doors and watches you climb down from the city\'s relocation car: faces you have known all your life, every one of them looking at the stencil on the tailboard, and then at you.' },
      ],
      again: 'Knock\'s stand, the column\'s camp, the car.',
      effects: [{ time: 120 }],
      interject: [
        { companion: TAMSIN, text: 'Tamsin gets down last. "Everybody in Knock just watched me get out of that," she says. "Remember it, when you\'re at the door."' },
        { companion: NINE, text: '"Delivered," Nine says, climbing down off the wheel arch. "The attendance has attended." It looks at the Cistern\'s door across the apron. "Not yet the door. The record is careful about the difference."' },
      ],
      options: [{ id: 'col.down', text: '(Get down.)', effects: ARRIVE_KNOCK('column', 'I came home to Knock in the city\'s car for Reserve 9, with the column, and Knock watched me get down from it.'), exit: true }],
    },
    done: {
      speaker: 'narrator',
      text: 'The car for Reserve 9, its benches empty and numbered in white. CAPACITY 60.',
      again: 'The car, its benches empty.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the guild's first class (the guild's side)

/** The hook on Femi's window at Carrick (`d_dk_line`, md_docks.ts): the guild's letter shown for the through. */
export const FIRST_CLASS_OPTION: OptionDef = {
  id: 'dk.line.a3first', text: '(Show Femi the guild\'s letter: a seat on the through.)', if: ALL(HOME_OPEN, RIDE_FIRST),
  effects: [OPEN('d_a3_first', 'Factor Ismay Orme')], exit: true,
};

const FIRST_TOPICS: OptionDef[] = [
  { id: 'first.why', text: 'Why is the guild carrying me?', if: NOT_ASKED('first.why'), next: 'why' },
  { id: 'first.sealed', text: 'What\'s in the sealed cars?', if: NOT_ASKED('first.sealed'), next: 'sealed' },
  { id: 'first.folder', text: 'What\'s in the folder on your knee?', if: NOT_ASKED('first.folder'), next: 'folder' },
  { id: 'first.linnet', text: 'You took Linnet\'s side at the stand, once.', if: ALL(F('kn_linnet_choice', 'factor'), NOT_ASKED('first.linnet')), next: 'linnet' },
  { id: 'first.sleep', text: '(Sleep, while the through runs east.)', effects: [{ time: 1440 }], next: 'fourways' },
];
const BACK_COACH: OptionDef = { text: '(Watch the dark go by.)', next: 'coach' };

export const d_a3_first: DialogueDef = {
  id: 'd_a3_first', owner: ORME,
  start: [{ if: ON_THE_WAY('first'), node: 'sallow' }, { if: HOME_OPEN, node: 'shed' }, { node: 'done' }],
  nodes: {
    shed: {
      speaker: 'narrator',
      text: 'Femi reads the guild\'s letter through the grille, and the stamp on it, and points down the shed without a word. At two in the morning the through comes in at the throat under its own smoke: nineteen cars sealed, the Concern\'s closed eye on every door, and behind the engine a twentieth that is not sealed. A pre-war coach re-skinned in plate, with curtains in its slots and a lamp lit inside. On its step, with a leather folder under her arm, Factor Ismay Orme of Knock\'s stand. "Designate," she says. "The guild\'s compliments. We go east at four."',
      again: 'The guild\'s car behind the through\'s engine, its lamp lit, Orme on the step.',
      interject: [
        { companion: KES, text: 'Kes looks along the sealed cars and the closed eye on every door, and her hand goes to the back of her neck. "Concern freight," she says. "I can feel the handshake on the signals from here. They\'re talking to the Line." She gets on anyway.' },
        { companion: ODILE, text: '"First class," Odile says, and something in her face goes soft and unwise for a moment. "I used to ride in that coach. Grand Factor\'s guest. They kept a jar of sugared almonds by the third seat." She steps up past Orme with a nod. "Let\'s see if they still do."' },
      ],
      options: [
        { id: 'first.board', text: '(Step up into the guild\'s car.)', effects: [{ until: 4 }, BOARD('first')], next: 'coach' },
        { id: 'first.later', text: 'Not tonight.', exit: true },
      ],
    },
    coach: {
      speaker: 'narrator',
      text: 'The through runs east in the dark at the speed of a fast horse, never stopping: the halts go by as lamps on a platform and a pilot\'s red flag, waved once. Inside the guild\'s car: brass lamps, seats in cracked green leather, a steward with tea in cups that match. Orme sits across from you with the folder on her knee, unopened, and her ledger beside it, and reads the ledger.',
      again: 'The guild\'s car, the brass lamps, the dark going by. Orme across from you.',
      interject: [
        { companion: WREN, text: 'Wren will not sit on the leather. She stands at the end of the car with her shoulder to the door and her eyes on the dark. "Last time I rode a guild train," she says, "I was in a sealed car. Not this end."' },
        { companion: TAMSIN, text: 'Tamsin has eaten every biscuit on the steward\'s plate and is looking for the next plate. "If the guild\'s buying," she says with her mouth full, "the guild\'s buying."' },
      ],
      options: FIRST_TOPICS,
    },
    why: {
      text: [
        { if: LN('guild'), text: '"Because the guild bid for the city\'s core in the open, at Openfield, and the city answered by bringing you forward nineteen years." She turns a page. "The Grand Factor would like it entered somewhere that the guild brought the designate home in comfort. I would like to get home to my stand. Our interests coincide for about three hundred kilometres."' },
        { if: LN('truce'), text: '"Because you stood between us and the city at Openfield, and the guild owes you." She turns a page. "The guild pays its debts. It is the only thing it is sentimental about. And I was going home to my stand anyway."' },
        { text: '"A hand rides first class on guild business." She looks at you over the ledger. "Going home to the stand where you were born, to stand at a door the guild has an interest in, is guild business. I would have thought you knew that."' },
      ],
      again: '"Our interests coincide for about three hundred kilometres."',
      options: [BACK_COACH],
    },
    sealed: {
      text: '"Nobody weighs it." She says it the way Femi says it. "Halcyon\'s freight, out of the Bond and home again. The guild carries it and does not look. That is what we are paid for, and we are paid very well." She looks at the curtain over the slot, as if the cars behind might be listening. "I have been a factor for nineteen years and I have never once asked. I am beginning to think that was the job."',
      again: '"Nobody weighs it."',
      interject: [{ companion: KES, text: '"I know what\'s in them," Kes says, quietly. "Not this load. The kind." Orme looks at her for a long moment and does not ask, which is also the job.', effects: [A(KES, 2)] }],
      options: [BACK_COACH],
    },
    folder: {
      text: [
        { if: GUILD_IN_PLAY, text: '"Guild business at the stand." She puts a hand flat on the folder, not quickly. "You will see it at Knock, if the guild still has business there when we arrive. I hope it does not. I have been wrong before about what the guild needs." She goes back to the ledger. "I would rather you heard what it is from me than from the paper."' },
        { text: '"The stand\'s book." She opens it an inch: columns of caravans in, caravans out, water bought, water sold. "I have been away from it for a month and Dace has been keeping it, which means nobody has." She closes it. "Knock is dry. The stand has not sold a cup in weeks. It is the first time in my life the book has had nothing in it."' },
      ],
      again: 'Orme\'s hand on the folder.',
      effects: [{ learn: 'a3_first_folder' }],
      options: [BACK_COACH],
    },
    linnet: {
      text: '"Varro." She remembers the name before the girl. "He was buying her grandmother\'s water at a third of the rate, at my stand." She shrugs, slightly. "Men who do that don\'t trade at my stand. I would do it again. I would like it noted that it cost the guild nothing." A pause. "It cost me Varro\'s custom, which was no loss to anyone."',
      again: '"Men who do that don\'t trade at my stand."',
      effects: [{ trust: { npc: ORME, by: 5 } }],
      options: [BACK_COACH],
    },
    fourways: {
      speaker: 'narrator',
      text: 'Four Ways at the next dawn, where the toll road leaves the Line for the Sallow. The guild\'s car is uncoupled in a siding with a clank you feel in your teeth, and the through goes on east without it toward the mountains. On the road out of the junction the guild\'s own coach is waiting: a long-nosed pre-war bus with its windows plated to the height of a seated man and two riders on its roof. At Tollhouse 9 the gate is up before the coach reaches it, and the guild\'s wardens on the wall touch their hats.',
      again: 'The guild\'s coach on the toll road, Tollhouse 9\'s gate up for it.',
      effects: [{ time: 480 }],
      interject: [
        { companion: WREN, text: 'Wren watches the riders on the wall at Tollhouse 9 touch their hats to the coach. "They used to shoot at me from up there," she says. "Same men, some of them." She looks at you. "This is what it\'s like on your side. I\'d forgotten."', effects: [A(WREN, -3)] },
        { companion: NINE, text: '"The toll has been waived," Nine says, reading the gate\'s board as it goes by. "There is no clause for it. The guild has decided it does not need one."' },
      ],
      options: [{ id: 'first.road', text: '(On down into the Sallow.)', next: 'sallow' }],
    },
    sallow: {
      speaker: 'narrator',
      text: 'Down out of the Tollhouse\'s pass into the Sallow, the salt white to the edge of the world. Shale by evening, the guild\'s coach drawing a crowd at Pike\'s counter that it does not stop for. Orme closes her ledger. "Knock," she says, "is two hours up the track by coach, and a day on foot. The coach will take you to the stand, or you can get down here." She looks out at Shale. "Some people like to walk home."',
      again: 'Shale at evening, the coach idling at Pike\'s counter.',
      effects: [{ set: 'a3_in_sallow' }, { time: 300 }],
      options: [
        { id: 'first.knock', text: '(Ride on up the track to Knock.)', next: 'knock' },
        { id: 'first.shale', text: '(Get down in Shale. Walk the last of it.)', effects: DOWN_AT_SHALE('first', 'I rode home first class in the guild\'s car on the Concern\'s through, and the guild\'s coach down its own road as far as Shale, and walked the last of it to Knock.'), exit: true },
      ],
    },
    knock: {
      speaker: 'narrator',
      text: 'Up the track and into Knock in the guild\'s coach, under its plated windows: the windpump still, the column\'s tents on the toll road, the wardens turning to look at the guild\'s riders on the roof. Orme gets down at her own stand and puts the folder on the counter under her hand, as if it had never been anywhere else. "Home," she says, to nobody in particular, and opens the book.',
      again: 'Orme at her counter, the folder under her hand.',
      effects: [{ time: 150 }],
      interject: [{ companion: TAMSIN, text: '"Everyone\'s looking at the coach," Tamsin says. "Nobody\'s looking at us. Is that better or worse?" She does not wait for you to decide.' }],
      options: [{ id: 'first.down', text: '(Get down.)', effects: ARRIVE_KNOCK('first', 'I came home to Knock first class, in the guild\'s car on the Concern\'s through and the guild\'s coach down its own road, with Factor Orme going home to her stand.'), exit: true }],
    },
    done: {
      speaker: 'narrator',
      text: 'The guild\'s car, uncoupled in a siding, its lamp out.',
      again: 'The guild\'s car, its lamp out.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Openfield's carts (the Choir's side)

/** Who walks at the head of the carts: the Elder, if he is home; Calla, if she is free; otherwise the seed-keeper. */
const MASON_WALKS: Cond = ALL(MASON_LIVES, NOT(MASON_EXILED));
/** The hook in the seed-keeper's tree (`d_of_doria`, openfield.ts). */
export const DORIA_CARTS_START = { if: ALL(HOME_OPEN, RIDE_CARTS), node: 'a3_carts' };
export const DORIA_CARTS_NODES: Record<string, NodeDef> = {
  a3_carts: {
    text: [
      { if: OPENFIELD('burned'), text: 'Doria has her tally board and a line of carts behind her, two of them, and the boards of one still black from the fire. "Counted at dawn: four barrels of water, three sacks of seed, two carts that will roll." She looks at them as if they were a great deal. "Knock\'s dry since its hatch shut. We heard. We have less than we had, and more than Knock has. They go at first light, any morning you\'ll walk with them."' },
      { text: 'Doria has her tally board and a line of carts in the yard behind her. "Counted at dawn: eleven barrels of water, nine sacks of seed, six carts." She taps the board. "Knock\'s dry since its hatch shut. We heard. The Choir is taking it water, and nobody is writing it down. They go at first light, any morning you\'ll walk with them."' },
    ],
    again: '"The carts go at first light," Doria says. "Any morning you\'ll walk with them."',
    options: [
      { id: 'doria.a3.carts', text: 'I\'ll walk with them. Let\'s go home.', effects: [OPEN('d_a3_carts', 'Openfield\'s carts')], exit: true },
      { id: 'doria.a3.else', text: 'Something else.', if: F('of_seed_outcome'), next: 'after' },
      { id: 'doria.a3.else2', text: 'Something else.', if: NOT(F('of_seed_outcome')), next: 'again' },
      { id: 'doria.a3.later', text: 'Not this morning.', exit: true },
    ],
  },
};

export const d_a3_carts: DialogueDef = {
  id: 'd_a3_carts', owner: 'narrator',
  start: [{ if: ON_THE_WAY('carts'), node: 'sallow' }, { if: HOME_OPEN, node: 'yard' }, { node: 'done' }],
  nodes: {
    yard: {
      text: [
        { if: MASON_WALKS, text: 'Openfield\'s yard at first light: the carts loaded, water barrels roped down under wet sacking to keep them cool, seed in tarred bags, and the Choir\'s people in their faded blues and reds gathering to walk beside them. Elder Mason stands at the head of the first cart with his staff and his face turned up to a sky that has not decided what colour it is yet. "We go by the old south bed," he says, "where the guild has no gates. Four days, at an ox\'s pace. The sky is the same the whole way."' },
        { if: CALLA_FREE, text: 'Openfield\'s yard at first light: the carts loaded, water barrels roped down under wet sacking, seed in tarred bags, and the Choir\'s people gathering to walk beside them. Sister Calla is at the head of the first cart with the medicine chest strapped to its tailboard, thinner than she was before the city had her, and walking anyway. "By the old south bed," she says. "No gates, no tolls, no lens. Four days."' },
        { text: 'Openfield\'s yard at first light: the carts loaded, water barrels roped down under wet sacking, seed in tarred bags, and the Choir\'s people gathering to walk beside them. Doria walks at the head of the first cart with her tally board, counting the people as they fall in. "By the old south bed," she says. "No gates, no tolls. Four days."' },
      ],
      again: 'The carts in the yard, the Choir falling in beside them.',
      interject: [
        { companion: ASH, if: ASH_REFUSED, text: 'Ash goes down the line of carts touching each wheel, the way the Choir bless a thing without saying so. "My brothers will hear we walked," he says. "Let them."', effects: [A(ASH, 5)] },
        { companion: ASH, text: 'Ash goes down the line of carts touching each wheel, the way the Choir bless a thing without saying so. "Water for a door," he says. "That I can walk beside."', effects: [A(ASH, 3)] },
        { companion: TAMSIN, text: '"They\'re taking Knock water," Tamsin says. "Openfield. For nothing." She looks at the barrels as if they were made of something she does not have a word for. "Nobody\'s ever given Knock anything for nothing. Not once."', effects: [A(TAMSIN, 3)] },
      ],
      options: [
        { id: 'carts.walk', text: '(Walk with the carts.)', effects: [{ until: 6 }, BOARD('carts'), { time: 3600 }], next: 'bed' },
        { id: 'carts.later', text: 'Not this morning.', exit: true },
      ],
    },
    bed: {
      text: 'East off the Flats and down into the old south bed: a river that dried up before the Burn, running under the glass in a cut of red stone, its floor gravel and old reeds, with no gate on it anywhere because nobody ever thought it was worth one. The carts go slowly. The Choir walk, and sing when the walking is hard, and stop when the oxen want to. On the third night they make their fire in the open, under the whole sky, and sit round it with nothing over their heads, as they do.',
      again: 'The fire in the old south bed, under the whole sky.',
      interject: [
        { companion: KES, text: 'Kes lies on her back by the fire with her hands behind her head. "No lens," she says. "No lattice. No handshake. Nothing up there but sky." She is quiet a long time. "I didn\'t know it was this loud, the quiet."', effects: [A(KES, 3)] },
        { companion: NINE, text: 'Nine sits a little way from the fire with its back to it, its lens on the dark. "The bed is not on the record," it says. "It is not owned or scheduled. I find I do not know how to stand on it." It stays anyway.' },
        { companion: ILYA, text: 'The Choir pass a cup of something warm round the fire. Ilya holds it a long moment and passes it on without drinking. Nobody remarks on it, which is the Choir\'s kindness.' },
      ],
      options: [
        { id: 'carts.sky', text: '(Lie back and look up, the way they do.)', if: NOT_ASKED('carts.sky'), next: 'sky' },
        { id: 'carts.why', text: 'Why water for Knock? Knock never gave Openfield anything.', if: NOT_ASKED('carts.why'), next: 'why' },
        { id: 'carts.sleep', text: '(Sleep under the sky. Go on in the morning.)', effects: [{ until: 6 }], next: 'sallow' },
      ],
    },
    sky: {
      text: 'You lie back on the gravel with the Choir\'s fire at your feet, and the sky comes down over the cut from rim to rim, more of it than you have ever seen at once, with nothing between you and it: no roof, no canvas, no lens. Somebody near you is singing under their breath, not to anyone. You understand, for the length of one breath, why people would want to be buried under it with nothing written on the stone.',
      again: 'The whole sky over the cut, and somebody singing.',
      effects: [{ xp: 30 }],
      interject: [{ companion: ASH, text: '"That\'s it," Ash says beside you, not looking away from it. "That\'s the whole of it. Nobody up there keeping count."', effects: [A(ASH, 2)] }],
      options: [{ text: '(Sit up.)', next: 'bed' }],
    },
    why: {
      text: [
        { if: MASON_WALKS, text: 'Mason does not look away from the fire. "Because the sky keeps no books," he says. "If we gave only where we were owed, we would be the guild with hymns." He smiles into his beard. "And because a reserve the city is about to carry away is the kind of door the Choir has always stood in front of. We are only early."' },
        { if: CALLA_FREE, text: 'Calla turns a stick in the fire. "Because I have been carried by an order," she says, "and nobody brought me water. I\'d like that to be true for fewer people." She looks up. "The sky keeps no books. That means we don\'t either. Not even on Knock."' },
        { text: 'Doria does not look up from the tally board, which she has been reading by the fire\'s light. "Because if we only gave where we were owed we would have to keep a book of who owed us," she says. "And then we would be the guild." She puts the board down. "The sky keeps no books. It is the only rule we have that I have never seen anyone break."' },
      ],
      again: '"The sky keeps no books."',
      options: [{ text: '(Look at the fire a while.)', next: 'bed' }],
    },
    sallow: {
      text: 'Up out of the bed on the fourth morning into the Sallow, where the salt starts, the carts\' wheels hissing on it. Shale by noon, its people coming out to look at Choir carts on their road with water barrels on them, which nobody in Shale has ever seen. Knock is a day\'s walk up the track.',
      again: 'Shale\'s edge, the carts\' wheels hissing on the salt.',
      effects: [{ set: 'a3_in_sallow' }, { time: 360 }],
      options: [
        { id: 'carts.knock', text: '(Walk on with the carts up the track to Knock.)', next: 'knock' },
        { id: 'carts.shale', text: '(Stop in Shale. The carts go on; you\'ll follow.)', effects: DOWN_AT_SHALE('carts', 'I walked home with Openfield\'s carts by the old south bed, as far as Shale, and let them go on to Knock ahead of me with the water.'), exit: true },
      ],
    },
    knock: {
      text: 'Up the track into Knock with the Choir\'s carts, past the column\'s tents on the toll road and the wardens watching, to the windpump\'s well, where the cup-a-head ration board still hangs on its nail. The Choir roll the first barrel off the tailboard and stand it by the well, and the next, and nobody from Knock moves for a long moment, and then everyone does.',
      again: 'The Choir\'s barrels by the well, Knock drinking.',
      effects: [{ time: 540 }],
      interject: [{ companion: TAMSIN, text: 'Tamsin watches Knock drink. "Look at them," she says. "Look at them." She wipes her face with the back of her wrist and pretends it was dust.' }],
      options: [{ id: 'carts.down', text: '(Help them with the barrels.)', effects: ARRIVE_KNOCK('carts', 'I walked home to Knock with Openfield\'s carts by the old south bed, and the Choir brought a dry Knock water for nothing.', [{ set: 'a3_carts_water' }, { news: { tag: 'a3_carts_water', text: 'the Choir walked water barrels from Openfield to a dry Knock by the old south bed, and asked nothing for them', valence: 4, size: 5, at: 'cistern9' } }]), exit: true }],
    },
    done: {
      text: 'The Choir\'s empty carts, turned for home.',
      again: 'The empty carts, turned for home.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the player's own buggy (the Ring)

/** The hook on the player's own buggy at the Ring (`d_dr_heron` / `d_dr_mule`, md_ring.ts). */
export const BUGGY_HOME = (sfx: string): OptionDef => ({
  id: `${sfx}.a3.home`, text: '(Drive it home to Knock.)', if: ALL(HOME_OPEN, RIDE_BUGGY),
  effects: [OPEN('d_a3_buggy', 'The road home')], exit: true,
});

export const d_a3_buggy: DialogueDef = {
  id: 'd_a3_buggy', owner: 'narrator',
  start: [{ if: ON_THE_WAY('buggy'), node: 'sallow' }, { if: HOME_OPEN, node: 'pits' }, { node: 'done' }],
  nodes: {
    pits: {
      text: 'The buggy in the pits, yours, with a full can strapped behind the seat. It is some four hundred kilometres to Knock by the toll road, Emil says from the shed door without being asked, and the tank and the can between them hold about two hundred and fifty of it. "Ninebridge sells fuel," he says. "So does a wreck, if you\'ve a hose and no shame."',
      again: 'The buggy, a full can behind the seat. Four hundred kilometres.',
      options: [
        { id: 'buggy.go', text: '(Start it up and go.)', effects: [{ until: 6 }, BOARD('buggy')], next: 'road' },
        { id: 'buggy.later', text: 'Not yet.', exit: true },
      ],
    },
    road: {
      text: 'East on the toll road with the wind in your teeth and the Wall going down behind you, faster than anything on the road except the guild\'s own coach. By noon Ninebridge\'s spans, and the gauge on its last quarter.',
      again: 'Ninebridge\'s spans, and the gauge on its last quarter.',
      effects: [{ time: 300 }],
      interject: [
        { companion: TAMSIN, text: 'Tamsin is standing up in the passenger seat, holding the roll bar, with her hair flat back. "FASTER," she is shouting at the Flats, at nothing. "FASTER."', effects: [A(TAMSIN, 3)] },
        { companion: ILYA, text: 'Ilya holds on to the roll bar with both hands and his eyes shut. "Tell me when we\'ve stopped," he says. "Not before."' },
      ],
      options: [
        { id: 'buggy.fuel', text: '(Buy fuel at Ninebridge. 20 Tolls)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }, { time: 30 }], next: 'pass' },
        { id: 'buggy.siphon', text: '(Siphon a wreck\'s tank on the verge.)', check: { skill: 'mechanics', dc: 35, mods: [{ if: { skill: 'survival', gte: 45 }, dc: -10, why: 'you know where the old tanks on this road still hold' }] }, effects: [{ time: 60 }], next: 'pass', fail: 'dry', failEffects: [{ time: 240 }] },
      ],
    },
    dry: {
      text: 'Three wrecks, three dry tanks, and a mouthful of old fuel that you will be tasting until Knock. In the end you push the buggy the last two kilometres into Ninebridge and pay what the guild\'s man asks, which is less than you feared because he is laughing too hard to haggle.',
      again: 'The taste of old fuel.',
      options: [{ text: '(On, full.)', next: 'pass' }],
    },
    pass: {
      text: 'Up through the Tollhouse\'s pass at dusk. The guild\'s wardens on the gate look at the buggy, and at you, and at the sheet pinned in their booth with the city\'s grey seal on it, and lift the bar without asking for a coin. You sleep in the buggy\'s seat under the tower, and at first light you go down into the Sallow.',
      again: 'Tollhouse 9\'s bar lifted for you.',
      effects: [{ until: 6 }],
      options: [{ text: '(Down into the Sallow.)', next: 'sallow' }],
    },
    sallow: {
      text: 'The salt pans white to the edge of the world and the buggy throwing a long white tail behind it across them. Shale by mid-morning, people looking up at the noise. Knock is two hours up the track.',
      again: 'Shale, people looking up at the noise.',
      effects: [{ set: 'a3_in_sallow' }, { time: 180 }],
      options: [
        { id: 'buggy.knock', text: '(Drive on up the track to Knock.)', next: 'knock' },
        { id: 'buggy.shale', text: '(Stop in Shale. Walk the last of it.)', effects: DOWN_AT_SHALE('buggy', 'I drove my own buggy home from the Ring as far as Shale, and walked the last of it to Knock.'), exit: true },
      ],
    },
    knock: {
      text: 'Up the track into Knock at speed, the column\'s wardens turning on the toll road at the noise, a child running alongside until the windpump. You stop by the stand with the engine ticking and the dust going on past you without you.',
      again: 'The buggy by the stand, ticking.',
      effects: [{ time: 120 }],
      options: [{ id: 'buggy.down', text: '(Switch it off.)', effects: ARRIVE_KNOCK('buggy', 'I drove my own buggy home from the Ring to Knock, four hundred kilometres of toll road.'), exit: true }],
    },
    done: { text: 'The buggy, ticking as it cools.', again: 'The buggy.', options: [leave] },
  },
};

// ---------------------------------------------------------------- the road's people (re_a3_*)

const GIRMA = 'npc_w_wheel';
/** The Wheel carry their own: road-kin and friends of the Wheel are taken home across the pan. */
export const d_re_a3_wheel: DialogueDef = {
  id: 'd_re_a3_wheel', owner: GIRMA,
  start: [{ if: HOME_OPEN, node: 'meet' }, { node: 'done' }],
  nodes: {
    meet: {
      text: [
        { if: { member: 'wheel' }, text: 'Two of the Wheel\'s wagons on the verge with their awnings up, and Girma walking back down the road to meet you with both hands open. "Road-kin." Not a question. "Sefa sent us up the toll road for you the day we heard about Knock. The Wheel goes home with its own." She jerks her head at the wagons. "There\'s a place on the second one. It smells of goat."' },
        { text: 'Two of the Wheel\'s wagons on the verge with their awnings up, and Girma walking back down the road to meet you. "Sefa said you\'d be on this road sooner or later," she says. "The Wheel\'s going to Knock: there\'s water to sell to wardens, and a door to watch, and Sefa likes to watch doors." She jerks her head at the wagons. "There\'s a place on the second one, if you want it."' },
      ],
      again: '"There\'s a place on the second wagon," Girma says.',
      effects: [{ learn: 'a3_wheel_ride' }],
      options: [
        { id: 'rew.ride', text: '(Climb up on the second wagon.)', effects: [BOARD('wheel'), { time: 120 }], next: 'pan' },
        { id: 'rew.no', text: 'I\'ll make my own way. Thank Sefa for me.', exit: true },
      ],
    },
    pan: {
      text: 'Off the toll road and out across the pans by the Wheel\'s own tracks, which are not on any map because they move: two days of salt and sky, the wagons creaking, children walking alongside and riding when they tire, a goat that has decided you are its business. At night the Wheel make one fire and everyone sits at it, guests first.',
      again: 'The Wheel\'s fire on the pan, guests first.',
      effects: [{ time: 2400 }, { set: 'a3_in_sallow' }],
      interject: [
        { companion: WREN, text: 'Wren is teaching a Wheel child to strip a carbine by feel, with her eyes shut. The child\'s mother watches and decides, slowly, to allow it.', effects: [A(WREN, 3)] },
        { companion: ODILE, text: 'Odile has been beaten at Dust three times by a Wheel grandmother and is delighted. "She cheats," she says. "Beautifully. I am going to learn it if it takes the whole pan."', effects: [A(ODILE, 3)] },
      ],
      options: [{ id: 'rew.knock', text: '(Ride the last of it to Knock.)', next: 'knock' }],
    },
    knock: {
      text: 'The Wheel come up to Knock from the pan side, the way nobody comes, and draw up below the windpump in a ring with the awnings out. The column\'s wardens on the toll road watch them come and do not know what to write down. Girma hands you down off the wagon as if you were a guest of some standing, which, among the Wheel, you are.',
      again: 'The Wheel\'s ring below the windpump.',
      options: [{ id: 'rew.down', text: '(Climb down.)', effects: ARRIVE_KNOCK('wheel', 'The Wheel found me on the toll road and carried me home to Knock across the pan by their own tracks.', [{ trust: { npc: 'npc_wh_01', by: 5 } }]), exit: true }],
    },
    done: { text: 'Girma, on the verge, raising a hand.', again: 'Girma raises a hand.', options: [{ text: '(Go on.)', exit: true }] },
  },
};

const BERTIL = 'npc_a3_02', KETURAH = 'npc_a3_03';
const WALKERS_DONE: Cond = F('a3_refugees');
const OPENFIELD_KIND: Effect[] = [
  { news: { tag: 'a3_refugees_helped', text: 'the designate stopped on the toll road for people walking away from Openfield after its night', valence: 3, size: 4, at: 'openfield' } }, { xp: 40 },
];
export const d_re_a3_refugees: DialogueDef = {
  id: 'd_re_a3_refugees', owner: BERTIL,
  start: [{ if: WALKERS_DONE, node: 'after' }, { node: 'meet' }],
  nodes: {
    meet: {
      text: [
        { if: OPENFIELD('burned'), text: 'A handcart on the verge with a wheel off it, and everything a house holds roped onto it: a mattress, a kettle, a door. An old man in a sun-faded blue coat sits on the road beside the wheel, and a woman with a child asleep across the sacks stands over him. "Openfield," the man says, before you ask. "What\'s left of it burned the night the guild and the city came. We\'re walking to Shale. We hear the sheriff takes people."' },
        { if: OPENFIELD('evicted'), text: 'A handcart on the verge with a wheel off it, and everything a house holds roped onto it: a mattress, a kettle, a door. An old man in a sun-faded blue coat sits on the road beside the wheel, and a woman with a child asleep across the sacks stands over him. "Openfield," the man says, before you ask. "Returned to the schedule. The wardens were very polite. We\'re walking to Shale. We hear the sheriff takes people."' },
        { if: OPENFIELD('guild'), text: 'A handcart on the verge with a wheel off it, and everything a house holds roped onto it: a mattress, a kettle, a door. An old man in a sun-faded blue coat sits on the road beside the wheel, and a woman with a child asleep across the sacks stands over him. "Openfield," the man says, before you ask. "The guild holds the flats now. You can stay and work them for the guild, or you can walk. We\'re walking to Shale."' },
        { text: 'A handcart on the verge with a wheel off it, and everything a house holds roped onto it: a mattress, a kettle, a door. An old man in a sun-faded blue coat sits on the road beside the wheel, and a woman with a child asleep across the sacks stands over him. "Openfield," the man says, before you ask. "Our rows went in the fire on the long night, and the rest won\'t feed three. We\'re walking to Shale."' },
      ],
      again: 'The handcart on the verge, the wheel off, the old man beside it.',
      interject: [
        { companion: ASH, text: 'Ash knows the man; you can see it before either of them says so. "Bertil," he says, and goes down on his heels on the road beside him, and does not say anything else for a while.', effects: [A(ASH, 2)] },
        { companion: TAMSIN, text: 'Tamsin is looking at the door roped on top of the cart. "You brought your door," she says. The woman says, "It was a good door," and Tamsin nods as if that were the most reasonable thing she had heard all year.' },
      ],
      options: [
        { id: 'rer.water', text: '(Give them two of your waters.)', if: { item: 'c_water', count: 2 }, effects: [{ take: 'c_water', count: 2 }, { set: 'a3_refugees', value: 'water' }, ...OPENFIELD_KIND], next: 'water' },
        { id: 'rer.tolls', text: '(Give them twenty Tolls for Shale.)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }, { set: 'a3_refugees', value: 'tolls' }, ...OPENFIELD_KIND], next: 'tolls' },
        { id: 'rer.wheel', text: '(Put the wheel back on the cart.)', check: { skill: 'mechanics', dc: 30, mods: [{ if: { attr: 'brawn', gte: 7 }, dc: -10, why: 'you can lift the cart while she knocks the pin in' }] }, effects: [{ time: 60 }, { set: 'a3_refugees', value: 'wheel' }, ...OPENFIELD_KIND], next: 'wheel', fail: 'wheel_no' },
        { id: 'rer.told', text: 'Knock\'s dry. Shale\'s full. Find the Wheel: they take people across the pan.', if: NOT_ASKED('rer.told'), effects: [{ set: 'a3_refugees', value: 'told' }, { learn: 'a3_refugees_told' }], next: 'told' },
        { id: 'rer.on', text: '(Walk on.)', exit: true },
      ],
    },
    water: {
      speaker: KETURAH,
      text: 'The woman takes the bottles and does not thank you; she gives the first to the old man and holds the second until the child wakes, and then she thanks you. "Keturah," she says. "And Bertil, who is not my father, but he was walking the same way." She looks at you properly for the first time. "You\'re the one from the list. The city\'s one." She does not say it unkindly.',
      again: '"You\'re the city\'s one," Keturah says. Not unkindly.',
      options: [{ text: '(Go on.)', exit: true }],
    },
    tolls: {
      text: 'He looks at the coins for a long time, the way the Choir look at money, as if it might be a trick. "We don\'t keep books," he says. "So I can\'t write it down that you did this." He closes his hand on them. "I\'ll have to remember it instead."',
      again: '"I\'ll have to remember it instead."',
      options: [{ text: '(Go on.)', exit: true }],
    },
    wheel: {
      speaker: 'narrator',
      text: 'You lift; Keturah knocks the pin in with the flat of a hatchet; the wheel goes on and stays on. Bertil gets up off the road by stages, and stands with a hand on the cart, and nods to you as if you had done something very ordinary, which is the highest compliment the Choir have.',
      again: 'The wheel back on, the cart upright.',
      options: [{ text: '(Go on.)', exit: true }],
    },
    wheel_no: {
      speaker: 'narrator',
      text: 'The pin will not go, and the axle is bent besides. In the end Keturah unloads the door off the top and lashes it under the cart as a skid, and they go on like that, scraping, toward Shale.',
      again: 'The cart scraping on toward Shale on its door.',
      effects: [{ set: 'a3_refugees', value: 'told' }],
      options: [{ text: '(Go on.)', exit: true }],
    },
    told: {
      text: '"The Wheel." Bertil turns it over. "They\'d take an old man who can\'t walk the pan?" Keturah answers for you: "They take anyone who\'ll sit at their fire and not steal." She is already turning the cart, off the toll road, toward the salt. "Thank you," she says. "It\'s more than the city gave us. That\'s not much, I know."',
      again: 'The cart turning off the road toward the salt.',
      options: [{ text: '(Go on.)', exit: true }],
    },
    after: { text: 'The handcart, going on.', again: 'The cart.', options: [{ text: '(Go on.)', exit: true }] },
  },
};

const RIDER = 'npc_a3_g9';
const RIDERS_DONE: Cond = F('a3_riders');
const RIDERS_FIGHT: Effect[] = [
  { set: 'a3_riders_fight' }, { set: 'a3_riders', value: 'fought' }, { rep: { faction: 'tollmen', respect: -10, fear: 5 } },
  { news: { tag: 'a3_riders_fought', text: 'two of the guild\'s riders were drawn on by the designate on the toll road', valence: -3, size: 5, at: 'tollhouse' } },
  { event: 'combat' },
];
export const d_re_a3_riders: DialogueDef = {
  id: 'd_re_a3_riders', owner: RIDER,
  start: [{ if: F('a3_riders_fight'), node: 'hostile' }, { if: RIDERS_DONE, node: 'after' }, { node: 'stop' }],
  nodes: {
    stop: {
      text: [
        { if: LN('choir'), text: 'Two of the guild\'s riders sit their horses across the road with their carbines on their knees, in no hurry, the way people sit who own the road they are sitting on. "Designate." The nearer of them says it like a joke he has been told and is still deciding about. "The guild remembers Openfield. You and the hymn-singers." He holds out a gloved hand, palm up. "The road\'s the guild\'s. Fifty, for those who stood against it. Nothing for its friends."' },
        { text: 'Two of the guild\'s riders sit their horses across the road with their carbines on their knees, in no hurry, the way people sit who own the road they are sitting on. "Designate." The nearer of them says it like a joke he has been told and is still deciding about. "The guild remembers Openfield. You stood with the city and watched it put us off the flats." He holds out a gloved hand, palm up. "The road\'s the guild\'s. Fifty, for those who stood against it. Nothing for its friends."' },
      ],
      again: 'The riders across the road, the gloved hand out. "Fifty."',
      interject: [
        { companion: ODILE, text: '"Fifty is not a toll, my dear," Odile says, loud enough for them. "It is a grudge with a price on it. The guild has never once collected a grudge in writing. Ask him for a receipt."' },
        { companion: WREN, text: 'Wren has not drawn. She has her hand where it can, and her eyes on the second rider\'s feet. "The one on the left talks," she says, low. "The one on the right shoots."' },
      ],
      options: [
        { id: 'rid.pay', text: '(Pay the fifty.)', if: TOLLS(50), effects: [{ take: 'tolls', count: 50 }, { set: 'a3_riders', value: 'paid' }], next: 'paid' },
        {
          id: 'rid.talk', text: 'The guild wants the designate at that door alive, or it wouldn\'t have sent you. Move.',
          check: { skill: 'speech', dc: 45, mods: [
            { if: { item: 'k_rc_pass' }, dc: -10, why: 'a guild Line pass in your hand' },
            { if: { rep: { faction: 'tollmen', respect: 10 } }, dc: -10, why: 'the guild still thinks well of you' },
            { if: IN(ODILE), dc: -10, why: 'Odile knows whose riders these are, and what they owe' },
            { if: F('ln_guild_beaten'), dc: 10, why: 'the guild lost at Openfield, and these two lost friends there' },
          ] },
          effects: [{ set: 'a3_riders', value: 'talked' }, { xp: 60 }], next: 'talked', fail: 'refused',
        },
        { id: 'rid.fight', text: '(Draw.)', effects: RIDERS_FIGHT, exit: true },
      ],
    },
    refused: {
      text: '"Brave," the talker says, and does not move. "Fifty."',
      again: '"Fifty."',
      options: [
        { id: 'rid.pay2', text: '(Pay the fifty.)', if: TOLLS(50), effects: [{ take: 'tolls', count: 50 }, { set: 'a3_riders', value: 'paid' }], next: 'paid' },
        { id: 'rid.fight2', text: '(Draw.)', effects: RIDERS_FIGHT, exit: true },
      ],
    },
    paid: {
      text: 'He counts it without looking at it, which is a skill, and puts it inside his coat, which is where the guild\'s money never goes. "Mind the road, designate," he says, and they ride off the way they came, at a walk.',
      again: 'The riders, gone back the way they came.',
      options: [{ text: '(Go on.)', exit: true }],
    },
    talked: {
      text: 'The talker looks at you for a long time, and then at the other one, who shrugs with one shoulder. "Alive at the door," he says. "That\'s about the size of it." He moves his horse off the road. "We never saw you."',
      again: '"We never saw you."',
      options: [{ text: '(Go on.)', exit: true }],
    },
    hostile: { text: 'The riders are past talking.', again: 'Past talking.', options: [{ text: '(Nothing.)', exit: true }] },
    after: { text: 'The road, and nobody across it now.', again: 'The road.', options: [{ text: '(Go on.)', exit: true }] },
  },
};

const TEODOR = 'npc_a3_04';
export const d_re_a3_trader: DialogueDef = {
  id: 'd_re_a3_trader', owner: TEODOR,
  start: [{ if: { knows: 'a3_trader_news' }, node: 'hub' }, { node: 'meet' }],
  nodes: {
    meet: {
      text: 'A man with a mule loaded with coils of copper wire, sitting on the verge with a crystal set on his knee and a wire up a dead tree for an aerial. He takes one earpiece out when he sees you and looks at you the way you look at a face you have seen on a poster. "You\'re the one," he says. "The station on the Hill reads you every night. Top of the list now, with the city\'s new year for the steps." He holds out the earpiece. "Teodor Brann. Hollow. I sell the copper the city left on the Hill to people who want to hear things."',
      again: 'Teodor on the verge with the crystal set, the earpiece held out.',
      effects: [{ learn: 'a3_trader_news' }, { learn: 'loc_signalhill' }, { quest: 'q_a3_mast', start: true }],
      options: [
        { id: 'ret.listen', text: '(Listen.)', next: 'listen' },
        { id: 'ret.hollow', text: 'Who are the Hollow?', next: 'hollow' },
        { id: 'ret.far', text: 'Who else hears it?', next: 'far' },
        { text: '(Go on.)', exit: true },
      ],
    },
    hub: {
      text: 'Teodor with his crystal set, the wire up the dead tree.',
      again: 'Teodor listening.',
      options: [
        { id: 'ret.listen.h', text: '(Listen.)', if: NOT_ASKED('ret.listen'), next: 'listen' },
        { id: 'ret.hollow.h', text: 'Who are the Hollow?', if: NOT_ASKED('ret.hollow'), next: 'hollow' },
        { id: 'ret.far.h', text: 'Who else hears it?', if: NOT_ASKED('ret.far'), next: 'far' },
        { text: '(Go on.)', exit: true },
      ],
    },
    listen: {
      speaker: 'narrator',
      text: 'Hiss, and under the hiss a woman\'s voice, pleasant, unhurried, reading a list the way the city reads weather: a name, a place, a year, a word. And then, near the top, something that is very nearly your name, and the Spire, and the year thirty, and a word you have heard the city use about you before. Teodor watches your face while you listen, and nods, as if you had confirmed something.',
      again: 'The voice under the hiss, reading its list.',
      interject: [{ companion: NINE, text: 'Nine listens with its lens closed. "The relay\'s own band," it says. "Narrow by design. The city speaks to the pump station at Dry Wells and to nobody else." It opens the lens. "This man has made a radio out of a dead tree and the city\'s scrap, and he hears it anyway. The design did not provide for him."' }],
      options: [{ text: '(Give him back the earpiece.)', next: 'hub' }],
    },
    hollow: {
      text: '"The ones who live under the mast on the Hill, in the old relay camp, because nobody else wanted it." He coils a length of wire round his elbow and hand. "The city put up the mast and went home. We stayed. Tally keeps us. If you go up the Hill, bring something to trade; we\'re poor, but we\'re not cheap."',
      again: '"Tally keeps us."',
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    far: {
      text: '"Nobody, properly. The band\'s narrow. I hear it because I live up the Hill and I\'m stubborn." He looks up the road toward where the Hill would be. "The mast\'s not finished. It used to be twice the height, my grandmother said, before the city let the top down into the gully. Put the top back and that voice would reach every radio in the Reach." He shrugs. "Then everyone would know what I know. I\'m not sure that\'s good for trade."',
      again: '"Put the top back and it would reach every radio in the Reach."',
      options: [{ text: 'Something else.', next: 'hub' }],
    },
  },
};

export const A3_ROAD_DIALOGUES: DialogueDef[] = [d_a3_column, d_a3_first, d_a3_carts, d_a3_buggy, d_re_a3_wheel, d_re_a3_refugees, d_re_a3_riders, d_re_a3_trader];
