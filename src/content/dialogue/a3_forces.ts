import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  A3_OPEN, ASH, ASH_REFUSED, ASH_WITH_UNWRITTEN, GUILD_IN_PLAY, HALE, HALE_HERE, HOUNDS_IN_PLAY, ILYA, IN, KES, LOWE_DEAD, MASON_DEAD, MASON_EXILED,
  MASON_SCARRED, NINE, ODILE, OPENFIELD, ORME, PETRA, PETRA_DEAD, PETRA_DOWN, PETRA_KNIFE, PETRA_TAKEN, SARR_DEAD, TAMSIN, WREN,
} from '../world/a3_conds';

/**
 * Knock at night (B6g, Act 3 beat 20a–20b): the forces camped round the home hamlet besides the column. Written whole over
 * the first meetings B6f placed.
 *
 * - **The Unwritten** (`d_a3_petra`): three of them by night at the dark west end of the apron, beside the grate in the rock
 *   that is the Cistern's air intake. Petra Mason leads them, or Juniper Lowry (`npc_a3_u1`) if Petra is dead; the tree
 *   holds both, node for node (`p_*` and `j_*`). They have come to burn the count: the Archive and MOTHER's panel, so the
 *   reserve can never be counted or moved. Their rule is to say it to the face of the one it is done in front of, and to do
 *   it only with that person on the slope, which is why nothing happens until the player comes and answers. The turn:
 *   MOTHER turns the fans behind that grate, so a fire there forces the door open for the column. The answers set
 *   `a3_unwritten`: turned to the city's book under the Spire (`with_you`, Speech 50), sent home (`gone`, Speech 40), their
 *   lamp and oil lifted in the dark (`stopped`, Stealth 45), drawn on (`stopped` once the three are down), or let go down the
 *   grate (`burning`: world event `a3_burning` burns MOTHER's panel and the Archive the next time the clock passes two with
 *   the player at Knock). The other two have short trees: Thaddeus Wolde (`d_a3_thaddeus`), born in the Precinct's supply
 *   lines; Rhoda Kalder (`d_a3_rhoda`), who printed toll-card faces for the guild and can be brought to set the oil aside.
 * - **Factor Orme** (`d_a3_orme`): the stand's trade, and, with the guild in play, its buyer's paper: the reserve as Concern
 *   intake at the Weighhouse, forty Tolls a head, on the designate's signature. Taken (`a3_guild` = paper_held, item
 *   `k_a3_intake`), refused, or torn.
 * - **Brannick Hale** (`d_a3_hale`): the outrider who burned the post-house, now the guild's possession man for the paper. He
 *   came to stand in front of Maud; she decides (`a3_hale` = answered: he rebuilds the house and walks nobody up the road;
 *   gone), or the player draws on him (`dead`).
 * - **The hound handlers** (`d_a3_handlers`), with the guild's hounds when it brought them.
 * - The scene of the burning (`d_a3_burning`, opened by the world event) and the dark Grille after it (`GRILLE_BURNED_*`,
 *   spread into `d_a3_grille`).
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (20a, 20b) and "As built" → B6g.
 */

