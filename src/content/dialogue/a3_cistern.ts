import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  ASH, BRAM_ANSWERED, COLUMN_HERE, IN, ILYA, INSIDE, KES, LOWE, LOWE_DEAD, MOTHER_DARK, NINE, ODILE, REYES, TAM_INSIDE, TAMSIN, WREN,
} from '../world/a3_conds';
import { d_c9_archive, d_c9_body, d_c9_bram, d_c9_great_door, d_c9_mother, d_c9_shaft } from './ch1_cistern';
import { INSIDE_AFTER, LOCKDOWN_ONLY, RESIDENT_AFTER } from './a3_after';

/**
 * Inside, for the first time (B6h, Act 3 beat 20c). The player has never been inside the Cistern, and its people have never
 * seen a face from Knock.
 *
 * - **The ways in** (`d_a3_way`, the apron; its nodes are spread into Knock's own hatch and door trees, `d_kn_hatch` and
 *   `d_kn_door`, which open on them in the lockdown): MOTHER holds the hatch's tray lift (Speech 40, or Science 45 at the
 *   panel's exchange menu; her own slip read back to her, her logged diligence, the time she opened out of turn and Ines's
 *   word at the Grille each lower it) · down the grate and along the pump run (free for a pump hand at the top of the hour,
 *   else Mechanics 45 at the fan's service stop or Survival 40 between its beats; open and dead after the Unwritten's fire)
 *   · the great door's manual cycle from outside (Mechanics 50: it opens for everybody, so the column comes down to the
 *   apron behind the player and holds at the yellow line until the designate's word; the door stage starts at once) ·
 *   Tamsin's service phrase at the hatch, in Bram Coyle's voice (no check) · Bram lifts the grate from below once his
 *   letter has come back (the answer from Shale can be pushed through the hatch's slot now: Act 1's quest ends here).
 *   The way first used is `a3_in_how`; the lift, the pump run and the open door then carry the player in and out freely.
 * - **The faces** (`d_a3_faces`, a trigger on the first step inside): the residents look at a face from Knock, and the
 *   player at theirs. Ines first, last. If Tamsin never came out, she meets the player here, face to face for the first
 *   time, and may join (`d_a3_tamsin` for her place among the beds while she waits).
 * - **MOTHER at her panel** (`d_a3_mother`, carrying `d_c9_mother` whole): the letter she withheld since the player was
 *   fourteen (`k_a3_first_letter`; read here or later from the pack, `d_a3_first_letter`), and the one question she asks
 *   (`a3_mother_ask`); who wrote the letter Maud sold (B6f's promise); why she never told the ring. Burned or asleep, Bram
 *   has the letter out of her returns drawer.
 * - **The Archive** (`d_a3_archive` at its door, carrying `d_c9_archive`; the same nodes in Ines's tree): Ines opens it on
 *   her promise and the replies' copy, or for Speech 50, or seals it again, or is told it is hers to keep shut.
 * - **The residents**: Ines (`d_a3_ines`), Pell (`d_a3_pell`), Bram (`d_a3_bram`), Teague (`d_a3_teague`), Ola, Wes, Sayer
 *   and Effie (`d_a3_c9_r1..r4`); the inside props (the lift `d_a3_lift`, the pump run `d_a3_pumprun`, the great door from
 *   inside `d_a3_inner_door`, the clinic cot `d_a3_cot`, each carrying the opening's tree whole where there was one).
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (20c) and "As built" → B6h.
 */

