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
      onEnter: [{ learn: 'loc_drywells' }, { lead: 'l_relay_west_line' }, { quest: 'q_a1_drywells', start: true }],
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
      journal: 'Jonah Reese, Shale, within the month. The list did not say how. Shale is full of ways for an earnest young man to die — a fall, a fight, a fever — and if one road is blocked, whatever wrote his name will look for another. Prevention means changing the conditions. There is no clock to race: the month, whatever the list means by it, will not be over before the business east of here is settled.',
      objectives: [
        { id: 'ways', text: 'Find out how a deputy spends his days and nights', done: { all: [{ knows: 'jonah_climbs' }, { knows: 'jonah_patrols' }, { knows: 'jonah_drinks' }] } },
        { id: 'fall', text: 'Change the conditions of the fall', done: { flag: 'jonah_fall_blocked' }, optional: true },
        { id: 'fight', text: 'Change the conditions of the fight', done: { flag: 'jonah_fight_blocked' }, optional: true },
        { id: 'fever', text: 'Change the conditions of the fever', done: { flag: 'jonah_fever_blocked' }, optional: true },
        { id: 'day', text: 'The month ends', done: { flag: 'jonah_month_over' } },
      ],
      next: [
        { if: { all: [{ flag: 'jonah_month_over' }, { not: { flag: 'jonah_fall_blocked' } }] }, stage: 'fell' },
        { if: { all: [{ flag: 'jonah_month_over' }, { not: { flag: 'jonah_fight_blocked' } }] }, stage: 'fought' },
        { if: { all: [{ flag: 'jonah_month_over' }, { not: { flag: 'jonah_fever_blocked' } }] }, stage: 'fevered' },
        { if: { flag: 'jonah_month_over' }, stage: 'lived' },
      ],
    },
    fell: {
      journal: 'The month was out before you were back. Jonah Reese went up the windpump tower for the vane, the way he did every week, and a rung let go. Shale buried him behind the sheriff\'s office. The militia is four rifles again. The list was right.',
      end: 'done',
      onEnter: [{ set: 'jonah_dead' }, { set: 'jonah_death', value: 'fall' }, { set: 'shale_broke' }, { decision: { id: 'jonah_died', text: 'Jonah Reese died before the month was out, as the list said: a fall from the windpump tower.' } }, { news: { tag: 'jonah_dead', text: 'Deputy Reese fell from the windpump tower', valence: -30, size: 9, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'jonah_died', valence: -20, strength: 100 } }, { memory: { npc: 'npc_sh_09', tag: 'son_died', valence: -40, strength: 100 } }, { event: 'title', data: { text: 'THE MONTH\nTHE LIST WAS RIGHT' } }],
    },
    fought: {
      journal: 'The month was out before you were back. Jonah Reese walked the east street alone at midnight, the way he did, and four Dogs came in off the salt for nothing in particular. Shale buried him behind the sheriff\'s office. The militia is four rifles again. The list was right.',
      end: 'done',
      onEnter: [{ set: 'jonah_dead' }, { set: 'jonah_death', value: 'fight' }, { set: 'shale_broke' }, { decision: { id: 'jonah_died', text: 'Jonah Reese died before the month was out, as the list said: alone on the east street, against the Dogs.' } }, { news: { tag: 'jonah_dead', text: 'Deputy Reese was killed on the east street by Rust Dogs in the night', valence: -30, size: 9, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'jonah_died', valence: -20, strength: 100 } }, { memory: { npc: 'npc_sh_09', tag: 'son_died', valence: -40, strength: 100 } }, { rep: { faction: 'rust_dogs', fear: 10 } }, { event: 'title', data: { text: 'THE MONTH\nTHE LIST WAS RIGHT' } }],
    },
    fevered: {
      journal: 'The month was out before you were back. Jonah Reese drank last from the east cistern, the way the ration said, and the fever took four days to do what the tower and the Dogs had not. Shale buried him behind the sheriff\'s office. The militia is four rifles again. The list was right.',
      end: 'done',
      onEnter: [{ set: 'jonah_dead' }, { set: 'jonah_death', value: 'fever' }, { set: 'shale_broke' }, { decision: { id: 'jonah_died', text: 'Jonah Reese died before the month was out, as the list said: a fever from the east cistern.' } }, { news: { tag: 'jonah_dead', text: 'Deputy Reese died of a fever from the east cistern', valence: -30, size: 9, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'jonah_died', valence: -20, strength: 100 } }, { memory: { npc: 'npc_sh_09', tag: 'son_died', valence: -40, strength: 100 } }, { event: 'title', data: { text: 'THE MONTH\nTHE LIST WAS RIGHT' } }],
    },
    lived: {
      journal: 'The month is out, and Jonah Reese is alive. The tower, the street and the cistern each had their conditions changed, and the list — for the first time anyone knows of — was wrong. Whatever wrote it will have noticed.',
      end: 'done',
      onEnter: [{ set: 'jonah_lived' }, { set: 'forecast_broken' }, { set: 'plan_rerouted' }, { decision: { id: 'jonah_lived', text: 'Jonah Reese lived out the month. The first forecast anyone knows of was broken.' } }, { news: { tag: 'jonah_lived', text: 'the deputy is alive past the month, and people are counting', valence: 20, size: 7, at: 'shale' } }, { rep: { faction: 'shale_militia', respect: 15 } }, { memory: { npc: 'npc_sh_01', tag: 'jonah_lived', valence: 25, strength: 100 } }, { lead: 'l_forecast_broken' }, { event: 'title', data: { text: 'THE MONTH\nTHE LIST WAS WRONG' } }],
    },
  },
};

