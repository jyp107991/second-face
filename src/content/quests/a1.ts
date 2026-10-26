import type { QuestDef } from '../../engine/quest/quest';

/** Act 1: the road east. */

export const q_a1_tollhouse: QuestDef = {
  id: 'q_a1_tollhouse', title: 'The Wall on the Highway', act: 'a1', critical: true, start: 'road', xp: 300,
  routes: [
    { id: 'pay', kind: 'barter', label: 'Pay the toll (20 Tolls)' },
    { id: 'contract', kind: 'talk', label: 'Carry a sealed guild packet east (free passage, and a catch)' },
    { id: 'forged', kind: 'talk', label: 'Show a forged pass (Teo or Perpetua can make one)', requires: { skill: 'speech', gte: 35 } },
    { id: 'fence', kind: 'stealth', label: 'Climb the chain-link at the wall\'s north end, at night', requires: { skill: 'stealth', gte: 45 } },
    { id: 'terminal', kind: 'tech', label: 'Stamp yourself through on the gate terminal', requires: { any: [{ skill: 'science', gte: 40 }, { skill: 'security', gte: 45 }] } },
    { id: 'raid', kind: 'fight', label: 'Hit the Tollhouse with Vasha\'s Dogs' },
  ],
  stages: {
    road: {
      journal: 'The stranger\'s road runs east, and east of Shale the only road is the old highway, and the highway belongs to the Tollmen. Tollhouse 9 sits across it like a hand held up. Two days\' walk.',
      objectives: [
        { id: 'reach', text: 'Reach Tollhouse 9', done: { flag: 'visited_tollhouse' } },
        { id: 'pass', text: 'Get past the gate', done: { flag: 'th_passed' } },
        { id: 'riders', text: 'The guild\'s outriders ride this road. Find out who shot him', done: { any: [{ knows: 'outriders_confessed' }, { lead: 'l_pike_paid' }] }, optional: true },
      ],
      onEnter: [{ learn: 'loc_tollhouse' }],
      next: [{ if: { flag: 'th_passed' }, stage: 'through' }],
    },
    through: {
      journal: 'Through the wall, one way or another. The guild thanks you for your custom, or will send someone to count what you cost it. The highway runs east toward a hill with a mast on it — the next pin on the map.',
      end: 'done',
      onEnter: [{ learn: 'loc_signalhill' }, { quest: 'q_a1_signal', start: true }, { news: { tag: 'passed_tollhouse', text: 'someone from the salt cut went east through Tollhouse 9', valence: 0, size: 3, at: 'tollhouse' } }],
    },
  },
};

export const q_a1_ledger: QuestDef = {
  id: 'q_a1_ledger', title: 'Tollhouse Ledger', act: 'a1', start: 'rumour', xp: 150,
  routes: [
    { id: 'night', kind: 'stealth', label: 'Read the ledger when the booth is empty (after nine at night)' },
    { id: 'lift', kind: 'stealth', label: 'Read it under the clerk\'s nose', requires: { skill: 'stealth', gte: 40 } },
    { id: 'ask', kind: 'talk', label: 'Get the outriders to say it themselves', requires: { skill: 'speech', gte: 45 } },
  ],
  stages: {
    rumour: {
      journal: 'Pike "reported" the stranger to the guild, as per. The guild keeps books. If the outriders who shot him were paid, Tollhouse 9 wrote it down.',
      objectives: [
        { id: 'read', text: 'Find the entry in the Tollhouse 9 ledger', done: { any: [{ lead: 'l_pike_paid' }, { knows: 'outriders_confessed' }] } },
        { id: 'page', text: 'Take the page', done: { item: 'k_ledger_page' }, optional: true },
      ],
      next: [{ if: { item: 'k_ledger_page' }, stage: 'evidence' }, { if: { any: [{ lead: 'l_pike_paid' }, { knows: 'outriders_confessed' }] }, stage: 'known' }],
    },
    known: {
      journal: 'The guild paid two outriders to put the stranger down on the highway, on a Factor\'s word from Shale. You know it; you cannot yet prove it to anyone who matters.',
      objectives: [{ id: 'page', text: 'Take the ledger page as proof', done: { item: 'k_ledger_page' } }],
      next: [{ if: { item: 'k_ledger_page' }, stage: 'evidence' }],
    },
    evidence: {
      journal: 'A page in your pack says Factor Pike paid for a killing. Shale\'s sheriff would want it. Pike would pay to have it back. Either way, it is worth more than paper.',
      objectives: [
        { id: 'ada', text: 'Show the page to Sheriff Vey', done: { flag: 'ledger_shown_ada' }, optional: true },
        { id: 'pike', text: 'Sell it back to Pike', done: { flag: 'ledger_sold' }, optional: true },
      ],
      next: [{ if: { flag: 'ledger_shown_ada' }, stage: 'shown' }, { if: { flag: 'ledger_sold' }, stage: 'sold' }],
    },
    shown: { journal: 'Ada Vey read the page twice and folded it into her shirt. Pike is still at his post. Shale is a small town and the guild is not; but the sheriff knows now what the guild is for.', end: 'done' },
    sold: { journal: 'Pike bought his own page back, courteously, at the posted rate, and burned it in front of you. He will remember the courtesy. So will the guild.', end: 'done' },
  },
};

