import type { LetterDef } from '../../engine/world/letters';
import type { Cond, Effect } from '../../engine/world/logic';
import { ALLY, ALLY_NEEDS, CALLA_FREE, CALLA_HELD, LN_PEOPLE, MASON_EXILED, MASON_LIVES, ORDER_READ, SARR_ALIVE, type Ally } from './a3_conds';

/**
 * Act 3's letters (B6c, beat 19): the muster, and the copy of MOTHER's replies sent home. Spread into LETTERS
 * (`world/letters.ts`). A muster letter is offered once the order has been read, to someone the player has met, only with
 * that ally's own need (an owed debt, local standing, a membership: `ALLY_NEEDS`, never a summed score), and only until the
 * ally is called; an ally has alternates by recipient where the person to ask depends on what happened (who leads the Rust
 * Dogs, who is alive at Openfield, who leads the Shift). The reply comes after a duration, the time a letter takes, never a
 * deadline, and sets `a3_ally_<ally>`: the ally is ready to come when the player calls (Knock's door, the Spire's close),
 * so nothing they do happens behind the player's back.
 *
 * `let_ines_refusals` is offered from Act 2 on, once the copy of the Cistern's replies is held (the player keeps it: the
 * letter carries a transcription). Ines's reply is the Archive promise (`a3_archive_promise`).
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (19, the muster table) and "As built" → B6c.
 */

const F = (flag: string, eq?: string | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });

interface Muster { ally: Ally; to: string; id?: string; topic: string; if?: Cond; days: number; text: string; reply: string }

/** A muster letter: offered after the order, with the ally's need, to a living recipient, until the ally is called. */
function muster(m: Muster): LetterDef {
  const effects: Effect[] = [{ memory: { npc: m.to, tag: 'a3_asked_home', valence: 5, strength: 60 } }];
  return {
    id: m.id ?? `let_a3_${m.ally}`, to: m.to, topic: m.topic, days: m.days, once: true,
    if: ALL(ORDER_READ, ALLY_NEEDS[m.ally], NOT(ALLY(m.ally)), NOT({ dead: m.to }), ...(m.if ? [m.if] : [])),
    text: m.text, effects,
    reply: { text: m.reply, effects: [{ set: `a3_ally_${m.ally}` }, { learn: `a3_ally_${m.ally}` }, { trust: { npc: m.to, by: 5 } }] },
  };
}

/** Who leads the Rust Dogs now: Wren's people in Shale, Kessler at the overpass, or Vasha after her coup. */
const DOGS_WREN: Cond = F('wren_exodus');
const DOGS_KESSLER: Cond = ALL(NOT(DOGS_WREN), NOT(F('rd_coup')));
const DOGS_VASHA: Cond = ALL(NOT(DOGS_WREN), F('rd_coup'), NOT(F('vasha_dead')));
/** Who to ask at Openfield: the Elder if he is there, Calla if she is free and he is not, else the seed-keeper. */
const MASON_HOME: Cond = ALL(MASON_LIVES, NOT(MASON_EXILED));
const CALLA_ASKS: Cond = ALL(NOT(MASON_HOME), CALLA_FREE);
const DORIA_ASKS: Cond = ALL(NOT(MASON_HOME), NOT(CALLA_FREE), NOT(LN_PEOPLE('removed')), NOT(LN_PEOPLE('relocated')));
const MAREN_HANGED: Cond = F('ks_maren', 'hanged');