export const q_sh_drills: QuestDef = {
  id: 'q_sh_drills', title: 'Militia Drills', act: 'a1', start: 'drill', xp: 150,
  routes: [
    { id: 'drill', kind: 'talk', label: 'Dawn and dusk in the yard until nine rifles shoot' },
    { id: 'ilya', kind: 'talk', label: 'The drunk behind the yard: shame him sober, or take him east' },
  ],
  stages: {
    drill: {
      journal: 'Nine rifles, four that shoot. Drills at dawn and dusk with rounds Shale cannot spare, and from the first night nobody walks the street alone. Corporal Lind says a man who used to be the best shot in the Sallow drinks behind the yard.',
      objectives: [
        { id: 'days', text: 'Drill them until nine rifles shoot', done: { flag: 'militia_drilled' } },
        { id: 'ilya', text: 'The man behind the yard', done: { any: [{ flag: 'ilya_shamed' }, { flag: 'ilya_recruited' }, { flag: 'ilya_showed' }] }, optional: true },
      ],
      next: [{ if: { flag: 'militia_drilled' }, stage: 'done' }],
    },
    done: { journal: 'Nine rifles that shoot, pairs on the street at night, and Ada\'s signature on it. Shale is not safer; it is less alone.', end: 'done' },
  },
};

/** The Act 1 finale: the station that sets Shale's water, and the four things that can be done to it. */
const DW_END = (how: string, text: string) => [
  { set: 'jonah_month_over' }, { set: 'a1_finale', value: how },
  { decision: { id: `a1_water_${how}`, text } },
  { after: { minutes: 3, id: 'a1_end_card', effects: [{ event: 'title', data: { text: 'ACT ONE ENDS\nTHE WATER CLOCK' } }] } },
];

