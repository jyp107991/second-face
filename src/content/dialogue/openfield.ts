import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { QUESTS } from '../quests';

/**
 * Openfield: the Choir's farms in the glass, every third row dying. The Elder calls it blight; the well knows
 * better. The shrine, the hatch under the common hall, the burial ground and the man digging in it.
 */

/** Companions who can come to Openfield with the player in Act 2 (U7 interjections): the three from the Sallow, Odile from
 * Ninebridge, and Ash once he has left the burial ground with them. */
const TAMSIN = 'npc_c9_03';
const WREN = 'npc_rd_03';
const ILYA = 'npc_sh_17';
const ODILE = 'npc_nb_03';
const ASH = 'npc_of_03';

const bye = { text: 'That\'s all.', exit: true };
const NIGHT = { hour: { from: 0, to: 4 } };
// The Broker's board at Old Market: two knit kits for the sick hall.
const GIG_KITS: Cond = { all: [{ item: 'c_knitkit', count: 2 }, { quest: 'q_gig_meds' }, { not: { flag: 'gig_meds_delivered' } }] };
const GIG_KITS_DONE: Effect[] = [{ take: 'c_knitkit', count: 2 }, { set: 'gig_meds_delivered' }, { trust: { npc: 'npc_of_05', by: 15 } }, { rep: { faction: 'choir', respect: 3 } }, { xp: 30 }];
const KNOWN = { knows: 'of_poisoner_known' };
const FOUND = [{ learn: 'of_poisoner_known' }, { lead: 'l_tobias_nights' }, { xp: 80 }];
const EXPOSE = [{ set: 'of_blight_outcome', value: 'exposed' }, { set: 'of_tobias_caught' }, { xp: 150 }];
const MERCY = [{ set: 'of_blight_outcome', value: 'mercy' }, { set: 'of_tobias_caught' }, { xp: 150 }];
const UNWRITTEN = [{ set: 'of_blight_outcome', value: 'unwritten' }, { set: 'of_tobias_caught' }, { xp: 150 }, { trust: { npc: 'npc_of_02', by: 20 } }];

// ---------------------------------------------------------------- things

