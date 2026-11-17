import type { LetterDef } from '../../engine/world/letters';
import type { Cond, Effect } from '../../engine/world/logic';
import { ALLY, ALLY_NEEDS, CALLA_FREE, LN_PEOPLE, MASON_EXILED, MASON_LIVES, ORDER_READ, type Ally } from './a3_conds';

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

export const A3_LETTERS: LetterDef[] = [...A3_MUSTER.map(muster), LET_INES_REFUSALS];
