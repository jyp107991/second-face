import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

/**
 * Act 2 wilds, B5b: the Drowned Shore. The shore's line (Oil on the Water: the Stilt Court, the Rigs, Blackcap), the man the
 * sea took (Stilt Court), the false light on the Jesty, and the dives as a repeatable activity. Nothing here has a date: the
 * court sits when the player calls it, the man at the Landing waits, the bounty waits, the bottom is there at every slack.
 * Story notes: story/B5b_NOTES_SECRET.md.
 */

const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const CLAIM = (v: string): Cond => F('ds_claim', v);
const COURT = (v: string): Cond => F('ds_court', v);
const LIGHT = (v: string): Cond => F('ds_light', v);
const CLAIM_ENDS = [
  { if: CLAIM('guild'), stage: 'ruled_guild' }, { if: CLAIM('sea'), stage: 'ruled_sea' }, { if: CLAIM('rig'), stage: 'taking' },
];
const COURT_ENDS = [
  { if: COURT('living'), stage: 'living' }, { if: COURT('sold'), stage: 'sold' }, { if: COURT('written'), stage: 'written' }, { if: COURT('quiet'), stage: 'quiet' },
];
const LIGHT_ENDS = [
  { if: LIGHT('exposed'), stage: 'exposed' }, { if: LIGHT('court'), stage: 'court' }, { if: LIGHT('stopped'), stage: 'stopped' }, { if: LIGHT('framed'), stage: 'framed' },
];
const GUILD_KNOWN: Cond = { any: [{ knows: 'ds_guild_seal' }, { knows: 'ds_two_for_one' }, { concluded: 'c_ds_guild_line' }, F('ds_marek_word'), { knows: 'ds_manual' }] };

