import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, AMBUSH, ASH, BANDITS, HALTS_PAID, IN, ILYA, KES, NIGHT, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave } from './rc_line';

/**
 * West Halt, Kettle Cut and East Halt (B5a). West Halt: its watch (the rail bandits) and their captain, the boy who fired,
 * the keeper and the pilotman, and the twelve in the water tower (Stock Car). Kettle Cut: what the hold-ups left in the
 * ditch, and the watch's night run. East Halt: the keeper, the old line-keeper, the boy with the tins, and the east length
 * (The East Length). Story notes: story/STORY_PLAN_SECRET.md, Build notes — B5.
 */

// ---------------------------------------------------------------- the twelve's ends (Stock Car)

const STOCK = (v: string, text: string, extra: Effect[]): Effect[] => [{ set: 'rc_stock', value: v }, ...extra, { decision: { id: 'rc_stock', text } }];
/** Freed by the player's hand: Joaquin stays at West Halt with his aunt; West Halt trusts the player. */
const FREED: Effect[] = [{ set: 'rc_joaquin', value: 'home' }, { set: 'rc_hw_trust' }, A(WREN, 10), A(TAMSIN, 5), { memory: { npc: 'npc_rc_02', tag: 'freed_joaquin', valence: 40, strength: 80 } }];
export const STOCK_OPENFIELD: Effect[] = STOCK('openfield', 'You walked the twelve from West Halt\'s tower south to Openfield in the night, and the Choir took them in. Joaquin Ortega stayed at West Halt.', [
  ...FREED, { xp: 200 }, A(ASH, 10), A(KES, 3),
  { news: { tag: 'rc_twelve_openfield', text: 'twelve people off the Ninebridge block walked into Openfield in the night with no paper, and the Choir fed them', valence: 4, size: 5, at: 'openfield' } },
]);
export const STOCK_FORGED: Effect[] = STOCK('forged', 'You forged discharges for the twelve in West Halt\'s tower. They went down the Line as people who owe nobody anything; Joaquin Ortega stayed at West Halt.', [
  ...FREED, { give: 'k_rc_discharges' }, { xp: 180 },
  { news: { tag: 'rc_twelve_free', text: 'twelve debtors bound for the Concern got off the Line at West Halt with discharges in their hands', valence: 3, size: 4, at: 'west_halt' } },
]);
export const STOCK_BOUGHT: Effect[] = STOCK('bought', 'You bought out the paper on the twelve in West Halt\'s tower at the Concern\'s desk at Yard Nine. Four of them stayed at West Halt to keep its length; Joaquin Ortega stayed home.', [
  ...FREED, { give: 'k_rc_discharges' }, { xp: 150 },
  { news: { tag: 'rc_twelve_bought', text: 'somebody bought twelve debtors off the Concern\'s paper at Yard Nine and let them go; four are laying track at West Halt', valence: 4, size: 4, at: 'west_halt' } },
]);
export const STOCK_SOLD: Effect[] = STOCK('sold', 'You told the Concern\'s man at Yard Nine where the twelve were hiding, for fifteen Tolls a head.', [
  { give: 'tolls', count: 180 }, A(WREN, -30), A(ASH, -20), A(TAMSIN, -20), A(KES, -20), A(ILYA, -5),
  { memory: { npc: 'npc_rc_02', tag: 'sold_joaquin', valence: -80, strength: 100 } }, { memory: { npc: 'npc_rc_09', tag: 'sold_twelve', valence: -60, strength: 90 } },
]);

// ---------------------------------------------------------------- West Halt: the watch

