import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

/**
 * Act 2, B5b's last piece: Carrick, Meridian's docks across the dry river. The district's line (Crane Six: a box fell and a
 * man under it, and the Harbour court on the Customs House steps), a girl off the through (Mirela's Paper), and the Crown's
 * road coming down on the Hulls (Stakes on the Hulls). Nothing has a date: the court sits when the player calls it, the
 * stoppage waits on the Stand at dawn for as long as it takes, the stakes wait for the masters. Story notes:
 * story/B5b_NOTES_SECRET.md (Carrick).
 */

const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const CRANE = (v: string): Cond => F('dk_crane', v);
const GIRL = (v: string): Cond => F('dk_girl', v);
const HULLS = (v: string): Cond => F('dk_hulls', v);
const CRANE_ENDS = [
  { if: CRANE('bond'), stage: 'bond' }, { if: CRANE('gang'), stage: 'gang' }, { if: CRANE('guild'), stage: 'guild' }, { if: CRANE('bought'), stage: 'bought' },
  { if: CRANE('black'), stage: 'stoppage' },
];
const GIRL_ENDS = [
  { if: GIRL('returned'), stage: 'returned' }, { if: GIRL('shore'), stage: 'shore' }, { if: GIRL('choir'), stage: 'choir' }, { if: GIRL('bought'), stage: 'bought' }, { if: GIRL('ruled'), stage: 'ruled' },
];
const HULLS_ENDS = [
  { if: HULLS('cleared'), stage: 'cleared' }, { if: HULLS('crewed'), stage: 'crewed' }, { if: HULLS('sold'), stage: 'sold' }, { if: HULLS('moved'), stage: 'moved' },
];
const KNOWS_OVERRIDE: Cond = { any: [{ knows: 'dk_override' }, { knows: 'dk_paid' }] };