export const q_ds_sheen: QuestDef = {
  id: 'q_ds_sheen', title: 'Oil on the Water', act: 'a2', start: 'burial', xp: 300,
  routes: [
    { id: 'court', kind: 'talk', label: 'Stand up at the Stilt Court with what the water knows', requires: { skill: 'speech', gte: 30 } },
    { id: 'valve', kind: 'tech', label: 'Down Hum\'s leg to the export valve: shut it, or sleeve it to run clean', requires: { skill: 'mechanics', gte: 35 } },
    { id: 'dive', kind: 'survival', label: 'Dive for Kai\'s net under the Gut, and down Hum\'s leg', requires: { skill: 'survival', gte: 35 } },
    { id: 'tally', kind: 'stealth', label: 'The tide post\'s box at night: the factor\'s day-book', requires: { skill: 'security', gte: 45 } },
    { id: 'board', kind: 'knowledge', label: 'Hum\'s board, the pressure log and the night barge: put it together' },
    { id: 'price', kind: 'barter', label: 'Make the guild pay the price of a barge before the whole village', requires: { skill: 'barter', gte: 45 } },
    { id: 'barge', kind: 'fight', label: 'The guild\'s night barge at Blackcap' },
  ],
  stages: {
    burial: {
      journal: 'Gull Stilts: a fishing village on stilts over a drowned town, with a skin on the water like a bruise. The day I came, a boy of eleven went out on the ebb off the old steps: Kai Tanoa, who dove under the boardwalks for his mother\'s net and did not come up. His mother says the Rigs\' oil killed him, and has called the Stilt Court.',
      objectives: [
        { id: 'lua', text: 'Speak to Kai\'s mother', done: F('ds_lua_met') },
        { id: 'oona', text: 'Find whoever keeps the court', done: F('ds_oona_met') },
      ],
      next: [{ if: { all: [F('ds_lua_met'), F('ds_oona_met')] }, stage: 'claim' }, ...CLAIM_ENDS],
    },
    claim: {
      journal: 'Oona Brack keeps the Book of Water on a grounded ferry, the Greta, and the court sits on her car deck. Page nine: a life for a life, or a boat for a life. The court will hear Lua Tanoa\'s claim against the Rigs when somebody stands up with what the water knows: who fouled it, and that they knew. Everybody on the Stilts says the Rig. Saying is cheap.',
      objectives: [
        { id: 'source', text: 'Find where the oil comes from', done: { any: [{ knows: 'ds_sheen_source' }, { knows: 'ds_old_line' }] } },
        { id: 'rigs', text: 'See the Rigs for yourself', done: { any: [{ knows: 'ds_rigs_seen' }, F('visited_ds_rigs')] } },
        { id: 'net', text: 'Find Kai\'s net under the Gut', done: { any: [{ item: 'k_ds_net' }, F('ds_net_up')] }, optional: true },
      ],
      next: [{ if: { knows: 'ds_line_open' }, stage: 'hum' }, ...CLAIM_ENDS],
    },
    hum: {
      journal: 'Hum, the platform that still pumps, has an old export line to a drowned tank at Blackcap, and its board reads it open. Hamid Farouk, who keeps Hum, says the line was cut before he was born and the board lies; his daughter says the pressure has fallen eleven points since the thaw because something is drinking. The valve is down Hum\'s north-east leg, under the water.',
      objectives: [
        { id: 'valve', text: 'Go down Hum\'s north-east leg to the export valve', done: { any: [F('ds_valve_seen'), { knows: 'ds_guild_seal' }] } },
      ],
      next: [{ if: GUILD_KNOWN, stage: 'seal' }, ...CLAIM_ENDS],
    },
    seal: {
      journal: 'Nobody on Hum opened the line. The guild did: its diver went down the leg at night and turned the export wheel, and sealed it TOLLMEN — LINE ACCOUNT, so Hum\'s oil runs under the Stilts to the guild\'s tank at Blackcap, and the guild\'s barge loads two tankers a month for the price of one. The old line leaks at every joint. The factor calls it shrinkage. The tide post is also the shore\'s only buyer of fish and seller of salt and medicine, and its anchorage is half the widows\' bread.',
      objectives: [
        { id: 'proof', text: 'Something the court can hold: the seal, the post\'s tally, the barge\'s manifest, the guild\'s diver', done: { any: [{ item: 'k_ds_seal' }, { item: 'k_ds_tally' }, { item: 'k_ds_manifest' }, F('ds_marek_word')] }, optional: true },
        { id: 'valve', text: 'Decide what to do with Hum\'s export valve', done: F('ds_valve'), optional: true },
        { id: 'court', text: 'Have Oona call the court on Lua\'s claim', done: F('ds_claim') },
      ],
      next: CLAIM_ENDS,
    },
    ruled_guild: {
      journal: 'The Stilt Court found the guild had opened Hum\'s line and that Kai Tanoa drowned in what it leaked. A boat for a life: the guild paid. Hum\'s crew keep Hum, and the guild buys one tanker from their deck. Whatever else the shore has lost by it, the Book says what happened.',
      end: 'done',
    },
    ruled_sea: {
      journal: 'The Stilt Court found the sea had taken Kai Tanoa. His mother walked off the Greta and out of Gull Stilts. The guild\'s barge loads at Blackcap at night, and the water under the Gut is black.',
      end: 'done',
    },
    taking: {
      journal: 'The Stilt Court found Hum\'s oil had killed Kai Tanoa and gave the Rig to Gull Stilts for his life. Page three: anything that floats and works is a boat. The Stilts\' boats are going out to take Hum from forty people who have never lived anywhere else.',
      objectives: [{ id: 'hum', text: 'Be on Hum when the Stilts\' boats come', done: F('ds_hamid') }],
      next: [{ if: F('ds_hamid', 'left'), stage: 'ruled_rig' }, { if: { dead: 'npc_ds_10' }, stage: 'ruled_rig_blood' }],
    },
    ruled_rig: {
      journal: 'Hamid Farouk took Hum\'s crew off the platform before the Stilts\' boats came, and went up the delta for the Line. Hum is Gull Stilts\' now. The turbine still hums. Somebody on the Stilts will have to learn how not to let her stop.',
      end: 'done',
    },
    ruled_rig_blood: {
      journal: 'Hamid Farouk would not give Hum up, and the Stilts took her off him. He is dead on his own deck. Hum is Gull Stilts\' now, and the crew that is left works her for the village, and does not speak to anyone from it.',
      onEnter: [
        { set: 'ds_hamid', value: 'dead' }, { set: 'ds_rig', value: 'stilts' },
        { decision: { id: 'ds_rig_stilts', text: 'Gull Stilts took Hum by force; Hamid Farouk died on his own deck.' } },
        { news: { tag: 'ds_rig_taken', text: 'Gull Stilts took the Rigs by force; the old keeper died on his deck', valence: -6, size: 7, at: 'rigs' } },
      ],
      end: 'done',
    },
  },
};

