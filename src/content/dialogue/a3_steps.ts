import type { DialogueDef, NodeDef, OptionDef, PassiveDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  ALLY, ASH, ASH_DUE, ASH_MODE_IS, ASH_TARGET, B_MEANS, BLADE_DUE, BLADE_FIGHTING, COMPANIONS, HEARING_OPEN, ILYA, IN, KES, LOWE, LOWE_DEAD,
  NINE, NINE_CONSCIENCE, NINE_DEPUTY, ODILE, ON_STEPS, PETRA_DEAD, RESERVE_STAYED, REYES, SIGN_FRIENDLY, STEPS_WORN, TAM_ASKS, TAMSIN, WREN,
  type CompanionKey,
} from '../world/a3_conds';

/**
 * The steps (B6p, beat 21b). After the point of no return (`a3_pnr`, B6m's "(Go up.)", which opens this tree), the photograph is
 * made again on the Spire's steps at the designate's own age (`{ event: 'photo' }`), with the close come up to the foot of the steps
 * and everyone on the player's side standing on them. Assessor Three brings the sash down from the doors.
 * - **The second hearing** (E_FILE's third way, once, before the sash is answered; not if the file already says CONTESTED): the
 *   Ledger, through the inch of light between the great doors, asks its one question again. Speech 55, with the plan's modifiers.
 *   Sets `a3_file` = contested | failed.
 * - **The sash**: taken or not (`a3_steps_sash` = worn | refused). Worn, it can be taken off again once, under a blade or a
 *   friend's gun (`a3_steps_off`). Refused, nothing is owed and nobody comes up the steps for it.
 * - **Tamsin's question**, once the sash is on and she is on the steps: "What's the first thing you'll sign?" (`a3_first_sign` =
 *   people | door | nothing | water | unsure). Ash asks it himself when his orders are undecided and she is not there.
 * - **Ash's orders played out** (`ASH_MODE`, U8 S4 as the fire left it): the order falls on himself (`self`: only with low approval
 *   and "make it clean" never taken back, and never with the letter burned; on the steps, never off-screen, and the player can
 *   still reach him or take the sash off) · he stands on the step below (`between`: the letter burned) · he walks away to put it on
 *   a keystone who wears theirs gladly (`away`, `a3_ash_target`) · he decides by what the player says they will sign first ·
 *   he comes to the player's face (`faced` by talk or by taking the sash off; `struck` when he draws and the vow holds his finger).
 * - **The Unwritten's blade** (Thaddeus Wolde, `npc_a3_u2`), when the sash is on and the sky is owed: the Unwritten came east for
 *   the book, or Ash refused his own orders and his brothers sent another hand. Ash takes the cut if he stands between (`a3_blade`
 *   = ash), or the player talks him down (talked), calls the wardens (wardens), fights him on the steps (fought: `a3_blade_fight`,
 *   his placement hostile, the map's after-trigger), or takes the sash off (off).
 * - **The end of the steps**: `a3_sash` = worn | refused is written once, as the player goes down to the steel door (so AT_VAULT means
 *   the steps are done), and `q_a3_spire` moves to the vault. The vault is B6q's.
 * Also `d_a3_steps_lowe`: the column's lead at the foot of the steps (Lowe, or Reyes). Nothing here waits on a clock, and nothing
 * happens to the player unasked: every beat waits for the player's word. Story notes: story/B6_NOTES_SECRET.md §2.2 21b, §7 (Ash),
 * §8 B6p and "As built" → B6p.
 */

const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const SEEN = (id: string): Cond => ({ seen: id });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const DECIDE = (id: string, text: string): Effect => ({ decision: { id, text } });

const THREE = 'npc_ar_01', VOICE = 'npc_ar_voice', THAD = 'npc_a3_u2';
const VERITY = 'npc_bw_04', SEVENTEEN = 'npc_nw_04';
/** The blade's placement on the steps (gen_md_spire.py); dead there only after the fight on the steps. */
const THAD_STEPS = `${THAD}_steps`;
const BLADE_FOUGHT: Cond = ALL(F('a3_blade_fight'), { dead: THAD_STEPS }, NOT(F('a3_blade')));
const UW_EAST: Cond = F('a3_unwritten', 'with_you');
/** Petra (or Juniper, Petra dead) said it to the player's face at the close (B6l's `a3uc.sash`). */
const PETRA_WARNED: Cond = ANY(...['.p', '.p.hub', '.j', '.j.hub'].map((x) => SEEN(`a3uc.sash${x}`)));
const ASH_BETWEEN: Cond = ALL(F('a3_ash', 'between'), ON_STEPS('ash'));
const REFUSED_NOW: Cond = F('a3_steps_sash', 'refused');
const NONE_PENDING: Cond = NOT(ANY(TAM_ASKS, ASH_DUE, BLADE_DUE));
/** Waiting at the close until the steps (not travelling): they came up from the close and stand on the steps (placed there). */
const CAME_UP = (c: CompanionKey): Cond => ALL(ON_STEPS(c), NOT(IN(COMPANIONS[c].id)));
const OFF_EFFECTS: Effect[] = [{ set: 'a3_steps_sash', value: 'refused' }, { set: 'a3_steps_off' }];

// ---------------------------------------------------------------- the beats, in order: Tamsin's question, Ash, the blade, the door

const MODE = (m: string): Cond => ALL(ASH_DUE, NOT(TAM_ASKS), ASH_MODE_IS(m));
const TARGET = (t: string): Cond => {
  const i = ASH_TARGET.values.findIndex((v) => v.id === t);
  return ALL(ASH_TARGET.values[i].if!, ...ASH_TARGET.values.slice(0, i).map((v) => NOT(v.if!)));
};
const END = (v: 'worn' | 'refused', text: string): Effect[] => [{ set: 'a3_sash', value: v }, { xp: 300 }, DECIDE('a3_sash', text)];

/** The next beat, offered as the one way on (each beat's own effects make its condition false). */
function onward(x: string): OptionDef[] {
  return [
    { id: `st.on.tam.${x}`, text: '(Tamsin is looking at you, not at the sash.)', if: TAM_ASKS, next: 'tam_q' },
    { id: `st.on.self.${x}`, text: '(Ash has gone back down the steps, to the lamp.)', if: MODE('self'), next: 'ash_self_warn' },
    { id: `st.on.between.${x}`, text: '(Ash is coming up the steps behind you.)', if: MODE('between'), next: 'ash_between' },
    { id: `st.on.away.vane.${x}`, text: '(Look round for Ash.)', if: ALL(MODE('away'), TARGET('vane')), next: 'ash_away_vane' },
    { id: `st.on.away.vasha.${x}`, text: '(Look round for Ash.)', if: ALL(MODE('away'), TARGET('vasha')), next: 'ash_away_vasha' },
    { id: `st.on.away.sarr.${x}`, text: '(Look round for Ash.)', if: ALL(MODE('away'), TARGET('sarr')), next: 'ash_away_sarr' },
    { id: `st.on.ask.${x}`, text: '(Ash is coming up the steps to you.)', if: ALL(MODE('weigh'), NOT(F('a3_first_sign'))), next: 'ash_ask' },
    { id: `st.on.friend.${x}`, text: '(Ash is coming up the steps to you.)', if: ALL(MODE('weigh'), F('a3_first_sign'), SIGN_FRIENDLY), next: 'ash_friend' },
    { id: `st.on.weighed.${x}`, text: '(Ash is coming up the steps to you.)', if: ALL(MODE('weigh'), F('a3_first_sign'), NOT(SIGN_FRIENDLY)), next: 'ash_face' },
    { id: `st.on.face.${x}`, text: '(Ash is coming up the steps to you.)', if: MODE('face'), next: 'ash_face' },
    { id: `st.on.blade.${x}`, text: '(Somebody is coming up the steps.)', if: ALL(BLADE_DUE, NOT(TAM_ASKS), NOT(ASH_DUE)), next: 'blade' },
    {
      id: `st.on.end.w.${x}`, text: '(Go down to the steel door.)', if: ALL(NONE_PENDING, STEPS_WORN), next: 'st_end',
      effects: END('worn', 'On the Spire\'s steps, where the photograph was made, I took the Magistrate\'s sash, and wore it down to the vault.'),
    },
    {
      id: `st.on.end.o.${x}`, text: '(Go down to the steel door.)', if: ALL(NONE_PENDING, REFUSED_NOW, F('a3_steps_off')), next: 'st_end',
      effects: END('refused', 'On the Spire\'s steps I put the Magistrate\'s sash on, and took it off again, and went down to the vault without it.'),
    },
    {
      id: `st.on.end.r.${x}`, text: '(Go down to the steel door.)', if: ALL(NONE_PENDING, REFUSED_NOW, NOT(F('a3_steps_off'))), next: 'st_end',
      effects: END('refused', 'On the Spire\'s steps, where the photograph was made, I would not take the Magistrate\'s sash.'),
    },
  ];
}

// ---------------------------------------------------------------- who is on the steps, and who came to the foot of them