export const q_dk_crane: QuestDef = {
  id: 'q_dk_crane', title: 'Crane Six', act: 'a2', start: 'fallen', xp: 300,
  routes: [
    { id: 'court', kind: 'talk', label: 'Lay what happened before the Harbour court on the Customs House steps', requires: { skill: 'speech', gte: 35 } },
    { id: 'clues', kind: 'knowledge', label: 'The box\'s weight, the crane\'s tape, the dead man\'s tin: put it together' },
    { id: 'cab', kind: 'tech', label: 'Read the load tape in Crane Six\'s cab', requires: { skill: 'mechanics', gte: 30 } },
    { id: 'desk', kind: 'stealth', label: 'The bond officer\'s drawer, at night', requires: { skill: 'security', gte: 45 } },
    { id: 'stand', kind: 'talk', label: 'Bring the Stand to black the Bond', requires: { skill: 'speech', gte: 40 } },
    { id: 'money', kind: 'barter', label: 'Sell what you found to whoever pays' },
    { id: 'breakers', kind: 'fight', label: 'Stand on the line against the guild\'s hired men' },
  ],
  stages: {
    fallen: {
      journal: 'At Carrick, Meridian\'s docks across the dry river, a box fell from Crane Six in the night onto the man under it: Dmytro Lysenko, the night gang\'s hooker-on. The guild\'s tally board says he unlatched the spreader wrong, and has stood his gang down without pay and his widow without a funeral tally. Constance Okoye, who speaks for the dockers at the Stand, says Dmytro never unlatched a box wrong in eleven years.',
      objectives: [
        { id: 'connie', text: 'Talk to Constance Okoye at the Stand', done: F('dk_connie_met') },
        { id: 'box', text: 'Look at the box', done: { lead: 'l_dk_box' } },
      ],
      next: [{ if: { all: [F('dk_connie_met'), { lead: 'l_dk_box' }] }, stage: 'digging' }, ...CRANE_ENDS],
    },
    digging: {
      journal: 'The box is stencilled fourteen tonnes and weighed thirty. The Harbour Master, Factor Henrike Dahl, hears the quay\'s quarrels on the Customs House steps at the change of shift, and she will hear Gang Nine\'s appeal when somebody brings her what happened. Crane Six has a cutout that should refuse a load like that.',
      objectives: [
        { id: 'tape', text: 'Find out why Crane Six lifted it', done: { lead: 'l_dk_tape' } },
        { id: 'oksana', text: 'Talk to the widow', done: F('dk_oksana_met') },
        { id: 'platt', text: 'Talk to the night gang-master', done: F('dk_platt_met') },
        { id: 'weigh', text: 'Ask why nobody weighed it', done: { lead: 'l_dk_unweighed' }, optional: true },
      ],
      next: [{ if: KNOWS_OVERRIDE, stage: 'override' }, ...CRANE_ENDS],
    },
    override: {
      journal: 'Somebody turned Crane Six\'s overload cutout off with the night key a minute before the spreader let go. The night key is the gang-master\'s, and Mattias Platt says it never left his belt. The guild bills the Concern\'s freight by the ton and has not weighed a box off the through in two years.',
      objectives: [{ id: 'who', text: 'Find out who turned the key', done: { knows: 'dk_paid' } }],
      next: [{ if: { knows: 'dk_paid' }, stage: 'turn' }, ...CRANE_ENDS],
    },
    turn: {
      journal: 'Dmytro turned it himself, with a key he had cut, on the Bond\'s night pass. The Concern\'s bond officer pays a hand on the night gang to lift its boxes past Crane Six\'s cutout, because its boxes are billed at half their weight and a box the cutout refuses would have to be weighed; Dmytro took his pay in the blue inhalers his daughter breathes through. The guild\'s verdict is true, and a lie. The dockers\' grievance is just, and wrong. And the man who paid sits in the Bond, where by the Harbour Act the Harbour Master\'s word stops at the fence.',
      objectives: [{ id: 'settle', text: 'Decide what the quay is told, and by whom', done: F('dk_crane') }],
      next: CRANE_ENDS,
    },
    stoppage: {
      journal: 'The Stand has blacked the Bond: no docker on the quay will touch a Concern box until the Concern pays for Dmytro and its boxes go over the weighbridge. Sealed boxes stack up under the Bond\'s white lights and the through waits at the yard throat. The guild has sent to the Ring for men who will work a crane for a day\'s pay, and they will be on the Stand at dawn.',
      objectives: [{ id: 'dawn', text: 'Be on the Stand at dawn when the hired men come', done: F('dk_black') }],
      next: [{ if: F('dk_black', 'won'), stage: 'black_won' }, { if: F('dk_black', 'broken'), stage: 'black_broken' }],
    },
    bond: {
      journal: 'I put the whole of it before the Harbour court: the box\'s weight, the tape, the tin. Factor Dahl found that Dmytro Lysenko turned the cutout at the Bond\'s pay, and that the guild\'s weighbridge had been blind to the through for two years by its own order. Every Concern box goes over the plate now. Gang Nine stands on the line again. Dmytro\'s name is the name of the man who sold the cutout.',
      end: 'done',
    },
    gang: {
      journal: 'I argued Gang Nine\'s appeal on the short gang, and kept the tin out of it. Factor Dahl found that a gang worked five where the crane needs eight is the master\'s fault and not the hand\'s, and paid the funeral tally out of the guild\'s own box. The quay thinks the guild killed Dmytro. The Bond\'s boxes still go unweighed, and somebody else on the night gang has a key now.',
      end: 'done',
    },
    guild: {
      journal: 'I gave Factor Dahl the tin in her office with the door shut. She thanked me, paid a finder\'s fee, and sent the Concern a bill for two years of back-freight in a sealed envelope. The tally board still says DOCKER\'S NEGLIGENCE. Gang Nine is still stood down. The guild has what it wanted, which was to know.',
      end: 'done',
    },
    bought: {
      journal: 'Lucien Roux paid me for what I had found, and nobody else will see it. The tally board says what it said. Gang Nine is off the line, and Oksana Lysenko has moved her girl down to the Hulls. Somewhere on the night gang there is a new key.',
      end: 'done',
    },
    black_won: {
      journal: 'The Ring\'s men went home. The Concern paid Oksana Lysenko the price of a funeral and a season, through the guild, without a word; its boxes go over the weighbridge now, and Gang Nine stands on the line. The Stand found out what it is when it stands together. So did the guild, and the Bond.',
      end: 'done',
    },
    black_broken: {
      journal: 'The stoppage broke on the Stand at dawn. The Ring\'s men worked Crane Six for a day\'s pay and the Bond\'s boxes moved. Gang Nine is off the line for good, and Constance Okoye does not stand on it any more; she drives Crane Two and says nothing to anybody.',
      end: 'done',
    },
  },
};