export const d_rc_chela: DialogueDef = {
  id: 'd_rc_chela', owner: 'npc_rc_02',
  start: [
    { if: { flag: 'rc_stock', eq: 'sold' }, node: 'sold' },
    { if: { all: [{ flag: 'rc_abe_sentenced' }, { not: { flag: 'rc_abe' } }, { not: { knows: 'rc_chela_pleads' } }] }, node: 'plead' },
    { if: { flag: 'rc_chela_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A woman in faded rail-crew orange with a rifle across her back and a work braid down it, cleaning a lamp at the watch house door with a rag. Her hood is green. "West Halt\'s watch." She looks at you over the lamp. "The seven o\'clock\'s from the platform; the flag\'s there. If it\'s anything else, I\'m the watch."',
      again: 'Chela, cleaning the lamp.',
      effects: [{ set: 'rc_chela_met' }],
      passives: [{ if: { knows: 'rc_held_up' }, label: 'The cutting', text: 'You know her. She knows you: her rag stops on the lamp, once, and goes on. The woman in the cutting with her scarf down, as if she wanted you to see her face.', effects: [{ learn: 'rc_chela_recognised' }, { learn: 'rc_watch_known' }] }],
      options: [
        { id: 'chela.watch', text: 'What does West Halt\'s watch watch?', next: 'watch' },
        { id: 'chela.know', text: 'I know where your lamp goes at night.', if: { knows: 'rc_watch_known' }, next: 'kettle' },
        bye,
      ],
    },
    again: {
      text: [
        { if: HALTS_PAID, text: 'Chela is on the platform with the pilot\'s flag rolled under her arm, waiting for the seven o\'clock to stop, which it will. "You," she says, and almost smiles. "Pilot\'s pay goes in the tin for the tower. Nobody hurt."' },
        { if: BANDITS('paid'), text: '"You took his money." She does not look up from the lamp. "Fine. We\'ll keep riding. Somebody has to."' },
        { text: 'Chela looks up from the lamp. "What?"' },
      ],
      again: 'Chela, and the lamp.',
      options: [
        { id: 'chela.watch2', text: 'What does West Halt\'s watch watch?', if: { not: { seen: 'chela.watch' } }, next: 'watch' },
        { id: 'chela.know2', text: 'I know where your lamp goes at night.', if: { all: [{ knows: 'rc_watch_known' }, { not: { seen: 'chela.know' } }] }, next: 'kettle' },
        { id: 'chela.brother', text: 'Your brother.', if: { all: [{ knows: 'rc_joaquin_known' }, { not: { seen: 'chela.brother' } }] }, next: 'brother' },
        { id: 'chela.abe', text: 'Who fired at Kettle?', if: { all: [{ knows: 'rc_chela_told' }, { not: { seen: 'chela.abe' } }] }, next: 'abe' },
        bye,
      ],
    },
    watch: { text: '"The length. Forty miles of it, every bolt. The tower. The flag." She puts the lamp down. "And the halt, from anybody who thinks a halt nobody stops at is a halt nobody will miss."', again: '"The length, the tower, the flag."', options: [{ text: 'Something else.', next: 'again' }] },
    kettle: {
      text: 'She finishes the lamp. She takes her time about it. "Then you know we never took a purse and never touched the coach. You know what Kask\'s sheet says about length money." She sets the lamp on its hook. "We take the Concern\'s sealed cars, the ones Casimir ticks, and the halts eat. That was the rule: nobody hurt." She looks down the line, east, toward Kettle. "Then the guild put my brother in a car."',
      again: '"Nobody hurt. That was the rule."',
      effects: [{ learn: 'rc_chela_told' }, { learn: 'rc_joaquin_known' }, { learn: 'rc_brodsky_known' }],
      interject: [{ companion: WREN, text: '"Your brother," Wren says. It is the first thing she has said all day. "Sold for what?" "For the tower," Chela says. "For the water." Wren nods slowly, as if she had expected nothing else.', effects: [A(WREN, 2)] }],
      options: [{ id: 'chela.brother.k', text: 'Tell me about him.', next: 'brother' }],
    },
    brother: {
      text: '"Joaquin. Seventeen." She says it to the lamp. "The guild fixed our tank last year and sent the bill, and we had no money, because nobody stops here to buy water. So the guild took a person instead. Joaquin said he\'d go; he\'s the one who could." Her jaw works. "He went on the block at Ninebridge and came back up the Line in a stock car with eleven others, sealed, bound for the Concern. So I stopped it." She looks at you. "They\'re in the tower. Don\'t make me sorry I said so."',
      again: '"They\'re in the tower."',
      effects: [{ learn: 'rc_stock_known' }, { lead: 'l_rc_tower' }, { quest: 'q_rc_stock', start: true }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    abe: {
      text: '"Abe." She does not hesitate. "The guard was on the stock car\'s roof, Gorse, and when we opened it he fired down into it, five times, at people in a box. Abe had the pistol for the lamp. He fired once." She breathes out. "If it comes to the rope, and it will, because Casimir has four rules and one of them is a rope, you speak for him. You owe me nothing. I\'m asking."',
      again: '"I\'m asking."',
      effects: [{ learn: 'rc_ferris_saw_hint' }],
      options: [
        { id: 'chela.abe.yes', text: 'I\'ll speak for him.', effects: [{ learn: 'rc_chela_pleads' }, { memory: { npc: 'npc_rc_02', tag: 'will_speak', valence: 20, strength: 60 } }], next: 'again' },
        { text: 'I can\'t promise that.', next: 'again' },
      ],
    },
    plead: {
      text: 'Chela is at the watch house door with the lamp unlit in her hand, and she does not pretend to be doing anything with it. "Casimir\'s watch took Abe to Four Ways last night. Dawn, he says, at the platform\'s end." She looks at you. "Speak for him. The guard fired first. Ferris on the rods saw it; ask him. I\'m asking you."',
      again: '"I\'m asking you."',
      effects: [{ learn: 'rc_chela_pleads' }, { set: 'rc_chela_met' }],
      options: [{ text: 'I\'ll go.', exit: true }, bye],
    },
    sold: {
      text: 'Chela Ortega is standing on the platform with her rifle in her hands, not across her back, and she does not lift it, which costs her something you can see. "They came for the tower at dawn," she says. "The Concern\'s men, with a paper, and a list with your description on it where the name should be." She turns her back on you. "Get on your train."',
      again: 'Chela\'s back.',
      options: [bye],
    },
  },
};

export const d_rc_abe: DialogueDef = {
  id: 'd_rc_abe', owner: 'npc_rc_03', start: [{ node: 'hi' }],
  nodes: {
    hi: {
      text: 'A boy of nineteen sitting on an upturned crate by the fire barrel in his watch orange, a pistol in his belt he keeps touching as if to check it is still there. "I\'m all right," he says, before you have asked him anything. "It\'s fine."',
      again: 'Abe, by the fire barrel, touching the pistol.',
      options: [
        { id: 'abe.kettle', text: 'You were at Kettle.', if: { knows: 'rc_abe_named' }, next: 'kettle' },
        bye,
      ],
    },
    kettle: {
      text: 'He goes grey. "He fired at the car. At the stock car, with Joaquin in it, with all of them in it, five times, from the roof." He swallows. "I had the pistol for the lamp. I fired once." He looks at the fire. "I\'d do it again. And I can\'t sleep. Both."',
      again: '"Both."',
      effects: [{ learn: 'rc_abe_story' }],
      interject: [{ companion: ASH, text: 'Ash sits down on the next crate and holds his hands to the fire barrel as if he were cold. "Both is right," he says. "Both is what you carry. Don\'t let anybody take one of them off you to make the other one lighter."', effects: [A(ASH, 3)] }],
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- West Halt: the keeper, the pilotman, the tower

const LEAVE_MODS = [
  { if: { knows: 'rc_joaquin_known' }, dc: -10, why: 'you know whose brother is up there' },
  { if: IN(TAMSIN), dc: -5, why: 'Tamsin has lived her whole life in a tank' },
  { if: HALTS_PAID, dc: -15, why: 'the trains stop here again' },
];

export const d_rc_socorro: DialogueDef = {
  id: 'd_rc_socorro', owner: 'npc_rc_09',
  start: [{ if: { flag: 'rc_stock', eq: 'sold' }, node: 'sold' }, { if: { flag: 'rc_socorro_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman at a table in the keeper\'s house with a ledger, a jar of bolts and a loaf, which she covers with a cloth as you come in. "West Halt. I keep it." She does not get up. "Water\'s a Toll a cup, when the tank is working. It\'s not working."',
      again: 'Socorro, with the cloth over the loaf.',
      effects: [{ set: 'rc_socorro_met' }],
      passives: [{ skill: 'barter', dc: 35, text: 'That is a lot of bread for one keeper. The ledger on the table has a column for flour, and the flour has trebled since spring.', effects: [{ learn: 'rc_bread_noticed' }] }],
      options: [
        { id: 'socorro.tank', text: 'What\'s wrong with the tank?', next: 'tank' },
        { id: 'socorro.length', text: 'How does a halt live, if the trains don\'t stop?', next: 'length' },
        bye,
      ],
    },
    again: {
      text: [
        { if: { any: [{ flag: 'rc_stock', eq: 'openfield' }, { flag: 'rc_stock', eq: 'forged' }, { flag: 'rc_stock', eq: 'bought' }] }, text: 'Socorro uncovers the loaf when you come in and cuts you a slice without asking. "Sit," she says. "Eat. Nobody here is counting."' },
        { text: 'Socorro looks up from the ledger. "Yes?"' },
      ],
      again: 'Socorro, at the ledger.',
      options: [
        { id: 'socorro.tank2', text: 'What\'s wrong with the tank?', if: { not: { seen: 'socorro.tank' } }, next: 'tank' },
        { id: 'socorro.length2', text: 'How does a halt live, if the trains don\'t stop?', if: { not: { seen: 'socorro.length' } }, next: 'length' },
        { id: 'socorro.key', text: 'Let me up the tower. I\'m not the guild, and I\'m not the Concern.', if: { all: [{ knows: 'rc_tower_cough' }, { not: { flag: 'rc_tower_leave' } }, { not: { flag: 'rc_stock' } }] }, check: { skill: 'speech', dc: 40, mods: LEAVE_MODS }, effects: [{ set: 'rc_tower_leave' }], next: 'key', fail: 'nokey' },
        { id: 'socorro.casimir', text: 'The stationmaster was born here.', if: { all: [{ knows: 'rc_brodsky_known' }, { not: { seen: 'socorro.casimir' } }] }, next: 'casimir' },
        bye,
      ],
    },
    tank: { text: '"It leaks." Flat. "It\'s shut." She looks at the cloth over the bread, and then she looks at you looking at it, and does not explain.', again: '"It leaks. It\'s shut."', options: [{ text: 'Something else.', next: 'again' }] },
    length: {
      text: '"Badly." She taps the ledger. "The guild pays length money for every train that stops. Since the through, nothing stops. We keep forty miles of track for a guild that pays us for none of it, and we owe the guild for mending the tower." She lifts the cloth and puts it down again. "And the stalls sell tins, two Tolls, very good tins. Don\'t ask me where from."',
      again: '"Badly."',
      effects: [{ lead: 'l_rc_length' }, { lead: 'l_rc_tins' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    key: { text: 'She looks at you a long time. Then she takes a key off a nail behind the stove. "If you\'re lying," she says, "I\'ll know by morning, and so will everyone on this Line. Go up."', again: '"Go up."', options: [{ text: 'Something else.', next: 'again' }] },
    nokey: { text: '"The tower leaks." She covers the bread again. "Go and catch your train."', again: '"The tower leaks."', options: [{ text: 'Something else.', next: 'again' }] },
    casimir: { text: '"Casimir Brodsky." She almost smiles. "His mother kept this length when we were children. He went to the Junction and became a clock." She looks out at the platform. "He still knows every bolt between here and Kettle. He sends us his weather, when he can."', again: '"He sends us his weather."', options: [{ text: 'Something else.', next: 'again' }] },
    sold: { text: 'Socorro does not look up. The cloth is off the table and there is no bread under it. "Get out of my house."', again: 'Socorro, not looking up.', options: [bye] },
  },
};

export const d_rc_eamon: DialogueDef = {
  id: 'd_rc_eamon', owner: 'npc_rc_10',
  start: [{ if: { all: [{ hour: { from: 21, to: 23 } }, { knows: 'rc_tower_cough' }, { not: { flag: 'rc_stock' } }] }, node: 'bread' }, { if: { flag: 'rc_eamon_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A red-haired man under the handcar with his sleeves rolled, who comes out on his back on a board when your boots stop by his head. "Eamon. Length." He sits up. "Every bolt on forty miles of track, I know by its first name."',
      again: 'Eamon, on his back under the handcar.',
      effects: [{ set: 'rc_eamon_met' }],
      options: [{ id: 'eamon.job', text: 'What does a line-keeper do?', next: 'job' }, bye],
    },
    again: {
      text: [{ if: { flag: 'rc_pilot' }, text: 'Eamon has a rolled red flag tucked in his belt. "Pilotman," he says, and grins. "Paid. By the passage. Who\'d have thought."' }, { text: 'Eamon wipes his hands. "What?"' }],
      again: 'Eamon, wiping his hands.',
      options: [
        { id: 'eamon.job2', text: 'What does a line-keeper do?', if: { not: { seen: 'eamon.job' } }, next: 'job' },
        { id: 'eamon.guide', text: 'The twelve in the tower. Could you get them south to Openfield by night?', if: { all: [{ knows: 'rc_tower_inside' }, { not: { flag: 'rc_stock' } }, { not: { knows: 'rc_eamon_guide' } }] }, next: 'guide' },
        bye,
      ],
    },
    job: {
      text: '"Keeps the length." He counts on oily fingers. "Rails, chairs, keys, fishplates, bolts, culverts, the fence where there is one. Runs the handcar out to it. And pilotman, if the block fails." He snorts. "Rule one hundred and eighty-three. When an instrument fails, every train stops for a man from the halt to ride the section, and the guild pays him. Used to be a job. Never happened in my life."',
      again: '"Used to be a job."',
      effects: [{ learn: 'rc_pilot_known' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    bread: {
      text: 'Eamon at the foot of the water tower in the dark with a sack of bread over his shoulder and the ladder\'s rope in his hand. He goes very still when he sees you. "It leaks," he says. "The tower."',
      again: 'Eamon, the sack, the rope.',
      options: [
        { id: 'eamon.up', text: 'I\'m not the guild. Let me up.', check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'rc_joaquin_known' }, dc: -15, why: 'you know Joaquin is up there' }] }, effects: [{ set: 'rc_tower_leave' }], next: 'up', fail: 'down' },
        leave,
      ],
    },
    up: { text: 'He looks at you a long time and then lets the ladder down. "Bread first," he says, and goes up ahead of you.', again: 'The ladder, down.', options: [{ text: '(Go up after him.)', effects: [{ event: 'dialogue', data: { tree: 'd_rc_tower', name: 'The water tower' } }], exit: true }] },
    down: { text: '"It leaks." He waits until you have gone before he goes up.', again: '"It leaks."', options: [leave] },
    guide: { text: '"Openfield." He thinks about it. "The old track south, a night\'s walk if nobody\'s ankle goes. The Choir feeds anyone who\'ll dig." He nods. "Tell them, at night. I\'ll take the lamp."', again: '"I\'ll take the lamp."', effects: [{ learn: 'rc_eamon_guide' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

const FORGE_MODS = [{ if: { origin: 'archive_clerk' }, dc: -10, why: 'you kept the toll post\'s book; you know the guild\'s hand' }, { if: IN(ODILE), dc: -5, why: 'Odile has signed a thousand of these' }];
const KNOWS_PARTS: Cond = { any: [{ concluded: 'c_hs_parts' }, { flag: 'hs_parts' }] };

export const d_rc_tower: DialogueDef = {
  id: 'd_rc_tower', owner: 'narrator',
  start: [
    { if: { flag: 'rc_stock' }, node: 'after' },
    { if: { any: [{ flag: 'rc_tower_leave' }, { knows: 'rc_tower_inside' }] }, node: 'inside' },
    { node: 'locked' },
  ],
  nodes: {
    locked: {
      text: 'The water tower: a steel tank on a concrete drum, the ladder drawn up, a new padlock on the hatch at its foot. From inside, once, a cough, and someone hushing it.',
      again: 'The padlock, the drawn-up ladder.',
      effects: [{ learn: 'rc_tower_cough' }, { lead: 'l_rc_tower' }, { quest: 'q_rc_stock', start: true }],
      options: [
        { id: 'tower.call', text: '(Call up softly: you are not the guild.)', check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'rc_joaquin_known' }, dc: -10, why: 'you can say Joaquin\'s name' }] }, next: 'inside', fail: 'silent' },
        { id: 'tower.climb', text: '(Climb the overflow pipe in the dark.)', if: NIGHT, check: { skill: 'stealth', dc: 40 }, next: 'inside', fail: 'heard' },
        leave,
      ],
    },
    silent: { text: 'Nobody answers. Nobody coughs. Somewhere above you in the dark, twelve people are holding their breath.', again: 'Silence, held.', options: [leave] },
    heard: { text: 'The pipe groans under you halfway up and the hatch above slams shut. You come down with rust in your palms and the keeper\'s lamp coming across the platform.', again: 'The hatch, slammed shut.', options: [leave] },
    inside: {
      speaker: 'npc_rc_11',
      text: 'Inside the tank\'s dry drum, by one candle: twelve people on blankets, a bucket, a water can, a pile of bread. A broad man with a cropped head stands between you and them. "Yaw Boateng," he says. "We were bought at the Ninebridge block, all of us, and put in a car to go up the Line, and a woman in orange opened the car at a cutting and said run. So we ran here." He holds out a sheaf of paper. "This is what we are. Read it, if you can read."',
      again: 'Yaw, between you and the eleven.',
      effects: [{ learn: 'rc_tower_inside' }, { lead: 'l_rc_tower' }, { lead: 'l_rc_intake' }, { give: 'k_rc_paper' }, { quest: 'q_rc_stock', start: true }],
      interject: [
        { companion: TAMSIN, text: 'Tamsin stands just inside the hatch, looking at the curved steel wall and the candle and the twelve faces, and does not say anything at all for a while. Then: "I know a room like this," she says. "Sixty people and a machine. You don\'t get used to it. You get used to not getting used to it."', effects: [A(TAMSIN, 3)] },
        { companion: WREN, text: 'Wren is down on her heels by the nearest blanket before anyone can stop her, looking at faces, one after another, and then she stands up. "No," she says, to nobody, and her voice is quite ordinary. "Not here."' },
      ],
      options: [
        { id: 'tower.intake', text: 'INTAKE — WEIGHHOUSE — TWO-TWELVE. Do you know what that means?', next: 'intake' },
        { id: 'tower.joaquin', text: 'Which of you is Joaquin?', next: 'joaquin' },
        { id: 'tower.out', text: 'I can get you out.', next: 'out' },
        leave,
      ],
    },
    intake: {
      speaker: 'npc_rc_11',
      text: [
        { if: KNOWS_PARTS, text: 'You tell him what the Weighhouse at the Skirts does with people whose paper crosses the line: the grading, the four letters, the freight at two, the boots that come home cleaned. He listens without moving. Behind him somebody is crying without any noise. "So," Yaw says, when you have finished. "So. We will not be going to the Weighhouse."' },
        { text: '"No. Nobody on the block knows." He folds the papers. "Everybody on the block knows nobody comes back."' },
      ],
      again: '"Nobody comes back."',
      effects: [{ learn: 'rc_stock_why' }],
      options: [{ text: '(Back.)', next: 'inside' }],
    },
    joaquin: {
      speaker: 'npc_rc_12',
      text: 'A lanky boy at the back gets up off his blanket. "Me." He looks seventeen and is trying to look older. "Somebody had to go, for the tank. I\'m the one who could." He glances at the hatch, west, where his sister\'s watch house is. "Chela shouldn\'t have. A man\'s dead. Don\'t tell her I said that."',
      again: 'Joaquin, trying to look older.',
      effects: [{ learn: 'rc_joaquin_known' }],
      options: [{ text: '(Back.)', next: 'inside' }],
    },
    out: {
      speaker: 'npc_rc_11',
      text: '"Out where?" He is not hostile; he is asking. "The guild owns the Line and the Concern owns our paper, and there is a man at Yard Nine in a clean coat who asks the halts every week if anybody has seen twelve people."',
      again: '"Out where?"',
      options: [
        { id: 'tower.south', text: '(Tonight, south to Openfield by the old track. The Choir takes anyone who\'ll dig.)', if: { all: [NIGHT, { not: { knows: 'rc_eamon_guide' } }] }, check: { skill: 'survival', dc: 35 }, effects: STOCK_OPENFIELD, next: 'gone_south', fail: 'lost' },
        { id: 'tower.eamon', text: '(Tonight, south to Openfield, with Eamon and his lamp.)', if: { all: [NIGHT, { knows: 'rc_eamon_guide' }] }, effects: STOCK_OPENFIELD, next: 'gone_south' },
        { id: 'tower.forge', text: '(Forge their discharges on their own paper.)', if: { item: 'k_rc_paper' }, check: { skill: 'science', dc: 45, mods: FORGE_MODS }, effects: STOCK_FORGED, next: 'forged', fail: 'forge_no' },
        { id: 'tower.kes', text: '(Kes: "Obviously the stamp is the hard part. I have the stamp.")', if: { all: [IN(KES), { item: 'k_rc_paper' }] }, effects: STOCK_FORGED, next: 'forged' },
        { id: 'tower.wait', text: 'Wait. I\'ll find a way.', next: 'inside' },
      ],
    },
    gone_south: { speaker: 'narrator', text: 'Down the ladder in the dark, twelve of them and you, a lamp hooded low, and south along the old track through the grass until the sky behind you goes grey and the first of Openfield\'s fences comes up out of the mist with a woman at the gate who looks at twelve faces and no papers and opens it. Joaquin turns back at the halt\'s last fence. "Somebody has to keep the length," he says.', again: 'Openfield\'s gate, opening.', options: [leave] },
    lost: { speaker: 'narrator', text: 'The old track goes into the grass and does not come out, and by the time you have found it again the sky is grey in the east and twelve people are too tired to go on. You bring them back before dawn. Nobody says anything. Tomorrow night, perhaps.', again: 'Back before dawn.', options: [leave] },
    forged: { speaker: 'narrator', text: 'Twelve sheets, the intake line struck through, DISCHARGED across it, the closed eye at the foot as clean as the Concern\'s own. Yaw reads his three times. In the morning the twelve go down the ladder and onto the platform like anybody, and when the seven o\'clock stops for the flag they get on it, and Joaquin does not.', again: 'Twelve sheets, DISCHARGED.', options: [leave] },
    forge_no: { speaker: 'narrator', text: 'The ink takes wrong on the Concern\'s paper, and the stamp you cut from a boot heel looks like a stamp cut from a boot heel. Yaw takes the sheets back gently. "Not those," he says. "Keep thinking."', again: '"Keep thinking."', options: [leave] },
    after: {
      text: [
        { if: { flag: 'rc_stock', eq: 'sold' }, text: 'The water tower\'s hatch hangs open on a cut padlock. Inside, blankets, a bucket, a candle burned down to nothing, and scratched on the curved steel at child height, twelve marks and a train.' },
        { if: { flag: 'rc_stock', eq: 'bought' }, text: 'The water tower is just a water tower again, with its ladder down. Four of the twelve are out on the length with Eamon, laying a new chair, in orange somebody found them.' },
        { text: 'The water tower is just a water tower again, with its ladder down and the hatch open to air it. Somebody has chalked on the drum, low down: 12 — GONE — GOOD.' },
      ],
      again: 'The water tower.',
      options: [leave],
    },
  },
};

export const d_rc_yaw: DialogueDef = {
  id: 'd_rc_yaw', owner: 'npc_rc_11', start: [{ node: 'hi' }],
  nodes: { hi: { text: [{ if: { flag: 'rc_stock', eq: 'bought' }, text: 'Yaw Boateng, in faded orange with a spanner in his belt, on the platform. "Four of us stayed. Somebody has to keep the length." He shakes your hand, hard. "Free men keep it better."' }, { text: 'Yaw Boateng on the platform with the paper in his hand that says he owes nobody anything, reading it again. "I keep thinking it will say something else," he says.' }], again: 'Yaw, on the platform.', options: [bye] } },
};

export const d_rc_joaquin: DialogueDef = {
  id: 'd_rc_joaquin', owner: 'npc_rc_12', start: [{ node: 'hi' }],
  nodes: { hi: { text: 'Joaquin Ortega on the platform with a borrowed spanner, being shown a fishplate by Eamon as if it were a holy thing. "I\'m going to keep the length," he says. "Chela says I\'m not old enough. Chela was keeping it at twelve."', again: 'Joaquin, and the fishplate.', options: [bye] } },
};

export const d_rc_chalk: DialogueDef = {
  id: 'd_rc_chalk', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'Chalk on the tower\'s concrete drum at a child\'s height: a train, a long one, with a face in every window. Somebody has counted the faces and written the number underneath: 12.', again: 'A chalk train. Twelve faces.', effects: [{ lead: 'l_rc_tower' }, { learn: 'rc_tower_chalk' }, { quest: 'q_rc_stock', start: true }], options: [leave] } },
};

export const d_rc_tagboard: DialogueDef = {
  id: 'd_rc_tagboard', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'rc_watch_gone' }, text: 'West Halt\'s watch board, its pegs all empty. Somebody has chalked a line through the board, top to bottom.' },
        { if: { knows: 'rc_tag_returned' }, text: 'West Halt\'s watch board: brass tags on pegs, WH 1 to WH 9, every peg full.' },
        { text: 'West Halt\'s watch board: brass tags on pegs, WH 1 to WH 9, one for each of the watch, so the halt knows who is out on the length. The peg for WH 4 is empty, and there is a pale ring on the wood where the tag usually hangs.' },
      ],
      again: 'The watch board.',
      effects: [{ lead: 'l_rc_tagboard' }],
      options: [
        { id: 'tag.return', text: '(Hang WH 4 back on its peg.)', if: { all: [{ item: 'k_rc_tag' }, { not: { knows: 'rc_tag_returned' } }] }, effects: [{ take: 'k_rc_tag' }, { learn: 'rc_tag_returned' }, { memory: { npc: 'npc_rc_02', tag: 'tag_returned', valence: 20, strength: 60 } }], exit: true },
        leave,
      ],
    },
  },
};

export const d_rc_stall_w: DialogueDef = {
  id: 'd_rc_stall_w', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A stall on the platform: a board on two crates, and on it tins with the Concern\'s closed eye stamped in the lid. TWO TOLLS, in chalk. Anywhere else on the Line a tin like that is six.',
      again: 'Concern tins, two Tolls.',
      effects: [{ lead: 'l_rc_tins' }],
      options: [{ id: 'stall.buy', text: '(Buy a tin. 2 Tolls.)', if: TOLLS(2), effects: [{ take: 'tolls', count: 2 }, { give: 'c_tin' }], next: 'look', repeat: true }, leave],
    },
  },
};

export const d_rc_south: DialogueDef = {
  id: 'd_rc_south', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The old track south: two ruts in the grass, a post with OPENFIELD burned into it, and a day\'s walk to the Choir\'s fences.', again: 'The track south to Openfield.', effects: [{ learn: 'loc_openfield' }], options: [leave] } },
};