const F = (flag: string, eq?: string | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const KNOWS = (k: string): Cond => ({ knows: k });
const SEEN = (id: string): Cond => ({ seen: id });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TRUST = (npc: string, by: number): Effect => ({ trust: { npc, by } });

const U1 = 'npc_a3_u1', U2 = 'npc_a3_u2', U3 = 'npc_a3_u3', G11 = 'npc_a3_g11', G12 = 'npc_a3_g12';
const MAUD = 'npc_kn_maud', PELL = 'npc_c9_02', HALE_A3 = 'npc_kn_out_lead_a3';
const TAM_OUT: Cond = ANY(F('tam_out'), KNOWS('tamsin_replied'));
const TAM_INSIDE: Cond = ALL(F('c9_tamsin_inside'), NOT(TAM_OUT));
const SCARRED: Cond = F('kn_maud_scarred');

// ---------------------------------------------------------------- the Unwritten: where they are (gen_knock.py mirrors these)

/** By night, from the order on. */
export const UW_NIGHT: Cond = ALL(A3_OPEN, { hour: { from: 21, to: 4 } });
/** Still waiting for the designate's answer, or told to go ahead and not yet gone down; not once the reserve is out of the
 * door (opened, or carried off), since what they came to burn is a reserve. */
export const UW_WAITING: Cond = ALL(
  ANY(NOT(F('a3_unwritten')), ALL(F('a3_unwritten', 'burning'), NOT({ event: 'a3_burning' }))),
  NOT(ANY(F('a3_c9', 'opened'), F('a3_c9', 'relocated'))),
);
/** Drawn on: placed at any hour (and hostile) until the after-trigger settles it. `a3_uw_fight` holds who led (petra | juniper). */
export const UW_FIGHTING: Cond = ALL(F('a3_uw_fight'), NOT(F('a3_unwritten')));
export const UW_PLACED: Cond = ANY(ALL(UW_NIGHT, UW_WAITING), UW_FIGHTING);
/** The three who were drawn on are down: whoever led, and the other two. */
export const UW_DOWN: Cond = ALL(ANY(ALL(F('a3_uw_fight', 'petra'), { dead: PETRA }), ALL(F('a3_uw_fight', 'juniper'), { dead: U1 })), { dead: U2 }, { dead: U3 });
/** Hale drawn on, until the after-trigger settles it; and down. */
export const HALE_FIGHTING: Cond = ALL(F('a3_hale_fight'), NOT(F('a3_hale')));
export const HALE_DOWN: Cond = { dead: HALE_A3 };

const AIM: Cond = KNOWS('a3_uw_aim');
const TURN: Cond = KNOWS('a3_uw_turn');
const RHODA_DOWN: Cond = F('a3_uw_rhoda');
const HOME_GONE: Cond = ANY(OPENFIELD('burned'), OPENFIELD('evicted'), OPENFIELD('guild'));
const FATHER_HOME: Cond = ALL(NOT(MASON_DEAD), NOT(MASON_EXILED), NOT(HOME_GONE));

/** The four answers. Approvals as the companions hear of it (the convention of the act: they learn what was done). */
const UW_OUT = (v: 'with_you' | 'gone' | 'stopped' | 'burning', how: string, text: string, more: Effect[]): Effect[] => [
  { set: 'a3_unwritten', value: v }, { set: 'a3_uw_how', value: how }, ...more, { decision: { id: 'a3_unwritten', text } },
];
const WITH_YOU = (lead: string): Effect[] => UW_OUT('with_you', 'core', 'At Knock I turned the Unwritten from the Cistern\'s count to the city\'s own book under the Spire. They are coming east to the steps.', [
  TRUST(lead, 10), { rep: { faction: 'choir', respect: 10 } }, { xp: 150 }, A(ASH, 5), A(KES, 3), A(TAMSIN, 3), A(ODILE, 2), A(NINE, -3),
]);
const GONE = (lead: string): Effect[] => UW_OUT('gone', 'home', 'At Knock I talked the Unwritten out of burning the Cistern\'s count, and they went home without lighting anything.', [
  TRUST(lead, 5), { xp: 120 }, A(TAMSIN, 5), A(ASH, 5), A(NINE, 3), A(ODILE, 3), A(WREN, 3), A(ILYA, 2),
]);
const LAMP = (lead: string): Effect[] => UW_OUT('stopped', 'lamp', 'At Knock I took the Unwritten\'s lamp and oil out from under them in the dark, and they went without burning anything.', [
  { time: 60 }, TRUST(lead, -10), { rep: { faction: 'choir', respect: -5 } }, { xp: 100 }, A(TAMSIN, 5), A(NINE, 3), A(WREN, 2), A(ODILE, 2), A(ILYA, 2),
]);
const BURN: Effect[] = UW_OUT('burning', 'let', 'At Knock I told the Unwritten I would not stand in their way, and they went down the grate to burn the Cistern\'s count.', [
  A(TAMSIN, -20), A(ODILE, -10), A(NINE, -10), A(WREN, -5), A(KES, -5), A(ILYA, -5), A(ASH, -5),
]);
const DRAW = (who: 'petra' | 'juniper'): Effect[] => [
  { set: 'a3_uw_fight', value: who }, { rep: { faction: 'choir', respect: -15, fear: 5 } }, A(ASH, -10), A(TAMSIN, 3), A(NINE, -2),
  { decision: { id: 'a3_uw_fight', text: 'At Knock I drew on the Unwritten at the apron in the dark rather than let them burn the Cistern\'s count.' } },
  { event: 'combat' },
];
/** Set by the map's after-trigger once the three are down. */
export const UW_FOUGHT: Effect[] = [
  { set: 'a3_unwritten', value: 'stopped' }, { set: 'a3_uw_how', value: 'fought' }, { xp: 100 },
  { news: { tag: 'a3_uw_fought', text: 'the designate killed three of the Choir\'s grey people on Knock\'s apron, who had come in the night to burn the Cistern', valence: 5, size: 6, at: 'cistern9' } },
  { decision: { id: 'a3_unwritten', text: 'At Knock I fought the Unwritten on the apron in the dark, and none of them went down the grate.' } },
];

type Lead = 'p' | 'j';
type Part = { if?: Cond; text: string };
/** Text that varies on its own axis, joined to a fixed rest (each axis ordered, its default last). */
const around = (parts: Part[], f: (t: string) => string): Part[] => parts.map((p) => (p.if ? { if: p.if, text: f(p.text) } : { text: f(p.text) }));

/** One leader's nodes: Petra's (`p_*`) or Juniper's (`j_*`). The same scene; Petra has her own history to answer for. */
function uwNodes(L: Lead): Record<string, NodeDef> {
  const P = L === 'p';
  const who = P ? PETRA : U1, name = P ? 'Petra' : 'Juniper';
  const n = (id: string) => `${L}_${id}`;
  const back: OptionDef = { text: '(Go on.)', next: n('hub') };
  const id = (s: string) => `uw.${L}.${s}`;
  const coreMods: { if: Cond; dc: number; why: string }[] = [
    { if: ALL(IN(ASH), ASH_REFUSED), dc: -15, why: 'Ash stands beside you, with his own orders burned' },
    { if: F('of_blight_outcome', 'unwritten'), dc: -10, why: P ? 'you gave her brother to the Unwritten\'s cellar, not to the city' : 'you gave Openfield\'s poisoner to the Unwritten\'s cellar, not to the city' },
    { if: F('sky_rite'), dc: -10, why: 'you raised a cairn under Openfield\'s windpump' },
    { if: { origin: 'door_watch' }, dc: -5, why: 'you heard the stranger say Larkspur' },
    { if: TURN, dc: -5, why: 'they have seen what the grate would do' },
    { if: RHODA_DOWN, dc: -5, why: 'Rhoda has already set the oil aside' },
    ...(P ? [{ if: PETRA_DOWN, dc: -5, why: 'she kept her word to you on the Long Night' }, { if: PETRA_TAKEN, dc: 10, why: 'you shouted for the guild\'s riders on the Long Night' }] : []),
    { if: F('ar_verdict', 'agreed'), dc: 10, why: 'the city wrote AGREED on your file' },
  ];
  const homeMods: { if: Cond; dc: number; why: string }[] = [
    { if: TURN, dc: -10, why: 'they know the grate would open the door for the column' },
    { if: RHODA_DOWN, dc: -10, why: 'Rhoda has set the oil aside' },
    { if: F('sky_rite'), dc: -5, why: 'you are a sister or brother of the Open Sky' },
    ...(P ? [{ if: FATHER_HOME, dc: -5, why: 'her father is at home in Openfield' }, { if: PETRA_TAKEN, dc: 10, why: 'you shouted for the guild\'s riders on the Long Night' }] : []),
    { if: HOME_GONE, dc: 10, why: 'Openfield is not theirs to go home to' },
  ];
  const lampMods: { if: Cond; dc: number; why: string }[] = [
    { if: { origin: 'door_watch' }, dc: -10, why: 'you kept the night watch on this apron for years' },
    { if: RHODA_DOWN, dc: -15, why: 'the oil is an arm\'s length from anyone' },
  ];

  const INTRO_REST = ' Behind her in the shadow of the rock, two more of the Unwritten: a big quiet man with a machete across his knees, and a young woman with one hand flat on a pack. Beside them, at knee height in the stone, the square iron grate you have walked past every day of your life.';
  const intro: Part[] = P
    ? [
      { if: PETRA_TAKEN, text: `Petra Mason at the dark west end of the apron, where the rock comes down to the concrete and the column's lamps do not reach, sitting on her heels with her back to the stone. The grey scarf is down round her throat and her face is bare to your lamp. She stopped hiding it after the guild's riders held their lamps to it in Openfield's lane in front of the whole Choir; the city has had it since.${INTRO_REST} "Designate," Petra says. "You've seen this face before. So has the city, now. Sit down. We came to tell you something, and the rule is we tell it to your face."` },
      { text: `Petra Mason at the dark west end of the apron, where the rock comes down to the concrete and the column's lamps do not reach, sitting on her heels with her back to the stone. The grey scarf she wore at Openfield is down round her throat, and her face is bare to your lamp: thinner than you remember it, burned dark across the cheekbones by the road. "There's no lens on this slope," she says, before you ask. "The column didn't bring one. It didn't need to. It has yours."${INTRO_REST} "Sit down, designate. We came to tell you something, and the rule is we tell it to your face."` },
    ]
    : [{ text: `A woman of thirty-five or so at the dark west end of the apron, where the rock comes down to the concrete and the column's lamps do not reach, sitting on her heels with her back to the stone: hair the colour of dry grass, hacked short with a knife, and a face that has been outdoors every day of its life, bare to your lamp, the grey scarf down round her throat.${INTRO_REST} "Juniper Lowry," she says, which is more than the Unwritten give anybody. "Petra's dead, so somebody here has to have a name tonight. It may as well be me. Sit down, designate. We came to tell you something, and the rule is we tell it to your face."` }];

  const turnHow: Part[] = [
    { if: IN(TAMSIN), text: 'Tamsin answers before you can. "That\'s the intake," she says. "That\'s what we breathe. Ninety years of it, through that hole. MOTHER turns the fans." Her voice does not shake. Her hands do.' },
    { if: SEEN('a3grille.well'), text: 'You tell her what MOTHER said through the Grille, in that voice that never changes: water and air are unaffected; I keep them.' },
    { if: { origin: 'pump_hand' }, text: 'You tell her what every pump hand on this slope knows: the grate is the Cistern\'s intake, and MOTHER turns the fans behind it, and when they stop the grate goes quiet and Maud sends somebody to the Grille.' },
    { text: 'You tell her what a sealed room needs, and who in there could be turning the fans that move the air past your hand.' },
  ];

  /** Who would be waiting when the door opened: the column while it is camped; the city's next order once it has gone. */
  const TURN_CITY: Part[] = [
    { if: F('a3_c9'), text: '"Into the next column," you say. "The city wrote the last one off the road, and it will write another, on its schedule, and the door will already be open for it."' },
    { text: '"Into a column," you say. "There are sixty benches in a car at the stand, and a captain at a table up the road who is waiting for that door to open."' },
  ];

  return {
    [n('intro')]: {
      speaker: who,
      text: intro,
      again: `"Sit," ${name} says. "We've time. We've had ninety years of it."`,
      effects: [{ learn: 'a3_uw_met' }, { quest: 'q_a3_unwritten', start: true }],
      interject: [
        { companion: ASH, if: ASH_REFUSED, text: `Ash stops at the edge of the lamplight. "Sister," he says. "Brother," ${name} says, and looks at him a long moment, and then at you, and something in her face rearranges itself around the fact of him standing with you.` },
        { companion: ASH, text: 'Ash says nothing. He sits down on the concrete beside the big man with the machete, as if he had been expected, and looks at the door.' },
        { companion: TAMSIN, text: 'Tamsin stays standing. She is looking past them at the iron grate in the rock, and her face has gone very still.' },
        { companion: NINE, text: 'Nine stands at the lamp\'s edge. "I am not recording," it says. "I wish to say so before anyone asks."' },
        { companion: WREN, text: 'Wren sits on her heels to match them, without being asked, and does not take her eyes off the machete.' },
      ],
      options: [{ id: id('sit'), text: '(Sit down.)', next: n('hub') }],
    },
    [n('hub')]: {
      speaker: who,
      text: [
        { if: TURN, text: `"Well, designate?" ${name} has not taken her eyes off the grate since you told her what it is.` },
        { if: AIM, text: `"Well, designate?" ${name} says. "Two o'clock. Or not."` },
        { text: `"Ask," ${name} says. "That's allowed."` },
      ],
      again: `${name} waits, her back to the rock.`,
      options: [
        { id: id('aim'), text: 'What did you come here to do?', once: true, next: n('aim') },
        { id: id('how'), text: 'How?', if: AIM, once: true, next: n('how') },
        { id: id('why'), text: 'Why tell me?', once: true, next: n('why') },
        { id: id('turn'), text: 'That grate is how they breathe.', if: KNOWS('a3_uw_shaft'), once: true, next: n('turn') },
        ...(P
          ? [
            { id: id('father'), text: 'Your father.', once: true, next: n('father') },
            { id: id('night'), text: 'The Long Night.', once: true, next: n('night') },
          ]
          : [{ id: id('petra'), text: 'Petra.', once: true, next: n('petra') }]),
        { id: id('ash'), text: 'Where is Ash?', if: ALL(ASH_WITH_UNWRITTEN, NOT(IN(ASH))), once: true, next: n('ash') },
        { id: id('core'), text: 'Burn the real count. It isn\'t in there. It\'s under the Spire.', if: AIM, once: true, check: { skill: 'speech', dc: 50, mods: coreMods }, effects: WITH_YOU(who), next: n('core'), fail: n('core_no') },
        { id: id('home'), text: 'Go home. There\'s nothing behind that door that doesn\'t breathe.', if: AIM, once: true, check: { skill: 'speech', dc: 40, mods: homeMods }, effects: GONE(who), next: n('home'), fail: n('home_no') },
        { id: id('lamp'), text: '(Leave them. Come back in the dark, and lift their lamp and the oil.)', if: ALL(AIM, NOT(F('a3_uw_watched'))), once: true, check: { skill: 'stealth', dc: 45, mods: lampMods }, effects: LAMP(who), next: n('lamp'), fail: n('lamp_fail'), failEffects: [{ set: 'a3_uw_watched' }, { time: 60 }] },
        { id: id('let'), text: 'I won\'t stand in your way.', if: AIM, next: n('let') },
        { id: id('draw'), text: '(Draw on them.)', if: AIM, next: n('draw') },
        { text: '(Leave them to their watch.)', exit: true },
      ],
    },
    [n('aim')]: {
      speaker: who,
      text: [
        { if: F('a3_c9', 'sealed'), text: `"Burn the count." ${name} says it plainly. "The door's shut again, and the column's gone up the road, and the city will be back on its schedule with another order, because the count is still in there. Inside is a room of paper the old woman calls the Archive, and a panel that is MOTHER's mouth and her memory. Every quarter for ninety years she has sent the city their names: heights, teeth, who coughs and who doesn't." She looks at the door. "We burn both. Then there is no reserve. There's sixty people nobody has ever written down, and nobody will write them down again as long as they live. It's the most anybody's ever given them."` },
        { text: `"Burn the count." ${name} says it plainly${P ? ', the way her father says the rows' : ''}. "Behind that door are sixty people the city calls a reserve. That's a farmer's word: seed you keep back, so you can plant it when the ground's ready. The Ledger means to plant them. MOTHER has counted them for it every quarter for ninety years: names, heights, teeth, who coughs and who doesn't. Inside there's a room of paper the old woman calls the Archive, and a panel that is MOTHER's mouth and her memory." She looks at the door. "We burn both. Then there's no reserve. There's sixty people nobody has ever written down, and the city can't move what it can't count, and nobody in there will be counted again as long as they live. It's the most anybody's ever given them."` },
      ],
      again: `"Burn the count," ${name} says. "Paper and panel."`,
      effects: [{ learn: 'a3_uw_aim' }, { quest: 'q_a3_unwritten', start: true }],
      interject: [
        { companion: TAMSIN, text: `"Counted," Tamsin says. "You think being counted is the worst thing that happens in there." She does not say what is. ${name} looks at her properly for the first time.` },
        { companion: ODILE, text: '"An archive," Odile says, very pleasantly. "I have a view on burning archives, my dear. I hold it at some cost."' },
        { companion: NINE, text: '"The reserve\'s record is the only part of it the Court of Accounts can read," Nine says. "Without it, the order cannot be opposed on the reserve\'s behalf. I state this as a fact, not an argument."' },
        { companion: KES, text: 'Kes laughs once, without anything funny in it. "The Concern burned our records in the Skirts every time a contract went bad. Nobody was ever freer for it."' },
        { companion: ILYA, text: 'Ilya counts the cans by the young woman\'s pack. "Two," he says. "That\'s a room. Not a house."' },
      ],
      options: [back],
    },
    [n('how')]: {
      speaker: who,
      text: `"There's a shaft at this end of the apron." ${name} tips her head at the iron grate in the stone behind her, no wider than a man's shoulders. Air moves through it; you can feel it on the back of your hand, cool, smelling faintly of oil and of people. "It goes down to their works. Thaddeus has a bar for the grate and Rhoda has the oil. When the column's asleep and the old woman's off her stool, we go down. Two o'clock."`,
      again: `"Two o'clock," ${name} says. "Down the grate."`,
      passives: [{ if: { origin: 'pump_hand' }, text: 'You know that grate. Every pump hand on this slope knows it: the Cistern\'s intake. Maud used to tell you not to put your face to it, because it would steal your breath.' }],
      effects: [{ learn: 'a3_uw_shaft' }],
      interject: [{ companion: WREN, text: 'Wren looks at the grate, and at the two cans, and at the column\'s dark tents up the slope, and works out the rest of it without anyone telling her. She does not say anything. Her burned hand has closed.' }],
      options: [back],
    },
    [n('why')]: {
      speaker: who,
      text: `"The rule." ${name} looks at the grate, not at you. "The man who died at your door walked three weeks on a wound to tell the people on a list what was written for them. That's what we are, when we're anything: people who say it to your face. We don't sign. We don't keep faces. We don't keep books." She looks at you now. "So the only record of what we do is whoever is standing in front of it. Tonight that's you. We do it with you on this slope or we don't do it: not before you came, not behind your back. You'll remember it. You're the only book we allow."`,
      again: `"You're the only book we allow," ${name} says.`,
      effects: [{ learn: 'a3_uw_rule' }],
      interject: [{ companion: NINE, text: 'Nine says, after a moment, "That is a record." Nobody answers it.' }],
      options: [back],
    },
    [n('turn')]: {
      speaker: who,
      text: turnHow.flatMap((h) => TURN_CITY.map((c) => {
        const conds = [h.if, c.if].filter((x): x is Cond => !!x);
        const text = `${h.text} "Burn MOTHER's panel and you burn the hand that turns them." ${name} is quiet a long time. From the dark behind her the big man says, "Then they come out." He says it as if it settles it. "Out the door, into the sky. Uncounted." / ${c.text} / Nobody says anything. Then ${name}, very low: "Ninety years. And the one time anybody opens that door from outside, it's us. For them."`;
        return conds.length ? { if: conds.length === 1 ? conds[0] : ALL(...conds), text } : { text };
      })),
      again: `"For him," ${name} says, to the grate.`,
      effects: [{ learn: 'a3_uw_turn' }],
      interject: [
        { companion: KES, text: '"Fire in a sealed place," Kes says. "I saw it once, in the Skirts\' low galleries. You don\'t burn. You just stop."' },
        { companion: ASH, text: 'Ash has his eyes shut. "A door with people behind it," he says. Only that.' },
      ],
      options: [back],
    },
    ...(P
      ? {
        [n('father')]: {
          speaker: who,
          text: [
            { if: MASON_DEAD, text: '"Under a cairn by the windpump, with no name on it." She says it flatly. "He sat down in front of the store door on the Long Night, and he didn\'t get up when the fire came, because he\'d said he wouldn\'t. He\'d have wanted the cairn. I hated building it." A breath. "He\'d have said this was wrong, too. He said most things were. He was right about more of them than I let him know."' },
            { if: MASON_SCARRED, text: '"Alive." She looks at her hands. "Somebody pulled him out of the store door on the Long Night with his back on fire. He sleeps on his front now, and still says the sky keeps no books." A breath. "He doesn\'t know I\'m here. He\'d sit down in front of this door and not let me past, and not lift a hand to stop me either. That\'s my father."' },
            { if: MASON_EXILED, text: '"Walking." She looks at the road. "He went out of Openfield with his hat in his hand and riders either side of him, and now he mends other people\'s rows for his bread and counts them, because he can\'t stop. He doesn\'t know I\'m here." A breath. "He\'d sit down in front of this door and not let me past, and not lift a hand to stop me either. That\'s my father."' },
            { text: '"At home, counting rows. He thinks I\'m at Shale buying seed. He thinks that every time I go." Her mouth does something. "He\'d sit down in front of this door, if he were here, and not let me past, and not lift a hand to stop me either. That\'s my father."' },
          ],
          again: '"That\'s my father," Petra says.',
          effects: [{ learn: 'a3_petra_father' }],
          options: [back],
        },
        [n('night')]: {
          speaker: who,
          text: [
            { if: PETRA_TAKEN, text: '"You shouted." No heat in it; it has all burned off. "For the riders. They brought me back up the lane by the arms with my scarf on the ground and held a lamp to me in front of the whole Choir, and the guild sold what they saw to the city by morning. Ten years I kept it off every lens in the basin." She touches her cheek, once. "They let me go at Four Ways when the night was over. They had what they wanted. A face is worth more than a woman."' },
            { if: PETRA_DOWN, text: '"You talked me out of a knife." She almost smiles. "I kept my word. The Treasurer\'s alive and counting, and the Plan has its Treasurer, on schedule. I still don\'t know if you were right. I\'ve stopped asking."' },
            { if: ALL(PETRA_KNIFE, SARR_DEAD), text: '"You told me to do what I had to." She looks at her hands. "I did. The guild\'s Treasurer is under her rug with her clock stopped, and the city will have written somebody else into her line by now. That\'s the trouble with pages. There\'s always another one behind."' },
            { if: ALL(ASH_WITH_UNWRITTEN, SARR_DEAD), text: '"Ash did it, in the end. Not me." She looks at the road west. "He walked down the lane in front of us with his knife out and his face like a man doing a sum, and came back up it without looking at anyone. The city will have written somebody else into her line by now. There\'s always another page."' },
            { if: SARR_DEAD, text: '"The Treasurer died on our lane, and the city will have written somebody else into her line by now." She shrugs. "There\'s always another page behind. That\'s what I came here to learn, I think. You burn one and there\'s another."' },
            { text: '"The night the guild and the city had between them, over our store." She shrugs. "We didn\'t get a night. We got the morning after, like everybody."' },
          ],
          again: '"The morning after," Petra says.',
          effects: [{ learn: 'a3_petra_night' }],
          options: [back],
        },
      }
      : {
        [n('petra')]: {
          speaker: who,
          text: '"She\'s under a cairn at Openfield with no name on it." Juniper looks at her hands. "That\'s how she\'d have wanted it. That\'s how all of us want it." A breath. "She\'d have known what to say to you. She always knew what to say to people with faces. I only know what we came to do."',
          again: '"I only know what we came to do," Juniper says.',
          options: [back],
        },
      }),
    [n('ash')]: {
      speaker: who,
      text: `"West, with ours." ${name} looks at the door. "He wouldn't come to this one. He said he stood at a door once with people behind it, a long time ago, and set it alight, and liked being first, and he'd not stand at another." She is quiet. "He's the gentlest of us now. That's what it cost him."`,
      again: `"The gentlest of us," ${name} says.`,
      options: [back],
    },
    [n('core')]: {
      speaker: who,
      text: `"Then show me." ${name} stands up off her heels for the first time. You tell her: that MOTHER only copies the count to the city, every quarter; that the book the copies go into is under the Spire's foot, and every name in the basin is in it, hers too now; that sixty people in a jar are not the Plan, only one line of it. "Burn this room," you say, "and the city writes a new one by spring. Burn that one, and nobody in the basin is written down again." / She looks at the door for a long time. Then she puts the scarf in her pocket. "We'll come east," she says. "Not for you. For the book." Behind her the big man stands up too, and Rhoda shoulders the pack, and none of them looks at the grate again.`,
      interject: [
        { companion: ASH, if: ASH_REFUSED, text: `Ash puts his hand on ${name}'s shoulder as she passes, once, and she lets it stay there a moment.` },
        { companion: NINE, text: 'Nine is very still. "The book you mean," it says, "is the one I was made to keep." It does not say anything else.' },
        { companion: KES, text: 'Kes lets out a breath she seems to have been holding since the Skirts. "The eyes," she says. "Good."' },
        { companion: TAMSIN, text: 'Tamsin looks at the grate, and then at you, and nods once.' },
      ],
      options: [{ id: id('core.go'), text: '(Watch them go up the slope.)', exit: true }],
    },
    [n('core_no')]: {
      speaker: who,
      text: P
        ? [
          { if: PETRA_TAKEN, text: '"No." Not angry. "You shouted for the riders once. You don\'t get to point me at the city now." She sits back against the rock. "We came for this door."' },
          { text: '"No." Not angry. "You\'d send us up the Spire\'s steps to be shot on them, and come up after us in the sash." She sits back against the rock. "We came for this door."' },
        ]
        : '"No." Not angry. "You\'d send us up the Spire\'s steps to be shot on them, and come up after us in the sash." She sits back against the rock. "We came for this door."',
      again: `"We came for this door," ${name} says.`,
      options: [back],
    },
    [n('home')]: {
      speaker: who,
      text: [
        { if: HOME_GONE, text: `"Home." ${name} says it as if it were a word in a language she used to speak. "Home is ash on the glass." / "Then go where Openfield went," you say. "You came to free sixty people, and you'd be loading them into the city's car for it. Go and let me do this one." / She looks at the grate, and at the big man, and at the young woman with her hand on the oil. "Rhoda," she says. Rhoda takes her hand off the pack. / They are gone before light: three shapes going up the toll road in the dark, past the column's tents and Orme's shut stand, north. In the morning there is a ring of chalk on the apron where they sat, and inside it, very small, an open eye that nobody has struck through.` },
        { text: `"Home." ${name} says it as if it were a word in a language she used to speak. "Go home," you say. "You came to free sixty people, and you'd be loading them into the city's car for it. Go home and let me do this one." / She looks at the grate, and at the big man, and at the young woman with her hand on the oil. "Rhoda," she says. Rhoda takes her hand off the pack. / They are gone before light: three shapes going up the toll road in the dark, past the column's tents and Orme's shut stand, north. In the morning there is a ring of chalk on the apron where they sat, and inside it, very small, an open eye that nobody has struck through.` },
      ],
      interject: [
        { companion: TAMSIN, text: 'Tamsin sits down on the cold concrete where they were, with her back to the grate, as if to keep it company. "Thank you," she says, to nobody in particular.' },
        { companion: ASH, text: 'Ash watches them go up the road until he cannot see them. "They\'ll be angry at Openfield," he says. "Anger keeps. It\'s a better thing to carry home than oil."' },
      ],
      options: [{ id: id('home.go'), text: '(Let them go.)', exit: true }],
    },
    [n('home_no')]: {
      speaker: who,
      text: [
        { if: HOME_GONE, text: '"Home is ash, designate. You know it is." She does not move. "Nobody sends the Unwritten home. We haven\'t got one."' },
        { text: '"No." She does not move. "Nobody sends the Unwritten home. We haven\'t got one. We have a sky."' },
      ],
      again: `"We have a sky," ${name} says.`,
      options: [back],
    },
    [n('lamp')]: {
      speaker: 'narrator',
      text: [
        { if: { origin: 'door_watch' }, text: 'You leave them at the rock and go back up the lane, and come down again an hour later without your lamp, the way you came down to the hatch every night of your watch years: along the drain, under the lip of the apron, where the concrete is broken and nobody walks. Rhoda is asleep sitting up against the rock with her hand slack beside the pack. The big man is watching the door. You take the lamp, and then the oil, one can and then the other, and carry them up the drain into the dark, and pour them into the goat pen\'s sand. / In the morning there are no Unwritten on the apron. There is a ring of chalk where they sat, and in it a word in the Choir\'s hand that you are fairly sure is not a blessing.' },
        { text: 'You leave them at the rock and go back up the lane, and come down again an hour later without your lamp, along the drain under the lip of the apron, where the concrete is broken and nobody walks. Rhoda is asleep sitting up against the rock with her hand slack beside the pack. The big man is watching the door. You take the lamp, and then the oil, one can and then the other, and carry them up the drain into the dark, and pour them into the goat pen\'s sand. / In the morning there are no Unwritten on the apron. There is a ring of chalk where they sat, and in it a word in the Choir\'s hand that you are fairly sure is not a blessing.' },
      ],
      options: [{ id: id('lamp.go'), text: '(Go to bed.)', exit: true }],
    },
    [n('lamp_fail')]: {
      speaker: U3,
      text: 'You get as far as the pack. A hand closes on your wrist in the dark, without hurry: Rhoda, awake after all, looking at you over it. She does not shout. "No," she says. That is all. When you come back to the rock with your lamp, the oil is under the big man\'s knees, and all three of them watch you whenever you are on the slope.',
      again: 'The oil under the big man\'s knees. Three faces, watching you.',
      options: [back],
    },
    [n('let')]: {
      speaker: who,
      text: `"Say it." ${name} does not look away. "Say it to my face, designate, so it's in you and not just in me. You'll let us burn the count."`,
      again: `"Say it," ${name} says.`,
      options: [
        { id: id('let.yes'), text: 'Burn it.', effects: BURN, next: n('let_done') },
        { id: id('let.no'), text: 'No. Not yet.', next: n('hub') },
      ],
    },
    [n('let_done')]: {
      speaker: who,
      text: `"Two o'clock," ${name} says. "Be on the slope." She sits back against the rock. Rhoda unbuckles the pack. Nobody says anything else; there is nothing else to say.`,
      interject: [
        { companion: TAMSIN, text: '"No," Tamsin says. "No. That\'s my house." She is on her feet. Nobody looks at her. She stands there a long moment with her fists shut, and then she walks away up the lane in the dark without you.' },
        { companion: NINE, text: '"I will not record this," Nine says. "I would like it to be the only thing I have ever chosen not to record."' },
        { companion: ODILE, text: 'Odile turns her back on all of it and looks up the slope at the column\'s lamps. She says nothing at all, which she has never done before.' },
      ],
      options: [{ id: id('let.go'), text: '(Leave them to it.)', exit: true }],
    },
    [n('draw')]: {
      speaker: who,
      text: `${name} sees your hand before it moves. She does not reach for the machete. "Ah," she says. "That's an answer too." Behind her the big man is already on his feet, and the young woman has the pack behind her back.`,
      again: `${name} waits, watching your hand.`,
      interject: [{ companion: ASH, text: '"Don\'t," Ash says. "Friend. Don\'t be first." He has not moved toward his shotgun. He will not.' }],
      options: [
        { id: id('draw.yes'), text: '(Draw.)', effects: DRAW(P ? 'petra' : 'juniper'), exit: true },
        { id: id('draw.no'), text: '(Not like this.)', next: n('hub') },
      ],
    },
    [n('set')]: {
      speaker: who,
      text: `"Two o'clock," ${name} says, without looking round. "We said we'd do it with you on the slope. You're on it."`,
      again: `${name} does not look round.`,
      options: [{ text: '(Leave them.)', exit: true }],
    },
  };
}

export const d_a3_petra: DialogueDef = {
  id: 'd_a3_petra', owner: PETRA,
  start: [
    { if: ALL(PETRA_DEAD, F('a3_unwritten', 'burning')), node: 'j_set' },
    { if: F('a3_unwritten', 'burning'), node: 'p_set' },
    { if: ALL(PETRA_DEAD, NOT(KNOWS('a3_uw_met'))), node: 'j_intro' },
    { if: PETRA_DEAD, node: 'j_hub' },
    { if: NOT(KNOWS('a3_uw_met')), node: 'p_intro' },
    { node: 'p_hub' },
  ],
  nodes: { ...uwNodes('p'), ...uwNodes('j') },
};

// ---------------------------------------------------------------- the other two Unwritten

type Text2 = { if?: Cond; text: string }[];
const ASK_LEAD: Text2 = [{ if: PETRA_DEAD, text: 'Juniper' }, { text: 'Petra' }];
const withLead = (f: (lead: string) => string): Text2 => ASK_LEAD.map((p) => (p.if ? { if: p.if, text: f(p.text) } : { text: f(p.text) }));

export const d_a3_thaddeus: DialogueDef = {
  id: 'd_a3_thaddeus', owner: U2,
  start: [{ if: NOT(KNOWS('a3_thad_met')), node: 'first' }, { node: 'hub' }],
  nodes: {
    first: {
      text: withLead((lead) => `The big man with the machete across his knees. He looks up at you, at your face, for exactly as long as it takes to know it, and back down at the blade, which he is not sharpening; he has only got it out. "Ask ${lead}," he says. "She talks."`),
      again: 'The big man, the blade across his knees.',
      effects: [{ learn: 'a3_thad_met' }],
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
    hub: {
      text: 'Thaddeus, the machete across his knees.',
      again: 'He waits. He is good at it.',
      options: [
        { id: 'thad.who', text: 'Who are you?', once: true, next: 'who' },
        { id: 'thad.slow', text: 'Burn that panel and you burn their air.', if: TURN, once: true, next: 'slow' },
        { text: '(Leave him.)', exit: true },
      ],
    },
    who: {
      text: '"Thaddeus." A name, at least. "I was born in the Precinct\'s supply lines, under the Wall. My mother was relocated on schedule from a place like this one, and so was I, before I could walk." He turns the blade so the lamp runs along it. "They don\'t kill you, in supply. They give you a number and a bench and the work the schedule says, and you do it until the schedule says you\'re done. I walked out through the drains at sixteen. I\'ve been walking since." He looks at the door. "Supply. That\'s what your column has come up the road to make of them."',
      again: '"Supply," Thaddeus says.',
      effects: [{ learn: 'a3_thad_supply' }],
      interject: [{ companion: NINE, text: 'Nine says, "The supply lines were closed in R22." Thaddeus looks at it. "Renamed," he says. Nine does not answer that.' }],
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
    slow: {
      text: withLead((lead) => `"Better ash than supply." He doesn't look up. "You've not been supply." A long breath. "${lead} hasn't, either. That's why she's thinking about it and I'm not."`),
      again: '"Better ash than supply," Thaddeus says.',
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
  },
};

export const d_a3_rhoda: DialogueDef = {
  id: 'd_a3_rhoda', owner: U3,
  start: [{ if: NOT(KNOWS('a3_rhoda_met')), node: 'first' }, { node: 'hub' }],
  nodes: {
    first: {
      text: 'The young woman with her hand on the pack. She has a printer\'s fingers, black in every crease, though there is no ink on them now and has not been for a while. "Lamp oil weighs more than you\'d think," she says, as if you had asked.',
      again: 'The young woman, her hand on the pack.',
      effects: [{ learn: 'a3_rhoda_met' }],
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
    hub: {
      text: [{ if: RHODA_DOWN, text: 'Rhoda sits with her arms round her knees, the pack an arm\'s length away from her on the concrete.' }, { text: 'Rhoda, her hand on the pack.' }],
      again: 'She looks at you the way a printer looks at a plate.',
      options: [
        { id: 'rhoda.before', text: 'What did you do, before?', once: true, next: 'before' },
        { id: 'rhoda.doubt', text: 'You came to burn paper. There are sixty people under it.', if: ALL(TURN, NOT(RHODA_DOWN)), once: true, next: 'doubt' },
        { text: '(Leave her.)', exit: true },
      ],
    },
    before: {
      text: '"Printed faces." She holds up the black fingers. "Toll cards, at the guild\'s press on the fourth span at Ninebridge. Four years. Eleven thousand faces, give or take; I kept count, because I was that kind of girl." She looks at you, carefully. "One of them was probably yours. Fourteen, was it? They all look fourteen." The press sends a copy of every face to the city with the forecasts, she says; that is what the press is for. "Ninety years of counting," she says. "Somebody has to stop."',
      again: '"Somebody has to stop," Rhoda says.',
      effects: [{ learn: 'a3_rhoda_press' }],
      interject: [{ companion: ODILE, text: '"The fourth span," Odile says. "I knew the press. I paid for its ink, once, for a season." Rhoda looks at her without any expression at all.' }],
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
    doubt: {
      text: withLead((lead) => `She looks at her hand on the pack for a long time. "I came to burn paper," she says. "I've burned paper. I'm good at it." She takes the hand away. She pushes the pack an arm's length along the concrete, away from her, and sits with her arms round her knees. "Tell ${lead}," she says. "I'm not telling her. You tell her."`),
      again: 'The pack, an arm\'s length away from her.',
      effects: [{ set: 'a3_uw_rhoda' }, { xp: 40 }, TRUST(U3, 10)],
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
  },
};

/** The burning (world event `a3_burning`, with the player at Knock): MOTHER's panel and the Archive go. */
export const d_a3_burning: DialogueDef = {
  id: 'd_a3_burning', owner: PETRA,
  start: [{ node: 'smoke' }],
  nodes: {
    smoke: {
      speaker: 'narrator',
      text: [
        { if: ALL(LOWE_DEAD, SCARRED), text: 'It is done the way they said it would be, with you on the slope to see it. The grate at the west end of the apron stands open, its bar left on the concrete. For a long time nothing happens. Then the air coming out of the grate turns warm, and then grey, and then stops coming out at all, and the smell reaches the lane: lamp oil and paper, and something electrical and sweet. The Grille\'s little light goes out in the middle of a word. The tray beside the hatch ticks as it cools. / Knock comes out of its doors. Maud comes down the lane in her nightdress on her stick, and stands on the apron with her hand flat on the hatch, and says nothing at all. Across the road the column\'s lamps come on one by one, and Sergeant Reyes walks to the end of the lane and looks at the smoke and writes something down. / The Unwritten are gone by light. There is a ring of chalk where they sat, and an open eye in it, and nothing struck through.' },
        { if: LOWE_DEAD, text: 'It is done the way they said it would be, with you on the slope to see it. The grate at the west end of the apron stands open, its bar left on the concrete. For a long time nothing happens. Then the air coming out of the grate turns warm, and then grey, and then stops coming out at all, and the smell reaches the lane: lamp oil and paper, and something electrical and sweet. The Grille\'s little light goes out in the middle of a word. The tray beside the hatch ticks as it cools. / Knock comes out of its doors. Maud comes down the lane in her nightdress, and stands on the apron with her hand flat on the hatch, and says nothing at all. Across the road the column\'s lamps come on one by one, and Sergeant Reyes walks to the end of the lane and looks at the smoke and writes something down. / The Unwritten are gone by light. There is a ring of chalk where they sat, and an open eye in it, and nothing struck through.' },
        { if: SCARRED, text: 'It is done the way they said it would be, with you on the slope to see it. The grate at the west end of the apron stands open, its bar left on the concrete. For a long time nothing happens. Then the air coming out of the grate turns warm, and then grey, and then stops coming out at all, and the smell reaches the lane: lamp oil and paper, and something electrical and sweet. The Grille\'s little light goes out in the middle of a word. The tray beside the hatch ticks as it cools. / Knock comes out of its doors. Maud comes down the lane in her nightdress on her stick, and stands on the apron with her hand flat on the hatch, and says nothing at all. Across the road the column\'s lamps come on one by one, and Captain Lowe walks to the end of the lane in his shirtsleeves and looks at the smoke for a long time, and takes his cap off, and writes something down. / The Unwritten are gone by light. There is a ring of chalk where they sat, and an open eye in it, and nothing struck through.' },
        { text: 'It is done the way they said it would be, with you on the slope to see it. The grate at the west end of the apron stands open, its bar left on the concrete. For a long time nothing happens. Then the air coming out of the grate turns warm, and then grey, and then stops coming out at all, and the smell reaches the lane: lamp oil and paper, and something electrical and sweet. The Grille\'s little light goes out in the middle of a word. The tray beside the hatch ticks as it cools. / Knock comes out of its doors. Maud comes down the lane in her nightdress, and stands on the apron with her hand flat on the hatch, and says nothing at all. Across the road the column\'s lamps come on one by one, and Captain Lowe walks to the end of the lane in his shirtsleeves and looks at the smoke for a long time, and takes his cap off, and writes something down. / The Unwritten are gone by light. There is a ring of chalk where they sat, and an open eye in it, and nothing struck through.' },
      ],
      interject: [
        { companion: TAMSIN, text: '"That was my house," Tamsin says. She says it to nobody. "That was my house."' },
        { companion: NINE, text: '"The reserve\'s record was its only standing at the Court," Nine says. "It has none now. Neither has anyone in there." It does not look at you.' },
        { companion: ODILE, text: '"There," Odile says, very quietly. "Now nobody will ever know what was in it. I used to think that was a mercy."' },
        { companion: KES, text: 'Kes has her hand over her mouth and nose. "They\'ll have a hand pump," she says through it. "Somebody always keeps a hand pump. Tell me they kept a hand pump."' },
        { companion: ASH, text: 'Ash stands on the apron with his face to the smoke and his hands open at his sides, and does not move until it is light.' },
      ],
      options: [{ text: '(Watch the smoke.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the Grille, dark (spread into d_a3_grille by a3_knock.ts)

/** The Grille once MOTHER's panel has burned: first of its start entries. */
export const GRILLE_BURNED: Cond = F('a3_mother', 'burned');
export const GRILLE_BURNED_NODES: Record<string, NodeDef> = {
  a3_burned: {
    speaker: PELL,
    text: [
      { if: F('a3_c9'), text: 'The Grille\'s little light is dark, as it has been since the night of the smoke. You put your mouth to the holes anyway, out of habit. Nobody is there to answer, and no hum; the plate is only a plate now, in a rock.' },
      { if: TAM_INSIDE, text: 'The Grille\'s little light is dark. Behind the holes, no hum: for the first time in your life the plate is only a plate. You put your mouth to it anyway. After a long while a voice comes, faint, with a cough in it, and it is Tamsin\'s. "We\'re here. Most of us. The fans stopped with her. Bram and Teague turn the old hand pump on the intake in shifts, and Pell says we\'re on the emergency stores, which are forty years old and taste it." A cough. "The Archive\'s gone. All of it. Ines sits where the panel was. She says somebody ought to." A long silence. "What is the sky doing?" Then, before you can answer: "Don\'t say blue."' },
      { text: 'The Grille\'s little light is dark. Behind the holes, no hum: for the first time in your life the plate is only a plate. You put your mouth to it anyway. After a long while a voice comes, faint, with a cough in it: Pell. "We\'re here. Most of us." A cough. "The fans stopped with her. Bram and Teague turn the old hand pump on the intake in shifts, and we\'re on the emergency stores, which are forty years old and taste it. The Archive\'s gone. All of it." Another cough, and something that might be a laugh. "Ines sits where the panel was. She says somebody ought to." Then, very quietly: "Did you see who did it?"' },
    ],
    again: 'The dark plate. Far below, faint, the hand pump: a creak, a creak.',
    options: [
      { id: 'a3grille.burned.told', text: 'I let them.', if: ALL(NOT(F('a3_c9')), NOT(TAM_INSIDE)), once: true, next: 'a3_burned_told' },
      { text: '(Step back.)', exit: true },
    ],
  },
  a3_burned_told: {
    speaker: PELL,
    text: '"Ah." A long silence, long enough that you think he has gone. "Then you will want to be the one who tells Tamsin," Pell says, "if she does not already know." He does not say anything else, and after a while you hear his steps going away from the plate.',
    again: 'Nobody at the plate.',
    effects: [{ memory: { npc: PELL, tag: 'a3_told_burning', valence: -20, strength: 90 } }],
    options: [{ text: '(Step back.)', exit: true }],
  },
};

// ---------------------------------------------------------------- Factor Orme, at the stand

const HELD: Cond = { item: 'k_a3_intake' };
const FOLDER_SEEN: Cond = SEEN('orme.a3.folder');
const TORN: Cond = F('a3_guild_torn');
const PAPER_TAKEN: Effect[] = [
  { give: 'k_a3_intake' }, { set: 'a3_guild', value: 'paper_held' }, { learn: 'a3_intake_held' },
  { decision: { id: 'a3_guild', text: 'At Knock I took the guild\'s paper from Factor Orme: the Cistern\'s sixty as Concern intake, on my signature at the door.' } },
];
const PAPER_REFUSED: Effect[] = [
  { set: 'a3_guild', value: 'refused' }, { memory: { npc: ORME, tag: 'a3_paper_refused', valence: -5, strength: 70 } },
  { decision: { id: 'a3_guild', text: 'At Knock I refused the guild\'s paper on the Cistern\'s sixty.' } },
];
const PAPER_TORN: Effect[] = [
  { set: 'a3_guild', value: 'refused' }, { set: 'a3_guild_torn' }, { rep: { faction: 'tollmen', respect: -10 } }, { memory: { npc: ORME, tag: 'a3_paper_torn', valence: -10, strength: 90 } },
  { news: { tag: 'a3_paper_torn', text: 'the designate tore the guild\'s paper on the Cistern\'s people in half on Orme\'s counter', valence: 6, size: 6, at: 'cistern9' } },
  { decision: { id: 'a3_guild', text: 'At Knock I tore the guild\'s paper on the Cistern\'s sixty in half on Factor Orme\'s counter.' } },
];
const ORME_BACK: OptionDef = { text: '(Go on.)', next: 'stand' };

export const d_a3_orme: DialogueDef = {
  id: 'd_a3_orme', owner: ORME,
  start: [{ node: 'stand' }],
  nodes: {
    stand: {
      text: [
        { if: HELD, text: 'Factor Ismay Orme behind her counter at the stand, her ledger open again where the folder used to lie. "Designate." Her eyes go to your pack, where the folder is, and away. "Water\'s one Toll here, as it always was. When there is any."' },
        { if: ALL(GUILD_IN_PLAY, F('a3_guild', 'refused'), NOT(TORN)), text: 'Factor Ismay Orme behind her counter at the stand, the leather folder closed at her elbow under the ledger, where you can see it and she does not have to. "Designate. Water\'s one Toll here, as it always was. When there is any."' },
        { if: GUILD_IN_PLAY, text: 'Factor Ismay Orme behind her counter at the stand, her ledger shut at her elbow and a leather folder on the counter in its place, closed, her hand flat on it. "Designate." She does not ask for your card. "Water\'s one Toll here, as it always was. When there is any."' },
        { if: F('a3_route_home', 'first'), text: 'Factor Ismay Orme behind her counter at the stand, as if the guild\'s coach had been a long afternoon. "Home," she says. "Cards out, faces up." She does not ask for yours. "Water\'s one Toll here, as it always was. When there is any."' },
        { text: 'Factor Ismay Orme behind her counter at the stand, her ledger open and nothing to write in it. "Designate." She does not ask for your card. "Water\'s one Toll here, as it always was. When there is any."' },
      ],
      again: '"Anything else, love?" Orme says. "The book doesn\'t wait on talk. It hasn\'t much else to do, mind."',
      options: [
        { id: 'orme.a3.column', text: 'How is the stand, with a column across the road?', once: true, next: 'column' },
        { id: 'orme.a3.folder', text: 'What\'s in the folder?', if: GUILD_IN_PLAY, once: true, next: 'paper' },
        { id: 'orme.a3.sign', text: 'Who signs it?', if: FOLDER_SEEN, once: true, next: 'sign' },
        { id: 'orme.a3.weigh', text: 'What is the Weighhouse?', if: FOLDER_SEEN, once: true, next: 'weigh' },
        { id: 'orme.a3.stake', text: 'What do you get out of it?', if: FOLDER_SEEN, once: true, next: 'stake' },
        { id: 'orme.a3.lowe', text: 'Captain Lowe says he hasn\'t read it.', if: ALL(FOLDER_SEEN, KNOWS('a3_lowe_guild')), once: true, next: 'lowe' },
        { id: 'orme.a3.told', text: 'Hale told me what the Weighhouse is.', if: ALL(FOLDER_SEEN, KNOWS('a3_weighhouse')), once: true, next: 'told' },
        { id: 'orme.a3.owed', text: 'You said I\'d owe you, for Linnet.', if: ALL(FOLDER_SEEN, F('kn_owes_orme'), NOT(HELD), NOT(TORN)), once: true, next: 'owed' },
        { id: 'orme.a3.take', text: 'Give me the paper.', if: ALL(FOLDER_SEEN, NOT(HELD), NOT(TORN)), effects: PAPER_TAKEN, next: 'take' },
        { id: 'orme.a3.back', text: '(Put the folder back on her counter.)', if: HELD, effects: [{ take: 'k_a3_intake' }, ...PAPER_REFUSED], next: 'give_back' },
        { id: 'orme.a3.refuse', text: 'Put it away. Nobody behind that door is for sale.', if: ALL(FOLDER_SEEN, NOT(F('a3_guild'))), effects: PAPER_REFUSED, next: 'refuse' },
        { id: 'orme.a3.tear', text: '(Take it off her counter and tear it in half.)', if: ALL(FOLDER_SEEN, NOT(HELD), NOT(TORN)), once: true, effects: PAPER_TORN, next: 'tear' },
        { id: 'orme.a3.tear_own', text: '(Take the folder out of your pack and tear the paper in half on her counter.)', if: HELD, once: true, effects: [{ take: 'k_a3_intake' }, ...PAPER_TORN], next: 'tear' },
        { id: 'orme.a3.trade', text: 'What are you selling? (Trade)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { text: 'Later.', exit: true },
      ],
    },
    column: {
      text: '"The city\'s column buys nothing and pays for everything it takes, which is nothing, because it brought its own." She looks across the road at the tents. "In twenty years at this stand I have never had a customer I couldn\'t sell to. I don\'t know what to do with them."',
      again: '"I don\'t know what to do with them," Orme says.',
      options: [ORME_BACK],
    },
    paper: {
      text: 'She opens the folder and turns it round on the counter so you can read it, the way she has turned her ledger round for every debtor on this road: heavy cream paper with the closed eye in the corner. CONCERN OF HALCYON — INTAKE (THE WEIGHHOUSE) — CONTRACT OF LABOUR, TEN YEARS — RESERVE 9 (THE MOUTH), SIXTY (60) PERSONS, AS SUPPLY — CONSIDERATION TO THE PRECINCT OF MERIDIAN AT ASSESSED VALUE, PAID BY THE TOLLMEN\'S GUILD AS AGENT. A column of figures down the margin: forty Tolls a head. A line at the foot, blank. / "The city calls them supply," Orme says. "The Concern calls them intake. Intake gets paid."',
      again: 'The cream paper, the closed eye, forty Tolls a head.',
      effects: [{ learn: 'a3_intake_terms' }],
      interject: [
        { companion: TAMSIN, text: '"Forty," Tamsin says. She has gone white round the mouth. "Forty a head. Ines is worth forty."' },
        { companion: WREN, text: '"I\'ve seen that paper," Wren says, very quietly. "Different heading. Same column."' },
        { companion: KES, text: '"The closed eye," Kes says. "I was born under one of those."' },
        { companion: NINE, text: '"It is lawful," Nine says. "I would like that not to be the case. I note that I would like it."' },
        { companion: ODILE, text: 'Odile reads the figures upside down, as she reads everything. "Forty is not a price," she says. "It is a statement about who is selling."' },
      ],
      options: [ORME_BACK],
    },
    sign: {
      text: '"You do." She taps the blank line. "The city\'s order goes when you attend, as the first act of the chair. This rides on the same act: the chair may dispose of supply as it sees fit, which is the Precinct\'s own schedule and not mine." She closes the folder. "You put your name to one paper or the other at that door, love. The column\'s paper carries them to the Precinct for nothing. This one pays."',
      again: '"One paper or the other," Orme says.',
      effects: [{ learn: 'a3_intake_sign' }],
      options: [ORME_BACK],
    },
    weigh: {
      text: [
        { if: ALL(F('a3_guild_in'), HALE_HERE, NOT(F('a3_hale'))), text: '"The Concern\'s intake, at the foot of Halcyon. I\'ve never been." She says it too quickly, and hears herself say it. "I sell water. Ask Brannick, by the horses. He\'s walked people up that road."' },
        { text: '"The Concern\'s intake, at the foot of Halcyon. I\'ve never been." She says it too quickly, and hears herself say it. "I sell water. Ask anyone who\'s come back from it. There aren\'t many on this road."' },
      ],
      again: '"I sell water," Orme says.',
      options: [ORME_BACK],
    },
    stake: {
      text: '"The stand." She looks round it: the counter, the shelf, the box she keeps the Tolls in. "Twenty years I\'ve sold this slope MOTHER\'s water out of that hatch. When the door opens, one way or the other, there\'s no more hatch and no more water, and I\'m a factor with nothing to factor." She taps the folder. "Signed, the guild gives me the stand freehold and one in twenty off the top. A hundred and twenty Tolls and a roof. I\'ve carried worse paper for less, and so has everybody on this road who\'s ever had a roof."',
      again: '"A hundred and twenty and a roof," Orme says.',
      effects: [{ learn: 'a3_orme_stake' }],
      options: [ORME_BACK],
    },
    lowe: {
      text: '"He reads faster than anybody on this road." She almost smiles. "He hasn\'t read it because the day he does, he has two lawful papers on one door and has to choose between them, and he\'d rather the designate chose. So would I, in his boots." She lays her hand flat on the folder. "So it waits for you. Everything on this slope waits for you."',
      again: '"Everything on this slope waits for you," Orme says.',
      options: [ORME_BACK],
    },
    told: {
      text: 'She listens to all of it with her hand flat on the folder. When you have finished she takes the hand away. "I sell water," she says. "I\'ve sold nobody up that road." It is not an argument; she is telling herself. "I\'ll not ask you again. If you want it, it\'s on the counter." She turns the ledger back round to face her, and does not look up.',
      again: 'Orme does not look up from the ledger.',
      effects: [{ memory: { npc: ORME, tag: 'a3_told_weighhouse', valence: 5, strength: 80 } }],
      options: [ORME_BACK],
    },
    owed: {
      text: '"I did." She does not pretend not to remember. "Your sister, at this counter, and a buyer with a stick. I said you\'d owe me." She looks at the folder, and at you. "I\'ll take it now, then. Carry this to the door. Don\'t sign it, if you don\'t want to. Carry it. Then we\'re square, and you can tear it up on the apron in front of the captain for all I care."',
      again: '"Carry it," Orme says. "That\'s all."',
      options: [
        { id: 'orme.a3.owed.yes', text: 'Done. Give it here.', effects: [...PAPER_TAKEN, { set: 'kn_owes_orme', value: false }, TRUST(ORME, 10)], next: 'take' },
        { id: 'orme.a3.owed.no', text: 'Not this. Ask me for something else.', next: 'owed_no' },
      ],
    },
    owed_no: {
      text: '"There isn\'t anything else, love. Not on this road, not now." She shrugs. "Keep owing me. I\'ve carried longer debts than yours."',
      again: '"Keep owing me," Orme says.',
      options: [ORME_BACK],
    },
    take: {
      text: '"It\'s yours to carry." She slides the folder across. "The guild pays on a signature, not a carry. Sign it at the door, or don\'t." She turns her ledger round to face her again, and finds something to write in it.',
      again: '"Sign it at the door, or don\'t," Orme says.',
      interject: [{ companion: TAMSIN, text: 'Tamsin watches the folder go into your pack and says nothing at all. Later, on the lane, you notice she is walking on your other side.' }],
      options: [ORME_BACK],
    },
    give_back: {
      text: '"Changed your mind." She takes it back without comment and puts it under the ledger, and squares the ledger on top. "Paper always keeps."',
      again: '"Paper always keeps," Orme says.',
      options: [ORME_BACK],
    },
    refuse: {
      text: '"Nobody\'s for sale." Orme closes the folder and puts it under her ledger, and squares the ledger on top of it. "Everybody on this road is for sale, love. They just don\'t like the price." She does not say it unkindly. "It\'ll keep. Paper always keeps."',
      again: '"Paper always keeps," Orme says.',
      options: [ORME_BACK],
    },
    tear: {
      text: 'You tear it in half, and in half again, and put the pieces down in front of her. Orme looks at them for a long moment. Then she sweeps them into her palm and drops them in the toll box with the day\'s Tolls. "There\'s another in Ninebridge," she says. "There\'s always another." But she does not say it unkindly, and when she turns her ledger round again her hand is not quite steady.',
      again: 'The torn paper in the toll box.',
      interject: [{ companion: WREN, text: 'Wren grins, the first time since the road. "That\'s one," she says.' }],
      options: [ORME_BACK],
    },
  },
};

// ---------------------------------------------------------------- Brannick Hale, with the guild's horses

const MAUD_HARD: Cond = ALL(SCARRED, NOT(F('a3_maud')));
const MAUD_MERCIFUL: Cond = ANY(F('a3_maud'), ALL(NOT(SCARRED), { trust: { npc: MAUD, gte: 20 } }));
const ANSWERED: Effect[] = [
  { set: 'a3_hale', value: 'answered' }, { memory: { npc: MAUD, tag: 'a3_judged_hale', valence: 10, strength: 90 } }, { rep: { faction: 'tollmen', respect: -5 } }, { xp: 80 },
  { news: { tag: 'a3_hale_answered', text: 'the guild outrider who burned Knock\'s post-house is building it back, board by board, on Maud Ferrow\'s word', valence: 6, size: 6, at: 'cistern9' } },
  { decision: { id: 'a3_hale', text: 'At Knock I took Brannick Hale down the lane to Maud. She set him to rebuild the post-house he burned, and to walk nobody up the road for the guild.' } },
];
const SENT_OFF: Effect[] = [
  { set: 'a3_hale', value: 'gone' }, { memory: { npc: MAUD, tag: 'a3_judged_hale', valence: 5, strength: 80 } }, { xp: 50 },
  { decision: { id: 'a3_hale', text: 'At Knock I took Brannick Hale down the lane to Maud, and she sent him off her slope.' } },
];
const HALE_FIGHT: Effect[] = [
  { set: 'a3_hale_fight' }, { rep: { faction: 'tollmen', respect: -10, fear: 5 } },
  { decision: { id: 'a3_hale_fight', text: 'At Knock I drew on Brannick Hale, the outrider who burned the post-house.' } },
  { event: 'combat' },
];
/** Set by the map's after-trigger once he is down. */
export const HALE_KILLED: Effect[] = [
  { set: 'a3_hale', value: 'dead' }, { rep: { faction: 'tollmen', respect: -5, fear: 5 } }, { xp: 60 },
  { decision: { id: 'a3_hale', text: 'At Knock I killed Brannick Hale, the outrider who burned the post-house, on the guild\'s own ground.' } },
];
const HALE_BACK: OptionDef = { text: '(Go on.)', next: 'hub' };
const OUT_LINE: Part[] = [
  { if: F('kn_out_choice', 'gave'), text: '"You gave me a book once, in that square," he says. "I burned the house anyway. I have thought about that more than I have thought about most things."' },
  { if: F('kn_out_choice', 'lied'), text: '"You told me he was buried with his things," he says. "I knew it by the second word, and let it go. I didn\'t want his book that much. I wanted the due."' },
  { if: F('kn_out_choice', 'caught'), text: '"Carrow found the book in the end," he says. "And the old woman came at him with hers."' },
  { if: F('kn_out_choice', 'hid'), text: '"We never found it," he says. "I didn\'t know you\'d had it in your boot till a man at Ninebridge sold me the story for a Toll."' },
  { if: F('kn_out_choice', 'beaten'), text: '"You put your arm up to the rise, and Corin missed," he says, and glances up at it. "Corin doesn\'t miss. I\'ve wondered about that since."' },
  { text: '"Knock," he says. "I said I\'d not come back here."' },
];

export const d_a3_hale: DialogueDef = {
  id: 'd_a3_hale', owner: HALE,
  start: [
    { if: ALL(F('a3_hale', 'answered'), NOT(KNOWS('a3_hale_boards'))), node: 'boards' },
    { if: NOT(KNOWS('a3_hale_met')), node: 'horses' },
    { node: 'hub' },
  ],
  nodes: {
    horses: {
      text: around(OUT_LINE, (line) => `Brannick Hale on the flat east of the stand with the guild's horses, grey all through now, a faded green sash across his duster, and still polite about it. He looks at you, at your face, a moment too long, as he did once in the square. ${line} Then he looks past you: down the lane at the hatch, where a small woman sits on a stool, and up the slope at the rise, where a rifle has been pointed at him since he rode in. "Not you I came to see."`),
      again: 'Hale with the horses, watching the lane.',
      effects: [{ learn: 'a3_hale_met' }],
      interject: [
        { companion: WREN, text: 'Wren looks at the green sash, and at the revolver under it, and at his hands. "Outrider," she says, the way the Dogs say it. Hale touches his hat to her. "Dog," he says, quite politely.' },
        { companion: TAMSIN, text: 'Tamsin looks from Hale to the black frame of the post-house down the lane, and you watch her work out who he is from what you have told her. She does not say anything. She does not need to.' },
      ],
      options: [HALE_BACK],
    },
    hub: {
      text: [
        { if: F('a3_hale', 'answered'), text: 'Hale on the post-house\'s new frame with a hammer, his duster off and the green gone from his shoulders.' },
        { text: 'Hale with the guild\'s horses, his hat in his hands.' },
      ],
      again: 'Hale waits. He has been waiting since he rode in.',
      options: [
        { id: 'hale.job', text: 'What are you here for?', once: true, next: 'job' },
        { id: 'hale.weigh', text: 'What is the Weighhouse?', if: ANY(SEEN('hale.job'), SEEN('orme.a3.weigh')), once: true, next: 'weigh' },
        { id: 'hale.house', text: 'The post-house.', once: true, next: 'house' },
        { id: 'hale.corin', text: 'Corin.', if: ANY(KNOWS('corin_rode_with_hale'), KNOWS('a3_corin_hale')), once: true, next: 'corin' },
        { id: 'hale.guild', text: 'Will the guild let you go?', if: F('a3_hale', 'answered'), once: true, next: 'let_go' },
        { id: 'hale.maud', text: '(Take him down the lane to Maud.)', if: ALL(SEEN('hale.house'), NOT(F('a3_hale'))), next: 'maud' },
        { id: 'hale.draw', text: '(Draw on him.)', if: NOT(F('a3_hale')), next: 'draw' },
        { text: 'Later.', exit: true },
      ],
    },
    job: {
      text: [
        { if: HOUNDS_IN_PLAY, text: '"Possession." He says it the way the guild writes it. "Factor Orme has a paper on her counter. If somebody signs it, sixty people come out of that door and walk up the toll road to the Weighhouse, and somebody has to walk in front of them who knows the road. The handlers walk the dogs beside them. I walk in front." He turns his hat in his hands. "If nobody signs it, I sit here and feed the horses until the guild says go home."' },
        { text: '"Possession." He says it the way the guild writes it. "Factor Orme has a paper on her counter. If somebody signs it, sixty people come out of that door and walk up the toll road to the Weighhouse, and somebody has to walk in front of them who knows the road. I know the road." He turns his hat in his hands. "If nobody signs it, I sit here and feed the horses until the guild says go home."' },
      ],
      again: '"Possession," Hale says.',
      effects: [{ learn: 'a3_hale_job' }],
      options: [HALE_BACK],
    },
    weigh: {
      text: '"The Concern\'s intake. A shed the size of a hill at the foot of Halcyon, on the Skirts side." He looks at his hands on the hat. "They weigh you. That\'s the name. Height, teeth, lungs, how long you\'ll last under contract. Then a grade, and a work line, and a bench. Most come out the far end of the ten years." He does not say anything for a moment. "The ones who don\'t come out aren\'t written down as dead. They\'re written down as fulfilled. Some of the grades aren\'t for work." He looks at the door. "I\'ve walked people up there four times. I can tell you which ones won\'t come out by how they walk up the road."',
      again: '"Fulfilled," Hale says.',
      effects: [{ learn: 'a3_weighhouse' }],
      interject: [
        { companion: KES, text: '"Spare Parts," Kes says. Her voice is very flat. "That\'s what we call the grades that aren\'t for work, in the Skirts. Everybody there knows somebody."' },
        { companion: TAMSIN, text: 'Tamsin has stopped breathing. You can see her do it, and start again.' },
      ],
      options: [HALE_BACK],
    },
    house: {
      text: [
        { if: SCARRED, text: '"The due." He does not flinch from it. "It\'s what the guild does when a place has cost it trouble: you take something they can see from the road, so the next place remembers. I\'ve taken eleven. Yours was the eleventh." He turns his hat in his hands. "The old woman went in after a book. I watched her go in and I got on my horse. I\'ve seen her on that stool with the stick since I rode in, and I haven\'t gone down the lane." A long breath. "I came down this road with Orme because I wanted to stand in front of her and say it, and let her say what she likes. Not to you. To her."' },
        { text: '"The due." He does not flinch from it. "It\'s what the guild does when a place has cost it trouble: you take something they can see from the road, so the next place remembers. I\'ve taken eleven. Yours was the eleventh." He turns his hat in his hands. "The old woman went in after a book. I watched her go in and I got on my horse. The guild calls that a due." A long breath. "I don\'t know what I call it. I came down this road with Orme because I wanted to stand in front of her and say it, and let her say what she likes. Not to you. To her."' },
      ],
      again: '"To her," Hale says. "Not to you."',
      effects: [{ learn: 'a3_hale_due' }],
      interject: [{ companion: ILYA, text: 'Ilya looks at the outrider for a long moment. "Eleven," he says. "You counted." "Every one," Hale says. Ilya nods, slowly, as if that were the only thing about the man he understood.' }],
      options: [HALE_BACK],
    },
    corin: {
      text: [
        { if: KNOWS('a3_corin_hale'), text: '"He held the horses. I went in." He looks up at the rise. "A debt on a book and a door that wouldn\'t open, at a cut north of the Wet, twenty years back. I opened it. Thirty-one people walked up a road to the Weighhouse behind my horse, and Corin rode out the next morning without his pay, and I got his share." You tell him what Corin said: that what happens to Hale is Maud\'s to decide. Hale nods slowly. "Then he\'s a better man than he was," he says. "He always was."' },
        { text: '"He held the horses. I went in." He looks up at the rise. "A debt on a book and a door that wouldn\'t open, at a cut north of the Wet, twenty years back. I opened it. Thirty-one people walked up a road to the Weighhouse behind my horse, and Corin rode out the next morning without his pay, and I got his share." A pause. "He\'s had that rifle on me since I came down the road. He hasn\'t used it. I\'d like to know why before I go."' },
      ],
      again: '"Thirty-one," Hale says.',
      effects: [{ learn: 'a3_hale_door' }],
      options: [HALE_BACK],
    },
    let_go: {
      text: '"The guild doesn\'t let anybody go." He sets a nail and drives it in three strokes. "It stops paying them. That\'s all it\'s ever done to anybody, so I know how to live with it." Up the ladder at the other end, Dace says something about how a man who has only ever held a rifle holds a hammer, and Hale lets him.',
      again: 'Hale drives a nail in three strokes.',
      options: [HALE_BACK],
    },
    boards: {
      text: 'Brannick Hale on the post-house\'s new frame with a hammer, his duster off and the green gone from his shoulders. Dace is up a ladder at the other end telling him he holds a hammer like a man who has only ever held a rifle, and Hale is letting him. He sees you and nods, and goes on with the nail.',
      again: 'Hale and the hammer.',
      effects: [{ learn: 'a3_hale_boards' }, { learn: 'a3_hale_met' }],
      options: [HALE_BACK],
    },
    maud: {
      speaker: MAUD,
      text: [
        { if: SCARRED, text: 'You walk him down the lane past the doors, and Knock comes to them to watch. Maud is on her stool by the hatch. She sees who it is and puts both hands on the stick across her knees. Hale stops in front of her and takes his hat off. / "I lit your house," he says. "I watched you go in after the book, and I got on my horse. The guild calls it a due. I don\'t know what to call it. I\'ve come to be told." / Maud looks at him for a long time. Up on the rise, the rifle has not moved. Then she looks at you. "What do you say, love?"' },
        { text: 'You walk him down the lane past the doors, and Knock comes to them to watch. Maud is on her stool by the hatch. She sees who it is, and her hand goes to the old burn on her forearm and stays there. Hale stops in front of her and takes his hat off. / "I lit your house," he says. "I watched you go in after the book, and I got on my horse. The guild calls it a due. I don\'t know what to call it. I\'ve come to be told." / Maud looks at him for a long time. Up on the rise, the rifle has not moved. Then she looks at you. "What do you say, love?"' },
      ],
      again: '"What do you say, love?" Maud asks again.',
      effects: [{ time: 20 }],
      options: [
        { id: 'hale.m.answer', text: 'Let him answer for it. Here, with his hands.', if: NOT(MAUD_HARD), effects: ANSWERED, next: 'answered' },
        { id: 'hale.m.answer_hard', text: 'Let him answer for it. Here, with his hands.', if: MAUD_HARD, effects: SENT_OFF, next: 'not_for_you' },
        { id: 'hale.m.off', text: 'Send him off the slope.', if: NOT(F('a3_maud')), effects: SENT_OFF, next: 'sent' },
        { id: 'hale.m.off_mercy', text: 'Send him off the slope.', if: F('a3_maud'), effects: ANSWERED, next: 'mercy' },
        { id: 'hale.m.yours', text: 'It\'s yours to say, Maud.', if: MAUD_MERCIFUL, effects: ANSWERED, next: 'answered' },
        { id: 'hale.m.yours_off', text: 'It\'s yours to say, Maud.', if: NOT(MAUD_MERCIFUL), effects: SENT_OFF, next: 'sent' },
      ],
    },
    answered: {
      speaker: MAUD,
      text: '"You\'ll put my house back up." Maud does not raise her voice; she never has. "Every board. With Dace, who\'s started it, and with your own hands, and you\'ll not take a Toll for it from anybody. And you\'ll not walk anybody up that road. Not mine and not theirs." She nods at the door. "That\'s your due." / Hale stands there with his hat in his hands. Then he unpins the green sash and folds it, the way a man folds something he has worn a long time, and walks back up the lane with it to Orme\'s counter and puts it down beside her folder, and walks down again to where Dace\'s new boards are stacked, and picks up a hammer. On the rise, the rifle comes down.',
      interject: [{ companion: TAMSIN, text: 'Tamsin sits down on the apron beside Maud\'s stool, close, the way a child sits. Maud\'s hand finds her head without looking.' }],
      options: [{ id: 'hale.answered.go', text: '(Leave them to it.)', exit: true }],
    },
    mercy: {
      speaker: MAUD,
      text: '"No," Maud says, and you have never heard her say it to you like that. "I sold a letter out of that hatch once, to a man like him, for a box of tablets. I don\'t get to send anybody off my slope for what they did with paper." She looks at Hale. "You\'ll put my house back up. Every board, with Dace, with your own hands, and not a Toll for it from anybody. And you\'ll not walk anybody up that road. Not mine and not theirs. That\'s your due." / Hale unpins the green sash and folds it, the way a man folds something he has worn a long time, and walks back up the lane with it to Orme\'s counter, and walks down again to where Dace\'s new boards are stacked, and picks up a hammer. On the rise, the rifle comes down.',
      options: [{ id: 'hale.mercy.go', text: '(Leave them to it.)', exit: true }],
    },
    not_for_you: {
      speaker: MAUD,
      text: '"No." She does not look at you. "Not for you, love, and not for him. I walk on a stick because of that man\'s due, and I\'ll not have him knocking nails into my house where I can hear it." She looks at Hale. "Get off my slope." / He puts his hat back on. He nods to her, once, and to you, and walks back up the lane to the guild\'s horses and takes his own, and rides north up the toll road alone, past the column\'s tents, without the guild\'s leave. On the rise, the rifle follows him all the way to the top of the road, and does not fire.',
      options: [{ id: 'hale.nfy.go', text: '(Watch him go.)', exit: true }],
    },
    sent: {
      speaker: MAUD,
      text: '"Get off my slope." She says it quite gently. Hale puts his hat back on. He nods to her, once, and to you, and walks back up the lane to the guild\'s horses and takes his own, and rides north up the toll road alone, past the column\'s tents, without the guild\'s leave. On the rise, the rifle follows him all the way to the top of the road, and does not fire.',
      options: [{ id: 'hale.sent.go', text: '(Watch him go.)', exit: true }],
    },
    draw: {
      text: 'Hale sees it in your face before your hand moves. He sets his hat on the saddle, carefully, crown down. "Ah," he says. "I did wonder which of you it would be." Behind him the handlers wrap their leads twice round their fists and step back from it, and do not reach for anything.',
      again: 'Hale waits, his hat on the saddle.',
      options: [
        { id: 'hale.draw.yes', text: '(Draw.)', effects: HALE_FIGHT, exit: true },
        { id: 'hale.draw.no', text: '(Not like this.)', next: 'hub' },
      ],
    },
  },
};

// ---------------------------------------------------------------- the hound handlers

export const d_a3_handlers: DialogueDef = {
  id: 'd_a3_handlers', owner: G11,
  start: [{ if: NOT(KNOWS('a3_handlers_met')), node: 'first' }, { node: 'hub' }],
  nodes: {
    first: {
      text: 'The guild\'s two hound handlers, squatting on the flat east of the stand with their leads wrapped twice round their gauntlets: Ansgar Wilmot, bearded and grey-eyed, and Ebun Nkemelu, younger, her cornrows tied back under a cap. On the end of each lead, something low and grey that does not move and does not sleep. "Don\'t look her in the lens," Ansgar says. "She doesn\'t like it. I don\'t like it."',
      again: 'The handlers, and the grey things on the leads.',
      effects: [{ learn: 'a3_handlers_met' }],
      interject: [{ companion: KES, text: 'Kes has stopped walking. Her hand is at the back of her neck, over the port. "Those answer the same box I do," she says, very low. "Don\'t let them near me."' }],
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
    hub: {
      text: 'Ansgar and Ebun, and the leads.',
      again: 'Neither of them takes their eyes off the hounds.',
      options: [
        { id: 'hand.what', text: 'What are they?', once: true, next: 'what' },
        { id: 'hand.for', text: 'What are they for, here?', once: true, next: 'for' },
        { id: 'hand.whose', text: 'Whose are they?', once: true, next: 'whose' },
        { text: '(Leave them.)', exit: true },
      ],
    },
    what: {
      text: '"Border hounds. Pre-Scald." Ansgar scratches his beard with the back of a gauntlet. "They come out of the ground warm, in cradles, under netting, like they were put down yesterday. The guild bought the boards that wake them. Don\'t ask what off." / "They don\'t eat," Ebun says. "They don\'t sleep. They count. That one\'s counted you three times since you came over."',
      again: '"They count," Ebun says.',
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
    for: {
      speaker: G12,
      text: '"The paper," Ebun says. "Factor Orme\'s. If it\'s signed, sixty people walk up that road, and these walk beside them so nobody walks off." She says it the way you would say the weather. "If it\'s not signed, they lie there. They\'re good at lying there."',
      again: '"They\'re good at lying there," Ebun says.',
      effects: [{ learn: 'a3_hounds_for' }],
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
    whose: {
      text: '"The guild\'s, on a lease. The boards are the Concern\'s." Ansgar looks down at the box on his belt: a grey case with a closed eye stamped into its lid. "When it says lie down, they lie down. When it says something else, I hope I\'m not the one holding the lead."',
      again: '"I hope I\'m not the one holding the lead," Ansgar says.',
      effects: [{ learn: 'a3_hounds_whose' }],
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
  },
};

export const A3_FORCES_DIALOGUES: DialogueDef[] = [d_a3_petra, d_a3_thaddeus, d_a3_rhoda, d_a3_burning, d_a3_orme, d_a3_hale, d_a3_handlers];