export const q_ds_court: QuestDef = {
  id: 'q_ds_court', title: 'Stilt Court', act: 'a2', start: 'back', xp: 200,
  routes: [
    { id: 'living', kind: 'talk', label: 'Argue that the water gave him back', requires: { skill: 'speech', gte: 35 } },
    { id: 'tally', kind: 'stealth', label: 'The guild\'s collections in the tide post\'s day-book', requires: { skill: 'security', gte: 45 } },
    { id: 'oars', kind: 'knowledge', label: 'The Curlew\'s oars, the brand on his wrist, the patch on her bow' },
    { id: 'confess', kind: 'talk', label: 'Make the finder say it', requires: { skill: 'speech', gte: 50 } },
    { id: 'quiet', kind: 'barter', label: 'Buy him a skiff and send him up the delta' },
  ],
  stages: {
    back: {
      journal: 'A man walked into Gull Stilts on the Meridian road whom the Book of Water says drowned two years ago: Mateo Ibarra. His boat, the Curlew, was found adrift with his coat aboard and went to its finder by page twelve; the finder married his wife.',
      objectives: [{ id: 'mateo', text: 'Talk to the man at the Landing', done: F('ds_mateo_met') }],
      next: [{ if: F('ds_mateo_met'), stage: 'book' }, ...COURT_ENDS],
    },
    book: {
      journal: 'Mateo wants his boat and his wife, if she wants him. The Book says what the water takes is the water\'s, and a boat found on the water is the finder\'s. Nuno Sousa found the Curlew and married Paz; they have a baby. The court will hear Mateo if he stands up and asks.',
      objectives: [
        { id: 'where', text: 'Find out where Mateo has been for two years', done: { knows: 'ds_mateo_where' } },
        { id: 'paz', text: 'Talk to Paz', done: F('ds_paz_met') },
        { id: 'nuno', text: 'Talk to Nuno Sousa', done: F('ds_nuno_met') },
        { id: 'court', text: 'Have Oona call the court for him', done: F('ds_court'), optional: true },
      ],
      next: [{ if: { any: [{ knows: 'ds_tally_press' }, F('ds_nuno_confessed'), { concluded: 'c_ds_sold' }] }, stage: 'turn' }, ...COURT_ENDS],
    },
    turn: {
      journal: 'Mateo never went in the water. The guild\'s press took him off the Gut at night for three hundred Tolls owed at the tide post and sold him to its own barges, and set the Curlew adrift with his coat aboard so the shore would write him drowned. Nuno Sousa told them where he slept. The Curlew was his fee. Paz does not know.',
      objectives: [{ id: 'court', text: 'Settle it: at the court, or outside it', done: F('ds_court') }],
      next: COURT_ENDS,
    },
    living: { journal: 'The Stilt Court wrote a new page: what the water gives back is not the water\'s. The Curlew is Mateo\'s again, and Paz was asked, for once, and answered for herself.', end: 'done' },
    sold: { journal: 'The court heard that Nuno Sousa sold his neighbour to the press for a boat, and put him off the stilts. Paz lives alone with the baby. Mateo moors the Curlew under her loft and waits.', end: 'done' },
    written: { journal: 'The court kept page twelve: Mateo Ibarra is still the water\'s. He went out to the Rigs, where they take anyone who can carry, and from Hum\'s flare stack you can see the Curlew if you know where to look.', end: 'done' },
    quiet: { journal: 'I paid for a skiff and Mateo Ibarra rowed up the delta again, and left Paz be. She will never know what Nuno did, unless somebody tells her. Nobody on the Stilts is going to.', end: 'done' },
  },
};

