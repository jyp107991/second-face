import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * Signal Hill: the Hollow on the track, the relay that still answers something east, and the voice in the
 * station that reads the same words every night.
 */

const bye = { text: 'That\'s all.', exit: true };
const PASSED = (how: string, text: string) => [{ set: 'sg_camp_passed' }, { set: `sg_${how}` }, { decision: { id: `sg_${how}`, text } }, { xp: 40 }];

export const d_sg_camp: DialogueDef = {
  id: 'd_sg_camp', owner: 'npc_sg_01',
  start: [{ if: { flag: 'sg_fight' }, node: 'hostile' }, { if: { flag: 'sg_alert' }, node: 'alert' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Three of them come off the terrace at once: a big one with a pipe, a kid with something in each hand, and a woman with a zip gun and a hood who does the talking. "Track\'s closed. Hill\'s ours — the copper\'s ours. Whatever you\'re here for, it\'s on the other side of us."',
      passives: [
        { attr: 'senses', dc: 7, text: 'They are thin. The copper has not bought much yet.', effects: [{ learn: 'hollow_thin' }] },
        { skill: 'survival', dc: 30, text: 'West of the terrace a crack in the rock runs up past the camp. Goat track. Nobody is watching it.', effects: [{ learn: 'gully_seen' }] },
      ],
      options: [
        { id: 'camp.pay', text: '(Pay the track toll. 15 Tolls)', if: { item: 'tolls', count: 15 }, effects: [{ take: 'tolls', count: 15 }, ...PASSED('paid', 'You paid the Hollow fifteen Tolls to walk up Signal Hill.')], next: 'through' },
        { id: 'camp.board', text: '(Hold up a circuit board.) Worth more than the copper. For the track.', if: { item: 'j_electronics' }, effects: [{ take: 'j_electronics' }, ...PASSED('traded', 'You traded the Hollow a circuit board for the track up Signal Hill.'), { trust: { npc: 'npc_sg_01', by: 10 } }], next: 'through' },
        { id: 'camp.voice', text: 'I\'m not here for copper. I\'m here for the voice.', check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'hollow_thin' }, dc: -10, why: 'they want to be told it is somebody else\'s problem' }] }, effects: [...PASSED('talked', 'You talked the Hollow into letting you up Signal Hill: the voice is your problem now.')], next: 'voice', fail: 'voice_no' },
        { id: 'camp.wren', text: 'Wren Calloway walks with me. You know the name.', if: { inParty: 'npc_rd_03' }, effects: [...PASSED('wren', 'Wren\'s name opened the track up Signal Hill.'), { approval: { companion: 'npc_rd_03', by: 5 } }], next: 'wren' },
        { id: 'camp.fight', text: '(Draw.)', effects: [{ set: 'sg_fight' }, { set: 'sg_camp_passed' }, { decision: { id: 'sg_fought', text: 'You fought the Hollow on the track up Signal Hill.' } }, { event: 'combat' }], exit: true },
        { text: '(Back off.)', exit: true },
      ],
    },
    alert: {
      text: 'They are already standing, and the kid is already holding something. "Heard you in the gully," the woman says. "Track\'s closed. Twice as closed now."',
      options: [
        { id: 'camp.alert.pay', text: '(Pay. 30 Tolls)', if: { item: 'tolls', count: 30 }, effects: [{ take: 'tolls', count: 30 }, ...PASSED('paid', 'Caught in the gully, you paid the Hollow double to walk up Signal Hill.')], next: 'through' },
        { id: 'camp.alert.fight', text: '(Draw.)', effects: [{ set: 'sg_fight' }, { set: 'sg_camp_passed' }, { decision: { id: 'sg_fought', text: 'You fought the Hollow on the track up Signal Hill.' } }, { event: 'combat' }], exit: true },
        { text: '(Back off.)', exit: true },
      ],
    },
    through: { text: 'The big one steps aside, which is the whole of the Hollow\'s ceremony. "Don\'t take a light up," the woman says. "It talks louder when there\'s a light."', effects: [{ learn: 'voice_louder_light' }], options: [{ text: '(Go up.)', exit: true }] },
    voice: { text: 'The three of them look at each other, and something passes between them that is mostly relief. "Then it\'s yours," the woman says. "Pim went in once. Tell it we\'re only here for the copper."', effects: [{ learn: 'voice_louder_light' }, { trust: { npc: 'npc_sg_01', by: 5 } }], options: [{ text: '(Go up.)', exit: true }] },
    voice_no: { text: '"Everybody\'s here for the voice. Nobody says so." The zip gun doesn\'t move. "Fifteen."', options: [{ id: 'camp.voice.pay', text: '(Pay. 15 Tolls)', if: { item: 'tolls', count: 15 }, effects: [{ take: 'tolls', count: 15 }, ...PASSED('paid', 'You paid the Hollow fifteen Tolls to walk up Signal Hill.')], next: 'through' }, { id: 'camp.voice.fight', text: '(Draw.)', effects: [{ set: 'sg_fight' }, { set: 'sg_camp_passed' }, { event: 'combat' }], exit: true }, { text: '(Back off.)', exit: true }] },
    wren: { text: '"Calloway." The woman lowers the gun a hand\'s width. "She let my brother out of a cage once, for nothing, and then told him never to come back. Track\'s open. For her."', options: [{ text: '(Go up.)', exit: true }] },
    hostile: { text: 'Nobody is talking.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

export const d_sg_gully: DialogueDef = {
  id: 'd_sg_gully', owner: 'narrator',
  start: [{ node: 'mouth' }],
  nodes: {
    mouth: {
      text: 'A crack in the rock, dry, a goat\'s width, climbing west of the terrace where the camp is. Loose stone all the way up. The camp is thirty yards off and facing the other way.',
      options: [
        { id: 'gully.climb', text: '(Go up quietly.)', check: { skill: 'stealth', dc: 40, mods: [{ if: { hour: { from: 22, to: 5 } }, dc: -10, why: 'dark' }, { if: { inParty: 'npc_rd_03' }, dc: -10, why: 'Wren picks the stones you don\'t step on' }] }, effects: [{ set: 'sg_camp_passed' }, { set: 'sg_sneaked' }, { decision: { id: 'sg_sneaked', text: 'You went up Signal Hill by the gully, past the Hollow without a word.' } }, { xp: 50 }, { time: 25 }], next: 'up', fail: 'stone' },
        { text: '(Not this way.)', exit: true },
      ],
    },
    up: { text: 'Twenty-five minutes of loose stone and no sound you didn\'t make yourself. The gully opens onto the second climb above the camp. Below, the fire; nobody looking up.', options: [{ text: '(Go on.)', exit: true }] },
    stone: { text: 'A stone goes, and then three more, and a shout from the terrace. You come back down faster than you went up.', effects: [{ set: 'sg_alert' }, { time: 10 }], options: [{ text: '(Down.)', exit: true }] },
  },
};

export const d_sg_tally: DialogueDef = {
  id: 'd_sg_tally', owner: 'npc_sg_01',
  start: [{ if: { flag: 'sg_fight' }, node: 'hostile' }, { if: { flag: 'sg_tally_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"Tally. We\'re the Hollow, which is three people and a word." She pushes the hood back. "Copper buys water at the Tollhouse. Forty metres in that mast, if we can get it down without the light going out. It\'s gone out before. It came back."',
      effects: [{ set: 'sg_tally_met' }],
      options: [
        { id: 'tally.voice', text: 'The voice in the station.', next: 'voice', once: true },
        { id: 'tally.mask', text: 'A masked man came this way three weeks ago.', if: { quest: 'q_ch1_name', status: 'done' }, next: 'mask', once: true },
        { text: 'Trade.', effects: [{ event: 'barter' }], exit: true },
        bye,
      ],
    },
    again: { text: '"Still here. Still copper."', options: [{ id: 'tally.voice.again', text: 'The voice.', if: { not: { seen: 'tally.voice' } }, next: 'voice' }, { id: 'tally.mask.again', text: 'The masked man.', if: { all: [{ quest: 'q_ch1_name', status: 'done' }, { not: { seen: 'tally.mask' } }] }, next: 'mask' }, { text: 'Trade.', effects: [{ event: 'barter' }], exit: true }, bye] },
    voice: { text: '"Started again three weeks ago. Same words every night, same order — a place, a name, a number. Pim says it\'s a man reading. I say it\'s a thing that learned a man." She looks up the hill. "We don\'t go in. The copper\'s outside."', effects: [{ learn: 'voice_three_weeks' }, { lead: 'l_voice_restarted' }], options: [bye] },
    mask: { text: '"Sat up there a whole day. Didn\'t pay, didn\'t fight, just walked past Brick like he wasn\'t there, which Brick hasn\'t forgiven." She counts on her fingers. "Three weeks. Came down at night with his hand on the wall like a blind man, and went west." A beat. "That\'s when it started again. The voice."', effects: [{ learn: 'stranger_at_signal' }, { lead: 'l_stranger_signal' }], options: [bye] },
    hostile: { text: 'She is behind the crate with the zip gun.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

export const d_sg_relay: DialogueDef = {
  id: 'd_sg_relay', owner: 'narrator',
  start: [{ if: { flag: 'relay_done' }, node: 'again' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'A relay console older than the Burn, dust-grey, one green lamp alive on a panel of dead ones. The screen wakes when you touch the frame: RELAY 7 — LINK UP — UPSTREAM: ACK. A cursor, waiting for something it has waited ninety years for.',
      passives: [
        { skill: 'science', dc: 25, text: 'Upstream is east. The link is live: this station is still part of something that answers.', effects: [{ learn: 'relay_answers_city' }, { lead: 'l_relay_city' }] },
      ],
      options: [
        { id: 'relay.log', text: '(Read the traffic log.)', check: { skill: 'science', dc: 35, mods: [{ if: { origin: 'archive_clerk' }, dc: -15, why: 'record formats are your trade' }] }, next: 'log', fail: 'log_no' },
        { id: 'relay.link', text: '(Listen through the link.)', if: { chrome: 'ch_neural_link' }, next: 'grid' },
        { id: 'relay.ident', text: '(Type at the cursor.)', next: 'ident' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    log: {
      text: 'Inbound, nightly, from upstream: a bulletin, twelve lines, the same twelve each night, relayed to the speaker and to a second line that runs — you trace it on the panel — west. Toward the Sallow. Toward a pump station marked DW-4. Outbound, one entry, three weeks old: a request for the bulletin to stop. DENIED.',
      effects: [{ learn: 'relay_answers_city' }, { learn: 'relay_log_read' }, { lead: 'l_relay_city' }, { lead: 'l_relay_west_line' }, { lead: 'l_relay_denied' }, { xp: 50 }],
      options: [{ id: 'relay.ident2', text: '(Type at the cursor.)', next: 'ident' }, { id: 'relay.link2', text: '(Listen through the link.)', if: { chrome: 'ch_neural_link' }, next: 'grid' }, { text: '(Leave it.)', exit: true }],
    },
    log_no: { text: 'The log is a format you cannot read fast enough: the screen times out and the cursor comes back, patient.', effects: [{ time: 30 }], options: [{ id: 'relay.ident3', text: '(Type at the cursor.)', next: 'ident' }, { text: '(Leave it.)', exit: true }] },
    grid: {
      text: 'The link in your skull finds the relay before you have decided to let it. Not a voice: a weight of attention, east, enormous and tidy, that notices you the way a clerk notices a line. It reads you — your link\'s serial, your position, the hour — and files it. Then, politely, it waits.',
      effects: [{ learn: 'relay_grid_heard' }, { lead: 'l_relay_grid' }, { set: 'relay_done' }, { set: 'relay_grid_filed' }, { decision: { id: 'relay_grid', text: 'You listened to Signal Hill\'s relay through your grid link, and something east filed you.' } }, { xp: 60 }],
      options: [{ text: '(Pull out.)', exit: true }],
    },
    ident: {
      text: 'IDENT? says the screen. Whatever you type goes upstream, to whatever is there, and comes back as a line in somebody\'s book.',
      options: [
        { id: 'relay.name', text: '(Type your name.)', effects: [{ set: 'relay_done' }, { set: 'relay_named', value: 'true' }, { decision: { id: 'relay_named_true', text: 'You gave Signal Hill\'s relay your real name.' } }, { lead: 'l_relay_name' }], next: 'named' },
        { id: 'relay.false', text: '(Type a name that isn\'t yours.)', effects: [{ set: 'relay_done' }, { set: 'relay_named', value: 'false' }, { decision: { id: 'relay_named_false', text: 'You gave Signal Hill\'s relay a false name.' } }, { lead: 'l_relay_name' }], next: 'named' },
        { id: 'relay.none', text: '(Type nothing. Leave the cursor.)', effects: [{ set: 'relay_done' }, { set: 'relay_named', value: 'none' }, { decision: { id: 'relay_declined', text: 'You left Signal Hill\'s relay waiting for a name.' } }], next: 'declined' },
      ],
    },
    named: { text: 'The cursor eats it. UPSTREAM: ACK. The green lamp blinks once, and then, for the first time, a second lamp beside it comes on and stays on.', options: [{ text: '(Step back.)', exit: true }] },
    declined: { text: 'The cursor waits. It is good at it.', options: [{ text: '(Step back.)', exit: true }] },
    again: { text: 'RELAY 7 — LINK UP — UPSTREAM: ACK. The cursor, and the lamps.', options: [{ id: 'relay.log.again', text: '(Read the traffic log.)', if: { not: { knows: 'relay_log_read' } }, check: { skill: 'science', dc: 35 }, next: 'log', fail: 'log_no' }, { text: '(Leave it.)', exit: true }] },
  },
};

/** The looping voice: a bulletin, read aloud every night, that names the next pin on the map. */
export const d_sg_speaker: DialogueDef = {
  id: 'd_sg_speaker', owner: 'narrator',
  start: [{ if: { flag: 'broadcast_silenced' }, node: 'silent' }, { if: { flag: 'broadcast_amplified' }, node: 'loud' }, { if: { knows: 'name2_heard' }, node: 'again' }, { node: 'hear' }],
  nodes: {
    hear: {
      text: 'A horn speaker on a bracket, wire to the relay rack, and a voice in it: calm, male, not quite a man. "— the overpass. Kessler. Day forty-five. Killed, by the hand of Kade. The overpass. Kessler. Day forty-five —" It does not stop. It is reading a list, and it has reached this line.',
      effects: [{ learn: 'name2_heard' }, { learn: 'name2_decoded' }, { lead: 'l_broadcast_kessler' }, { quest: 'q_a1_broadcast', start: true }, { xp: 40 }],
      passives: [{ skill: 'science', dc: 30, text: 'The voice is synthesised from a sample. Under it, the carrier hums at the same pitch as the relay\'s green lamp flickers.', effects: [{ learn: 'voice_synthetic' }] }],
      options: [
        { id: 'spk.cut', text: '(Cut the speaker wire.)', check: { skill: 'mechanics', dc: 30 }, next: 'cut', fail: 'cut_no' },
        { id: 'spk.amp', text: '(Patch the speaker line into the mast feed. Let the Sallow hear it.)', check: { skill: 'science', dc: 45, mods: [{ if: { knows: 'relay_log_read' }, dc: -10, why: 'you have seen how the lines are routed' }] }, next: 'amp', fail: 'amp_no' },
        { text: '(Leave it reading.)', exit: true },
      ],
    },
    again: {
      text: '"— the overpass. Kessler. Day forty-five —"',
      options: [
        { id: 'spk.cut.again', text: '(Cut the speaker wire.)', check: { skill: 'mechanics', dc: 30 }, next: 'cut', fail: 'cut_no' },
        { id: 'spk.amp.again', text: '(Patch the speaker line into the mast feed.)', check: { skill: 'science', dc: 45, mods: [{ if: { knows: 'relay_log_read' }, dc: -10, why: 'you have seen how the lines are routed' }] }, next: 'amp', fail: 'amp_no' },
        { text: '(Leave it reading.)', exit: true },
      ],
    },
    cut: { text: 'The voice stops in the middle of a word. The relay\'s green lamp does not care. Somewhere east, a line in a book says the bulletin was delivered.', effects: [{ set: 'broadcast_silenced' }, { decision: { id: 'broadcast_silenced', text: 'You cut the speaker at Signal Hill and silenced the voice.' } }, { xp: 40 }], options: [{ text: '(Done.)', exit: true }] },
    cut_no: { text: 'The bracket is rusted to the wall and the wire is armoured. You bleed on it and it keeps reading.', effects: [{ time: 15 }], options: [{ text: '(Leave it.)', exit: true }] },
    amp: { text: 'The mast takes the line like it has been waiting for it. The red light steadies. Out there, in the Sallow, every dead radio with a working speaker says the same five words, and will, every night, until somebody stops it.', effects: [{ set: 'broadcast_amplified' }, { decision: { id: 'broadcast_amplified', text: 'You put Signal Hill\'s voice on the mast: the whole Sallow hears the forecast about Kessler.' } }, { news: { tag: 'broadcast_kessler', text: 'a voice from Signal Hill names Kessler and a day he dies', valence: -15, size: 9, at: 'rustdogs' } }, { news: { tag: 'broadcast_kessler', text: 'a voice on the dead radios names the Rust Dogs\' chief and a day', valence: -5, size: 7, at: 'shale' } }, { memory: { npc: 'npc_rd_01', tag: 'named_on_air', valence: -20, strength: 90 } }, { memory: { npc: 'npc_rd_02', tag: 'named_on_air', valence: -30, strength: 90 } }, { xp: 60 }], options: [{ text: '(Done.)', exit: true }] },
    amp_no: { text: 'You get the feed wrong twice; the second time the mast light goes out for a full minute and the Hollow, below, start shouting. It comes back. So does the voice.', effects: [{ time: 30 }, { learn: 'mast_light_out' }], options: [{ text: '(Leave it.)', exit: true }] },
    silent: { text: 'The speaker hangs cut on its bracket. The quiet in here is not empty.', options: [{ text: '(Leave it.)', exit: true }] },
    loud: { text: 'The speaker is quiet now; the mast is not. You can hear the mast through the wall.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_sg_mast: DialogueDef = {
  id: 'd_sg_mast', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Forty metres of lattice, guyed with cable the Hollow have been cutting from the bottom up, a red lamp at the top that blinks slow as a pulse. At the base, a feed cabinet with the station\'s line going in and nothing you can read going out.',
      passives: [{ skill: 'mechanics', dc: 30, text: 'The lamp runs off the relay\'s power, not a battery. Something is still paying for this.', effects: [{ learn: 'mast_powered' }] }],
      effects: [{ learn: 'seen_mast' }],
      options: [{ id: 'mast.climb', text: '(Climb it, to see the Sallow.)', check: { attr: 'brawn', dc: 6 }, next: 'view', fail: 'fall' }, { text: '(Leave it.)', exit: true }],
    },
    view: { text: 'Halfway up, hands black with old grease, the Sallow lays itself out: the highway like a scar, the salt pans white, the windpumps to the south-east in a dead line, and east, past the glass, a smudge on the sky that might be smoke and might be a city.', effects: [{ learn: 'loc_lm_sallow_02' }, { learn: 'loc_drywells' }, { lead: 'l_windpumps' }, { learn: 'seen_smudge_east' }, { xp: 30 }], options: [{ text: '(Come down.)', exit: true }] },
    fall: { text: 'Ten metres up a rung lets go. You hit the cabinet, not the rock, which is the difference between a bruise and the Hollow finding you in the morning.', effects: [{ time: 20 }], options: [{ text: '(Come down.)', exit: true }] },
  },
};

export const d_sg_cot: DialogueDef = {
  id: 'd_sg_cot', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: { look: { text: 'A cot somebody has slept on recently, the blanket folded with a care that doesn\'t belong up here. Under it, scratched into the frame with a nail: the half-sun sign, and a tally of days — twenty-six.', effects: [{ learn: 'stranger_slept_here' }, { lead: 'l_stranger_signal' }], options: [{ text: '(Leave it.)', exit: true }] } },
};