// ---------------------------------------------------------------- Kettle Cut

export const d_rc_kt_car: DialogueDef = {
  id: 'd_rc_kt_car', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A sealed car on its side in the ditch, the Concern\'s closed eye on its door. The seal\'s wire is cut clean, not snapped, and the door was opened with a key: the lock is whole. Inside, nothing but straw and the square ghosts of crates in the dust.',
      again: 'The sealed car, opened with a key.',
      effects: [{ lead: 'l_rc_sealed' }, { learn: 'rc_car_seen' }],
      passives: [{ skill: 'mechanics', dc: 35, text: 'A carriage key: the square-section key every guard on the Line carries on a cord. Or every line-keeper.' }],
      options: [leave],
    },
  },
};

export const d_rc_kt_stock: DialogueDef = {
  id: 'd_rc_kt_stock', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The other car is not a freight car. Slatted sides, a floor scrubbed with sand, a bucket chained in the corner: a stock car. Its hasp has been sawn through from outside, quickly. Inside, scratched into the boards at the height of a sitting person, names, a dozen of them, and under the bench a child\'s shoe.',
      again: 'The stock car, the names, the shoe.',
      effects: [{ lead: 'l_rc_stockcar' }, { learn: 'rc_stockcar_seen' }],
      interject: [{ companion: WREN, text: 'Wren reads the names on the boards one by one with her finger, all of them, and then takes her hand away. She does not say whose name she was looking for.', effects: [A(WREN, 1)] }],
      options: [leave],
    },
  },
};

