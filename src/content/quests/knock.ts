import type { QuestDef } from '../../engine/quest/quest';

/** The opening at Knock: a hatch day (each chore a system, each for one of the player's people), the night watch, and
 * the morning after. Chapter One's trace (q_ch1_shale) starts when the player walks up the road. */

export const q_ch1_knock: QuestDef = {
  id: 'q_ch1_knock', title: 'Hatch Day', act: 'ch1', critical: true, start: 'hatch', xp: 100,
  routes: [
    { id: 'water', kind: 'barter', label: 'Take MOTHER\'s water' },
    { id: 'meds', kind: 'barter', label: 'Take the medicine for Hesper\'s boy' },
    { id: 'haggle', kind: 'barter', label: 'Make MOTHER recheck her valuation', requires: { knows: 'kn_hatch_cheaper' } },
  ],
  stages: {
    hatch: {
      journal: 'Hatch day at Knock. Once a week MOTHER opens the drop-hatch beside the Cistern\'s door: our wool and our letters in, the Cistern\'s water, medicine and letters out. Maud wants it done before the factor at the toll stand starts sniffing about.',
      objectives: [
        { id: 'trade', text: 'Trade Knock\'s wool at the hatch', done: { flag: 'kn_hatch_traded' } },
        { id: 'post', text: 'Bring the Cistern\'s post back to Maud', done: { flag: 'kn_post_done' } },
        { id: 'tamsin', text: 'Talk to Tamsin at the Grille', done: { flag: 'kn_tamsin_morning' }, optional: true },
        { id: 'card', text: 'Show your toll card at the stand', done: { item: 'k_kn_toll_card' }, optional: true },
      ],
      next: [{ if: { flag: 'kn_post_done' }, stage: 'chores' }],
    },
    chores: {
      journal: 'Maud has the rest of my day spoken for: Dace wants a second pair of hands at the Rib before the road people strip the last copper off the fallen mast, and Corin\'s windpump is coughing again. Corin won\'t ask. Maud asked for him.',
      objectives: [
        { id: 'rib', text: 'Help Dace salvage the relay mast in the Rib', done: { flag: 'kn_rib_done' } },
        { id: 'pump', text: 'See to Corin\'s windpump (or his snares)', done: { flag: 'kn_corin_done' } },
        { id: 'snares', text: 'Check the snare line on the east scrub', done: { flag: 'kn_snares_done' }, optional: true },
      ],
      next: [
        { if: { all: [{ flag: 'kn_rib_done' }, { flag: 'kn_corin_done' }, { flag: 'kn_linnet_away' }] }, stage: 'linnet' },
      ],
    },
    linnet: {
      journal: 'Linnet hasn\'t come home for food, and three of Maud\'s water skins are off their peg. If she\'s on the road, Maud wants her brought home first and shouted at after.',
      objectives: [{ id: 'find', text: 'Find Linnet and bring her home', done: { flag: 'kn_linnet_home' } }],
      next: [
        { if: { all: [{ dead: 'npc_kn_buyer' }, { not: { flag: 'kn_linnet_home' } }] }, stage: 'linnet_fought' },
        { if: { flag: 'kn_linnet_home' }, stage: 'evening' },
      ],
    },
    linnet_fought: {
      journal: 'The road buyer went down in the dust by the toll stand, and Linnet ran home ahead of me.',
      onEnter: [{ set: 'kn_linnet_home' }, { set: 'kn_linnet_settled' }, { set: 'kn_linnet_choice', value: 'fought' }, { decision: { id: 'kn_linnet_fought', text: 'You fought the road buyer over Linnet.' } }, { memory: { npc: 'npc_kn_linnet', tag: 'fought_for_her', valence: 15 } }],
      next: [{ if: { flag: 'kn_linnet_home' }, stage: 'evening' }],
    },
    evening: {
      journal: 'Linnet is home. Maud has barley on the fire, and somebody has to keep the watch at the hatch lamp tonight.',
      objectives: [
        { id: 'supper', text: 'Eat with Maud at the fire', done: { flag: 'kn_supper' } },
        { id: 'book', text: 'Write a line in the post-book', done: { flag: 'kn_wrote_post' }, optional: true },
        { id: 'watch', text: 'Take the night watch at the hatch lamp', done: { flag: 'kn_night' } },
      ],
      next: [{ if: { flag: 'kn_night' }, stage: 'night' }],
    },
    night: {
      journal: 'The night watch. Nobody comes up the road. Nobody has come up the road in sixty years.',
      objectives: [{ id: 'watch', text: 'Keep the watch', done: { flag: 'kn_stranger_dead' } }],
      next: [{ if: { flag: 'kn_stranger_dead' }, stage: 'dead' }],
    },
    dead: {
      journal: 'A man in a dust mask came up the road with a bullet in his hip and knocked on the Cistern\'s door, and looked at my face as if he knew it, and said "you", and died. He put a photograph in my hand. It\'s me. Older, in a ruined city, dated forty-one years ago.',
      objectives: [
        { id: 'search', text: 'Search the stranger\'s pack', done: { flag: 'kn_body_searched' } },
        { id: 'pell', text: 'Tell Pell through the Grille', done: { seen: 'grille.night.after' }, optional: true },
        { id: 'sleep', text: 'Go home to bed', done: { flag: 'kn_outriders' } },
      ],
      next: [{ if: { flag: 'kn_outriders' }, stage: 'done' }],
    },
    done: {
      journal: 'Morning. Horses on the road.',
      end: 'done',
      onEnter: [{ quest: 'q_ch1_outriders', start: true }],
    },
  },
};

