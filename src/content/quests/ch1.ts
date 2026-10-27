import type { QuestDef } from '../../engine/quest/quest';

/** Chapter One quests. */

export const q_ch1_door: QuestDef = {
  id: 'q_ch1_door', title: 'The Knock', act: 'ch1', critical: true, start: 'wake', xp: 150,
  routes: [
    { id: 'council', kind: 'talk', label: 'Take Elder Halloran\'s order to Bram' },
    { id: 'mechanics', kind: 'tech', label: 'Talk Bram through a manual cycle', requires: { skill: 'mechanics', gte: 40 } },
    { id: 'parts', kind: 'barter', label: 'Pay Bram in circuit boards' },
    { id: 'guilt', kind: 'talk', label: 'Shame Bram into it', requires: { skill: 'speech', gte: 60 } },
    { id: 'shaft', kind: 'stealth', label: 'Crawl the maintenance shaft', requires: { any: [{ skill: 'security', gte: 35 }, { skill: 'mechanics', gte: 45 }, { origin: 'pump_hand' }] } },
  ],
  stages: {
    wake: {
      journal: 'A stranger hammered on the great door before dawn — the first outsider in living memory — and died before he could speak. Doc Pell has the body. Elder Halloran is waiting for me.',
      objectives: [
        { id: 'pell', text: 'See the body in the clinic', done: { flag: 'c9_examined' } },
        { id: 'ines', text: 'Speak with Elder Halloran', done: { flag: 'c9_council_done' } },
        { id: 'tamsin', text: 'Talk to Tamsin', done: { flag: 'c9_tamsin_decided' }, optional: true },
      ],
      next: [{ if: { all: [{ flag: 'c9_examined' }, { flag: 'c9_council_done' }] }, stage: 'door' }],
    },
    door: {
      journal: 'Halloran wants me to go outside and find out who he was, and why he carried my face. Bram Coyle keeps the great door, and he does not want to open it.',
      objectives: [
        { id: 'open', text: 'Get the great door open — or find another way out', done: { any: [{ flag: 'c9_door_open' }, { flag: 'c9_shaft_open' }] } },
        { id: 'armed', text: 'Get something better than a shiv', done: { any: [{ flag: 'c9_armed' }, { item: 'w_bolt308' }] }, optional: true },
      ],
      next: [{ if: { any: [{ flag: 'c9_door_open' }, { flag: 'c9_shaft_open' }] }, stage: 'leave' }],
    },
    leave: {
      journal: 'The way out is open. Whatever is out there, it has been waiting ninety years.',
      objectives: [{ id: 'out', text: 'Leave Cistern 9', done: { flag: 'c9_left' } }],
      next: [{ if: { flag: 'c9_left' }, stage: 'done' }],
    },
    done: {
      journal: 'I left Cistern 9. The track north leads to Shale, the nearest town, if the old maps are right — and the stranger came from somewhere.',
      end: 'done',
      onEnter: [
        { news: { tag: 'cistern_opened', text: 'someone walked out of the old shelter at the salt cut', valence: 5, size: 5, at: 'cistern9' } },
        { quest: 'q_ch1_shale', start: true },
      ],
    },
  },
};