export const d_rc_kt_rails: DialogueDef = {
  id: 'd_rc_kt_rails', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The rails through the cut, brown with rust except where the trains keep a bright line down the middle of each.',
      again: 'The rails, rust and a bright line.',
      passives: [
        { skill: 'survival', dc: 35, text: 'A second bright line, narrower, along the inside edge of each rail: smaller wheels than any engine\'s. A handcar, often. And hobnailed boots in the ballast, coming from the west and going back west.', effects: [{ lead: 'l_rc_handcar' }] },
        { attr: 'senses', dc: 6, text: 'A second bright line along the inside of each rail, narrower than an engine\'s wheels: something small, run often, from the west. And boot prints in the ballast, hobnailed.', effects: [{ lead: 'l_rc_handcar' }] },
      ],
      interject: [{ companion: WREN, text: 'Wren squats and runs a thumb along the rail. "Handcar," she says. "Four on it, by the boots. From the west, and back west before the dew." She stands. "Halt people. Raiders don\'t have handcars."', effects: [{ lead: 'l_rc_handcar' }] }],
      options: [leave],
    },
  },
};

export const d_rc_kt_cases: DialogueDef = {
  id: 'd_rc_kt_cases', owner: 'narrator', start: [{ if: { item: 'k_rc_casings' }, node: 'taken' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'Brass in the ballast where the coach\'s last car would have stood: five spent rifle cases close together, and across the rails, on the bank, a single smaller one.',
      again: 'Brass in the ballast.',
      interject: [{ companion: ILYA, text: 'Ilya picks up one of the five and turns it in his fingers. ".308. One rifle, from up high, the roof. Five fast. Then one nine from the bank, after." He puts it down where it was. "Roof fired first. Right."', effects: [A(ILYA, 2), { learn: 'rc_ilya_read_cases' }] }],
      options: [{ id: 'cases.take', text: '(Pick them up.)', effects: [{ give: 'k_rc_casings' }, { lead: 'l_rc_casings' }], next: 'taken' }, leave],
    },
    taken: { text: 'Five .308 cases from the roof, one 9 mm from the bank, in your pocket. Five, then one.', again: 'Five, then one.', options: [leave] },
  },
};

