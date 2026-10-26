import type { LetterDef } from '../../engine/world/letters';

/** Letters the player can write (camp / a rented room in a town with caravan traffic). */
export const LETTERS: Record<string, LetterDef> = Object.fromEntries(([
  {
    id: 'let_ines_shale', to: 'npc_c9_01', topic: 'What Shale is like', if: { flag: 'visited_shale' }, days: 4, once: true,
    text: 'Elder — I reached the town. It is smaller than the atlases and dirtier than the stories: two pumps, a sheriff, a saloon, people who count water in cups. They knew him here. He passed through three weeks before us. I am following.',
    effects: [{ memory: { npc: 'npc_c9_01', tag: 'player_wrote_shale', valence: 10, strength: 80 } }, { trust: { npc: 'npc_c9_01', by: 5 } }],
    reply: { text: 'Your letter came with a caravan woman who wanted paying in needles. Everyone is well. Teague has stopped saying "weld". MOTHER says variance is unchanged and asked, twice, whether you were counted where you are. I said yes. Write again. — I.H.', effects: [{ learn: 'ines_replied_shale' }, { set: 'c9_knows_shale' }] },
  },
  {
    id: 'let_tamsin_inside', to: 'npc_c9_03', topic: 'For Tamsin', if: { all: [{ flag: 'c9_tamsin_inside' }, { flag: 'visited_shale' }] }, days: 4, once: true,
    text: 'Tam — there is a sky. It is not blue. It is white at noon and the colour of rust at the ends of the day and there is more of it than I knew how to want. The town has a bar. I will tell you the rest when I see you.',
    effects: [{ approval: { companion: 'npc_c9_03', by: 10 } }],
    reply: { text: 'Rust it. RUST IT. You get a sky and I get the algae count. Fine. Ines read your letter to the whole ring and Teague cried, don\'t tell her I told you. The fridge asked about you. Come back or I\'m coming out. — T', effects: [{ approval: { companion: 'npc_c9_03', by: 5 } }, { learn: 'tamsin_replied' }] },
  },
  {
    id: 'let_ines_truth', to: 'npc_c9_01', topic: 'What I have learned about him', if: { all: [{ flag: 'visited_shale' }, { any: [{ lead: 'l_hollis_city' }, { concluded: 'c_from_a_city' }] }] }, days: 5, once: true,
    text: 'Elder — he came from a city, a real one, with power and hospitals. People here have been there. He was running from something in it, or carrying something out of it. I think both. Keep the door shut until I write again.',
    effects: [{ memory: { npc: 'npc_c9_01', tag: 'player_wrote_city', valence: 5, strength: 90 } }, { set: 'c9_told_city' }],
    reply: { text: 'I have read your letter four times and burned it, which you will understand one day. The door stays shut. Pell asks whether the hospitals keep records. Bram asks nothing, which worries me more. — I.H.', effects: [{ learn: 'ines_burned_letter' }, { lead: 'l_ines_burned' }] },
  },
] as LetterDef[]).map((l) => [l.id, l]));