const CAME_UP_TEXT: Record<CompanionKey, string> = {
  tamsin: 'Tamsin, one step down, where she said she would be. Where the photographer was.',
  wren: 'Wren on the steps\' east end with her back to the balustrade, so that she can see the lane and the doors at once.',
  ilya: 'Ilya three steps down, counting the windows of the Crown that look onto the steps, and then the ones that don\'t.',
  odile: 'Odile on the step below Ilya with her gloves on, in the good coat, exactly as if she had been invited.',
  ash: 'Ash at the foot of the steps, on the bottom one, where he stood the first time you brought him here.',
  nine: 'Nine two steps below you with its ledger shut under its arm, its lens going from you to the doors and back.',
  kes: 'Kes sitting on the steps with her knees up and her hand at the back of her neck, the way she sits on a roof.',
};
const STEPS_PASSIVES: PassiveDef[] = [
  ...(Object.keys(CAME_UP_TEXT) as CompanionKey[]).map((c): PassiveDef => ({ if: CAME_UP(c), label: c === 'nine' ? 'Nine' : c[0].toUpperCase() + c.slice(1), text: CAME_UP_TEXT[c] })),
  { if: NOT(LOWE_DEAD), label: 'the column', text: 'Captain Lowe at the foot of the steps with his cap under his arm, and the column\'s grey behind him in two lines, rifles slung, faces to the crowd and not to you.' },
  { if: ALL(LOWE_DEAD, NOT({ dead: REYES }), NOT({ dead: `${REYES}_apron` })), label: 'the column', text: 'Sergeant Reyes at the foot of the steps, where the captain would stand, and the column\'s grey behind her in two lines, rifles slung.' },
  { if: ALLY('choir'), label: 'the Choir', text: 'Along the west side of the close, forty of the Choir in grey with Sister Keziah at their head, unlit lamps in their hands. They are not singing yet.' },
  { if: ALLY('wheel'), label: 'the Wheel', text: 'At the lane mouth, Lucan Begay and six riders of the Wheel with pan dust to the knee, watching the steps the way they watch a road.' },
  { if: ALLY('stand'), label: 'Carrick\'s Stand', text: 'Along the east wall, a line of dockers in their caps with Ifeoma Okonjo at the end of it, standing as if somebody might try to load the steps onto a barge.' },
  { if: ALLY('gangs'), label: 'the chain', text: 'Tuan Dinh and a runner from each of the chain\'s crews, standing a careful yard apart from one another, on purpose, in public.' },
  { if: ALL(ALLY('saints'), NOT({ dead: VERITY })), label: 'the Saints', text: 'Verity at the front of the crowd with a receiver on a strap over her shoulder, the volume turned all the way down, listening to it anyway.' },
  { if: ALL(ALLY('seventeen'), NOT({ dead: SEVENTEEN })), label: 'an assessor of the Wet', text: 'Assessor Seventeen, very still beside the empty plinth, its lens on you. It is entering all of this.' },
  {
    if: UW_EAST, label: 'the Unwritten',
    text: [
      { if: PETRA_DEAD, text: 'At the west end of the foot of the steps, Juniper Lowry with her hood down and her face bare to the city\'s lamps, and Thaddeus beside her with the machete across his knees. Rhoda has her back to the Spire.' },
      { text: 'At the west end of the foot of the steps, Petra Mason with her hood down and her face bare to the city\'s lamps, and Thaddeus beside her with the machete across his knees. Rhoda has her back to the Spire.' },
    ],
  },
  { label: 'the close', text: 'Behind all of them, the towers have come down to see: clerks in their good coats, Faulk\'s labourers with stone dust in their hair, a woman holding a child up on her hip so it can see over the wardens. Nobody told them anything. They have come anyway, the way people come to a fire.' },
];

// ---------------------------------------------------------------- the answers to "What's the first thing you'll sign?"

type Sign = 'people' | 'door' | 'nothing' | 'water' | 'unsure';
const SIGNS: { id: Sign; text: string; tam: number }[] = [
  { id: 'people', text: 'Nothing that counts a person. Not one line of it.', tam: 5 },
  { id: 'door', text: 'Knock\'s door. Whatever the people behind it want done with it.', tam: 3 },
  { id: 'nothing', text: 'Nothing. I\'ll wear it as far as the bottom of this tower, and no further.', tam: 3 },
  { id: 'water', text: 'Whatever keeps the water running in the towers.', tam: -5 },
  { id: 'unsure', text: 'I don\'t know yet. I won\'t lie to you about it.', tam: 2 },
];
const signOptions = (p: string, next: (s: Sign) => string, who: string): OptionDef[] =>
  SIGNS.map((s) => ({ id: `${p}.${s.id}`, text: s.text, effects: [{ set: 'a3_first_sign', value: s.id }, ...(who === TAMSIN ? [A(TAMSIN, s.tam)] : [])], next: next(s.id) }));

// ---------------------------------------------------------------- the checks

const HEARING_MODS = [
  { if: RESERVE_STAYED, dc: -10, why: 'the Court of Accounts stayed its order for the Cistern' },
  { if: F('a3_c9', 'opened'), dc: -5, why: 'the people its record kept are out under the sky, by their own vote' },
  { if: ANY(F('a3_recall', 'court'), F('a3_recall', 'declined')), dc: -5, why: 'one of its own units was kept from its schedule' },
  { if: F('nine_log_given'), dc: -10, why: 'you carry Unit 9\'s count of the forecasts that failed' },
  { if: F('jonah_lived'), dc: -10, why: 'Shale\'s deputy lived' },
  { if: ON_STEPS('nine'), dc: -5, why: 'Unit 9 is standing on the steps with you' },
  { if: F('cr_crown_hostile'), dc: 10, why: 'the Crown has turned against you, and the record has it' },
];
const FACE_MODS = [
  { if: { approval: { companion: ASH, gte: 40 } }, dc: -15, why: 'he has said your name, and meant it' },
  { if: F('ash_gully_outcome', 'spoken'), dc: -10, why: 'you stood with him at the seed store while he said the nineteen names' },
  { if: F('a3_ash_clean_back'), dc: -10, why: 'you took back "make it clean", the night before' },
  { if: SIGN_FRIENDLY, dc: -10, why: 'he heard what you said you would sign first' },
  { if: F('a3_ash_heard', 'people'), dc: -5, why: 'you told him the same thing at the fire' },
  { if: B_MEANS, dc: -5, why: 'he knows what you are carrying down' },
  { if: F('a3_ash_word'), dc: 15, why: 'you gave him your word you would not put it on' },
  { if: ALL(F('ash_stance', 'clean'), NOT(F('a3_ash_clean_back'))), dc: 10, why: 'you once told him to make it clean' },
];
const GUN_MODS = [
  { if: F('ash_gully_outcome', 'spoken'), dc: -10, why: 'you stood with him at the seed store while he said the nineteen names' },
  { if: F('a3_ash_night'), dc: -10, why: 'you sat with him by the fire the last night and let him talk about soil' },
  { if: SIGN_FRIENDLY, dc: -10, why: 'he heard what you said you would sign first' },
  { if: ON_STEPS('tamsin'), dc: -5, why: 'Tamsin is already halfway down the steps to him, saying his name' },
  { if: { approval: { companion: ASH, gte: 10 } }, dc: -5, why: 'it is the letter he hates, not you' },
];
const BLADE_MODS = [
  { if: PETRA_WARNED, dc: -10, why: 'you heard her out at the close when she said it to your face' },
  { if: B_MEANS, dc: -10, why: 'he can see what you are carrying down' },
  { if: SIGN_FRIENDLY, dc: -10, why: 'he heard what you said you would sign first' },
  { if: ASH_BETWEEN, dc: -10, why: 'a brother is standing in his way' },
  { if: UW_EAST, dc: -5, why: 'they came east for the book, not for you' },
  { if: F('ar_verdict', 'agreed'), dc: 10, why: 'you agreed with the record once, at the top of its stair' },
];

// ---------------------------------------------------------------- Ash walks away: by whose forecast he means to pay the sky with

const AWAY: Record<'vane' | 'vasha' | 'sarr', { where: string; who: string; dead: Effect }> = {
  vane: { where: 'across the close toward the Crown\'s stair, where House Vane keeps its door', who: 'Celestine Vane, whose House is rising exactly as the city said it would', dead: { set: 'cr_celestine_dead' } },
  vasha: { where: 'down the lane past the wardens and out toward the east gate, the road to the Sallow', who: 'Vasha Kade, who smiled when she read the word executioner', dead: { set: 'vasha_dead' } },
  sarr: { where: 'along the river wall toward the Ninebridge road', who: 'the Grand Factor, who has already sold the position', dead: { set: 'ks_sarr', value: 'dead' } },
};
const awayNode = (t: 'vane' | 'vasha' | 'sarr'): NodeDef => ({
  speaker: 'narrator',
  text: `When you look for Ash he is not on the steps. He was on the bottom one when Three held the sash out; you saw him there. He is at the far side of the close now, walking ${AWAY[t].where}, the shotgun under his arm, not fast, the way he walks out to a row that wants digging. He does not look back. At the fire you told him to let it fall on somebody who wears theirs gladly, and he said he might, and like it. He is going to find ${AWAY[t].who}.`,
  again: 'Ash, a long way off across the close, walking.',
  effects: [
    { set: 'a3_ash', value: 'away' }, { set: 'a3_ash_target', value: t }, { leave: ASH }, { set: 'ash_left', value: 'orders' }, AWAY[t].dead,
    DECIDE('a3_ash', 'When I took the sash on the Spire\'s steps, Brother Ash walked away across the close to pay what his letter said was owed with somebody else\'s life, as I had once told him to.'),
  ],
  interject: [
    ...(t === 'sarr' ? [{ companion: ODILE, text: '"That is the Ninebridge road," Odile says, very quietly, and then nothing else at all.' }] : []),
    { companion: NINE, text: '"I will log where he went," Nine says. "I will not log why. I do not know how to enter it."' },
  ],
  options: [
    { id: `st.away.call.${t}`, text: '(Shout his name.)', next: 'ash_called' },
    ...onward(`away.${t}`),
  ],
});