export const d_rc_kt_blind: DialogueDef = {
  id: 'd_rc_kt_blind', owner: 'narrator', start: [{ if: { item: 'k_rc_tag' }, node: 'empty' }, { if: { knows: 'rc_tag_returned' }, node: 'empty' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'A notch dug into the north bank and walled with sandbags: a blind with a view down the cut both ways. Cigarette ends, a flattened place where people have lain on their bellies, and in the dirt under a sandbag a glint of brass: a tag on a broken loop of wire, stamped WH 4.',
      again: 'The blind, and the glint of brass.',
      options: [{ id: 'blind.take', text: '(Take the tag.)', if: { not: { knows: 'rc_tag_returned' } }, effects: [{ give: 'k_rc_tag' }, { lead: 'l_rc_tag' }], next: 'empty' }, leave],
    },
    empty: { text: 'The blind, its sandbags, the cigarette ends. A good place to lie and watch the cut both ways.', again: 'The blind.', options: [leave] },
  },
};

export const d_rc_kt_grave: DialogueDef = {
  id: 'd_rc_kt_grave', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { any: [{ flag: 'rc_abe', eq: 'hanged' }, { flag: 'rc_abe', eq: 'guild' }] }, text: 'A guild stake over a mound of red clay: HAMISH GORSE — GUARD — IN THE DISCHARGE OF HIS DUTY. Above it, from the arm of the old signal post, a rope with nothing on it now, cut at the knot.' },
        { text: 'A guild stake over a mound of red clay, stencilled: HAMISH GORSE — GUARD — IN THE DISCHARGE OF HIS DUTY. Somebody has left a cup on it, upside down, the way you leave a cup for a man who won\'t be back to drink from it.' },
      ],
      again: 'Gorse\'s stake.',
      options: [leave],
    },
  },
};