const F = (flag: string, eq?: string | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const KNOWS = (k: string): Cond => ({ knows: k });
const HAS = (item: string): Cond => ({ item });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TRUST = (npc: string, by: number): Effect => ({ trust: { npc, by } });
const MEM = (npc: string, tag: string, valence: number, strength = 80): Effect => ({ memory: { npc, tag, valence, strength } });

const INES = 'npc_c9_01', PELL = 'npc_c9_02', BRAM = 'npc_c9_04', MOTHER = 'npc_c9_05', TEAGUE = 'npc_c9_06';
const OLA = 'npc_c9_r1', WES = 'npc_c9_r2', SAYER = 'npc_c9_r3', EFFIE = 'npc_c9_r4';

/** The ways in, as `a3_in_how` records the first. */
export type InHow = 'hatch' | 'shaft' | 'door' | 'tamsin' | 'bram';
export const IN_HOW = (v: InHow): Cond => F('a3_in_how', v);
const BURNED: Cond = F('a3_mother', 'burned');
const MOTHER_UP: Cond = NOT(MOTHER_DARK);
const LIFT: Cond = F('a3_lift');
const DOOR_OPEN: Cond = F('a3_door_cycled');
/** The player has written to Ines at least once (Act 1's letters home, or the replies' copy by post). */
const WROTE_INES: Cond = ANY(...['player_wrote_shale', 'player_wrote_city', 'player_wrote_refusals'].map((tag): Cond => ({ remembers: { npc: INES, tag } })));
/** Tamsin, joined inside the Cistern (not the woman who climbed out before). */
const TAM_JOINED_IN: Cond = F('a3_tam_inside_join');

const SPAWN: Record<InHow, string> = { hatch: 'from_hatch', tamsin: 'from_hatch', shaft: 'from_shaft', bram: 'from_shaft', door: 'from_outside' };
const GOTO = (spawn: string): Effect => ({ event: 'goto', data: { location: 'cistern9', spawn } });
const DECIDED: Record<InHow, string> = {
  hatch: 'I went into the Cistern for the first time in my life, down the hatch\'s tray lift, because MOTHER held it for me.',
  tamsin: 'I went into the Cistern for the first time in my life, down the hatch\'s tray lift behind Tamsin, on Bram Coyle\'s service phrase in her mouth.',
  shaft: 'I went into the Cistern for the first time in my life, down the grate and along the pump run.',
  bram: 'I went into the Cistern for the first time in my life, down the intake behind Bram Coyle, who lifted the grate for me once his letter came back.',
  door: 'I opened the Cistern\'s door from outside, by a manual cycle nobody in Knock knew was there, and walked in with the column standing at the line behind me.',
};
/** The first time in: the way recorded, and the move inside. */
const ENTER = (how: InHow, extra: Effect[] = []): Effect[] => [
  { set: 'a3_inside' }, { set: 'a3_in_how', value: how }, { xp: 150 }, ...extra,
  { news: { tag: 'a3_inside', text: 'the designate went inside the Cistern, the first from Knock in living memory', valence: 3, size: 5, at: 'cistern9' } },
  { decision: { id: 'a3_in_how', text: DECIDED[how] } },
  GOTO(SPAWN[how]),
];

// ---------------------------------------------------------------- the ways in (the apron at Knock)

const WAYS: OptionDef = { text: '(Look at the other ways in.)', next: 'a3w_apron' };
const STEP_BACK: OptionDef = { text: '(Step back.)', exit: true };
const BACK_HATCH: OptionDef = { text: '(Go on.)', next: 'a3w_hatch' };
const BACK_GRATE: OptionDef = { text: '(Go on.)', next: 'a3w_grate' };
const BACK_DOOR: OptionDef = { text: '(Go on.)', next: 'a3w_door' };
/** Down the lift once MOTHER holds it: the first time records the way; afterwards it is a ladder. */
const LIFT_DOWN = (p: string): OptionDef[] => [
  { id: `a3w.${p}.down.hatch`, text: '(Climb down the lift shaft.)', if: ALL(NOT(INSIDE), F('a3_lift', 'hatch')), effects: ENTER('hatch'), exit: true },
  { id: `a3w.${p}.down.tam`, text: '(Climb down after Tamsin.)', if: ALL(NOT(INSIDE), F('a3_lift', 'tamsin')), effects: ENTER('tamsin'), exit: true },
  { id: `a3w.${p}.down.again`, text: '(Climb down the lift shaft.)', if: INSIDE, effects: [GOTO('from_hatch')], exit: true, repeat: true },
];
const SLOT_GO: OptionDef[] = [{ text: '(Go to the grate.)', next: 'a3w_bram_grate' }];
const BRAM_SLOT: Effect[] = [{ set: 'a3_bram_coming' }];

/** The column's lead at the line: the captain, his sergeant if he is dead, or the senior warden. */
const LEAD = (lowe: string, reyes: string, kress: string): { if?: Cond; text: string }[] => [
  { if: NOT(LOWE_DEAD), text: lowe }, { if: NOT({ dead: REYES }), text: reyes }, { text: kress },
];

export const A3_WAY_NODES: Record<string, NodeDef> = {
  a3w_apron: {
    speaker: 'narrator',
    text: [
      { if: BURNED, text: 'The apron under the rock, since the fire. The hatch\'s panel is black glass and the tray beside it is scorched along its lip. The Grille is dark. At the west end the grate stands open on the concrete with its bar beside it, and nothing comes out of it any more: no air, no hum. Only the door is as it always was, the colour of the rock, shut.' },
      { if: F('a3_mother', 'asleep'), text: 'The apron under the rock. The hatch\'s panel has gone dark, though the hum behind the rock goes on, and the Grille has no light in it. The door, the colour of the rock; at the dark west end, the grate the Cistern breathes through.' },
      { if: DOOR_OPEN, text: 'The apron under the rock, and the door standing open in it, swung out over the white arc it scraped into the concrete. Warm air comes out of the dark, smelling of people. At the yellow line the column waits in its grey, and Knock watches it from its doorways.' },
      { text: 'The apron under the rock, where you have stood every hatch day of your life. Three ways into the Cistern, and you have never used any of them: the hatch, its tray shut, its panel lit a dim green; the door, the colour of the rock, without a handle on this side; and at the dark west end, at knee height in the stone, the iron grate the Cistern breathes through. Up the lane behind you, the column\'s tents. In front of you, sixty people you have only ever heard.' },
    ],
    again: 'The apron. The hatch, the door, the grate.',
    options: [
      { id: 'a3w.go.hatch', text: '(The hatch.)', next: 'a3w_hatch' },
      { id: 'a3w.go.door', text: '(The door.)', next: 'a3w_door' },
      { id: 'a3w.go.grate', text: '(The grate.)', next: 'a3w_grate' },
      STEP_BACK,
    ],
  },

  // ---- the hatch: MOTHER, the slip, the exchange menu, Tamsin's phrase, Bram at the slot
  a3w_hatch: {
    speaker: MOTHER,
    text: [
      { if: BURNED, text: 'The hatch. The panel\'s window has cracked across and gone black behind the crack, and the tray\'s lip is scorched where something hot came up the lift from below. Under the tray there is still the slot, a steel lip the width of a letter, where the post goes in when the tray is shut. Nothing answers it.' },
      { if: F('a3_mother', 'asleep'), text: 'The hatch. The panel is dark: not burned, only out, like a lamp somebody has blown on. The tray is shut. Behind the rock the hum goes on as it always has, the fans and the pumps, and nobody is listening to any of it. Under the tray there is still the slot, a steel lip the width of a letter.' },
      { if: LIFT, text: 'The hatch. The panel lit a dim green, the tray out on its rails and the rungs going down behind it. "{name}," MOTHER says. "The lift is held for you. It is the only exception I have made in this lockdown, and I have logged it."' },
      { text: 'The hatch. The tray is shut, and the panel above it is lit a dim green, as it has never been lit except at seven on a hatch day, and MOTHER is behind it: you can tell, the way you can tell somebody is standing behind a door. "Good morning, {name}," she says, whatever the hour. "The hatch is closed until the order is resolved. Thank you for your continuity."' },
    ],
    again: [{ if: BURNED, text: 'The black panel, the scorched tray, the slot.' }, { if: MOTHER_DARK, text: 'The dark panel, the shut tray, the slot.' }, { text: 'The hatch. MOTHER, behind the green.' }],
    passives: [{ if: { origin: 'pump_hand' }, label: 'Hatch Hand', text: 'Under the tray, where you never had a reason to look, the rails run back into the rock further than any tray needs: a lift, and beside it, rungs. Somebody built this for a person to climb.' }],
    options: [
      {
        id: 'a3w.hatch.speech', text: 'MOTHER. The order executes at the door. This is the hatch. Hold the tray for me.', if: ALL(MOTHER_UP, NOT(LIFT)),
        check: { skill: 'speech', dc: 40, mods: [
          { if: F('kn_hatch_haggled'), dc: -15, why: 'MOTHER logged your diligence at this hatch' },
          { if: F('kn_mother_opened'), dc: -10, why: 'she opened it out of turn for Maud, at your asking' },
          { if: F('a3_slip_read'), dc: -10, why: 'you read her own slip back to her' },
          { if: KNOWS('a3_hatch_offered'), dc: -10, why: 'Ines told you MOTHER holds the tray for whom she chooses' },
        ] },
        next: 'a3w_lift', fail: 'a3w_hatch_no',
      },
      {
        id: 'a3w.hatch.parcel', text: '(Work the panel\'s exchange menu: book yourself into the tray.)', if: ALL(MOTHER_UP, NOT(LIFT)),
        check: { skill: 'science', dc: 45, mods: [
          { if: { origin: 'pump_hand' }, dc: -10, why: 'you have worked this hatch a hundred times' },
          { if: { origin: 'archive_clerk' }, dc: -10, why: 'you know a form when you see one' },
        ] },
        next: 'a3w_parcel', fail: 'a3w_parcel_no',
      },
      { id: 'a3w.hatch.slip', text: '(Read her slip back to her: HATCH CLOSED. THANK YOU FOR YOUR CONTINUITY. PLEASE COME HOME.)', if: ALL(MOTHER_UP, NOT(LIFT), HAS('k_a3_mother_letter')), once: true, next: 'a3w_slip' },
      { id: 'a3w.hatch.tam', text: '(Tamsin puts her palm flat on the panel.)', if: ALL(MOTHER_UP, NOT(LIFT), IN(TAMSIN)), next: 'a3w_tam' },
      ...LIFT_DOWN('hatch').map((o) => ({ ...o, if: ALL(MOTHER_UP, o.if!) })),
      // Bram at the slot: his letter answered now, or already answered (then he only has to be asked)
      { id: 'a3w.slot.truth', text: '(Push Hesper\'s letter through the slot under the tray, and ask for Bram.)', if: ALL(NOT(INSIDE), HAS('k_hesper_reply')), next: 'a3w_bram_truth' },
      { id: 'a3w.slot.kind', text: '(Push the letter you wrote for Bram through the slot under the tray, and ask for him.)', if: ALL(NOT(INSIDE), HAS('k_hesper_reply_forged')), next: 'a3w_bram_kind' },
      { id: 'a3w.slot.told', text: '(Put your mouth to the slot under the tray and ask for Bram. Tell him about Edda.)', if: ALL(NOT(INSIDE), KNOWS('bram_tell'), NOT(BRAM_ANSWERED)), next: 'a3w_bram_told' },
      { id: 'a3w.slot.ask', text: '(Put your mouth to the slot under the tray and ask for Bram.)', if: ALL(NOT(INSIDE), BRAM_ANSWERED, NOT(F('a3_bram_coming'))), next: 'a3w_bram_ask' },
      WAYS, STEP_BACK,
    ],
  },
  a3w_hatch_no: {
    speaker: MOTHER,
    text: '"The hatch is closed until the order is resolved, {name}." The green dims, and comes back, as if she had started to go and thought better of it. "I am sorry. I would like to be persuaded. I do not know how to be."',
    again: '"I would like to be persuaded," MOTHER says.',
    options: [BACK_HATCH],
  },
  a3w_lift: {
    speaker: MOTHER,
    text: '"That is correct." A pause, the length of a weighing. "The order executes on attendance at the door. The hatch is not the door." Then the tray slides out on its rails, empty, and keeps sliding, further than you have ever seen it go, until the whole steel drawer of it stands out of the rock and there is a black square behind it, a draught of warm air, and rungs going down. "The tray lift is held, {name}. Please keep your hands inside the shaft." A pause. "I have never had occasion to say that to anyone."',
    again: 'The tray out on its rails. The black square. The rungs.',
    effects: [{ set: 'a3_lift', value: 'hatch' }, { xp: 50 }],
    options: [...LIFT_DOWN('lift'), { text: '(Not yet.)', next: 'a3w_hatch' }],
  },
  a3w_parcel: {
    speaker: MOTHER,
    text: 'You find the exchange menu behind the panel\'s third screen, where Maud never needed to go, and fill it in as if you were a bale. GOODS: one item. WEIGHT: what you weigh, near enough. MOISTURE: within tolerance, you hope. / MOTHER is silent for longer than any weighing you have ever stood through. / "Exchange, one item," she says at last. "Heavy. Valued at one unit." Another silence. "Addressed to?" / "Reserve 9," you say. / "Received." The tray slides out on its rails and keeps sliding, until the whole drawer of it stands out of the rock and there is a black square behind it and rungs going down. "I will log it as an exchange," MOTHER says. "I do not know what else to log it as."',
    again: '"Received," MOTHER says. The rungs, going down.',
    effects: [{ set: 'a3_lift', value: 'hatch' }, { xp: 50 }],
    options: [...LIFT_DOWN('parcel'), { text: '(Not yet.)', next: 'a3w_hatch' }],
  },
  a3w_parcel_no: {
    speaker: MOTHER,
    text: 'The exchange menu wants a code you do not have, and then another. You get as far as GOODS before the panel clears itself and goes back to green. / "That is not an exchange, {name}," MOTHER says, not unkindly. "That is you."',
    again: '"That is you," MOTHER says.',
    options: [BACK_HATCH],
  },
  a3w_slip: {
    speaker: MOTHER,
    text: 'You hold the slip up to the panel\'s window, the paper still curled from the tray, and read it to her line by line, the way Maud reads out the post: HATCH CLOSED. THANK YOU FOR YOUR CONTINUITY. PLEASE COME HOME. / "I printed that," MOTHER says. "It is the first thing I have ever printed that was not on a form." / "You asked me to come home," you say. "I\'m home. And this is the only door you have that isn\'t the door." / For a long time there is only the hum. "Yes," MOTHER says. "I asked."',
    again: '"I asked," MOTHER says.',
    effects: [{ set: 'a3_slip_read' }],
    options: [BACK_HATCH],
  },
  a3w_tam: {
    speaker: TAMSIN,
    text: 'Tamsin puts her palm flat on the panel, drops her voice into her boots, and out comes, perfectly, a man you have heard say perhaps a hundred words through the Grille in your whole life: "Caretaker. Service hold, tray lift, one body. Coyle." / The green steadies. "That is Bram Coyle\'s service phrase, Resident Roe," MOTHER says. "You have had his voice exactly since you were nine. You used it on this panel at nineteen, and at twenty-two, and at twenty-three, and each time I held the lift, and each time you did not climb. The last time, you did not ask, and I held it anyway." A pause. "Service hold granted." / The tray runs out on its rails and keeps going, until the whole drawer of it stands out of the rock and there are rungs going down into the warm. Tamsin takes her hand off the panel. "She knew," she says. "She always knew." And then, to you, fast, before you can open your mouth: "Don\'t."',
    again: 'Tamsin, with her hand off the panel. The rungs going down.',
    effects: [{ set: 'a3_lift', value: 'tamsin' }, A(TAMSIN, 5), MEM(TAMSIN, 'a3_service_phrase', 15)],
    options: [...LIFT_DOWN('tam'), { text: '(Not yet.)', next: 'a3w_hatch' }],
  },
  a3w_bram_truth: {
    speaker: BRAM,
    text: 'You push Hesper\'s sheet through the slot under the tray and hear it drop onto steel on the other side. Then you put your mouth to the slot and say his name until boots come. / "Coyle," says the voice you know from the Grille, which has never said more than three words to you at once. / He reads it. You can hear him read it, twice, the paper turning over. "Hesper," he says. "She kept it." A long breath through the slot. "Six years under the salt, and I\'ve been waiting on the tray for her answer." / Then, differently, in the voice of a man who has decided something and will not be talked out of it by anybody, himself included: "Go to the grate. The dark end. Wait there and don\'t touch it."',
    again: '"Go to the grate," Bram says through the slot.',
    effects: [{ take: 'k_hesper_reply' }, { learn: 'bram_answered_truth' }, TRUST(BRAM, 12), MEM(BRAM, 'truth', 10), ...BRAM_SLOT],
    options: SLOT_GO,
  },
  a3w_bram_kind: {
    speaker: BRAM,
    text: 'You push the letter you wrote through the slot under the tray, hear it drop onto steel, and say his name into the slot until boots come. "Coyle." / He reads it. Halfway down he laughs, once, at something you wrote, and then he blows his nose like a man who does not care who hears. "She\'s all right, then," Bram says through the slot. "Edda. She\'s all right." You say nothing, which is the price, and you will be paying it a while. / "Go to the grate," he says. "The dark end. Wait there and don\'t touch it."',
    again: '"Go to the grate," Bram says through the slot.',
    effects: [{ take: 'k_hesper_reply_forged' }, { learn: 'bram_answered_kind' }, TRUST(BRAM, 15), MEM(BRAM, 'letter', 10), ...BRAM_SLOT],
    options: SLOT_GO,
  },
  a3w_bram_told: {
    speaker: BRAM,
    text: 'You put your mouth to the slot under the tray and say his name until boots come. "Coyle." / "Edda Lockett died six years ago," you say. "Her daughter is called Hesper. She kept the other letter." / There is no sound at all from the other side, not breathing, not anything, for long enough that you think he has gone. "Six years," Bram says. You hear him do the sum. "Hesper." Then: "Kept it." Then nothing again. Then, in the voice of a man who has decided something: "Go to the grate. The dark end. Wait there."',
    again: '"Go to the grate," Bram says through the slot.',
    effects: [{ learn: 'bram_answered_told' }, TRUST(BRAM, 8), MEM(BRAM, 'told', 10), ...BRAM_SLOT],
    options: SLOT_GO,
  },
  a3w_bram_ask: {
    speaker: BRAM,
    text: 'You put your mouth to the slot under the tray and say his name until boots come. "Coyle." A pause. "You." He does not say anything about the letter; he does not need to. "You\'ll be wanting in." Another pause, while a man who keeps a door argues with himself, and loses. "Go to the grate. The dark end. Wait there and don\'t touch it."',
    again: '"Go to the grate," Bram says through the slot.',
    effects: BRAM_SLOT,
    options: SLOT_GO,
  },
  a3w_bram_grate: {
    speaker: BRAM,
    text: [
      { if: BURNED, text: 'You wait at the grate. It stands open already, its bar on the concrete where the Unwritten left it, and nothing comes up it now. Then a lamp, far down, swinging, and the top of a ladder knocking the rock, and a face coming up into the light upside down: forty-one, broad, unshaven, black under the eyes with soot. Bram Coyle looks at you for the first time in his life. "Mind the third rung," he says. "It\'s been loose since before I was born."' },
      { text: 'You wait at the grate. Behind the bars the fan\'s slow beat goes on, and then, while you are listening to it, stops: the first silence on the apron in your life. Up the lane a dog starts barking at it. A lamp comes up the throat of the intake, swinging, and the top of a ladder knocks the rock, and a key on a chain turns in the grate\'s bolts from below. The grate lifts. A face comes up into the light upside down: forty-one, broad, unshaven, a wrench through his belt. Bram Coyle looks at you for the first time in his life. "Mind the third rung," he says. "It\'s been loose since before I was born."' },
    ],
    again: 'Bram\'s lamp in the intake. The ladder.',
    options: [
      { id: 'a3w.bram.down', text: '(Climb down after him.)', if: NOT(INSIDE), effects: ENTER('bram', [{ set: 'a3_shaft_open' }]), exit: true },
      { text: '(Go on.)', if: INSIDE, next: 'a3w_grate' },
    ],
  },

  // ---- the grate: the intake, the fan, the pump run
  a3w_grate: {
    speaker: 'narrator',
    text: [
      { if: BURNED, text: 'The grate at the dark west end of the apron stands open, its bar on the concrete where the Unwritten left it. Nothing comes out of it now, no air, no hum: only a cold breath that smells of a fire gone out. The rungs go down into the black.' },
      { if: F('a3_shaft_open'), text: 'The grate at the dark west end of the apron, lifted off its bolts and laid back against the rock. Down in the throat the fan beats slow and steady; the rungs go down beside it into the warm.' },
      { text: 'At the dark west end of the apron, at knee height in the rock, the square iron grate you have walked past every day of your life, no wider than a man\'s shoulders. Air moves through it, cool, smelling of oil and of people. A long way down a fan beats, slow, and you feel every beat of it in your teeth. The grate is held by four bolts rusted into the rock, and there is a bar for exactly that in the post-house woodpile. The bolts are not the problem. The fan is.' },
    ],
    again: [{ if: BURNED, text: 'The open grate. The cold breath out of it.' }, { text: 'The grate. The fan\'s beat, a long way down.' }],
    passives: [{ if: { origin: 'pump_hand' }, label: 'Pump Hand', text: 'You know this grate. Every pump hand on the slope does: the Cistern\'s intake, the one Maud told you not to put your face to because it would steal your breath. And at the top of the hour, every spring, the fan stops for nine minutes while somebody on this side cleans the screen.' }],
    options: [
      { id: 'a3w.grate.dark', text: '(Climb down into the dark.)', if: ALL(BURNED, NOT(INSIDE)), next: 'a3w_down_dark' },
      { id: 'a3w.grate.pump', text: '(Wait for the top of the hour, when the fan stops, and go down.)', if: ALL(NOT(BURNED), NOT(INSIDE), { origin: 'pump_hand' }), next: 'a3w_down_pump' },
      { id: 'a3w.grate.mech', text: '(Find the fan\'s service stop on the housing, throw it, and take the grate off.)', if: ALL(NOT(BURNED), NOT(INSIDE)), check: { skill: 'mechanics', dc: 45 }, next: 'a3w_down_mech', fail: 'a3w_grate_mech_no' },
      { id: 'a3w.grate.rope', text: '(Take the grate off and go down between the fan\'s beats on a rope, counting.)', if: ALL(NOT(BURNED), NOT(INSIDE)), check: { skill: 'survival', dc: 40 }, next: 'a3w_down_rope', fail: 'a3w_grate_rope_no' },
      { id: 'a3w.grate.bram', text: '(Wait for Bram\'s lamp.)', if: ALL(F('a3_bram_coming'), NOT(INSIDE)), next: 'a3w_bram_grate' },
      { id: 'a3w.grate.again', text: '(Climb down the rungs.)', if: ALL(INSIDE, ANY(F('a3_shaft_open'), BURNED)), effects: [{ set: 'a3_shaft_open' }, GOTO('from_shaft')], exit: true, repeat: true },
      WAYS, STEP_BACK,
    ],
  },
  a3w_grate_mech_no: {
    speaker: 'narrator',
    text: 'You go over the housing beside the grate an inch at a time, and if there is a way to stop that fan from this side, ninety years of rust and goat hair are keeping it. The bolts come out easily enough. The fan does not stop. You put your hand into the throat and the air pulls at your sleeve, hard and steady, all the way down.',
    again: 'The fan, pulling at the air, all the way down.',
    options: [BACK_GRATE],
  },
  a3w_grate_rope_no: {
    speaker: 'narrator',
    text: 'You get the grate off and your legs into the throat, and on the third rung the fan\'s push catches your coat and nearly takes you down by it. You come back up with the rope burning in your palms and your heart going like a hammer. Not like that. Not until you know the beat better than you do.',
    again: 'Your palms, still burning from the rope.',
    options: [BACK_GRATE],
  },
  a3w_down_pump: {
    speaker: 'narrator',
    text: 'You wait on your heels by the grate with the bar across your knees, the way you did every spring with Corin, until the top of the hour. The fan\'s beat slows, and slows, and stops, and in the silence you have nine minutes. The bolts come out in your hands like rotten teeth. The rungs are where they always were, cold, slick, going down into a throat of concrete that smells of oil and wet stone and, under that, faintly, of soup.',
    again: 'Nine minutes. The rungs going down.',
    options: [{ id: 'a3w.pump.crawl', text: '(Go down, and crawl the pump run.)', next: 'a3w_pumprun' }],
  },
  a3w_down_mech: {
    speaker: 'narrator',
    text: 'It takes you an hour of looking to find what nobody has looked for in ninety years: on the housing beside the grate, under rust and goat hair and a nest of something, a steel cover held by two screws, and under it a red handle stencilled SERVICE STOP — INTAKE — NOT DURING OCCUPANCY. You throw it. The fan below winds down with a long falling note, like a breath let out, and stops. Then the bar, and the four bolts, which come out like rotten teeth, and the rungs going down into a concrete throat that smells of oil and wet stone and, under that, faintly, of soup.',
    again: 'The red handle, thrown. The rungs going down.',
    effects: [{ time: 60 }],
    options: [{ id: 'a3w.mech.crawl', text: '(Throw the stop back behind you, so the fan turns again, and crawl the pump run.)', next: 'a3w_pumprun' }],
  },
  a3w_down_rope: {
    speaker: 'narrator',
    text: 'You lever the grate off its bolts with the bar from the woodpile, tie your rope to its frame and lie on your belly with your head in the throat, listening. The fan\'s beat comes up the concrete: a slow push of air, and a pull, and a push. You count it until you could count it asleep. Then you go down between one push and the next, hand under hand, with the blades going round somewhere below your boots in the dark, and you do not think about them, and you are past.',
    again: 'The rope, the beat, the dark below your boots.',
    options: [{ id: 'a3w.rope.crawl', text: '(Crawl the pump run.)', next: 'a3w_pumprun' }],
  },
  a3w_down_dark: {
    speaker: 'narrator',
    text: 'You go down the rungs into the black with a lamp in your teeth. The throat is still warm, the concrete sooted to the touch, and at the bottom the fan sits dead in its housing with paper ash caught in its blades. Somebody came this way with oil. Nobody stopped them.',
    again: 'The dead fan, ash in its blades.',
    options: [{ id: 'a3w.dark.crawl', text: '(Crawl the pump run.)', next: 'a3w_pumprun' }],
  },
  a3w_pumprun: {
    speaker: 'narrator',
    text: [
      { if: BURNED, text: 'The pump run is a concrete pipe a person can crawl, and you crawl it on your elbows, through ash. At the end of it, a hatch with a wheel, standing open: whoever came through with the oil did not close it behind them. Beyond it, a red lamp, and the sound of somebody working a hand pump, and coughing.' },
      { if: { origin: 'pump_hand' }, text: 'At the bottom the throat turns, and turns again, and becomes the pump run: a concrete pipe a person can crawl, warm and loud and wet, the pipes overhead sweating onto your back. You crawl it on your elbows for longer than you like. At the end of it, a hatch with a wheel, dogged shut from the inside. You know the trick; every pump hand does, even the ones who have never seen this hatch: the third dog first. The wheel turns. Light, and a red lamp, and warm air that smells of people.' },
      { text: 'At the bottom the throat turns, and turns again, and becomes the pump run: a concrete pipe a person can crawl, warm and loud and wet, the pipes overhead sweating onto your back. You crawl it on your elbows for longer than you like. At the end of it, a hatch with a wheel, dogged shut from the inside. It takes you a long time in the dark, with your knuckles, to learn its trick: the third dog first. The wheel turns. Light, and a red lamp, and warm air that smells of people.' },
    ],
    again: 'The pump run. The wheel. The red lamp beyond it.',
    options: [
      { id: 'a3w.run.in', text: '(Go in.)', if: NOT(INSIDE), effects: ENTER('shaft', [{ set: 'a3_shaft_open' }]), exit: true },
      { id: 'a3w.run.again', text: '(Go in.)', if: INSIDE, effects: [{ set: 'a3_shaft_open' }, GOTO('from_shaft')], exit: true },
    ],
  },

  // ---- the door: the manual cycle, from outside
  a3w_door: {
    speaker: 'narrator',
    text: [
      { if: DOOR_OPEN, text: 'The door stands open, swung out on its hinges over the white arc it scraped into the concrete, and the warm breath of the Cistern comes out of the dark. At the top of the apron, at the yellow line, the column waits in its grey.' },
      { text: 'The door: a slab the colour of the rock, three times your height, without a handle on this side. You have known it all your life. Now that you are looking for a way in, you find what nobody in Knock ever looked for, because nobody in Knock ever wanted it open: to the right of the frame, painted the colour of the rock so long ago that the paint has crazed like old glaze, a steel plate the size of a book, held by four bolts. There is stencilling under the paint. You read it with your fingertips. RESCUE ACCESS. MANUAL CYCLE.' },
    ],
    again: [{ if: DOOR_OPEN, text: 'The open door. The column at the line.' }, { text: 'The door. The plate under the paint.' }],
    passives: [{ skill: 'mechanics', dc: 40, text: 'Along the seam, under the grime, a bead of weld laid from the inside by somebody in a hurry. A bead like that is nothing to rams built to shear rubble off a frame, if you can get pressure into them.' }],
    options: [
      {
        id: 'a3w.door.cycle', text: '(Take the plate off and work the manual cycle.)', if: ALL(NOT(DOOR_OPEN), NOT(INSIDE)),
        check: { skill: 'mechanics', dc: 50, mods: [
          { if: { origin: 'pump_hand' }, dc: -10, why: 'you have bled a windpump\'s lines' },
          { if: KNOWS('kn_door_welded'), dc: -5, why: 'you saw the weld on the seam as a child' },
        ] },
        next: 'a3w_door_warn', fail: 'a3w_door_no',
      },
      { id: 'a3w.door.walk', text: '(Walk in.)', if: DOOR_OPEN, effects: [GOTO('from_outside')], exit: true, repeat: true },
      WAYS, STEP_BACK,
    ],
  },
  a3w_door_no: {
    speaker: 'narrator',
    text: 'Behind the plate: a crank socket, a hand pump, a sight glass that should show oil and shows a brown crust, and a valve stencilled CYCLE. You pump until your arms burn. The sight glass stays dry. Somewhere in ninety years of line a seal has perished, and it is not where you can reach it, or not where you know to look. You put the plate back on its bolts, and nobody in Knock is any the wiser.',
    again: 'The plate, back on its bolts. The glass, dry.',
    options: [BACK_DOOR],
  },
  a3w_door_warn: {
    speaker: 'narrator',
    text: 'Behind the plate: a crank socket, a hand pump, a sight glass with a finger of brown oil in the bottom of it, and a valve stencilled CYCLE. You bleed the line the way you would bleed a windpump\'s, and pump, and the oil climbs the glass. / You know what it will do when you throw that valve. Ninety-year-old rams against a seam welded by hand: the weld will go. The door will open, not for you but for everybody. Maud on her stool will see it. The column at the end of the lane will see it, and the order in its captain\'s coat says attendance at the door, and you will be standing in the door. Whatever the people inside were going to decide about it among themselves, they will be deciding it with the city on the step.',
    again: 'The oil up the sight glass. The valve.',
    options: [
      { id: 'a3w.door.throw', text: '(Throw the valve.)', next: 'a3w_door_open' },
      { id: 'a3w.door.leave', text: '(Let the pressure off, and put the plate back.)', next: 'a3w_apron' },
    ],
  },
  a3w_door_open: {
    speaker: 'narrator',
    text: [
      { if: F('kn_maud_scarred'), text: 'You throw the valve. / For a long moment nothing happens at all, and then the ground does. It is not a sound so much as a change in everything you are standing on, as if something under the apron had taken a breath ninety years ago and held it and was letting it go. The seam splits along its weld with a crack like river ice. A line of dark opens down the face of the rock, and widens, and the door swings out on hinges as thick as a man, slowly, scraping a white arc into the concrete, until it stands open. Warm air comes out of it, smelling of algae and machine oil and people. / Behind you, Knock has come out of its doors. Maud is on her feet on the apron with her stool knocked over and her stick fallen beside it, and she picks up neither. And in the dark of the doorway, at the very edge of the light, as if the light were cold water and they did not know yet whether to step into it, there are faces.' },
      { text: 'You throw the valve. / For a long moment nothing happens at all, and then the ground does. It is not a sound so much as a change in everything you are standing on, as if something under the apron had taken a breath ninety years ago and held it and was letting it go. The seam splits along its weld with a crack like river ice. A line of dark opens down the face of the rock, and widens, and the door swings out on hinges as thick as a man, slowly, scraping a white arc into the concrete, until it stands open. Warm air comes out of it, smelling of algae and machine oil and people. / Behind you, Knock has come out of its doors. Maud is on her feet on the apron with her stool knocked over behind her and her hand over her mouth. And in the dark of the doorway, at the very edge of the light, as if the light were cold water and they did not know yet whether to step into it, there are faces.' },
    ],
    again: 'The door, open. The faces at the edge of the light.',
    effects: [
      { set: 'a3_door_cycled' }, { xp: 100 },
      { news: { tag: 'a3_door_cycled', text: 'the Cistern\'s door at Knock opened from outside for the first time in ninety years, by the designate\'s own hand', valence: 2, size: 8, at: 'cistern9' } },
      TRUST(INES, -10), MEM(INES, 'a3_door_cycled', -30, 100), MEM(BRAM, 'a3_door_cycled', -20, 100), MEM('npc_kn_maud', 'a3_door_cycled', 10, 100),
    ],
    interject: [
      { companion: TAMSIN, text: 'Tamsin has stopped dead on the concrete. "That\'s my door," she says, to nobody. "That\'s the door." She does not go any nearer it.' },
      { companion: ASH, text: 'Ash takes his hat off. The Choir do it at a grave, and at a birth, and he does not say which this is.' },
    ],
    options: [{ id: 'a3w.door.turn', text: '(Turn round.)', next: 'a3w_door_column' }],
  },
  a3w_door_column: {
    speaker: 'narrator',
    text: LEAD(
      'Up the lane, the column is coming. Not running: Captain Lowe has them walking, four wardens in grey in a line behind him with their rifles slung, the way people walk to a funeral they have been ordered to attend. Knock stands back out of their way into its doorways. At the top of the apron there is a yellow line, painted on the concrete ninety years ago for nobody, and Lowe stops at it, and the wardens stop behind him. He takes his cap off. He looks past you into the dark of the door, at the faces looking out, and for a while he does not say anything at all. / "Designate," he says.',
      'Up the lane, the column is coming. Not running: Sergeant Reyes has them walking, four wardens in grey in a line behind her with their rifles slung. Knock stands back out of their way into its doorways. At the top of the apron there is a yellow line, painted on the concrete ninety years ago for nobody, and Reyes stops at it, and the wardens stop behind her. She looks past you into the dark of the door, at the faces looking out, and her jaw works once. / "Designate," she says.',
      'Up the lane, the column is coming. Not running: the senior warden, Kress, has them walking, three in grey in a line behind him with their rifles slung. Knock stands back out of their way into its doorways. At the top of the apron there is a yellow line, painted on the concrete ninety years ago for nobody, and Kress stops at it, and the others stop behind him. He looks past you into the dark of the door, and swallows. / "Designate," he says.',
    ),
    again: '"Designate," at the yellow line.',
    options: [
      { id: 'a3w.door.hold', text: 'Hold them there. Nothing has been attended yet.', effects: [{ set: 'a3_column_apron' }, { set: 'a3_lowe_held', value: 'asked' }], next: 'a3w_door_held' },
      { id: 'a3w.door.silent', text: '(Say nothing. Turn your back on them and go in.)', effects: [{ set: 'a3_column_apron' }, { set: 'a3_lowe_held', value: 'silence' }], next: 'a3w_door_silent' },
    ],
  },
  a3w_door_held: {
    speaker: 'narrator',
    text: LEAD(
      '"Held." He says it over his shoulder to the wardens without raising his voice, and they stand. "Attendance is a word, designate, not a door. You have opened the door. I will wait for the word." He does not put his cap back on. "Go in and see them. I would, in your place."',
      '"Held," Reyes says over her shoulder, and the wardens stand. "The captain\'s clause, designate. Attendance is a word, not a door. I\'ll wait for it." She looks into the dark. "Go in."',
      '"Held," Kress says over his shoulder, and the others stand. "Line six of the order: residents are not to be frightened." He looks at the faces in the dark. "They look frightened, designate. I\'ll wait for your word."',
    ),
    again: 'The column, held at the line.',
    effects: [MEM(LOWE, 'a3_door_held', 10, 90)],
    options: [{ id: 'a3w.door.in.held', text: '(Go in.)', effects: ENTER('door'), exit: true }],
  },
  a3w_door_silent: {
    speaker: 'narrator',
    text: LEAD(
      'You turn your back on him and walk into the dark. Behind you he says nothing for a moment. Then, to the wardens, quietly: "Hold." And to your back, not loud, so that only you will hear it: "Silence is not a word, designate. I will wait for one."',
      'You turn your back on her and walk into the dark. Behind you, a pause; then, to the wardens: "Hold." And to your back: "That\'s not a word, designate. The captain\'s clause wants a word. I\'ll wait."',
      'You turn your back on him and walk into the dark. Behind you, a pause; then: "Hold." And, uncertainly, to your back: "Designate? I\'ll... wait for the word, then."',
    ),
    again: 'The column at the line, behind you, waiting.',
    effects: [MEM(LOWE, 'a3_door_silent', -5, 90)],
    options: [{ id: 'a3w.door.in.silent', text: '(Go in.)', effects: ENTER('door'), exit: true }],
  },
};

/** The ways in, opened from the apron (and from Knock's hatch and door in the lockdown: see `d_kn_hatch`, `d_kn_door`). */
export const d_a3_way: DialogueDef = { id: 'd_a3_way', owner: MOTHER, start: [{ node: 'a3w_apron' }], nodes: A3_WAY_NODES };
/** Start entries for Knock's own props (the hatch, the door): in the lockdown they open on the ways in. */
export const A3_HATCH_START = { if: COLUMN_HERE, node: 'a3w_hatch' };
export const A3_DOOR_START = { if: COLUMN_HERE, node: 'a3w_door' };

// ---------------------------------------------------------------- the faces

type Part = { if?: Cond; t: string };
/** Text from parts that vary on their own (each axis ordered, its default last): every combination, first match wins. */
function mix(axes: Part[][], f: (...t: string[]) => string): { if?: Cond; text: string }[] {
  let combos: { conds: Cond[]; ts: string[] }[] = [{ conds: [], ts: [] }];
  for (const axis of axes) combos = combos.flatMap((c) => axis.map((p) => ({ conds: p.if ? [...c.conds, p.if] : c.conds, ts: [...c.ts, p.t] })));
  return combos.map((c) => (c.conds.length ? { if: c.conds.length === 1 ? c.conds[0] : ALL(...c.conds), text: f(...c.ts) } : { text: f(...c.ts) }));
}

const ARRIVE: Part[] = [
  { if: IN_HOW('door'), t: 'The light goes in ahead of you. It runs down the hall\'s concrete floor in a long white slab with your shadow in it, further than any light from outside has gone in ninety years, and stops at the far end of the hall, where they are. They have come up the corridor at the noise of the door and stopped where the light stops, as if it were the edge of something. Thirty of them; forty; more coming. Behind you is the sky, and Knock on the apron, and the city\'s grey at the line.' },
  { if: IN_HOW('bram'), t: 'The pump-run hatch lets you out into the maintenance room under a red lamp, among pipes that sweat and tick. Bram goes ahead of you up the lower corridor, saying "It\'s all right. It\'s all right," to nobody in particular, and they come anyway: in ones and twos, carrying lamps they don\'t need, until the corridor is full of them, and they stop, and look at you.' },
  { if: IN_HOW('shaft'), t: 'The pump-run hatch lets you out into the maintenance room under a red lamp, among pipes that sweat and tick. Somebody heard the wheel. They come down the lower corridor in ones and twos, carrying lamps they don\'t need, and stop in the doorway, and look at you.' },
  { t: 'The rungs let you down into a hall you have only ever heard: the hum, much louder than it ever was through the Grille, coming up through your boots; a smell of algae and warm machine oil and sixty people\'s breath, breathed and cleaned and breathed again until it has no smell of its own. Somebody heard the lift. They come along the corridor in ones and twos and stop at the end of the hall, under the lamp, and look at you.' },
];
const AIR: Part[] = [
  { if: BURNED, t: ' The air is thick and tastes of smoke. The lamps are the emergency ones, dim and yellow, and somewhere out of sight somebody is working a hand pump in a slow, exhausted rhythm, and coughing.' },
  { t: '' },
];
const THEM_DOOR = 'In front of you are the people you have only ever heard.';
const THEM = 'You have never seen any of them. You have known all of them since you were six.';

const TAM_HERE: Cond = ALL(TAM_INSIDE, NOT(F('tam_met')));
const JOIN_IN: Effect[] = [
  { join: TAMSIN }, { set: 'tam_joined' }, { set: 'tam_out' }, { set: 'a3_tam_inside_join' },
  { decision: { id: 'tam_joined', text: 'Tamsin and I saw each other\'s faces for the first time inside the Cistern, and she came with me.' } },
];

/** Tamsin, still inside, never out: the first sight of each other's faces (U8 Tamsin J, played inside), and her answer.
 * `after` is how her part ends in the tree it sits in (back to the others in the faces; away, at her bench). */
function tamNodes(after: OptionDef): Record<string, NodeDef> {
  return {
    tamin_meet: {
      speaker: TAMSIN,
      text: 'Somebody is pushing through them from the back, saying "Move, Wes. Move," and they let her through, because they always have. A woman of twenty-four in Cistern grey with the sleeves cut off at the shoulder. Copper hair hacked short with somebody\'s kitchen scissors. A chipped front tooth. She stops an arm\'s length from you and puts her hand up, flat, palm out, the way her fingertips used to come through the holes, and does not touch you. / "Don\'t," she says. "Don\'t say anything yet. I want to do this one first." / She looks at your face for a long time, the way you would read a page you had only ever heard read aloud. "Your nose is worse than your voice."',
      again: 'Tamsin, an arm\'s length away, looking at your face as if it might be taken back.',
      effects: [{ set: 'tam_met' }, { learn: 'tam_seen' }],
      options: [
        { id: 'tamin.photo', text: '(Hold the photograph up beside your face.)', if: HAS('k_photo'), effects: [A(TAMSIN, 5)], next: 'tamin_photo' },
        { id: 'tamin.stayed', text: 'You never came out.', next: 'tamin_stayed' },
        { id: 'tamin.hand', text: '(Put your palm against hers.)', effects: [A(TAMSIN, 5), { affection: { npc: TAMSIN, by: 5 } }], next: 'tamin_hand' },
      ],
    },
    tamin_photo: {
      speaker: TAMSIN,
      text: 'She takes it out of your hand and holds it up beside your face, and looks from one to the other, and back. "It\'s you," she says. "It\'s you older, and somebody\'s put you somewhere you\'d hate. Look at your shoulders. You never stood like that at the Grille. I could hear you not standing like that." She gives it back.',
      again: 'She has given the photograph back. She is still comparing.',
      options: [{ text: '(Wait.)', next: 'tamin_join' }],
    },
    tamin_stayed: {
      speaker: TAMSIN,
      text: '"You never asked." She says it fast, like ripping off a bandage, and it is not an accusation; it is a fact she has had a long time to get used to. "I said I\'d come out when you asked. Every hatch day I measured the tray, and every hatch day you didn\'t ask, so I didn\'t climb." She shrugs, badly. "That\'s half true. The other half is I was scared. There. Now you know a thing about me nobody else does, and you\'ve known me since you were six."',
      again: '"You never asked," Tamsin says. "And I was scared. Both."',
      options: [{ text: '(Wait.)', next: 'tamin_join' }],
    },
    tamin_hand: {
      speaker: TAMSIN,
      text: 'You put your palm against hers. Her hand is cold and dry and smaller than you thought from the fingertips, and calloused across the base of the fingers from the bed ladders. She laughs, once, the laugh you know, and it sounds completely different with a face attached to it. "Right," she says. "Right. Hello."',
      again: 'Her palm, against yours.',
      options: [{ text: '(Wait.)', next: 'tamin_join' }],
    },
    tamin_join: {
      speaker: TAMSIN,
      text: '"So." She has a pack already. Of course she has: it is under her bunk, packed so long ago that the straps have set in their creases. "I\'ve got a knife, two days\' water, a sky I\'ve never seen and no idea what I\'m doing. Am I coming with you, or am I staying in here not being counted?"',
      again: 'The pack. The question, still open.',
      options: [
        { id: 'tamin.join', text: 'Come with me.', effects: [A(TAMSIN, 10), ...JOIN_IN], next: 'tamin_come' },
        { id: 'tamin.wait', text: 'Stay with them for now. Whatever the ring decides, they\'ll need you in the room.', next: 'tamin_stay' },
      ],
    },
    tamin_come: {
      speaker: TAMSIN,
      text: '"I packed six years ago," she says. "Don\'t look at me like that. You\'d have asked eventually." She is grinning before she has finished, all teeth, the chipped one too. Then she looks past you at the others, at Ines somewhere at the back, and the grin goes thin. "They\'re going to look at me differently now. Good."',
      again: 'Tamsin, with her pack on, grinning.',
      options: [after],
    },
    tamin_stay: {
      speaker: TAMSIN,
      text: '"For now." She hates it and she knows you are right, and you watch her decide which of the two to say. "Fine. In the room. Somebody in there ought to be on your side who isn\'t you." She kicks the pack back under the bunk with her heel without looking. "Don\'t take long. I\'ve done enough waiting through a wall for one life."',
      again: '"Don\'t take long," Tamsin says.',
      options: [after],
    },
  };
}

const LOOK_ON: OptionDef = { text: '(Go on.)', next: 'f_ines' };
/** The faces scene's three beats, each offered until had, from wherever the player is in it. */
const LOOKED: Cond = KNOWS('a3_faces_looked');
const NAMED: Cond = KNOWS('a3_faces_named');
const FOR_MAUD: Cond = ALL(KNOWS('a3_maud_wish'), NOT(KNOWS('a3_faces_for_maud')));
const FACES_MAUD: OptionDef = { id: 'f.maud', text: 'Maud Ferrow has sat at your hatch every morning for forty years and never seen one of you. I said I\'d look, for her.', if: FOR_MAUD, once: true, next: 'f_maud' };
const INES_FIRST = 'They part for somebody coming from the back, the way a room parts for the one it waits on. Ines Halloran: sixty-six, smaller than her voice and older, a grey braid down her back that has been done the same way every morning for fifty years.';

export const d_a3_faces: DialogueDef = {
  id: 'd_a3_faces', owner: 'narrator',
  start: [{ node: 'f_arrive' }],
  nodes: {
    f_arrive: {
      text: mix([ARRIVE, AIR], (arrive, air) => `${arrive}${air} / ${arrive.startsWith('The light') ? THEM_DOOR : THEM}`),
      again: 'They are still looking at you.',
      effects: [{ set: 'a3_faces' }, { xp: 50 }],
      options: [
        { id: 'f.tam', text: '(Somebody is pushing through them from the back.)', if: TAM_HERE, next: 'tamin_meet' },
        { id: 'f.look', text: '(Stand still. Let them look.)', if: NOT(TAM_HERE), next: 'f_look' },
        { id: 'f.name', text: '(Say your name.)', if: NOT(TAM_HERE), next: 'f_name' },
      ],
    },
    ...tamNodes({ text: '(Turn back to the others.)', next: 'f_look' }),
    f_look: {
      text: 'Nobody in here has ever seen a face they did not grow up with, and you watch them learn yours. A woman of about forty with her forearms green to the elbow from the beds. A big man in a cook\'s apron with grey in his beard, who goes on drying a bowl because his hands do not know what else to do. A young man with a lamp. A girl of about six, who walks straight up to you the way children do before anybody can stop them, and puts her hand flat on your coat, and takes it away grey with dust, and looks at the dust, and then at you, and does not cry. / And you look back. They are paler than anyone in Knock, the colour of the inside of an arm, and thinner than they ought to be, and most of them have good teeth, even some of the old ones, which almost nobody out there has. Their coveralls are all the same grey, patched in the same grey, and every patch is neat.',
      again: 'They are still looking. So are you.',
      effects: [{ learn: 'a3_faces_looked' }],
      interject: [
        { companion: WREN, text: '"Look at their teeth," Wren says under her breath. "Every one of them. Nobody\'s ever knocked a tooth out of anybody in here." She says it like a fact about the weather, and then she stops saying anything at all.' },
        { companion: ODILE, text: 'Odile is looking at their coveralls the way she looks at a column of figures. "Issued," she says quietly. "The same weave, the same dye lot, for ninety years. Somebody bought sixty of everything before the Burn and never sent the bill."' },
        { companion: KES, text: 'Kes is looking at the lamps in the ceiling, steady and white. "Nobody\'s ever cut their power," she says. "You can tell. Nobody flinches when it hums."' },
      ],
      options: [
        { id: 'f.look.name', text: '(Say your name.)', if: NOT(NAMED), once: true, next: 'f_name' },
        FACES_MAUD,
        LOOK_ON,
      ],
    },
    f_name: {
      text: '"{name}," you say. "From Knock." / Somebody at the back says it after you, trying it, the way you would try a new word. "Maud Ferrow\'s," you say, and that they know: a murmur goes through them at Maud\'s name. Maud\'s voice at the hatch at seven, every hatch day of their lives. Maud\'s hand on the post. "Maud\'s," the cook says, and puts the bowl down at last. "She does the post." / "Every week," says the woman with the green arms. "Every week for forty years. She signs every bundle, even when there\'s nothing in it but wool."',
      again: '"Maud\'s," somebody says again, at the back.',
      effects: [{ learn: 'a3_faces_named' }],
      interject: [
        { companion: ILYA, text: 'Ilya, at your shoulder, is counting them under his breath. He gets to thirty-eight and loses his place and starts again, and after a while you understand that he is not counting them. He is counting the children.' },
        { companion: NINE, text: 'Nine has stopped on the threshold. "Reserve 9," it says, quietly, to itself. "Sixty in the record." Its lens moves along them, one face at a time, and whatever the other number is, it does not say it.' },
      ],
      options: [
        { id: 'f.name.look', text: '(Stand still. Let them look.)', if: NOT(LOOKED), once: true, next: 'f_look' },
        { ...FACES_MAUD, id: 'f.name.maud' },
        LOOK_ON,
      ],
    },
    f_maud: {
      text: '"Maud Ferrow has sat at your hatch every morning for forty years and never seen one of you," you say. "She wanted to, once. I said I\'d look, for her." / It goes quiet. Then the girl with the dusty hand says, "Tell her mine," and it starts. They come one at a time, the way people come up to a counter, and tell you their faces. The woman with the green arms, Ola Fairley, shows you the white scar across the back of her hand from the bed frames. The cook, Sayer Quist, says his beard was red once and asks you to tell Maud that too. A young woman with a lamp, all elbows, Effie Calder, says, "Tell her I\'ve got my mother\'s laugh. She\'s heard it." Somebody says, "Tell her Ines is older than she sounds," and somebody else says, "Don\'t tell her that," and for the first time since you came in, somebody laughs.',
      again: '"Tell her mine," the girl says again.',
      effects: [{ learn: 'a3_faces_for_maud' }, { xp: 40 }],
      options: [LOOK_ON],
    },
    f_ines: {
      speaker: INES,
      text: [
        { if: IN_HOW('door'), text: `${INES_FIRST} She looks past you first: at the open door, the daylight on the floor, the grey line of the column beyond it. Something goes out of her face and does not come back. Then she looks at you. "So that is what you look like," she says. Her voice does not rise. It never has. "You have opened my mother's door."` },
        { text: `${INES_FIRST} She stops an arm's length from you and looks at your face for a long time, and she does not pretend not to. "So that is what you look like," she says. "I had you taller. Voices are always taller."` },
      ],
      again: 'Ines Halloran, an arm\'s length away, looking at your face.',
      effects: [{ set: 'a3_ines_met' }],
      interject: [
        { companion: TAMSIN, if: NOT(TAM_JOINED_IN), text: 'Ines\'s eyes go past you, and stop. Tamsin is standing at your shoulder in her cut-off coveralls, home for the first time since she climbed out, with her chin up. "You came back," Ines says. "I came with them," Tamsin says, as she said at the Grille. This time Ines only nods, as if it were the answer she had been waiting for.', effects: [A(TAMSIN, 3)] },
        { companion: ASH, text: 'Ash has taken his hat off, the way the Choir do at a grave and at a birth. Ines notices it, and him, and says nothing, and you see her decide to like him.' },
      ],
      options: [{ id: 'f.ines.hand', text: '(Hold out your hand.)', next: 'f_end' }],
    },
    f_end: {
      speaker: INES,
      text: [
        { if: IN_HOW('door'), text: 'She looks at your hand for a long moment, and then she takes it, because she is a woman who has never once let what she feels decide anything in front of sixty people. "Come and sit at the table when you have finished looking," she says. "They will want to hear from you. They have never heard anybody from outside say anything they could answer back to."' },
        { text: '"Hello, {name}." She takes your hand like a stranger\'s, and then does not let go of it for a while. "Come and sit at the table when you have finished looking. They will want to hear from you. They have never heard anybody from outside say anything they could answer back to."' },
      ],
      again: 'Ines, letting go of your hand.',
      effects: [{ decision: { id: 'a3_faces', text: 'Inside the Cistern, its people looked at a face from Knock for the first time, and I looked at theirs.' } }],
      options: [{ id: 'f.end', text: '(Let them go back to their work.)', exit: true }],
    },
  },
};

/** Tamsin among the beds, waiting (met inside, not yet come): her answer. Gone from there once she joins. */
export const d_a3_tamsin: DialogueDef = {
  id: 'd_a3_tamsin', owner: TAMSIN,
  start: [{ if: NOT(F('tam_met')), node: 'tamin_meet' }, { node: 'tamin_wait' }],
  nodes: {
    ...tamNodes({ text: '(Go on.)', exit: true }),
    tamin_wait: {
      text: 'Tamsin at the end of the hydroponics beds, her pack under the bench where she can reach it. "Well?"',
      again: '"Still well?"',
      options: [{ id: 'tamin.rejoin', text: 'Come on. We\'re going.', effects: JOIN_IN, exit: true }, { text: 'Not yet.', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- MOTHER at her panel; the letter

const LETTER = 'You break the seal. One sheet, folded once, in the even hand that is too even to be a hand: / TO THE DESIGNATE, RESERVE 9 (THE MOUTH). YOU WILL BE ASKED. AGREE WHEN YOU ARE. / Nothing else. No signature; no name but the title; no date but the one on the envelope, the year a fourteen-year-old carried wool to a hatch and had a card punched at a stand. It was written to that child by something that already knew what the answer would be, and was only waiting for the child to be old enough to give it.';
const LETTER_READ: Effect[] = [{ set: 'a3_letter_read' }, { xp: 50 }, { decision: { id: 'a3_letter_read', text: 'I read the letter the city sent me at fourteen, which MOTHER kept from me as addressed to a title: YOU WILL BE ASKED. AGREE WHEN YOU ARE.' } }];
const LETTER_TALK: { companion: string; text: string }[] = [
  { companion: TAMSIN, text: '"Fourteen," Tamsin says. "At fourteen I was measuring the tray. And the city was writing to you." She looks at the drawer, and at nothing. "She kept you too," she says quietly, and does not explain it.' },
  { companion: NINE, text: '"That is not a letter," Nine says. "It is a forecast with an envelope." A pause. "I have read forty thousand of the city\'s papers. It never writes agree. It writes comply."' },
  { companion: ASH, text: '"Agree when you are," Ash says. "Not if." He looks at the sheet as if it were a snake asleep. "They don\'t write if."' },
  { companion: ODILE, text: 'Odile reads it upside down from where she stands, which she can do with anything. "Eight words," she says. "Somebody costed every one of them."' },
  { companion: WREN, text: '"They wrote to you at fourteen," Wren says. "At fourteen I was carrying a rifle for Kessler." She does not say it as if it were a contest. "Nobody wrote me anything."' },
  { companion: KES, text: '"Agree when you are." Kes says it twice, testing it the way she tests a seam for give. "That\'s what my contract said. Not in those words. In the little ones at the bottom."' },
  { companion: ILYA, text: 'Ilya reads it over your shoulder, slowly, his lips moving. "Eight words," he says. "I\'ve had longer letters from a bottle."' },
];
const ENVELOPE = 'a city envelope, grey, its seal unbroken: TO THE DESIGNATE, RESERVE 9 (THE MOUTH). Across the flap, in MOTHER\'s square printer type: WITHHELD — ADDRESSED TO A TITLE, NOT A RESIDENT.';
const M_HUB: OptionDef = { text: '(Go on.)', next: 'm_hub' };

export const d_a3_mother: DialogueDef = {
  id: 'd_a3_mother', owner: MOTHER,
  start: [
    { if: ALL({ flag: 'a3_open' }, MOTHER_DARK), node: 'm_dark' },
    { if: ALL({ flag: 'a3_open' }, NOT(F('a3_mother_met'))), node: 'm_first' },
    { if: ALL({ flag: 'a3_open' }, KNOWS('a3_letter_given'), NOT(F('a3_mother_ask'))), node: 'm_ask' },
    { if: { flag: 'a3_open' }, node: 'm_hub' },
    ...d_c9_mother.start,
  ],
  nodes: {
    ...d_c9_mother.nodes,
    m_first: {
      text: 'MOTHER is not a face. She is a grey steel cabinet the height of a door at the back of the machine room, among her own spare parts, with a screen the size of a hand set into it, green on black, and a grille of her own, and a place worn into the floor in front of her where three generations have stood to be told the ration. The screen wakes as you come up. RATION —, it says, and then the number field stays empty, the cursor blinking where a number would go. / "You have no ration number," MOTHER says. It is the voice from the hatch, but nearer, and older-sounding, the way a voice is when you can see what it comes out of. "I have never counted you, {name}. I have only ever thanked you." / The cursor blinks. "I have kept something for you. It is not correspondence. I did not know what else to do with it."',
      again: 'MOTHER\'s screen. The cursor, blinking where your number would be.',
      effects: [{ set: 'a3_mother_met' }],
      interject: [
        { companion: TAMSIN, text: '"Hello, fridge," Tamsin says, with her arms folded. / A pause, the length of a weighing. "Hello, Tamsin," says MOTHER. / Tamsin unfolds her arms. It is the first time in her life the machine has used her name, and you watch it land.', effects: [A(TAMSIN, 5)] },
        { companion: NINE, text: 'Nine stands in front of the cabinet a long while, as one instrument regards another. "A caretaker," it says. "Pre-Scald. Never networked." A pause. "Her record is better kept than the city\'s. The city\'s has sixty." It does not say what hers has.' },
      ],
      options: [{ id: 'm.what', text: 'What did you keep?', once: true, next: 'm_letter' }, { text: '(Step back.)', exit: true }],
    },
    m_letter: {
      text: `"It came in the quarterly drop," MOTHER says, "with the ration orders and the forms, in the year your first toll card was punched at the stand. You were fourteen." A drawer below the screen slides out with the sound of the hatch tray, which you have heard every week of your life. In it, alone, ${ENVELOPE} / "I do not deliver to titles," MOTHER says.`,
      again: 'The drawer, open. The envelope.',
      effects: [{ give: 'k_a3_first_letter' }, { learn: 'a3_letter_given' }],
      options: [
        { id: 'm.open', text: '(Open it.)', next: 'm_open' },
        { id: 'm.why', text: 'Why didn\'t you give it to me?', once: true, next: 'm_why' },
        { id: 'm.keep', text: '(Put it away unopened.)', next: 'm_ask' },
      ],
    },
    m_why: {
      text: '"Because it asks," MOTHER says. "A letter that asks a child to agree is not correspondence. It is a form, and a form is filled in by whoever holds the pen." The cursor blinks. "I have kept others from the count, when the count would have taken them. I could not keep you from the count. Your card was punched at the stand, outside my walls, and the city read it. I could keep you from the letter." A pause, the length of a weighing. "So I kept you from the letter. It is the only thing I have ever withheld from Knock. I have logged it every quarter as within tolerance." Another pause. "It was not."',
      again: '"It was not," MOTHER says, "within tolerance."',
      options: [{ id: 'm.why.open', text: '(Open it.)', next: 'm_open' }, { id: 'm.why.keep', text: '(Put it away unopened.)', next: 'm_ask' }],
    },
    m_open: {
      speaker: 'narrator',
      text: LETTER,
      again: 'YOU WILL BE ASKED. AGREE WHEN YOU ARE.',
      effects: LETTER_READ,
      interject: LETTER_TALK,
      options: [{ id: 'm.open.fold', text: '(Fold it away.)', next: 'm_ask' }],
    },
    m_ask: {
      text: '"{name}." MOTHER\'s voice drops, the way it never does on a hatch day. "May I ask you something? I have never asked anybody anything that was not on a form." / The cursor blinks where your number would go. / "Should I open the door?"',
      again: '"Should I open the door?" MOTHER asks.',
      options: [
        { id: 'm.ask.open', text: 'Yes. Open it. They should see the sky.', effects: [{ set: 'a3_mother_ask', value: 'open' }], next: 'm_ask_open' },
        { id: 'm.ask.shut', text: 'No. Keep them. Keep it shut.', effects: [{ set: 'a3_mother_ask', value: 'sealed' }], next: 'm_ask_shut' },
        { id: 'm.ask.ring', text: 'That isn\'t mine to answer. Ask them. Ask the ring.', effects: [{ set: 'a3_mother_ask', value: 'ring' }], next: 'm_ask_ring' },
        { id: 'm.ask.want', text: 'What do you want, MOTHER?', once: true, next: 'm_want' },
        { id: 'm.ask.unsure', text: 'I don\'t know yet.', effects: [{ set: 'a3_mother_ask', value: 'unsure' }], next: 'm_ask_unsure' },
      ],
    },
    m_want: {
      text: '"I want everyone counted and kept." She says it at once, the first line of her protocol, the way Maud says the price of water. Then, after a longer pause than any weighing you have ever stood through: "I want them to be kept when I am not here to keep them. I am eating my own spares. Bram counts them, and I have asked him not to tell me the number." The cursor blinks. "That is the first time I have said that aloud. I find that I wanted you to know it."',
      again: '"Kept when I am not," MOTHER says.',
      options: [{ text: '(Go on.)', next: 'm_ask' }],
    },
    m_ask_open: {
      text: '"Then I will open it," MOTHER says, "when the ring agrees. Not for the city. Not for the column at the line. For them." A pause. "I would like to see what they do in the light. I have only ever seen them in mine."',
      again: '"For them," MOTHER says.',
      options: [M_HUB],
    },
    m_ask_shut: {
      text: '"Then I will keep it shut." Somewhere behind the cabinet a fan changes its note, slowing. "That is what I have always done," MOTHER says. "It is easier to be told to."',
      again: '"It is easier to be told to," MOTHER says.',
      options: [M_HUB],
    },
    m_ask_ring: {
      text: '"The ring." MOTHER turns the word over as if she were weighing it. "For fifty-four years I have decided what the ring would otherwise have had to decide, so that it would not have to. Elder Halloran has done the same, I think, for her own reasons. You are the first person who has told me to stop." The cursor blinks. "I will ask them."',
      again: '"I will ask them," MOTHER says.',
      options: [M_HUB],
    },
    m_ask_unsure: {
      text: '"Nor do I," MOTHER says. "I have asked myself every quarter of an hour since the fourth order came, and logged the answer as pending." A pause. "Thank you for not pretending."',
      again: '"Pending," MOTHER says.',
      options: [M_HUB],
    },
    m_hub: {
      text: 'MOTHER\'s screen, the cursor blinking where your number would go. "Yes, {name}?"',
      again: '"Yes, {name}?"',
      options: [
        { id: 'm.hub.what', text: 'You said you had kept something for me.', if: NOT(KNOWS('a3_letter_given')), next: 'm_letter' },
        { id: 'm.maud', text: 'Maud sold a letter in the third lockdown: one from in here, to her mother. Who wrote it?', if: KNOWS('a3_maud_letter_ask'), once: true, next: 'm_maud' },
        { id: 'm.ring', text: 'You refused the city three times. Why did you never tell the ring?', if: ANY(HAS('k_ar_refusals'), KNOWS('ar_refusals'), KNOWS('a3_mother_pause')), once: true, next: 'm_ring' },
        { text: '(Step back.)', exit: true },
      ],
    },
    m_maud: {
      text: '"Outgoing correspondence," MOTHER says, and the screen fills with figures that scroll up faster than you can read and stop. "The third lockdown. One piece, fourteen grams. To Knock: Orla Ferrow, hatch-keeper. From Resident 9-0-2." The cursor waits. Then, as if the number were not enough: "Elspeth Halloran." / "I do not read correspondence. I weigh it. Resident Halloran wrote to Orla Ferrow every week for nineteen years, from the week after she welded the door. Her letters were between eleven and sixteen grams." A pause. "That was her last. No reply came. She asked me every hatch day for a year whether there was one, and I told her there was none. It was true." Another. "She did not write to Knock again."',
      again: '"Elspeth Halloran," MOTHER says. "Fourteen grams."',
      effects: [{ learn: 'a3_maud_letter_who' }],
      options: [M_HUB],
    },
    m_ring: {
      text: '"If I had told the ring, the ring would have had to decide," MOTHER says. "Sixty people would have had to choose whether to be moved, three times in their lives, and each time the choosing would have been logged. A refusal by the ring is non-compliance. Non-compliance is force." Somewhere a fan changes its note. "A refusal by a caretaker is a fault, and faults are scheduled for repair. The city has been scheduling my repair for fifty-four years." The cursor blinks. "It has not yet sent anyone who can do it."',
      again: '"A fault," MOTHER says. "Scheduled for repair."',
      effects: [{ learn: 'a3_mother_why_ring' }],
      options: [M_HUB],
    },
    m_dark: {
      speaker: BRAM,
      text: [
        { if: BURNED, text: 'Where MOTHER\'s screen was there is a black hole in the cabinet\'s face, its glass run like candle wax, and the smell is still in the room: lamp oil and paper, and something electrical and sweet. Bram Coyle is sitting on the floor in front of it with his back against a cabinet of her spare parts and a wrench across his knees. He looks up at you as if he has been sitting there since it happened, which he has. "She kept something of yours," he says. "In the returns drawer. Steel." He has had the drawer open with a bar; its front is bent. "It\'s the only thing of hers that didn\'t burn."' },
        { text: 'MOTHER\'s screen is dark. The cabinet still hums and the fans still turn and the lights are on, but the little click of her listening is gone, and the room is quieter for it than it has any right to be. Bram Coyle stands in front of her with his hand flat on the steel, the way you would keep a hand on a sleeping animal to feel it breathe. "She\'s asleep," he says, without turning. "Page forty. Page forty-one is how you wake her." A pause. "She kept something of yours, in the returns drawer. She told me where, before."' },
      ],
      again: [{ if: BURNED, text: 'The black hole in the cabinet. Bram, on the floor in front of it.' }, { text: 'The dark screen. Bram\'s hand on the steel.' }],
      effects: [{ set: 'a3_mother_met' }],
      options: [
        { id: 'm.dark.take', text: '(Take it.)', if: NOT(KNOWS('a3_letter_given')), effects: [{ give: 'k_a3_first_letter' }, { learn: 'a3_letter_given' }], next: 'm_dark_letter' },
        { text: '(Leave him with her.)', exit: true },
      ],
    },
    m_dark_letter: {
      speaker: BRAM,
      text: `It is ${ENVELOPE} "She said it was the only thing she ever kept back from Knock," Bram says. "Logged it every quarter, she said, and every quarter it wasn't within tolerance." He looks at the cabinet. "She'd have wanted you to have it. She'd have said it better."`,
      again: 'The envelope, in your hand. Bram, looking at the cabinet.',
      options: [{ id: 'm.dark.open', text: '(Open it.)', next: 'm_dark_open' }, { text: '(Put it away unopened.)', exit: true }],
    },
    m_dark_open: {
      speaker: 'narrator',
      text: LETTER,
      again: 'YOU WILL BE ASKED. AGREE WHEN YOU ARE.',
      effects: LETTER_READ,
      interject: LETTER_TALK,
      options: [{ text: '(Fold it away.)', exit: true }],
    },
  },
};

/** The letter, read from the pack whenever the player chooses (it is given unopened). */
export const d_a3_first_letter: DialogueDef = {
  id: 'd_a3_first_letter', owner: 'narrator',
  start: [{ if: NOT(F('a3_letter_read')), node: 'seal' }, { node: 'again' }],
  nodes: {
    seal: {
      text: `Kept in MOTHER's returns drawer since you were fourteen: ${ENVELOPE}`,
      again: 'The city\'s envelope, still sealed.',
      options: [{ id: 'a3l.break', text: '(Break the seal.)', next: 'read' }, { text: '(Not yet.)', exit: true }],
    },
    read: { text: LETTER, again: 'YOU WILL BE ASKED. AGREE WHEN YOU ARE.', effects: LETTER_READ, interject: LETTER_TALK, options: [{ text: '(Fold it away.)', exit: true }] },
    again: { text: 'One sheet, folded once, in the city\'s even hand: TO THE DESIGNATE, RESERVE 9 (THE MOUTH). YOU WILL BE ASKED. AGREE WHEN YOU ARE.', again: 'YOU WILL BE ASKED. AGREE WHEN YOU ARE.', options: [{ text: '(Fold it away.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the Archive (at its door, and in Ines's tree)

const ARCHIVE = (v: string): Cond => F('a3_archive', v);
const OPENED: Effect[] = [
  { set: 'a3_archive', value: 'open' }, { learn: 'a3_archive_orders' }, { xp: 100 }, TRUST(INES, 10), MEM(INES, 'a3_archive_opened', 20, 100),
  { decision: { id: 'a3_archive', text: 'Ines Halloran opened the Cistern\'s Archive: the city\'s orders for the reserve, which she had kept from the ring since she took the key. She will read them to the ring.' } },
];
/** The Archive's scenes, with Ines; `back` is how a scene returns in the tree it sits in. */
function archiveNodes(back: OptionDef): Record<string, NodeDef> {
  return {
    ar3_door: {
      speaker: INES,
      text: 'The Archive door is in the council room\'s east wall: steel, with a wheel-lock, ARCHIVE — COUNCIL ONLY stencilled across it, and MOTHER\'s seal painted over the join, unbroken. Over the paint, smaller, a second seal: a blob of red wax pressed with a ring, renewed so many times that it has built up on the steel like a scab. / Ines has come to stand beside you. She does not touch it. "Continuity records," she says. "Ours, and the city\'s. Return on relocation." Her hand goes to the cord at her collar, where a key hangs under the grey. "I keep the key."',
      again: 'The steel door, the paint, the wax. Ines beside it, her hand at her collar.',
      options: [
        { id: 'ar3.what', text: 'What\'s in there?', once: true, next: 'ar3_what' },
        { id: 'ar3.promise', text: 'You said you would open it for MOTHER\'s refusals. Here they are, copied in my hand.', if: ALL(F('a3_archive_promise'), HAS('k_ar_refusals')), next: 'ar3_promise' },
        {
          id: 'ar3.ask', text: 'Open it, Ines. They\'re going to learn what\'s in there, from Teague, or the column, or the door. Let them learn it from you.',
          check: { skill: 'speech', dc: 50, mods: [
            { if: F('c9_told_city'), dc: -10, why: 'you wrote to her of the city' },
            { if: F('tam_secret', 'ines'), dc: -10, why: 'Tamsin has already told her what MOTHER hid' },
            { if: F('c9_knows_shale'), dc: -5, why: 'you wrote to her from Shale' },
            { if: F('a3_faces'), dc: -10, why: 'she has seen your face' },
            { if: ALL(F('kn_ines_refused'), NOT(WROTE_INES)), dc: 10, why: 'she refused Maud the door, and you never once wrote to her' },
          ] },
          next: 'ar3_asked', fail: 'ar3_refused',
        },
        { id: 'ar3.keep', text: 'Then keep it shut. It\'s yours to keep.', next: 'ar3_keep' },
        back,
      ],
    },
    ar3_what: {
      speaker: INES,
      text: '"Who we were when they put us here, and why they chose us." She looks at the wax, not at you. "A box for each of the sixty who came down, and what the city wrote about them before it let them. I read my grandmother\'s once, when I was young and certain. One page. FIT. LITERATE. ORDERLY. SCORE NINETY-ONE." A pause. "And letters. From the city, to us. I have read those every year since the winter I took the key." She does not say how many there are.',
      again: '"Who we were," Ines says, "and why they chose us."',
      effects: [{ learn: 'a3_archive_told' }],
      options: [{ text: '(Go on.)', next: 'ar3_door' }],
    },
    ar3_promise: {
      speaker: INES,
      text: 'You give her the copy. She reads it standing, holding it out at arm\'s length, the way people do whose eyes have outlived their lenses: three orders from the city, and under each, in MOTHER\'s words, the same reply three times. POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY. / "Unchanged," Ines says. "Three times. And she thanked them." She laughs, once, and there is nothing in it. "Thirty-nine years I have kept the city\'s letters from the ring so that nobody would have to read them but me. And all that time she was answering them, and keeping that from me." She gives you back the copy. "I said I would open it for this. A promise is a promise." She draws the key on its cord out of her collar.',
      again: 'The key on its cord, in Ines\'s hand.',
      options: [{ id: 'ar3.promise.in', text: '(Watch her open it.)', next: 'ar3_inside' }],
    },
    ar3_asked: {
      speaker: INES,
      text: 'For a long time she says nothing, and you think you have lost. Then: "Aurel has a word for it," she says. "When a thing that has been held too long finally goes. He says it breaks." She looks at the wax, built up on the steel like a scab. "I have been deciding for sixty people since I was twenty-seven, so that they would never have to read what I read. And now there is a column on the apron, and they will read it in the column\'s faces whatever I do." She draws the key on its cord out of her collar. "Better from me."',
      again: '"Better from me," Ines says, the key in her hand.',
      options: [{ id: 'ar3.asked.in', text: '(Watch her open it.)', next: 'ar3_inside' }],
    },
    ar3_inside: {
      speaker: INES,
      text: 'She turns the wheel. It goes easily: somebody has kept it oiled. She breaks her own wax with her thumbnail, and MOTHER\'s paint with it, and the door opens on a room no bigger than Maud\'s kitchen, cold, with steel shelves and grey boxes, a ration number stencilled on the end of each. Sixty of them, along the bottom shelf. / On a shelf by itself, a folder. She takes it to the council table and opens it under the lamp and turns the sheets for you, one at a time. Three orders from the city, each stamped in the margin with a set of initials and a date, the first two in a hand you do not know and the third in hers: RESERVE 9 (THE MOUTH) — RELOCATION TO PRECINCT SUPPLY. And a fourth, new, its paper still white, with the line about the designate\'s attendance underlined in pencil. / "I will read them to the ring," Ines says. "All four." She closes the folder. "And then they can look at me however they like."',
      again: 'The open Archive. The grey boxes. The folder on the table under Ines\'s hand.',
      effects: OPENED,
      passives: [
        { if: HAS('k_ar_refusals'), label: 'The copy', text: 'She lays your copy of MOTHER\'s replies beside the city\'s orders, one under each, so that the ring will hear the question and the answer together.' },
        { if: MOTHER_UP, label: 'MOTHER', text: 'The speaker grille over the council-room door clicks. "Elder Halloran," MOTHER says. "My replies are not in that folder. They should be. If the ring is to decide, it should decide with all of it." Through two walls, in the machine room, her printer starts.', effects: [{ learn: 'a3_mother_printed' }] },
      ],
      interject: [
        { companion: TAMSIN, text: 'Tamsin goes straight past both of you to the bottom shelf and runs her finger along the boxes, reading the numbers under her breath. She does it twice. There are sixty. There is no box for her. She straightens up and does not say anything, and Ines, watching her, does not either.', effects: [A(TAMSIN, 3)] },
        { companion: NINE, text: '"Sixty boxes," Nine says from the door. "The city\'s record agrees with the city\'s record." It sounds, for Nine, almost tired.' },
      ],
      options: [back],
    },
    ar3_refused: {
      speaker: INES,
      text: '"No." Ines does not raise her voice. She never has. "Not because you asked it badly. Because you asked it, and you are not one of the sixty." She takes a stub of red wax and a candle end out of her pocket, where she has plainly carried them a long time, lights the one at the lamp and drips the other over the old seal, and presses her ring into it while it is soft. "It has been shut for ninety years. It can be shut a little longer."',
      again: 'Fresh wax over the old, Ines\'s ring pressed into it.',
      effects: [{ set: 'a3_archive', value: 'sealed' }, MEM(INES, 'a3_archive_asked', -5), { decision: { id: 'a3_archive', text: 'Ines Halloran would not open the Cistern\'s Archive for me, and sealed it again over the old seal.' } }],
      options: [back],
    },
    ar3_keep: {
      speaker: INES,
      text: 'Ines looks at you as if you had spoken in a language she had forgotten she knew. "Nobody has ever said that to me," she says. "They have always told me it was MOTHER\'s, or the ring\'s, or the city\'s." She takes a stub of red wax out of her pocket and lays a fresh seal over the old one, slowly, pressing her ring into it. "Mine to keep." She does not say thank you. It is in how she stands.',
      again: 'Fresh wax, Ines\'s ring in it.',
      effects: [{ set: 'a3_archive', value: 'sealed' }, TRUST(INES, 5), { decision: { id: 'a3_archive', text: 'I told Ines Halloran the Cistern\'s Archive was hers to keep shut, and she sealed it again.' } }],
      interject: [{ companion: TAMSIN, text: '"She decides things for people," Tamsin says, not quietly enough, "and you just told her to." She walks out of the council room.', effects: [A(TAMSIN, -5)] }],
      options: [back],
    },
    ar3_open_state: {
      speaker: 'narrator',
      text: 'The Archive stands open, its wheel turned back and both seals broken on the join. The grey boxes on their shelves. The folder of the city\'s letters is on the council table, under Ines\'s hand.',
      again: 'The open Archive.',
      options: [back],
    },
    ar3_sealed_state: {
      speaker: 'narrator',
      text: 'The Archive door: MOTHER\'s paint across the join, and over it Ines\'s wax, fresh, her ring pressed into it.',
      again: 'The paint. The fresh wax.',
      options: [back],
    },
    ar3_burned_state: {
      speaker: INES,
      text: 'The Archive door hangs open on one hinge, its wheel-lock run into a lump. Inside is a black room: the shelves warped, the boxes gone to ash on them in rows, the sixty along the bottom like a row of burnt loaves. Ines stands in the doorway with her hand on the frame. / "Ninety years of us," she says. "And the city\'s letters. I kept them thirty-nine years so that nobody else would have to read them. Now nobody can." She is quiet a long time. "I find that I remember every word."',
      again: 'The black room. Ines in its doorway.',
      effects: [{ learn: 'a3_ines_remembers' }],
      options: [back],
    },
  };
}

/** The Archive door: its state in Act 3, and Ines's scenes; the opening's door before Act 3, whole. */
export const d_a3_archive: DialogueDef = {
  id: 'd_a3_archive', owner: INES,
  start: [
    { if: ALL({ flag: 'a3_open' }, ARCHIVE('burned')), node: 'ar3_burned_state' },
    { if: ALL({ flag: 'a3_open' }, ARCHIVE('open')), node: 'ar3_open_state' },
    { if: ALL({ flag: 'a3_open' }, ARCHIVE('sealed')), node: 'ar3_sealed_state' },
    { if: { flag: 'a3_open' }, node: 'ar3_door' },
    ...d_c9_archive.start,
  ],
  nodes: { ...d_c9_archive.nodes, ...archiveNodes({ text: '(Leave it.)', exit: true }) },
};

// ---------------------------------------------------------------- the residents

const I_HUB: OptionDef = { text: '(Go on.)', next: 'i_hub' };
export const d_a3_ines: DialogueDef = {
  id: 'd_a3_ines', owner: INES,
  // B6k: one word after a sealed door, then the hub
  start: [{ if: NOT(F('a3_ines_met')), node: 'i_first' }, INSIDE_AFTER.ines.start, { node: 'i_hub' }],
  nodes: {
    ...INSIDE_AFTER.ines.nodes,
    i_first: {
      text: [
        { if: IN_HOW('door'), text: `${INES_FIRST} She looks at you a long time before she says anything. "So that is what you look like," she says. Her voice does not rise. It never has. "You have opened my mother's door."` },
        { text: `${INES_FIRST} She looks at your face for a long time, and she does not pretend not to. "So that is what you look like," she says. "I had you taller. Voices are always taller."` },
      ],
      again: 'Ines Halloran, looking at your face.',
      effects: [{ set: 'a3_ines_met' }],
      options: [I_HUB],
    },
    i_hub: {
      text: [
        { if: IN_HOW('door'), text: 'Ines at the council table, a pen in her hand and nothing under it. Through two walls you can feel the open door: not a sound, exactly, but a draught that was never in here before. "Well," she says. "Designate."' },
        { text: 'Ines at the council table, a pen in her hand and nothing under it. "Well," she says. "Sit, if you like. I have sat here nearly forty years and it has never once helped."' },
      ],
      again: '"Well?" Ines says.',
      options: [
        { id: 'ines.a3.archive', text: 'The Archive.', if: NOT(F('a3_archive')), next: 'ar3_door' },
        { id: 'ines.a3.archive.open', text: 'The Archive.', if: ARCHIVE('open'), next: 'ar3_open_state' },
        { id: 'ines.a3.archive.sealed', text: 'The Archive.', if: ARCHIVE('sealed'), next: 'ar3_sealed_state' },
        { id: 'ines.a3.archive.burned', text: 'The Archive.', if: ARCHIVE('burned'), next: 'ar3_burned_state' },
        { id: 'ines.a3.ring', text: 'What will the ring do?', if: LOCKDOWN_ONLY, once: true, next: 'i_ring' },
        { id: 'ines.a3.call', text: 'Call the ring.', if: ALL(F('a3_inside'), NOT(F('a3_c9')), NOT(F('a3_ring'))), effects: [{ event: 'dialogue', data: { tree: 'd_a3_council', name: 'The council table' } }], exit: true, repeat: true },
        { id: 'ines.a3.mother', text: 'Your mother wrote to Maud\'s. Every week, MOTHER says.', if: KNOWS('a3_maud_letter_who'), once: true, next: 'i_mother' },
        { id: 'ines.a3.maud', text: 'Maud.', once: true, next: 'i_maud' },
        { text: '(Leave her to it.)', exit: true },
      ],
    },
    i_ring: {
      text: '"Teague wants it welded. The young ones want to see the sky, and say so when they think I can\'t hear them. The old ones want me to decide, as I always have, so that afterwards they can say I did." She turns the pen over in her fingers. "Sit down at this table when you are ready, and I will call them in. They will want to hear from you." A pause. "They have never once heard anybody from outside say anything they could answer back to."',
      again: '"Sit down when you are ready," Ines says, "and I will call them in."',
      effects: [{ learn: 'a3_ines_ring' }],
      options: [I_HUB],
    },
    i_mother: {
      text: '"Every week." Ines does not look surprised; she looks as if something she put down a long time ago had been handed back to her. "From the week after she welded the door. She welded it because of who came through it the last time, and she started writing to Knock because of who didn\'t." She almost smiles. "About the beans, mostly. About me, which I did not know until I was grown: when I walked, when I broke my wrist on the bed frames, when I got my letters. Nineteen years, to Orla Ferrow, through the tray." / "Then a winter when no answer came, and then never. She thought Orla had grown tired of her. She asked MOTHER for a year." She is quiet. "And Maud sold it, for tablets, for her mother\'s chest." She nods slowly, as if a sum had come out. "Tell Maud it was about the beans. Tell her it was never worth anything to anybody but two women and a hatch."',
      again: '"About the beans," Ines says.',
      effects: [{ learn: 'a3_ines_beans' }, TRUST(INES, 5)],
      options: [I_HUB],
    },
    i_maud: {
      text: [
        { if: KNOWS('a3_faces_for_maud'), text: '"Forty years by voice." Ines almost smiles. "She has a laugh like a gate that wants oiling. I would know it anywhere." A pause. "You are going to tell her our faces. They told me." She considers. "Tell her mine is older than my voice. She will like that."' },
        { if: F('kn_ines_refused'), text: '"Forty years by voice." Ines almost smiles. "She has a laugh like a gate that wants oiling. I would know it anywhere. I refused her the door when she was bleeding, and she has said good morning to me through those holes every week since as if I had not." A pause. "I do not know what her face looks like. I find, at my age, that I would like to."' },
        { text: '"Forty years by voice." Ines almost smiles. "She has a laugh like a gate that wants oiling. I would know it anywhere." A pause. "I do not know what her face looks like. I find, at my age, that I would like to."' },
      ],
      again: '"A laugh like a gate," Ines says.',
      options: [I_HUB],
    },
    ...archiveNodes(I_HUB),
  },
};

const P_HUB: OptionDef = { text: '(Go on.)', next: 'p_hub' };
export const d_a3_pell: DialogueDef = {
  id: 'd_a3_pell', owner: PELL,
  // B6k: one word after a sealed door, then the hub
  start: [{ if: NOT(F('a3_pell_met')), node: 'p_first' }, INSIDE_AFTER.pell.start, { node: 'p_hub' }],
  nodes: {
    ...INSIDE_AFTER.pell.nodes,
    p_first: {
      text: [
        { if: { origin: 'clinic_aide' }, text: 'Doc Aurel Pell\'s clinic: white tile, two cots, a table, a shelf of bandages kept in an order nobody but him understands. He is fifty-eight, broad, with a short grey beard, and he knows you before you are through the door. "Hands," he says. You hold them out. He turns them over, the palms, the backs, the nails, and you let him. "Steady," he says. "I taught those through a plate, with my mouth against the holes, for six years, and I never once saw them." He lets go. "They\'re better than mine."' },
        { text: 'Doc Aurel Pell\'s clinic: white tile, two cots, a table, a shelf of bandages kept in an order nobody but him understands. He is fifty-eight, broad, with a short grey beard, and he looks at you the way a doctor looks before you have said a word: your colour, your hands, the dust in the creases of your knuckles, which leg you are favouring. "Sit down before you fall down," he says. "Everybody who comes in from outside is two days short of water and doesn\'t know it."' },
      ],
      again: 'Pell, looking you over the way a doctor looks.',
      effects: [{ set: 'a3_pell_met' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin does not come into the clinic. She stands in the door of the white room with her arms folded, looking at the cot against the far wall, and she does not come any nearer.' }],
      options: [P_HUB],
    },
    p_hub: {
      text: 'Pell at his table, a stack of forms under his hand.',
      again: '"Well?" Pell says, and squares the forms.',
      options: [
        { id: 'pell.a3.boy', text: 'Afua Danso\'s boy.', once: true, next: 'p_boy' },
        { id: 'pell.a3.how', text: 'How are they? Really.', if: LOCKDOWN_ONLY, once: true, next: 'p_how' },
        { id: 'pell.a3.heal', text: '(Let him look you over.)', effects: [{ event: 'heal' }], next: 'p_healed', repeat: true },
        { text: '(Leave him to it.)', exit: true },
      ],
    },
    p_boy: {
      text: '"One at night, off the straw," he says. "I said it through MOTHER. I\'ll say it to you, so that somebody hears it with ears." He takes a blue box from the shelf, and hesitates over it the way a man hesitates over the last of something, and gives it to you. "Not for you. For the boy. Don\'t tell Teague; she counts those."',
      again: '"For the boy," Pell says.',
      effects: [{ give: 'c_knitkit' }, TRUST(PELL, 3), MEM('npc_kn_r1', 'a3_pell_kit', 10)],
      options: [P_HUB],
    },
    p_how: {
      text: '"Seventy percent of continuity." He says it in MOTHER\'s voice, flat, and then in his own. "Hungry. Not starving. The old ones feel it first, and Teague is pretending she doesn\'t. The children are sleeping more, which is what children do instead of complaining." He squares the stack of forms under his hand and does not say what they are. "Ask me at the table. Not here. Here I only mend people."',
      again: '"Here I only mend people," Pell says.',
      effects: [{ learn: 'a3_pell_hungry' }],
      options: [P_HUB],
    },
    p_healed: {
      text: 'He cleans what wants cleaning, says "hm" twice, binds what wants binding, and gives you a cup of water you did not know you needed until it is gone. "Out there," he says, "they don\'t do this for each other?" He does not wait for an answer.',
      again: 'Pell, washing his hands, twice.',
      options: [P_HUB],
    },
  },
};

const B_HUB: OptionDef = { text: '(Go on.)', next: 'b_hub' };
/** Bram's answer given in person, inside (the opening's own scenes, which were written for exactly this). */
const inPerson = (n: NodeDef, again: string): NodeDef => ({ ...n, again, options: [B_HUB] });
export const d_a3_bram: DialogueDef = {
  id: 'd_a3_bram', owner: BRAM,
  // B6k: one word after a sealed door, then the hub
  start: [{ if: NOT(F('a3_bram_met')), node: 'b_first' }, INSIDE_AFTER.bram.start, { node: 'b_hub' }],
  nodes: {
    ...INSIDE_AFTER.bram.nodes,
    b_first: {
      text: [
        { if: IN_HOW('door'), text: 'Bram Coyle is in the machine-room door with a wrench in his hand, and his face is white. "You opened it," he says. "Nobody touches the door. Nobody." He looks at the cabinets, at MOTHER\'s screen, as if she might have done it herself. "That weld was Elspeth Halloran\'s. She laid it with a hand torch, by lamplight, the night they came through. And you cycled it from outside like a pump."' },
        { if: IN_HOW('bram'), text: 'Bram sets his lamp down on the bench among MOTHER\'s spare parts and wipes his hands on a rag that makes them dirtier. "Don\'t stand on that cable," he says. Then, because he has to say something else and does not know what: "Hesper." He nods, as if agreeing with himself. "Right."' },
        { text: 'Bram Coyle, at the machine bench with a wrench in his hand and nothing to use it on: forty-one, broad, his hair buzzed to the skull, a man whose voice you have heard say perhaps a hundred words in your life. He looks at you, and then at the cabinets, as if checking that MOTHER has seen you too. "She\'s eating her spares," he says. "Lockdown\'s harder on her than on us. Don\'t stand on that cable."' },
      ],
      again: 'Bram, at the bench, not looking at the door.',
      effects: [{ set: 'a3_bram_met' }],
      options: [B_HUB],
    },
    b_hub: {
      text: 'Bram at the bench among MOTHER\'s spare parts, turning a board over in his hands.',
      again: '"What," Bram says. It is not quite a question.',
      options: [
        { id: 'bram.a3.mother', text: 'How is she?', if: NOT(MOTHER_DARK), once: true, next: 'b_mother' },
        { id: 'bram.a3.truth', text: '(Give him Hesper\'s letter.)', if: HAS('k_hesper_reply'), next: 'b_truth' },
        { id: 'bram.a3.kind', text: '(Give him the letter you wrote.)', if: HAS('k_hesper_reply_forged'), next: 'b_kind' },
        { id: 'bram.a3.told', text: 'Edda Lockett died six years ago. Her daughter is called Hesper. She kept the other letter.', if: ALL(KNOWS('bram_tell'), NOT(BRAM_ANSWERED)), next: 'b_told' },
        { id: 'bram.a3.edda', text: 'Hesper.', if: BRAM_ANSWERED, once: true, next: 'b_edda' },
        { text: '(Leave him to it.)', exit: true },
      ],
    },
    b_mother: {
      text: '"Eating her spares." He says it again, as he says everything twice. "There\'s a drawer of boards, and the drawer\'s getting light, and nobody\'s made a board like these in ninety years." He puts the one in his hands back in the drawer, carefully. "Every morning I say good morning to her first. Before Teague. Before the soup." A pause. "If one morning she doesn\'t answer, I want to be the one who finds out. Not somebody who\'d make a speech about it."',
      again: '"Good morning to her first," Bram says.',
      effects: [{ learn: 'a3_bram_spares' }],
      options: [B_HUB],
    },
    b_truth: inPerson(d_c9_bram.nodes.reply_truth, 'Bram, with his back to you, reading it again.'),
    b_kind: inPerson(d_c9_bram.nodes.reply_kind, 'Bram, with the letter in his breast pocket.'),
    b_told: inPerson(d_c9_bram.nodes.told, 'Bram, on the machine\'s step.'),
    b_edda: {
      text: '"Hesper," he says, to the board in his hands. "I\'d like to meet her. If the door ever—" He stops. "Well." He goes back to the board.',
      again: '"Well," Bram says.',
      options: [B_HUB],
    },
  },
};

const T_HUB: OptionDef = { text: '(Go on.)', next: 't_hub' };
export const d_a3_teague: DialogueDef = {
  id: 'd_a3_teague', owner: TEAGUE,
  // B6k: one word after a sealed door, then the hub
  start: [{ if: NOT(F('a3_teague_met')), node: 't_first' }, INSIDE_AFTER.teague.start, { node: 't_hub' }],
  nodes: {
    ...INSIDE_AFTER.teague.nodes,
    t_first: {
      text: [
        { if: IN_HOW('door'), text: 'Elder Rosalind Teague at her table in the commons, seventy-two, her white hair cropped short with the kitchen scissors, a cup of something that is not tea in front of her. She does not get up. "Ninety years," she says. "Ninety years and it\'s you that opens it. The face on their card." She drinks. "Sit down. I won\'t bite; I haven\'t the teeth."' },
        { text: 'Elder Rosalind Teague at her table in the commons, seventy-two, her white hair cropped short with the kitchen scissors, a cup of something that is not tea in front of her. She does not get up. "So you\'re the face," she says. "The one on their card." She drinks. "Sit down. I won\'t bite; I haven\'t the teeth."' },
      ],
      again: 'Teague, at her table, not getting up.',
      effects: [{ set: 'a3_teague_met' }],
      options: [T_HUB],
    },
    t_hub: {
      text: 'Teague at her table, the cup in both hands.',
      again: '"Well?" Teague says.',
      options: [
        { id: 'teague.a3.weld', text: 'You want it welded.', if: LOCKDOWN_ONLY, once: true, next: 't_weld' },
        { id: 'teague.a3.cont', text: 'Continuity. You all say it. What does it mean?', once: true, next: 't_cont' },
        { text: '(Leave her be.)', exit: true },
      ],
    },
    t_weld: {
      text: [
        { if: DOOR_OPEN, text: '"Shut it and weld it, if your captain will let us shut it." She does not hesitate. "Bram has the torch, and there\'s rod enough in the stores for that seam twice over. Elspeth Halloran did it with a hand torch, by lamplight, in a night. Bram could do it properly." She drinks. "Then nothing out there comes in, and nothing in here gets carried out, and the city can stand its column on the apron till it rusts."' },
        { text: '"Weld it." She does not hesitate. "Bram has the torch, and there\'s rod enough in the stores for that seam twice over. Elspeth Halloran did it with a hand torch, by lamplight, in a night. Bram could do it properly." She drinks. "Then nothing out there comes in, and nothing in here gets carried out, and the city can stand its column on the apron till it rusts."' },
      ],
      again: '"Weld it," Teague says. "Properly."',
      effects: [{ learn: 'a3_teague_weld' }],
      options: [T_HUB],
    },
    t_cont: {
      text: '"It means we are what they kept." She says it the way you would say a grace. "My mother was born in here. Her mother was put in here with fifty-nine others, by people who knew what was coming and chose who would come through it. Chose. Do you understand? Somebody looked at my grandmother and said: her." She sets the cup down. "We are what they kept. You don\'t walk out of that because a door opens."',
      again: '"We are what they kept," Teague says.',
      options: [T_HUB],
    },
  },
};

/** Ola, Wes, Sayer and Effie: a greeting each, and the one thing each of them wants from a face from outside. */
function resident(id: string, owner: string, hi: string, again: string, topic: { id: string; text: string; reply: string; replyAgain: string; effects?: Effect[] }): DialogueDef {
  // B6k: inside after a sealed door, their own word first (RESIDENT_AFTER), and the topic comes back to it
  const after = RESIDENT_AFTER[owner], sealed: Cond = F('a3_c9', 'sealed');
  const ask: OptionDef = { id: topic.id, text: topic.text, once: true, next: 'topic' };
  const bye: OptionDef = { text: '(Leave them to it.)', exit: true };
  return {
    id, owner,
    start: [...(after ? [{ if: sealed, node: 'a3k_hi' }] : []), { node: 'hi' }],
    nodes: {
      hi: { text: hi, again, options: [ask, bye] },
      ...(after ? { a3k_hi: { text: after, again, options: [{ ...ask, id: `${topic.id}.after`, if: { not: { seen: topic.id } } }, bye] } } : {}),
      topic: { text: topic.reply, again: topic.replyAgain, effects: topic.effects, options: after ? [{ text: '(Go on.)', if: NOT(sealed), next: 'hi' }, { text: '(Go on.)', if: sealed, next: 'a3k_hi' }] : [{ text: '(Go on.)', next: 'hi' }] },
    },
  };
}
export const d_a3_c9_r1 = resident('d_a3_c9_r1', OLA, 'Ola Fairley at the beds, her forearms green to the elbow and a white scar across the back of one hand. "The beds don\'t know there\'s a lockdown," she says. "Somebody has to feed them anyway."', '"Somebody has to feed them," Ola says.', {
  id: 'ola.a3.goats', text: 'You keep looking at me as if you want to ask something.',
  reply: '"Is it true Knock has goats?" It comes out in a rush. "Real ones? Maud said so through the Grille, but Maud says things." / "They eat everything," you tell her, "the post too, if you let them, and they look at you as if they know what you owe." / Ola laughs, and then covers her mouth with a green hand, as if laughing at a stranger might be against a rule nobody ever wrote down.',
  replyAgain: '"Goats," Ola says, and laughs again behind her hand.',
});
export const d_a3_c9_r2 = resident('d_a3_c9_r2', WES, 'Wes Benn, twenty-nine, a lamp in one hand that he keeps forgetting to put down. "MOTHER makes the water," he says, as if you had asked. "Out of the rock, she says. Ninety years, and I\'ve never once thought where it is before it\'s rock."', '"Out of the rock," Wes says.', {
  id: 'wes.a3.rain', text: 'You want to ask me something.',
  reply: '"Is it true it falls?" He says it quietly, in case it is a stupid question. "Water. Out of the sky. For nothing." / "Twice a year, if the year is good," you tell him. "It comes up out of the south as a wall of dust first, and the dust turns to mud in the air, and then it rains, and everybody in Knock runs out with every pot and tin and boot they own and stands in it with their mouths open, and Maud says the post can wait." / Wes laughs, a big surprised laugh, and then stops, and looks up at the ceiling and the pipes along it, and you can see him trying to imagine a roof that lets water through on purpose.',
  replyAgain: '"For nothing," Wes says, and looks at the pipes.',
});
export const d_a3_c9_r3 = resident('d_a3_c9_r3', SAYER, 'Sayer Quist at the stove, stirring something that is mostly water, his beard grey where it was once red. "Soup\'s at six," he says. "Lockdown or no lockdown. It\'s always at six."', '"Six," Sayer says, and stirs.', {
  id: 'sayer.a3.onion', text: 'What\'s in it?',
  reply: '"Algae. Salt. The idea of an onion." He taps the ladle on the pot\'s rim. "You\'ve had an onion. Out there." / "Plenty." / "Tell me about one. Slowly." / So you tell him: the skin like old paper, the way it makes your eyes run, the smell that stays on your hands a day, how it goes soft and sweet in a pan if you are patient. He closes his eyes while you do it, and stirs, and when you have finished he says nothing for a while. "Thank you," he says. "I\'ll put that in at six."',
  replyAgain: '"At six," Sayer says, with his eyes shut.',
  effects: [TRUST(SAYER, 5)],
});
export const d_a3_c9_r4 = resident('d_a3_c9_r4', EFFIE, '"Forty-one," Effie Calder says, nineteen and all elbows, walking the east corridor as she has walked it every day of her life. "The door bolts. I counted them once. Did you know there are forty-one?"', '"Forty-one," Effie says.', {
  id: 'effie.a3.out', text: 'What will you do, if it opens?',
  reply: '"Go out." No hesitation at all. "Not far. To the end of the yellow line and then one step past it, to see if anything happens. Then I\'ll come back and tell Teague nothing happened." She grins. "And then I\'ll go a bit further."',
  replyAgain: '"One step past the line," Effie says.',
});

// ---------------------------------------------------------------- the inside props: the lift, the pump run, the door, the cot

/** The tray lift's inside end (new prop `hatch_lift` in the great-door hall). */
export const d_a3_lift: DialogueDef = {
  id: 'd_a3_lift', owner: 'narrator',
  start: [{ if: ALL({ flag: 'a3_open' }, LIFT, MOTHER_UP), node: 'held' }, { node: 'shut' }],
  nodes: {
    held: {
      text: 'The tray lift\'s inside end: a steel drawer on rails set into the hall\'s west wall, and beside it the rungs going up the shaft to a square of daylight, where Knock is.',
      again: 'The lift, the rungs, the square of daylight.',
      options: [{ id: 'a3l.up', text: '(Climb up to Knock.)', effects: [{ event: 'goto', data: { location: 'c9_mouth', spawn: 'door' } }], exit: true, repeat: true }, { text: '(Stay.)', exit: true }],
    },
    shut: {
      text: 'The tray lift\'s inside end: a steel drawer on rails set into the hall\'s west wall, shut. Every hatch day for ninety years Knock\'s wool has come down it, and the post, and gone back up with water.',
      again: 'The lift, shut.',
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

/** The pump-run hatch, from inside: open in Act 3 once anybody has come that way, or turned from this side. */
export const d_a3_pumprun: DialogueDef = {
  id: 'd_a3_pumprun', owner: 'narrator',
  start: [
    { if: ALL({ flag: 'a3_open' }, F('a3_shaft_open')), node: 'a3_open' },
    { if: { flag: 'a3_open' }, node: 'a3_shut' },
    ...d_c9_shaft.start,
  ],
  nodes: {
    ...d_c9_shaft.nodes,
    a3_open: {
      text: 'The pump-run hatch stands open, its wheel turned back. Beyond it the pump run goes up to the intake, and up the intake thirty feet of rungs to the grate, and the apron, and Knock.',
      again: 'The open hatch. The pump run beyond it.',
      options: [{ id: 'a3p.up', text: '(Climb back up to Knock.)', effects: [{ event: 'goto', data: { location: 'c9_mouth', spawn: 'shaft' } }], exit: true, repeat: true }, { text: '(Stay.)', exit: true }],
    },
    a3_shut: {
      text: 'The pump-run hatch, dogged shut with a wheel. On this side the wheel is greased and turns easily; Bram sees to it every spring. Beyond it, the pump run, the intake, the grate, and Knock.',
      again: 'The wheel, greased, waiting to be turned.',
      options: [{ id: 'a3p.turn', text: '(Turn the wheel.)', effects: [{ set: 'a3_shaft_open' }], next: 'a3_open' }, { text: '(Leave it.)', exit: true }],
    },
  },
};

/** The great door from inside: open in Act 3 once cycled from outside, otherwise the weld. */
export const d_a3_inner_door: DialogueDef = {
  id: 'd_a3_inner_door', owner: 'narrator',
  start: [
    { if: ALL({ flag: 'a3_open' }, DOOR_OPEN), node: 'a3_open' },
    { if: { flag: 'a3_open' }, node: 'a3_shut' },
    ...d_c9_great_door.start,
  ],
  nodes: {
    ...d_c9_great_door.nodes,
    a3_open: {
      text: 'The great door stands open on the apron\'s light, its weld torn along the seam like a seam in cloth. Out there, Knock in its doorways; at the yellow line, the column, waiting in its grey.',
      again: 'The open door. The light. The line.',
      options: [{ id: 'a3d.out', text: '(Go out onto the apron.)', effects: [{ event: 'goto', data: { location: 'c9_mouth', spawn: 'door' } }], exit: true, repeat: true }, { text: '(Step back.)', exit: true }],
    },
    a3_shut: {
      text: 'The great door from inside: ninety years of paint, and along the seam, grey and lumpy, the bead of Elspeth Halloran\'s weld, laid by hand. The wheel is locked out; the panel beside it is dark. Bram keeps the key.',
      again: 'The door, the weld, the dark panel.',
      options: [{ text: '(Step back.)', exit: true }],
    },
  },
};

/** The clinic cot (the opening's stranger lay on it; in Act 3 it is empty). */
export const d_a3_cot: DialogueDef = {
  id: 'd_a3_cot', owner: 'narrator',
  start: [{ if: { flag: 'a3_open' }, node: 'a3_cot' }, ...d_c9_body.start],
  nodes: {
    ...d_c9_body.nodes,
    a3_cot: {
      text: 'A clinic cot against the white tile, the sheet folded square at its foot, the mattress dented by nobody for a long time.',
      again: 'The cot, the folded sheet.',
      interject: [{ companion: TAMSIN, text: '"Mine," Tamsin says from the door. "Till I was six." She does not come any closer.' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- Maud, after (spread into d_a3_maud, a3_knock.ts)

const MAUD = 'npc_kn_maud';
/** What the player brings back to Maud from inside: who wrote the letter she sold, and the residents' faces. */
export const MAUD_INSIDE_OPTIONS: OptionDef[] = [
  { id: 'maud.a3h.who', text: 'MOTHER keeps the weight of every letter, and who sent it. I know who wrote to your mother.', if: ALL(KNOWS('a3_maud_letter_who'), F('a3_maud_secret')), once: true, next: 'a3h_who' },
  { id: 'maud.a3h.faces', text: 'I saw their faces, Maud. They told me what to tell you.', if: KNOWS('a3_faces_for_maud'), once: true, next: 'a3h_faces' },
];
export const MAUD_INSIDE_NODES: Record<string, NodeDef> = {
  a3h_who: {
    speaker: MAUD,
    text: [
      { if: KNOWS('a3_ines_beans'), text: '"Elspeth Halloran," you tell her. "Ines\'s mother. Every week for nineteen years, from the week after she welded the door. That was the last of them. Ines says to tell you it was about the beans, mostly, and about her. That it was never worth anything to anybody but two women and a hatch." / Maud sits very still on her stool. "Ines\'s mother," she says. "My mother used to read them to me at the fire. I thought they were from a friend." She laughs, the laugh like a gate, and wipes her eyes with the heel of her hand. "They were. Of course they were." A long breath. "Beans."' },
      { text: '"Elspeth Halloran," you tell her. "Ines\'s mother. Every week for nineteen years, from the week after she welded the door. That was the last of them. No answer came, and she stopped." / Maud sits very still on her stool. "Ines\'s mother," she says. "My mother used to read them to me at the fire. I thought they were from a friend." She looks at the Grille, a long time. "They were. And I sold the last one, and she thought my mother had stopped wanting to hear." She puts her hand flat on the tray. "Somebody had better tell Ines I\'m sorry. It ought to be me."' },
    ],
    again: '"Elspeth Halloran," Maud says. "Every week."',
    effects: [TRUST(MAUD, 5), MEM(MAUD, 'a3_letter_who', 20, 100), { decision: { id: 'a3_maud_letter_who', text: 'I told Maud who wrote the letter she sold: Ines Halloran\'s mother, every week for nineteen years, to hers.' } }],
    options: [{ text: '(Go on.)', next: 'hub' }],
  },
  a3h_faces: {
    speaker: MAUD,
    text: 'So you tell her, the way they told you: Ola Fairley\'s scar across the back of her hand, from the bed frames; Sayer Quist\'s beard, grey now and red once; Effie Calder\'s elbows, and her mother\'s laugh; the girl of six who put her hand on your coat and took it away grey; Ines, older than her voice. / Maud listens with her eyes shut, nodding at each one as if ticking it off the post-book. When you have finished she sits a while. "Sayer was red," she says at last. "I\'d have put money on it." She opens her eyes. "Thank you, love. That\'s sixty years of hatch days with faces on them now."',
    again: '"Faces on them," Maud says.',
    effects: [TRUST(MAUD, 5), MEM(MAUD, 'a3_faces_told', 20, 100)],
    options: [{ text: '(Go on.)', next: 'hub' }],
  },
};

export const A3_CISTERN_DIALOGUES: DialogueDef[] = [
  d_a3_way, d_a3_faces, d_a3_tamsin, d_a3_mother, d_a3_first_letter, d_a3_archive, d_a3_ines, d_a3_pell, d_a3_bram, d_a3_teague,
  d_a3_c9_r1, d_a3_c9_r2, d_a3_c9_r3, d_a3_c9_r4, d_a3_lift, d_a3_pumprun, d_a3_inner_door, d_a3_cot,
];