export const q_dk_girl: QuestDef = {
  id: 'q_dk_girl', title: 'Mirela\'s Paper', act: 'a2', start: 'notice', xp: 200,
  routes: [
    { id: 'shore', kind: 'survival', label: 'Down the delta on the tide boat, where nobody reads the Concern\'s paper' },
    { id: 'south', kind: 'survival', label: 'The Line to West Halt and the track south to the Choir by night', requires: { skill: 'survival', gte: 30 } },
    { id: 'buy', kind: 'barter', label: 'Buy her paper from the bond officer', requires: { skill: 'barter', gte: 30 } },
    { id: 'court', kind: 'talk', label: 'Ask the Harbour court whether a person can be under bond', requires: { skill: 'speech', gte: 40 } },
    { id: 'reward', kind: 'barter', label: 'Take the Bond\'s sixty' },
  ],
  stages: {
    notice: {
      journal: 'A notice on the guild floor\'s door at Carrick, in the Concern\'s clean type: RETURNABLE LOST FROM BOND — ONE — REWARD 60. The dockers say something came off the through in an empty box last week, and that it was not a thing.',
      objectives: [{ id: 'find', text: 'Find out what the Bond has lost', done: F('dk_mirela_met') }],
      next: [{ if: F('dk_mirela_met'), stage: 'found' }, ...GIRL_ENDS],
    },
    found: {
      journal: 'Mirela Stan, fifteen, from the Skirts, rode six days west in the dark in a box of spares, and Espe hides her at the back of the cookshop. The Bond calls her a returnable. Its officer will pay sixty for her, and put her on the through east.',
      objectives: [{ id: 'paper', text: 'Find out what a returnable is', done: { lead: 'l_dk_surety' } }],
      next: [{ if: { lead: 'l_dk_surety' }, stage: 'paper' }, ...GIRL_ENDS],
    },
    paper: {
      journal: 'She is the surety on her mother\'s Concern contract: returnable on default or flight. Her flight is the default. Her mother wrote GO on the back of the paper. Wherever Mirela goes, the Concern\'s paper says what it says.',
      objectives: [{ id: 'where', text: 'Decide with her where she goes', done: F('dk_girl') }],
      next: GIRL_ENDS,
    },
    returned: { journal: 'I took the Bond\'s sixty. Mirela Stan went back east on the through, returnable, in the kind of box she came in.', end: 'done' },
    shore: { journal: 'Mirela went down the delta on the tide boat to Gull Stilts, where the water keeps no paper. The Concern\'s paper went with her, folded small in her coat.', end: 'done' },
    choir: { journal: 'Mirela rode the seven o\'clock east to West Halt and walked south by the track at night to Openfield, where the Choir takes anyone the sky can see. Her paper says what it says. Nobody at Openfield can read it.', end: 'done' },
    bought: { journal: 'I bought Mirela\'s paper off the Bond. The surety is paid, her mother\'s contract is whole, and the paper is hers to burn. She burned it in Espe\'s stove and stayed to wash pots, for wages.', end: 'done' },
    ruled: { journal: 'The Harbour court found that a person is not goods under the Harbour Act, and cannot be under bond. In Carrick Mirela Stan is a passenger who owes her fare, which I paid. On the quay, the Concern\'s paper is waste. In the Skirts it is still a contract.', end: 'done' },
  },
};