export const A3_MUSTER: Muster[] = [
  {
    ally: 'shale', to: 'npc_sh_01', topic: 'Shale, at Knock\'s door', days: 3, if: NOT(ANY(F('ks_ada', 'resigns'), F('ks_ada', 'dead'))),
    text: 'Sheriff — The city has a column camped at Knock by the stand, and an order it will carry out on the Cistern the day I stand at its door. I am coming home to stand there. I would like Shale\'s militia behind me when I do: not to start anything. To be seen. I know what I am asking, and that Shale owes Knock nothing it has not paid.',
    reply: 'Read it twice and showed it to the deputies once. Shale\'s militia doesn\'t ride out to other people\'s doors. It\'ll ride to yours, because Knock\'s water came up our road for forty years and nobody here has forgotten whose it was. Send word when you\'re at the stand and we\'ll come down the track. Don\'t make me sorry. — A. Vey',
  },
  {
    ally: 'dogs', to: 'npc_rd_05', topic: 'Wren\'s people, at Knock\'s door', days: 3, if: DOGS_WREN,
    text: 'Dog-mother — Wren\'s people took Shale\'s word once and it held. I am asking for something back. The city has a column at Knock, waiting for me at the Cistern\'s door. When I am there I would like the pack on the slope above it, where the wardens can count you.',
    reply: 'The pack that walked down with Wren is a pack still, though it sleeps in beds now and argues about the pump rota. We will come up the slope when you are at the door. Nobody will shoot first; I have told them so, which is not the same as them listening. Tell Wren her mother-in-dogs says eat something. — Perpetua',
  },
  {
    ally: 'dogs', id: 'let_a3_dogs_kessler', to: 'npc_rd_01', topic: 'The Dogs, at Knock\'s door', days: 4, if: DOGS_KESSLER,
    text: 'Kessler — The city has a column at Knock, waiting for me at the Cistern\'s door. I want riders on the slope above it when I am there, enough that a polite warden has to count them. You will want paying. Name it.',
    reply: 'Paying is for strangers. You\'ve been at my fire. The Dogs will be on the slope when you\'re at the door, and they\'ll sit their bikes and look ugly, which is what we\'re best at, and if the city wants to make something of it the city can count us first. After, we\'ll talk about what it was worth. — K.',
  },
  {
    ally: 'dogs', id: 'let_a3_dogs_vasha', to: 'npc_rd_02', topic: 'The Dogs, at Knock\'s door', days: 4, if: DOGS_VASHA,
    text: 'Vasha — The city has a column at Knock, waiting for me at the Cistern\'s door. You like to be seen. I am offering you somewhere to be seen: the slope above that door, with the pack behind you, when I am there.',
    reply: 'A city column, sixty people behind a door, and the designate in the middle of it, asking me. I wouldn\'t miss it. We\'ll be on the slope. Don\'t mistake this for friendship; it\'s a better seat than I\'ve had in years. — V.K.',
  },
  {
    ally: 'choir', to: 'npc_of_01', topic: 'The Choir, at Knock and after', days: 4, if: MASON_HOME,
    text: 'Elder — The city means to carry Knock\'s Cistern east on an order, the day I stand at its door. I am going home to stand there. I would like the Choir with me, at the door and after it, under the sky and in the open, as you stood at Openfield.',
    reply: 'Child, the sky keeps no books, so nobody will write down that we came. We will come all the same: to the door when you are at it, and wherever you go after. Some of us will sing, which I am told unnerves wardens. Take care of the ones who have never seen the sky; it is a great deal of sky to see at once. — Mason',
  },
  {
    ally: 'choir', id: 'let_a3_choir_calla', to: 'npc_sh_05', topic: 'The Choir, at Knock and after', days: 4, if: CALLA_ASKS,
    text: 'Sister — The city has an order for Knock\'s Cistern, carried out the day I stand at its door. I am going home to stand there. You know what it is to be carried by an order. I would like the Choir with me, at the door and after.',
    reply: 'I know exactly what it is, and that is why we will come. The Choir will be at the door when you are, and with you after, wherever that is. I am bringing the medicine chest. Doors like that one are opened by people who have been shut in too long, and they come out sick with the light. — Calla',
  },
  {
    ally: 'choir', id: 'let_a3_choir_doria', to: 'npc_of_06', topic: 'The Choir, at Knock and after', days: 4, if: DORIA_ASKS,
    text: 'Keeper — The city has an order for Knock\'s Cistern, carried out the day I stand at its door. I am going home to stand there. Openfield has had a hard season and I have no right to ask. I am asking: the Choir at the door, and after.',
    reply: 'Counted what we have and counted who will walk, and the second number is bigger than the first, which is the Choir all over. We will come to the door when you are at it, and after. Nobody is writing this down. That is rather the point. — Doria, keeper',
  },
  {
    ally: 'wheel', to: 'npc_wh_01', topic: 'The Wheel, on every road', days: 4,
    text: 'Caravan-Mother — I am going home to Knock, where the city has a column waiting at the Cistern\'s door. When I am there, I would like the Wheel near. And after, if it comes to it, I would like word carried ahead of me on every road the Wheel knows.',
    reply: 'The Wheel goes where the roads go, and every road in the Sallow goes past Knock if you are patient. We will be near the door when you are there. After, we will carry whatever word you give us, ahead of you, on every road we have, and we have more roads than the guild has gates. — Sefa',
  },
  {
    ally: 'shift', to: 'npc_hs_02', topic: 'The Shift\'s powder', days: 6, if: NOT(MAREN_HANGED),
    text: 'Maren — I am going home to the Cistern, and then up the Spire\'s steps. I may need what the Shift keeps in its magazine before I am done. I am not asking for men. I am asking for powder, and for you to trust me with it.',
    reply: 'The Shift doesn\'t lend powder. It\'s the only thing we own that the Concern counts. But you stood with us, and I trust you more than I trust the company, which you\'ll say is a low bar. The cases will be waiting for you when you need them, with a man who can wire them if you can\'t. Spend it on something that deserves it. — M. Okafor',
  },
  {
    ally: 'shift', id: 'let_a3_shift_rafe', to: 'npc_hs_03', topic: 'The Shift\'s powder', days: 6, if: MAREN_HANGED,
    text: 'Rafe — I am going home to the Cistern, and then up the Spire\'s steps. I may need what the Shift took out of its magazine before I am done. Not men. Powder.',
    reply: 'They hanged her for less than you\'re asking. Good. The cases will be waiting when you need them, and somebody who knows how to wire them. Bring the whole thing down if you can. She\'d have liked that. — R.A.',
  },
  {
    ally: 'stand', to: 'npc_dk_02', topic: 'Carrick\'s Stand, at the city', days: 3,
    text: 'Connie — The Stand says it owes me. I am calling it in, and not for me. When I go up the Spire\'s steps there may be a night in the city after it that nobody has planned for. I would like Carrick\'s quays kept by the people who work them, whatever happens up the hill.',
    reply: 'Called and answered. The Stand will keep the quays the night you go up, and every night after that it has to: nobody loads, nobody unloads, nobody burns anything they can\'t unburn. Harbour Act or no Harbour Act. Dockers don\'t need telling twice; I only had to tell them once. — Constance Okoye',
  },
  {
    ally: 'boats', to: 'npc_ds_01', topic: 'The shore\'s boats', days: 4,
    text: 'Oona — The Stilts say they owe me boats. I am going up the Spire\'s steps soon, and after that the Reach is going to be loud. I would like Gull Stilts\' people to be part of whatever comes after, not left on the stilts to hear about it.',
    reply: 'Boats were promised and boats you have. When you send, the Stilts will put out for the city with whoever wants to come, which will be most of us, because we have been hearing about things after they happen for ninety years and we are tired of it. Mind your feet on the steps. — Oona',
  },
  {
    ally: 'barges', to: 'npc_nw_12', topic: 'The Wet\'s barges', days: 5,
    text: 'Magda — The Wet\'s bargees say they owe me a run. I would like to call it in after I go up the Spire\'s steps: the Wet\'s people brought down to the city, if they want to come, to be part of whatever comes after.',
    reply: 'The Patience owes you a run, and the Wet owes you more than that. Say when and we\'ll bring down whoever wants to come, which will be more than fit, so we\'ll bring two barges and argue about the second. Never once dull. — Magda',
  },
  {
    ally: 'gangs', to: 'npc_bw_01', topic: 'The chain\'s holders', days: 3,
    text: 'Auntie — When I go up the Spire\'s steps there may be a night in the city after that nobody has planned for. Three crews on one chain is the only thing the Crown has never taken. I would like those three crews to keep their own streets that night, and nothing else.',
    reply: 'Keep our own streets. That\'s the whole of law in Bridgeward, and you\'re the first person ever to ask us to do it on purpose. We\'ll keep them. The Gilt\'ll keep theirs and the Pale theirs and nobody will like it, which is how you know it\'s fair. — S. Holt',
  },
  {
    ally: 'saints', to: 'npc_bw_04', topic: 'The Saints, reading', days: 3,
    text: 'Verity — The girl hears the Ledger. When I go up the Spire\'s steps there may be a night when everyone hears it. If that night comes, I would like the Saints to read first, gently, the way you read to her, before anyone else reads it loudly.',
    reply: 'Gently. Nobody has ever asked us to do anything gently. Yes. If that night comes, the Saints will read first, on every set that listens to the hiss, and we will read the hard lines slowly. She says she will help, and that you are going to be very tired. — V.',
  },
  {
    ally: 'seventeen', to: 'npc_nw_04', topic: 'An assessor of the Wet, reading', days: 6,
    text: 'Assessor — You entered the dam\'s truth in the record at Ashby. I may need someone who can read the city\'s record aloud and be believed, when I go up the Spire\'s steps. I am asking you.',
    reply: 'ENTERED: A REQUEST FROM THE DESIGNATE. ENTERED: ASSESSOR SEVENTEEN ACCEPTS. I have read the dam\'s record aloud once, to its keepers, and the dam did not fall. I will read whatever you put in front of me, every line, at the speed it was written. I am told that is too slow. I have never been told it was wrong. — 17',
  },
];