export const q_a1_drywells: QuestDef = {
  id: 'q_a1_drywells', title: 'The Water Clock', act: 'a1', critical: true, start: 'track', xp: 500,
  routes: [
    { id: 'science', kind: 'tech', label: 'Override the schedule at the console', requires: { skill: 'science', gte: 45 } },
    { id: 'word', kind: 'talk', label: 'The pump man\'s credential: Oriel Marr\'s key and her father\'s word' },
    { id: 'governor', kind: 'fight', label: 'Break the governor under the gauges', requires: { skill: 'mechanics', gte: 35 } },
    { id: 'sell', kind: 'barter', label: 'Sell the console to Factor Pike' },
    { id: 'diary', kind: 'knowledge', label: 'The pump man\'s diary has the word on its first page' },
    { id: 'keep', kind: 'knowledge', label: 'Leave the schedule as it is' },
  ],
  stages: {
    track: {
      journal: 'The line from Signal Hill runs west to a pump station marked DW-4: Dry Wells, a day east of Shale on a track nobody uses. Whatever sets Shale\'s water sits there. Somebody is living there too; the Tollmen call them ghosts.',
      objectives: [
        { id: 'reach', text: 'Find Dry Wells', done: { flag: 'visited_drywells' } },
        { id: 'perch', text: 'Get past the rifle on the approach', done: { flag: 'dw_admitted' } },
      ],
      next: [{ if: { flag: 'dw_admitted' }, stage: 'station' }],
    },
    station: {
      journal: 'The shacks are the family\'s; the station is Oriel Marr\'s; the room at the east end of the pump hall is locked and hums, and her father\'s key is on a cord round her neck. A lock can be picked and a door can be forced, and the family will remember which.',
      objectives: [
        { id: 'door', text: 'Open the room at the end of the station', done: { flag: 'dw_control_open' } },
        { id: 'who', text: 'Learn who the family are', done: { knows: 'dw_origin_known' }, optional: true },
        { id: 'diary', text: 'Read the pump man\'s diary', done: { knows: 'dw_diary_read' }, optional: true },
      ],
      next: [{ if: { flag: 'dw_control_open' }, stage: 'console' }],
    },
    console: {
      journal: 'DW-4 holds Shale at 0.62 of something, on a schedule changed from upstream. The console will take a new number from someone who can make it listen, or from the pump man\'s word; the governor under the gauges can be broken; Factor Pike would pay to hold what the console holds; or the schedule can be left as it is, which is also a choice. Whatever is decided here, the Sallow\'s business is done with and the road runs east.',
      objectives: [
        { id: 'read', text: 'Read the schedule', done: { knows: 'dw_schedule_read' } },
        { id: 'decide', text: 'Decide what Shale drinks', done: { flag: 'dw_outcome' } },
        { id: 'held', text: 'Find the line that is held constant', done: { knows: 'c9_fed_from_outside' }, optional: true, hidden: true },
      ],
      next: [
        { if: { flag: 'dw_restored' }, stage: 'restored' },
        { if: { flag: 'dw_freed' }, stage: 'freed' },
        { if: { flag: 'dw_sold' }, stage: 'sold' },
        { if: { flag: 'dw_kept' }, stage: 'kept' },
      ],
    },
    restored: {
      journal: 'SHALE — 1.00. The pumps run outside the clock now, and the last line in the station\'s log is yours. Shale will drink; something upstream will read the line. The road runs east.',
      end: 'done',
      onEnter: [...DW_END('restored', 'You set Shale\'s allocation at Dry Wells to the full measure.'), { news: { tag: 'water_restored', text: 'the pumps in the yard run twice as long as they did, and nobody changed anything in Shale', valence: 20, size: 9, at: 'shale' } }, { rep: { faction: 'shale_militia', respect: 15 } }, { rep: { faction: 'tollmen', respect: -5 } }, { set: 'dw_wardens_due' }],
    },
    freed: {
      journal: 'The governor is in pieces and the pumps run flat out, for Shale, until the aquifer or the bearings give up. The console has stopped pretending to know. The road runs east.',
      end: 'done',
      onEnter: [...DW_END('freed', 'You broke the governor at Dry Wells: Shale has all the water, for as long as it lasts.'), { news: { tag: 'water_freed', text: 'the pumps have not stopped since the night the salt-cut stranger came back from the east, and the north tank is overflowing into the street', valence: 15, size: 9, at: 'shale' } }, { rep: { faction: 'shale_militia', respect: 10 } }, { set: 'dw_wardens_due' }],
    },
    sold: {
      journal: 'Factor Pike has the console, a guild engineer has the chair, and Shale\'s water is sold by the measure, reliably. You have a hundred and fifty Tolls and a seat on a guild caravan east.',
      end: 'done',
      onEnter: [...DW_END('sold', 'You sold the Dry Wells console to the Tollmen for a hundred and fifty Tolls.'), { news: { tag: 'water_sold', text: 'the Tollmen have put an engineer on the Dry Wells station and water in the yard is sold by the measure', valence: -20, size: 9, at: 'shale' } }, { rep: { faction: 'tollmen', respect: 20 } }, { rep: { faction: 'shale_militia', respect: -15 } }, { set: 'shale_company_town' }],
    },
    kept: {
      journal: 'SHALE — 0.62. You stood in front of the thing that sets Shale\'s water and left it as it was. Shale thins on schedule, and whatever changed the number can change it back, and nothing upstream has noticed you. The road runs east.',
      end: 'done',
      onEnter: [...DW_END('kept', 'You left the Dry Wells schedule as you found it.'), { set: 'shale_withers' }],
    },
  },
};