export const q_ch1_shale: QuestDef = {
  id: 'q_ch1_shale', title: 'A Man at the Door', act: 'ch1', critical: true, start: 'road', xp: 200,
  routes: [
    { id: 'sheriff', kind: 'talk', label: 'Ask Sheriff Vey; she saw him' },
    { id: 'rumour', kind: 'barter', label: 'Buy the rumour from Mags or Pike' },
    { id: 'tracks', kind: 'survival', label: 'Read his tracks on the west road', requires: { skill: 'survival', gte: 40 } },
    { id: 'notebook', kind: 'knowledge', label: 'Read the notebook line (Archive Clerk)', requires: { origin: 'archive_clerk' } },
    { id: 'drifter', kind: 'talk', label: 'Earn Hollis Crane\'s goodwill and ask him' },
  ],
  stages: {
    road: {
      journal: 'He walked west for weeks on a wound that should have killed him, and he came to our door on purpose. Shale is the only town for a day in any direction. Someone there will have seen an old man with a bad hip.',
      objectives: [
        { id: 'shale', text: 'Reach Shale', done: { flag: 'visited_shale' } },
        { id: 'seen', text: 'Find someone who saw him', done: { any: [{ knows: 'ada_saw_stranger' }, { knows: 'pardo_has_ring' }, { knows: 'hollis_saw_stranger' }, { knows: 'mags_saw_stranger' }, { knows: 'pike_saw_stranger' }, { knows: 'tracks_read' }] } },
        { id: 'where', text: 'Learn where he went from here', done: { any: [{ knows: 'ada_saw_stranger' }, { knows: 'kessler_has_map' }, { knows: 'map_sold' }, { knows: 'tracks_read' }] } },
        { id: 'carried', text: 'Learn what he carried', done: { any: [{ knows: 'kessler_has_map' }, { knows: 'map_sold' }] }, optional: true },
        { id: 'ring', text: 'Buy back his ring', done: { item: 'k_ring' }, optional: true },
      ],
      next: [{ if: { all: [{ flag: 'visited_shale' }, { any: [{ knows: 'ada_saw_stranger' }, { knows: 'kessler_has_map' }, { knows: 'map_sold' }, { knows: 'tracks_read' }] }] }, stage: 'overpass' }],
    },
    overpass: {
      journal: [
        'He went to the Rust Dogs under the overpass, and he went knowing what they were. Whatever he carried, he meant to trade it there — and he reached us with only the photograph.',
      ].join(''),
      objectives: [
        { id: 'go', text: 'Go to the overpass', done: { flag: 'visited_overpass' } },
        { id: 'carried', text: 'Learn what he carried', done: { any: [{ knows: 'kessler_has_map' }, { knows: 'map_sold' }] }, optional: true },
      ],
      next: [{ if: { flag: 'visited_overpass' }, stage: 'done' }],
    },
    done: { journal: 'I found the Rust Dogs\' camp under the dead highway. If he traded here, Kessler has what he traded.', end: 'done', onEnter: [{ quest: 'q_ch1_map', start: true }] },
  },
};

export const q_ch1_map: QuestDef = {
  id: 'q_ch1_map', title: 'The Paper', act: 'ch1', critical: true, start: 'camp', xp: 300,
  routes: [
    { id: 'buy', kind: 'barter', label: 'Buy it from Kessler (80 Tolls or the bolt rifle)' },
    { id: 'wager', kind: 'talk', label: 'Win it at Dust' },
    { id: 'fear', kind: 'talk', label: 'Convince Kessler the paper is a danger (Pike reported him)', requires: { skill: 'speech', gte: 45 } },
    { id: 'terms', kind: 'talk', label: 'Carry his tribute terms to Shale', requires: { skill: 'speech', gte: 50 } },
    { id: 'wren', kind: 'stealth', label: 'Wren steals it for a place at your side' },
    { id: 'lift', kind: 'stealth', label: 'Lift it from under his lamp at night', requires: { skill: 'stealth', gte: 45 } },
    { id: 'coup', kind: 'fight', label: 'Vasha\'s coup: kill Kessler in his hall' },
    { id: 'exodus', kind: 'talk', label: 'Wren\'s exodus, with the sheriff\'s word' },
  ],
  stages: {
    camp: {
      journal: 'He traded the paper to Kessler for water. Kessler can\'t read it, won\'t sell it to the Tollmen, and keeps it under his lamp. There are more ways into a thing like that than through the front of it.',
      objectives: [
        { id: 'kessler', text: 'Speak with Kessler', done: { flag: 'rd_kessler_met' } },
        { id: 'map', text: 'Get the stranger\'s map', done: { flag: 'have_map' } },
        { id: 'vasha', text: 'Hear Vasha out', done: { flag: 'rd_vasha_met' }, optional: true },
        { id: 'wren', text: 'Talk to the scout who found him', done: { flag: 'rd_wren_met' }, optional: true },
      ],
      next: [{ if: { flag: 'have_map' }, stage: 'done' }],
    },
    done: { journal: 'The map is mine: twelve places pricked on a road, and beside each a block of marks I can\'t read. Yet.', end: 'done', onEnter: [{ quest: 'q_ch1_name', start: true }] },
  },
};