/** The watch's night run at Kettle: watch it, show yourself, or open fire (the guild's way). */
export const d_rc_kettle_night: DialogueDef = {
  id: 'd_rc_kettle_night', owner: 'npc_rc_02',
  start: [{ if: { knows: 'rc_kettle_faced' }, node: 'again' }, { node: 'run' }],
  nodes: {
    run: {
      speaker: 'narrator',
      text: 'On the rails by the wrecks, the handcar, its lamp hooded green, and four people in faded rail-crew orange: a woman with a work braid and a rifle, the key on a cord round her neck; a big man with a shotgun; a girl with a revolver; and a boy who stands a little apart from the others and keeps touching the pistol in his belt. Down the line, east, nothing yet. The through comes at two.',
      again: 'The watch on the rails, waiting for the through.',
      effects: [{ learn: 'rc_held_up' }, { lead: 'l_rc_handcar' }],
      interject: [{ companion: ILYA, text: 'Ilya is already on his belly in the blind with the rifle settled, breathing slow. "Four," he whispers. "I have the one with the braid." He does not take the safety off. "Your call."' }],
      options: [
        { id: 'night.watch', text: '(Watch from the bank and let them work.)', next: 'watched' },
        { id: 'night.show', text: '(Step out into the lamp where she can see you.)', next: 'faced' },
        { id: 'night.fire', text: '(Open fire.)', effects: AMBUSH('at Kettle Cut'), exit: true },
        leave,
      ],
    },
    watched: {
      speaker: 'narrator',
      text: 'At two the through comes round the curve at a walk and stops at the sleeper with its brakes screaming. The woman walks down it and opens one car, only one, with the key from her neck, and they carry crates of Concern controllers to the handcar in the time it takes to drink a cup of water. Then the sleeper is off, the through goes on, and they go west, pumping, the green lamp going away. Nobody saw you. Nobody was hurt.',
      again: 'The green lamp going away west.',
      effects: [{ learn: 'rc_saw_holdup' }, { learn: 'rc_kettle_faced' }, { xp: 40 }],
      options: [leave],
    },
    faced: {
      text: 'The rifle comes up and so do the shotgun and the revolver, and then the woman with the braid lifts one hand and they stop. "Nobody hurt," she says, to them, not to you. Then, to you: "The guild\'s? You don\'t look like the guild." She looks at your face as if memorising it. "Chela Ortega, West Halt\'s watch, and this is weather. Go home and tell whoever you like. We\'ll be here."',
      again: '"We\'ll be here."',
      effects: [{ learn: 'rc_kettle_faced' }, { learn: 'rc_chela_recognised' }, { learn: 'rc_chela_told' }, { learn: 'rc_watch_known' }, { set: 'rc_chela_met' }],
      interject: [{ companion: WREN, text: '"Nice lamp," Wren says. Chela looks at her, and at the burn on her hand, and lowers the rifle the rest of the way. "Dogs?" "Was." "Then you know."', effects: [A(WREN, 2)] }],
      options: [
        { id: 'night.why', text: 'Why do you do it?', next: 'why' },
        { id: 'night.fire2', text: '(Open fire.)', effects: AMBUSH('at Kettle Cut, after she had told you her name'), exit: true },
        { text: '(Go back up the bank.)', exit: true },
      ],
    },
    why: {
      text: '"Because the through goes past our halt nineteen cars long and doesn\'t blow, and the guild pays our length by the stop, and nothing stops." She nods at the crates on the handcar. "So we stop it, once a month, and the halts eat. Nobody hurt." Something crosses her face. "That was the rule. Ask Casimir Brodsky what it costs. He keeps the clock."',
      again: '"Nobody hurt. That was the rule."',
      effects: [{ learn: 'rc_why_known' }, { learn: 'rc_brodsky_known' }],
      options: [{ text: '(Go back up the bank.)', exit: true }],
    },
    again: { text: 'West Halt\'s watch on the rails by the wrecks, the green lamp, waiting for the through. Chela looks up at the bank where you are and does not lift her rifle.', again: 'The watch on the rails.', options: [{ id: 'night.fire3', text: '(Open fire.)', effects: AMBUSH('at Kettle Cut'), exit: true }, leave] },
  },
};

// ---------------------------------------------------------------- East Halt: the east length

const EAST = (v: string, text: string, extra: Effect[] = []): Effect[] => [{ set: 'rc_east', value: v }, ...extra, { decision: { id: 'rc_east', text } }];
export const EAST_STOPPED = EAST('stopped', 'You talked East Halt\'s keeper out of throwing the through off the rails at her halt. She tightened the bolts on the east length herself.', [{ xp: 120 }, A(TAMSIN, 3), A(ASH, 3)]);
export const EAST_STOOD_DOWN = EAST('stood_down', 'Once the trains stopped at the halts again, East Halt\'s keeper tightened the bolts she had loosened on the east length, and never said why.', [{ xp: 60 }]);
export const EAST_FIXED = EAST('fixed', 'You tightened the loosened bolts on East Halt\'s east length yourself, at night, and said nothing.', [{ xp: 100 }, A(NINE, 2)]);
export const EAST_TOLD = EAST('told', 'You told the stationmaster that East Halt\'s keeper was loosening her own track. His watch put her off the Line.', [{ set: 'rc_imani', value: 'gone' }, { rep: { faction: 'tollmen', respect: 3 } }, A(WREN, -5), A(ASH, -5),
  { news: { tag: 'rc_imani_off', text: 'East Halt\'s keeper was put off the Line for loosening her own length; East Halt has thirteen people now', valence: -2, size: 4, at: 'east_halt' } }]);
export const EAST_HELPED = EAST('helped', 'You helped East Halt\'s keeper loosen the east length, so that the Concern\'s through would come off the rails at her halt.', [{ rep: { faction: 'concern', respect: -5 } }, A(ASH, -10), A(TAMSIN, -10), A(ILYA, -5), A(WREN, 3)]);

const STOP_MODS = [
  { if: HALTS_PAID, dc: -15, why: 'the trains stop at the halts again, and pay' },
  { if: { knows: 'rc_gerrit_word' }, dc: -5, why: 'Gerrit will say it to her face' },
  { if: { lead: 'l_rc_kofi' }, dc: -5, why: 'Kofi saw her; he counts the cars' },
  { if: { flag: 'rc_willem_met' }, dc: -5, why: 'you have met the man who drives the through' },
];