/** Side quest: the family in the shacks, and where they end up. */
export const q_dw_ghosts: QuestDef = {
  id: 'q_dw_ghosts', title: 'Pump-Station Ghosts', act: 'a1', start: 'squat', xp: 150,
  routes: [
    { id: 'shale', kind: 'talk', label: 'Talk Sheriff Vey into taking them under her law' },
    { id: 'road', kind: 'barter', label: 'Pay their way east' },
    { id: 'leave', kind: 'knowledge', label: 'Leave them on their trickle and say nothing' },
  ],
  stages: {
    squat: {
      journal: 'Five people live in the scrap shacks at Dry Wells on a trickle tapped off Shale\'s line: three generations out of a cistern that failed. Shale does not know they exist; the Tollmen call them ghosts. Oriel Marr will go to Shale if the sheriff says yes and means it; she will take forty Tolls for the road; or she will stay, if nobody tells Shale about the valve.',
      objectives: [
        { id: 'ask', text: 'Ask Sheriff Vey whether Shale would have them', done: { flag: 'ada_ghosts_decided' }, optional: true },
        { id: 'decide', text: 'Settle what becomes of the family', done: { flag: 'dw_ghosts_decided' } },
      ],
      next: [
        { if: { flag: 'dw_ghosts_shale' }, stage: 'shale' },
        { if: { flag: 'dw_ghosts_moved' }, stage: 'moved' },
        { if: { all: [{ flag: 'dw_ghosts_left' }, { flag: 'dw_fight' }] }, stage: 'shot' },
        { if: { flag: 'dw_ghosts_left' }, stage: 'left' },
      ],
    },
    shale: { journal: 'The Marrs walked to Shale under Sheriff Vey\'s law and got the old tannery. Juno has a second street; Cato has no valve; Oriel has a chair that was built for sitting. Shale is five people bigger and does not know yet what that costs.', end: 'done' },
    moved: { journal: 'The Marrs took forty Tolls and the road east: the windpump graveyard, then the glass. Oriel\'s father walked it the other way. The shacks at Dry Wells are empty, and the valve is shut.', end: 'done' },
    left: { journal: 'The Marrs stay at Dry Wells on their trickle, and Shale was told nothing. When Shale comes, it comes; it was always going to.', end: 'done' },
    shot: { journal: 'You drew on the family at Dry Wells. What is left of them stays, because there is nowhere else, and Oriel Marr gave you the key with nothing in her voice at all.', end: 'failed' },
  },
};

/** The convoy on the white and what sat down beside it. */
export const q_sw_wreck: QuestDef = {
  id: 'q_sw_wreck', title: 'The Saltpan Wreck', act: 'a1', start: 'found', xp: 200,
  routes: [
    { id: 'cab', kind: 'stealth', label: 'Open the cab', requires: { skill: 'security', gte: 45 } },
    { id: 'wake', kind: 'tech', label: 'Wake the machine for Shale', requires: { skill: 'science', gte: 40 } },
    { id: 'sell', kind: 'barter', label: 'Sell the controller to Factor Pike' },
    { id: 'keep', kind: 'knowledge', label: 'Leave it sleeping and keep the controller' },
  ],
  stages: {
    found: {
      journal: 'A guild convoy truck on its side on the white pan, its skid half a mile long, its cab locked, and in a ring pressed into the crust beside it a machine the size of a dog that has not moved since it sat down. Something came down here, took the crew, and left that.',
      objectives: [
        { id: 'cab', text: 'Get into the cab', done: { item: 'k_hound_controller' } },
        { id: 'what', text: 'Find out what the convoy was carrying', done: { any: [{ item: 'k_convoy_manifest' }, { knows: 'sp_hound_make' }] }, optional: true },
        { id: 'decide', text: 'Decide what the machine is for', done: { flag: 'hound_outcome' } },
      ],
      next: [{ if: { flag: 'hound_for_shale' }, stage: 'shale' }, { if: { flag: 'hound_sold' }, stage: 'sold' }, { if: { flag: 'hound_kept' }, stage: 'kept' }],
    },
    shale: { journal: 'The machine stood up for you and walked to Shale at your heel, and sits in the sheriff\'s yard now, and nothing comes into the town at night that it does not look at first. Somewhere east, whoever made it will want to know where it went.', end: 'done', onEnter: [{ set: 'shale_has_hound' }, { lead: 'l_hound_in_shale' }] },
    sold: { journal: 'Factor Pike has the controller and the guild will have the machine. A hundred and fifty Tolls, and the knowledge that the Tollmen now own something that can stand up.', end: 'done' },
    kept: { journal: 'The machine sleeps in its ring on the pan, and the slab that wakes it is in your pack, warm. Nobody east knows that yet.', end: 'done' },
  },
};

