import type { DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';

/**
 * Bridgeward, the night the Dogs come back for the bridge (B3.12; B3.9's planned milestone). Opened by a trigger at the
 * bridgehead at night once the season has closed at the Spire, with Wren travelling and her mind made up at a fire
 * (`wren_bridge`, overpass.ts). The odds are a check the player can read; the outcome sets `bw_raid` ('won' | 'lost'),
 * which Wren's own line (q_comp_wren) and Ilya's (the booth: `vasha_cornered`, her tree in overpass.ts) read.
 * Story notes: story/STORY_PLAN_SECRET.md, Build notes — B3.12.
 */

const WREN = 'npc_rd_03';
const ILYA = 'npc_sh_17';
const W = (by: number): Effect => ({ approval: { companion: WREN, by } });
const I = (by: number): Effect => ({ approval: { companion: ILYA, by } });
const wApp = (gte: number): Cond => ({ approval: { companion: WREN, gte } });

/** Vasha Kade is the booth's hand once the season has closed, until her fate is settled. */
const VASHA_HERE: Cond = { all: [{ flag: 'a2_spire_done' }, { not: { flag: 'vasha_fate' } }, { not: { flag: 'vasha_dead' } }, { not: { dead: 'npc_rd_02' } }] };
const SECOND_RIFLE: Cond = { all: [{ flag: 'ilya_wren_bridge' }, { inParty: ILYA }] };
/** The player knows the watch of whoever holds the chain (a member of that crew). */
const KNOW_WATCH: Cond = { any: [{ all: [{ member: 'rustmouths' }, { not: { flag: 'bw_turf', eq: 'gilt' } }] }, { all: [{ member: 'gilt' }, { flag: 'bw_turf', eq: 'gilt' }] }] };
const MODS = [
  { if: { flag: 'bw_turf', eq: 'rustmouths' }, dc: 15, why: 'the Rustmouths hold the chain, and they are waiting for exactly this' },
  { if: { flag: 'bw_held_blood' }, dc: 5, why: 'there is blood on that chain already' },
  { if: { flag: 'bw_turf', eq: 'gilt' }, dc: -10, why: 'the Gilt hold a chain they have never had to fight for' },
  { if: { flag: 'bw_three_crews' }, dc: -10, why: 'three crews on one chain, and none of them will die for it' },
  { if: wApp(50), dc: -10, why: 'Wren trusts your call on the deck' },
  { if: SECOND_RIFLE, dc: -10, why: 'a second rifle on the parapet, with its own reason to be there' },
  { if: { knows: 'bw_fenn_opens' }, dc: -5, why: 'the Dogs\' old guns, from under Kibet\'s bench' },
  { if: VASHA_HERE, dc: 10, why: 'Vasha Kade is at the booth, and she has read how this ends' },
  { if: KNOW_WATCH, dc: -10, why: 'you know their watch' },
  { if: { flag: 'bw_raid_late' }, dc: 10, why: 'she did not plan it with you' },
];
/** Her call, with no check: it carries only if the chain is not the Rustmouths' and something is on her side. */
const HER_CALL: Cond = { all: [{ not: { flag: 'bw_turf', eq: 'rustmouths' } }, { any: [wApp(50), SECOND_RIFLE, { flag: 'bw_three_crews' }] }] };
/** Alone, without the player: only a soft chain and an empty booth. */
const ALONE_WINS: Cond = { all: [{ flag: 'bw_turf', eq: 'gilt' }, { not: VASHA_HERE }] };

const WON: Effect[] = [
  { set: 'bw_raid', value: 'won' }, { set: 'bw_dogs_hold' }, { rep: { faction: 'rust_dogs', respect: 15 } }, { rep: { faction: 'rustmouths', respect: -15, fear: 5 } }, { xp: 200 },
  { decision: { id: 'bw_raid', text: 'The Rust Dogs took Bridgeward\'s bridge back on a night Wren chose, and the rope on the booth came down empty.' } },
  { news: { tag: 'bw_dogs_back', text: 'the Rust Dogs came back for Bridgeward\'s bridge in the night and hold the chain; the Crown\'s road stops at their paint', valence: 3, size: 8, at: 'meridian' } },
];
const LOST: Effect[] = [
  { set: 'bw_raid', value: 'lost' }, { set: 'wren_hanged' }, { leave: WREN }, { set: 'wren_left', value: 'hanged' }, { rep: { faction: 'rust_dogs', respect: -10 } },
  { decision: { id: 'bw_raid', text: 'The Rust Dogs\' raid on Bridgeward\'s bridge failed. Wren Calloway was hanged from the toll booth at dawn.' } },
  { news: { tag: 'bw_wren_hanged', text: 'a Rust Dog scout was hanged from the Bridgeward toll booth after a raid on the chain; they left her there a day for the street to see', valence: -6, size: 9, at: 'meridian' } },
];

/** The ways over the chain, offered from the plan and again when the player follows her late (each with its own ids). */
const approaches = (k: string): OptionDef[] => [
  { id: `${k}.chain`, text: 'Over the chain, all at once.', check: { skill: 'firearms', dc: 55, mods: MODS }, effects: [{ set: 'bw_raid_how', value: 'chain' }], next: 'falls', fail: 'lost' },
  { id: `${k}.parapet`, text: 'Along the parapet in the dark. The lamps first.', check: { skill: 'stealth', dc: 55, mods: MODS }, effects: [{ set: 'bw_raid_how', value: 'parapet' }], next: 'falls', fail: 'lost' },
  { id: `${k}.fourth`, text: 'Walk them in under the mast, as a fourth crew on the chain.', if: { flag: 'bw_three_crews' }, check: { skill: 'speech', dc: 45, mods: MODS }, effects: [{ set: 'bw_raid_how', value: 'fourth' }], next: 'fourth', fail: 'lost' },
  { id: `${k}.call`, text: 'It\'s your bridge. Your call.', if: HER_CALL, effects: [{ set: 'bw_raid_how', value: 'call' }], next: 'falls' },
  { id: `${k}.call.no`, text: 'It\'s your bridge. Your call.', if: { not: HER_CALL }, effects: [{ set: 'bw_raid_how', value: 'call' }], next: 'lost' },
];
const toBooth = (k: string): OptionDef[] => [
  { id: `${k}.booth.v`, text: '(The booth.)', if: VASHA_HERE, next: 'won_vasha' },
  { id: `${k}.booth`, text: '(The booth.)', if: { not: VASHA_HERE }, next: 'won' },
];
/** A member of the crew that held the chain is a member no longer. */
const after = (k: string): OptionDef[] => [
  { id: `${k}.out.rm`, text: '(Go.)', if: { all: [{ member: 'rustmouths' }, { not: { flag: 'bw_turf', eq: 'gilt' } }] }, next: 'out_rm' },
  { id: `${k}.out.gilt`, text: '(Go.)', if: { all: [{ member: 'gilt' }, { flag: 'bw_turf', eq: 'gilt' }] }, next: 'out_gilt' },
  { id: `${k}.go`, text: '(Go.)', if: { not: KNOW_WATCH }, exit: true },
];

export const d_bw_raid: DialogueDef = {
  id: 'd_bw_raid', owner: WREN,
  start: [{ if: { flag: 'wren_bridge', eq: 'alone' }, node: 'gone' }, { node: 'ask' }],
  nodes: {
    ask: {
      text: [
        { if: { flag: 'bw_held_blood' }, text: 'Wren stops at the edge of the lamplight at the bridgehead and looks at the chain the way she looks at a road. "Tonight," she says. Not a question. In the dark by the old garage, four Dogs: Brindle, two you don\'t know, and a woman with Perpetua\'s walk. "Rustmouths on the chain," she says, "and they\'ve had blood on it. They\'ll be ready. Bad."' },
        { if: { flag: 'bw_turf', eq: 'rustmouths' }, text: 'Wren stops at the edge of the lamplight at the bridgehead and looks at the chain the way she looks at a road. "Tonight," she says. Not a question. In the dark by the old garage, four Dogs: Brindle, two you don\'t know, and a woman with Perpetua\'s walk. "Rustmouths on the chain, and the chain\'s theirs by a word. They\'ll be ready. Bad."' },
        { if: { flag: 'bw_turf', eq: 'gilt' }, text: 'Wren stops at the edge of the lamplight at the bridgehead and looks at the chain the way she looks at a road. "Tonight," she says. Not a question. In the dark by the old garage, four Dogs: Brindle, two you don\'t know, and a woman with Perpetua\'s walk. "Gilt on the chain. Crown kids who\'ve never held anything they didn\'t buy." She almost smiles. "Good."' },
        { if: { flag: 'bw_three_crews' }, text: 'Wren stops at the edge of the lamplight at the bridgehead and looks at the chain the way she looks at a road. "Tonight," she says. Not a question. In the dark by the old garage, four Dogs: Brindle, two you don\'t know, and a woman with Perpetua\'s walk. "Three crews on the chain, and none of them will die for a third of two Tolls." She considers it. "There\'s room on that slate for a fourth paint."' },
        { text: 'Wren stops at the edge of the lamplight at the bridgehead and looks at the chain the way she looks at a road. "Tonight," she says. Not a question. In the dark by the old garage, four Dogs: Brindle, two you don\'t know, and a woman with Perpetua\'s walk. "Rustmouths on the chain, five to stand, and three crews looking at it. Nobody\'s settled it. Somebody\'s about to."' },
      ],
      again: '"Tonight?" Wren says, at the edge of the lamplight, the Dogs in the dark behind her.',
      options: [
        { id: 'raid.tonight', text: 'Tonight.', next: 'plan' },
        { id: 'raid.not', text: 'Not tonight.', exit: true, repeat: true },
      ],
    },
    plan: {
      text: [
        { if: VASHA_HERE, text: '"And Kade on the booth." She says the name like a wound she is checking. "She read it somewhere. She thinks it\'s her night too." She looks at you. "It isn\'t. How do we go?"' },
        { text: '"No Kade on the booth," she says. "Good. Nobody up there who\'s read the end." She looks at you. "How do we go?"' },
      ],
      again: '"How do we go?" Wren says.',
      interject: [{ companion: ILYA, if: { flag: 'ilya_wren_bridge' }, text: '"Parapet," Ilya says, already moving off into the dark with the long rifle. "Four hundred paces from the booth. I\'ll count you in." Wren nods once without looking at him.' }],
      options: approaches('plan'),
    },
    gone: {
      text: 'You turn to say something to Wren and she is not there. She is at the chain, in the dark, with four Dogs from the old garage, and she has not looked back once to see whether you are coming. It is her night. She said she would pick it, and not tell you.',
      again: 'Wren, at the chain in the dark, not looking back.',
      effects: [{ set: 'bw_raid_late' }],
      options: [
        { id: 'gone.follow', text: '(Go after her.)', next: 'late' },
        { id: 'gone.stay', text: '(Stay back. It\'s her night.)', if: ALONE_WINS, next: 'won_alone' },
        { id: 'gone.stay.no', text: '(Stay back. It\'s her night.)', if: { not: ALONE_WINS }, next: 'lost_alone' },
      ],
    },
    late: {
      text: 'You reach her at the chain with your breath going. "You came," she says, not slowing, not looking round. "Then keep up."',
      again: '"Then keep up," Wren says.',
      options: approaches('late'),
    },
    falls: {
      speaker: 'narrator',
      text: [
        { if: { flag: 'bw_raid_how', eq: 'parapet' }, text: 'The lamps go first, one and then the other, and in the dark the parapet is a road only Wren can see. By the time the chain\'s guards know there is anyone on the bridge the Dogs are behind them. Somebody fires at nothing. Somebody runs. The chain comes down with a sound like a bell dropped in a well.' },
        { if: { flag: 'bw_raid_how', eq: 'call' }, text: 'She calls it the way she reads a road: once, all the way through. Brindle left, the woman with Perpetua\'s walk right, Wren straight up the middle with her hands empty until they aren\'t. It is over faster than anything you have seen on a street. The chain comes down.' },
        { text: 'All at once, over the chain, the five of you and the noise of it. The guards get off two shots and then they are running for the hall, and the Dogs let them run. The chain comes down with a sound like a bell dropped in a well.' },
      ],
      again: 'The chain, down on the deck.',
      options: toBooth('falls'),
    },
    fourth: {
      speaker: 'narrator',
      text: 'Under the Saints\' red lamp, in the small hours, with the girl who hears asleep against the radios: you and Wren and a Gilt, a Rustmouth and a white hand, and a bucket of paint. Nobody fires. When it is light the slate at the chain has a fourth paint on it, a dog\'s head over the other three, and it says STAND — 2 — SPLIT FOUR WAYS.',
      again: 'The fourth paint on the slate: a dog\'s head over the other three.',
      options: toBooth('fourth'),
    },
    won_vasha: {
      speaker: 'narrator',
      text: 'At the booth there is a coil of new rope at the foot of the door and Vasha Kade with her back to the booth\'s steel, the submachine gun on its strap and her thumb on the safety, smiling, with the Dogs in front of her and the drop behind and nowhere at all left to go.',
      again: 'Vasha, her back to the booth, the rope at her feet.',
      effects: [...WON, { set: 'vasha_cornered' }, W(10)],
      interject: [
        { companion: ILYA, if: { flag: 'ilya_wren_bridge' }, text: 'Ilya comes in off the parapet without hurrying and stops ten paces from the booth, and does not unsling the rifle, and does not look at anything but her.', effects: [I(3)] },
        { companion: ILYA, text: 'Ilya has come up the deck behind you without a sound. He stops ten paces from the booth, and does not unsling the rifle, and does not look at anything but her.' },
      ],
      options: after('vasha'),
    },
    won: {
      speaker: 'narrator',
      text: [
        { if: { flag: 'bw_raid_how', eq: 'fourth' }, text: 'At the booth Wren climbs onto the roof, takes down the rope the Rustmouths kept hung from its beam, coils it, and drops it off the end of the bridge into forty feet of air. She watches it all the way down. Then she sits on the booth roof with her legs hanging, and does not say anything at all.' },
        { text: 'At the booth Wren climbs onto the roof, takes down the rope that hung from its beam, coils it, and drops it off the end of the bridge into forty feet of air. She watches it all the way down. Then she sits on the booth roof with her legs hanging, and Brindle sits beside her, and neither of them says anything at all.' },
      ],
      again: 'Wren on the booth roof, her legs hanging, the rope gone off the end of the bridge.',
      effects: [...WON, W(10)],
      interject: [{ companion: ILYA, if: { flag: 'ilya_wren_bridge' }, text: '"Right," Ilya says, coming in off the parapet, and for once it means a good thing.', effects: [I(3)] }],
      options: after('won'),
    },
    out_rm: { speaker: 'narrator', text: 'In the morning Corvo drives a nail through your name on the bench in the hall, once, and leaves it there for everyone to see. You were a hauler on that chain. You are not now.', again: 'Your name on Corvo\'s bench with a nail through it.', effects: [{ expel: 'rustmouths' }, { decision: { id: 'bw_raid_expelled', text: 'You raided the chain you hauled for; the Rustmouths struck your name off.' } }], options: [{ text: '(Go.)', exit: true }] },
    out_gilt: { speaker: 'narrator', text: 'In the morning Jax comes down the street with the gold paint and puts a line through the slate where your name was, without looking at you. You were Gilt on that chain. You are not now.', again: 'The gold line through your name.', effects: [{ expel: 'gilt' }, { decision: { id: 'bw_raid_expelled', text: 'You raided the chain the Gilt held; they struck your name off.' } }], options: [{ text: '(Go.)', exit: true }] },
    won_alone: {
      speaker: 'narrator',
      text: 'You stay back in the doorway of the old garage with Kibet\'s stove going behind you and listen to it: two shots, a shout, boots, a sound like a bell dropped in a well, and then nothing at all for a long time. In the morning the Gilt are gone from the chain and the slate has a dog\'s head painted over the gold, and Wren comes back down the street with her goggles pushed up and sits on Kibet\'s bench, and doesn\'t say whether she minds that you stayed back.',
      again: 'The dog\'s head over the gold, and Wren on Kibet\'s bench.',
      effects: [...WON, W(-5)],
      options: [{ text: '(Go.)', exit: true }],
    },
    lost: {
      speaker: 'narrator',
      text: [
        { if: VASHA_HERE, text: 'It goes wrong the way things go wrong at night: all at once, and then slowly. The chain\'s guards are ready, and the hall door is open, and there is a shotgun in it; Brindle is down, and up, and dragging you back by the collar toward the garage with your ears ringing. The last you see of Wren she is on the deck under the lamp with three of them on her and Vasha Kade walking up out of the dark with the coil of new rope over her shoulder, unhurried. At dawn Wren is on the booth. Vasha tied the knot herself. She does it well.' },
        { text: 'It goes wrong the way things go wrong at night: all at once, and then slowly. The chain\'s guards are ready, and the hall door is open, and there is a shotgun in it; Brindle is down, and up, and dragging you back by the collar toward the garage with your ears ringing. The last you see of Wren she is on the deck under the lamp with three of them on her. At dawn she is on the booth, from the beam, where the rope always was.' },
      ],
      again: 'The booth at dawn.',
      effects: LOST,
      interject: [{ companion: ILYA, if: { flag: 'ilya_wren_bridge' }, text: 'Ilya comes in off the parapet hours later with no rounds left, and stands at the bottom of the booth with his hat in his ruined hand, and counts something under his breath, and does not stop.' }],
      options: [{ text: '(…)', exit: true }],
    },
    lost_alone: {
      speaker: 'narrator',
      text: [
        { if: VASHA_HERE, text: 'You stay back in the doorway of the old garage and listen to it: two shots, a shout, a shotgun, boots running the wrong way, and then a woman\'s voice you know, amused and unhurried, saying a name. At dawn Wren is on the booth. Vasha Kade is sitting on the booth\'s step under her with the submachine gun across her knees, reading the street\'s faces as they come to look.' },
        { text: 'You stay back in the doorway of the old garage and listen to it: two shots, a shout, a shotgun, boots running the wrong way. At dawn Wren is on the booth, from the beam, where the rope always was, and they leave her there a day for the street to see.' },
      ],
      again: 'The booth at dawn.',
      effects: LOST,
      options: [{ text: '(…)', exit: true }],
    },
  },
};

export const RAID_DIALOGUES: DialogueDef[] = [d_bw_raid];