export const d_rc_imani: DialogueDef = {
  id: 'd_rc_imani', owner: 'npc_rc_13',
  start: [{ if: { flag: 'rc_east' }, node: 'after' }, { if: { flag: 'rc_imani_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in the keeper\'s house with her sleeves pushed up, mending a lamp with wire. She does not stop. "Imani. East Halt. Fourteen of us." She looks up. "Write that down somewhere. Fourteen. Last year it was forty-five."',
      again: 'Imani, mending the lamp.',
      effects: [{ set: 'rc_imani_met' }],
      options: [
        { id: 'imani.where', text: 'Where did they go?', next: 'where' },
        { id: 'imani.bolts', text: 'Gerrit says the east length\'s bolts are backed off.', if: { knows: 'rc_bolts_heard' }, next: 'bolts' },
        bye,
      ],
    },
    again: {
      text: '"Yes?" Imani does not stop working.',
      again: 'Imani, working.',
      options: [
        { id: 'imani.where2', text: 'Where did they go?', if: { not: { seen: 'imani.where' } }, next: 'where' },
        { id: 'imani.bolts2', text: 'Gerrit says the east length\'s bolts are backed off.', if: { all: [{ knows: 'rc_bolts_heard' }, { not: { seen: 'imani.bolts' } }] }, next: 'bolts' },
        { id: 'imani.paid', text: 'The trains stop at the halts again. You don\'t need the bolts.', if: { all: [HALTS_PAID, { knows: 'rc_east_known' }] }, effects: EAST_STOOD_DOWN, next: 'stood_down' },
        { id: 'imani.know', text: 'You\'re loosening the east length yourself. To throw the through.', if: { all: [{ knows: 'rc_east_known' }, { not: HALTS_PAID }] }, next: 'plan' },
        bye,
      ],
    },
    where: { text: '"Two-Twelve, mostly. The Concern buys anyone. Meridian, some. The cemetery, some." She twists the wire. "Nobody stops here to buy water, so there is nothing to buy bread with, so people go where there is bread. The guild pays length money per stop." She looks at you. "You\'ve heard that. Everyone on the Line has heard that."', again: '"Per stop."', effects: [{ lead: 'l_rc_length' }], options: [{ text: 'Something else.', next: 'again' }] },
    bolts: { text: '"Rust." She does not look up. "Gerrit is sixty-seven and walks it every morning and finds rust every morning. It\'s an old length."', again: '"Rust."', options: [{ text: 'Something else.', next: 'again' }] },
    plan: {
      text: 'She puts the lamp down. "The through comes past at two, nineteen cars, and doesn\'t blow for us. If it came off the rails here, at the east length, the guild would have to stop at East Halt for a season to clear it. We would sell water to the gang. We would have nineteen cars of whatever the Concern sends to the city, in our ditch." She says it like a sum she has done every night. "Willem Visser drives it. I know. I\'ve known him twenty years."',
      again: '"I know. I\'ve known him twenty years."',
      interject: [{ companion: TAMSIN, text: '"He\'d die," Tamsin says. "Your friend. You\'d kill him for a ditch full of tins." Imani looks at her for a long time. "Yes," she says. "I have been telling myself that every night, too."', effects: [A(TAMSIN, 2)] }],
      options: [
        { id: 'imani.stop', text: 'Don\'t. There are other ways to make a train stop.', check: { skill: 'speech', dc: 45, mods: STOP_MODS }, effects: EAST_STOPPED, next: 'stopped', fail: 'not_stopped' },
        { id: 'imani.help', text: 'I\'ll help you.', effects: EAST_HELPED, next: 'helped' },
        { id: 'imani.tell', text: 'I\'m telling the stationmaster.', effects: EAST_TOLD, next: 'told' },
        { text: 'I need to think.', next: 'again' },
      ],
    },
    stopped: { text: 'She sits with her hands in her lap for a long time. Then she gets up and takes the long spanner off its nail and goes out to the east length in daylight, where anyone can see, and tightens every bolt she backed off, one at a time, while Gerrit stands on the platform and watches with his hat off.', again: 'The bolts, tightened.', options: [{ text: 'Something else.', next: 'after' }] },
    not_stopped: { text: '"Other ways." She picks the lamp up again. "There have been other ways for two years. Name me one that works by Thursday."', again: '"Name me one."', options: [{ text: 'Something else.', next: 'again' }] },
    stood_down: { text: '"I know." She almost smiles. "I tightened them the morning the pilot came. Gerrit watched me do it and said nothing, which from Gerrit is a speech."', again: '"I tightened them."', options: [{ text: 'Something else.', next: 'after' }] },
    helped: { text: 'She looks at you as if she had expected anything but that. Then she nods and takes you out to the east length after dark with the long spanner and a lamp, and shows you which bolts, and in what order, so that the rail will hold until something heavy comes over it at speed. "Two o\'clock," she says. "Any night now."', again: '"Two o\'clock. Any night now."', options: [{ text: 'Something else.', next: 'after' }] },
    told: { text: '"Go on, then." She goes back to the lamp. She is still mending it when Brodsky\'s watch comes for her at dawn, and she takes it with her.', again: 'The lamp.', options: [bye] },
    after: {
      text: [
        { if: { flag: 'rc_derailed' }, text: 'Imani at the platform\'s edge, looking east at the cutting where the through lies on its side, and at her halt\'s people carrying crates up out of it in a line. She does not look happy. She does not look anything.' },
        { if: { flag: 'rc_east', eq: 'helped' }, text: '"Two o\'clock," Imani says. "Any night now." She does not sleep, you think.' },
        { text: 'Imani, mending something, which is what she does. "Fourteen," she says. "Still."' },
      ],
      again: 'Imani.',
      options: [bye],
    },
  },
};

export const d_rc_gerrit: DialogueDef = {
  id: 'd_rc_gerrit', owner: 'npc_rc_14',
  start: [{ if: { flag: 'rc_gerrit_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old man with a bald brown head and a white beard to his chest, sitting on his step with a mug. "Gerrit. I keep the east length. Have done fifty years." He looks east. "Somebody\'s been at my fishplates. Two joints on the east length, bolts backed off. A rail\'s width from coming apart under a train." He drinks. "I walk it every morning. I find it every morning. I tighten it every morning."',
      again: 'Gerrit on his step, looking east.',
      effects: [{ set: 'rc_gerrit_met' }, { learn: 'rc_bolts_heard' }, { quest: 'q_rc_east', start: true }],
      options: [
        { id: 'gerrit.who', text: 'Who would do that?', next: 'who' },
        bye,
      ],
    },
    again: {
      text: '"Bolts," Gerrit says, by way of hello.',
      again: 'Gerrit, with his mug.',
      options: [
        { id: 'gerrit.who2', text: 'Who would do that?', if: { not: { seen: 'gerrit.who' } }, next: 'who' },
        { id: 'gerrit.say', text: 'Would you say so to her face?', if: { all: [{ knows: 'rc_east_known' }, { not: { knows: 'rc_gerrit_word' } }, { not: { flag: 'rc_east' } }] }, next: 'say' },
        bye,
      ],
    },
    who: { text: '"Somebody with a long spanner, who knows which bolts to leave." He looks at the keeper\'s house and does not say anything else. "A rail pulled is a rail you can\'t put back."', again: '"A rail you can\'t put back."', options: [{ text: 'Something else.', next: 'again' }] },
    say: { text: 'He is quiet a long time. "Yes," he says. "I held her on my knee when she was two. I\'ll say it." He puts the mug down. "She\'s not wicked. She\'s the last keeper of a halt nobody stops at. It\'s not the same thing, and it\'s not so different."', again: '"I\'ll say it."', effects: [{ learn: 'rc_gerrit_word' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_rc_kofi: DialogueDef = {
  id: 'd_rc_kofi', owner: 'npc_rc_15',
  start: [{ node: 'stall' }],
  nodes: {
    stall: {
      text: 'A boy of thirteen behind a board on two crates, with tins stacked on it in a careful pyramid, every one with the Concern\'s closed eye on the lid. "Tins! Two Tolls! Good tins!" He lowers his voice. "Don\'t ask where."',
      again: 'Kofi\'s pyramid of tins.',
      effects: [{ lead: 'l_rc_tins' }],
      options: [
        { id: 'kofi.buy', text: '(Buy something.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'kofi.count', text: 'You watch the trains?', if: { not: { seen: 'kofi.count' } }, next: 'count' },
        { id: 'kofi.night', text: 'Seen anybody out on the line at night?', if: { all: [{ knows: 'rc_bolts_heard' }, { not: { lead: 'l_rc_kofi' } }] }, check: { skill: 'speech', dc: 30, mods: [{ if: { knows: 'rc_tag_returned' }, dc: -5, why: 'word gets about the halts' }] }, effects: [{ lead: 'l_rc_kofi' }], next: 'night', fail: 'shrug' },
        bye,
      ],
    },
    count: { text: '"Every night. The through: nineteen cars. Sometimes eighteen." He grins. "When it\'s eighteen, there\'s tins on Saturday."', again: '"Nineteen. Sometimes eighteen."', options: [{ text: 'Something else.', next: 'stall' }] },
    night: { text: '"Imani." He says it before he can stop himself, then looks frightened. "With the long spanner and the lamp. On the east length, after the through. I wasn\'t looking. I was counting."', again: '"I was counting."', options: [{ text: 'Something else.', next: 'stall' }] },
    shrug: { text: '"No." Too fast. He rearranges the pyramid. "Tins?"', again: '"Tins?"', options: [{ text: 'Something else.', next: 'stall' }] },
  },
};

export const d_rc_accounts: DialogueDef = {
  id: 'd_rc_accounts', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'East Halt\'s accounts, open on the keeper\'s table: LENGTH MONEY in one column, a figure every week for years and then, two springs ago, a line ruled across and nothing under it. DUE TO THE GUILD — TOWER REPAIRS — in red, and growing. And down the margin, a count of people: 45, 41, 38, 31, 26, 19, 14.', again: 'The accounts. 45 to 14.', effects: [{ lead: 'l_rc_length' }], options: [leave] } },
};

export const d_rc_shed: DialogueDef = {
  id: 'd_rc_shed', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The halt\'s tool shed: picks, a jack, a box of keys and chairs, and on its nail the long track spanner, EH burned into the handle, with fresh oil on the jaws and grit in the oil.', again: 'The long spanner, freshly oiled.', effects: [{ lead: 'l_rc_spanner' }], options: [leave] } },
};

export const d_rc_joint: DialogueDef = {
  id: 'd_rc_joint', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'rc_derailed' }, text: 'The east length: two rails lifted and bent like wire where the through came off, the fishplates sheared, sleepers splintered for twenty yards.' },
        { text: 'The east length: the joint where two rails meet, the fishplate bolted across it, four bolts. Gerrit\'s bright marks where he tightened them this morning.' },
      ],
      again: 'The east length\'s joint.',
      effects: [{ quest: 'q_rc_east', start: true }],
      options: [
        { id: 'joint.look', text: '(Look at the bolts closely.)', if: { all: [{ not: { knows: 'rc_bolts_seen' } }, { not: { flag: 'rc_derailed' } }] }, check: { skill: 'mechanics', dc: 30 }, effects: [{ learn: 'rc_bolts_seen' }, { lead: 'l_rc_spanner' }], next: 'bolts', fail: 'rust' },
        { id: 'joint.fix', text: '(Tighten every bolt on the east length yourself, tonight.)', if: { all: [{ knows: 'rc_bolts_seen' }, NIGHT, { not: { flag: 'rc_east' } }] }, check: { skill: 'mechanics', dc: 35 }, effects: EAST_FIXED, next: 'fixed', fail: 'fix_no' },
        leave,
      ],
    },
    bolts: { text: 'Bright threads on two of the four: backed off and tightened, backed off and tightened, many times, with a long spanner from the inside of the rail, by somebody who knew to leave the other two so the joint would hold until something heavy came over it fast.', again: 'Bright threads.', options: [leave] },
    rust: { text: 'Rust, and Gerrit\'s marks. You cannot see anything he has not.', again: 'Rust.', options: [leave] },
    fixed: { text: 'An hour in the dark with your own spanner and a lamp shaded in your coat, every bolt on the east length brought up hard and the threads peened so they will not back off without a cold chisel. In the morning Gerrit walks the length and stands at the joint a long time, and looks at the keeper\'s house, and says nothing.', again: 'Every bolt peened.', options: [leave] },
    fix_no: { text: 'Your spanner slips on the second bolt and rings off the rail like a bell. A lamp comes on in the keeper\'s house. You go.', again: 'The lamp in the keeper\'s house.', options: [leave] },
  },
};