/** Green fruit, a low wall, and two who come over it. */
export const q_orchard: QuestDef = {
  id: 'q_orchard', title: 'Orchard Thieves', act: 'a1', start: 'thefts', xp: 150,
  routes: [
    { id: 'wall', kind: 'survival', label: 'Read the wall', requires: { skill: 'survival', gte: 20 } },
    { id: 'talk', kind: 'talk', label: 'Talk them into sitting down', requires: { skill: 'speech', gte: 30 } },
    { id: 'wren', kind: 'talk', label: 'Wren knows their names' },
  ],
  stages: {
    thefts: {
      journal: 'Twice a week something comes over the north wall of the Choir\'s orchard and takes the green fruit, which nobody takes. Brother Anselm wants it to stop and does not want anyone hurt, and knows those are two different things.',
      objectives: [
        { id: 'wall', text: 'Look at the north wall', done: { knows: 'or_wall_seen' } },
        { id: 'who', text: 'Find out who comes over it', done: { any: [{ knows: 'or_leavings_dog' }, { knows: 'or_prints_kids' }, { knows: 'or_two_small' }] } },
        { id: 'wait', text: 'Wait for them by the beds after the lamps are out', done: { flag: 'or_thieves_caught' } },
      ],
      next: [{ if: { flag: 'or_thieves_choir' }, stage: 'choir' }, { if: { flag: 'or_thieves_returned' }, stage: 'returned' }, { if: { flag: 'or_thieves_cell' }, stage: 'cell' }, { if: { flag: 'or_thieves_let_go' }, stage: 'let_go' }],
    },
    choir: { journal: 'Kip and Mote sleep in the Choir\'s tents now and eat first. The overpass has two fewer mouths and will decide later whether that was a theft.', end: 'done' },
    returned: { journal: 'You walked the two of them back to the overpass in the dark. Whoever is short there is shorter; the Dogs remember who brought their children home; the wall will be robbed again when they are hungry.', end: 'done' },
    cell: { journal: 'Two children in Sheriff Vey\'s cell, with blankets, while she sends to the overpass and the overpass decides whether they are its. Anselm asked you not to hurt them, and meant something larger.', end: 'done' },
    let_go: { journal: 'They went over the wall with the sack. Anselm leaves the green ones on the wall now and calls it a tithe. The sky is open; so is the wall.', end: 'done' },
  },
};

/** Riding beside a wagon with a gun and not shooting it: the Wheel's salt to Tollhouse 9. */
export const q_a1_escort: QuestDef = {
  id: 'q_a1_escort', title: 'Salt to the Tollhouse', act: 'a1', start: 'ride', xp: 150,
  routes: [{ id: 'ride', kind: 'survival', label: 'Keep the wagon in your eye to Tollhouse 9' }],
  stages: {
    ride: {
      journal: 'The Wheel\'s salt wagon goes to Tollhouse 9 with the Tollmen\'s caravan, and the guild\'s guards guard the guild\'s wagons. Walk the Tollhouse road from Shale beside it; whatever the road asks for, it is asking the Wheel. Sixty Tolls at the gate.',
      objectives: [{ id: 'arrive', text: 'Reach Tollhouse 9 with the wagon', done: { at: 'tollhouse' } }],
      next: [{ if: { at: 'tollhouse' }, stage: 'paid' }],
    },
    paid: {
      journal: 'The salt is weighed at the gate and the Wheel\'s wagon goes in on the guild\'s count. Sixty Tolls, and the Wheel remembers who rode.',
      onEnter: [{ give: 'tolls', count: 60 }, { rep: { faction: 'wheel', respect: 8 } }, { rep: { faction: 'tollmen', respect: 3 } }, { set: 'escort_active', value: false }, { learn: 'escort_done' }, { news: { tag: 'escort_wheel', text: 'The Wheel\'s salt got to the Tollhouse with a stranger walking beside it.', valence: 1, at: 'tollhouse' } }],
      end: 'done',
    },
  },
};