// ---------------------------------------------------------------- the tree

const STEPS_NODES: Record<string, NodeDef> = {
  arrive: {
    speaker: 'narrator',
    text: 'You go up. They are the same steps: the cracks where the print has them whole, the chisel marks where Faulk\'s men have numbered the stones, a plank somebody forgot. On the fourth step you stop without deciding to, because your feet know it before you do: the lamp behind your left shoulder, the doors above, the Crown\'s glass going up out of sight on either side, the wind off the canal in your face, making you squint. Above the doors, in the lintel where a carved crest has been chiselled smooth, something the size of a coin turns in its socket and finds you. It clicks. Somewhere inside the Spire the city has just made the first picture of you that is a photograph: your own age, your own face, no sash. Behind you, the close has come up to the foot of the steps.',
    again: 'The fourth step, the lamp behind your shoulder, the lens in the lintel. The close at the foot of the steps.',
    effects: [{ set: 'a3_steps_photo' }, { event: 'photo', data: { place: 'md_spire', spot: 'steps_sit' } }, { learn: 'a3_steps_seen' }],
    passives: STEPS_PASSIVES,
    interject: [
      { companion: TAMSIN, text: 'Tamsin stops a step below you, as she said she would, and holds the creased photograph up between your face and hers at arm\'s length, and lowers it. "It\'s you," she says. "It\'s only you. That\'s worse."' },
      { companion: ILYA, text: '"Forty-one windows on this side of the Crown," Ilya says. "Eleven with somebody in them." He does not tell you which eleven. He is watching all of them.' },
      { companion: KES, text: 'Kes looks up at the lens in the lintel and does not look away from it. "It can see me," she says, surprised. "It never could. I suppose it\'s because I\'m standing next to you."' },
    ],
    options: [{ id: 'st.arrive.on', text: '(Something is coming down the steps from the doors.)', next: 'three' }],
  },
  three: {
    speaker: THREE,
    text: 'Assessor Three comes down from the doors the way it walks the length of its bench: no hurry, no weight wasted. It stops one step above you, so that its lens is level with your eyes, and holds out its forearm with the sash folded over it like a cloth over a waiter\'s arm. Grey wool, hand-woven, darned in two places with a thread that does not quite match; a band of dark blue down its length; a clasp of old brass worked in the city\'s crest, the one somebody chiselled off the lintel. MAGISTRATE OF ACCOUNTS, stitched along the blue, so small you would have to lean to read it. It smells of a drawer. "Designate." The voice it uses for everything. "The steps are reopened. The Ledger thanks you for attending. The chair is the designate\'s. This is the chair\'s." It does not offer to put it on you. It holds it out, and waits, as it has waited on its bench for thirty years for somebody to bring it something to read.',
    again: 'Three, one step above you, the sash over its forearm. It waits.',
    interject: [
      { companion: ODILE, text: '"Darned," Odile murmurs, behind you. "They kept it ninety years in a drawer and darned it. That is either thrift or love, and in this city I could not tell you which."' },
      { companion: WREN, text: 'Wren looks at the sash the way she looks at a rope: where it is tied, and what to. She doesn\'t say anything. She doesn\'t have to.' },
    ],
    options: [
      { id: 'st.what', text: 'What does it do, if I put it on?', once: true, next: 'what' },
      { id: 'st.last', text: 'Whose was it?', once: true, next: 'last' },
      { id: 'st.hear', text: '(Before anything else: ask to be heard on your file again.)', if: HEARING_OPEN, next: 'hearing' },
      {
        id: 'st.wear', text: '(Take the sash.)', next: 'worn',
        effects: [{ set: 'a3_steps_sash', value: 'worn' }],
      },
      { id: 'st.refuse', text: '(Don\'t take it.)', next: 'refused', effects: [{ set: 'a3_steps_sash', value: 'refused' }] },
    ],
  },
  what: {
    speaker: THREE,
    text: '"It does nothing." Three considers that, and corrects it, as it corrects the register. "It is cloth. The charter reserves certain acts to the Magistrate of Accounts, and the Magistrate is whoever the Court sees wearing it. The vault under the Spire opens to the chair. The chair\'s first act is the one act the Ledger may not void. That is the charter\'s single exception, and the reason the Ledger has wanted a Magistrate for thirty years." A pause the length of a clause. "Unit 3 would add that the vault opens to the designate whether the sash is worn or not. The Ledger has asked to be seen before it is judged. It used those words. Unit 3 has entered them."',
    again: '"It is cloth," Three says. "The rest is the charter."',
    interject: [{ companion: NINE, text: '"Seen before it is judged," Nine repeats. Its lens has stopped moving. "It has never asked anything of anyone. It schedules. I would like that entered as well."' }],
    options: [{ text: '(Back to the sash.)', next: 'three' }],
  },
  last: {
    speaker: THREE,
    text: '"The last before." Three\'s lens goes, once, to the empty plinth in the middle of the close, with its polished bolts and its smooth place where a name was. "It was last worn before the Burn, by a Magistrate whose name the register has and the plinth does not. Unit 3 was issued after the name was struck. Unit 3 was not told by whom." It looks down at the darns. "The repairs are older than Unit 3. Somebody kept it."',
    again: '"Somebody kept it," Three says.',
    options: [{ text: '(Back to the sash.)', next: 'three' }],
  },
  hearing: {
    speaker: VOICE,
    text: [
      { if: F('ar_verdict', 'agreed'), text: 'Three says, "The Ledger will hear the designate," and stands aside, and the voice comes out of the inch of light between the great doors: level, unhurried, courteous the way a clause is courteous. Below you the close goes quiet to hear it. "Designate. You agreed with the record, at the top of my stair. You may say it again, or you may say something else. I said I would hear you again. Do you agree with the record?"' },
      { if: F('ar_verdict', 'noted'), text: 'Three says, "The Ledger will hear the designate," and stands aside, and the voice comes out of the inch of light between the great doors: level, unhurried, courteous the way a clause is courteous. Below you the close goes quiet to hear it. "Designate. You argued with me at the top of my stair, and I was not persuaded. I said I would hear you again. You have been to the door you grew up beside since then. Do you agree with the record?"' },
      { if: F('ar_verdict', 'refused'), text: 'Three says, "The Ledger will hear the designate," and stands aside, and the voice comes out of the inch of light between the great doors: level, unhurried, courteous the way a clause is courteous. Below you the close goes quiet to hear it. "Designate. You told me no, at the top of my stair. No is an answer. It is not an argument. I will hear an argument. Do you agree with the record?"' },
      { if: F('ar_verdict', 'silent'), text: 'Three says, "The Ledger will hear the designate," and stands aside, and the voice comes out of the inch of light between the great doors: level, unhurried, courteous the way a clause is courteous. Below you the close goes quiet to hear it. "Designate. You sat through your hearing and gave me no answer, and I recorded you as not yet answering. It is yet. Do you agree with the record?"' },
      { text: 'Three says, "The Ledger will hear the designate," and stands aside, and the voice comes out of the inch of light between the great doors: level, unhurried, courteous the way a clause is courteous. Below you the close goes quiet to hear it. "Designate. We have not spoken. I have read you since you were fourteen, which is not the same thing. I will hear you on your file. Do you agree with the record?"' },
    ],
    again: '"Do you agree with the record?" The same words, the same level, out of the light between the doors.',
    interject: [
      { companion: NINE, if: NINE_CONSCIENCE, text: 'Nine steps up level with you without being asked, its ledger open. "Unit 9, for the record," it says to the doors. "I have four hundred and eleven entries I would like read into this hearing." The voice says, "I know them." Nine says, "Then I would like them read anyway."' },
      { companion: TAMSIN, text: 'Tamsin\'s hand finds your sleeve and holds on. "It\'s waited all this time to say that in front of people," she whispers.' },
    ],
    options: [
      {
        id: 'st.hear.contest', text: 'I contest it. Your record has been wrong about the people standing in this crowd, and it is wrong about me.',
        check: { skill: 'speech', dc: 55, mods: HEARING_MODS },
        effects: [{ set: 'a3_file', value: 'contested' }, { xp: 150 }, DECIDE('a3_file', 'On the Spire\'s steps I contested my own file to the Ledger a second time, in front of the city, and it wrote CONTESTED on it.')],
        next: 'heard_contested',
        fail: 'heard_noted', failEffects: [{ set: 'a3_file', value: 'failed' }, DECIDE('a3_file', 'On the Spire\'s steps I argued with the Ledger about my file again, in front of the city, and it heard me out, unpersuaded.')],
      },
      { id: 'st.hear.not', text: '(Say nothing more. Turn back to Three.)', next: 'three' },
    ],
  },
  heard_contested: {
    speaker: VOICE,
    text: [
      { if: F('ar_verdict', 'agreed'), text: 'You say it, all of it, out loud on the steps with the close listening: the names on its list and what became of them, the people its schedule moved who would not be moved, the units of its own that did not do as they were told, and that you agreed with it once, at the top of its stair, and were wrong. When you stop, the silence is long enough for the child on the woman\'s hip to ask what is happening and be hushed. Then: "Contested." Not the way it says noted. "A file that went from agreed to contested. That has not been entered before." Behind the doors, very fast, paper is being turned. "Then you will have to persuade me below, where I keep what I am. Come down, Designate." Three says, "Entered."' },
      { text: 'You say it, all of it, out loud on the steps with the close listening: the names on its list and what became of them, the people its schedule moved who would not be moved, the units of its own that did not do as they were told. When you stop, the silence is long enough for the child on the woman\'s hip to ask what is happening and be hushed. Then: "Contested." Not the way it says noted. "On the steps. In public. That word has not been entered on a designate\'s file before." Behind the doors, very fast, paper is being turned. "Then you will have to persuade me below, where I keep what I am. Come down, Designate." Three says, "Entered."' },
    ],
    again: '"Contested," the doors said, in public.',
    interject: [
      { companion: ODILE, text: '"My dear, you have just sued God on its own front steps," Odile says, under her breath, "and it has granted you an adjournment. I would like that framed."' },
      { companion: ILYA, text: '"Huh," Ilya says. He looks out at the close, at the eleven windows. "They heard that."' },
    ],
    options: [{ id: 'st.heard.c.back', text: '(Turn back to Three.)', next: 'three' }],
  },
  heard_noted: {
    speaker: VOICE,
    text: 'It hears you out. All of it, every word, with the close listening, which is worse than being interrupted. Then: "Noted. Unpersuaded." No unkindness in it. "The record has been wrong before, and is wrong less every year, and you have not shown me that it is wrong about you. You may still come down. I would rather you did." Three says, "Entered," and holds the sash out again, exactly as before.',
    again: '"Noted. Unpersuaded," the doors said.',
    interject: [{ companion: NINE, text: '"Unpersuaded is not refused," Nine says, very low. "It is still a word I would keep."' }],
    options: [{ id: 'st.heard.n.back', text: '(Turn back to Three.)', next: 'three' }],
  },
  worn: {
    speaker: 'narrator',
    text: 'You take it. It is heavier than wool ought to be, because of the clasp, and colder. Three lifts it the last inch for you and lays it over your left shoulder and across to the right hip, the way it hangs in the photograph, and fastens the clasp with two fingers, precisely, as if it had practised on nobody for thirty years. Above the doors the lens turns in its socket and clicks again. Nineteen years early. Below you on the close a sound goes through the crowd that is not a cheer and is not anything else either: several hundred people breathing out at once.',
    again: 'The sash on your shoulder, the clasp cold against your hip.',
    interject: [
      { companion: NINE, if: NINE_DEPUTY, text: '"Magistrate," Nine says, and takes the step beside you, half a pace back, where an assessor stands. It opens its ledger. "I am ready to read."', effects: [A(NINE, 3)] },
      { companion: NINE, if: NINE_CONSCIENCE, text: 'Nine comes up level with you. "I will read every order aloud before you sign it," it says. "I said so at the top of the stair. I am saying it again on the steps, so that it is entered twice."' },
      { companion: KES, text: 'Kes\'s hand goes to the back of her neck and stays there. "Suits you," she says, in the voice she uses for something she doesn\'t want to look at.', effects: [A(KES, -2)] },
      { companion: WREN, text: '"Huh," Wren says, and nothing else, which from Wren is a speech.', effects: [A(WREN, -2)] },
      { companion: ILYA, text: 'Ilya counts something under his breath, and stops before the end, and doesn\'t start again.', effects: [A(ILYA, -3)] },
      { companion: ODILE, text: '"Well," Odile murmurs. "Now everybody in the Reach will want to sell you something."', effects: [A(ODILE, 2)] },
      { companion: ASH, text: 'Ash says nothing. He is looking at the clasp.' },
      { companion: TAMSIN, text: 'Tamsin doesn\'t say anything yet.' },
    ],
    options: onward('w'),
  },
  refused: {
    speaker: THREE,
    text: 'You don\'t take it. Three holds it out a moment longer, as if the arm has to be told, and then folds the sash again, corner to corner, and lays it back over its forearm. "Noted," it says. "The designate declines the sash." Above the doors the lens turns in its socket, and does not click. It turns away from you, slowly, past you, out over the close and the heads of the crowd, the way a lamp is turned over a dark field, looking. Three says, "The Ledger asks the designate to come down to it regardless. It said you might not. It said: then all the more."',
    again: 'The sash folded over Three\'s arm. The lens in the lintel, turned out over the crowd.',
    interject: [
      { companion: TAMSIN, text: '"Good," Tamsin says, very quietly, and then, louder, to the whole close, "Good." Somebody in the crowd laughs, once, the way people laugh at a funeral.', effects: [A(TAMSIN, 5)] },
      { companion: ASH, if: ANY(F('ash_orders', 'refused'), F('ash_orders', 'refused_late')), text: 'At the foot of the steps Ash says your name, once, the way he says it when a row is finished.', effects: [A(ASH, 5)] },
      { companion: ASH, text: '"Friend," Ash says, at the foot of the steps, and nothing after it. His hand comes off the shotgun.', effects: [A(ASH, 5)] },
      { companion: ILYA, text: '"Right," Ilya says, the way he says it when a count comes out even.', effects: [A(ILYA, 5)] },
      { companion: WREN, text: 'Wren laughs, once, short, and bumps your shoulder with hers.', effects: [A(WREN, 3)] },
      { companion: ODILE, text: '"You have just walked away from the largest position in the Reach," Odile says, delighted, and a little sick. "In front of witnesses."' },
      { companion: KES, text: 'Kes lets out a breath she has been holding since the close.', effects: [A(KES, 3)] },
      { companion: NINE, if: NINE_DEPUTY, text: '"Declined," Nine says, and writes it down. Its lens stays on the lens in the lintel, which is looking for somebody else. "It will reroute," it says. "It always does."', effects: [A(NINE, -3)] },
      { companion: NINE, text: 'Nine writes it down. "Declined," it says. "Entered." Its lens stays on the lens in the lintel, which is looking for somebody else.' },
    ],
    options: onward('r'),
  },

  // Tamsin's question
  tam_q: {
    speaker: TAMSIN,
    text: [
      { if: F('a3_tamsin_word'), text: 'Tamsin comes up the one step and stands level with you for the first time today, and looks at the sash, and then only at your face. "You told me at the fire you wouldn\'t count people," she says. "I believed you. I still do. I\'m only checking." She keeps her voice down; the close is listening to everything. "What\'s the first thing you\'ll sign?"' },
      { if: F('tam_romance', 'together'), text: 'Tamsin comes up the one step and puts her hand flat on the sash over your heart, as if she were checking it was there, or you were. "Before anybody else gets to ask you anything," she says, very low, "I want to be first." She doesn\'t take her hand away. "What\'s the first thing you\'ll sign?"' },
      { text: 'Tamsin hasn\'t come up the step. She is looking at the sash the way she used to look at the hatch tray when she was small and it came out with something in it she hadn\'t asked for. "What\'s the first thing you\'ll sign?" she says. It isn\'t a challenge. She wants to know, before the city does.' },
    ],
    again: '"What\'s the first thing you\'ll sign?" Tamsin asks again, as if she hadn\'t.',
    options: signOptions('st.tam', () => 'tam_a', TAMSIN),
  },
  tam_a: {
    speaker: TAMSIN,
    text: [
      { if: F('a3_first_sign', 'people'), text: '"Nothing that counts a person." She says it back to you, so that it has been said twice, out loud, on the steps. "Not one line." She nods, slowly. "All right. Then I\'ll be one step down. Like the picture."' },
      { if: F('a3_first_sign', 'door'), text: '"Knock\'s door." She thinks about it the way she used to think about the Grille, with her forehead nearly against it. "They\'ll want it both ways. Some of them will want to walk out and keep walking, and some will want it shut till they die. Make sure it opens from the inside. That\'s all. From the inside."' },
      { if: F('a3_first_sign', 'nothing'), text: '"Nothing." She looks at the clasp, and then west along the top of the steps, at the steel door in the Spire\'s foot, and she doesn\'t ask. "Then wear it down there, and take it off after," she says. "I\'ll hold it for you. I\'ve always wanted to hold something of theirs and not give it back."' },
      { if: F('a3_first_sign', 'water'), text: '"The water." She doesn\'t argue, which is worse than if she had. "That\'s what it would say. That\'s exactly what it would say, and it would be right, and it would count the cups." She steps back down onto her own step. "I\'m still here," she says, to the close and not to you.' },
      { text: '"You don\'t know." She nods, slowly. "Good. I\'d be scared of you if you did." She steps back down onto her own step. "Find out before you get to the bottom of it."' },
    ],
    again: 'Tamsin, one step down, watching your hands.',
    options: onward('t'),
  },

  // Ash: the letter burned, he stands on the step below
  ash_between: {
    speaker: ASH,
    text: [
      { if: F('a3_ash_word'), text: 'Ash comes up the steps behind you, unasked, and stops on the step below with his back to you and his face to the close, the shotgun broken open over his forearm. "You said at the fire you\'d not put it on," he says, without turning round. "I know," you say. "Then I\'ll stand here for the promise, and not the sash." He settles his feet the way a man settles them at a gate. "There\'s a weight to a promise like that, {name}. I said I\'d help you carry it up the steps either way. These are the steps."' },
      { if: F('ash_orders', 'refused_late'), text: 'Ash comes up the steps behind you, unasked, and stops on the step below with his back to you and his face to the close, the shotgun broken open over his forearm. "I put my knife away on the lane at Openfield because you said my name," he says to the crowd. "I\'m owed nothing. My brothers think the sky is." He settles his feet. "I\'ll stand here and see who comes up to collect it."' },
      { text: 'Ash comes up the steps behind you without being asked and stops on the step below, with his back to you and his face to the crowd, the shotgun broken open over his forearm, the way a man stands at a gate. "I said I\'d stand here," he says. "I burned the letter. My brothers didn\'t. If one of them comes up these steps for what it said, he\'ll come through me first." He does not look round. "There\'s a weight to standing in front of somebody, {name}. I\'d rather carry it than watch it."' },
    ],
    again: 'Ash, on the step below, his back to you.',
    effects: [{ set: 'a3_ash', value: 'between' }, DECIDE('a3_ash', 'When I took the sash on the Spire\'s steps, Brother Ash stood on the step below me with his back to me, between me and anybody his brothers sent.')],
    interject: [{ companion: TAMSIN, text: 'Tamsin moves along her step until she is beside him. He looks down at her. "Go home, child," he says, the old joke. "I am home," she says. "It\'s just bigger than I thought."' }],
    options: onward('ab'),
  },

  // Ash: undecided; he listens to what the hand says it will sign
  ash_ask: {
    speaker: ASH,
    text: [
      { if: F('a3_ash_heard'), text: 'Ash comes up to the step below you and stops there, the shotgun in the crook of his arm, not broken. "At the fire you told me what you\'d sign first," he says. "You had nothing on your shoulder then." He looks at the clasp. "Say it again, with it on. I\'ll be listening to your hand, not your mouth."' },
      { text: 'Ash comes up to the step below you and stops there, the shotgun in the crook of his arm, not broken. "I said I\'d be here when you put it on," he says, "as your friend or as theirs. I said I\'d know by then." He looks at the clasp a long time. "I don\'t. Not yet." He looks up. "Tell me the first thing you\'ll sign. I\'ll be listening to your hand, not your mouth."' },
    ],
    again: '"The first thing you\'ll sign," Ash says.',
    options: SIGNS.map((s): OptionDef => ({ id: `st.ash.sign.${s.id}`, text: s.text, effects: [{ set: 'a3_first_sign', value: s.id }], next: s.id === 'people' || s.id === 'nothing' ? 'ash_friend' : 'ash_face' })),
  },
  ash_friend: {
    speaker: ASH,
    text: [
      { if: ALL(F('a3_first_sign', 'people'), NOT(SEEN('st.ash.sign.people'))), text: '"Nothing that counts a person." He heard you say it to Tamsin; the whole close did. He takes the letter out of the lining of his scarf, the pencil gone grey along its folds, and reads it once more, IF THE ONE FROM THE CISTERN\'S HATCH TAKES THE SASH, THE SKY IS OWED, and then tears it in half, and in half again, small, and opens his hand and lets the wind off the canal have it. "There," he says. "I know now." He goes down one step and turns his back to you, between you and the close. "{name}. I\'ll stand here."' },
      { if: F('a3_first_sign', 'people'), text: '"Nothing that counts a person." He says it after you, slowly, the way he would check a count. Then he takes the letter out of the lining of his scarf, the pencil gone grey along its folds, and tears it in half, and in half again, small, and lets the wind off the canal have it. "There," he says. "I know now." He goes down one step and turns his back to you, between you and the close. "{name}. I\'ll stand here."' },
      { text: '"Nothing." He looks at the clasp, and then where you are looking, west along the top of the steps, at the steel door in the Spire\'s foot, and something in his face goes still and then easy. He takes the letter out of the lining of his scarf and tears it in half, and in half again, small, and lets the wind off the canal have it. "The first and the last," he says. "I can stand beside that." He goes down one step and turns his back to you, between you and the close. "{name}. I\'ll stand here."' },
    ],
    again: 'Ash, on the step below, his back to you. The pieces of the letter gone down the close on the wind.',
    effects: [{ set: 'a3_ash', value: 'between' }, A(ASH, 10), DECIDE('a3_ash', 'On the Spire\'s steps Brother Ash heard what I would sign first, tore up the letter with my face in it, and stood on the step below me.')],
    options: onward('af'),
  },

  // Ash: to the player's face
  ash_face: {
    speaker: ASH,
    text: [
      { if: ANY(F('a3_first_sign', 'water'), F('a3_first_sign', 'door'), F('a3_first_sign', 'unsure')), text: 'Ash comes up the last step and stands level with you. Not below: level, close enough that you can smell the gun oil and the woodsmoke from the fire in his scarf. "I heard what you said you\'d sign," he says. "I was listening to your hand. It didn\'t tell me what I wanted." He has the letter in his other hand. IF THE ONE FROM THE CISTERN\'S HATCH TAKES THE SASH, THE SKY IS OWED. "So I\'ve come to your face, like I said I would." The shotgun is not broken open.' },
      { if: F('ash_orders', 'other'), text: 'Ash comes up the steps to you and stands level. "There\'s nobody left on Petra\'s board who wears theirs gladly," he says. "I looked. I\'ve been looking since the fire. The ones I\'d have picked are dead, or broken, or never were what the city wrote." He has the letter in his hand. IF THE ONE FROM THE CISTERN\'S HATCH TAKES THE SASH, THE SKY IS OWED. "So it\'s you again, friend. To your face." The shotgun is not broken open.' },
      { if: ALL(NOT(F('ash_orders_known')), NOT(F('ash_orders'))), text: 'Ash comes up the steps to you and stops level, close enough that you can smell the woodsmoke in his scarf. He takes a folded paper out of its lining and holds it up so you can read it: pencil, no seal, no name, one line. IF THE ONE FROM THE CISTERN\'S HATCH TAKES THE SASH, THE SKY IS OWED. "I said I\'d tell you to your face if I had to," he says. "I have to. I\'ve carried that since before the Long Night, with you beside me every day of it." The shotgun is not broken open.' },
      { text: 'Ash comes up the steps to you. Not to the step below: level, close enough that you can smell the gun oil and the woodsmoke from the fire in his scarf. "I said I\'d come to your face," he says. "Not behind. Here I am." He has the letter in his other hand, the pencil gone grey along its folds. IF THE ONE FROM THE CISTERN\'S HATCH TAKES THE SASH, THE SKY IS OWED. "You took it." The shotgun is not broken open.' },
    ],
    again: 'Ash, level with you, the letter in one hand and the shotgun in the other.',
    effects: [{ learn: 'ash_unwritten' }],
    interject: [
      { companion: TAMSIN, text: '"Ash," Tamsin says, sharp, the voice for a child about to touch a stove. He doesn\'t look at her. "Not now, Tamsin," he says. "This is the one time it\'s mine."' },
      { companion: WREN, text: 'Wren has her knife out, low, along her thigh, where only you can see it. She looks at you, not at him. Your call.' },
    ],
    options: [
      { id: 'st.ash.tell', text: 'Then hear what I\'m wearing it for, before you decide what\'s owed.', check: { skill: 'speech', dc: 50, mods: FACE_MODS }, next: 'ash_faced', fail: 'ash_struck', failEffects: [] },
      { id: 'st.ash.off', text: '(Unhook the clasp. Take the sash off, here, in front of him.)', effects: OFF_EFFECTS, next: 'ash_off' },
      { id: 'st.ash.do', text: 'Do what you came up here to do, Ash.', next: 'ash_struck' },
    ],
  },
  ash_faced: {
    speaker: ASH,
    text: 'He listens. All of it, the way he listens to Doria check a count, without moving. When you have finished he looks at the clasp for a long time, and at the close, and at the steel door at the west end of the steps, and you watch him put each thing you said down where he can see it. Then he breaks the shotgun open. The two shells come out into his palm, and he puts them into your hand and closes your fingers over them with his own. "{name}," he says. "The sky can wait for its due. It\'s waited ninety years. It\'ll keep." He goes down to the bottom step, where he stood the first time you brought him here, and sits on it with the empty gun across his knees.',
    again: 'Ash on the bottom step, the empty gun across his knees. His two shells in your pocket.',
    effects: [{ set: 'a3_ash', value: 'faced' }, A(ASH, 10), DECIDE('a3_ash', 'On the Spire\'s steps Brother Ash came to my face, as he said he would, and heard me, and put his shells in my hand.')],
    interject: [{ companion: ILYA, text: 'Ilya lets out a breath. "Two," he says, looking at your fist. He means the shells. He has been counting them since Ash came up the steps.' }],
    options: onward('fa'),
  },
  ash_off: {
    speaker: 'narrator',
    text: 'You unhook the clasp. It takes two tries; your fingers have gone stupid. The sash comes off your shoulder and you hold it out, not to him, to Three, who takes it without a word and folds it over its arm again. Ash looks at the cloth in Three\'s hands and then at you, and the gun comes down by inches until it points at the steps. "You didn\'t have to do that," he says. "I know." He breaks the shotgun open and leaves it open. "There\'s a weight to that, {name}," he says, very quietly. "I\'ll not forget who carried it." Above the doors, the lens turns away from you and out over the crowd.',
    again: 'The sash on Three\'s arm again. Ash\'s gun broken open.',
    effects: [{ set: 'a3_ash', value: 'faced' }, A(ASH, 15), DECIDE('a3_ash', 'On the Spire\'s steps Brother Ash came to my face over the sash, and I took it off rather than make him choose.')],
    options: onward('ao'),
  },
  ash_struck: {
    speaker: 'narrator',
    text: 'The gun comes up. Both barrels, on your chest, a yard away, and the close below goes so quiet you can hear the canal. At the foot of the steps somebody in grey says "Hold" to the wardens, and they hold. Ash\'s finger is on the trigger, and you watch the vow take him by the wrist the way a hand would: never fire first. His face does something you will remember for the rest of your life. Then he turns the gun round in one movement and hits you with the stock, once, hard, across the side of the face, and you are on your knees on the step with your mouth full of blood and the sash still on. "There," he says above you, breathing like a man who has just dug a grave. "That\'s what the sky gets from me. It\'s all I\'ve got that isn\'t murder." He drops the shells on the step beside your hand, one, two, and goes down the steps through the crowd, which opens for him, and away down the lane toward the Precinct, and does not look back.',
    again: 'Blood on the step, two shells beside it. Ash gone down the lane.',
    effects: [
      { set: 'a3_ash', value: 'struck' }, { leave: ASH }, { set: 'ash_left', value: 'struck' },
      DECIDE('a3_ash', 'On the Spire\'s steps Brother Ash came to my face over the sash, and drew on me, and could not fire first. He struck me with the stock instead, and walked away.'),
    ],
    interject: [
      { companion: TAMSIN, text: 'Tamsin is on her knees beside you before you have finished falling, her sleeve against your cheek. "Don\'t," she says, to you or to him or to all of it. "Don\'t, don\'t."' },
      { companion: ILYA, text: '"Let him go," Ilya says, to whoever is about to go after him. Then, to you, quietly: "That was a man not killing you. I know what it looks like from the inside."' },
      { companion: KES, text: 'Kes has your face between her hands, turning it to the lamp, looking at the cheekbone like a machine she has to mend. "Not broken," she says. "Nearly. He knew exactly how hard."' },
      { companion: ODILE, text: 'Odile gives you her handkerchief, which is silk, and says nothing at all, which from Odile is a wound dressing.' },
    ],
    options: onward('as'),
  },

  // Ash: the order falls on himself
  ash_self_warn: {
    speaker: ASH,
    text: 'Ash has not come up to you. He has gone the other way, down the steps to the lamp at the foot of them, and stands with his back against its post. He breaks the shotgun, and you see that there is one shell in it, one, the one he loaded at the fire last night while he would not look at you, and he closes it again. "Make it clean, you said." Not loud. He says it up the steps to you, and the close hears it anyway. "I\'ve been listening to that since the night you said it. I think it was the truest thing anybody ever told me." He looks at the sash on your shoulder. "The sky\'s owed. It\'s mine to pay. I\'ll not put it on you." He turns the gun round in his hands.',
    again: 'Ash at the foot of the steps with his back to the lamp, the gun turned round.',
    interject: [{ companion: NINE, text: '"Brother Ash," Nine says, very loud, the loudest you have ever heard it. "I would like it entered that I object." It does not move. It does not know how.' }],
    options: [
      { id: 'st.ash.gun', text: 'Ash. Give me the gun.', check: { skill: 'speech', dc: 60, mods: GUN_MODS }, next: 'ash_saved', fail: 'ash_self', failEffects: [] },
      { id: 'st.ash.self.off', text: '(Tear the clasp open. Get the sash off, now.)', effects: OFF_EFFECTS, next: 'ash_self_off' },
      { id: 'st.ash.self.none', text: '(Say nothing.)', next: 'ash_self' },
    ],
  },
  ash_saved: {
    speaker: ASH,
    text: 'You don\'t remember coming down the steps. You are at the lamp with your hand out, saying his name, saying it again, and he is looking at your hand as if it were a thing he had read about. "You said a cruel thing to me once," he says, "and I believed it because I wanted to. That\'s the whole of what\'s wrong with me." He puts the gun into your hand, stock first. It is heavier than it looks. He sits down on the bottom step, all at once, like a man whose legs have been told something, and puts his face in his hands. "{name}," he says through them. "I\'d started to listen to it."',
    again: 'Ash on the bottom step with his face in his hands. His gun in yours.',
    effects: [{ set: 'a3_ash', value: 'faced' }, { set: 'a3_ash_saved' }, A(ASH, 20), DECIDE('a3_ash', 'At the foot of the Spire\'s steps Brother Ash turned his gun on himself to pay what his letter said was owed, and I talked it out of his hands.')],
    options: onward('sv'),
  },
  ash_self_off: {
    speaker: 'narrator',
    text: 'The clasp tears out of the wool; ninety years of darning give way in your hand. You are holding the sash up over your head like a thing taken off a dead man, shouting, and you don\'t know what you are shouting until you hear it come back off the Crown\'s glass: "It isn\'t owed. Look. Ash, look, it isn\'t owed." He looks. The gun comes down by inches. Three comes down the steps, takes the torn sash out of your hand without a word, and folds it over its arm, clasp and all. Ash sits down on the bottom step, all at once, and does not let go of the gun, and does not lift it.',
    again: 'The torn sash folded over Three\'s arm. Ash on the bottom step, the gun across his knees.',
    effects: [{ set: 'a3_ash', value: 'faced' }, { set: 'a3_ash_saved' }, { set: 'a3_sash_torn' }, A(ASH, 20), DECIDE('a3_ash', 'At the foot of the Spire\'s steps Brother Ash turned his gun on himself because I had taken the sash, and I tore it off so that nothing was owed.')],
    options: onward('so'),
  },
  ash_self: {
    speaker: 'narrator',
    text: [
      { if: NOT(LOWE_DEAD), text: 'You are four steps from him when he does it. The sound goes out across the close and comes back off the Crown\'s glass a long moment later, smaller, as if the city were repeating it to be sure it had heard. The woman with the child turns the child\'s face into her shoulder. Lowe is the first one to him; he goes down on one knee on the stone and takes his cap off and does not touch anything. Ash lies at the foot of the steps under the lamp where the photograph was made, on his side, as if he had lain down there to sleep, and his scarf has come loose from its cord. The letter is in its lining. Somebody will find it. It says the sky was owed. The sky, which keeps no books, does not say anything at all.' },
      { text: 'You are four steps from him when he does it. The sound goes out across the close and comes back off the Crown\'s glass a long moment later, smaller, as if the city were repeating it to be sure it had heard. The woman with the child turns the child\'s face into her shoulder. A warden from the foot of the steps is the first one to him; she goes down on one knee on the stone and takes her cap off and does not touch anything. Ash lies at the foot of the steps under the lamp where the photograph was made, on his side, as if he had lain down there to sleep, and his scarf has come loose from its cord. The letter is in its lining. Somebody will find it. It says the sky was owed. The sky, which keeps no books, does not say anything at all.' },
    ],
    again: 'The lamp at the foot of the steps, and Ash under it, and a warden\'s cap on the stone beside him.',
    effects: [{ set: 'a3_ash', value: 'self' }, { leave: ASH }, DECIDE('a3_ash', 'At the foot of the Spire\'s steps, when I took the sash, Brother Ash turned his orders on himself, as I had once told him to make it clean.')],
    interject: [
      { companion: TAMSIN, text: 'Tamsin gets to him second. She doesn\'t cry. She takes his scarf off its broken cord and folds it, the way the Cistern folds a blanket for a cot that is going to be empty, and puts it under his head.' },
      { companion: ILYA, text: 'Ilya stands over him a long time. "Nineteen," he says at last, to nobody. "He said them all, at the fire. Somebody ought to say his." And he does, once, quietly: the name the Choir gave him, and then the one before it.' },
      { companion: WREN, text: 'Wren turns away and looks at the lane for a long time, at nothing, the way she looked at the ridge over the Gully once, when he told her what he had done there.' },
      { companion: KES, text: 'Kes sits down on the step where she was standing, all at once, and puts both hands over the back of her neck, and doesn\'t say anything for the rest of it.' },
      { companion: ODILE, text: '"He paid in full," Odile says, in a voice you have never heard her use. "He always said he would. I never once believed him." She takes her gloves off.' },
    ],
    options: onward('sf'),
  },

  // Ash: away, to put it on somebody else
  ash_away_vane: awayNode('vane'),
  ash_away_vasha: awayNode('vasha'),
  ash_away_sarr: awayNode('sarr'),
  ash_called: {
    speaker: 'narrator',
    text: 'You shout his name across the close. Half the crowd turns. He doesn\'t. He lifts one hand, without stopping, without looking round, the way a man lifts a hand to somebody he will see later, and goes on, and the lane takes him.',
    again: 'The lane, empty now, where Ash went.',
    options: onward('ac'),
  },

  // The Unwritten's blade
  blade: {
    speaker: 'narrator',
    text: [
      { if: ALL(UW_EAST, NOT(PETRA_DEAD), ASH_BETWEEN), text: 'At the foot of the steps Petra Mason stands up. "Designate." Her voice carries; it is meant to. "You\'re the book now. I said at the close I\'d say it to your face first, and not from behind. I\'m saying it." Thaddeus is already on the steps, the machete in his hand, not hurrying, his face bare to the lamps. He stops two steps below Ash. "Brother," he says. "Move." Ash does not move.' },
      { if: ALL(UW_EAST, PETRA_DEAD, ASH_BETWEEN), text: 'At the foot of the steps Juniper Lowry stands up. "Designate." She says it once, the way the Unwritten say names, so that it stays said. "You\'re the book now. Petra would have said it to your face. I\'m saying it for her." Thaddeus is already on the steps, the machete in his hand, his face bare to the lamps. He stops two steps below Ash. "Brother," he says. "Move." Ash does not move.' },
      { if: ALL(UW_EAST, NOT(PETRA_DEAD)), text: 'At the foot of the steps Petra Mason stands up. "Designate." Her voice carries; it is meant to. "You\'re the book now. I said at the close I\'d say it to your face first, and not from behind. I\'m saying it." Thaddeus is already on the steps, the machete in his hand, not hurrying, his face bare to the lamps, and the crowd does not stop him, because nobody has ever stopped anyone on these steps. He stops two steps below you.' },
      { if: UW_EAST, text: 'At the foot of the steps Juniper Lowry stands up. "Designate." She says it once, the way the Unwritten say names, so that it stays said. "You\'re the book now. Petra would have said it to your face. I\'m saying it for her." Thaddeus is already on the steps, the machete in his hand, his face bare to the lamps. He stops two steps below you.' },
      { if: ASH_BETWEEN, text: 'Somebody comes up out of the crowd at the foot of the steps with his hood down and his face bare to the city\'s lamps: a tall man, quiet, the machete held along his leg. Thaddeus. The Unwritten keep no likeness; they show you their faces when they mean it. He stops two steps below Ash and looks past him at you. "Brother Ash burned his letter," he says. "Mine\'s still in my pocket." Then, to Ash: "Brother. Move." Ash does not move.' },
      { text: 'Somebody comes up out of the crowd at the foot of the steps with his hood down and his face bare to the city\'s lamps: a tall man, quiet, the machete held along his leg. Thaddeus. The Unwritten keep no likeness; they show you their faces when they mean it. He stops two steps below you. "Brother Ash burned his letter," he says. "Mine\'s still in my pocket."' },
    ],
    again: 'Thaddeus, two steps below, the machete along his leg.',
    interject: [
      { companion: WREN, text: 'Wren is between you and the balustrade, knife out, weight on her back foot. "Your call," she says, not looking away from him. "Say it quick."' },
      { companion: NINE, text: '"I will not fight him," Nine says. "I will stand where he has to go round me." It takes one step down, which is the most violent thing you have ever seen it do.' },
      { companion: KES, text: 'Kes has gone very still beside you. "He\'s fast," she says. "Faster than he looks. Don\'t let him get inside your reach."' },
    ],
    options: [
      { id: 'st.bl.ash', text: '(Let Ash stand.)', if: ASH_BETWEEN, next: 'blade_ash' },
      { id: 'st.bl.talk', text: 'Look at what\'s on my shoulder, Thaddeus. Then look at where I\'m taking it.', check: { skill: 'speech', dc: 50, mods: BLADE_MODS }, next: 'blade_talked', fail: 'blade_failed', failEffects: [] },
      { id: 'st.bl.wardens', text: '(Call the wardens up the steps.)', next: 'blade_wardens' },
      { id: 'st.bl.draw', text: '(Draw on him.)', next: 'blade_draw' },
      { id: 'st.bl.off', text: '(Take the sash off, and hold it out to him.)', effects: OFF_EFFECTS, next: 'blade_off' },
    ],
  },
  blade_failed: {
    speaker: THAD,
    text: 'He listens to you, which you did not expect, his eyes on the clasp the whole time. "No," he says, when you have finished. "Everybody who puts that on means to do one good thing with it first. You\'ll sign one line before you sign the last. They always do." He comes on, up the step between you, the machete coming up off his leg.',
    again: 'Thaddeus, coming on up the steps.',
    options: [
      { id: 'st.blf.ash', text: '(Ash steps into it.)', if: ASH_BETWEEN, next: 'blade_ash' },
      { id: 'st.blf.wardens', text: '(Shout for the wardens.)', if: NOT(ASH_BETWEEN), next: 'blade_wardens' },
      { id: 'st.blf.draw', text: '(Draw.)', if: NOT(ASH_BETWEEN), next: 'blade_draw' },
      { id: 'st.blf.off', text: '(Get the sash off.)', if: NOT(ASH_BETWEEN), effects: OFF_EFFECTS, next: 'blade_off' },
    ],
  },
  blade_ash: {
    speaker: 'narrator',
    text: 'Ash does not raise the gun. He has never fired first, and he does not now. Thaddeus cuts the way he does everything, quickly and surely, and Ash takes it on the forearm he lifts and across the face above it, from the cheekbone to the hinge of the jaw, and does not step back, and does not make a sound. Blood comes down the steps in a thin line, step by step, toward the lamp. Thaddeus has never cut a brother. He stands with the blade wet and looks at what he has done. "Move," he says again, and it comes out wrong. "No," says Ash, through the blood, quite gently. Thaddeus lowers the machete. Something goes out of him, all at once, the way air goes out of a tyre. "The sky can have the rest from somebody else," he says, and turns, and goes down the steps, and the crowd lets him through.',
    again: 'Ash on the step below, his scarf pressed to his face. A thin line of blood down the steps.',
    effects: [{ set: 'a3_blade', value: 'ash' }, { set: 'a3_ash_scarred' }, A(ASH, 5), DECIDE('a3_blade', 'On the Spire\'s steps the Unwritten sent a blade for me, and Brother Ash stood in front of me and took it across the face, and the man who held it could not cut him twice.')],
    interject: [
      { companion: TAMSIN, text: 'Tamsin is down the step with her sleeve against his face before he has finished not falling. "You idiot," she says, shaking. "You stupid, stupid man." "Yes," says Ash.' },
      { companion: ODILE, text: 'Odile hands Ash her handkerchief without a word. It is silk. He bleeds on it, and she lets him, and it is the most generous thing you have ever seen her do.' },
    ],
    options: onward('ba'),
  },
  blade_talked: {
    speaker: THAD,
    text: 'He looks at the clasp. Then he looks where you look: west along the top of the steps, at the steel door in the Spire\'s foot, warm under anybody\'s palm, humming. For a long moment he looks at that. "Petra said you\'d go down to the book," he says. "I didn\'t believe her. I don\'t believe you." He sits down on the step where he stopped, the machete across his knees, not sharpened, only out. "I\'ll watch you go down. I\'ll watch you come up. If you come up in that, I\'ll still be sitting here."',
    again: 'Thaddeus sitting on the step, the machete across his knees, watching.',
    effects: [{ set: 'a3_blade', value: 'talked' }, A(ASH, 3), DECIDE('a3_blade', 'On the Spire\'s steps the Unwritten sent a blade for me, and I talked the man who held it into sitting down to watch where I went.')],
    options: onward('bt'),
  },
  blade_wardens: {
    speaker: 'narrator',
    text: [
      { if: NOT(LOWE_DEAD), text: '"Captain." You do not raise your voice; with the sash on, you find, you do not have to. Lowe is already on the steps. Four of his wardens come up behind him at a walk, rifles slung, and stand around Thaddeus the way the column stood around Knock\'s door: politely, completely. Thaddeus looks at them, and then at you, a long look, as if he were learning your face for the second time. "There it is," he says. "First thing you signed." He lets them take the machete. They walk him down the steps between them, not roughly, and the crowd moves back to let them through, and he does not look round.' },
      { text: '"Wardens." You do not raise your voice; with the sash on, you find, you do not have to. Four of the close\'s wardens come up the steps at a walk, rifles slung, and stand around Thaddeus politely and completely. He looks at them, and then at you, a long look, as if he were learning your face for the second time. "There it is," he says. "First thing you signed." He lets them take the machete. They walk him down the steps between them, and he does not look round.' },
    ],
    again: 'The place on the steps where Thaddeus stood. The wardens gone down with him.',
    effects: [
      { set: 'a3_blade', value: 'wardens' }, { rep: { faction: 'choir', respect: -10 } }, { rep: { faction: 'wardens', respect: 5 } }, A(ASH, -10), A(TAMSIN, -3), A(NINE, 2),
      DECIDE('a3_blade', 'On the Spire\'s steps the Unwritten sent a blade for me, and I gave the man who held it to the city\'s wardens.'),
    ],
    interject: [
      { companion: ASH, text: '"He was my brother," Ash says, low, watching them take him down. "He\'d have cut me to get at you. He was still my brother." He doesn\'t say anything else.' },
      { companion: KES, text: '"Huh," Kes says. "So that\'s how it works. You just say it, and they do it." She doesn\'t sound as if she likes knowing.' },
    ],
    options: onward('bw'),
  },
  blade_draw: {
    speaker: 'narrator',
    text: 'You draw. Below you the crowd goes back from the foot of the steps all at once, like water from a dropped stone, and the woman with the child is running. Thaddeus does not hurry. He settles the machete in his hand and comes up the steps toward you the way he came up out of the crowd: quiet, and quick, and sure.',
    effects: [{ set: 'a3_blade_fight' }, { rep: { faction: 'choir', respect: -10 } }, A(ASH, -5), DECIDE('a3_blade', 'On the Spire\'s steps the Unwritten sent a blade for me, and I fought the man who held it, there on the steps, in front of the city.'), { event: 'combat' }],
    options: [{ id: 'st.bl.fight', text: '(Fight.)', exit: true }],
  },
  blade_fought: {
    speaker: 'narrator',
    text: 'It is over quickly, the way he would have wanted it. Thaddeus lies across three of the steps with the machete a yard from his open hand, and his face is bare to the city\'s lamps, as it was when he came up out of the crowd. The Unwritten keep no likeness. Above the doors the lens in the lintel has turned to look at him, and you cannot tell whether it clicks.',
    again: 'Thaddeus across the steps, his face to the lamps.',
    effects: [{ set: 'a3_blade', value: 'fought' }, { xp: 100 }],
    interject: [
      { companion: ASH, text: 'Ash goes down to him and kneels and closes his eyes, and says his name, once, so that it stays said. Then he comes back up and stands where he was.' },
      { companion: NINE, text: '"I have entered it," Nine says. "I have entered that he came to your face. I would like that to be on the record as well."' },
    ],
    options: onward('bf'),
  },
  blade_off: {
    speaker: 'narrator',
    text: 'You unhook the clasp and the sash comes off your shoulder, and you hold it out to him, across the two steps between you, the darned grey wool over your arm the way Three carried it down. Thaddeus stops. He looks at it for a long time. "Then it isn\'t owed," he says. There is something in his face like contempt and something like relief, and you could not say which is winning. He lets the machete down along his leg. "Give it to the machine," he says. "I don\'t touch their cloth." Three comes down and takes it from you and folds it over its arm. Thaddeus goes back down the steps, and the lens in the lintel turns away from you, out over the crowd, looking.',
    again: 'The sash back on Three\'s arm. Thaddeus gone down the steps.',
    effects: [{ set: 'a3_blade', value: 'off' }, A(ASH, 5), A(TAMSIN, 3), DECIDE('a3_blade', 'On the Spire\'s steps the Unwritten sent a blade for me, and I took the sash off and held it out to him, so that nothing was owed.')],
    options: onward('bo'),
  },

  // the end of the steps
  st_end: {
    speaker: THREE,
    text: [
      { if: ALL(F('a3_sash', 'worn'), F('a3_ash', 'between'), NOT(F('a3_blade'))), text: 'Ash stands on the step below you for a long time after there is any need to, and then for a little longer, until he is sure. Three steps aside. "The Ledger will see the Magistrate now." West along the top of the steps, the steel door in the Spire\'s foot, VAULT OF ACCOUNTS — NO ENTRY — NO EXIT, stands open on a stair going down into warm air that smells of dust and hot metal, and the one note that has been under everything on this close since you first came to it is louder now, and steady, and waiting.' },
      { if: F('a3_sash', 'worn'), text: 'Three steps aside. "The Ledger will see the Magistrate now." West along the top of the steps, the steel door in the Spire\'s foot, VAULT OF ACCOUNTS — NO ENTRY — NO EXIT, stands open on a stair going down into warm air that smells of dust and hot metal, and the one note that has been under everything on this close since you first came to it is louder now, and steady, and waiting.' },
      { text: 'Three steps aside, the sash over its arm. "The Ledger will see the designate now." West along the top of the steps, the steel door in the Spire\'s foot, VAULT OF ACCOUNTS — NO ENTRY — NO EXIT, stands open on a stair going down into warm air that smells of dust and hot metal, and the one note that has been under everything on this close since you first came to it is louder now, and steady, and waiting. It did not need the sash to open. It only wanted you to come.' },
    ],
    again: 'The steel door in the Spire\'s foot, open on a stair going down.',
    interject: [
      { companion: KES, text: '"It\'s humming," Kes says, at the top of the stair down. "Everything in this city hums. That one\'s the note the rest are tuned to."' },
      { companion: WREN, text: '"No way down but through," Wren says, and goes first, a step ahead of you, the way she goes into anywhere she doesn\'t know.' },
    ],
    options: [{ id: 'st.end.down', text: '(Go down.)', exit: true }],
  },

  // coming back to it
  st_resume: {
    speaker: 'narrator',
    text: [
      { if: STEPS_WORN, text: 'The steps. The sash on your shoulder, the clasp cold at your hip, the close at the foot of the steps waiting to see what you will do with it.' },
      { text: 'The steps. The sash folded over Three\'s arm, the lens in the lintel turned out over the crowd.' },
    ],
    again: 'The steps.',
    options: onward('re'),
  },
  st_fighting: {
    speaker: 'narrator',
    text: 'Not now. Thaddeus is on the steps with the machete, and he is not waiting for anybody to finish a sentence.',
    options: [{ text: '(Fight.)', exit: true }],
  },
  st_after: {
    speaker: THREE,
    text: [
      { if: F('a3_sash', 'worn'), text: 'Three stands at the top of the steps by the doors, its hands folded. "Magistrate. The vault is open to the chair." It looks west, at the steel door. "The Ledger is waiting. It has said that it does not mind waiting. Unit 3 does not believe that is true."' },
      { text: 'Three stands at the top of the steps by the doors, the sash folded over its arm. "Designate. The vault is open to you." It looks west, at the steel door. "The Ledger is waiting. Unit 3 has never known it to wait for anyone before."' },
    ],
    again: 'Three at the top of the steps. The steel door open to the west.',
    options: [{ text: '(Leave it.)', exit: true }],
  },
  st_none: {
    speaker: 'narrator',
    text: 'The steps go up to the great doors. Nobody has asked you to climb them yet.',
    options: [{ text: '(Leave them.)', exit: true }],
  },
};