/** The copy of MOTHER's three replies, sent home: the Archive promise. The copy stays in the pack; the letter carries it out. */
export const LET_INES_REFUSALS: LetterDef = {
  id: 'let_ines_refusals', to: 'npc_c9_01', topic: 'What MOTHER told the city', days: 5, once: true,
  if: ALL({ item: 'k_ar_refusals' }, NOT(F('a3_c9')), NOT(F('a3_archive')), NOT({ dead: 'npc_c9_01' })),
  text: 'Elder — I found MOTHER\'s answers in the city\'s own record, at the top of its Spire: three orders for the Cistern, and three replies, each one a refusal, each one entered NON-COMPLIANT and left on file. I have copied them out for you word for word, because you should not have to take my word for it. She said no three times, Elder. Nobody inside ever knew.',
  effects: [{ memory: { npc: 'npc_c9_01', tag: 'player_wrote_refusals', valence: 10, strength: 90 } }, { trust: { npc: 'npc_c9_01', by: 5 } }],
  reply: {
    text: 'I have read your copy aloud to the ring, which I have never done with a letter. Teague asked to read it herself, and then asked again. If this is true, bring it to the door, and I will open the Archive. I have kept it shut because I believed it was the one thing in here that was ours. If she said no to the city three times, I would like to know what else she kept. — I.H.',
    effects: [{ set: 'a3_archive_promise' }, { learn: 'ines_promised_archive' }],
  },
};