/** Factor Pike will pay anything for viable seed, and will not say for whom. */
export const q_a1_seed: QuestDef = {
  id: 'q_a1_seed', title: 'Seed at Any Price', act: 'a1', start: 'fetch', xp: 200,
  routes: [
    { id: 'sell', kind: 'barter', label: 'Sell the Cistern\'s seed to the guild' },
    { id: 'give', kind: 'talk', label: 'Put it under the open sky with the Choir' },
  ],
  stages: {
    fetch: {
      journal: 'Factor Pike buys viable seed at absurd prices, in advance, for a client east of the Teeth he will not name. Cistern 9 kept a seed bank for ninety years; the Elder keeps its key. The guild would pay a great deal. The Choir would plant it.',
      objectives: [{ id: 'case', text: 'Get a case of viable seed from the Cistern', done: { item: 'k_seed_case' } }],
      next: [{ if: { item: 'k_seed_case' }, stage: 'deliver' }],
    },
    deliver: {
      journal: 'The case is cold in your pack. Pike at the Tollmen post pays in Tolls and standing; Sister Calla or Brother Anselm would put it in the ground.',
      objectives: [
        { id: 'sell', text: 'Sell it to Factor Pike', done: { knows: 'seed_sold_pike' }, optional: true },
        { id: 'give', text: 'Give it to the Choir', done: { knows: 'seed_given_choir' }, optional: true },
      ],
      next: [{ if: { knows: 'seed_sold_pike' }, stage: 'sold' }, { if: { knows: 'seed_given_choir' }, stage: 'given' }],
    },
    sold: { journal: 'The guild has the Cistern\'s seed, and a client east of the Teeth will have it after them. The Tolls were real. So was the look on Calla\'s face when she heard.', end: 'done' },
    given: { journal: 'The Cistern\'s seed is in the Choir\'s beds under the open sky. Pike heard, and wrote something in a ledger. Anselm says the first beans in a fortnight.', end: 'done' },
  },
};

/** Three on cots and one of her. */
export const q_a1_tents: QuestDef = {
  id: 'q_a1_tents', title: 'The Choir Tent', act: 'a1', start: 'tend', xp: 150,
  routes: [{ id: 'tend', kind: 'medicine', label: 'See to the sick in the mission tent' }],
  stages: {
    tend: {
      journal: 'Sister Calla has three on cots and one of her: a dust-lung, a broken arm, a fever. She will take any pair of hands that can hold a cup steady.',
      objectives: [
        { id: 'a', text: 'See to the old man with the dust-lung', done: { knows: 'tent_a_done' } },
        { id: 'b', text: 'See to the girl with the broken arm', done: { knows: 'tent_b_done' } },
        { id: 'c', text: 'See to the man with the fever', done: { knows: 'tent_c_done' } },
      ],
      next: [{ if: { all: [{ knows: 'tent_a_done' }, { knows: 'tent_b_done' }, { knows: 'tent_c_done' }] }, stage: 'tended' }],
    },
    tended: {
      journal: 'Three seen to. Calla will want to say something about it; she usually does.',
      objectives: [{ id: 'calla', text: 'Tell Sister Calla', done: { knows: 'tents_thanked' } }],
      next: [{ if: { knows: 'tents_thanked' }, stage: 'done_stage' }],
    },
    done_stage: { journal: 'The Choir calls you a lay healer now, which Calla says is a way of saying they trust your hands. What you did about the girl is between you and the sky.', end: 'done' },
  },
};