export const d_a3_steps: DialogueDef = {
  id: 'd_a3_steps', owner: THREE,
  start: [
    { if: F('a3_sash'), node: 'st_after' },
    { if: NOT(F('a3_pnr')), node: 'st_none' },
    { if: BLADE_FOUGHT, node: 'blade_fought' },
    { if: BLADE_FIGHTING, node: 'st_fighting' },
    { if: NOT(F('a3_steps_photo')), node: 'arrive' },
    { if: NOT(F('a3_steps_sash')), node: 'three' },
    { node: 'st_resume' },
  ],
  nodes: STEPS_NODES,
};

// ---------------------------------------------------------------- the column's lead at the foot of the steps

const leadText = (who: 'lowe' | 'reyes'): Text => who === 'lowe'
  ? [
    { if: F('a3_ash', 'self'), text: 'Captain Lowe at the foot of the steps, his cap still on the stone where he put it down beside the Brother. He has not picked it up. "Designate," he says, and then nothing, because there is nothing in the order for this.' },
    { if: F('a3_sash', 'worn'), text: 'Captain Lowe at the foot of the steps, cap under his arm. "Magistrate." He has never saluted you, and he does not now. "I keep the Precinct\'s close. It is yours now, I am told. I find I keep it exactly the same."' },
    { if: F('a3_sash', 'refused'), text: 'Captain Lowe at the foot of the steps, cap under his arm. "Designate." The same voice he uses for everything. "The Precinct will write that you declined. I will write it myself, so that it is spelled correctly."' },
    { text: 'Captain Lowe at the foot of the steps, cap under his arm, the column\'s grey drawn up behind him in two lines. "Designate. Take whatever time it takes. Nobody on this close has anywhere else to be today."' },
  ]
  : [
    { if: F('a3_sash', 'worn'), text: 'Sergeant Reyes at the foot of the steps, where the captain would have stood. "Magistrate." She looks at the clasp the way she looks at a bill. "He would have read every word of whatever you sign. I\'ll try."' },
    { if: F('a3_sash', 'refused'), text: 'Sergeant Reyes at the foot of the steps. "Designate." She looks up the steps at the sash on Three\'s arm, and something in her shoulders comes down an inch. "Good," she says. "I\'d not have known what to call you."' },
    { text: 'Sergeant Reyes at the foot of the steps, where the captain would have stood, the column\'s grey behind her in two lines. "Designate. We keep the close. Go on up when you\'re ready."' },
  ];

export const d_a3_steps_lowe: DialogueDef = {
  id: 'd_a3_steps_lowe', owner: LOWE,
  start: [{ if: NOT(LOWE_DEAD), node: 'lowe' }, { node: 'reyes' }],
  nodes: {
    lowe: { speaker: LOWE, text: leadText('lowe'), again: 'Captain Lowe, at the foot of the steps.', options: [{ text: '(Leave him to it.)', exit: true }] },
    reyes: { speaker: REYES, text: leadText('reyes'), again: 'Reyes, at the foot of the steps.', options: [{ text: '(Leave her to it.)', exit: true }] },
  },
};

export const A3_STEPS_DIALOGUES: DialogueDef[] = [d_a3_steps, d_a3_steps_lowe];