export const q_sh_prisoner: QuestDef = {
  id: 'q_sh_prisoner', title: 'Teo\'s Numbers', act: 'ch1', start: 'held', xp: 120,
  routes: [
    { id: 'pay', kind: 'barter', label: 'Pay the debt (Kessler 60, or Perpetua 40)' },
    { id: 'terms', kind: 'talk', label: 'Trade Kessler the tribute errand for him', requires: { skill: 'speech', gte: 45 } },
    { id: 'pick', kind: 'stealth', label: 'Pick the cage at night', requires: { skill: 'security', gte: 40 } },
    { id: 'fight', kind: 'fight', label: 'Take him out by force' },
  ],
  stages: {
    held: {
      journal: 'Mags\'s partner Teo Marsh is in the Rust Dogs\' cage over a debt he says isn\'t his. The Dogs want sixty Tolls or something better.',
      objectives: [
        { id: 'find', text: 'Find Teo at the overpass', done: { knows: 'teo_seen' } },
        { id: 'free', text: 'Get him out', done: { flag: 'teo_freed' } },
      ],
      next: [{ if: { flag: 'teo_freed' }, stage: 'home' }],
    },
    home: {
      journal: 'Teo is out. He is walking home to Shale on legs he doesn\'t trust.',
      objectives: [{ id: 'mags', text: 'Tell Mags', done: { flag: 'mags_told_teo' } }],
      next: [{ if: { flag: 'mags_told_teo' }, stage: 'done' }],
    },
    done: { journal: 'Teo is back behind the bar, counting. Mags has not stopped shouting at him, which is how she says thank you.', end: 'done' },
  },
};


export const q_ch1_tribute: QuestDef = {
  id: 'q_ch1_tribute', title: 'Tribute Day', act: 'ch1', critical: true, start: 'due', xp: 250,
  routes: [
    { id: 'pay', kind: 'barter', label: 'Pay the tithe (or let Shale pay it)' },
    { id: 'terms', kind: 'talk', label: 'Carry Kessler\'s terms and have the sheriff accept them' },
    { id: 'talk_down', kind: 'talk', label: 'Talk Vasha down to nothing', requires: { skill: 'speech', gte: 60 } },
    { id: 'sabotage', kind: 'tech', label: 'Cut the Dogs\' truck at the overpass beforehand', requires: { any: [{ skill: 'mechanics', gte: 40 }, { skill: 'security', gte: 35 }] } },
    { id: 'fight', kind: 'fight', label: 'Fight beside the militia' },
  ],
  stages: {
    due: {
      journal: 'Twice a year the Rust Dogs come into Shale for a tithe of water and drink, and twice a year Shale pays it and hates itself. The next one is days away. Everyone knows the day; nobody says it.',
      objectives: [
        { id: 'ada', text: 'Hear what the sheriff means to do', done: { any: [{ knows: 'ada_will_pay' }, { flag: 'ada_terms_decided' }] }, optional: true },
        { id: 'terms', text: 'Put Kessler\'s terms to the sheriff', done: { flag: 'ada_terms_decided' }, optional: true, hidden: true },
        { id: 'truck', text: 'Do something about the Dogs\' truck', done: { flag: 'truck_sabotaged' }, optional: true, hidden: true },
      ],
      next: [{ if: { flag: 'tribute_day' }, stage: 'day' }, { if: { flag: 'tribute_resolved' }, stage: 'settled' }],
    },
    day: {
      journal: 'They are here. Vasha Kade and four Dogs at the wells, and the whole town leaning toward them the way it leans toward the pumps.',
      objectives: [{ id: 'wells', text: 'Face the Dogs at the wells', done: { flag: 'tribute_resolved' } }],
      next: [
        { if: { flag: 'tribute_outcome', eq: 'fought' }, stage: 'fought' },
        { if: { flag: 'tribute_outcome', eq: 'negotiated' }, stage: 'negotiated' },
        { if: { flag: 'tribute_outcome', eq: 'sabotaged' }, stage: 'sabotaged' },
        { if: { flag: 'tribute_outcome', eq: 'paid' }, stage: 'paid' },
        { if: { all: [{ flag: 'tribute_fight' }, { dead: 'tribute_vasha' }] }, stage: 'fought' },
        { if: { all: [{ flag: 'tribute_fight' }, { dead: 'tribute_t1' }, { dead: 'tribute_t2' }, { dead: 'tribute_t3' }, { dead: 'tribute_t4' }] }, stage: 'fought' },
        { if: { flag: 'tribute_resolved' }, stage: 'settled' },
      ],
    },
    paid: { journal: 'Shale paid. The water went up the west road on the Dogs\' cart, and nobody died, and the sheriff has not looked at anyone since.', end: 'done', onEnter: [{ set: 'tribute_day', value: false }] },
    negotiated: { journal: 'Half of what they took last time, in water, and Vasha Kade walked out of Shale with less than she came for. She will remember whose doing that was.', end: 'done', onEnter: [{ set: 'tribute_day', value: false }] },
    sabotaged: { journal: 'They walked in and they walked out, carrying what they could carry, which was not much. Vasha knows somebody cut the truck. She does not know who. Yet.', end: 'done', onEnter: [{ set: 'tribute_day', value: false }] },
    fought: {
      journal: 'Shale fought. The street is quiet and the wells are Shale\'s, and the price of that is going to arrive from the overpass one night soon.',
      end: 'done',
      onEnter: [{ set: 'tribute_resolved' }, { set: 'tribute_outcome', value: 'fought' }, { set: 'tribute_day', value: false }, { news: { tag: 'shale_fought', text: 'Shale fought the Rust Dogs at the wells on Tribute Day and held them off', valence: 20, size: 8, at: 'shale' } }, { rep: { faction: 'rust_dogs', fear: 20 } }, { rep: { faction: 'shale_militia', respect: 20 } }],
    },
    settled: { journal: 'Tribute Day came and went without me. Shale paid, and Deputy Reese took a beating for arguing the count. People have noticed who was not there.', end: 'done' },
  },
};


