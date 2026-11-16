import type { QuestDef } from '../../engine/quest/quest';

/** Assessor Nine's personal line (U8): a deed for a municipal unit nobody signed for. Started at Nine's camp fire
 * (d_md_nine, stage 2); its conversations are the records terminal, the desk warden and Captain Lowe (dialogue/meridian.ts)
 * and Nine's camp. Flags: nine_deed_asked → nine_title_read → nine_deed_made (nine_deed_how: witnessed | bought | forged) →
 * nine_deed (self | player | city). No day limit: the date on the entry is a story fact, never a timer. */
export const q_comp_nine: QuestDef = {
  id: 'q_comp_nine', title: 'Nine\'s Deed', act: 'a2', start: 'register', xp: 200,
  routes: [
    { id: 'terminal', kind: 'tech', label: 'Read the asset register at the records terminal', requires: { skill: 'science', gte: 25 } },
    { id: 'print', kind: 'barter', label: 'The desk warden prints any entry for the price of the paper' },
    { id: 'witness', kind: 'talk', label: 'Clause 9(b): a captain witnesses a lapsed asset passing to its keeper', requires: { skill: 'speech', gte: 30 } },
    { id: 'buy', kind: 'barter', label: 'Clause 9(b): buy the lapsed title from the city at assessed value' },
    { id: 'forge', kind: 'knowledge', label: 'Nine has its own plate; it can be asked to write the deed itself' },
  ],
  stages: {
    register: {
      journal: 'Nine wants to know who owns it. The charter says the city, and the city has never signed anything. Every asset in Meridian has an entry in the register with an owner on it, and the one entry Nine may not read is its own. The register is public: the records terminal shows it, and the desk warden prints any entry for the price of the paper.',
      objectives: [
        { id: 'read', text: 'Read Nine\'s entry in the asset register', done: { flag: 'nine_title_read' } },
        { id: 'deed', text: 'Get a deed made: witnessed by the captain, bought at the desk, or written', done: { flag: 'nine_deed_made' } },
      ],
      next: [{ if: { flag: 'nine_deed_made' }, stage: 'name' }],
    },
    name: {
      journal: 'A deed for Nine, with the keeper\'s line empty. The entry said its title lapsed with the department that issued it, and gave a date for its disposal: next year. Nine would like my advice on the name. It has not promised to take it.',
      objectives: [{ id: 'name', text: 'Talk to Nine at camp about the keeper\'s line', done: { flag: 'nine_deed' } }],
      next: [
        { if: { flag: 'nine_deed', eq: 'self' }, stage: 'self' },
        { if: { flag: 'nine_deed', eq: 'player' }, stage: 'player' },
        { if: { flag: 'nine_deed', eq: 'city' }, stage: 'city' },
      ],
    },
    self: { journal: 'Keeper: Unit 9. A thing that owns itself, under a clause nobody wrote. When the date comes, the schedule will find an asset with a keeper, and the keeper will decline.', end: 'done' },
    player: { journal: 'Keeper: me. Nine is owned by someone who reads, it says, and will take lawful orders and note the others. When the date comes, the city will have to ask me.', end: 'done' },
    city: { journal: 'Keeper: the city. Lawful, and what the schedule expects. Nine put the deed in the city\'s ledger and said it would finish the file before the date.', end: 'done' },
  },
};