// ---------------------------------------------------------------- B6m: the living on the city's list, warned in the player's own hand

/**
 * B6m: a letter to each keystone still living, from the order's reading until the steps, to someone met whose line the player
 * knows (the docket read in full, the copy in the notebook, or that person's own name decoded). Each says the line word for
 * word and that the list may be read aloud on every radio before the year is out, by the player or by anyone: a warning, not
 * a promise. One letter per person (`a3_warned_<who>`; Sister Calla's has two forms, held or free); the reply, a duration
 * later, counts the warning (`inc a3_warned`), which the readiness act `warned` reads at three. Story notes:
 * story/B6_NOTES_SECRET.md §5 (M7) and "As built" → B6m.
 */
interface Warn { who: string; to: string; id?: string; topic: string; alive: Cond; known: Cond; days: number; text: string; reply: string }
const LIST_KNOWN: Cond = ANY({ knows: 'ar_cast_list' }, { item: 'k_ar_list' });
function warning(w: Warn): LetterDef {
  return {
    id: w.id ?? `a3_warn_${w.who}`, to: w.to, topic: w.topic, days: w.days, once: true,
    if: ALL(ORDER_READ, NOT(F('a3_pnr')), NOT({ knows: `a3_warned_${w.who}` }), NOT({ dead: w.to }), ANY(LIST_KNOWN, w.known), w.alive),
    text: w.text,
    effects: [{ learn: `a3_warned_${w.who}` }, { memory: { npc: w.to, tag: 'a3_warned', valence: 5, strength: 70 } }],
    reply: { text: w.reply, effects: [{ inc: 'a3_warned' }, { trust: { npc: w.to, by: 3 } }] },
  };
}
const NAME = (n: number): Cond => ({ knows: `name${n}_decoded` });
const CALLA_LIVES: Cond = NOT({ dead: 'npc_sh_05' });