export const q_ch1_name: QuestDef = {
  id: 'q_ch1_name', title: 'The First Name', act: 'ch1', critical: true, start: 'cipher', xp: 300,
  routes: [
    { id: 'science', kind: 'tech', label: 'Work the cipher yourself', requires: { skill: 'science', gte: 50 } },
    { id: 'clerk', kind: 'knowledge', label: 'Read it as record shorthand (Archive Clerk)', requires: { origin: 'archive_clerk' } },
    { id: 'key', kind: 'barter', label: 'Buy the Tollmen\'s cipher wheel from Pike' },
    { id: 'hollis', kind: 'talk', label: 'Hollis Crane knows the hand' },
  ],
  stages: {
    cipher: {
      journal: 'Twelve places on a road, a block of marks beside each, and the nearest pin is Shale. Somebody can read this: a clerk, a drifter who has seen the hand, the Tollmen who sell keys to everything — or me, with time and a crib.',
      objectives: [
        { id: 'read', text: 'Read the first name on the map', done: { knows: 'name1_decoded' } },
        { id: 'key', text: 'Get a key to the cipher', done: { any: [{ item: 'k_cipher_key' }, { knows: 'hollis_read_map' }] }, optional: true },
      ],
      next: [{ if: { knows: 'name1_decoded' }, stage: 'read' }],
    },
    read: {
      journal: 'Jonah Reese. Shale. Within the month, the list says, and does not say how. A man walked across the waste to bring me a list with the deputy\'s name on it, and mine was never on it at all — or it is, further east, where the road goes.',
      end: 'done',
      onEnter: [{ set: 'ch1_done' }, { quest: 'q_a1_tollhouse', start: true }, { quest: 'q_a1_jonah', start: true }, { after: { minutes: 4, id: 'act1_card', effects: [{ event: 'title', data: { text: 'ACT ONE\nTHE MONTH' } }] } }, { decision: { id: 'ch1_done', text: 'Chapter One ended with the first name read: Jonah Reese, within the month.' } }, { news: { tag: 'stranger_map_read', text: 'the salt-cut stranger has been asking what the deputy\'s name is worth', valence: -5, size: 3, at: 'shale' } }],
    },
  },
};