export const q_dk_far: QuestDef = {
  id: 'q_dk_far', title: 'Stakes on the Hulls', act: 'a2', start: 'stakes', xp: 200,
  routes: [
    { id: 'court', kind: 'talk', label: 'The Harbour Act and the crew books before the Harbour court', requires: { skill: 'speech', gte: 35 } },
    { id: 'footing', kind: 'tech', label: 'Find the old tram bridge\'s footing and re-site the abutment', requires: { skill: 'science', gte: 40 } },
    { id: 'price', kind: 'barter', label: 'Make House Vane pay a real price for all nine hulls together', requires: { skill: 'barter', gte: 45 } },
    { id: 'marks', kind: 'barter', label: 'Carry House Vane\'s purse to the masters who have not signed' },
  ],
  stages: {
    stakes: {
      journal: 'On the dry bed under Carrick\'s river wall, nine pre-war ships sit where the river left them ninety years ago, and three hundred people live in them: the Hulls. House Vane\'s surveyor has driven blue stakes among them for the far end of the Crown\'s new bridge, and the Harbour Master has leased the berths to the house for works.',
      objectives: [
        { id: 'kobby', text: 'Talk to whoever speaks for the Hulls', done: F('dk_kobby_met') },
        { id: 'imogen', text: 'Talk to House Vane\'s surveyor', done: F('dk_imogen_met') },
        { id: 'notice', text: 'Read the Harbour\'s notice', done: { lead: 'l_dk_lease' } },
      ],
      next: [{ if: { all: [F('dk_kobby_met'), F('dk_imogen_met')] }, stage: 'masters' }, ...HULLS_ENDS],
    },
    masters: {
      journal: 'The bridge\'s far end has to land on the Hulls\' bed because the old bridge\'s pier footing is there, and the Crown wants its road to the Docks so its freight comes up into the city without going round by the Wall, or past the gate\'s lens. The Hulls\' living is the cradle, a basket on a wire over the bed to Bridgeward at night. House Vane is not evicting anyone: it is buying the hulls\' masters\' marks on papers of abandonment, forty Tolls a hull, and three have signed.',
      objectives: [{ id: 'settle', text: 'Decide what happens to the Hulls', done: F('dk_hulls') }],
      next: HULLS_ENDS,
    },
    cleared: { journal: 'The masters signed and the Hulls were abandoned on paper, and then in fact: the Harbour Master\'s men cleared the berths at dawn and three hundred people carried their bedding up the river stairs into the Boxes. The cradle\'s cable is cut. House Vane\'s far end has its ground.', end: 'done' },
    crewed: { journal: 'The Harbour court read Schedule 3 and the crew books, and found that a crewed vessel in port cannot be moved by a lease. The Hulls stay. The cradle runs at night. House Vane\'s stakes are still in the bed, waiting for a master who will sign.', end: 'done' },
    sold: { journal: 'The nine masters sold the Hulls to House Vane together, at three times the house\'s price, and walked up the river stairs with the money in a bag between two of them. The cradle went with the berths. Some of the Hulls bought boxes on the quay; some went over into the city the way they used to send everyone else.', end: 'done' },
    moved: { journal: 'Imogen Thrale moved the far end downstream to the old tram bridge\'s footing, under the edge of the Concern\'s Bond. The Hulls stay. House Vane and the Concern now want the same hundred metres of quay.', end: 'done' },
  },
};

export const DOCKS_QUESTS: QuestDef[] = [q_dk_crane, q_dk_girl, q_dk_far];