export const d_rc_cutting: DialogueDef = {
  id: 'd_rc_cutting', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'rc_willem_dead' }, text: 'The through on its side in the cutting east of the halt, nineteen cars in a broken zigzag and the engine at the bottom of it. East Halt\'s people are carrying crates up out of the cars in a line. There is a guild stake at the cutting\'s mouth: WILLEM VISSER — DRIVER.' },
        { if: { flag: 'rc_derailed' }, text: 'The through on its side in the cutting east of the halt, nineteen cars in a broken zigzag, the engine nose-down in the ditch at walking pace, its cab empty: Willem took it slow and jumped. East Halt\'s people are carrying crates up out of the cars in a line, and a guild gang is already re-laying the rails.' },
        { text: 'East of the platform the Line goes into a cutting toward the Teeth, and a track goes south out of it to the mines. A good place for a train to be going fast.' },
      ],
      again: 'The cutting east.',
      options: [leave],
    },
  },
};

export const HALTS_DIALOGUES: DialogueDef[] = [d_rc_chela, d_rc_abe, d_rc_socorro, d_rc_eamon, d_rc_tower, d_rc_yaw, d_rc_joaquin, d_rc_chalk, d_rc_tagboard, d_rc_stall_w, d_rc_south,
  d_rc_kt_car, d_rc_kt_stock, d_rc_kt_rails, d_rc_kt_cases, d_rc_kt_blind, d_rc_kt_grave, d_rc_kettle_night,
  d_rc_imani, d_rc_gerrit, d_rc_kofi, d_rc_accounts, d_rc_shed, d_rc_joint, d_rc_cutting];