export const q_ds_light: QuestDef = {
  id: 'q_ds_light', title: 'False Light', act: 'a2', start: 'wreck', xp: 200,
  routes: [
    { id: 'clues', kind: 'knowledge', label: 'Lean\'s cut gas line, the soot on the Jesty, the Book of wrecks' },
    { id: 'eyes', kind: 'survival', label: 'Read the wreck\'s heading and the parapet', requires: { skill: 'survival', gte: 30 } },
    { id: 'stop', kind: 'talk', label: 'Make the wrecker stop, and nobody need know', requires: { skill: 'speech', gte: 50 } },
    { id: 'court', kind: 'talk', label: 'Bring it to the Stilt Court instead of the guild', requires: { skill: 'speech', gte: 30 } },
    { id: 'bounty', kind: 'barter', label: 'Sell the guild a name' },
  ],
  stages: {
    wreck: {
      journal: 'A guild salt barge lies broken on the Jesty, a drowned hotel\'s roof, and two of her men drowned in the fog. The factor at the tide post offers a hundred for the wreckers who hung a lamp on the roof where no lamp should be, while Lean\'s light was dark. The Stilts\' divers are stripping the wreck by salvage right: what the water wrecks, the water gives.',
      objectives: [
        { id: 'lamp', text: 'Find out why Lean\'s light was dark', done: { lead: 'l_ds_lamp_cut' } },
        { id: 'soot', text: 'Search the Jesty\'s parapet', done: { lead: 'l_ds_soot' } },
        { id: 'wrecks', text: 'Read the wrecks in the Book of Water', done: { lead: 'l_ds_wrecks' } },
      ],
      next: [{ if: { knows: 'ds_coker_wrecker' }, stage: 'turn' }, ...LIGHT_ENDS],
    },
    turn: {
      journal: 'Yewande Coker, the dive master. Since the sheen killed the fish she has put out Lean\'s light in fog and hung her own on the Jesty, and the guild\'s barges steer for it like home; her divers strip them for the salt and twine and medicine the post sells at a usurer\'s price, and Gull Stilts has eaten this season on it. The two bargemen are the first dead. Her daughter rows the lamp out.',
      objectives: [{ id: 'settle', text: 'Decide who judges the false light', done: F('ds_light') }],
      next: LIGHT_ENDS,
    },
    exposed: { journal: 'I gave Yewande Coker to the guild for a hundred Tolls. She gave herself up at the tide post so that nobody would ask about her girl, and the guild hanged her from the post at dawn. Ade Bankole keeps the dive stage now.', end: 'done' },
    court: { journal: 'The Stilt Court judged the false light, not the guild. It took Yewande Coker\'s boat, and her salvage for the drowned men\'s kin, and did what it decided with the rest of her. The guild did not get its hanging.', end: 'done' },
    stopped: { journal: 'Yewande dropped the lamp off her stage into Ellery and watched it go down. Nobody but me knows she ever hung it. The guild\'s notice stays on the board until the salt crusts it over.', end: 'done' },
    framed: { journal: 'I gave the guild Ewan Tulloch, Lean\'s lamp-keeper, whose light was dark because somebody cut his line. They hanged him from the tide post at dawn. Yewande Coker does not look at me.', end: 'done' },
  },
};

export const q_ds_dives: QuestDef = {
  id: 'q_ds_dives', title: 'Diving Ellery', act: 'a2', start: 'first', xp: 120,
  routes: [
    { id: 'hose', kind: 'survival', label: 'On Coker\'s hose at slack water', requires: { skill: 'survival', gte: 25 } },
    { id: 'bag', kind: 'barter', label: 'Buy a diving bag and breathe your own air' },
  ],
  stages: {
    first: {
      journal: 'Yewande Coker takes divers down to Ellery, the drowned town under Gull Stilts, at slack water: six Tolls on her hose for the roofs, and you keep what you bring up. The city\'s tide table at the Landing says when the water is slack.',
      objectives: [{ id: 'roofs', text: 'Dive Ellery\'s roofs', done: F('ds_dived_roofs') }],
      next: [{ if: F('ds_dived_roofs'), stage: 'more' }],
    },
    more: {
      journal: 'Ellery gives what she has once, and then less. The high street is eight fathoms down, past the roofs; Hum\'s crew dive the legs of Stump, out at the Rigs, sixty feet and more, for the boards and controllers the platform\'s builders left in the dark.',
      objectives: [
        { id: 'street', text: 'Dive the high street', done: F('ds_dived_street') },
        { id: 'legs', text: 'Dive Stump\'s legs at the Rigs', done: F('ds_dived_legs') },
      ],
      next: [{ if: { all: [F('ds_dived_street'), F('ds_dived_legs')] }, stage: 'done' }],
    },
    done: { journal: 'I have dived all three: the roofs, the high street and Hum\'s legs. They still give, a little, at every slack.', end: 'done' },
  },
};

export const SHORE_QUESTS: QuestDef[] = [q_ds_sheen, q_ds_court, q_ds_light, q_ds_dives];