export const q_ch1_outriders: QuestDef = {
  id: 'q_ch1_outriders', title: 'Guild Colours', act: 'ch1', critical: true, start: 'square', xp: 150,
  routes: [
    { id: 'give', kind: 'talk', label: 'Hand over the notebook, keep the photograph' },
    { id: 'lie', kind: 'talk', label: 'Tell Hale the stranger was buried with his things' },
    { id: 'hide', kind: 'stealth', label: 'Hide the stranger\'s things and let them search' },
    { id: 'fight', kind: 'fight', label: 'Fight beside Corin' },
  ],
  stages: {
    square: {
      journal: 'Three Guild outriders are in Knock\'s square, asking after an old man in a dust mask "carrying stolen Guild property". They came straight to Maud\'s door.',
      objectives: [{ id: 'meet', text: 'Face the outriders in the square', done: { any: [{ flag: 'kn_outriders_gone' }, { flag: 'kn_out_fight' }] } }],
      next: [
        { if: { flag: 'kn_out_fight' }, stage: 'fight' },
        { if: { flag: 'kn_outriders_gone' }, stage: 'burned' },
      ],
    },
    fight: {
      journal: 'I raised my arm to the rise and Corin fired. Knock\'s square is a battlefield.',
      objectives: [{ id: 'win', text: 'Drive off the outriders', done: { all: [{ dead: 'npc_kn_out_lead' }, { dead: 'npc_kn_out_a' }, { dead: 'npc_kn_out_b' }] } }],
      next: [{ if: { all: [{ dead: 'npc_kn_out_lead' }, { dead: 'npc_kn_out_a' }, { dead: 'npc_kn_out_b' }] }, stage: 'fought' }],
    },
    fought: {
      journal: 'They are dead in Knock\'s square, and the Guild will hear of it. A rider\'s lamp went into the post-house in the fighting. Maud went in after the post-book.',
      onEnter: [
        { set: 'kn_out_choice', value: 'fought' }, { set: 'kn_posthouse_burned' }, { set: 'kn_maud_hurt' }, { set: 'kn_outriders_gone' },
        { decision: { id: 'kn_fought_outriders', text: 'You fought the Guild\'s outriders at Knock beside Corin.' } },
        { rep: { faction: 'tollmen', respect: -10, fear: 10 } },
        { news: { tag: 'knock_fought', text: 'Knock fought off three Guild outriders; the post-house burned', valence: -5, size: 7, at: 'cistern9' } },
      ],
      next: [{ if: { flag: 'kn_outriders_gone' }, stage: 'burned' }],
    },
    burned: {
      journal: 'The post-house is a black frame, sixty years of letters gone up in the morning wind, and Maud is hurt. Knock is begging the Cistern for Pell. The door has never opened.',
      objectives: [
        { id: 'grille', text: 'Beg the Cistern at the Grille', done: { flag: 'kn_ines_refused' } },
        { id: 'hatch', text: 'Try the hatch', done: { flag: 'kn_mother_decided' } },
        { id: 'maud', text: 'Go to Maud', done: { flag: 'kn_told_to_go' } },
      ],
      next: [{ if: { flag: 'kn_told_to_go' }, stage: 'leave' }],
    },
    leave: {
      journal: 'Maud says to find out who he was before they come back for me, and then come home. Shale is north up the toll road, a day if my water holds.',
      onEnter: [{ set: 'kn_free_to_leave' }, { set: 'c9_council_done' }],
      objectives: [
        { id: 'linnet', text: 'Decide about Linnet', done: { flag: 'kn_linnet_decided' }, optional: true },
        { id: 'tamsin', text: 'Say goodbye to Tamsin at the Grille', done: { flag: 'kn_tamsin_farewell' }, optional: true },
        { id: 'corin', text: 'See Corin before you go', done: { flag: 'kn_corin_rifle' }, optional: true },
        { id: 'road', text: 'Take the toll road north', done: { flag: 'c9_left' } },
      ],
      next: [{ if: { flag: 'c9_left' }, stage: 'done' }],
    },
    done: {
      journal: 'I left Knock by the toll road. The stranger came from somewhere along it, and somebody along it shot him.',
      end: 'done',
      onEnter: [
        { news: { tag: 'knock_leaver', text: 'someone from Knock is on the toll road asking after the old man the outriders hunted', valence: 2, size: 4, at: 'cistern9' } },
        { quest: 'q_ch1_shale', start: true },
      ],
    },
  },
};
