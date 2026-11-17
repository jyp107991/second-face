import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';
import { GUILD_IN_PLAY, HALE, ORME, PETRA, PETRA_DEAD } from '../world/a3_conds';

/**
 * The forces at Knock (Act 3 beat 20a–20b): the Unwritten by night, and the guild's people at the stand. B6f places them on
 * Knock's map and gives each a first meeting so they can be spoken to; **B6g writes this file's scenes whole**: the
 * Unwritten's aim and its turn, the burning party at the apron (`d_a3_petra`, for Petra Mason, or the Unwritten's own
 * `npc_a3_u1` when Petra is dead), Factor Orme's buyer's paper when the guild is in play (`d_a3_orme`, which keeps the stand's
 * trade), and Brannick Hale with the post-house and Maud's judgement (`d_a3_hale`). The handlers (`npc_a3_g11/g12`) and the
 * other two Unwritten (`npc_a3_u2/u3`) have barks only until B6g gives them lines. Story notes: story/B6_NOTES_SECRET.md
 * §2.3 (20a, 20b) and "As built" → B6f.
 */

const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });

export const d_a3_petra: DialogueDef = {
  id: 'd_a3_petra', owner: PETRA,
  start: [{ if: PETRA_DEAD, node: 'first' }, { node: 'petra' }],
  nodes: {
    petra: {
      text: 'Petra Mason at the dark edge of the apron, hood down, her face bare to your lamp as it always is, with two of the Unwritten behind her in the shadow of the rock. "Designate," she says, as if it were a joke she has heard before. "We\'re only looking. Tonight." She looks past you at the door.',
      again: '"Only looking," Petra says. "Tonight."',
      options: [{ text: '(Leave her to it.)', exit: true }],
    },
    first: {
      speaker: 'npc_a3_u1',
      text: 'A woman at the dark edge of the apron with her hood down and her face bare to your lamp: one of the Unwritten, with two more behind her in the shadow of the rock. "Petra would have known what to say to you," she says. "I only know what we came to do. Not tonight."',
      again: '"Not tonight," she says.',
      options: [{ text: '(Leave them to it.)', exit: true }],
    },
  },
};

export const d_a3_orme: DialogueDef = {
  id: 'd_a3_orme', owner: ORME,
  start: [{ node: 'stand' }],
  nodes: {
    stand: {
      text: [
        { if: GUILD_IN_PLAY, text: 'Factor Ismay Orme behind her counter at the stand, her ledger shut at her elbow and a leather folder on the counter in its place, closed, her hand flat on it. "Designate." She does not ask for your card. "Water\'s one Toll here, as it always was. When there is any."' },
        { if: F('a3_route_home', 'first'), text: 'Factor Ismay Orme behind her counter at the stand, as if the guild\'s coach had been a long afternoon. "Home," she says. "Cards out, faces up." She does not ask for yours. "Water\'s one Toll here, as it always was. When there is any."' },
        { text: 'Factor Ismay Orme behind her counter at the stand, her ledger open and nothing to write in it. "Designate." She does not ask for your card. "Water\'s one Toll here, as it always was. When there is any."' },
      ],
      again: '"Anything else, love?" Orme says. "The book doesn\'t wait on talk. It hasn\'t much else to do, mind."',
      options: [
        { id: 'orme.a3.column', text: 'How is the stand, with a column across the road?', once: true, next: 'column' },
        { id: 'orme.a3.trade', text: 'What are you selling? (Trade)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { text: 'Later.', exit: true },
      ],
    },
    column: {
      text: '"The city\'s column buys nothing and pays for everything it takes, which is nothing, because it brought its own." She looks across the road at the tents. "In twenty years at this stand I have never had a customer I couldn\'t sell to. I don\'t know what to do with them."',
      again: '"I don\'t know what to do with them," Orme says.',
      options: [{ text: '(Go on.)', next: 'stand' }],
    },
  },
};

export const d_a3_hale: DialogueDef = {
  id: 'd_a3_hale', owner: HALE,
  start: [{ node: 'horses' }],
  nodes: {
    horses: {
      text: 'Brannick Hale with the guild\'s horses on the flat east of the stand, grey all through now, and still polite about it. He looks at you, at your face, a moment too long, as he did once in the square. "Not you I came to see," he says, and looks up the slope at the rise where the windpump stands.',
      again: 'Hale with the horses, watching the rise.',
      options: [{ text: '(Leave him.)', exit: true }],
    },
  },
};

export const A3_FORCES_DIALOGUES: DialogueDef[] = [d_a3_petra, d_a3_orme, d_a3_hale];
