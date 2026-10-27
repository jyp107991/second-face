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

/** The first name on the map, and the month it comes with. */
export const q_a1_jonah: QuestDef = {
  id: 'q_a1_jonah', title: 'The Month', act: 'a1', critical: true, start: 'month', xp: 400,
  routes: [
    { id: 'tower', kind: 'tech', label: 'Change the conditions of the fall (the windpump tower)' },
    { id: 'street', kind: 'talk', label: 'Change the conditions of the fight (drill the militia)' },
    { id: 'water', kind: 'medicine', label: 'Change the conditions of the fever (the east cistern)' },
    { id: 'watch', kind: 'knowledge', label: 'Do nothing, and see what the list does' },
  ],
  stages: {
    month: {
      journal: 'Jonah Reese, Shale, thirty days. The list did not say how. Shale is full of ways for an earnest young man to die — a fall, a fight, a fever — and if one road is blocked, whatever wrote his name will look for another. Prevention means changing the conditions, not the day.',
      objectives: [
        { id: 'ways', text: 'Find out how a deputy spends his days and nights', done: { all: [{ knows: 'jonah_climbs' }, { knows: 'jonah_patrols' }, { knows: 'jonah_drinks' }] } },
        { id: 'fall', text: 'Change the conditions of the fall', done: { flag: 'jonah_fall_blocked' }, optional: true },
        { id: 'fight', text: 'Change the conditions of the fight', done: { flag: 'jonah_fight_blocked' }, optional: true },
        { id: 'fever', text: 'Change the conditions of the fever', done: { flag: 'jonah_fever_blocked' }, optional: true },
        { id: 'day', text: 'Day thirty', done: { flag: 'jonah_month_over' } },
      ],
      next: [
        { if: { all: [{ flag: 'jonah_month_over' }, { not: { flag: 'jonah_fall_blocked' } }] }, stage: 'fell' },
        { if: { all: [{ flag: 'jonah_month_over' }, { not: { flag: 'jonah_fight_blocked' } }] }, stage: 'fought' },
        { if: { all: [{ flag: 'jonah_month_over' }, { not: { flag: 'jonah_fever_blocked' } }] }, stage: 'fevered' },
        { if: { flag: 'jonah_month_over' }, stage: 'lived' },
      ],
    },
    fell: {
      journal: 'Day thirty. Jonah Reese went up the windpump tower for the vane, the way he did every week, and a rung let go. Shale buried him behind the sheriff\'s office. The militia is four rifles again. The list was right.',
      end: 'done',
      onEnter: [{ set: 'jonah_dead' }, { set: 'jonah_death', value: 'fall' }, { set: 'shale_broke' }, { decision: { id: 'jonah_died', text: 'Jonah Reese died on day thirty, as the list said: a fall from the windpump tower.' } }, { news: { tag: 'jonah_dead', text: 'Deputy Reese fell from the windpump tower', valence: -30, size: 9, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'jonah_died', valence: -20, strength: 100 } }, { memory: { npc: 'npc_sh_09', tag: 'son_died', valence: -40, strength: 100 } }, { event: 'title', data: { text: 'DAY THIRTY\nTHE LIST WAS RIGHT' } }],
    },
    fought: {
      journal: 'Day thirty. Jonah Reese walked the east street alone at midnight, the way he did, and four Dogs came in off the salt for nothing in particular. Shale buried him behind the sheriff\'s office. The militia is four rifles again. The list was right.',
      end: 'done',
      onEnter: [{ set: 'jonah_dead' }, { set: 'jonah_death', value: 'fight' }, { set: 'shale_broke' }, { decision: { id: 'jonah_died', text: 'Jonah Reese died on day thirty, as the list said: alone on the east street, against the Dogs.' } }, { news: { tag: 'jonah_dead', text: 'Deputy Reese was killed on the east street by Rust Dogs in the night', valence: -30, size: 9, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'jonah_died', valence: -20, strength: 100 } }, { memory: { npc: 'npc_sh_09', tag: 'son_died', valence: -40, strength: 100 } }, { rep: { faction: 'rust_dogs', fear: 10 } }, { event: 'title', data: { text: 'DAY THIRTY\nTHE LIST WAS RIGHT' } }],
    },
    fevered: {
      journal: 'Day thirty. Jonah Reese drank last from the east cistern, the way the ration said, and the fever took four days to do what the tower and the Dogs had not. Shale buried him behind the sheriff\'s office. The militia is four rifles again. The list was right.',
      end: 'done',
      onEnter: [{ set: 'jonah_dead' }, { set: 'jonah_death', value: 'fever' }, { set: 'shale_broke' }, { decision: { id: 'jonah_died', text: 'Jonah Reese died on day thirty, as the list said: a fever from the east cistern.' } }, { news: { tag: 'jonah_dead', text: 'Deputy Reese died of a fever from the east cistern', valence: -30, size: 9, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'jonah_died', valence: -20, strength: 100 } }, { memory: { npc: 'npc_sh_09', tag: 'son_died', valence: -40, strength: 100 } }, { event: 'title', data: { text: 'DAY THIRTY\nTHE LIST WAS RIGHT' } }],
    },
    lived: {
      journal: 'Day thirty. Jonah Reese is alive. The tower, the street and the cistern each had their conditions changed, and the list — for the first time anyone knows of — was wrong. Whatever wrote it will have noticed.',
      end: 'done',
      onEnter: [{ set: 'jonah_lived' }, { set: 'forecast_broken' }, { set: 'plan_rerouted' }, { decision: { id: 'jonah_lived', text: 'Jonah Reese lived past day thirty. The first forecast anyone knows of was broken.' } }, { news: { tag: 'jonah_lived', text: 'the deputy is alive on the thirty-first day, and people are counting', valence: 20, size: 7, at: 'shale' } }, { rep: { faction: 'shale_militia', respect: 15 } }, { memory: { npc: 'npc_sh_01', tag: 'jonah_lived', valence: 25, strength: 100 } }, { lead: 'l_forecast_broken' }, { event: 'title', data: { text: 'DAY THIRTY\nTHE LIST WAS WRONG' } }],
    },
  },
};

export const q_sh_drills: QuestDef = {
  id: 'q_sh_drills', title: 'Militia Drills', act: 'a1', start: 'drill', xp: 150,
  routes: [
    { id: 'drill', kind: 'talk', label: 'Three days of dawn and dusk in the yard' },
    { id: 'ilya', kind: 'talk', label: 'The drunk behind the yard: shame him sober, or take him east' },
  ],
  stages: {
    drill: {
      journal: 'Nine rifles, four that shoot. Three days of drills, dawn and dusk, with rounds Shale cannot spare. Corporal Lind says a man who used to be the best shot in the Sallow drinks behind the yard.',
      objectives: [
        { id: 'days', text: 'Three days of drills', done: { flag: 'militia_drilled' } },
        { id: 'ilya', text: 'The man behind the yard', done: { any: [{ flag: 'ilya_shamed' }, { flag: 'ilya_recruited' }, { flag: 'ilya_showed' }] }, optional: true },
      ],
      next: [{ if: { flag: 'militia_drilled' }, stage: 'done' }],
    },
    done: { journal: 'Nine rifles that shoot, pairs on the street at night, and Ada\'s signature on it. Shale is not safer; it is less alone.', end: 'done' },
  },
};