/** Mags wants her books looked at by someone who can read numbers. */
export const q_a1_books: QuestDef = {
  id: 'q_a1_books', title: 'Mags\'s Ledger', act: 'a1', start: 'audit', xp: 180,
  routes: [
    { id: 'expose', kind: 'talk', label: 'Tell the sheriff who owns the saloon' },
    { id: 'squeeze', kind: 'talk', label: 'Make silence worth something' },
    { id: 'help', kind: 'barter', label: 'Make the books balance for her' },
  ],
  stages: {
    audit: {
      journal: 'Mags has handed you two ledgers and a night\'s room for reading them. She says it is to catch a thieving barman. Read them.',
      objectives: [{ id: 'read', text: 'Read the Dry Well\'s books', done: { any: [{ knows: 'mags_cooked' }, { knows: 'mags_books_clean' }] } }],
      next: [{ if: { knows: 'mags_cooked' }, stage: 'decide' }, { if: { knows: 'mags_books_clean' }, stage: 'clean' }],
    },
    decide: {
      journal: 'The second ledger\'s margins are in a guild hand. The Dry Well is held against a Tollmen loan Mags cannot pay, and the buyout is signed: on paper the saloon is Pike\'s, and the town does not know. She wants it to stay that way.',
      objectives: [
        { id: 'expose', text: 'Tell Sheriff Vey', done: { knows: 'mags_exposed' }, optional: true },
        { id: 'squeeze', text: 'Name a price for silence', done: { knows: 'mags_squeezed' }, optional: true },
        { id: 'help', text: 'Make the books balance', done: { knows: 'mags_helped' }, optional: true },
      ],
      next: [{ if: { knows: 'mags_exposed' }, stage: 'exposed' }, { if: { knows: 'mags_squeezed' }, stage: 'squeezed' }, { if: { knows: 'mags_helped' }, stage: 'helped' }],
    },
    clean: { journal: 'Two ledgers, water in and water out. If there is a thief, it is not in the numbers. Mags paid you twenty and looked relieved about the wrong thing.', end: 'done' },
    exposed: { journal: 'Shale knows the Dry Well is guild property. Mags will not pour for you again. Ada says the town needed to know and does not look as if she enjoyed it.', end: 'done' },
    squeezed: { journal: 'A hundred and fifty Tolls, and Mags\'s silence bought with hers. She remembers it every time she sees you.', end: 'done' },
    helped: { journal: 'The books balance now, in a way that will survive a guild clerk\'s lamp. The room upstairs is yours for nothing, for as long as there is a Dry Well.', end: 'done' },
  },
};

/** A letter from a man who has not been outside in ninety years, to a woman in Shale. */
export const q_a1_bram: QuestDef = {
  id: 'q_a1_bram', title: 'A Letter for Bram', act: 'a1', start: 'carry', xp: 120,
  routes: [
    { id: 'truth', kind: 'talk', label: 'Carry back the truth' },
    { id: 'kind', kind: 'talk', label: 'Carry back a kindness' },
  ],
  stages: {
    carry: {
      journal: 'Bram gave you a letter sealed with machine grease, for a woman called Edda Vale in Shale. He asked you not to read it. He did not say how he knows her.',
      objectives: [{ id: 'find', text: 'Find Edda Vale in Shale', done: { knows: 'edda_found' } }],
      next: [{ if: { knows: 'edda_found' }, stage: 'answer' }],
    },
    answer: {
      journal: 'Edda Vale has been under the salt six years. Her daughter Hesper read the letter and went quiet for a long time. Something has to go back to the Cistern.',
      objectives: [{ id: 'back', text: 'Take an answer back to Bram', done: { any: [{ knows: 'bram_answered_truth' }, { knows: 'bram_answered_kind' }, { knows: 'bram_answered_told' }] } }],
      next: [{ if: { knows: 'bram_answered_kind' }, stage: 'kind' }, { if: { any: [{ knows: 'bram_answered_truth' }, { knows: 'bram_answered_told' }] }, stage: 'truth' }],
    },
    truth: { journal: 'Bram knows. He thanked you, which was worse than if he had not.', end: 'done' },
    kind: { journal: 'Bram has a letter from Edda Vale that Edda Vale did not write. He reads it at the machine when he thinks nobody is looking. He is happier than he was. You will have to live with the rest.', end: 'done' },
  },
};