export const q_a1_signal: QuestDef = {
  id: 'q_a1_signal', title: 'The Hill with the Mast', act: 'a1', critical: true, start: 'track', xp: 300,
  routes: [
    { id: 'pay', kind: 'barter', label: 'Pay the Hollow their track toll (or a circuit board)' },
    { id: 'talk', kind: 'talk', label: 'Tell the Hollow the voice is your problem', requires: { skill: 'speech', gte: 40 } },
    { id: 'gully', kind: 'stealth', label: 'Climb the gully past the camp', requires: { skill: 'stealth', gte: 40 } },
    { id: 'fight', kind: 'fight', label: 'Clear the track' },
    { id: 'relay', kind: 'tech', label: 'Read the relay\'s traffic log', requires: { skill: 'science', gte: 35 } },
    { id: 'grid', kind: 'chrome', label: 'Listen through a grid link', requires: { chrome: 'ch_neural_link' } },
  ],
  stages: {
    track: {
      journal: 'The next pin on the map is a hill with a mast, a day east of Tollhouse 9 and north of the highway. The guild does not go up there. Something up there still answers the city.',
      objectives: [
        { id: 'reach', text: 'Find the track to Signal Hill', done: { flag: 'visited_signalhill' } },
        { id: 'camp', text: 'Get past the camp on the track', done: { flag: 'sg_camp_passed' } },
        { id: 'top', text: 'Reach the station', done: { flag: 'sg_station' } },
      ],
      next: [{ if: { flag: 'sg_station' }, stage: 'station' }],
    },
    station: {
      journal: 'A dead station with a live relay and a voice that reads the same list every night. Whatever the stranger\'s map is, this is where it is read from.',
      objectives: [
        { id: 'relay', text: 'Find out what the relay still answers', done: { knows: 'relay_answers_city' } },
        { id: 'voice', text: 'Listen to the voice in the station', done: { knows: 'name2_heard' }, optional: true },
        { id: 'cot', text: 'Someone slept here. Who?', done: { knows: 'stranger_slept_here' }, optional: true },
      ],
      next: [{ if: { knows: 'relay_answers_city' }, stage: 'done' }],
    },
    done: {
      journal: 'The relay at Signal Hill talks to something east and relays a nightly list west — to a pump station in the Sallow marked DW-4. Dry Wells. The map\'s road runs back toward home before it runs on.',
      end: 'done',
      onEnter: [{ learn: 'loc_drywells' }, { lead: 'l_relay_west_line' }],
    },
  },
};

export const q_a1_broadcast: QuestDef = {
  id: 'q_a1_broadcast', title: 'Signal Hill\'s Last Broadcast', act: 'a1', start: 'voice', xp: 120,
  routes: [
    { id: 'silence', kind: 'tech', label: 'Cut the speaker', requires: { skill: 'mechanics', gte: 30 } },
    { id: 'amplify', kind: 'tech', label: 'Put it on the mast for the whole Sallow', requires: { skill: 'science', gte: 45 } },
    { id: 'leave', kind: 'talk', label: 'Leave it reading' },
  ],
  stages: {
    voice: {
      journal: 'The voice in the station is reading the stranger\'s list aloud: the overpass, Kessler, day forty-five, killed by Vasha\'s hand. It will read it every night to nobody — unless it reads it to everybody.',
      objectives: [
        { id: 'cut', text: 'Silence it', done: { flag: 'broadcast_silenced' }, optional: true },
        { id: 'amp', text: 'Amplify it', done: { flag: 'broadcast_amplified' }, optional: true },
      ],
      next: [{ if: { flag: 'broadcast_silenced' }, stage: 'silenced' }, { if: { flag: 'broadcast_amplified' }, stage: 'amplified' }],
    },
    silenced: { journal: 'The speaker is cut. The list is still being sent; nobody on this hill will hear it read again.', end: 'done' },
    amplified: { journal: 'Every dead radio in the Sallow says the same five words at night now. The overpass will have heard it by morning. Kessler will have heard it. So will Vasha.', end: 'done' },
  },
};