export const A3_WARNINGS: Warn[] = [
  {
    who: 'jonah', to: 'npc_sh_02', topic: 'His line on the city\'s list', days: 3,
    alive: ALL(F('jonah_lived'), NOT(F('jonah_dead'))), known: ANY(F('jonah_named'), { lead: 'l_name_jonah' }, NAME(2)),
    text: 'Jonah — There is a list in Meridian, under glass at the top of the Archive Spire, in the city\'s own hand. Your name is the second line: REESE, JONAH — SHALE — DECEASED WITHIN THE MONTH. Somebody has since written VARIANCE beside it, which is the city\'s word for you being alive. Before the year is out that list may be read aloud on every radio in the Reach, by me or by somebody else. I would rather you heard your line from me, in my hand, with the rest of the sentence: it was wrong.',
    reply: 'Read it out to Ada on the office step. She laughed, which I\'ve not heard her do since the spring, then went round the back of the pump house and I heard her be sick, then came back and said, "Well, deputy, you\'d better not die now, it\'d look like you were agreeing with them." I\'m alive. I check most mornings. Thank you for telling me first. If they read it on the radio I\'ll turn it up. — J. Reese',
  },
  {
    who: 'ada', to: 'npc_sh_01', topic: 'Her line on the city\'s list', days: 3,
    alive: NOT(F('ks_ada', 'dead')), known: ANY({ lead: 'l_name_vey' }, NAME(3)),
    text: 'Sheriff — The city keeps a list of twelve names under glass at the top of its Spire. Yours is the third: VEY, ADA — SHALE — RESIGNS; SHALE CONTRACTED. You\'ll know better than I do by now how much of that it got right. Before the year is out the list may be read aloud on every radio in the Reach. I didn\'t want you to hear your own name come out of a box on Mags\'s bar. I wanted you to have it from me first.',
    reply: 'Got it. Read it twice, then put it in the stove, which is what I do with paper that thinks it knows me. Whatever it says, Shale knows whether I signed, and a radio can\'t tell this town a thing about its own sheriff that it didn\'t watch happen. Let them read it. Wherever I am when they do, I\'ll be sitting down. Thank you for the courtesy. Most people who know a thing like that sell it. — A. Vey',
  },
  {
    who: 'kessler', to: 'npc_rd_01', topic: 'His line on the city\'s list', days: 4,
    alive: NOT(F('rd_coup')), known: ANY({ lead: 'l_broadcast_kessler' }, NAME(4)),
    text: 'Kessler — The city keeps a list of twelve names under glass in Meridian. Yours is the fourth: KESSLER — THE OVERPASS — KILLED BY KADE. It\'s a forecast, not a sentence, and some of the others on it have already come out wrong. Before the year is out it may be read aloud on every radio in the Reach. You\'ll want to have heard it before your hall does.',
    reply: 'Read it out at the fire before anybody else could. Some laughed. Not many. It\'s a fair forecast; it\'s how men like me end, by somebody\'s hand, and the city\'s only guessing whose. It won\'t be hers. It won\'t be this year. I\'ve had worse written about me on walls, and spelled better. Obliged. — K.',
  },
  {
    who: 'vasha', to: 'npc_rd_02', topic: 'Her line on the city\'s list', days: 4,
    alive: NOT(F('vasha_dead')), known: NAME(5),
    text: 'Vasha — The city keeps a list under glass in Meridian, twelve names in its own hand. Yours is the fifth: KADE, VASHA — THE OVERPASS, THE SALLOW — EXECUTIONER. That is the city\'s word for what it wants you for. Before the year is out it may be read aloud on every radio in the Reach. I thought you should know what they think you are before the whole Sallow does.',
    reply: 'Executioner. I\'ve been called worse by better, and none of them had a list. You think I\'ll mind? Half the Sallow says it already, the half that\'s scared of me, and the other half\'s about to hear the city read it out like a job title. I\'ll stand by the set and smile so the pack sees me smile. Thank you for the warning. I\'ll pretend it was one. — V.K.',
  },
  {
    who: 'calla', to: 'npc_sh_05', topic: 'Her line on the city\'s list', days: 4,
    alive: ALL(CALLA_LIVES, CALLA_FREE), known: NAME(7),
    text: 'Sister — The city keeps a list of twelve names under glass at the top of its Spire. Yours is the seventh: CALLA, SISTER — SHALE, OPENFIELD — IMPRISONED; SEDITION; THE TRIAL SETS PRECEDENT. You know what it has already tried to do with that line. Before the year is out it may be read aloud on every radio in the Reach, with the others. I wanted you to hear it from somebody who knows you set legs.',
    reply: 'I know my line. I have had it said to me by wardens, who could not pronounce sedition, and by my own sisters, who could. Let them read it on every radio: the sky keeps no books, and now everyone will hear what the city kept instead. I will be in Shale, setting somebody\'s leg, and I will not stop to listen. Thank you for writing it in your own hand. That is the only kind of book I trust. — Calla',
  },
  {
    who: 'calla', id: 'a3_warn_calla_held', to: 'npc_sh_05', topic: 'Her line on the city\'s list', days: 4,
    alive: CALLA_HELD, known: NAME(7),
    text: 'Sister — I\'m told letters to the Precinct\'s cells are read by a warden before anybody else. Warden, read this to her slowly. The city keeps a list of twelve names at the top of its Spire. Yours is the seventh: IMPRISONED; SEDITION; THE TRIAL SETS PRECEDENT. Before the year is out it may be read aloud on every radio in the Reach. I would rather you heard it from me, through a door, than from a speaker in a corridor.',
    reply: 'The warden read it to me. He read it well; he paused in the right places. Then he read it again, to himself, and went away, and came back with my shoes. Tell whoever reads it on the radio to read mine slowly too. Somebody in a cell will be listening, and it will be the first time she has heard anyone say "precedent" as if it could go either way. — C.',
  },
  {
    who: 'mason', to: 'npc_of_01', topic: 'His line on the city\'s list', days: 4,
    alive: MASON_LIVES, known: NAME(8),
    text: 'Elder — The city keeps twelve names under glass at the top of its Spire. Yours is the eighth: MASON — OPENFIELD — OPENFIELD BURNS IN THE LONG NIGHT. You know already how much of it came true. Before the year is out the list may be read aloud on every radio in the Reach. I didn\'t want the Choir to hear its Elder\'s line from a box in a city. I wanted you to hear it from me.',
    reply: 'We heard it in the night, child, from the fields themselves, so a radio will not tell us anything new. But I am glad of your letter. The sky keeps no books: that was always our whole argument, and it was never quite true, because somebody always does. If they read the city\'s book aloud to everyone, then at last everyone keeps it. I will listen with the children, so they know what they were spared, or what they were not. — Mason',
  },
  {
    who: 'sarr', to: 'npc_nb_01', topic: 'Her line on the city\'s list', days: 3,
    alive: SARR_ALIVE, known: NAME(9),
    text: 'Grand Factor — There is a list under glass at the top of the Archive Spire, twelve names in the city\'s hand. Yours is the ninth: SARR, IMELDA — NINEBRIDGE — TREASURER. I would be surprised if you had not already priced it. Before the year is out it may be read aloud on every radio in the Reach. I\'m telling you so that nobody can say you were the last to know.',
    reply: 'Thank you for the notice. It is more than the city gave me. A forecast read aloud is a price published, and a published price is worth nothing to anyone but the person who heard it first, which, thanks to you, is me. I have already sold the position. If you are about to do what I think you are about to do, do it early in the week. The floor is thinnest on a Tuesday. — I. Sarr',
  },
  {
    who: 'ocho', to: 'npc_sk_01', topic: 'His line on the city\'s list', days: 3,
    alive: NOT(F('ks_ocho', 'drowned')), known: NAME(10),
    text: 'Ocho — There\'s a list at the top of the Spire, twelve names in the city\'s hand. Yours is the tenth: OCHO — THE SINK — CLINIC CLOSED; DROWNED, THE SPRING FLOOD. The spring came and went and you are still on your stair, which the city did not write down. Before the year is out the list may be read aloud on every radio in the Reach. I wanted the Sink to hear your line from you, not from a wall.',
    reply: 'Read it out on the clinic stair. The stair laughed, which a stair in the Sink does about once a year. Then Anju said, "Read the bit about the clinic again," and I did, and nobody laughed. Tell your radio to read mine slowly, twice, and to say after it that the clinic is open. We are open. We are always open. — Ocho',
  },
  {
    who: 'vane', to: 'npc_cr_01', topic: 'Her line on the city\'s list', days: 3,
    alive: NOT(F('cr_celestine_dead')), known: NAME(11),
    text: 'Madam — The city keeps a list of twelve names under glass at the top of its Spire. Yours is the eleventh: VANE, CELESTINE — THE CROWN — HOUSE VANE RISES. Before the year is out it may be read aloud on every radio in the Reach, with what the city expected of the other eleven. I thought a House would prefer to hear its own line before Bridgeward does.',
    reply: 'How very kind, and how like you to write it by hand. A House does not rise or fall on a radio; it rises or falls at table, and I have always set a good table. Let Bridgeward hear that the city expected great things of House Vane. They have always suspected it; it will be pleasant to be confirmed. — C. Vane. P.S. I should like to know, one day, whose idea it was to read it aloud. I am told it is never polite to ask.',
  },
  {
    who: 'maren', to: 'npc_hs_02', topic: 'Her line on the city\'s list', days: 6,
    alive: NOT(F('ks_maren', 'hanged')), known: NAME(12),
    text: 'Maren — The city keeps twelve names under glass at the top of its Spire. Yours is the last: OKAFOR, MAREN — THE SKIRTS — STRIKE BROKEN; HANGED (THE CONCERN). You know the rope better than I do. Before the year is out the list may be read aloud on every radio in the Reach, and the Clean will hear it on theirs. I wanted you to hear it first, from somebody who has been up your hill.',
    reply: 'I have had a rope with my name on it since I was nineteen and stood up in the canteen at Six. It was never the city\'s. It was the company\'s; the city only copied it out in a better hand. Let them read it. Let the Clean hear it on their sets in the gatehouse. A forecast read aloud is a threat made in public, and a threat made in public is a thing a union can organise against. Thank you. — M. Okafor',
  },
];

/** A living name on the list whose line the player knows and has not yet written to (the trestle's count of who is missing). */
export const WARN_LEFT: Cond = ANY(...A3_WARNINGS.map((w) => ALL(NOT({ knows: `a3_warned_${w.who}` }), NOT({ dead: w.to }), ANY(LIST_KNOWN, w.known), w.alive)));

export const A3_LETTERS: LetterDef[] = [...A3_MUSTER.map(muster), LET_INES_REFUSALS, ...A3_WARNINGS.map(warning)];