export const d_of_well: DialogueDef = {
  id: 'd_of_well', owner: 'narrator',
  start: [{ if: { flag: 'of_well_clean' }, node: 'clean' }, { if: { all: [NIGHT, { not: KNOWN }] }, node: 'night' }, { node: 'day' }],
  nodes: {
    day: {
      text: 'The well: a wheel on a timber frame over a shaft, a pipe to two stone troughs, north and south. The north trough feeds the field rows; the south, the halls. Moss on the south trough. The north one is clean as a plate.',
      again: 'The wheel, the two troughs: moss on the south, the north scoured clean.',
      passives: [{ attr: 'senses', dc: 7, text: 'Clean because it is scoured — nothing grows in it. There is a bitter smell off the north water that the south water does not have.', effects: [{ learn: 'of_well_smell' }] }],
      options: [
        { id: 'well.test', text: '(Test the two troughs.)', if: { not: { knows: 'of_well_dosed' } }, check: { skill: 'science', dc: 40, mods: [{ if: { knows: 'of_well_smell' }, dc: -5, why: 'you know which trough to test' }] }, next: 'test_ok', fail: 'test_no' },
        { id: 'well.tracks', text: '(Read the ground round the north trough.)', if: { not: KNOWN }, check: { skill: 'survival', dc: 40 }, next: 'tracks_ok', fail: 'tracks_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    test_ok: { text: 'Iodine from the healer\'s shelf, a tin cup, patience. The south trough stays brown. The north goes the grey-green of a thing that should not be drunk: a metal salt, dosed, not leached. The glass did not do this. Someone did, at the north trough, at night.', effects: [{ learn: 'of_well_dosed' }, { lead: 'l_well_powder' }, { xp: 50 }], options: [{ text: '(Dosed.)', exit: true }] },
    test_no: { text: 'Both troughs taste of stone. Without a reagent you cannot say more than the Elder says: something is wrong with the water and the rows.', options: [{ text: '(Leave it.)', exit: true }] },
    tracks_ok: { text: 'One set of boots comes to the north trough every night — the dust is beaten flat in a line nobody else walks — and goes back west, not to the halls but to the small hut past the seed store. A man\'s boots, heavy on the left. The Elder\'s son walks like that.', effects: [...FOUND, { learn: 'of_tracks_read' }], options: [{ text: '(The son.)', exit: true }] },
    tracks_no: { text: 'Forty people drink here. The ground is a page everyone has written on.', options: [{ text: '(Leave it.)', exit: true }] },
    night: {
      text: 'The well in the dark. The windpump creaks over the burial ground; the halls are shut. The north trough is a black mouth.',
      again: 'The north trough, black. Nothing has come to it yet tonight.',
      options: [
        { id: 'well.wait', text: '(Wait in the dark by the north trough.)', check: { skill: 'stealth', dc: 35 }, next: 'caught_well', fail: 'wait_no' },
        { text: '(Go to bed.)', exit: true },
      ],
    },
    wait_no: { text: 'An hour, and cold, and your boot finds the bucket. Somewhere a lantern that was coming toward the well goes out and does not come back tonight.', effects: [{ time: 60 }, { set: 'of_stakeout_blown' }], options: [{ text: '(Go to bed.)', exit: true }] },
    caught_well: {
      text: 'A lantern, hooded. A man with a pouch, kneeling at the north trough, shaking something into the water with the care of a man salting bread. He does not hear you until you are beside him. Tobias Mason looks up, and does not run, and says, very tired, "Don\'t tell him. Let me tell you why first."',
      effects: [...FOUND, { set: 'of_tobias_caught_night' }],
      options: [{ text: 'Why.', next: 'why' }],
    },
    why: {
      text: 'He takes a paper from his shirt, worn soft as cloth. OPENFIELD — HARVEST ABOVE PLAN — THE LONG NIGHT — BURNS. "The guild sells these. I bought one with a year\'s seed money. If we grow, we burn: that\'s what the city\'s machine has written for us, and the guild knows it, and my father sings." He puts it away. "Every third row. Enough to stay small. Nobody dies of it." He does not look at the sick hall when he says that.',
      interject: [{ companion: ILYA, text: 'Ilya has gone very still. "If you grow," he says, "you burn." His hand finds the pocket of his jacket where he keeps a letter, and stays there. "Right."' }],
      effects: [{ lead: 'l_openfield_sheet' }, { learn: 'of_tobias_why' }],
      options: [
        { id: 'well.expose', text: 'Your father hears it from you, tonight, or from me in the morning.', effects: EXPOSE, next: 'exposed' },
        { id: 'well.mercy', text: 'Stop. Give me the pouch and the paper. I keep both, and your father keeps his son.', effects: [...MERCY, { give: 'k_tobias_sheet' }], next: 'mercy' },
        { id: 'well.unwritten', text: 'Your sister keeps a door for people who break forecasts. Let\'s see what she thinks of how you did it.', if: { knows: 'petra_keeps_door' }, effects: UNWRITTEN, next: 'unwritten' },
        { id: 'well.draw', text: '(Draw.)', effects: [{ set: 'of_fight' }, { decision: { id: 'of_drew', text: 'You drew on Tobias Mason at Openfield\'s well.' } }, { event: 'combat' }], exit: true },
      ],
    },
    exposed: { text: 'He goes grey in the lantern light and nods, once, the way his father nods. "Tonight, then." He walks to the Elder\'s house with the pouch in his hand and does not look back, and the light in that window burns until dawn.', effects: [{ time: 60 }], options: [{ text: '(Leave them to it.)', exit: true }] },
    mercy: { text: 'He gives you the pouch, and the paper, and stands there with his hands empty like a man who has put down something heavier than either. "The north rows will come back in a month," he says. "If we burn, you\'ll know why." He goes to bed. You stand at the well a while.', options: [{ text: '(Go.)', exit: true }] },
    unwritten: { text: 'He looks at the common hall, where the hatch is, and something in him that has been very tired for a year gives up arguing. "Petra." Not a question. He walks there himself. The hatch closes on both of them and the lantern stays on the deck.', options: [{ text: '(Go.)', exit: true }] },
    clean: { text: 'The well. Both troughs run brown and ordinary now, and the north rows have put out new leaves at the base, small and greedy.', again: 'Two brown troughs, and green coming back in the north rows.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_of_board: DialogueDef = {
  id: 'd_of_board', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'The notice post. Chalk, in a careful hand: WATER FROM THE SOUTH TROUGH ONLY. SICK HALL: ASK IMRE. SKY-SONG AT DUSK. And a guild paper nailed under it, wax seal and half-moon: THE EXCHANGE AT NINEBRIDGE WILL BUY OPENFIELD\'S HARVEST IN ADVANCE AT A FUTURE\'S PRICE. ASK FOR VAIL. Somebody has drawn a half-sun over the half-moon.', again: 'SOUTH TROUGH ONLY. SKY-SONG AT DUSK. The guild\'s paper under it, with its half-sun drawn over.', effects: [{ learn: 'of_guild_offer' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_of_shrine: DialogueDef = {
  id: 'd_of_shrine', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'A post with a sign on it: half a sun, no ground under it, painted and repainted until the wood under the paint is a different shape. Round it, benches and a fire that is kept in all night. There is nothing else to the shrine. The sky is the rest.', again: 'The half-sun on its post, the benches, the fire kept in.', effects: [{ learn: 'sigil_seen' }, { learn: 'of_shrine_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_of_tally: DialogueDef = {
  id: 'd_of_tally', owner: 'narrator',
  start: [{ if: { all: [NIGHT, { not: { knows: 'of_seed_hollin' } }] }, node: 'night' }, { node: 'read' }],
  nodes: {
    read: {
      text: 'The seed tally, in Doria\'s hand: crates at dusk, crates at dawn, a line between. Fourteen, thirteen. Thirteen, twelve. Twelve, eleven. Every night for a week, one, like a clock.',
      again: 'Doria\'s tally: dusk, dawn, a line between, and the numbers going down one at a time.',
      effects: [{ quest: 'q_of_seed', start: true }, { learn: 'of_seed_heard' }],
      passives: [{ attr: 'wits', dc: 7, text: 'One crate, every night, never two, never a broken lock: that is not a thief grabbing. That is someone with a key, filling an order.', effects: [{ learn: 'of_seed_key' }] }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
    night: {
      text: 'The store in the dark, the crates in their rows, the tally pale on the table.',
      again: 'The store, dark. The crates. Nobody yet.',
      options: [{ id: 'tally.wait', text: '(Wait behind the shelves.)', check: { skill: 'stealth', dc: 35 }, next: 'seen', fail: 'seen_no' }, { text: '(Go to bed.)', exit: true }],
    },
    seen: { text: 'An hour past midnight the door opens on a key and Ishan Kadam, the yard hand from the Sump, lifts a crate onto his shoulder as if it were his, and goes out east along the lane toward the guild buyer\'s tent. He does not hurry. Nobody hurries who has done a thing six times.', effects: [{ learn: 'of_seed_hollin' }, { lead: 'l_seed_corso' }, { xp: 60 }], options: [{ text: '(Follow him out.)', exit: true }] },
    seen_no: { text: 'A shelf board creaks under your hand. Footsteps outside stop, and go away, and nothing walks tonight.', effects: [{ time: 60 }], options: [{ text: '(Go to bed.)', exit: true }] },
  },
};

export const d_of_cellar: DialogueDef = {
  id: 'd_of_cellar', owner: 'narrator',
  start: [{ if: { flag: 'unwritten_met' }, node: 'again' }, { if: { flag: 'of_cellar_open' }, node: 'inside' }, { node: 'hatch' }],
  nodes: {
    hatch: {
      text: 'A hatch in the hall floor at the far west end, iron, with a ring and no lock you can see. Someone has swept round it, carefully, so that the sweeping shows.',
      again: 'The iron hatch, and the careful sweeping round it.',
      options: [
        { id: 'hatch.word', text: '(Say it to the iron.) "Larkspur."', if: { knows: 'word_larkspur' }, effects: [{ set: 'of_cellar_open' }, { set: 'petra_word' }, { xp: 40 }], next: 'opens' },
        { id: 'hatch.sibling', text: '(Knock the way Petra knocked.)', if: { all: [{ member: 'choir', rank: 'sibling' }, { trust: { npc: 'npc_of_02', gte: 15 } }] }, effects: [{ set: 'of_cellar_open' }, { xp: 40 }], next: 'opens' },
        { id: 'hatch.force', text: '(Pull the ring.)', next: 'locked' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    locked: { text: 'The ring turns and the hatch does not. Bolted from below, and below there is somebody who has stopped breathing to listen.', effects: [{ memory: { npc: 'npc_of_02', tag: 'pulled_hatch', valence: -10, strength: 50 } }], options: [{ text: '(Leave it.)', exit: true }] },
    opens: { text: 'A bolt goes back under the floor. The hatch lifts on its own, and under it is a ladder and a lamp and Petra Mason\'s face, looking up, not surprised.', options: [{ text: '(Go down.)', next: 'inside' }] },
    inside: {
      text: 'A cellar cut into the glass, dry and cold. Grey scarves on pegs. No mirror, no drawing, no photograph of anyone; on the wall a board with twelve pins in it and a road between them, like the map in your pack, except that here the names are written plain. Petra waits until you have seen that. "Hollis Dray," she says. "The man who died at your door. He was ours. He took that list out of the city\'s tower so the people on it would know, and the guild shot him for it on the highway, and he walked to you anyway." She lets it sit. "We are the Unwritten. We keep no likeness. The city\'s machine makes its forecasts from faces; a face it has never seen, it cannot write. That is the whole of our religion, and it is not a kind one."',
      interject: [{ companion: WREN, text: '"Dray." Wren says it under her breath, the way she says a road\'s name to keep it. "Hollis Dray." Her hand has gone to the inside of her jacket, where she keeps paper, and she does not say anything else.' }],
      effects: [{ learn: 'stranger_name' }, { lead: 'l_stranger_unwritten' }, { set: 'unwritten_met' }, { learn: 'unwritten_what' }, { decision: { id: 'unwritten_met', text: 'Petra Mason showed you the cellar under Openfield and told you the stranger\'s name.' } }, { xp: 120 }],
      options: [
        { id: 'cellar.photo', text: 'There\'s a photograph of me. Older. In a city.', if: { item: 'k_photo' }, next: 'photo' },
        { id: 'cellar.kill', text: 'Not a kind one.', next: 'kill' },
        { text: '(Go up.)', exit: true },
      ],
    },
    photo: { text: 'She does not ask to see it. "Then the machine has your face, and has written you, and that is what it wrote. Hollis carried it to you so you would know what they want you to become." She looks at the board. "You are a pin on this. So is my father. So is a boy called Jonah in Shale, if he is still alive." A beat. "Keep it covered. Don\'t let the guild see it. And don\'t ask me yet to burn it; you\'re not ready to hear what I\'d say."', effects: [{ learn: 'unwritten_photo' }], options: [{ text: 'Not a kind one, you said.', next: 'kill' }, { text: '(Go up.)', exit: true }] },
    kill: { text: '"Some of us break a forecast by killing the person it is about." She says it like weather. "If the machine says a man rises, and he is dead, the machine was wrong, and the Plan slips a notch. I don\'t do it. Some of us do. I won\'t tell you which, and you should not tell anyone on that board that you have been down here." She turns the lamp down. "When Openfield has been through its night, come and ask me what we are for. Not before."', effects: [{ lead: 'l_unwritten_kill' }, { learn: 'unwritten_kill' }], options: [{ text: '(Go up.)', exit: true }] },
    again: { text: 'The cellar. The scarves, the board, the twelve pins. Petra is not here; the lamp is lit anyway, which is how the Unwritten say *welcome*.', again: 'The lamp, lit for nobody. The twelve pins.', options: [{ text: '(Go up.)', exit: true }] },
  },
};

export const d_of_grave: DialogueDef = {
  id: 'd_of_grave', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A fresh cairn, small. The stones are still the colour of the ground they came from. No name — the Choir cuts none — but somebody has left a child\'s cup on top, the kind with a chipped lip.', again: 'The small cairn, and the cup with the chipped lip.', effects: [{ learn: 'of_child_grave' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_of_burial: DialogueDef = {
  id: 'd_of_burial', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'A sign at the burial ground\'s edge: UNDER THE OPEN SKY. NO NAMES. NO LIKENESS. WHAT IS NOT WRITTEN IS FREE. Rows of cairns under a windpump that turns for no one.', again: 'NO NAMES. NO LIKENESS. WHAT IS NOT WRITTEN IS FREE.', effects: [{ learn: 'sigil_unwritten' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_of_bench: DialogueDef = {
  id: 'd_of_bench', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A bench of planks in the son\'s hut, with tools on it, and a crate under it pushed back further than tools need. The lamp beside it has been trimmed so often the wick is a stub.', again: 'The bench, the crate pushed too far under it, the stub of a wick.', effects: [{ learn: 'of_bench_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_of_windpump: DialogueDef = {
  id: 'd_of_windpump', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A windpump over the burial ground with no pipe under it any more, turning because the wind says so. The Choir left it standing because the dead like a sound, Petra says, and because it is the tallest thing in the glass and the city can see it from the towers.', again: 'The windpump turns over the cairns, pumping nothing.', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_of_sheet_read: DialogueDef = {
  id: 'd_of_sheet_read', owner: 'narrator',
  // (what the sheet tells is learned once: a later reading is only the paper)
  start: [{ if: { flag: 'of_sheet_read' }, node: 'reread' }, { node: 'read' }],
  nodes: {
    read: { text: 'OPENFIELD — HARVEST ABOVE PLAN — THE LONG NIGHT — BURNS. Guild paper, seal long broken, the fold worn through. It was under the bench in Tobias Mason\'s hut with a pouch of grey salt and a bottle of iodine to wash his hands after.', effects: [{ set: 'of_sheet_read' }, { learn: 'of_poisoner_known' }, { lead: 'l_openfield_sheet' }, { lead: 'l_tobias_nights' }, { learn: 'of_tobias_why' }, { xp: 60 }], options: [{ text: '(Fold it.)', exit: true }] },
    reread: { text: 'OPENFIELD — HARVEST ABOVE PLAN — THE LONG NIGHT — BURNS. The fold is wearing through in your pack the way it wore through in his.', again: 'BURNS. The fold, wearing through.', options: [{ text: '(Fold it.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- people

export const d_of_mason: DialogueDef = {
  id: 'd_of_mason', owner: 'npc_of_01',
  start: [{ if: { flag: 'of_tobias_dead' }, node: 'grief' }, { if: { flag: 'of_blight_outcome', eq: 'exposed' }, node: 'after_exposed' }, { if: { flag: 'of_mason_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old man with a farmer\'s hands and a grey scarf, who has been counting rows so long he counts you too, from habit. "Elder Mason. Sit, friend; nobody here will ask you to sing." He looks past you at the fields. "You\'ll have seen the third rows. Everyone sees them. Nobody can tell me why."',
      effects: [{ set: 'of_mason_met' }, { learn: 'mason_seen' }],
      options: [
        { id: 'mason.blight', text: 'What\'s killing them?', next: 'blight' },
        { id: 'mason.word', text: 'Sister Calla said a man here would know a word. Larkspur.', if: { lead: 'l_larkspur_calla' }, next: 'word', once: true },
        { id: 'mason.seed', text: 'The Cistern\'s seed case. Calla sent it on?', if: { knows: 'seed_given_choir' }, next: 'seed', once: true },
        { id: 'mason.guild', text: 'The guild wants your harvest.', if: { knows: 'of_guild_offer' }, next: 'guild', once: true },
        { id: 'mason.son', text: 'Your son is dosing the north trough. Every night.', if: { all: [KNOWN, { not: { flag: 'of_blight_outcome' } }] }, next: 'son' },
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'a2_openfield_done' }, text: '"The rows are coming back." He says it to the fields, not to you. "Thank you is a small word. I\'ll say it anyway."' }, { text: '"Friend." He has a row to finish.' }],
      again: 'He counts a row with his eyes, and comes back to you at the end of it.',
      options: [
        { id: 'mason.blight.again', text: 'The rows.', if: { not: { flag: 'of_blight_told' } }, next: 'blight' },
        { id: 'mason.word.again', text: 'Calla said a man here would know a word. Larkspur.', if: { all: [{ lead: 'l_larkspur_calla' }, { not: { seen: 'mason.word' } }] }, next: 'word' },
        { id: 'mason.seed.again', text: 'The Cistern\'s seed case.', if: { all: [{ knows: 'seed_given_choir' }, { not: { seen: 'mason.seed' } }] }, next: 'seed' },
        { id: 'mason.guild.again', text: 'The guild wants your harvest.', if: { all: [{ knows: 'of_guild_offer' }, { not: { seen: 'mason.guild' } }] }, next: 'guild' },
        { id: 'mason.son.again', text: 'Your son is dosing the north trough.', if: { all: [KNOWN, { not: { flag: 'of_blight_outcome' } }] }, next: 'son' },
        { id: 'mason.ash', text: 'Brother Ash. I\'m going east. I\'d take him.', if: { all: [{ flag: 'a2_openfield_done' }, { not: { flag: 'ash_blessed' } }, { not: { flag: 'ash_joined' } }] }, next: 'ash' },
        { id: 'mason.rite', text: 'Petra says the Choir\'s door is a burial.', if: { all: [{ not: { flag: 'sky_rite' } }, { quest: 'q_of_rite', status: 'none' }] }, next: 'rite' },
        bye,
      ],
    },
    blight: {
      text: '"Every third row. Leaves curl, the root goes soft, it smells sweet. We pull it, we burn it, it comes again in the same rows, never the rows between." He turns his hands over. "Forty years in the glass and I have never seen blight that could count. Imre says the sick in the hall didn\'t catch it off the plants. Benedek says he saw a light at the well, which Benedek says about most things." He looks at you. "You came up the lane like someone who finds things out. Find this out. I\'ll feed you and I\'ll owe you, and the Choir pays its debts under the sky."',
      effects: [{ set: 'of_blight_told' }, { quest: 'q_a2_openfield', start: true }, { learn: 'of_benedek_light' }],
      options: [{ text: 'I\'ll look at the well.', exit: true }, { text: 'Tell me about the sick.', next: 'sick' }],
    },
    sick: { text: '"Three in the hall. A child. Shaking hands, bad stomachs, no fever. Imre boils everything now and it\'s stopped, mostly." He does not say what he thinks that means. He has decided not to think it.', effects: [{ learn: 'of_sick_no_fever' }], options: [bye] },
    word: { text: 'He is quiet for a while. "Not me. I\'m a farmer; I don\'t keep that kind of door." He looks toward the shrine, where his daughter is. "My daughter keeps it. Say it to her, not to me, and not where anyone from the bridge can hear."', effects: [{ learn: 'petra_keeps_door' }], options: [bye] },
    seed: { text: '"She did. Ninety years in the cold under the Cistern and it came up in nine days in the north rows." His face changes. "The north rows." He looks at the fields and the thing he will not think about gets closer. "Tomato and millet. Dying first, with the rest."', interject: [{ companion: TAMSIN, text: '"Our seed," Tamsin says. "From the cold room. Ninety years and it comes up in nine days and then — " She looks at the north rows and stops talking, which for her is a great deal.' }], effects: [{ learn: 'of_cistern_seed_north' }, { trust: { npc: 'npc_of_01', by: 10 } }], options: [bye] },
    guild: { text: '"Nakai. He wants to buy the harvest before it\'s grown, at a price that would feed us through two winters, and the guild would carry the risk." He almost smiles. "I asked him what the guild knows about my fields that I don\'t. He said *the future*, and smiled, and I have not slept well since."', effects: [{ learn: 'mason_guild_doubt' }], options: [bye] },
    son: {
      text: 'He does not say *no*. That is the worst of it: he does not say no, he sits down on the bench by the well and looks at his hands for a long time, and then he says, "Show me," and you do, and he reads the paper his son bought with a year\'s seed money, and reads it again. "Burns," he says. "If we grow." He folds it. "He thought he was keeping us. He was." He stands up, old. "Fetch him to me. I\'ll do the rest myself."',
      interject: [{ companion: ODILE, text: '"That\'s a floor sheet," Odile says quietly, when he has folded it. "Sealed, at the price of a year\'s seed. I know the hand that writes them out." Nobody thanks her for knowing.' }],
      effects: EXPOSE,
      options: [{ text: '(Fetch him.)', next: 'son_done' }],
    },
    son_done: { text: 'What the Elder says to his son is said in the house with the door shut. When it opens, Tobias walks to the track with a pack and does not look at the fields, and his father stands at the well until the lamp-post comes on, and then goes to the shrine and sits with the fire and does not sing.', effects: [{ time: 120 }], options: [{ text: '(Leave him.)', exit: true }] },
    after_exposed: { text: 'He is at the well, or the shrine, or in the rows, the way he always was, and he speaks to you kindly, and there is a place behind his eyes where his son was and the door to it is shut. "The rows are coming back," he says. "Thank you is a small word."', again: 'He nods to you from the rows, kindly, and goes on with the row.', options: [{ id: 'mason.ash.ex', text: 'Brother Ash. I\'m going east. I\'d take him.', if: { all: [{ not: { flag: 'ash_blessed' } }, { not: { flag: 'ash_joined' } }] }, next: 'ash' }, { id: 'mason.rite.ex', text: 'Petra says the Choir\'s door is a burial.', if: { all: [{ not: { flag: 'sky_rite' } }, { quest: 'q_of_rite', status: 'none' }] }, next: 'rite' }, bye] },
    ash: { text: '"Ash came to us with a shotgun and a thing he would not say, and dug for a year before he\'d sing. He\'s the best of us now, which he\'d deny." The Elder looks at the burial ground. "He asked me yesterday whether he should go with you. I said the sky would tell him. The sky told him yes, apparently; it usually agrees with him." He nods. "Take him. Bring him back, or don\'t, but don\'t waste him."', effects: [{ set: 'ash_blessed' }, { trust: { npc: 'npc_of_03', by: 10 } }], options: [bye] },
    rite: { text: '"It is. We bury what we lost under the sky, and say its name once, and never cut it in stone. Then you\'re ours, as much as anyone is anyone\'s." He looks at you. "Everyone has someone. Petra will say the words. Go when you\'re ready; the sky waits."', effects: [{ quest: 'q_of_rite', start: true }], options: [bye] },
    grief: { text: 'The Elder is at the burial ground, where the newest cairn is, and does not turn round when you come, and will not, and the Choir has stopped singing at dusk for a month.', again: 'The Elder at the newest cairn, with his back to you. He does not turn round.', effects: [{ memory: { npc: 'npc_of_01', tag: 'son_dead', valence: -60, strength: 100 } }], options: [{ text: '(Leave him.)', exit: true }] },
  },
};

export const d_of_petra: DialogueDef = {
  id: 'd_of_petra', owner: 'npc_of_02',
  start: [{ if: { flag: 'of_tobias_dead' }, node: 'dead' }, { if: { flag: 'petra_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman by the shrine fire with a grey scarf up to her eyes and a machete she does not pretend not to have. "Don\'t look at me long. Don\'t describe me to anyone. That\'s not rudeness; it\'s the religion." She looks at you, though, carefully, and then at the sky, as if checking you against it. "Petra. The Elder\'s. You came from the bridge; you smell of its paper."',
      effects: [{ set: 'petra_met' }, { learn: 'petra_seen' }],
      options: [
        { id: 'petra.choir', text: 'What is the Choir?', next: 'choir', once: true },
        { id: 'petra.word', text: '"Larkspur."', if: { knows: 'word_larkspur' }, next: 'word', once: true },
        { id: 'petra.door', text: 'Your father says you keep a door.', if: { knows: 'petra_keeps_door' }, next: 'door', once: true },
        { id: 'petra.rite', text: 'The Choir\'s door is a burial, your father says.', if: { not: { flag: 'sky_rite' } }, next: 'rite' },
        { id: 'petra.rows', text: 'The third rows.', if: { not: { flag: 'of_blight_outcome' } }, next: 'rows', once: true },
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'of_blight_outcome', eq: 'unwritten' }, text: '"My brother is below, being argued with. He may be ours by spring. He may be nothing." She feeds the fire. "You did a harder thing than telling my father. I noticed."' }, { if: { flag: 'unwritten_met' }, text: '"You\'ve seen the board. Don\'t tell me what you think of it yet."' }, { text: '"The sky\'s still up."' }],
      again: 'She feeds the fire a stick, and looks at you over the scarf, and waits.',
      options: [
        { id: 'petra.choir.again', text: 'What is the Choir?', if: { not: { seen: 'petra.choir' } }, next: 'choir' },
        { id: 'petra.word.again', text: '"Larkspur."', if: { all: [{ knows: 'word_larkspur' }, { not: { seen: 'petra.word' } }] }, next: 'word' },
        { id: 'petra.door.again', text: 'Your father says you keep a door.', if: { all: [{ knows: 'petra_keeps_door' }, { not: { seen: 'petra.door' } }] }, next: 'door' },
        { id: 'petra.rite.again', text: 'The rite.', if: { not: { flag: 'sky_rite' } }, next: 'rite' },
        { id: 'petra.rows.again', text: 'The third rows.', if: { all: [{ not: { flag: 'of_blight_outcome' } }, { not: { seen: 'petra.rows' } }] }, next: 'rows' },
        bye,
      ],
    },
    choir: { text: '"People who decided the sky was the only thing left worth praying to, because it was the only thing that hadn\'t been written." She says *written* like a curse. "We farm. We heal. We bury without names. The city\'s machine keeps a face for everyone it has seen; we try to give it nothing to keep."', interject: [{ companion: TAMSIN, text: '"Nothing to keep," Tamsin says. "The fridge kept everything. Every ration, every name, every cough." She says it like a joke and it does not come out like one.' }], effects: [{ learn: 'choir_what' }], options: [bye] },
    word: { text: 'She goes very still, and then she does a strange thing: she pulls the scarf down and lets you see her whole face, once, the way you would show a wound. "Then he reached you. Then it was worth it." The scarf goes up. "The hatch under the common hall. Say that to the iron. Come alone." ', effects: [{ set: 'petra_word' }, { set: 'of_cellar_open' }, { trust: { npc: 'npc_of_02', by: 25 } }, { learn: 'petra_keeps_door' }], options: [bye] },
    door: { text: '"I keep several. Which one you get depends on what you bring." She looks at the fire. "Bring me the word a dying man said, or bring me a cairn you raised, and we\'ll see."', effects: [{ learn: 'petra_door_terms' }], options: [bye] },
    rite: {
      text: '"It is. Everyone has someone." She stands. "The burial ground, under the windpump. You raise the stones yourself; I say the words; you say a name once and never again. Then you\'re a sister of the Open Sky, or a brother, and the halls are yours from Shale to the city." She waits. "Who?"',
      effects: [{ quest: 'q_of_rite', start: true }],
      options: [
        { id: 'rite.stranger', text: 'The man who died at my door.', next: 'cairn' },
        { id: 'rite.jonah', text: 'Jonah Reese.', if: { flag: 'jonah_dead' }, next: 'cairn' },
        { id: 'rite.before', text: 'Someone from before.', next: 'cairn' },
        { text: 'No one. Not yet.', exit: true },
      ],
    },
    cairn: {
      text: 'You carry stones from the glass-crust to the burial ground, one at a time, because that is the rule, and build them under the windpump while the sky goes from white to red. Petra says the words, which are short and not about anyone in particular. You say the name once. The wind takes it. She puts one stone from the cairn in your hand. "Sister," she says, or "brother," and the Choir at the shrine fire sings the sky-song, which has no words at all.',
      interject: [{ companion: ASH, text: 'Ash carries the last stone up from the glass without being asked, and sets it on with you, and stands back. "There\'s a weight to that," he says. "You\'ll feel it in the morning, friend. It\'s meant."' }],
      effects: [{ set: 'sky_rite' }, { give: 'k_sky_token' }, { enlist: 'choir', rank: 'sibling' }, { promote: { faction: 'choir', rank: 'sibling' } }, { trust: { npc: 'npc_of_02', by: 15 } }, { rep: { faction: 'choir', respect: 15 } }, { approval: { companion: 'npc_of_03', by: 10 } }, { time: 90 }, { xp: 100 }],
      options: [{ text: '(Keep the stone.)', exit: true }],
    },
    rows: { text: '"Blight." She says it the way her father does, and then, because she is not her father: "Blight that counts. Something is being done to us, and I don\'t know by whom, and I would like to." She looks toward the small hut past the store and does not look away quite fast enough.', effects: [{ learn: 'petra_suspects' }], options: [bye] },
    dead: { text: 'She is at the burial ground, at the newest cairn, with her scarf down, and she looks at you with nothing in her face at all. "Go east," she says. "Don\'t come back through here."', again: 'Petra at the cairn, scarf down, looking through you. She has said all she will say.', effects: [{ memory: { npc: 'npc_of_02', tag: 'brother_dead', valence: -50, strength: 100 } }], options: [{ text: '(Go.)', exit: true }] },
  },
};

// Ash's arc (U8): four talks at the fire, a telling at Openfield's seed store, a red line, a break and a floor.
// Stages read the flags his own talks set; plan and approval ladder in story/U8_ash_SECRET.md.
const ASH_IN: Cond = { inParty: ASH };
const ASH_FLOOR: Cond = { approval: { companion: ASH, lte: -30 } };
const ASH_BAND = (gte: number): Cond => ({ approval: { companion: ASH, gte } });
/** Turning on the Choir before its long night: a cut of its seed taken in his sight, or, after the vow at the windpump,
 * service with its enemies above the bottom rank (a factor's hand, a warden's grey). He says so before it happens. */
const ASH_REDLINE: Cond = { any: [{ flag: 'ash_saw_cut' }, { all: [{ flag: 'sky_rite' }, { any: [{ member: 'tollmen', rank: 'hand' }, { member: 'wardens', rank: 'warden' }] }] }] };
/** One of Meridian's own lines settled (the Masque, High Water, Turf): the city has shown what it costs. */
const MD_LINE: Cond = { any: [{ quest: 'q_cr_masque', status: 'done' }, { quest: 'q_sk_highwater', status: 'done' }, { quest: 'q_bw_turf', status: 'done' }] };
/** His line's journal (q_comp_ash) once that quest is registered; the flags carry the arc either way. */
const ASH_JOURNAL: Effect[] = QUESTS.q_comp_ash ? [{ quest: 'q_comp_ash', start: true }] : [];
const ORDERS_KNOWN: Cond = { all: [{ knows: 'md_magistrate_designate' }, { flag: 'ash_gully_outcome' }, { not: { flag: 'ash_orders_known' } }] };

export const d_of_ash: DialogueDef = {
  id: 'd_of_ash', owner: 'npc_of_03',
  start: [
    { if: { all: [ASH_IN, ASH_REDLINE] }, node: 'redline' },
    { if: { all: [ASH_IN, { flag: 'cr_celestine_dead' }, { not: { flag: 'ash_cup_done' } }] }, node: 'cup' },
    { if: { all: [ASH_IN, ASH_FLOOR, { flag: 'ash_won_back' }] }, node: 'floor_final' },
    { if: { all: [ASH_IN, ASH_FLOOR] }, node: 'floor' },
    { if: { all: [ASH_IN, { flag: 'at_camp' }] }, node: 'camp' },
    { if: ASH_IN, node: 'party' },
    { if: { flag: 'ash_gone' }, node: 'gone' },
    { if: { all: [{ flag: 'ash_left' }, { not: { flag: 'ash_won_back' } }] }, node: 'left' },
    { if: { flag: 'ash_joined' }, node: 'waiting' },
    { if: { flag: 'of_tobias_dead' }, node: 'refuse' },
    { if: { flag: 'ash_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A big, gaunt man digging in the burial ground with a shotgun leaned on a cairn and a grey scarf on a cord, who does not stop digging to look at you. "Friend." He gets another spade of glass-crust out. "There\'s a weight to a thing like a grave. People think it\'s the stones. It\'s the digging."',
      effects: [{ set: 'ash_met' }, { learn: 'ash_seen' }],
      passives: [{ attr: 'senses', dc: 7, text: 'Under the scarf, at the collarbone, the end of an old scar that is not a scar: a dog\'s head, burned off the way the stranger burned his mark. Rust Dog work.', effects: [{ learn: 'ash_was_dog' }] }],
      options: [
        { id: 'ash.grave', text: 'Whose grave?', next: 'grave', once: true },
        { id: 'ash.dog', text: 'You were a Dog.', if: { knows: 'ash_was_dog' }, next: 'dog', once: true },
        { id: 'ash.wren', text: '(Let Wren speak.)', if: { all: [{ inParty: 'npc_rd_03' }, { knows: 'ash_was_dog' }] }, next: 'wren', once: true },
        { id: 'ash.join', text: 'Come east.', if: { all: [{ flag: 'a2_openfield_done' }, { any: [{ flag: 'ash_blessed' }, { flag: 'sky_rite' }] }, { not: ASH_REDLINE }] }, next: 'join' },
        { id: 'ash.join.turned', text: 'Come east.', if: { all: [{ flag: 'a2_openfield_done' }, ASH_REDLINE] }, next: 'turned' },
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'a2_openfield_done' }, text: '"The rows are coming back." He leans on the spade. "You did that. There\'s a weight to that too, friend. A good one."' }, { text: '"Friend." The spade goes in.' }],
      again: 'He gets out another spade of glass-crust and waits, leaning on the handle.',
      options: [
        { id: 'ash.grave.again', text: 'Whose grave?', if: { not: { seen: 'ash.grave' } }, next: 'grave' },
        { id: 'ash.dog.again', text: 'You were a Dog.', if: { all: [{ knows: 'ash_was_dog' }, { not: { seen: 'ash.dog' } }] }, next: 'dog' },
        { id: 'ash.wren.again', text: '(Let Wren speak.)', if: { all: [{ inParty: 'npc_rd_03' }, { knows: 'ash_was_dog' }, { not: { seen: 'ash.wren' } }] }, next: 'wren' },
        { id: 'ash.join.again', text: 'Come east.', if: { all: [{ flag: 'a2_openfield_done' }, { any: [{ flag: 'ash_blessed' }, { flag: 'sky_rite' }] }, { not: ASH_REDLINE }] }, next: 'join' },
        { id: 'ash.join.turned.again', text: 'Come east.', if: { all: [{ flag: 'a2_openfield_done' }, ASH_REDLINE] }, next: 'turned' },
        { id: 'ash.join.no', text: 'Come east.', if: { all: [{ flag: 'a2_openfield_done' }, { not: { flag: 'ash_blessed' } }, { not: { flag: 'sky_rite' } }, { not: ASH_REDLINE }] }, next: 'not_yet' },
        bye,
      ],
    },
    grave: { text: '"Sem. Six. First the trough took." He does not stop. "The Choir says no names on the stones, so I say them while I dig. Sem, Sem, Sem. The soil doesn\'t mind." He looks up for the first time. "Somebody did that to the water. Soil forgives. I don\'t, yet. I\'m working on it."', effects: [{ learn: 'of_child_grave' }, { learn: 'ash_grief' }], options: [bye] },
    dog: { text: 'The spade stops. "I was." He does not touch the scarf. "Before the Elder. Before the sky. A long time before I knew what a weight was." He looks at you to see what you will do with it. "I burned the mark off myself with a lamp. Took three nights. If you\'re going to use it, use it now; I\'d rather carry it in daylight."', interject: [{ companion: ILYA, text: '"Three nights with a lamp," Ilya says. He looks at his own left hand, at the two fingers that aren\'t there. "Right." Ash looks back at him a while, and nods, as if something has been agreed.' }], effects: [{ learn: 'ash_admits_dog' }, { trust: { npc: 'npc_of_03', by: 10 } }], options: [{ text: 'I\'m not going to use it.', effects: [{ trust: { npc: 'npc_of_03', by: 15 } }], exit: true }, bye] },
    wren: { text: 'Wren looks at the burned place under the scarf for a long time, and he lets her. "I don\'t know you," she says finally. "No," he says. "You were a child. I was with Kessler\'s old man." She says nothing. Then: "Dig, then." And he does, and she stands there, and neither of them explains anything to you.', effects: [{ learn: 'ash_wren_met' }, { approval: { companion: 'npc_rd_03', by: 5 } }], options: [bye] },
    join: {
      text: 'He finishes the row of stones he is on, because you finish a row. Then he picks up the shotgun and puts the spade where the next person will find it. "The Elder said the sky would tell me. The sky doesn\'t talk, friend; that\'s the point of it. I\'m coming because the thing that was done to the water came from the city, and I want to see the city." He touches the scarf. "I count things out loud too, sometimes. Different things from your sniper."',
      effects: [{ join: 'npc_of_03' }, { set: 'ash_joined' }, { approval: { companion: 'npc_of_03', by: 10 } }, { decision: { id: 'ash_joined', text: 'Brother Ash of the Choir left Openfield\'s burial ground with you.' } }, { xp: 100 }],
      options: [{ text: '(Go.)', exit: true }],
    },
    not_yet: { text: '"Ask the Elder. Or raise a cairn here, so I know what you carry." He goes back to the row. "I don\'t go east with a stranger. I\'ve done that once."', again: '"Ask the Elder," he says, digging.', options: [bye] },
    turned: { text: '"You put a stone on a cairn at the windpump, and took the other side after." He doesn\'t stop digging. "I don\'t go east with that, friend."', again: 'He doesn\'t stop digging.', options: [bye] },
    refuse: { text: 'He is digging a grave that is not Sem\'s, and he does not look up, and the shotgun is not leaned on the cairn; it is across his back. "Not with that on you, friend. Walk on."', again: 'The spade goes in and comes out. The shotgun stays across his back. He has said what he will say.', options: [{ text: '(Walk on.)', exit: true }] },
    waiting: { text: '"Well?" The spade is already put away.', again: '"Still here, friend." He hasn\'t picked the spade back up.', options: [{ text: 'We\'re going.', effects: [{ join: 'npc_of_03' }], exit: true }, { text: 'Wait here a while.', exit: true }] },
    party: {
      text: [{ if: { at: 'openfield' }, text: '"Soil\'s good here. Everything else is what it is."' }, { text: '"There\'s a weight to the road. Good one, so far."' }],
      options: [
        { id: 'ash.party.doria', text: 'The seed store. Now, while she\'s counting.', if: { all: [{ at: 'openfield' }, { flag: 'ash_quest' }, { not: { flag: 'ash_gully_outcome' } }, { not: { dead: 'npc_of_06' } }] }, next: 'store' },
        { id: 'ash.party.doria.dead', text: 'Doria\'s cairn.', if: { all: [{ at: 'openfield' }, { flag: 'ash_quest' }, { not: { flag: 'ash_gully_outcome' } }, { dead: 'npc_of_06' }] }, next: 'store_grave' },
        { id: 'ash.party.wait', text: 'Wait here.', effects: [{ leave: 'npc_of_03' }], exit: true },
        { text: 'Keep up.', exit: true },
      ],
    },
    camp: {
      text: [
        { if: { flag: 'ash_orders', eq: 'refused' }, text: '"{name}." He says it the way he says a row is finished. "Sit. Fire\'s honest."' },
        { if: { all: [{ knows: 'ash_gully_hint' }, { flag: 'a2_cistern4_done' }, { not: { flag: 'ash_s2_done' } }, { approval: { companion: ASH, lte: 14 } }] }, text: 'He feeds the fire and doesn\'t look at you. Whatever he owes you the telling of, he hasn\'t decided yet that you\'re owed it.' },
        { text: '"Fire\'s honest. Say what you want to say to it and I\'ll listen in."' },
      ],
      again: 'Ash feeds the fire a stick. "Still honest," he says, and listens.',
      options: [
        { id: 'ash.camp.vow', text: 'You clean that shotgun every night.', if: { not: { flag: 'ash_s1_done' } }, next: 'vow' },
        { id: 'ash.camp.weight', text: 'What\'s the weight you carry?', if: { not: { knows: 'ash_gully_hint' } }, next: 'weight' },
        { id: 'ash.camp.sky', text: 'Does the sky answer?', if: { not: { knows: 'ash_sky' } }, next: 'sky' },
        { id: 'ash.camp.gully', text: 'The Gully. You said you\'d tell me.', if: { all: [{ knows: 'ash_gully_hint' }, { flag: 'a2_cistern4_done' }, { not: { flag: 'ash_s2_done' } }, ASH_BAND(15)] }, next: 'gully' },
        { id: 'ash.camp.orders', text: 'Something\'s been sitting on you since the gate.', if: { all: [ORDERS_KNOWN, ASH_BAND(35)] }, next: 'orders' },
        { id: 'ash.camp.scarf', text: '(His scarf is drying on a stick by the fire. Something stiff is sewn into the lining.)', if: { all: [ORDERS_KNOWN, { approval: { companion: ASH, lte: 34 } }, { not: { flag: 'ash_scarf_left' } }] }, next: 'scarf' },
        { id: 'ash.camp.choice', text: 'You\'ve been somewhere else all evening.', if: { all: [{ flag: 'ash_orders_known' }, MD_LINE, { not: { flag: 'ash_orders' } }] }, next: 'choice' },
        { id: 'ash.camp.card', text: 'You keep looking at my papers.', if: { all: [{ flag: 'sky_rite' }, { any: [{ member: 'wardens' }, { member: 'tollmen' }] }, { not: { flag: 'ash_card_done' } }] }, next: 'card' },
        { id: 'ash.camp.soil', text: 'What makes good soil?', if: { not: { flag: 'ash_soil_done' } }, next: 'soil' },
        { id: 'ash.camp.mason', text: 'Elder Mason. What is he to you?', if: { not: { flag: 'ash_mason_done' } }, next: 'mason' },
        { id: 'ash.camp.tobias.ex', text: 'Tobias.', if: { all: [{ flag: 'of_blight_outcome', eq: 'exposed' }, { not: { flag: 'ash_tobias_done' } }] }, next: 'tobias_exposed' },
        { id: 'ash.camp.tobias.mercy', text: 'Tobias.', if: { all: [{ flag: 'of_blight_outcome', eq: 'mercy' }, { not: { flag: 'ash_tobias_done' } }] }, next: 'tobias_mercy' },
        { id: 'ash.camp.tobias.unw', text: 'Tobias.', if: { all: [{ flag: 'of_blight_outcome', eq: 'unwritten' }, { not: { flag: 'ash_tobias_done' } }] }, next: 'tobias_unwritten' },
        { id: 'ash.camp.kessler', text: 'Kessler. Did you know him?', if: { all: [{ knows: 'ash_admits_dog' }, { not: { flag: 'ash_kessler_done' } }] }, next: 'kessler' },
        { id: 'ash.camp.sem', text: 'Sem. The boy in the grave you were digging.', if: { all: [{ knows: 'of_child_grave' }, { not: { flag: 'ash_sem_done' } }] }, next: 'sem' },
        { id: 'ash.camp.city', text: 'Meridian. What do you make of it?', if: { all: [{ flag: 'a2_precinct_done' }, { not: { flag: 'ash_city_done' } }] }, next: 'city' },
        { id: 'ash.camp.close', text: '(Sit closer to him.)', if: { all: [{ flag: 'ash_s2_done' }, ASH_BAND(30), { not: { flag: 'ash_close_done' } }] }, next: 'close' },
        { text: 'Rest.', exit: true },
      ],
    },

    // Stage 1 (he has joined): the promise he keeps, and the weight he names but won't open yet.
    vow: {
      text: 'He cleans the shotgun at the fire, which he does every night whether it needs it or not. "You\'ll want to know what this is for, travelling with a Choir man." He works the rag down the barrel. "I made a promise to the sky, which doesn\'t hear promises, so it\'s only to me. I don\'t fire first. Not at a man with his hand on his gun. Not at a dog with its lip up. Not ever." He closes the breech. "Sometimes somebody has to go first, friend. When it\'s needed, it\'ll have to be you. I\'m telling you so you know what you\'ve got."',
      again: 'The shotgun across his knees, clean, closed. He waits.',
      effects: [{ set: 'ash_s1_done' }],
      options: [
        { id: 'ash.vow.why', text: 'Why that promise?', effects: [{ approval: { companion: ASH, by: 5 } }], next: 'vow_why' },
        { id: 'ash.vow.risk', text: 'That could get us killed.', next: 'vow_risk' },
        { id: 'ash.vow.first', text: 'Then I\'ll go first.', effects: [{ approval: { companion: ASH, by: 5 } }], next: 'vow_first' },
      ],
    },
    vow_why: { text: '"Because I liked it." He says it to the barrel. "Going first. Being quick. There\'s a weight to saying that out loud, friend, and I\'ve said it twice in my life, both times to a fire." He puts the rag away. "That\'s enough for one night."', again: '"Twice," he says. "Both times to a fire."', effects: [{ learn: 'ash_liked_it' }], options: [{ text: 'Rest.', exit: true }] },
    vow_risk: { text: '"It could. It\'s nearly got me killed twice." He doesn\'t seem troubled. "Both times I was glad of it after. Being alive isn\'t the only thing I\'m trying to be."', again: '"Glad of it after," he says again.', options: [{ text: 'Rest.', exit: true }] },
    vow_first: { text: '"Good." He nods once, as if a price had been agreed. "Then we\'ve a deal, and I\'ll be right behind you, which is a place I\'m good at."', again: '"Right behind you," he says.', options: [{ text: 'Rest.', exit: true }] },
    weight: { text: 'He is quiet for long enough that you think he will not answer. "A place called the Gully. I\'ll tell you when I can say it without making a speech of it, because I\'ll have to, and because I\'d rather you heard it from me than from somebody who was standing in it." He feeds the fire. "That\'s all tonight, friend. That was a lot."', again: '"The Gully," he says. "Not tonight."', effects: [{ learn: 'ash_gully_hint' }, { approval: { companion: ASH, by: 5 } }], options: [{ text: 'Rest.', exit: true }] },
    sky: { text: '"No." He says it kindly. "That\'s what I like about it. Everything else out here answers, and most of what it says is written down somewhere by something that wants a thing from you. The sky wants nothing. It\'s the only honest thing I\'ve met, bar soil." He looks at you. "And a couple of people. Rest, friend."', again: '"Nothing," he says again, about the sky, and seems glad of it.', effects: [{ learn: 'ash_sky' }, { approval: { companion: ASH, by: 5 } }], options: [{ text: 'Rest.', exit: true }] },

    // Stage 2 (after the dead reserve under the Sump): the Gully, told once, and his line opened.
    gully: {
      text: 'He waits until the fire is down to coals, which is how you know it\'s coming. "The Gully was a well-cut north of the Sallow. Nineteen people, a windpump, goats. It wouldn\'t pay Kessler\'s father, and he wanted the places that were watching to see what not paying cost." He looks at his hands. "We went in at night. I was twenty."',
      again: 'The coals. His hands. "Twenty," he says again, as if it were an excuse he has tried and found too small.',
      effects: [{ set: 'ash_s2_done' }],
      options: [
        { id: 'ash.gully.on', text: '(Let him go on.)', next: 'gully_fire' },
        { id: 'ash.gully.stop', text: 'You don\'t have to tell me.', next: 'gully_must' },
      ],
    },
    gully_must: { text: '"I do, friend. That\'s the whole of it."', again: '"I do," he says again.', options: [{ id: 'ash.gully.must.on', text: '(Let him go on.)', next: 'gully_fire' }] },
    gully_fire: {
      text: '"I set the first fire. Nobody told me to. I was quick, and I liked being quick." He says it to the coals. "That\'s the part I don\'t say at the shrine. I liked it — the noise, the running, being first. I\'ve been trying to unlike it for fifteen years with a spade."',
      again: '"Being first," he says, to the coals.',
      options: [
        { id: 'ash.gully.fire.on', text: '(Say nothing.)', next: 'gully_well' },
        { id: 'ash.gully.young', text: 'You were twenty.', next: 'gully_young' },
      ],
    },
    gully_young: { text: '"Twenty\'s old enough to strike a match, friend. Don\'t hand me that; I\'ve tried it on myself and it doesn\'t fit."', again: '"Old enough," he says.', options: [{ id: 'ash.gully.young.on', text: '(Let him go on.)', next: 'gully_well' }] },
    gully_well: {
      text: '"There was a woman at the well who counted us as we came in. Out loud: one, two, three. She was still counting when we left." He looks up. "She counts seed at Openfield now. Doria. She doesn\'t know my face; it was dark, and I was a boy with a dog on his neck. That\'s why Openfield. Four years I\'ve dug the Choir\'s graves fifty yards from her store, and never said it."',
      again: '"Fifty yards," he says. "Four years."',
      effects: [{ learn: 'ash_gully_doria' }],
      options: [{ id: 'ash.gully.want', text: 'What do you want to do?', next: 'gully_want' }],
    },
    gully_want: {
      text: '"Tell her. With somebody beside me, so I don\'t make it a speech, and so I don\'t make it about me." He turns a coal with a stick. "Next time the road goes back through Openfield, friend. If you\'ll stand there."',
      again: '"If you\'ll stand there," he says again, and waits.',
      effects: [{ set: 'ash_quest' }, ...ASH_JOURNAL],
      options: [
        { id: 'ash.gully.stand', text: 'I\'ll stand with you.', effects: [{ approval: { companion: ASH, by: 10 } }], next: 'gully_yes' },
        { id: 'ash.gully.hurt', text: 'It\'ll only hurt her.', next: 'gully_hurt' },
        { id: 'ash.gully.judge', text: 'You burned nineteen people.', next: 'gully_judge' },
      ],
    },
    gully_yes: { text: '"Then that\'s the weight shared out." He breathes out, long. "Openfield, then. While she\'s counting."', again: '"While she\'s counting," he says.', options: [{ text: 'Rest.', exit: true }] },
    gully_hurt: {
      text: '"It will. It\'s hers to be hurt by. I took everything else from her; I\'m not taking that too."',
      again: '"Hers to be hurt by," he says again.',
      options: [
        { id: 'ash.gully.hurt.yes', text: 'All right. I\'ll come.', effects: [{ approval: { companion: ASH, by: 5 } }], exit: true },
        { id: 'ash.gully.self', text: 'I think you want it for yourself.', effects: [{ approval: { companion: ASH, by: 5 } }], next: 'gully_self' },
      ],
    },
    gully_self: { text: '"I do." He doesn\'t look away. "That\'s the worst of it, friend. Come anyway."', again: '"Come anyway," he says.', options: [{ text: 'Rest.', exit: true }] },
    gully_judge: { text: '"Some of them ran." He doesn\'t flinch. "Not enough. Yes." He waits to see whether you\'ll get up and sit somewhere else. "Come or don\'t. I\'m going to say it either way."', again: '"Either way," he says.', options: [{ text: 'Rest.', exit: true }] },

    // The seed store at Openfield (his line, with Ash in the party).
    store: {
      speaker: 'narrator',
      text: 'Doria is at the store door with the tally board, counting the crates in out loud, one, two, the way she does. Ash stops at the edge of the yard and hands you the shotgun without being asked. He does not go in.',
      again: 'Doria, counting. Ash at the edge of the yard with empty hands.',
      options: [
        { id: 'ash.store.wait', text: '(Wait. Let him find it.)', if: ASH_BAND(25), next: 'store_spoken' },
        { id: 'ash.store.wait.low', text: '(Wait. Let him find it.)', if: { approval: { companion: ASH, lte: 24 } }, next: 'store_stuck' },
        { id: 'ash.store.say', text: '(Say it for him.)', next: 'store_told' },
        { id: 'ash.store.away', text: 'Not today. Come away.', next: 'store_away' },
      ],
    },
    store_stuck: {
      speaker: 'narrator',
      text: 'He doesn\'t. The counting goes on, one, two, and he stands in it like a man in cold water, and then he looks at you, and you understand that whatever he has of you isn\'t enough yet to walk him the last ten yards.',
      again: 'Ash in the counting, like a man in cold water, looking at you.',
      options: [
        { id: 'ash.store.stuck.say', text: '(Say it for him.)', next: 'store_told' },
        { id: 'ash.store.stuck.away', text: '(Take his arm. Walk him away.)', next: 'store_away' },
      ],
    },
    store_spoken: {
      speaker: 'narrator',
      text: 'He walks the ten yards. "Doria." She stops at fourteen. "The Gully. I was there. I was with the Dogs, under Kessler\'s father. I set the first fire." She doesn\'t drop the board. She looks at him a long time, the whole of his face, as if she were counting that too.',
      again: 'Doria, looking at the whole of his face.',
      options: [{ id: 'ash.store.spoken.on', text: '(Wait.)', next: 'store_names' }],
    },
    store_names: {
      speaker: 'npc_of_06',
      text: '"Nineteen," she says. "Say them." He can\'t; he never knew them. So she does, one at a time, and makes him say each one back to her: Ottla. Ren Haskell. Ren\'s two boys. The twins from the top house. Old Sefton, who kept the goats. Maro, who was her husband. Pia, who was four. Ten more, and he says every one, and she checks him. "Dig, then," she says. "You dig here, you dig them. I\'ll check your count." She goes back to the crates. Fifteen. Sixteen.',
      again: 'Doria at the crates, counting, and not losing her place.',
      effects: [{ set: 'ash_gully_outcome', value: 'spoken' }, { approval: { companion: ASH, by: 15 } }, { learn: 'ash_gully_names' }, { memory: { npc: 'npc_of_06', tag: 'ash_gully', valence: -20, strength: 100 } }, { decision: { id: 'ash_gully', text: 'Brother Ash told Openfield\'s seed-keeper what he did at the Gully, with you beside him.' } }, { xp: 150 }],
      options: [{ id: 'ash.store.names.on', text: '(Walk back with him.)', next: 'store_after' }],
    },
    store_after: { text: '"She didn\'t forgive me." He takes the shotgun back from you. "No. She gave me the names. I didn\'t know I wanted them more." He looks at the burial ground, at the row he left half-dug. "There\'s a weight to that, friend. The right kind."', again: '"The right kind," he says.', options: [{ text: '(Go.)', exit: true }] },
    store_told: {
      speaker: 'narrator',
      text: 'You say it for him: the Gully, the Dogs, the first fire. Doria looks past you at Ash, and he nods, once, and that is all he manages. "Get him off my count," she says, and goes back to the crates, one, two, and doesn\'t lose her place.',
      again: 'Doria counting, with her back to both of you.',
      effects: [{ set: 'ash_gully_outcome', value: 'told' }, { approval: { companion: ASH, by: -10 } }, { memory: { npc: 'npc_of_06', tag: 'ash_gully', valence: -30, strength: 100 } }, { decision: { id: 'ash_gully', text: 'You told Openfield\'s seed-keeper, for Brother Ash, what he did at the Gully.' } }, { xp: 80 }],
      options: [{ id: 'ash.store.told.on', text: '(Go.)', next: 'store_told_after' }],
    },
    store_told_after: { text: '"You meant it kindly." He doesn\'t look at you. "It was mine to say, friend. Now it\'s nobody\'s."', again: '"Nobody\'s," he says.', options: [{ text: '(Go.)', exit: true }] },
    store_away: {
      speaker: 'narrator',
      text: 'You take his arm. He lets you. Behind you the counting goes on, one, two, and doesn\'t miss a crate. "Next time," he says at the edge of the lane, and you both know there won\'t be one.',
      again: 'The lane, and the counting behind you.',
      effects: [{ set: 'ash_gully_outcome', value: 'unsaid' }, { approval: { companion: ASH, by: -5 } }, { decision: { id: 'ash_gully', text: 'You walked Brother Ash away from Openfield\'s seed store with the Gully unsaid.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },
    store_grave: {
      speaker: 'narrator',
      text: 'Doria\'s cairn has no name on it; the Choir cuts none. Ash kneels at it with his hands empty and says it to the stones: the Gully, the Dogs, the first fire. The stones take it the way stones do. "Too late, friend," he says, getting up. "I\'m good at too late."',
      again: 'The cairn with no name on it.',
      effects: [{ set: 'ash_gully_outcome', value: 'grave' }, { decision: { id: 'ash_gully', text: 'Brother Ash said what he did at the Gully to a seed-keeper\'s cairn.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },

    // Stage 3 (the city's lens has named the player): what else he carries, told or found.
    orders: {
      text: [
        { if: { flag: 'unwritten_met' }, text: 'He takes off the grey scarf — you have never seen him without it — and unpicks the lining with his knife, and there is a fold of paper in it. "You went down Petra\'s ladder. You saw the board." He turns the paper over and over. "I\'m one of the ones she won\'t name. Sworn: no name, no likeness."' },
        { text: 'He takes off the grey scarf — you have never seen him without it — and unpicks the lining with his knife, and there is a fold of paper in it. "Under Openfield there\'s a cellar, and a board in it with twelve pins, and people who keep no likeness." He turns the paper over and over. "I\'m one of them. Sworn: no name, no likeness."' },
      ],
      again: 'The scarf off, on his knee. The fold of paper in his hand.',
      effects: [{ set: 'ash_orders_known' }, { set: 'ash_orders_how', value: 'told' }, { learn: 'ash_unwritten' }, { approval: { companion: ASH, by: 5 } }],
      options: [{ id: 'ash.orders.on', text: '(Let him go on.)', next: 'orders_standing' }],
    },
    orders_standing: {
      text: '"We keep standing orders. When a name on that board takes its forecast like a coat — puts it on, wants it, wears it out in the street — one of us sees it doesn\'t get to finish." He holds out the paper. "This came to Openfield the week before you did."',
      again: 'The paper, held out.',
      options: [{ id: 'ash.orders.read', text: '(Read it.)', next: 'orders_letter' }],
    },
    orders_letter: {
      speaker: 'narrator',
      text: 'Pencil, no seal, no name, one line: IF THE ONE FROM THE CISTERN\'S HATCH TAKES THE SASH, THE SKY IS OWED.',
      again: 'One line in pencil. THE SKY IS OWED.',
      options: [
        { id: 'ash.letter.will', text: 'Will you do it?', next: 'letter_will' },
        { id: 'ash.letter.since', text: 'You\'ve known since Openfield.', next: 'letter_since' },
        { id: 'ash.letter.burn', text: 'Burn it.', next: 'letter_burn' },
      ],
    },
    letter_will: { text: '"I don\'t know." He folds it. "That\'s the truth, and it\'s the worst thing I\'ve said to you, friend."', again: '"I don\'t know," he says again.', options: [{ id: 'ash.letter.will.on', text: '(Wait.)', next: 'stance' }] },
    letter_since: { text: '"Since before I met you. I said I came east to see the city. That was true. I came to see you too."', again: '"To see you too," he says.', options: [{ id: 'ash.letter.since.on', text: '(Wait.)', next: 'stance' }] },
    letter_burn: { text: '"Not yet. If I burn it, I\'m pretending I\'m not what I am. I\'d rather you knew what I am."', again: '"Not yet," he says.', options: [{ id: 'ash.letter.burn.on', text: '(Wait.)', next: 'stance' }] },
    scarf: {
      speaker: 'narrator',
      text: 'He has gone down to the water to wash. The grey scarf is drying on a stick by the fire, and something stiff is sewn into the lining.',
      again: 'The scarf on its stick. The stiff fold in the lining.',
      options: [
        { id: 'ash.scarf.read', text: '(Unpick it and read it.)', next: 'scarf_read' },
        { id: 'ash.scarf.leave', text: '(Leave it.)', effects: [{ set: 'ash_scarf_left' }], exit: true },
      ],
    },
    scarf_read: {
      speaker: 'narrator',
      text: 'Pencil, no seal, no name, one line: IF THE ONE FROM THE CISTERN\'S HATCH TAKES THE SASH, THE SKY IS OWED. When you look up he is at the edge of the light with the water still on his hands.',
      again: 'The paper in your hand. Ash at the edge of the light.',
      effects: [{ set: 'ash_orders_known' }, { set: 'ash_orders_how', value: 'found' }, { learn: 'ash_unwritten' }, { approval: { companion: ASH, by: -10 } }],
      options: [
        { id: 'ash.scarf.should', text: 'You should have told me.', next: 'scarf_should' },
        { id: 'ash.scarf.sorry', text: 'I\'m sorry. I had to know.', next: 'scarf_sorry' },
      ],
    },
    scarf_should: { text: '"I should." He sits, and takes the paper out of your hand, gently. "There\'s a weight to being found out, friend. It\'s lighter than I thought, and worse."', again: '"Lighter, and worse," he says.', options: [{ id: 'ash.scarf.should.on', text: '(Wait.)', next: 'scarf_explain' }] },
    scarf_sorry: { text: '"You\'re not. You had to know. That I\'ll take."', again: '"That I\'ll take," he says.', options: [{ id: 'ash.scarf.sorry.on', text: '(Wait.)', next: 'scarf_explain' }] },
    scarf_explain: {
      text: '"I\'m Unwritten. Sworn: no name, no likeness. When a name on Petra\'s board takes its forecast like a coat, one of us sees it doesn\'t get to finish." He holds the paper up to the fire, and doesn\'t put it in. "That came to Openfield the week before you did."',
      again: 'The paper held to the fire, and not put in.',
      options: [{ id: 'ash.scarf.explain.on', text: '(Wait.)', next: 'stance' }],
    },
    stance: {
      text: '"So." He puts the paper back in the lining. "The city has a sash with your face on it, and I have a letter with your face on it. What are you going to do about yours?"',
      again: '"What are you going to do about yours?" he says again.',
      options: [
        { id: 'ash.stance.never', text: 'I won\'t wear it.', effects: [{ set: 'ash_stance', value: 'never' }, { approval: { companion: ASH, by: 5 } }], next: 'stance_never' },
        { id: 'ash.stance.knowing', text: 'If I wear it, I\'ll wear it knowing what it is.', effects: [{ set: 'ash_stance', value: 'knowing' }], next: 'stance_knowing' },
        { id: 'ash.stance.clean', text: 'If it comes to that, make it clean.', effects: [{ set: 'ash_stance', value: 'clean' }, { approval: { companion: ASH, by: -10 } }], next: 'stance_clean' },
      ],
    },
    stance_never: { text: '"Then the letter\'s only paper." He sews the lining shut with three stitches. "I\'ll keep it anyway. Paper has a way of coming true round here."', again: '"Only paper," he says.', options: [{ text: 'Rest.', exit: true }] },
    stance_knowing: { text: '"That\'s the answer of somebody who might." He nods. "Honest. I\'ll take honest."', again: '"Honest," he says again.', options: [{ text: 'Rest.', exit: true }] },
    stance_clean: { text: 'He is quiet for a long time. "Don\'t ever say that to me again, friend," he says at last. "I might listen."', again: 'He is still quiet. He has not forgiven you the sentence.', options: [{ text: 'Rest.', exit: true }] },

    // Stage 4 (one of the city's own lines has run its course): what he chooses.
    choice: {
      text: [
        { if: { flag: 'ash_cup_lied' }, text: '"I asked the sky about you last night." He has the letter out of the lining; he has had it out for days. "It didn\'t answer. It never does; that\'s why I trust it. So I\'ll ask you, and you lied to me once about a cup, so I\'ll be listening hard." He holds the letter over the coals. "If the city gives you the sash, will you wear it?"' },
        { text: '"I asked the sky about you last night." He has the letter out of the lining; he has had it out for days. "It didn\'t answer. It never does; that\'s why I trust it. So I\'ll ask you, and whatever you say I\'ll believe, because you\'ve not lied to me yet." He holds the letter over the coals. "If the city gives you the sash, will you wear it?"' },
      ],
      again: 'The letter over the coals. He is waiting for an answer.',
      options: [
        { id: 'ash.choice.no', text: 'No. Burn it.', if: ASH_BAND(40), next: 'choice_friend' },
        { id: 'ash.choice.no.low', text: 'No. Burn it.', if: { approval: { companion: ASH, lte: 39 } }, next: 'choice_doubt' },
        { id: 'ash.choice.unsure', text: 'I don\'t know yet. I won\'t lie to you about it.', next: 'choice_warned' },
        { id: 'ash.choice.inside', text: 'If it\'s the only way to change it from inside, yes.', next: 'choice_inside' },
        { id: 'ash.choice.other', text: 'There are names on Petra\'s board who wear theirs gladly. Let it fall on them.', next: 'choice_other' },
      ],
    },
    choice_friend: {
      text: 'He puts the letter in the fire and watches it go, the whole of it, until the pencil is gone and the paper is gone and there is only the fire, which is honest. "{name}," he says. It is the first time he has used it. "I chose. Not the sky; it doesn\'t. Me. That\'s the first thing I\'ve chosen since the Gully that wasn\'t a match or a spade." He sits back. "Whatever they send next, they send through me."',
      again: 'Only the fire, where the letter was.',
      effects: [{ set: 'ash_orders', value: 'refused' }, { approval: { companion: ASH, by: 10 } }, { decision: { id: 'ash_orders', text: 'Brother Ash burned the letter with your face in it, and called you by your name.' } }, { xp: 150 }],
      options: [{ text: 'Rest.', exit: true }],
    },
    choice_doubt: {
      text: '"I want to believe that." He keeps the letter. "Ask me again when I do. Until then, if it ever comes to it, I\'ll come to you first, to your face. That I can promise."',
      again: '"To your face," he says. "That I can promise."',
      effects: [{ set: 'ash_orders', value: 'warned' }, { decision: { id: 'ash_orders', text: 'Brother Ash kept the letter, and promised to come to you first if it ever came to it.' } }],
      options: [{ text: 'Rest.', exit: true }],
    },
    choice_warned: {
      text: '"Then if it comes to it, I\'ll come to you first, to your face, before I do anything at all." He puts the letter away. "That\'s the most I can promise, friend. It\'s more than I promised them."',
      again: '"More than I promised them," he says.',
      effects: [{ set: 'ash_orders', value: 'warned' }, { approval: { companion: ASH, by: 5 } }, { decision: { id: 'ash_orders', text: 'Brother Ash kept the letter, and promised to come to you first if it ever came to it.' } }],
      options: [{ text: 'Rest.', exit: true }],
    },
    choice_inside: {
      text: '"From inside." He turns that over the way he turns soil. "Then I\'ll be there when you put it on. Whether I\'m there as your friend or as theirs, I\'ll know by then. So will you."',
      again: '"I\'ll know by then," he says. "So will you."',
      effects: [{ set: 'ash_orders', value: 'undecided' }, { decision: { id: 'ash_orders', text: 'Brother Ash kept the letter: he will be there if you take the sash, as your friend or as theirs.' } }],
      options: [{ text: 'Rest.', exit: true }],
    },
    choice_other: {
      text: 'He looks at you a long time. "You\'re asking me to pick one of them and do it, so I don\'t have to do it to you." The letter goes back in the lining. "I might, friend. That\'s what frightens me. That I might, and like it."',
      again: '"That I might," he says, "and like it."',
      effects: [{ set: 'ash_orders', value: 'other' }, { approval: { companion: ASH, by: -10 } }, { decision: { id: 'ash_orders', text: 'You told Brother Ash to let his orders fall on other names. He did not say no.' } }],
      options: [{ text: 'Rest.', exit: true }],
    },

    // The red line, said out loud before it is crossed.
    card: {
      text: [
        { if: { member: 'tollmen' }, text: '"The guild\'s ticket." He has it in his fingers by the fire; you didn\'t see him pick it up. "A ticket\'s a door, friend. I don\'t mind doors." He hands it back. "The notch they cut in it for a hand is a side. So is the city\'s grey. You put a stone on a cairn at the windpump. If you take either of those after it, I walk. I\'m telling you now so it isn\'t a trick later."' },
        { text: '"A city card." He has it in his fingers by the fire; you didn\'t see him pick it up. "A card\'s a door, friend. I don\'t mind doors." He hands it back. "Their grey is a side. So is the notch the guild cuts in a ticket for a hand. You put a stone on a cairn at the windpump. If you take either of those after it, I walk. I\'m telling you now so it isn\'t a trick later."' },
      ],
      again: 'Your papers back in your hand. He has said it.',
      effects: [{ set: 'ash_card_done' }],
      options: [
        { id: 'ash.card.ok', text: 'Understood.', exit: true },
        { id: 'ash.card.threat', text: 'That sounds like a threat.', next: 'card_threat' },
      ],
    },
    card_threat: { text: '"It\'s a weather report." He feeds the fire. "Threats are for people who want something from you. I only want to know where I\'m standing."', again: '"A weather report," he says.', options: [{ text: 'Rest.', exit: true }] },

    // Lighter talk at the fire: soil, Mason, the boy, the city.
    soil: {
      text: '"Depends what you\'re asking it for." He picks up a handful of whatever you\'re camped on and smells it. "This is glass-crust over old clay. Sour. You\'d want ash in it — wood ash, not the other kind — and blood meal if you\'d a goat to spare, and honestly three years of somebody pissing on the same corner, which is what Openfield\'s north field was before it was a field — "',
      again: 'The handful of soil, still in his fist.',
      effects: [{ set: 'ash_soil_done' }],
      options: [
        { id: 'ash.soil.on', text: '(Let him go on.)', effects: [{ approval: { companion: ASH, by: 3 } }], next: 'soil_on' },
        { id: 'ash.soil.stop', text: 'Ash. You\'re doing it again.', next: 'soil_stop' },
      ],
    },
    soil_on: { text: 'He goes on. Worms, and what the Burn did to them, and the year the Choir tried pigeon dung, and why you never plant tomato where tomato was. It takes the rest of the fire, and at the end of it he looks almost young. "Mason says it\'s the only time I\'m happy," he says, "and he hasn\'t the heart to stop me."', again: 'He has stopped. He looks almost young.', options: [{ id: 'ash.soil.on.on', text: '(Go on.)', next: 'camp' }] },
    soil_stop: { text: '"I am." He grins, which you have not seen him do. "Mason says the same."', again: 'The grin, going.', options: [{ id: 'ash.soil.stop.on', text: '(Go on.)', next: 'camp' }] },
    mason: { text: '"He gave me a spade and didn\'t ask what the other thing was." Ash looks west. "A year before I sang, and he never once asked me to. Whatever I am now that\'s worth anything, he dug out of me a row at a time." A beat. "He loves that blight more than he should. Something to solve that isn\'t a person."', again: '"A row at a time," he says.', effects: [{ set: 'ash_mason_done' }], options: [{ id: 'ash.mason.on', text: '(Go on.)', next: 'camp' }] },
    tobias_exposed: { text: '"You told his father." He nods slowly. "That\'s the hard honest way. The old man will hate you for it a season. Then he won\'t."', again: '"A season," he says.', effects: [{ set: 'ash_tobias_done' }], options: [{ id: 'ash.tobias.ex.on', text: '(Go on.)', next: 'camp' }] },
    tobias_mercy: { text: '"You let a boy stop without a crowd watching." He turns a coal. "That\'s how soil does it, friend. Quiet, and the next year something grows."', again: '"Quiet," he says.', effects: [{ set: 'ash_tobias_done' }, { approval: { companion: ASH, by: 5 } }], options: [{ id: 'ash.tobias.mercy.on', text: '(Go on.)', next: 'camp' }] },
    tobias_unwritten: { text: '"You gave him to Petra\'s cellar." He doesn\'t look up. "I know what they ask a man down there. They ask whether he can kill. If he says yes, they keep him."', again: '"If he says yes," he says, and leaves it.', effects: [{ set: 'ash_tobias_done' }, { approval: { companion: ASH, by: -5 } }], options: [{ id: 'ash.tobias.unw.on', text: '(Go on.)', next: 'camp' }] },
    kessler: {
      text: [
        { if: { dead: 'npc_rd_01' }, text: '"Kessler\'s dead, they say." He is quiet a while. "I knew him when his father ran the Dogs and he was the boy who did the sums. He was at the Gully. Not in it; on the ridge, counting. He never looked at me after. I never made him."' },
        { text: '"I knew him when his father ran the Dogs and he was the boy who did the sums. He was at the Gully. Not in it; on the ridge, counting." He feeds the fire. "He won\'t look at me. I won\'t make him."' },
      ],
      again: '"On the ridge, counting," he says.',
      effects: [{ set: 'ash_kessler_done' }],
      options: [{ id: 'ash.kessler.on', text: '(Go on.)', next: 'camp' }],
    },
    sem: { text: '"His mother brings water to the stones still. Pours it out where he is." He looks at his hands. "Six. First the trough took. The trough\'s clean now; you did that. It doesn\'t bring him up, and she knows it, and she pours it anyway." A beat. "I say his name while I dig. The Choir says no names on stones. It doesn\'t say anything about spades."', again: '"Sem," he says, once, under his breath.', effects: [{ set: 'ash_sem_done' }], options: [{ id: 'ash.sem.on', text: '(Go on.)', next: 'camp' }] },
    city: { text: '"A city that writes everyone down and calls it keeping them." He looks toward the Wall. "Every name in a book, and not one of them buried right."', again: '"Not one of them buried right," he says.', effects: [{ set: 'ash_city_done' }], options: [{ id: 'ash.city.on', text: '(Go on.)', next: 'camp' }] },
    close: { text: '"Friend." He doesn\'t move away, and he doesn\'t move closer. "I made a promise to a sky that doesn\'t hear promises. That one\'s in it too. It isn\'t you." He passes you the water. "Sit there. That\'s near enough to be a good thing."', again: 'The water between you. Near enough.', effects: [{ set: 'ash_close_done' }], options: [{ id: 'ash.close.on', text: '(Stay where you are.)', next: 'camp' }] },

    // The break, the red line and the floor: scenes where he leaves; below the floor, once, digging brings him back.
    cup: {
      text: [
        { if: { flag: 'ash_saw_cup' }, text: '"I saw your sleeve at the toast, friend." He has not said a word to you since the terrace; now he does, to the fire. "I know what was in the cup. I want to hear why."' },
        { text: '"The woman in the Crown took ill at her own toast." He is looking at the fire, not at you. "Was it you, friend?"' },
      ],
      again: 'He is still looking at the fire. He is still waiting.',
      effects: [{ set: 'ash_cup_done' }],
      options: [
        { id: 'ash.cup.chair', text: 'Yes. It settled the Chair.', next: 'cup_leave' },
        { id: 'ash.cup.asked', text: 'Yes. Someone wanted it done, and I did it.', next: 'cup_leave' },
        { id: 'ash.cup.reason', text: 'Yes. She was selling the city\'s forecasts to the Concern.', effects: [{ set: 'ash_cup_reason' }, { approval: { companion: ASH, by: -20 } }], next: 'cup_reason' },
        { id: 'ash.cup.lie', text: 'No.', effects: [{ set: 'ash_cup_lied' }, { approval: { companion: ASH, by: -25 } }], next: 'cup_lie' },
      ],
    },
    cup_leave: {
      text: 'He says it back to you slowly, as if he were counting it. "A name off Petra\'s board, in a cup, for that." He stands and takes the shotgun. "I\'ve carried the wish to do that for four years and been afraid of how easy it would be. Now I\'ve seen how easy it looks from outside. I can\'t walk next to it, friend. I\'d start to learn it." He goes west, walking, and does not come back.',
      again: 'The place by the fire where he sat.',
      effects: [{ leave: ASH }, { set: 'ash_gone' }, { set: 'ash_broke' }, { approval: { companion: ASH, by: -40 } }, { decision: { id: 'ash_left', text: 'Brother Ash left you over what was in Celestine Vane\'s cup.' } }],
      options: [{ text: '(Let him go.)', exit: true }],
    },
    cup_reason: { text: '"That\'s the Unwritten\'s sum," he says, "in your mouth." He is quiet a long time. "I know that sum. I\'ve carried it four years, waiting to be asked to do it. You did it at a party." He feeds the fire a stick. "I\'m staying. Don\'t ask me what for; I don\'t know yet."', again: '"I don\'t know yet," he says, to the fire.', options: [{ text: 'Rest.', exit: true }] },
    cup_lie: { text: '"The fire heard that, friend." He feeds it a stick, and doesn\'t say anything else, and doesn\'t need to.', again: 'He feeds the fire. He doesn\'t say anything.', options: [{ text: 'Rest.', exit: true }] },
    redline: {
      text: [
        { if: { flag: 'ash_saw_cut' }, text: '"A tenth," he says. "Of the Choir\'s seed. Out of the store the orchard kids are fed from first." He picks up the shotgun. "I said I don\'t go east with a stranger. I did once. I won\'t twice." He goes west, toward Openfield, walking, and does not come back.' },
        { text: '"You put a stone on a cairn at the windpump," he says, "and now you\'ve taken their side of it. I told you I\'d walk." He picks up the shotgun. "I said I don\'t go east with a stranger. I did once. I won\'t twice." He goes west, toward Openfield, walking, and does not come back.' },
      ],
      again: 'The place by the fire where he sat.',
      effects: [{ leave: ASH }, { set: 'ash_gone' }, { set: 'ash_redline' }, { approval: { companion: ASH, by: -50 } }, { decision: { id: 'ash_left', text: 'Brother Ash left you for turning on the Choir.' } }],
      options: [{ text: '(Let him go.)', exit: true }],
    },
    floor: {
      text: '"There\'s a weight to walking with you, friend, and it\'s the wrong kind." He says it without heat. "I\'m going back to the burial ground. There\'s always digging. If you want me, you know which end of the spade I\'ll be on."',
      again: 'He is already shouldering the shotgun.',
      effects: [{ leave: ASH }, { set: 'ash_left' }, { decision: { id: 'ash_left', text: 'Brother Ash went back to Openfield\'s burial ground: walking with you had become the wrong kind of weight.' } }],
      options: [{ text: '(Let him go.)', exit: true }],
    },
    floor_final: {
      text: '"Twice, friend." He shoulders the shotgun. "The sky forgives everything. I\'m not the sky." He goes, and that is the last of it.',
      again: 'The road west, and nobody on it.',
      effects: [{ leave: ASH }, { set: 'ash_gone' }, { decision: { id: 'ash_gone', text: 'Brother Ash left you a second time, and will not walk with you again.' } }],
      options: [{ text: '(Let him go.)', exit: true }],
    },
    left: {
      text: 'He is digging. He doesn\'t stop. "Friend."',
      again: 'The spade goes in and comes out. He doesn\'t stop.',
      options: [
        { id: 'ash.left.dig', text: '(Pick up the other spade and dig the row with him.)', effects: [{ time: 120 }], next: 'left_dig' },
        { text: '(Leave him to it.)', exit: true },
      ],
    },
    left_dig: {
      text: 'Two hours, and a row of cairn-stones set straight, and neither of you says anything, because you finish a row. At the end of it he leans on the spade.',
      again: 'The row is finished. He leans on the spade and waits for whatever you came to say.',
      options: [
        { id: 'ash.left.ask', text: 'Come east again.', check: { skill: 'speech', dc: 40, mods: [{ if: { flag: 'ash_gully_outcome', eq: 'spoken' }, dc: -10, why: 'you stood beside him at the seed store' }, { if: { flag: 'sky_rite' }, dc: -5, why: 'you raised a cairn here' }] }, effects: [{ join: ASH }, { set: 'ash_won_back' }, { set: 'ash_left', value: false }, { approval: { companion: ASH, by: 40 } }], next: 'left_back', fail: 'left_no' },
        { text: '(Go.)', exit: true },
      ],
    },
    left_back: { text: '"Once more." He puts the spade where the next person will find it. "That\'s the most I\'ve got, friend. Use it well."', again: '"Once more," he says.', options: [{ text: '(Go.)', exit: true }] },
    left_no: { text: '"Not yet." He goes back to the row. "Dig with me again some time. It\'s the only argument I listen to."', again: '"Not yet," he says, digging.', options: [{ text: '(Go.)', exit: true }] },
    gone: { text: 'He is digging, and does not look up, and the shotgun is across his back.', again: 'He does not look up.', options: [{ text: '(Walk on.)', exit: true }] },
  },
};

export const d_of_tobias: DialogueDef = {
  id: 'd_of_tobias', owner: 'npc_of_04',
  start: [{ if: { flag: 'of_fight' }, node: 'fight' }, { if: { flag: 'of_blight_outcome', eq: 'mercy' }, node: 'after_mercy' }, { if: KNOWN, node: 'caught' }, { if: { flag: 'tobias_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The Elder\'s son, in the rows with a hoe, broad like his father and tired in a way his father is not. "Tobias. You\'ll be the one he\'s asked to find out about the rows." He goes on hoeing. "It\'s blight. Blight counts, sometimes. Don\'t drink from the north trough; that\'s all anyone needs to know."',
      effects: [{ set: 'tobias_met' }],
      passives: [
        { attr: 'senses', dc: 7, text: 'Lantern soot on his right cuff, fresh. He works by daylight.', effects: [{ learn: 'of_tobias_cuff' }] },
        { skill: 'medicine', dc: 30, text: 'His hands are raw at the knuckle the way hands get from iodine, not from hoeing.', effects: [{ learn: 'of_tobias_hands' }] },
      ],
      options: [
        { id: 'tobias.dosed', text: 'It\'s not blight. The north trough is dosed.', if: { knows: 'of_well_dosed' }, check: { skill: 'speech', dc: 35, mods: [{ if: { lead: 'l_tobias_nights' }, dc: -15, why: 'Benedek saw his light at the well' }, { if: { knows: 'of_tobias_cuff' }, dc: -5, why: 'the soot on his cuff' }, { if: { knows: 'of_tobias_hands' }, dc: -5, why: 'the iodine on his hands' }] }, next: 'confess', fail: 'deny' },
        { id: 'tobias.light', text: 'Benedek saw your light at the well.', if: { all: [{ lead: 'l_tobias_nights' }, { not: { knows: 'of_well_dosed' } }] }, check: { skill: 'speech', dc: 45 }, next: 'confess', fail: 'deny' },
        { id: 'tobias.sheet', text: 'What\'s the guild selling you?', if: { knows: 'of_guild_offer' }, next: 'guild', once: true },
        bye,
      ],
    },
    again: { text: '"Rows don\'t lie."', again: 'The hoe goes on. He waits for you to say it or go.', options: [{ id: 'tobias.dosed.again', text: 'It\'s not blight. The north trough is dosed.', if: { all: [{ knows: 'of_well_dosed' }, { not: { seen: 'tobias.dosed' } }] }, check: { skill: 'speech', dc: 35, mods: [{ if: { lead: 'l_tobias_nights' }, dc: -15, why: 'Benedek saw his light at the well' }] }, next: 'confess', fail: 'deny' }, { id: 'tobias.light.again', text: 'Benedek saw your light at the well.', if: { all: [{ lead: 'l_tobias_nights' }, { not: { knows: 'of_well_dosed' } }, { not: { seen: 'tobias.light' } }] }, check: { skill: 'speech', dc: 45 }, next: 'confess', fail: 'deny' }, { id: 'tobias.sheet.again', text: 'What\'s the guild selling you?', if: { all: [{ knows: 'of_guild_offer' }, { not: { seen: 'tobias.sheet' } }] }, next: 'guild' }, bye] },
    guild: { text: '"Futures." He hoes. "Paper that says what happens. My father thinks it\'s a trick. It isn\'t a trick; that\'s the trouble with it."', effects: [{ learn: 'tobias_believes_sheets' }], options: [bye] },
    deny: { text: '"Blight." The hoe does not stop. "Go and look at the well if you want. Everyone looks at the well."', effects: [{ memory: { npc: 'npc_of_04', tag: 'accused', valence: -10, strength: 40 } }], options: [bye] },
    confess: { text: 'The hoe stops. He looks at the sick hall, and at the Elder\'s house, and then, strangely, at the sky, the way his sister does. "Not here." He walks you to the hut, and takes a paper from under the bench, and gives it to you to read, and it is OPENFIELD — HARVEST ABOVE PLAN — THE LONG NIGHT — BURNS. "I bought that with a year\'s seed money. If we grow, we burn. So I keep us small. Every third row. Nobody dies of it." He says the last part to the floor.', interject: [{ companion: ILYA, text: 'Ilya has gone very still. "If you grow," he says, "you burn." His hand finds the pocket of his jacket where he keeps a letter, and stays there. "Right."' }], effects: [...FOUND, { lead: 'l_openfield_sheet' }, { learn: 'of_tobias_why' }, { give: 'k_tobias_sheet' }], options: [{ text: 'Sem died of it.', if: { knows: 'of_child_grave' }, next: 'sem' }, { text: 'What now?', next: 'caught' }] },
    sem: { text: 'He does not say anything for a long time. "I measured it," he says at last. "For the rows. I didn\'t measure it for a child." And then nothing, and then: "What now?"', interject: [{ companion: TAMSIN, text: '"Sem was six," Tamsin says. Her voice is perfectly level, which is worse than if she had shouted.' }], effects: [{ memory: { npc: 'npc_of_04', tag: 'sem_named', valence: -20, strength: 80 } }], options: [{ text: 'What now.', next: 'caught' }] },
    caught: {
      text: [{ if: { seen: 'tobias.dosed' }, text: 'He stands in the hut with his hands empty, waiting to be told what he is.' }, { if: { seen: 'tobias.light' }, text: 'He stands in the hut with his hands empty, waiting to be told what he is.' }, { text: 'He knows that you know; it is in the way he puts the hoe down. "Say it, then."' }],
      options: [
        { id: 'tobias.expose', text: 'Your father hears it. From you, or from me.', effects: EXPOSE, next: 'exposed' },
        { id: 'tobias.mercy', text: 'Stop. I keep the paper and the pouch. Your father keeps his son.', effects: MERCY, next: 'mercy' },
        { id: 'tobias.unwritten', text: 'Your sister keeps a door for people who break forecasts. Let\'s see what she makes of you.', if: { knows: 'petra_keeps_door' }, effects: UNWRITTEN, next: 'unwritten' },
        { id: 'tobias.draw', text: '(Draw.)', effects: [{ set: 'of_fight' }, { decision: { id: 'of_drew', text: 'You drew on Tobias Mason at Openfield.' } }, { event: 'combat' }], exit: true },
        { text: '(Not yet.)', exit: true },
      ],
    },
    exposed: { text: '"From me." He goes grey and nods, once, the way his father nods, and walks to the Elder\'s house with the pouch in his hand, and the light in that window burns until dawn.', effects: [{ time: 60 }], options: [{ text: '(Leave them to it.)', exit: true }] },
    mercy: { text: 'He gives you the pouch. His hands are empty and he looks at them. "The north rows will come back in a month," he says. "If we burn, you\'ll know why." He goes back to the hoe, because there is nothing else to go back to.', options: [{ text: '(Go.)', exit: true }] },
    unwritten: { text: 'He looks at the common hall, where the hatch is, and something that has been tired in him for a year stops arguing. "Petra." Not a question. He walks there himself. The hatch closes on both of them.', options: [{ text: '(Go.)', exit: true }] },
    after_mercy: { text: 'He hoes the rows that are coming back, and does not look at you, and the north trough runs brown and ordinary, and his father sings at dusk and does not know why his son will not.', again: 'He goes on hoeing, and does not look up.', options: [{ text: '(Leave him.)', exit: true }] },
    fight: { text: 'The shiv is in his hand and he is crying.', again: 'The shiv, still. He has not stopped crying.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_of_imre: DialogueDef = {
  id: 'd_of_imre', owner: 'npc_of_05',
  start: [{ if: { flag: 'imre_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The sick hall smells of boiled water and iodine. The healer, a tall woman with a grey scarf tied back, looks at your hands before your face. "Sister Imre. Sit if you\'re sick; help if you\'re not; both if you\'re in between." She nods at the cots. "Three. A child, a mother, a man who went home. It isn\'t fever, whatever the Elder says."',
      effects: [{ set: 'imre_met' }, { learn: 'of_sick_no_fever' }],
      options: [
        { id: 'imre.sick', text: 'What is it, then?', next: 'sick' },
        { id: 'imre.heal', text: 'Patch me up.', if: { not: { flag: 'imre_healed_today' } }, next: 'heal', repeat: true },
        { id: 'imre.trade', text: 'What have you got?', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'imre.kits', text: '(Hand over two knit kits.) From the board at Old Market. For the hall.', if: GIG_KITS, effects: GIG_KITS_DONE, next: 'kits' },
        bye,
      ],
    },
    again: { text: '"Boiled water only. Sit or help."', again: 'She wrings out a cloth and waits, not long.', options: [{ id: 'imre.sick.again', text: 'The sick.', if: { not: { knows: 'of_well_dosed' } }, next: 'sick' }, { id: 'imre.heal.again', text: 'Patch me up.', if: { not: { flag: 'imre_healed_today' } }, next: 'heal', repeat: true }, { id: 'imre.trade.again', text: 'What have you got?', effects: [{ event: 'barter' }], exit: true, repeat: true }, { id: 'imre.kits.again', text: '(Hand over two knit kits.) From the board at Old Market.', if: GIG_KITS, effects: GIG_KITS_DONE, next: 'kits' }, bye] },
    kits: { text: 'She turns one over, reads the pre-Burn print on it, and does not ask what it cost. "Two." They go on the high shelf, out of the children\'s reach, where the empty space was. "The hatch sends these every few months and never a note. Tell them the Choir thanks the sky, and I thank them, and I know the difference."', effects: [{ learn: 'of_imre_hatch' }], options: [bye] },
    sick: {
      text: '"Shaking hands. Bad stomachs. A taste of pennies, the child says. No fever, no rash, nothing passing from one to the next." She folds a cloth. "All three drank from the north trough before I made the rule. That\'s as far as I can take it. I\'m a healer; I\'m not a well."',
      options: [
        { id: 'imre.diagnose', text: '(Look at the child\'s hands and gums.)', if: { not: { knows: 'of_well_dosed' } }, check: { skill: 'medicine', dc: 40 }, next: 'diag_ok', fail: 'diag_no' },
        bye,
      ],
    },
    diag_ok: { text: 'A grey line at the gum. Tremor in the small muscles. A metal salt, taken in small doses over weeks, in water: not a thing the glass does by itself. "Say that again," Imre says, and you do, and she sits down. "Then somebody is doing it."', effects: [{ learn: 'of_well_dosed' }, { lead: 'l_well_powder' }, { xp: 50 }, { trust: { npc: 'npc_of_05', by: 15 } }], options: [bye] },
    diag_no: { text: 'Pale, shaking, frightened. It could be a dozen things. Imre has been through the dozen already.', options: [bye] },
    heal: { text: 'She works fast and talks to the wound, not to you. "The sky doesn\'t charge. I do, a little, in water: drink the south trough and not the north."', effects: [{ event: 'heal' }, { set: 'imre_healed_today' }, { after: { minutes: 1440, id: 'imre_heal_reset', effects: [{ set: 'imre_healed_today', value: false }] } }], options: [{ text: 'Thanks.', exit: true }] },
  },
};

export const d_of_doria: DialogueDef = {
  id: 'd_of_doria', owner: 'npc_of_06',
  start: [{ if: { flag: 'of_seed_outcome' }, node: 'after' }, { if: { flag: 'doria_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The seed-keeper is a thin woman with ink on her fingers and a tally board she holds like a shield. "Doria. Keeper. Counted at dusk, counted at dawn, and every dawn there\'s one fewer." She shows you the board without being asked. "A crate a night. Six nights. No lock broken. I\'ve stopped sleeping, which hasn\'t helped."',
      effects: [{ set: 'doria_met' }, { quest: 'q_of_seed', start: true }, { learn: 'of_seed_heard' }],
      passives: [{ attr: 'wits', dc: 7, text: 'One a night, never two, never a broken lock. Not a thief. An order being filled, by someone with a key.', effects: [{ learn: 'of_seed_key' }] }],
      options: [
        { id: 'doria.keys', text: 'Who has keys?', next: 'keys', once: true },
        { id: 'doria.chaff', text: 'Let them keep stealing. Give them dead seed.', if: { all: [{ knows: 'of_seed_hollin' }, { not: { item: 'k_chaff' } }] }, next: 'chaff' },
        { id: 'doria.hollin', text: 'It\'s Ishan. He carries it to the guild\'s man.', if: { all: [{ knows: 'of_seed_hollin' }, { not: { flag: 'of_seed_outcome' } }] }, next: 'hollin' },
        bye,
      ],
    },
    again: { text: [
      { if: { flag: 'ash_gully_outcome', eq: 'spoken' }, text: '"Counted at dusk." She counts. Then, without looking up: "Nineteen. He said every one back to me. When he comes through again, I\'ll check his count."' },
      { if: { flag: 'ash_gully_outcome', eq: 'told' }, text: '"Counted at dusk." She counts, and does not look toward the burial ground, where somebody is digging.' },
      { text: '"Counted at dusk." She counts.' },
    ], again: 'She finishes a column on the tally and looks up.', options: [{ id: 'doria.keys.again', text: 'Who has keys?', if: { not: { seen: 'doria.keys' } }, next: 'keys' }, { id: 'doria.chaff.again', text: 'Let them keep stealing. Give them dead seed.', if: { all: [{ knows: 'of_seed_hollin' }, { not: { flag: 'of_seed_outcome' } }, { not: { item: 'k_chaff' } }] }, next: 'chaff' }, { id: 'doria.hollin.again', text: 'It\'s Ishan.', if: { all: [{ knows: 'of_seed_hollin' }, { not: { flag: 'of_seed_outcome' } }] }, next: 'hollin' }, bye] },
    keys: { text: '"Three. Mine. The Elder\'s. The yard\'s, for the planting mornings." She stops. "Ishan has the yard\'s. He came from the Sump with nothing and the Elder gave him the yard, and I have been not thinking that for six days."', effects: [{ learn: 'of_seed_yard_key' }, { learn: 'of_seed_hollin_hint' }], options: [bye] },
    chaff: {
      text: '"Dead seed." She almost smiles. "Last year\'s, boiled and dried. Looks right, weighs right, grows nothing. Chaff with manners." She looks at the crates. "If the guild is buying our seed for somebody east, I would like that somebody to plant a field of nothing and wait a season for it."',
      options: [
        { id: 'doria.chaff.do', text: '(Boil and dry a crate of last year\'s seed with her.)', check: { skill: 'science', dc: 35, mods: [{ if: { skill: 'survival', gte: 40 }, dc: -35, why: 'you know seed the way a hunter knows tracks' }] }, effects: [{ give: 'k_chaff' }, { time: 180 }, { learn: 'of_chaff_made' }], next: 'chaff_made', fail: 'chaff_no' },
        { text: 'Not yet.', exit: true },
      ],
    },
    chaff_made: { text: 'Three hours over the stove, and a crate of seed that will fool anyone but the ground. "Put it in the row he takes from," Doria says. "Or sell it to the guild\'s man yourself and keep the coin; I don\'t mind which, as long as it\'s ours they plant nothing with."', options: [{ id: 'doria.chaff.place', text: '(Put it where Ishan takes from.)', effects: [{ take: 'k_chaff' }, { set: 'of_seed_outcome', value: 'chaff' }, { time: 60 }, { xp: 100 }], next: 'chaff_done' }, { text: 'I\'ll sell it to him myself.', exit: true }] },
    chaff_done: { interject: [
      { companion: ODILE, text: '"A field of manners," Odile says, delighted, "planted by a client east of the Teeth, at a future\'s price." She lifts a glass she hasn\'t got to Doria. "I\'ve never seen the floor short itself so beautifully."', effects: [{ approval: { companion: ODILE, by: 10 } }] },
      { companion: ASH, text: '"Chaff with manners," Ash says. "The ground\'ll have the last word. It usually does."', effects: [{ approval: { companion: ASH, by: 5 } }] },
    ], text: 'Over the next nights the crates walk as before, and the guild\'s man pays as before, and on the seventh morning he leaves with six crates on a mule and a receipt, going east to a client who will plant a field of manners and wait. Doria laughs, once, and then sits down and sleeps in the store for the first time in a fortnight.', options: [bye] },
    chaff_no: { text: 'The seed boils to glue. Doria looks at the pot and at you and says nothing, which is kind.', options: [bye] },
    hollin: { text: 'She does not look surprised; she looks tired. "Tell the Elder. I can\'t." She turns the tally over. "He\'ll give Ishan the night watch over the store he stole from. That\'s the Choir\'s way. It\'s worse than the track and he\'ll stay, which is the point."', options: [{ id: 'doria.tell', text: '(Tell the Elder.)', effects: [{ set: 'of_seed_outcome', value: 'exposed' }, { xp: 80 }, { decision: { id: 'of_seed_exposed', text: 'You told Openfield that its yard hand was selling the Choir\'s seed to the guild.' } }], next: 'told' }, { text: 'Not yet.', exit: true }] },
    told: { text: 'The Elder hears it, and goes to the yard, and comes back without having raised his voice, and Ishan Kadam stands watch over the seed store every night from then on with a lantern and nobody to talk to. The guild\'s man is gone by morning.', options: [bye] },
    after: { text: [
      { if: { flag: 'ash_gully_outcome', eq: 'spoken' }, text: '"Fourteen at dusk. Fourteen at dawn." She sleeps now. "And nineteen, the other count," she says. "When he comes through, I check it."' },
      { if: { flag: 'ash_gully_outcome', eq: 'told' }, text: '"Fourteen at dusk. Fourteen at dawn." She does not look toward the burial ground. She does not ask after the man who digs there.' },
      { text: '"Fourteen at dusk. Fourteen at dawn." She sleeps now.' },
    ], again: '"Fourteen." She says it like a prayer the Choir doesn\'t have.', options: [bye] },
  },
};

export const d_of_benedek: DialogueDef = {
  id: 'd_of_benedek', owner: 'npc_of_07',
  start: [{ if: { flag: 'benedek_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old man on his knees in the green rows, pulling something that is not a weed and smelling it. "Benedek. Forty years in the glass." He holds the leaf up. "Sweet. Blight isn\'t sweet. Blight smells like a cellar." He puts it in his pocket. "I told the Elder I saw a light at the well. He said I say that about everything. I do. I also saw it."',
      effects: [{ set: 'benedek_met' }, { learn: 'of_benedek_light' }],
      options: [
        { id: 'benedek.who', text: 'Whose light?', check: { skill: 'speech', dc: 30, mods: [{ if: { member: 'choir' }, dc: -10, why: 'he will tell a sibling of the sky' }] }, next: 'who_ok', fail: 'who_no' },
        bye,
      ],
    },
    again: { text: '"Sweet." He is still smelling leaves.', again: 'He holds up another leaf for you to smell, and waits.', options: [{ id: 'benedek.who.again', text: 'Whose light?', if: { not: { seen: 'benedek.who' } }, check: { skill: 'speech', dc: 30 }, next: 'who_ok', fail: 'who_no' }, bye] },
    who_ok: { text: 'He looks at the Elder\'s house for a long time. "I\'m seventy-two and I\'ve buried the man who planted the first row here, and I\'m not going to be the one who says it to his father." He looks at you. "The light walked back west. Past the store. To the small hut. It walks like a man heavy on his left foot." He goes back to the rows. "That\'s all an old man saw."', effects: [{ lead: 'l_tobias_nights' }, { learn: 'of_benedek_told' }, { xp: 40 }], options: [{ text: 'Thank you.', exit: true }] },
    who_no: { text: '"A light." He goes back to the rows. "I\'m seventy-two. I see lights."', options: [bye] },
  },
};

export const d_of_hollin: DialogueDef = {
  id: 'd_of_hollin', owner: 'npc_of_08',
  start: [{ if: { flag: 'of_seed_outcome', eq: 'exposed' }, node: 'watch' }, { if: { flag: 'of_seed_outcome' }, node: 'after' }, { if: { knows: 'of_seed_hollin' }, node: 'caught' }, { if: { flag: 'hollin_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young man in the threshing yard with the kind of shoulders the Sump builds and a way of standing between you and his tent. "Ishan. Yard." He does not offer more. "Came from the Sump. They gave me work. That\'s the whole story."',
      effects: [{ set: 'hollin_met' }],
      passives: [{ attr: 'senses', dc: 6, text: 'A guild Toll, new-minted, on a cord round his neck under the shirt. Nobody in Openfield wears coin.', effects: [{ learn: 'of_hollin_coin' }] }],
      options: [
        { id: 'hollin.seed', text: 'Seed walks out of the store at night. You have the yard key.', if: { knows: 'of_seed_yard_key' }, check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'of_hollin_coin' }, dc: -10, why: 'the guild coin at his neck' }] }, next: 'confess', fail: 'deny' },
        bye,
      ],
    },
    again: { text: '"Yard."', again: 'He shifts to stand between you and the tent again.', options: [{ id: 'hollin.seed.again', text: 'Seed walks out of the store at night. You have the yard key.', if: { all: [{ knows: 'of_seed_yard_key' }, { not: { seen: 'hollin.seed' } }] }, check: { skill: 'speech', dc: 35 }, next: 'confess', fail: 'deny' }, bye] },
    deny: { text: '"Lots of people have keys." He has stopped standing between you and the tent, which is its own answer, and started standing between you and the lane.', options: [bye] },
    confess: { text: 'He sits down on a crate as if his legs have been cut. "Twelve a crate. He said the Choir had more than it could plant. He said it was going to people who\'d grow it." He looks at the lane, where the guild\'s man stands. "I came from the Sump with nothing. Twelve a crate is more than nothing has ever been."', effects: [{ learn: 'of_seed_hollin' }, { lead: 'l_seed_corso' }, { xp: 50 }], options: [{ text: 'What now.', next: 'caught' }] },
    caught: {
      text: 'He knows that you know. He has his hands flat on his knees like a man waiting for the sum to be read.',
      again: 'Still on the crate, hands on his knees. The sum is still not read.',
      options: [
        { id: 'hollin.stop', text: 'Stop. Tell the guild\'s man it\'s over. I say nothing.', effects: [{ set: 'of_seed_outcome', value: 'corso_gone' }, { set: 'of_corso_gone' }, { trust: { npc: 'npc_of_08', by: 30 } }, { xp: 80 }, { decision: { id: 'of_hollin_spared', text: 'You let Openfield\'s yard hand stop stealing seed without telling the Choir.' } }], next: 'stopped' },
        { id: 'hollin.cut', text: 'Keep going. A tenth of every crate\'s coin comes to me.', if: { not: ASH_IN }, effects: [{ set: 'of_seed_outcome', value: 'cut' }, { give: 'tolls', count: 12 }], next: 'cut' },
        { id: 'hollin.cut.ash', text: 'Keep going. A tenth of every crate\'s coin comes to me.', if: ASH_IN, effects: [{ set: 'of_seed_outcome', value: 'cut' }, { give: 'tolls', count: 12 }, { set: 'ash_saw_cut' }], next: 'cut' },
        { id: 'hollin.tell', text: 'The Elder hears it.', effects: [{ set: 'of_seed_outcome', value: 'exposed' }, { set: 'of_corso_gone' }, { decision: { id: 'of_seed_exposed', text: 'You told Openfield that its yard hand was selling the Choir\'s seed to the guild.' } }, { xp: 80 }], next: 'told' },
        { text: '(Not yet.)', exit: true },
      ],
    },
    stopped: { text: 'He goes down the lane that evening and says something short to the guild\'s man, and the guild\'s man looks at you across the green, and is gone by morning with his tent and his paper. Ishan keeps the yard, and the key, and the look of a man let off once.', options: [bye] },
    cut: { text: 'Twelve Tolls, warm from his neck. "A tenth," he says, and the thing that was in his face when he sat down on the crate goes somewhere and does not come back. The crates walk. Doria counts.', interject: [
      { companion: TAMSIN, text: '"A tenth," Tamsin says. "Of seed. From people who feed the orchard kids first." She doesn\'t laugh, and she doesn\'t look at the coins.', effects: [{ approval: { companion: TAMSIN, by: -5 } }] },
      { companion: ASH, text: 'Ash says nothing at all. He looks at the coins, and at the store where Doria counts, and at you, and puts it somewhere you will hear about later.' },
      { companion: ODILE, text: '"A tenth of a crate," Odile says. "I\'ve been paid worse for worse, my dear, but never by a farm."', effects: [{ approval: { companion: ODILE, by: -5 } }] },
    ], options: [bye] },
    told: { text: 'He does not run. He goes to the Elder himself, which is more than you expected, and the Elder gives him the night watch over the store he stole from, which is the Choir\'s way, and he takes it.', options: [bye] },
    watch: { text: 'He stands at the store door with a lantern every night now, and nobody talks to him, and he has not left.', again: 'Ishan, the lantern, the store door. Nobody talks to him.', options: [{ text: '(Leave him.)', exit: true }] },
    after: { text: '"Yard." He does not look at you, which is how he thanks you, or doesn\'t.', again: 'He doesn\'t look up from the yard.', options: [bye] },
  },
};

export const d_of_corso: DialogueDef = {
  id: 'd_of_corso', owner: 'npc_of_11',
  start: [{ if: { flag: 'corso_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A neat man in a guild coat on the lane with a ledger under his arm and a tent behind him, waiting with the patience of someone who is paid by the day. "Daichi Nakai, factor\'s hand, Ninebridge. I buy harvests before they happen. The Choir doesn\'t sell." He smiles. "Yet."',
      effects: [{ set: 'corso_met' }],
      options: [
        { id: 'corso.seed', text: 'You\'re buying seed by night. A crate a time.', check: { skill: 'barter', dc: 35, mods: [{ if: { knows: 'of_seed_hollin' }, dc: -15, why: 'you can name his carrier' }, { if: { member: 'tollmen' }, dc: -10, why: 'guild to guild' }] }, next: 'seed_ok', fail: 'seed_no' },
        { id: 'corso.chaff', text: 'I\'ve a crate for you. Choir seed, the good rows.', if: { all: [{ item: 'k_chaff' }, { not: { flag: 'of_seed_outcome' } }] }, next: 'chaff' },
        { id: 'corso.future', text: 'What does the guild know about this harvest?', next: 'future', once: true },
        bye,
      ],
    },
    again: { text: '"Factor\'s hand. Still buying."', again: 'He turns a page of the ledger and waits, paid by the day.', options: [{ id: 'corso.seed.again', text: 'You\'re buying seed by night.', if: { not: { seen: 'corso.seed' } }, check: { skill: 'barter', dc: 35, mods: [{ if: { knows: 'of_seed_hollin' }, dc: -15, why: 'you can name his carrier' }] }, next: 'seed_ok', fail: 'seed_no' }, { id: 'corso.leave', text: 'Pack the tent. Tonight.', if: { all: [{ knows: 'of_seed_hollin' }, { not: { flag: 'of_seed_outcome' } }] }, check: { skill: 'speech', dc: 40, mods: [{ if: { rep: { faction: 'tollmen', fear: 10 } }, dc: -15, why: 'the guild has heard of you' }] }, next: 'leave_ok', fail: 'leave_no' }, { id: 'corso.cut.again', text: 'I want a tenth of what you pay the yard.', if: { all: [{ knows: 'of_seed_hollin' }, { not: { flag: 'of_seed_outcome' } }] }, effects: [{ set: 'of_seed_outcome', value: 'cut' }, { give: 'tolls', count: 20 }], next: 'cut' }, { id: 'corso.chaff.again', text: 'I\'ve a crate for you. Choir seed, the good rows.', if: { all: [{ item: 'k_chaff' }, { not: { flag: 'of_seed_outcome' } }] }, next: 'chaff' }, { id: 'corso.future.again', text: 'What does the guild know about this harvest?', if: { not: { seen: 'corso.future' } }, next: 'future' }, bye] },
    seed_ok: { text: 'He does not deny it; the guild never does, it is too dear. "Viable seed is a future in a smaller box. A client of Factor Pike\'s pays very well for it, east of the Teeth, and the yard boy pays very little for carrying it." He opens the ledger. "Twelve a crate. Six crates. If you\'d like a tenth for your silence, that\'s a rate too."', effects: [{ lead: 'l_seed_corso' }, { learn: 'of_seed_hollin' }, { learn: 'of_corso_admits' }], options: [{ id: 'corso.cut', text: 'A tenth, then.', if: { not: ASH_IN }, effects: [{ set: 'of_seed_outcome', value: 'cut' }, { give: 'tolls', count: 20 }], next: 'cut' }, { id: 'corso.cut.ash', text: 'A tenth, then.', if: ASH_IN, effects: [{ set: 'of_seed_outcome', value: 'cut' }, { give: 'tolls', count: 20 }, { set: 'ash_saw_cut' }], next: 'cut' }, { id: 'corso.leave.now', text: 'Pack the tent. Tonight.', check: { skill: 'speech', dc: 40, mods: [{ if: { rep: { faction: 'tollmen', fear: 10 } }, dc: -15, why: 'the guild has heard of you' }] }, next: 'leave_ok', fail: 'leave_no' }, { text: 'I\'ll think about it.', exit: true }] },
    seed_no: { text: '"I buy harvests, friend. In daylight, with paper." He smiles. "Ask the Elder if he\'s sold me one. He hasn\'t. Yet."', options: [bye] },
    cut: { text: 'Twenty Tolls, counted on the ledger. "A pleasure. The guild likes a quiet lane." The crates walk. Doria counts.', interject: [
      { companion: TAMSIN, text: '"A tenth," Tamsin says. "Of seed. From people who feed the orchard kids first." She doesn\'t laugh, and she doesn\'t look at the coins.', effects: [{ approval: { companion: TAMSIN, by: -5 } }] },
      { companion: ASH, text: 'Ash says nothing at all. He looks at the coins, and at the store where Doria counts, and at you, and puts it somewhere you will hear about later.' },
      { companion: ODILE, text: '"A tenth of a crate," Odile says. "I\'ve been paid worse for worse, my dear, but never by a farm."', effects: [{ approval: { companion: ODILE, by: -5 } }] },
    ], effects: [{ rep: { faction: 'tollmen', respect: 5 } }, { decision: { id: 'of_seed_cut', text: 'You took a cut of the seed stolen from Openfield for the guild.' } }], options: [bye] },
    leave_ok: { text: 'He looks at you for a long moment, and at the Choir going about its evening behind you, and does the sum. "Six crates is a small future." He closes the ledger. "Tell the Elder the guild\'s offer stands. It always stands; that\'s what makes it an offer." The tent is gone by morning.', effects: [{ set: 'of_corso_gone' }, { set: 'of_seed_outcome', value: 'corso_gone' }, { rep: { faction: 'tollmen', respect: -3 } }, { xp: 80 }], options: [bye] },
    leave_no: { text: '"The lane is the Choir\'s. The tent is mine. The seed is whoever\'s carries it." He opens the ledger again. "Good evening."', options: [bye] },
    chaff: { text: 'He weighs the crate with a factor\'s hand and does not open it, because the guild buys seals, not seed. "The good rows." Sixty Tolls, counted. "A pleasure doing business with the sky."', interject: [
      { companion: ODILE, text: 'Odile waits until the factor\'s hand is out of earshot, and then laughs until she has to take her glasses off. "He bought the seal," she says. "Oh, my dear. He bought the seal."', effects: [{ approval: { companion: ODILE, by: 10 } }] },
      { companion: ASH, text: '"Chaff with manners," Ash says. "The ground\'ll have the last word. It usually does."', effects: [{ approval: { companion: ASH, by: 5 } }] },
    ], effects: [{ take: 'k_chaff' }, { give: 'tolls', count: 60 }, { set: 'of_seed_outcome', value: 'chaff' }, { set: 'of_corso_gone' }, { xp: 100 }, { decision: { id: 'of_chaff_sold', text: 'You sold the guild a crate of dead seed at Openfield for sixty Tolls.' } }], options: [bye] },
    future: { text: '"That it will be large. The guild is seldom wrong about harvests." He says it pleasantly. "Which is why we\'d like to own it before it is."', effects: [{ learn: 'corso_harvest_large' }], options: [bye] },
  },
};

export const d_of_wyn: DialogueDef = {
  id: 'd_of_wyn', owner: 'npc_of_09', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'A girl of twelve on a cot with her hands under the blanket so you cannot see them shake. "I drank from the north one. It tasted of pennies. Imre says don\'t." She looks at the door. "Is the sky still up?"', again: 'Wyn, with her hands under the blanket. "Still up?" she asks, the way you check a thing you were told.', effects: [{ learn: 'of_wyn_pennies' }], options: [{ id: 'wyn.up', text: 'It\'s still up.', if: { not: { seen: 'wyn.up' } }, effects: [{ trust: { npc: 'npc_of_09', by: 10 } }], exit: true }, { id: 'wyn.up.again', text: 'Still up.', if: { seen: 'wyn.up' }, exit: true }, { text: '(Leave her.)', exit: true }] } },
};

export const d_of_marta: DialogueDef = {
  id: 'd_of_marta', owner: 'npc_of_10', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'A woman on a cot, grey and polite. "Marta. Don\'t mind the hands. Imre says it isn\'t fever, and the Elder says it is, and I\'d like one of them to be right." A beat. "Tobias brings me water from the south trough every morning. He\'s a kind boy. Always was."', again: '"Marta. Still the hands." She smiles, politely, from the cot.', effects: [{ learn: 'of_marta_tobias' }], options: [{ text: '(Leave her.)', exit: true }] } },
};

export const d_of_kip: DialogueDef = {
  id: 'd_of_kip', owner: 'npc_or_04', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'Kip, from the orchard, in a grey scarf two sizes too big, with dirt to the elbows and a face that has eaten every day for a month. "They feed us first. First!" Then, lower: "Ishan goes to the store at night. We don\'t say. We\'ve been thieves; we know what the look is."', again: 'Kip, eating, with dirt to the elbows. "First," he says again, with her mouth full, as if you might not have believed it.', effects: [{ learn: 'of_seed_hollin_hint' }, { learn: 'of_seed_yard_key' }], options: [{ text: 'Keep eating.', exit: true }] } },
};

export const d_of_mote: DialogueDef = {
  id: 'd_of_mote', owner: 'npc_or_05', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'Mote, from the orchard, who has learned the sky-song and sings it under her breath while she works, all of it, wrong. "The Elder says the sky keeps no books." She considers that. "Kessler kept books. I like this better."', again: 'Mote, singing the sky-song under her breath, wrong in all the same places.', options: [{ text: 'Keep singing.', exit: true }] } },
};

export const OPENFIELD_DIALOGUES: DialogueDef[] = [
  d_of_well, d_of_board, d_of_shrine, d_of_tally, d_of_cellar, d_of_grave, d_of_burial, d_of_bench, d_of_windpump, d_of_sheet_read,
  d_of_mason, d_of_petra, d_of_ash, d_of_tobias, d_of_imre, d_of_doria, d_of_benedek, d_of_hollin, d_of_corso, d_of_wyn, d_of_marta, d_of_kip, d_of_mote,
];
