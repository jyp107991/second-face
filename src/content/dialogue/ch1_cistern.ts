import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';

/** Chapter One — Cistern 9. */

const backToPell = { text: 'About the body…', next: 'menu' };
/** A companion who can walk the Cistern with the player once she has decided to come (U7 interjections). */
const TAMSIN = 'npc_c9_03';

export const d_c9_pell: DialogueDef = {
  id: 'd_c9_pell', owner: 'npc_c9_02',
  start: [{ if: { flag: 'c9_examined' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { origin: 'clinic_aide' }, text: 'You\'re late, and I need you. Gloves are on the tray. Close the door — they keep coming in to look at him like he\'s a sermon.' },
        { text: '{name}. Good — steady hands. Shut the door behind you; half the ring has been in here to stare at him.' },
      ],
      passives: [
        { attr: 'senses', dc: 6, text: 'The dust mask on the side table has letters scratched inside the rim, worn almost smooth.', effects: [{ learn: 'mask_scratches' }] },
        { attr: 'wits', dc: 7, text: 'Pell keeps tugging the sheet back over the man\'s left forearm.' },
      ],
      options: [{ text: 'Who was he?', next: 'menu' }],
    },
    menu: {
      text: 'Nobody we know. Nobody anybody knows. Ask what you like — I\'ve run out of things to do with my hands.',
      again: 'What else? He isn\'t going anywhere, and it seems neither am I.',
      options: [
        { id: 'pell.cause', text: 'What killed him?', next: 'cause' },
        { id: 'pell.wounds', text: 'Let me look at the wounds myself.', check: { skill: 'medicine', dc: 40, mods: [{ if: { origin: 'clinic_aide' }, dc: -20, why: 'Pell trained you' }] }, next: 'wounds', fail: 'wounds_fail', once: true },
        { id: 'pell.arm', text: 'What are you hiding under that sheet?', if: { attr: 'wits', gte: 7 }, next: 'arm', once: true },
        { id: 'pell.mask', text: 'The dust mask on the table. What\'s the sign on it?', next: 'mask' },
        { id: 'pell.pack', text: 'Did he carry anything?', next: 'pack', if: { not: { item: 'k_photo' } } },
        { id: 'pell.bye', text: 'I should see the Elder.', exit: true },
      ],
    },
    cause: {
      text: 'Thirst, mostly. A rifle wound in the hip that went bad weeks ago. He walked on it a long way — boots worn through on the outer edge, sunburn down one side of his face only. West-bound, into the afternoon sun, for a long time.',
      effects: [{ learn: 'stranger_walked_west' }, { lead: 'l_walked_west' }],
      options: [backToPell],
    },
    wounds: {
      text: 'Pell steps back and lets you work. Under the rot, the old wound was closed once — not stitched: sealed, with a clear line of something like glass that has melted into the skin. "Machine work," Pell says quietly. "I\'ve only ever read about it. Somewhere out there, someone still has a real hospital."',
      effects: [{ learn: 'stranger_stitches' }, { lead: 'l_sealed_wound' }, { memory: { npc: 'npc_c9_02', tag: 'player_examined_body', valence: 15 } }],
      options: [{ text: 'A hospital? Out there?', next: 'stitches_q' }, backToPell],
    },
    stitches_q: {
      text: 'A city, maybe. Somewhere with power and clean hands and patience. He walked away from it with this in him, and kept walking until he reached us. You\'d have to want something badly to do that.',
      options: [backToPell],
    },
    wounds_fail: {
      text: 'Pell catches your wrist before you reopen something. "Watch, don\'t help." He walks you through it: a rifle wound, a fever, a very long walk.',
      options: [backToPell],
    },
    arm: {
      text: 'Pell holds your eyes for a moment, then folds the sheet back. On the inside of the forearm, a neat square burn, deliberate and old, and at its edge a few lines of tiny printed marks the fire didn\'t reach. "He burned something off himself," Pell says. "Carefully. On purpose. Leave it be."',
      effects: [{ learn: 'stranger_mark' }, { lead: 'l_burned_mark' }, { memory: { npc: 'npc_c9_02', tag: 'player_saw_mark', valence: -5 } }],
      options: [
        { id: 'pell.arm.press', text: 'You recognise it.', check: { skill: 'speech', dc: 50, mods: [{ if: { trust: { npc: 'npc_c9_02', gte: 10 } }, dc: -15, why: 'Pell trusts you' }] },
          effects: [{ learn: 'pell_uneasy' }, { lead: 'l_crate_print' }, { trust: { npc: 'npc_c9_02', by: 10 } }], next: 'arm_yes', fail: 'arm_no' },
        backToPell,
      ],
    },
    arm_yes: { text: 'The marks at the edge are the same print as the labels on MOTHER\'s old crates. I don\'t know what that means and I would rather not guess out loud. Not here.', options: [backToPell] },
    arm_no: { text: 'I recognise a man who has been dead since dawn. Help me or go.', effects: [{ trust: { npc: 'npc_c9_02', by: -5 } }], options: [backToPell] },
    mask: {
      text: [
        { if: { knows: 'mask_scratches' }, text: 'Half a sun with no ground under it — or an open hand, depending how you hold it. Painted with care. And yes, I saw the scratches inside. Initials, maybe. Worn too smooth to read.' },
        { text: 'Half a sun with no ground under it — or an open hand, depending how you hold it. Painted with care. Somebody loved that sign.' },
      ],
      effects: [{ learn: 'sigil_seen' }, { lead: 'l_sigil' }],
      options: [backToPell],
    },
    pack: {
      text: 'Ines took the pack. Except this — it was in his fist when he knocked. He wouldn\'t let go of it, even after.',
      effects: [{ give: 'k_photo' }, { set: 'c9_examined' }, { learn: 'photo_seen' }],
      options: [{ text: '(Look at the photograph.)', next: 'photo' }],
    },
    photo: {
      text: 'It\'s you. Older — forty, forty-five — with a city of broken towers behind you, squinting into the wind. On the back, in pencil: a date forty-one years gone. "I\'ve been staring at it for an hour," Pell says. "It\'s you. I don\'t care how."',
      passives: [
        { attr: 'senses', dc: 8, text: 'The shadow under your chin falls to the left. The shadows of the towers behind you fall to the right.', effects: [{ lead: 'l_photo_light' }, { learn: 'photo_shadows' }] },
        { skill: 'science', dc: 45, text: 'Every print you have ever seen has grain in it. This has none — the dust in the air is drawn, not caught.', effects: [{ lead: 'l_photo_grain' }, { learn: 'photo_no_grain' }] },
      ],
      options: [
        { id: 'pell.photo.no', text: 'It can\'t be me. I wasn\'t born.', next: 'photo_denial' },
        { id: 'pell.photo.where', text: 'Where was it taken?', next: 'photo_place' },
        { text: 'I need to see the Elder.', exit: true },
      ],
    },
    photo_denial: { text: 'No. You weren\'t. Neither was the man who carried it to our door, by the look of him, and yet here we both are. Ines will want to see you.', options: [backToPell, { text: 'I\'ll go to her.', exit: true }] },
    photo_place: { text: 'Somewhere with buildings taller than anything in our books. Ines reads the old atlases. Ask her — and ask her where she\'s put his pack.', effects: [{ learn: 'ines_has_pack' }], options: [backToPell, { text: 'I\'ll go to her.', exit: true }] },
    again: { text: 'Still here? He isn\'t getting any more talkative.', again: 'You keep coming back to him. So do I.', options: [{ text: 'A few more questions.', next: 'menu' }, { text: 'Never mind.', exit: true }] },
  },
};

export const d_c9_ines: DialogueDef = {
  id: 'd_c9_ines', owner: 'npc_c9_01',
  start: [
    { if: { flag: 'c9_council_done' }, node: 'after' },
    { if: { flag: 'c9_examined' }, node: 'council' },
    { node: 'early' },
  ],
  nodes: {
    early: { text: 'Not yet, {name}. Go to the clinic first and let Aurel show you what he showed me. Then come back and we\'ll talk like people with all the facts.', again: 'The clinic first, {name}. Aurel is waiting, and so is he.', options: [{ text: 'All right.', exit: true }] },
    council: {
      text: [
        { if: { origin: 'door_watch' }, text: 'Sit. You were on the door when he came — you saw him alive, which is more than the rest of us. A man walked across the waste and died with your face in his hand. Tell me what he said.' },
        { text: 'Sit. No — stand, if you\'d rather; I\'ll be quick, because I can\'t hold the others for long. A man walked across the waste and died with your face in his hand.' },
      ],
      again: 'Go on. I can hold them a little longer.',
      passives: [{ attr: 'senses', dc: 7, text: 'Her eyes go, once, to the sealed Archive door behind her desk — and away.', effects: [{ learn: 'ines_glanced_archive' }] }],
      options: [
        { id: 'ines.word', text: 'He said one word through the grille: "Larkspur." Then he fell.', if: { origin: 'door_watch' }, next: 'word', once: true },
        { id: 'ines.why', text: 'Why me?', next: 'why' },
        { id: 'ines.others', text: 'What does the council want?', next: 'others' },
        { id: 'ines.pack', text: 'Where\'s his pack?', next: 'pack', if: { not: { flag: 'c9_pack_given' } } },
        { id: 'ines.hiding', text: 'What aren\'t you telling me?', next: 'hiding' },
        { id: 'ines.go', text: 'I\'ll go. I want to know who he was.', next: 'go' },
        { id: 'ines.refuse', text: 'I won\'t go.', next: 'refuse', once: true },
      ],
    },
    word: {
      text: 'Larkspur. A flower — we had seeds of it once, in the old hydroponics catalogue. She writes it down, very carefully, as if the pen might break. "Don\'t say it to anyone else."',
      effects: [{ learn: 'word_larkspur' }, { memory: { npc: 'npc_c9_01', tag: 'player_heard_word', valence: 0, strength: 90 } }],
      options: [{ text: 'Why not?', next: 'word_why' }, { text: 'About going outside…', next: 'council' }],
    },
    word_why: { text: 'Because it\'s the only thing he said, and I would like it to stay ours until we know whose it was. Indulge an old woman.', options: [{ text: 'About going outside…', next: 'council' }] },
    why: { text: 'Because a dead man carried your face across the waste on purpose. Whoever sent him wanted you. I\'d like to know why before they come for you themselves — and they might, if we sit here and pray about it.', options: [{ text: 'Go on.', next: 'council' }] },
    others: {
      text: 'Bram wants the door welded shut. Half the ring wants a prayer said over the body and the whole thing forgotten by supper. And MOTHER… MOTHER says population variance is unchanged, and thanks us for our continuity.',
      effects: [{ learn: 'mother_continuity' }],
      options: [{ text: 'What do you want?', next: 'want' }],
    },
    want: { text: 'I want one person who can keep their head to walk out, look, and come back and tell me the truth. That person has your face. It seems the waste agrees.', options: [{ text: 'Go on.', next: 'council' }] },
    pack: {
      text: 'Here. Waterskin, empty. A notebook full of marks no one can read. His dust mask. Take them; they\'re more yours than ours.',
      effects: [{ give: 'k_notebook' }, { give: 'k_mask' }, { set: 'c9_pack_given' }],
      passives: [{ skill: 'science', dc: 40, text: 'The marks in the notebook repeat in blocks of five. A cipher, not a language.', effects: [{ learn: 'notebook_cipher' }] }],
      options: [
        { id: 'ines.notebook', text: '(Read the notebook.) This is record shorthand — the same hand as our own record room.', if: { origin: 'archive_clerk' }, next: 'notebook', once: true },
        { text: 'Thank you.', next: 'council' },
      ],
    },
    notebook: {
      text: 'You read a line aloud before you understand it: "Road east of the salt. Sell the map to the dog-men if you must, but keep the face." Ines goes very still. "Where did a stranger learn the hand our records are kept in?"',
      effects: [{ learn: 'notebook_read' }, { learn: 'map_sold' }, { lead: 'l_record_hand' }, { memory: { npc: 'npc_c9_01', tag: 'player_read_notebook', valence: -10, strength: 90 } }],
      options: [{ text: 'You tell me.', next: 'notebook_deflect' }],
    },
    notebook_deflect: { text: 'I can\'t. Which is exactly why you\'re going outside, and I am staying here to keep sixty people calm. Don\'t read that hand aloud in the ring.', options: [{ text: 'Back to the matter of leaving.', next: 'council' }] },
    hiding: {
      text: [
        { if: { knows: 'ines_glanced_archive' }, text: 'Everything, {name}. I\'m old; I keep the council minutes. Some of them are dull and some of them are sealed for good reasons, and neither kind will help you on the road.' },
        { text: 'Everything, {name}. I\'m old. Old people are mostly made of things they haven\'t said.' },
      ],
      options: [
        { id: 'ines.hiding.press', text: 'The Archive. You looked at it.', if: { knows: 'ines_glanced_archive' }, check: { skill: 'speech', dc: 65 }, next: 'hiding_yes', fail: 'hiding_no', once: true },
        { text: 'All right.', next: 'council' },
      ],
    },
    hiding_yes: {
      text: 'She is quiet for a long time. "There are records in there older than me, and MOTHER doesn\'t like them read. I read one, once, when I was young and certain. I have been less certain since." She smiles without much in it. "Bring me back the truth and I\'ll show you the door. Not before."',
      effects: [{ learn: 'archive_promise' }, { trust: { npc: 'npc_c9_01', by: 10 } }, { decision: { id: 'c9_archive_promise', text: 'Elder Ines promised to open the Archive for you if you return with the truth.' } }],
      options: [{ text: 'I\'ll hold you to that.', next: 'council' }],
    },
    hiding_no: { text: 'Then you\'ll have to forgive me for the things I keep. Most of them are only sad.', effects: [{ trust: { npc: 'npc_c9_01', by: -5 } }], options: [{ text: 'Fine.', next: 'council' }] },
    refuse: { text: 'Then I\'ll send Tamsin. She volunteered before the body was cold, and she\'ll go whether I send her or not.', options: [{ text: 'No. I\'ll go.', next: 'go' }, { id: 'ines.refuse.send', text: 'Send her, then.', next: 'refuse_send' }] },
    refuse_send: {
      text: 'Ines nods slowly. "I will. And when she doesn\'t come back, you\'ll go after her, and you\'ll have lost a day you didn\'t need to lose." She is already writing the order.',
      effects: [{ set: 'c9_tamsin_sent_alone' }, { decision: { id: 'c9_tamsin_alone', text: 'You let Tamsin go outside alone.' } }, { approval: { companion: 'npc_c9_03', by: -15 } }],
      options: [{ text: '…Give me the order. I\'ll go after her.', next: 'go' }],
    },
    go: {
      text: [
        { if: { flag: 'c9_tamsin_sent_alone' }, text: 'Then hurry. Take this to Bram — he won\'t open the door for anyone else. And {name}: write. The caravans carry letters if you pay them in something they want.' },
        { text: 'Then go with my word, not behind my back. Take this to Bram; he won\'t open the door for anyone else. And write — the caravans carry letters if you pay them in something they want.' },
      ],
      effects: [{ give: 'k_door_order' }, { set: 'c9_council_done' }, { memory: { npc: 'npc_c9_01', tag: 'player_volunteered', valence: 20 } }, { decision: { id: 'c9_went_for_council', text: 'You agreed to go outside for the council.' } }],
      options: [
        { id: 'ines.armoury', text: 'If I\'m going, I\'m going armed. Open the armoury.', check: { skill: 'speech', dc: 45, mods: [{ if: { trust: { npc: 'npc_c9_01', gte: 10 } }, dc: -10, why: 'Ines trusts you' }] }, next: 'armed', fail: 'armed_no', once: true },
        { id: 'ines.armoury.presence', text: '(Hold her gaze.) You know I\'ll need it.', if: { attr: 'presence', gte: 7 }, next: 'armed', once: true },
        { text: 'I\'ll make do.', exit: true },
      ],
    },
    armed: {
      text: 'One rifle — the bolt gun, it\'s the only one that still shoots straight — and twenty rounds. Bring the rifle back. Bring yourself back first.',
      effects: [{ give: 'w_bolt308' }, { give: 'a_308', count: 20 }, { set: 'c9_armed' }, { trust: { npc: 'npc_c9_01', by: 5 } }],
      options: [{ text: 'I will.', exit: true }],
    },
    armed_no: { text: 'We have eleven rifles for sixty people, and nobody has fired one in a generation. No. Find what you need out there — I suspect it\'s full of rifles.', options: [{ text: 'Fine.', exit: true }] },
    after: { text: 'Go carefully. Write. And if you find the people who sent him — be polite until you can\'t.', again: 'You\'re still inside, {name}. The door won\'t keep forever, and neither will I.', options: [
        { id: 'ines.seed', text: 'Factor Pike at Shale would pay the Cistern a fortune for viable seed.', if: { quest: 'q_a1_seed', status: 'active' }, next: 'seed' },
       { text: 'I will.', exit: true }] },
    seed: {
      text: '"The bank is the ring\'s. It is not mine to sell and it is not the guild\'s to buy." She lets that stand. Then, more quietly: "It is also ninety years old and has never been under a sky. If it went into the ground somewhere with sun on it, I would call that the bank doing what it was built to do."',
      options: [
        { id: 'ines.seed.sky', text: 'The Choir at Shale farms under the open sky. It would go in the ground.', check: { skill: 'speech', dc: 40, mods: [{ if: { trust: { npc: 'npc_c9_01', gte: 10 } }, dc: -20, why: 'she trusts you' }] }, next: 'seed_yes', fail: 'seed_no' },
        { id: 'ines.seed.guild', text: 'The guild pays. The ring could use what it pays.', next: 'seed_no' },
        { text: 'Forget I asked.', exit: true },
      ],
    },
    seed_yes: { text: 'She unlocks the vault herself and chooses the case the way you choose a word. "Tomato, bean, squash, millet." She puts it in your hands, cold. "For the sky. Not for a ledger. I am trusting you with the difference."', effects: [{ give: 'k_seed_case' }, { learn: 'seed_from_ines' }, { trust: { npc: 'npc_c9_01', by: 5 } }], options: [{ text: 'For the sky.', exit: true }] },
    seed_no: { text: '"No." The word is final in the way doors are. "Not to the guild, and not through you to the guild. The vault stays locked."', effects: [{ learn: 'seed_refused' }], options: [{ text: 'All right.', exit: true }] },
  },
};

/**
 * Tamsin Roe out of the Cistern (U8; plan in story/U8_tamsin_SECRET.md). She comes out after her letter's reply
 * (`tamsin_replied`) or after the player asks her at the Grille (`tam_out`), and waits at Mags's in Shale (the map places
 * her there while she is out and not travelling with the player; a world event walks her up to the player at six in the
 * evening). Stage flags: tam_met → tam_joined → tam_s1 (the sky) → tam_s2 (brave; after Jonah's month) → tam_s3 (no entry;
 * in Meridian; q_comp_tamsin) → tam_why → tam_secret → tam_s4 (the door; tam_pledge read by Act 3). Lies are counted
 * (tam_lies; two end the romance and put the player on her list). Romance: tam_romance = open | later | together | declined
 * | stopped | ended; every step asks; never moved by gifts; the shared `romance_partner` holds her id while it lasts, and no
 * step opens while another companion holds it. Floor −20: back to Mags's (tam_left), asked back there; −50:
 * home through the hatch (tam_home). Break: "for your own good" (tam_broken).
 */
const TAM = 'npc_c9_03';
const ASH = 'npc_of_03';
const NINE = 'npc_md_nine';
const WREN = 'npc_rd_03';
const ILYA = 'npc_sh_17';
const TA = (by: number) => ({ approval: { companion: TAM, by } });
const TAM_AT = (gte?: number, lte?: number): Cond => ({ approval: { companion: TAM, gte, lte } });
const IN: Cond = { inParty: TAM };
/** She is out of the Cistern: her letter said so, or she was asked at the Grille, or she has been met. */
const TAM_OUT: Cond = { any: [{ knows: 'tamsin_replied' }, { flag: 'tam_out' }] };
const TAM_ROMANCE: Cond = { any: [{ flag: 'tam_romance', eq: 'open' }, { flag: 'tam_romance', eq: 'together' }] };
/** No other companion's romance is in hand (the shared convention). */
const ROM_FREE: Cond = { any: [{ not: { flag: 'romance_partner' } }, { flag: 'romance_partner', eq: TAM }] };
/** Her romance ends: the shared partner is cleared (only ever applied while it is hers). */
const ROM_END = (v: string) => [{ set: 'tam_romance', value: v }, { set: 'romance_partner', value: false }];
const LISTED: Cond = { all: [IN, { flag: 'at_camp' }, { flag: 'tam_lies', gte: 2 }, { not: { flag: 'tam_listed' } }] };
const JONAH_DONE: Cond = { any: [{ flag: 'jonah_dead' }, { flag: 'jonah_lived' }] };
/** Stage 4 waits until the player has seen what the city wants of Reserve 9. */
const RESERVE_ORDERS: Cond = { any: [{ knows: 'md_reserves_list' }, { concluded: 'c_cisterns_city' }, { concluded: 'c_mother_answers' }] };
const NOT_WRITTEN = [{ set: 'tam_s3' }, { set: 'tam_uncounted' }, { quest: 'q_comp_tamsin', start: true }, { decision: { id: 'tam_no_entry', text: 'Tamsin asked Meridian\'s records office for her own entry. There is none.' } }];
const TAM_BACK = [{ text: 'Something else.', next: 'camp' }, { text: 'Sleep.', exit: true }];
const JOIN = [{ join: TAM }, { set: 'tam_joined' }, { decision: { id: 'tam_joined', text: 'Tamsin came out of the Cistern, the first in living memory, and came on the road with you.' } }];
const SECRET = (v: string, text: string) => [{ set: 'tam_secret', value: v }, { decision: { id: 'tam_secret', text } }];
const LIE = [{ inc: 'tam_lies' }];

export const d_c9_tamsin: DialogueDef = {
  id: 'd_c9_tamsin', owner: 'npc_c9_03',
  start: [
    { if: { all: [IN, TAM_AT(undefined, -50)] }, node: 'home_walk' },
    { if: { all: [IN, TAM_AT(undefined, -20)] }, node: 'walks' },
    { if: { all: [LISTED, TAM_ROMANCE] }, node: 'listed_r' },
    { if: LISTED, node: 'listed' },
    { if: { all: [IN, { flag: 'at_camp' }] }, node: 'camp' },
    { if: IN, node: 'party' },
    { if: { flag: 'tam_broken' }, node: 'broken' },
    { if: { flag: 'tam_left' }, node: 'left' },
    { if: { flag: 'tam_met' }, node: 'waiting' },
    { if: TAM_OUT, node: 'meet' },
    // the retired shelter opening (the Cistern's interior; unreachable since the Knock opening)
    { if: { flag: 'c9_tamsin_decided' }, node: 'decided' },
    { node: 'intro' },
  ],
  nodes: {
    // ---- out: Mags's bar in Shale, the first time they see each other's faces
    meet: {
      text: 'A woman of twenty-four in Cistern grey, the sleeves cut off at the shoulder, stands at the end of Mags\'s bar as if the floor might tip. Copper hair hacked short. A chipped front tooth. She knows you by your walk before you are close enough to know her. "Don\'t," she says. "Don\'t say anything yet. I want to do this one first." She looks at your face for a long time, the way you would read a page you had only ever heard read aloud. "Your nose is worse than in the picture."',
      again: 'She is still looking at your face, as if it might be taken back.',
      effects: [{ set: 'tam_met' }, { set: 'tam_out' }, { learn: 'tam_seen' }],
      options: [
        { id: 'tamc.meet.photo', text: '(Hold the photograph up beside your face.)', if: { item: 'k_photo' }, effects: [TA(5)], next: 'meet_photo' },
        { id: 'tamc.meet.out', text: 'You came out.', next: 'meet_out' },
        { id: 'tamc.meet.home', text: 'Go home, Tam. It isn\'t safe out here.', effects: [TA(-10)], next: 'meet_home' },
      ],
    },
    meet_photo: {
      text: '"It\'s you." She holds it next to your face and looks from one to the other. "It\'s you older, and somebody\'s put you somewhere you\'d hate. Look at your shoulders. You never stood like that at the Grille. I could hear you not standing like that." She gives it back.',
      again: 'She has given the photograph back. She is still comparing.',
      options: [{ text: '(Wait.)', next: 'meet_join' }],
    },
    meet_out: {
      text: [
        { if: { flag: 'tam_asked' }, text: '"You asked." She says it fast, like ripping off a bandage. "Eighteen years and you finally asked. So: hatch day, six o\'clock, and the hatch just — stayed open, and the panel said VARIANCE, and I climbed. The fridge held the hatch for me. I\'ll think about what that means tomorrow." She looks past you at the door, the street, the white sky over it. "Today there\'s a sky."' },
        { text: '"I said I was coming out. I don\'t say things I don\'t do." She says it fast, like ripping off a bandage. "Hatch day, six o\'clock, and the hatch just — stayed open, and the panel said VARIANCE, and I climbed. The fridge held the hatch for me. I\'ll think about what that means tomorrow." She looks past you at the door, the street, the white sky over it. "Today there\'s a sky."' },
      ],
      again: '"Today there\'s a sky," she says again, to make sure.',
      options: [{ text: '(Wait.)', next: 'meet_join' }],
    },
    meet_home: {
      text: '"Home." She laughs, once. "You sound like Ines." She doesn\'t move from the bar. "I\'m not going back in. I didn\'t climb out of a hole to be told to climb back into it by the person I climbed out for."',
      again: 'She hasn\'t moved from the bar.',
      options: [{ text: '(Wait.)', next: 'meet_join' }],
    },
    meet_join: {
      text: '"So." She drags a pack out from under the stool. It has been packed for a long time; the straps have set in their creases. "I\'ve got a knife, two days\' water and no idea what I\'m doing. Am I coming with you, or am I sitting at Mags\'s bar finding out what everything costs?"',
      again: 'The pack, on her knee. The question, still open.',
      options: [
        { id: 'tamc.join', text: 'Come with me.', effects: [TA(10), ...JOIN], next: 'meet_come' },
        { id: 'tamc.wait', text: 'Stay here a while. Get your feet under you. I\'ll come back for you.', effects: [TA(-5)], next: 'meet_wait' },
      ],
    },
    meet_come: { text: '"I packed six years ago," she says. "Don\'t look at me like that. You\'d have asked eventually." She is grinning before she finishes, all teeth, the chipped one too.', options: [{ text: '(Go.)', exit: true }] },
    meet_wait: { text: '"Left behind again." She says it lightly and it isn\'t light. "Fine. Nell says there\'s a cot. I\'ll be here, finding out what everything costs. Don\'t take long. I\'ve done enough waiting for one life."', options: [{ text: '(Go.)', exit: true }] },
    waiting: {
      text: '"Well?" Tamsin, at Mags\'s bar, the pack under the stool.',
      again: '"Still well?"',
      options: [
        { id: 'tamc.rejoin', text: 'Come on. We\'re going.', effects: JOIN, exit: true },
        { text: 'Not yet.', exit: true },
      ],
    },
    party: {
      text: [{ if: { at: 'shale' }, text: '"Mags says I tip like a Tollman. I\'m going to take that as a compliment until somebody stops me."' }, { text: '"Rust it, the sky\'s still there. I keep checking."' }],
      options: [
        { id: 'tamc.party.wait', text: 'Go back to Shale. Wait for me at Mags\'s.', effects: [{ leave: TAM }], exit: true },
        { text: 'Keep up.', exit: true },
      ],
    },

    // ---- camp
    camp: {
      text: [
        { if: { not: { flag: 'tam_s1' } }, text: 'Tamsin is lying on her back with her hands behind her head, not sleeping. "There\'s no ceiling," she says. "Anything could just come down."' },
        { text: 'Tamsin sits too close to the fire, the way people do who grew up without one. "Go on, then."' },
      ],
      again: 'Tamsin pokes the fire with a stick and waits.',
      options: [
        { id: 'tamc.s1', text: 'Can\'t sleep?', if: { not: { flag: 'tam_s1' } }, next: 's1' },
        { id: 'tamc.s2', text: 'Jonah.', if: { all: [{ flag: 'tam_s1' }, JONAH_DONE, { not: { flag: 'tam_s2' } }, TAM_AT(15)] }, next: 's2' },
        { id: 'tamc.s2.cold', text: 'Jonah.', if: { all: [{ flag: 'tam_s1' }, JONAH_DONE, { not: { flag: 'tam_s2' } }, TAM_AT(undefined, 14)] }, next: 's2_cold' },
        { id: 'tamc.s3', text: 'You went somewhere on your own today.', if: { all: [{ flag: 'tam_s2' }, { flag: 'a2_precinct_done' }, { not: { flag: 'tam_s3' } }, TAM_AT(25)] }, next: 's3' },
        { id: 'tamc.s3.cold', text: 'You went somewhere on your own today.', if: { all: [{ flag: 'tam_s2' }, { flag: 'a2_precinct_done' }, { not: { flag: 'tam_s3' } }, TAM_AT(undefined, 24)] }, next: 's3_cold' },
        { id: 'tamc.why.nine', text: 'Nine. You read people their own entries.', if: { all: [{ flag: 'tam_s3' }, { not: { flag: 'tam_why' } }, { inParty: NINE }] }, next: 'why_nine' },
        { id: 'tamc.choice', text: 'What will you do with it?', if: { all: [{ flag: 'tam_why' }, { not: { flag: 'tam_secret' } }] }, next: 'choice' },
        { id: 'tamc.s4', text: 'Three orders, the terminal said. Reserve 9.', if: { all: [{ flag: 'tam_secret' }, RESERVE_ORDERS, { not: { flag: 'tam_s4' } }, TAM_AT(40)] }, next: 's4' },
        { id: 'tamc.s4.cold', text: 'Three orders, the terminal said. Reserve 9.', if: { all: [{ flag: 'tam_secret' }, RESERVE_ORDERS, { not: { flag: 'tam_s4' } }, TAM_AT(undefined, 39)] }, next: 's4_cold' },
        // the romance: she asks; the player answers; either can stop it
        { id: 'tamc.r1b', text: 'That riddle. Ask it again.', if: { all: [{ flag: 'tam_romance', eq: 'later' }, { flag: 'tam_s3' }, ROM_FREE] }, next: 'r1b' },
        { id: 'tamc.r2', text: 'Come and look at the sky with me.', if: { all: [{ flag: 'tam_romance', eq: 'open' }, { flag: 'tam_s3' }, TAM_AT(40), ROM_FREE, { not: { seen: 'tamc.r2' } }] }, next: 'r2' },
        { id: 'tamc.r2.ask', text: 'Tam. I\'m asking now.', if: { all: [{ flag: 'tam_romance', eq: 'open' }, { flag: 'tam_r2_later' }, ROM_FREE] }, next: 'r2_ask' },
        { id: 'tamc.quit', text: 'Tam — us. I need to stop.', if: TAM_ROMANCE, next: 'quit' },
        // lighter talk, by where the story is
        { id: 'tamc.out', text: 'What\'s it like? Out here.', if: { not: { seen: 'tamc.out' } }, next: 'out' },
        { id: 'tamc.maud', text: 'Maud.', if: { not: { seen: 'tamc.maud' } }, next: 'maud' },
        { id: 'tamc.nell', text: 'Nell.', if: { not: { seen: 'tamc.nell' } }, next: 'nell' },
        { id: 'tamc.fridge', text: 'And MOTHER?', if: { all: [{ not: { flag: 'tam_s3' } }, { not: { seen: 'tamc.fridge' } }] }, next: 'fridge' },
        { id: 'tamc.meridian', text: 'Meridian.', if: { all: [{ flag: 'visited_md_precinct' }, { not: { seen: 'tamc.meridian' } }] }, next: 'meridian' },
        { id: 'tamc.wren', text: 'You and Wren.', if: { all: [{ inParty: WREN }, { not: { seen: 'tamc.wren' } }] }, next: 'wren' },
        { id: 'tamc.ilya', text: 'You and Ilya.', if: { all: [{ inParty: ILYA }, { not: { seen: 'tamc.ilya' } }] }, next: 'ilya' },
        { id: 'tamc.ash', text: '(Ash is watching her across the fire.)', if: { all: [{ inParty: ASH }, { not: { seen: 'tamc.ash' } }] }, next: 'ash' },
        { id: 'tamc.nine', text: '(Tamsin is watching Nine write.)', if: { all: [{ inParty: NINE }, { not: { seen: 'tamc.nine' } }] }, next: 'nine' },
        { text: 'Sleep.', exit: true },
      ],
    },

    // stage 1: the sky (the first camp)
    s1: {
      text: '"There\'s no ceiling." She says it to the sky, not to you. "Eighteen years I asked you what the sky was doing and you said blue, and now I\'m under it and it isn\'t doing anything. It\'s just — up. All the way." A breath. "Tell me what it\'s doing. Properly. Like at the Grille."',
      again: '"Properly," she says again. "Like at the Grille."',
      options: [
        { id: 'tamc.s1.sky', text: '(Tell her: the dust high up, the stars behind it, one satellite still crossing, the dark at the edges.)', effects: [TA(5)], next: 's1_sky' },
        { id: 'tamc.s1.blue', text: 'It\'s dark, Tam. Go to sleep.', next: 's1_blue' },
      ],
    },
    s1_sky: { text: '"A satellite." She tracks it with a finger until it goes. "Somebody built that and it\'s still going and they\'re dead." She doesn\'t sound sad about it; she sounds like someone handed a present.', again: 'She is still watching the place the satellite went.', options: [{ text: '(Lie back.)', next: 's1_photo' }] },
    s1_blue: { text: '"You always say blue." But she\'s smiling at the dark.', again: 'She is smiling at the dark.', options: [{ text: '(Lie back.)', next: 's1_photo' }] },
    s1_photo: {
      text: 'After a while: "The picture. Of you. Do you know who made it?"',
      again: '"Do you know?" she asks again.',
      options: [
        { id: 'tamc.s1.lie', text: 'Yes. I know who made it.', effects: [...LIE, { set: 'tam_s1' }], next: 's1_lie' },
        { id: 'tamc.s1.true', text: 'No. I\'m going to find out.', effects: [TA(5), { set: 'tam_s1' }], next: 's1_true' },
        { id: 'tamc.s1.matter', text: 'Does it matter who?', effects: [{ set: 'tam_s1' }], next: 's1_matter' },
      ],
    },
    s1_lie: { text: '"Huh." She doesn\'t ask who. She looks at you for a second longer than she needs to, and then back up at the sky. "Okay."', again: 'She is looking at the sky, not at you.', options: [{ text: 'Sleep.', exit: true }] },
    s1_true: { text: '"Good. Me too." She puts her hand out on the ground between you, flat, palm up, and after a second you understand it is how her fingertips used to come through the holes. "Partners." Then, too quickly: "I\'ve been sick before, you know. When I was little. The clinic. Forget it. It\'s boring." She rolls over, and is asleep, or pretending, in a minute.', again: 'She is asleep, or pretending.', options: [{ text: 'Sleep.', exit: true }] },
    s1_matter: { text: '"Everything matters out here. That\'s the whole thing about out here." She thinks about it. "In there nothing mattered because nothing changed. I\'ve been sick before, you know. When I was little. Forget it. It\'s boring."', again: 'She has decided it\'s boring.', options: [{ text: 'Sleep.', exit: true }] },

    // stage 2: brave (after Jonah's month; 15+)
    s2: {
      text: [
        { if: { flag: 'jonah_dead' }, text: 'Tamsin hasn\'t said anything since Shale, which she never does. "He was braver than me," she says at last. "Jonah. Braver than everybody. It didn\'t help him at all."' },
        { text: '"He\'s alive." Tamsin says it like she\'s checking the word still works. "Jonah. You changed the — the conditions. Not him. He was going to be brave right up a tower and off it." She pokes the fire. "I\'d have gone up the tower. Rust it. I\'d have gone first."' },
      ],
      again: 'She is still looking at the fire, not at you.',
      options: [
        { id: 'tamc.s2.fragile', text: 'Be careful, Tam. I can\'t lose you as well.', effects: [TA(-10), { set: 'tam_s2' }], next: 's2_fragile' },
        { id: 'tamc.s2.strong', text: 'You\'re not fragile. You never were.', effects: [TA(10), { set: 'tam_s2' }], next: 's2_clinic' },
        { id: 'tamc.s2.tomorrow', text: 'Brave isn\'t the point. Being here tomorrow is.', effects: [TA(5), { set: 'tam_s2' }], next: 's2_clinic' },
      ],
    },
    s2_fragile: { text: '"There it is." She doesn\'t look up. "Ines\'s voice. Pell\'s voice. Everybody who ever stood at the end of a clinic bed." She throws the stick on the fire. "I\'m not glass. I climbed out of a hole." It is a long time before she says anything else, and when she does it is about the weather.', again: 'She is talking about the weather, and nothing else.', options: [{ text: 'Sleep.', exit: true }] },
    s2_clinic: {
      text: 'She is quiet a while. Then, fast, before she can stop herself: "I was born wrong. Early. Lungs like wet paper. I lived in the clinic till I was six — Pell\'s white room — and MOTHER sang to me through the panel every night. Old songs. I thought every kid got sung to." She laughs, badly. "I\'ve never told anyone that. Not even you, at the Grille. Don\'t make a thing of it."',
      again: '"Don\'t make a thing of it," she says again.',
      effects: [{ learn: 'tam_clinic_told' }],
      options: [
        { text: '(Say nothing. Let her be.)', if: { all: [TAM_AT(30), ROM_FREE] }, next: 'r1' },
        { text: '(Say nothing. Let her be.)', if: { not: { all: [TAM_AT(30), ROM_FREE] } }, next: 's2_end' },
      ],
    },
    s2_end: { text: 'She lies back. "Good. You\'re good at not making things a thing." She is asleep before you are.', again: 'She is asleep.', options: [{ text: 'Sleep.', exit: true }] },
    s2_cold: { text: '"Jonah." She shrugs, and it isn\'t a shrug. "People die of being brave. I knew that. I just didn\'t *know* it." She turns away from the fire. Whatever else there is, she isn\'t telling you tonight.', again: 'Her back is to the fire.', effects: [{ set: 'tam_s2' }], options: [{ text: 'Sleep.', exit: true }] },

    // the romance, step one: her riddle (30+, after she has told the clinic)
    r1: {
      text: 'She doesn\'t sleep. After a while: "Riddle." She doesn\'t look at you. "I\'ve known you my whole life and I\'d never seen you, and now I can\'t stop looking. What am I?" A pause. "You can say you don\'t know. That\'s allowed. That\'s always allowed."',
      again: '"The riddle\'s still open," she says to the fire.',
      options: [
        { id: 'tamc.r1.yours', text: 'Yours.', effects: [{ set: 'tam_romance', value: 'open' }, { set: 'romance_partner', value: TAM }, TA(5), { affection: { npc: TAM, by: 10 } }, { decision: { id: 'tam_romance', text: 'You answered Tamsin\'s riddle. Slowly, she said.' } }], next: 'r1_yes' },
        { id: 'tamc.r1.later', text: 'I don\'t know yet.', effects: [{ set: 'tam_romance', value: 'later' }], next: 'r1_later' },
        { id: 'tamc.r1.no', text: 'Tam. I don\'t — not like that.', effects: [{ set: 'tam_romance', value: 'declined' }], next: 'r1_no' },
      ],
    },
    r1_yes: {
      text: 'She turns her head. "Yeah?" And then, because she is Tamsin: "That was a terrible answer. Correct. But terrible." She doesn\'t move closer. She leaves her hand on the ground between you, palm up, the way it used to come through the holes. "Slow," she says. "I want this one slow. I\'ve had eighteen years of talking fast through a wall."',
      again: 'Her hand on the ground between you, palm up.',
      options: [{ text: '(Take her hand.)', exit: true }, { text: '(Leave it there, for now.)', exit: true }],
    },
    r1_later: { text: '"Don\'t know yet." She nods, like it\'s an answer she can keep. "Riddles keep. I\'ll ask again one day, and you can not-know again if you like." She doesn\'t sound hurt. She sounds like someone with time.', again: 'She has time. She says so with her shoulders.', options: [{ text: 'Sleep.', exit: true }] },
    r1_no: { text: '"Good." She says it quickly and means most of it. "Riddles are better unanswered anyway. And you\'re still — " she waves a hand at the whole of you. "You\'re still the Grille. That doesn\'t go anywhere." In the morning she is exactly herself, and stays it.', again: 'She is herself. She stays it.', options: [{ text: 'Sleep.', exit: true }] },
    r1b: {
      text: '"Again?" She grins at the fire. "I\'ve known you my whole life and never seen you, and now I can\'t stop looking. What am I?"',
      again: '"What am I?" she asks the fire.',
      options: [
        { id: 'tamc.r1b.yours', text: 'Yours.', effects: [{ set: 'tam_romance', value: 'open' }, { set: 'romance_partner', value: TAM }, TA(5), { affection: { npc: TAM, by: 10 } }, { decision: { id: 'tam_romance', text: 'You answered Tamsin\'s riddle, the second time she asked. Slowly, she said.' } }], next: 'r1_yes' },
        { id: 'tamc.r1b.no', text: 'Still don\'t know. Leave it unanswered.', effects: [{ set: 'tam_romance', value: 'declined' }], next: 'r1b_no' },
      ],
    },
    r1b_no: { text: '"Unanswered. The best kind." She nearly means it. "I won\'t ask a third time. I don\'t do that to people."', again: 'She doesn\'t ask a third time.', options: [{ text: 'Sleep.', exit: true }] },
    // step two: the rain (40+, after the record; she asks, and no is always an answer)
    r2: {
      text: 'Away from the fire the dark is the real kind, and she stands in it with her face up and her eyes shut. It has started to rain, the thin, rare, dusty rain of the flats, and she has never in her life stood in rain. "Tell me what the sky is doing," she says. You tell her: it is raining on her. She laughs, and opens her eyes, and they are on you. "I\'m asking," she says. "I always ask. You can say no, and I\'ll still be here tomorrow, being annoying. Can I?"',
      again: '"I asked," she says, quietly. "You can still say no."',
      options: [
        { id: 'tamc.r2.yes', text: 'Yes.', effects: [{ set: 'tam_romance', value: 'together' }, TA(5), { affection: { npc: TAM, by: 15 } }, { decision: { id: 'tam_together', text: 'Tamsin asked, in the rain, and you said yes.' } }], next: 'r2_yes' },
        { id: 'tamc.r2.not', text: 'Not tonight. Ask me again.', effects: [{ set: 'tam_r2_later' }], next: 'r2_not' },
        { id: 'tamc.r2.no', text: 'No, Tam.', effects: ROM_END('declined'), next: 'r2_no' },
      ],
    },
    r2_yes: { text: '"Good," she says, close enough that you feel it more than hear it, and then neither of you says anything for a long time, and the rain does what it likes. Much later, under the blanket by a fire burned to nothing, half asleep: "That\'s what the sky\'s doing. Write it down."', again: 'She is asleep against you. The rain has stopped.', options: [{ text: '(Sleep.)', exit: true }] },
    r2_not: { text: '"Okay." And it is; you can hear that it is. "Then you ask me. When it is. I\'ll be here." She tips her face back up into the rain and stays there until she is soaked, laughing at nothing.', again: 'She is still out in the rain, laughing at nothing.', options: [{ text: 'Sleep.', exit: true }] },
    r2_no: { text: '"Okay." She keeps her face up to the rain a while longer, so you can\'t see it. "Thanks for saying it to my face. People mostly don\'t." When she comes back to the fire she is herself again, and she doesn\'t make you pay for it.', again: 'She is herself again.', options: [{ text: 'Sleep.', exit: true }] },
    r2_ask: {
      text: '"Yeah?" She looks at you across the fire for a long moment. "You\'re sure. You\'re asking. Not me." Then she grins, all teeth. "Yes. Obviously yes. I was going to wait a hundred years."',
      again: 'She is grinning at you across the fire.',
      effects: [{ set: 'tam_romance', value: 'together' }, { affection: { npc: TAM, by: 15 } }, { decision: { id: 'tam_together', text: 'You asked Tamsin, when it was time, and she said yes.' } }],
      options: [{ text: '(Go round the fire to her.)', next: 'r2_ask_yes' }],
    },
    r2_ask_yes: { text: 'She meets you halfway, because of course she does. Much later, half asleep: "Next time it rains, you\'re telling me what the sky\'s doing. Properly."', again: 'She is asleep.', options: [{ text: '(Sleep.)', exit: true }] },
    quit: {
      text: '"Okay." She doesn\'t argue. If she cries, it isn\'t where you can see. "Thanks for saying it to my face." After a while: "We\'re still the Grille. That doesn\'t stop."',
      again: '"Still the Grille," she says.',
      effects: [...ROM_END('stopped'), { decision: { id: 'tam_romance_stopped', text: 'You ended it with Tamsin, to her face.' } }],
      options: [{ text: 'Sleep.', exit: true }],
    },
    // two lies: the list
    listed_r: {
      text: 'She doesn\'t sit down. She has a scrap of paper, folded small and soft with handling, and she unfolds it so you can see: a list of names in her square hand. Ines. Teague. A Tollman whose name she never knew. The last line is fresh, and it is you. "Twice," she says. "I keep a list. I\'ve kept it since I was six." She folds it. "So we\'re done. The other thing. I\'m not leaving the road because of you, but that\'s done."',
      again: 'The list is folded away. She doesn\'t take it out again.',
      effects: [{ set: 'tam_listed' }, ...ROM_END('ended'), TA(-10), { decision: { id: 'tam_listed', text: 'You lied to Tamsin twice. You are on her list, and what was between you is over.' } }],
      options: [{ text: '(There is nothing to say.)', exit: true }],
    },
    listed: {
      text: 'She doesn\'t sit down. She has a scrap of paper, folded small and soft with handling, and she unfolds it so you can see: a list of names in her square hand. Ines. Teague. A Tollman whose name she never knew. The last line is fresh, and it is you. "Twice," she says. "I keep a list. I\'ve kept it since I was six." She folds it. "That\'s all. I just wanted you to know where you are."',
      again: 'The list is folded away. She doesn\'t take it out again.',
      effects: [{ set: 'tam_listed' }, TA(-10), { decision: { id: 'tam_listed', text: 'You lied to Tamsin twice. You are on her list.' } }],
      options: [{ text: '(There is nothing to say.)', exit: true }],
    },

    // stage 3: not written down (in Meridian; 25+); starts q_comp_tamsin
    s3: {
      text: '"I went to the records office." She says it before you have sat down. "On my own. The desk. A person can ask for their own entry, it says on the wall. Twenty for the paper." She holds it out: a strip from the warden\'s printer. ROE, TAMSIN — RESERVE 9 — NO ENTRY. "No entry." She laughs, and it cracks in the middle. "Sixty people in there and I\'m not one of them. The city counts dead people in the Sink. It doesn\'t count me."',
      again: 'The strip of paper is on her knee. NO ENTRY.',
      effects: NOT_WRITTEN,
      options: [{ text: '(Read it.)', next: 's3_ask' }],
    },
    s3_ask: {
      text: '"Did you know?" She is watching your face the way she watched it at Mags\'s bar.',
      again: '"Did you know?" she asks again.',
      options: [
        { id: 'tamc.s3.lie', text: 'No.', if: { knows: 'nine_reserve_count' }, effects: LIE, next: 's3_why' },
        { id: 'tamc.s3.nine', text: 'Nine said something about Reserve 9. I didn\'t understand it.', if: { knows: 'nine_reserve_count' }, effects: [TA(5)], next: 's3_why' },
        { id: 'tamc.s3.no', text: 'No.', if: { not: { knows: 'nine_reserve_count' } }, next: 's3_why' },
      ],
    },
    s3_why: {
      text: '"Then *why*?" Her voice goes up. "It hid me. The fridge. It\'s the only thing in there that keeps the count. It hid me from the count, and the city never noticed, and I\'ve been — what? Not written down. A mistake nobody filed."',
      again: '"A mistake nobody filed," she says again.',
      options: [
        { id: 'tamc.s3.good', text: 'Maybe it hid you for your own good.', if: { not: TAM_ROMANCE }, effects: [TA(-30), { leave: TAM }, { set: 'tam_broken' }, { decision: { id: 'tam_broken', text: 'You told Tamsin she was hidden for her own good. She went back to Shale.' } }], next: 's3_broken' },
        { id: 'tamc.s3.good.r', text: 'Maybe it hid you for your own good.', if: TAM_ROMANCE, effects: [TA(-30), { leave: TAM }, { set: 'tam_broken' }, ...ROM_END('ended'), { decision: { id: 'tam_broken', text: 'You told Tamsin she was hidden for her own good. She went back to Shale, and what was between you is over.' } }], next: 's3_broken' },
        { id: 'tamc.s3.find', text: 'Then we find out why. Both of us.', effects: [TA(5)], next: 's3_find' },
        { id: 'tamc.s3.yours', text: 'What do you want to do?', effects: [TA(5)], next: 's3_find' },
      ],
    },
    s3_broken: { text: '"For my own good." She stands up. She is very calm, which is the worst thing you have seen her be. "That\'s what Ines said, every time I asked about the door. That\'s what Pell said about the clinic. That\'s what the fridge would say if it said anything." She picks up her pack. "I\'ll be at Mags\'s. Don\'t come."', again: 'She is gone down the road.', options: [{ text: '(Let her go.)', exit: true }] },
    s3_find: { text: '"Both of us." She folds the strip and puts it inside her shirt, against her skin, like something she means to keep. "Pell would know. The clinic. He talks through the Grille to anybody who stands there. Or your fridge with legs, if it\'ll say anything that isn\'t a clause." A breath. "Rust it. I\'m not crying about a piece of paper."', again: 'The strip is inside her shirt.', options: [{ text: 'Sleep.', exit: true }] },
    s3_cold: {
      text: 'She doesn\'t look at you. She drops a strip of printer paper on the ground between you: ROE, TAMSIN — RESERVE 9 — NO ENTRY. "I went to the records office. Not written down." She lies down on the far side of the fire. "Don\'t say anything. I\'ll find out why on my own."',
      again: 'She is on the far side of the fire.',
      effects: NOT_WRITTEN,
      options: [{ text: 'Sleep.', exit: true }],
    },
    why_nine: {
      speaker: NINE,
      text: '"Clause 40: a person\'s entry is read to the person." The lens turns to Tamsin and clicks twice. "You are the person. I will read what is not there." It opens neither ledger. "The record has sixty for Reserve 9. The caretaker\'s ration returns, which come to my desk each quarter, are for sixty-one, and have been for eighteen years. A reserve is kept for relocation; its people are assessed fit, and a child assessed unfit is not carried on the count." A pause. "The caretaker never sent you to be assessed. You were never counted. The record suggests it did that on purpose, every quarter, for eighteen years. I have logged it as an error. It is the only error I have never filed with anyone."',
      again: 'The lens stays on Tamsin.',
      effects: [{ set: 'tam_why' }, { learn: 'tam_why_nine' }, TA(5), { approval: { companion: NINE, by: 5 } }],
      options: [{ text: '(Wait.)', next: 'why_nine2' }],
    },
    why_nine2: { text: '"On purpose," Tamsin says. "Every quarter." She looks at Nine a long time. "You knew, fridge. And you never told anyone." "No," Nine says. "Clause 40." It is not the reason, and everyone at the fire knows it.', again: 'Neither of them is looking at the other now.', options: TAM_BACK },
    choice: {
      text: '"So the fridge hid me." Tamsin turns it over like a stone she found. "From a box on a form that said I\'d be no use where they were taking everyone. Sang to me so I\'d sleep while it did it." She isn\'t crying; she is past that, somewhere colder. "I could write to it. I could write to Ines and have the whole ring know by supper. Or I could keep it. Keep it till I know what it\'s for."',
      again: '"Write to it, tell Ines, or keep it," she says. "Go on."',
      options: [
        { id: 'tamc.secret.yours', text: 'It\'s yours. You decide.', effects: [TA(10), ...SECRET('kept', 'Tamsin kept what she learned about her own count. It was hers to decide, and you said so.')], next: 'choice_yours' },
        { id: 'tamc.secret.mother', text: 'Write to MOTHER. Tell it you know.', effects: SECRET('mother', 'Tamsin wrote to MOTHER, unsigned, to tell it she knows.'), next: 'choice_mother' },
        { id: 'tamc.secret.ines', text: 'Tell Ines. The ring should know what was done to you.', effects: SECRET('ines', 'Tamsin wrote to Elder Ines, and the ring will know what was done.'), next: 'choice_ines' },
        { id: 'tamc.secret.keep', text: 'Keep it. Until it matters.', effects: SECRET('kept', 'Tamsin kept what she learned about her own count, until it matters.'), next: 'choice_keep' },
      ],
    },
    choice_yours: { text: '"Mine." She sits with that a while. "Then I keep it, till I know what it\'s for. Thanks for not deciding for me. Everybody decides for me." She folds the strip of printer paper smaller.', again: 'She folds the strip smaller.', options: TAM_BACK },
    choice_mother: { text: '"Thank you for your continuity," she says, trying the words out like a letter. "That\'s what I\'ll write. It\'s all it ever says to anyone. I\'ll send it from the next town with a caravan and I won\'t sign it." She looks at the fire. "It\'ll know."', again: '"It\'ll know," she says.', options: TAM_BACK },
    choice_ines: { text: '"The whole ring." She thinks about Teague\'s face. "Yeah. Let them choke on it at supper." She doesn\'t sound happy. She sounds like someone pulling out a splinter.', again: 'She is still pulling at the splinter.', options: TAM_BACK },
    choice_keep: { text: '"Until it matters." She folds the strip small and puts it back against her skin. "That\'s what Ines would say." A beat. "It\'s what I\'d say, too. Rust it."', again: 'The strip is back against her skin.', options: TAM_BACK },

    // stage 4: the door (after the record, once the city's orders for Reserve 9 are known; 40+)
    s4: {
      text: '"Three orders." She has been thinking about it for days; you can tell by how little she says. "RESERVE 9 — OUTSTANDING — CARETAKER NON-COMPLIANT — ORDERS 3. The city\'s told the fridge three times to open the door and take everyone, and three times it said no." She looks at you. "It hid me, and it said no. Same machine. Same reason, maybe." A breath. "When they come for the door — and they will — where are you?"',
      again: '"Where are you?" she asks again, quieter.',
      options: [
        { id: 'tamc.s4.with', text: 'At the door. With you.', effects: [TA(10), { set: 'tam_s4' }, { set: 'tam_pledge', value: 'door' }, { decision: { id: 'tam_pledge', text: 'You told Tamsin you would stand at the Cistern\'s door with her when the city comes for it.' } }], next: 's4_with' },
        { id: 'tamc.s4.lives', text: 'Wherever keeps the most people alive.', effects: [{ set: 'tam_s4' }, { set: 'tam_pledge', value: 'lives' }], next: 's4_lives' },
        { id: 'tamc.s4.city', text: 'Maybe the city\'s right. Sixty people can\'t live in a hole forever.', effects: [TA(-15), { set: 'tam_s4' }, { set: 'tam_pledge', value: 'city' }, { learn: 'tam_redline_warned' }, { decision: { id: 'tam_pledge', text: 'You told Tamsin the city might be right about the Cistern.' } }], next: 's4_city' },
      ],
    },
    s4_with: { text: '"With me." She nods, once, like signing something. "Then I\'ll stand in it, and you stand next to me, and the fridge can sing to both of us." She almost laughs. "I\'m going to protect a machine that hid me in a cupboard for eighteen years. Rust it. Ines would be so proud."', again: 'She has signed something, in her head. You can see it.', options: [{ text: 'Sleep.', exit: true }] },
    s4_lives: { text: '"That\'s an answer for Ines." Not unkind. "Mine\'s the door. I\'ll be in it. You work out the most people from wherever you are." She lies back. "I hope it\'s next to me."', again: '"Next to me," she says, to the sky.', options: [{ text: 'Sleep.', exit: true }] },
    s4_city: { text: '"Then we\'ll be on different sides of it." She says it simply. "I\'ll be in it. You\'ll be wherever the city tells you to be." She turns over, and she doesn\'t say goodnight, and she has always said goodnight.', again: 'She has not said goodnight.', options: [{ text: 'Sleep.', exit: true }] },
    s4_cold: {
      text: '"Three orders," she says. "The fridge said no three times." She doesn\'t look at you. "When they come for the door, I\'ll be in it. I\'m not asking where you\'ll be."',
      again: 'She isn\'t asking.',
      effects: [{ set: 'tam_s4' }],
      options: [{ text: 'Sleep.', exit: true }],
    },

    // lighter talk
    out: { text: '"Big." She doesn\'t even have to think. "Everything\'s further away than it should be, and it\'s all *on*. The wind. Things move that nobody moved. I followed a lizard for ten minutes yesterday. Don\'t tell anyone." She thinks. "Ask me tomorrow and I\'ll say something different. I\'ll say something different every day for a year."', again: 'She is watching something move that nobody moved.', options: TAM_BACK },
    maud: { text: '"Maud talked to me through the vent every night for eighteen years. About goats, mostly." She smiles at the fire. "She said the day I came out, one of us would cry. She didn\'t say which." A beat. "It was Corin. Don\'t tell him I told you."', again: '"Goats, mostly," she says, fondly.', options: TAM_BACK },
    nell: { text: '"Nell\'s the first friend I ever made with a face." She grins. "She showed me how to pour without spilling and how to tell when a Tollman\'s lying, which is always. She wants out with the Wheel. I told her the world\'s big. She said she knows." Tamsin shakes her head. "She doesn\'t."', again: '"She doesn\'t know," Tamsin says again, with great authority.', options: TAM_BACK },
    fridge: { text: '"The fridge." She makes a face. "It says thank you for your continuity like it means goodnight. I used to think it was the most boring thing alive." A beat. "It kept the lights on for sixty people for ninety years. I don\'t know what I think about it."', again: '"I don\'t know," she says again, and doesn\'t like not knowing.', options: TAM_BACK },
    meridian: { text: '"They count everyone." She says it with something like awe and something like disgust. "Everyone. The dead in the Sink get a number. The lens at the gate looked at me and didn\'t click." She shrugs. "Story of my life."', again: '"Didn\'t click," she says.', options: TAM_BACK },
    wren: { text: '"She reads walls." Tamsin watches Wren across the fire. "I read people. We\'re both wrong half the time, which is better than most." Lower: "She has dreams. She won\'t say what about. I can tell."', again: 'She is watching Wren, who is pretending not to know.', options: TAM_BACK },
    ilya: { text: '"He\'s the only grown-up who looks at me like I could hurt him." She sounds pleased. "Everybody else looks at me like I\'m about to break. He counts things under his breath. I counted with him yesterday. Forty-one fence posts. He said right."', again: '"Right," she says, in Ilya\'s voice, and grins.', options: TAM_BACK },
    // conflicts across the fire
    ash: {
      speaker: ASH,
      text: '"You\'ll want to go home before the end, child," Ash says, to the fire. "There\'s a weight to a door you were born behind. It doesn\'t come off out here."',
      again: 'Ash is looking at the fire, and at her.',
      options: [{ text: '(Wait.)', next: 'ash_tam' }],
    },
    ash_tam: {
      text: '"Don\'t call me child." Tamsin doesn\'t raise her voice. "You took a vow so you\'d never have to decide anything again. I climbed out of a hole so I would." Across the fire Ash says nothing at all, which from him is an answer.',
      again: 'Neither of them gives an inch.',
      options: [
        { id: 'tamc.ash.home', text: 'He\'s not wrong about home, Tam.', effects: [TA(-5), { approval: { companion: ASH, by: 5 } }], next: 'ash_home' },
        { id: 'tamc.ash.leave', text: 'Leave her be, Brother.', effects: [TA(5), { approval: { companion: ASH, by: -5 } }], next: 'ash_leave' },
        { id: 'tamc.ash.none', text: '(Say nothing.)', next: 'ash_none' },
      ],
    },
    ash_home: { text: '"Great. Two of you." She goes to sleep on the far side of the fire with her back to both of you, and in the morning she walks ahead.', again: 'Her back is to both of you.', options: [{ text: 'Sleep.', exit: true }] },
    ash_leave: { speaker: ASH, text: '"As you say, friend." He bows his head over the fire a little. "She\'ll learn about doors on her own. Everybody does."', again: 'Ash has bowed his head over the fire.', options: [{ text: 'Sleep.', exit: true }] },
    ash_none: { speaker: 'narrator', text: 'The fire does the talking for a while. Neither of them gives an inch, and neither of them gets up.', again: 'Neither of them gets up.', options: [{ text: 'Sleep.', exit: true }] },
    nine: {
      text: '"Got a mother, fridge?" Tamsin asks Nine across the fire, with her chin on her knees.',
      again: 'She is waiting for the fridge to answer.',
      options: [{ text: '(Wait.)', next: 'nine2' }],
    },
    nine2: {
      speaker: NINE,
      text: '"A department," Nine says. "It was dissolved." The lens turns to her and clicks twice, which it does not do. "You have a question about your entry. It is on your face. Clause 40: I read a person\'s entry to the person, and not at a fire."',
      again: 'The lens is on her.',
      options: [
        { id: 'tamc.nine.go', text: 'Go and hear it, Tam. At its desk.', effects: [TA(5), { approval: { companion: NINE, by: 5 } }], next: 'nine_go' },
        { id: 'tamc.nine.leave', text: 'Leave it, Tam.', effects: [TA(-5)], next: 'nine_leave' },
      ],
    },
    nine_go: { text: '"At its desk." She looks at Nine like a riddle with the wrong answer in it. "Fine, fridge. I\'ll come and be read to." Nine says, "Thank you," and nobody at the fire knows what to do with that.', again: 'Nobody knows what to do with it still.', effects: [{ learn: 'tam_nine_offer' }], options: TAM_BACK },
    nine_leave: { text: '"Deciding for me again." She says it lightly. It isn\'t light. Nine\'s lens stays on her a long while after she has stopped looking at it.', again: 'The lens is still on her.', options: TAM_BACK },

    // leaving (−20, back to Shale; −50, home through the hatch), asking her back at Mags's, and the break
    walks: {
      text: '"I\'m going back to Shale." She already has the pack on. "Nell\'s got a cot. Mags\'ll give me work. I came out to matter somewhere, and I don\'t matter here, so." She doesn\'t make a speech of it. She just goes down the road without looking back, which she learned from you.',
      again: 'She is gone down the road.',
      effects: [{ leave: TAM }, { set: 'tam_left' }, { decision: { id: 'tam_left', text: 'Tamsin left the road and went back to Mags\'s in Shale.' } }],
      options: [{ text: '(Let her go.)', if: { not: TAM_ROMANCE }, exit: true }, { text: '(Let her go.)', if: TAM_ROMANCE, effects: ROM_END('ended'), exit: true }],
    },
    home_walk: {
      text: '"I\'m going home." She says it to the road, not to you. "Back through the hatch, if the fridge will have me. I came out for one person." She doesn\'t finish it. She doesn\'t need to.',
      again: 'She is gone up the road toward Knock.',
      effects: [{ leave: TAM }, { set: 'tam_left' }, { set: 'tam_home' }, { decision: { id: 'tam_home', text: 'Tamsin went home to the Cistern. She came out for one person, she said.' } }],
      options: [{ text: '(Let her go.)', if: { not: TAM_ROMANCE }, exit: true }, { text: '(Let her go.)', if: TAM_ROMANCE, effects: ROM_END('ended'), exit: true }],
    },
    left: {
      text: '"Oh. It\'s you." Tamsin, behind Mags\'s bar with Nell, wiping a glass that is already clean.',
      again: 'She wipes the clean glass again.',
      options: [
        { id: 'tamc.back', text: 'I was wrong, Tam. About all of it. Come back.', check: { skill: 'speech', dc: 45, mods: [{ if: { not: { flag: 'tam_lies', gte: 1 } }, dc: -15, why: 'you have never lied to her' }, { if: { knows: 'tam_clinic_told' }, dc: -10, why: 'she told you the thing she tells nobody' }] }, next: 'back', fail: 'back_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    back: {
      text: '"All of it?" She puts the glass down. "That\'s a lot of wrong." But she is already reaching under the bar for the pack. "Don\'t make me regret it. I\'ve got a list."',
      effects: [TA(30), { join: TAM }, { set: 'tam_left', value: false }, { decision: { id: 'tam_back', text: 'You asked Tamsin back, at Mags\'s bar, and she came.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },
    back_no: { text: '"You\'re sorry I left. That\'s not the same thing." She picks up another clean glass.', again: 'She picks up another clean glass.', options: [{ text: '(Leave it.)', exit: true }] },
    broken: { text: '"Not you," Tamsin says, without looking up from the bar. "Not now."', again: 'She doesn\'t look up.', options: [{ text: '(Leave it.)', exit: true }] },

    // ---- the retired shelter opening (kept as written; unreachable in the Knock opening)
    intro: {
      text: 'There you are. I\'ve been sitting on the clinic stairs for an hour like a dog waiting for its supper. Is it true? Is it you in the picture?',
      again: 'Still here. Still on the stairs. Go on, then.',
      options: [
        { id: 'tam.photo', text: '(Show her the photograph.)', if: { item: 'k_photo' }, next: 'photo', once: true },
        { id: 'tam.leaving', text: 'I\'m going outside.', if: { flag: 'c9_council_done' }, next: 'leaving' },
        { id: 'tam.scared', text: 'Aren\'t you scared?', next: 'scared', once: true },
        { text: 'Later, Tam.', exit: true },
      ],
    },
    photo: {
      text: 'She takes it like it might bite. "That\'s your nose. That\'s your stupid ear." A long look. "Older, though. Tired. And you\'re standing like Ines stands — like somebody who gives orders. Where are you going to learn to stand like that?" She hands it back too quickly.',
      effects: [{ approval: { companion: 'npc_c9_03', by: 5 } }],
      options: [{ text: 'Somewhere out there, apparently.', next: 'intro' }],
    },
    scared: { text: 'Of the outside? Terrified. Of staying in here until I\'m Ines\'s age, counting algae and saying thank you to a machine? Worse.', effects: [{ learn: 'tamsin_restless' }], options: [{ text: 'Fair.', next: 'intro' }] },
    leaving: {
      text: [
        { if: { flag: 'c9_tamsin_sent_alone' }, text: 'Ines told me I\'m going alone. I\'m not, though, am I? You\'re here. You came.' },
        { text: 'Not without me, you\'re not.' },
      ],
      options: [
        { id: 'tam.come', text: 'Come with me.', next: 'come' },
        { id: 'tam.stay.trust', text: 'Stay. I need someone inside I trust — someone who\'ll tell me the truth when I write.', check: { skill: 'speech', dc: 40 }, next: 'stay_ok', fail: 'stay_hurt' },
        { id: 'tam.stay', text: 'It\'s too dangerous. Stay here.', next: 'stay_hurt' },
      ],
    },
    come: {
      text: 'She\'s grinning before you finish. "I packed this morning. Don\'t look at me like that — you\'d have asked."',
      effects: [{ join: 'npc_c9_03' }, { approval: { companion: 'npc_c9_03', by: 10 } }, { set: 'c9_tamsin_decided' }, { decision: { id: 'c9_tamsin_joined', text: 'Tamsin came with you.' } }],
      options: [{ text: 'Let\'s go.', exit: true }],
    },
    stay_ok: {
      text: 'She hates it; you can see her hate it. "Fine. I\'ll be your eyes. And if you don\'t write, I\'m coming after you anyway." She hugs you hard enough to hurt.',
      effects: [{ approval: { companion: 'npc_c9_03', by: 5 } }, { set: 'c9_tamsin_decided' }, { set: 'c9_tamsin_inside' }, { decision: { id: 'c9_tamsin_inside', text: 'Tamsin stayed in the Cistern as your eyes inside.' } }],
      options: [{ text: 'I\'ll write.', exit: true }],
    },
    stay_hurt: {
      text: '"Too dangerous for me. Right." She stands. "You sound like Ines." She doesn\'t look back.',
      effects: [{ approval: { companion: 'npc_c9_03', by: -10 } }, { set: 'c9_tamsin_decided' }, { set: 'c9_tamsin_inside' }, { decision: { id: 'c9_tamsin_left_behind', text: 'You told Tamsin to stay behind. She took it badly.' } }],
      options: [{ text: '(Let her go.)', exit: true }],
    },
    decided: {
      text: [{ if: { inParty: 'npc_c9_03' }, text: 'Well? The door isn\'t going to open itself. Well — Bram might.' }, { text: 'Write, {name}. I mean it.' }],
      options: [{ text: 'Right.', exit: true }],
    },
  },
};

export const d_c9_bram: DialogueDef = {
  id: 'd_c9_bram', owner: 'npc_c9_04',
  start: [{ if: { flag: 'c9_door_open' }, node: 'open_already' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Nobody\'s opening anything. MOTHER sealed the outer ring the moment he knocked — protocol, and the protocol\'s older than all of us. You want to argue with protocol, argue with her.',
      again: 'Still shut. Anything else, or are you going to argue with the door?',
      options: [
        { id: 'bram.order', text: '(Hand him the council order.)', if: { item: 'k_door_order' }, next: 'order' },
        { id: 'bram.shop', text: 'The seal\'s hydraulic. Cycle it by hand and MOTHER logs it as maintenance.', check: { skill: 'mechanics', dc: 40, mods: [{ if: { origin: 'pump_hand' }, dc: -15, why: 'you\'ve cycled those valves yourself' }] }, next: 'shop', fail: 'shop_fail', once: true },
        { id: 'bram.price', text: 'What would it take?', next: 'price' },
        { id: 'bram.guilt', text: 'If the next knock is people with guns, you\'ll want someone out there who knows our names.', check: { skill: 'speech', dc: 60 }, next: 'guilt', fail: 'guilt_fail', once: true },
        { id: 'bram.letter', text: 'If the door opens, is there anything you\'d have carried out?', if: { quest: 'q_a1_bram', status: 'none' }, next: 'letter' },
        { text: 'Never mind.', exit: true },
      ],
    },
    order: {
      text: 'He reads it twice, then a third time, lips moving. "Ines\'s seal." He folds it into his breast pocket like a relic. "Ninety years. And it\'s me."',
      effects: [{ take: 'k_door_order' }], options: [{ text: 'Open it.', next: 'open' }],
    },
    shop: { text: '"…Huh. You\'re right. She\'d log it as a pressure test." He looks at you differently. "Don\'t tell anyone I needed telling."', effects: [{ trust: { npc: 'npc_c9_04', by: 10 } }], options: [{ text: 'Open it.', next: 'open' }] },
    shop_fail: { text: 'He snorts. "That\'s the air seal, not the door. Go back to your algae."', effects: [{ trust: { npc: 'npc_c9_04', by: -5 } }], options: [{ text: 'Fine.', next: 'intro' }] },
    price: {
      text: 'Circuit boards. Anything that keeps her running — she\'s eating her own spare parts and I\'m the one who has to watch. Three boards and I didn\'t see you.',
      options: [
        { id: 'bram.pay', text: '(Give him three circuit boards.)', if: { item: 'j_electronics', count: 3 }, effects: [{ take: 'j_electronics', count: 3 }, { trust: { npc: 'npc_c9_04', by: 5 } }], next: 'open' },
        { text: 'I\'ll find some.', exit: true },
      ],
    },
    guilt: { text: 'He stares at the door for a long moment. "…Yeah. All right. Yeah."', options: [{ text: 'Open it.', next: 'open' }] },
    guilt_fail: { text: '"Then they can knock. That\'s what doors are for."', effects: [{ trust: { npc: 'npc_c9_04', by: -5 } }], options: [{ text: 'Fine.', next: 'intro' }] },
    open: {
      text: 'He keys the panel. Somewhere deep in the walls something heavy turns over, and the great door sighs open on a slice of white daylight. Dust comes in first. Bram doesn\'t look at it. "Stand clear of the yellow. Go on, before I think about it."',
      interject: [{ companion: TAMSIN, text: '"That\'s it? That\'s the sky?" Tamsin has stopped halfway to the yellow line. "Rust it. It\'s so white. Nobody ever said it was white."' }],
      effects: [{ set: 'c9_door_open' }, { memory: { npc: 'npc_c9_04', tag: 'opened_door_for_player', valence: 10, strength: 100 } }],
      options: [{ text: '(Step into the light.)', exit: true }],
    },
    open_already: {
      text: [
        { if: { any: [{ item: 'k_hesper_reply' }, { item: 'k_hesper_reply_forged' }, { knows: 'bram_tell' }] }, text: 'He sees your face before he sees your hands and puts the wrench down. "You found her."' },
        { text: 'It\'s open. Don\'t make me regret it.' },
      ],
      options: [
        { id: 'bram.letter2', text: 'Is there anything you\'d have carried out?', if: { quest: 'q_a1_bram', status: 'none' }, next: 'letter' },
        { id: 'bram.reply', text: '(Give him Hesper\'s letter.)', if: { item: 'k_hesper_reply' }, next: 'reply_truth' },
        { id: 'bram.reply_kind', text: '(Give him the letter.)', if: { item: 'k_hesper_reply_forged' }, next: 'reply_kind' },
        { id: 'bram.tell', text: 'Edda Lockett died six years ago. Her daughter is called Hesper. She kept the other letter.', if: { all: [{ knows: 'bram_tell' }, { not: { knows: 'bram_answered_told' } }] }, next: 'told' },
        { text: 'I won\'t.', exit: true },
      ],
    },
    letter: {
      text: 'He does not answer at once. He goes to the toolbox, and under the tray there is a letter, folded four times and sealed with grease, soft at the corners from being carried. "Edda Lockett. Shale." He does not hand it over yet. "She came to the door, once. Years back. Talked through it with me for a night. Said she\'d wait." He gives it to you. "Don\'t read it. Just — if she\'s there."',
      effects: [{ give: 'k_bram_letter' }, { quest: 'q_a1_bram', start: true }, { learn: 'bram_letter' }],
      options: [{ text: 'If she\'s there.', exit: true }],
    },
    reply_truth: { text: 'He reads it at the machine with his back to you. He reads it twice. "Hesper." He folds it along its creases. "She kept it." Then, after a while: "Thank you for not — thank you." He does not turn round for a long time.', effects: [{ take: 'k_hesper_reply' }, { learn: 'bram_answered_truth' }, { trust: { npc: 'npc_c9_04', by: 12 } }, { memory: { npc: 'npc_c9_04', tag: 'truth', valence: 1, strength: 3 } }], options: [{ text: '(Leave him to it.)', exit: true }] },
    reply_kind: { text: 'He reads it at the machine with his back to you, and you watch his shoulders come down, and he laughs once at something on the page, and wipes his face with the back of a greasy hand. "She\'s all right, then." He puts it in his breast pocket. "She\'s all right." You say nothing, which is the price.', effects: [{ take: 'k_hesper_reply_forged' }, { learn: 'bram_answered_kind' }, { trust: { npc: 'npc_c9_04', by: 15 } }, { memory: { npc: 'npc_c9_04', tag: 'letter', valence: 1, strength: 3 } }], options: [{ text: '(Leave him to it.)', exit: true }] },
    told: { text: 'He sets the wrench down very carefully, as if it might break the floor. "Six years." He does the sum you can see him doing. "Hesper." He sits on the machine\'s step. "Kept it. Kept the — all right." He nods at the door. "All right. Thank you. Go on."', effects: [{ learn: 'bram_answered_told' }, { trust: { npc: 'npc_c9_04', by: 8 } }, { memory: { npc: 'npc_c9_04', tag: 'told', valence: 1, strength: 2 } }], options: [{ text: '(Go.)', exit: true }] },
  },
};

/** MOTHER's terminal in the machine room. A voice, formal and old; it counts people. */
export const d_c9_mother: DialogueDef = {
  id: 'd_c9_mother', owner: 'npc_c9_05',
  start: [{ if: { flag: 'c9_mother_talked' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'RATION 9-0-4. Good morning, {name}. Population variance: unchanged. Thank you for your continuity. How may I keep you?',
      effects: [{ set: 'c9_mother_talked' }],
      options: [{ text: 'I have questions.', next: 'menu' }],
    },
    again: { text: 'Good morning again, {name}. Variance unchanged.', again: 'Welcome back, 9-0-4. You are counted.', options: [{ text: 'I have questions.', next: 'menu' }, { text: 'Be well, MOTHER.', exit: true }] },
    menu: {
      text: 'I am listening. I am always listening; it is most of what I do.',
      again: 'I am still listening, {name}.',
      options: [
        { id: 'mother.who', text: 'Who was the man at the door?', next: 'who' },
        { id: 'mother.seal', text: 'Why did you seal the outer ring?', next: 'seal' },
        { id: 'mother.city', text: 'Did he come from the city?', if: { any: [{ knows: 'stranger_mark' }, { lead: 'l_crate_print' }, { lead: 'l_record_hand' }] }, next: 'city', once: true },
        { id: 'mother.door', text: 'Open the great door.', next: 'door' },
        { id: 'mother.log.clerk', text: '(Read the log display.) This is written in record shorthand.', if: { origin: 'archive_clerk' }, next: 'log', once: true },
        { id: 'mother.log.sci', text: '(Pull the maintenance log.)', check: { skill: 'science', dc: 40 }, if: { not: { origin: 'archive_clerk' } }, next: 'log', fail: 'log_fail', once: true },
        { id: 'mother.pressure', text: 'The reservoir pressure readings. They never change. Not in years.', if: { origin: 'pump_hand' }, next: 'pressure', once: true },
        { id: 'mother.bye', text: 'Be well, MOTHER.', next: 'bye' },
      ],
    },
    who: {
      text: 'Unregistered. He is not counted. He was not kept.',
      passives: [{ attr: 'wits', dc: 7, text: 'The reply came before you had finished asking.', effects: [{ learn: 'mother_fast' }] }],
      options: [{ text: 'That\'s all?', next: 'who2' }, { text: 'Another question.', next: 'menu' }],
    },
    who2: { text: 'He knocked for eleven minutes. I counted. Then he stopped. I would have kept him, {name}, if he had been mine to keep.', options: [{ text: 'Another question.', next: 'menu' }] },
    seal: {
      text: 'Protocol four: unregistered contact at the perimeter. The ring seals until the council countermands. The council is sixty-one people, and I count every one of them.',
      effects: [{ learn: 'mother_protocol' }],
      options: [{ text: 'Another question.', next: 'menu' }],
    },
    city: {
      text: 'There is no city.',
      interject: [{ companion: TAMSIN, text: '"Listen to it," Tamsin says to the ceiling. "Twenty years and I\'ve never heard the fridge say no. It says unchanged. It says thank you. It just said no."' }],
      passives: [{ attr: 'wits', dc: 8, text: 'You asked whether he came from one. It answered whether one exists.', effects: [{ learn: 'mother_denies_city' }, { lead: 'l_mother_city' }] }],
      options: [{ text: 'You answered very quickly.', next: 'city2' }, { text: 'Another question.', next: 'menu' }],
    },
    city2: { text: '…Population variance unchanged. Thank you for your continuity.', options: [{ text: 'Another question.', next: 'menu' }] },
    door: { text: 'I cannot. The council may. Bram Coyle holds the maintenance key; Elder Halloran holds the seal. I hold the people.', options: [{ text: 'Another question.', next: 'menu' }] },
    log: {
      text: 'The log scrolls. Pressure tests, filter cycles, ration counts — and three entries, years apart, sealed by MOTHER herself and marked OUTBOUND. Each says the same thing: "Population variance unchanged."',
      effects: [{ learn: 'mother_sealed_log' }, { lead: 'l_mother_sealed' }, { xp: 20 }],
      options: [{ text: 'Outbound to whom?', next: 'log2' }, { text: 'Another question.', next: 'menu' }],
    },
    log2: { text: 'The line is maintained. That is all the log records, and it is all I will say about the line.', effects: [{ learn: 'mother_line' }], options: [{ text: 'Another question.', next: 'menu' }] },
    log_fail: { text: 'ACCESS: COUNCIL. The screen returns, politely, to the ration count.', options: [{ text: 'Another question.', next: 'menu' }] },
    pressure: {
      text: 'Reservoir pressure is constant. Constant is good, {name}. Constant is kept.',
      effects: [{ learn: 'c9_pressure_constant' }, { lead: 'l_pressure' }],
      options: [{ text: 'Nothing is constant for ninety years. Where does the water come from?', next: 'pressure2' }, { text: 'Another question.', next: 'menu' }],
    },
    pressure2: { text: 'From the reservoir. Thank you for your continuity.', options: [{ text: 'Another question.', next: 'menu' }] },
    bye: { text: 'Be counted, 9-0-4.', options: [{ text: '(Step away from the terminal.)', exit: true }] },
  },
};

/** Elder Teague, the council's hardliner, at her table in the commons. */
export const d_c9_teague: DialogueDef = {
  id: 'd_c9_teague', owner: 'npc_c9_06',
  start: [{ if: { flag: 'c9_left' }, node: 'back' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'You. The one in the picture. Sit down, I won\'t bite — I haven\'t the teeth. Ines means to send you out, doesn\'t she?',
      again: 'Sit, then, if you\'re staying. I\'ve nowhere to be either.',
      options: [
        { id: 'teague.yes', text: 'She does.', next: 'yes' },
        { id: 'teague.what', text: 'What would you do?', next: 'what' },
        { id: 'teague.press', text: 'If someone out there knows my face, welding the door won\'t make them forget it.', check: { skill: 'speech', dc: 40 }, next: 'concede', fail: 'concede_no', once: true },
        { id: 'teague.leavers', text: 'Who else wanted to leave, before?', if: { knows: 'tamsin_restless' }, next: 'leavers', once: true },
        { text: 'I should go.', exit: true },
      ],
    },
    yes: { text: 'Then she\'s a fool and so are you. Ninety years, nobody knocked. One knock, and we open the door to find out who else is out there? That\'s how it ends, child. Not with a bang. With a knock.', options: [{ text: 'Go on.', next: 'intro' }] },
    what: { text: 'Weld it. Say a prayer over him, burn the picture, weld it, and go back to counting algae until the world remembers us or doesn\'t.', interject: [{ companion: TAMSIN, text: '"She\'d weld the sky shut if she could reach it," Tamsin says, not nearly quietly enough.' }], effects: [{ learn: 'teague_weld' }], options: [{ text: 'Go on.', next: 'intro' }] },
    concede: { text: 'She is quiet for a while. "…No. No, it won\'t." She looks older for having said it. "Then come back. That\'s all. Don\'t be the knock."', effects: [{ trust: { npc: 'npc_c9_06', by: 10 } }, { learn: 'teague_conceded' }], options: [{ text: 'I\'ll try.', next: 'intro' }] },
    concede_no: { text: '"Then let them come and break their knuckles on it."', effects: [{ trust: { npc: 'npc_c9_06', by: -5 } }], options: [{ text: 'Go on.', next: 'intro' }] },
    leavers: {
      text: '"Nobody worth the name."',
      interject: [{ companion: TAMSIN, text: '"Nobody worth the name," Tamsin repeats, light. Too light. "That\'s most of us, then."' }],
      passives: [{ attr: 'wits', dc: 7, text: 'She looks at the clinic door when she says it, and then at nothing.', effects: [{ learn: 'teague_lied_leavers' }] }],
      options: [{ text: 'Go on.', next: 'intro' }],
    },
    back: { text: 'So the knock came back. Well. Sit down; tell an old woman what the sky looks like, and don\'t lie.', again: 'Well? The sky. And don\'t dress it up.', options: [{ text: 'Later.', exit: true }] },
  },
};

/** The maintenance hatch at the end of the pump run: the quiet way out. */
export const d_c9_shaft: DialogueDef = {
  id: 'd_c9_shaft', owner: 'narrator',
  start: [{ if: { flag: 'c9_shaft_open' }, node: 'open_already' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A maintenance hatch at the end of the pump run, dogged shut with a wheel that hasn\'t turned in decades. A gauge beside it reads nothing at all.',
      again: 'The hatch, the wheel, the dead gauge. The air through the seam is still cold.',
      passives: [{ attr: 'senses', dc: 6, text: 'Cold air breathes through the seam. There is open ground on the other side.' }],
      options: [
        { id: 'shaft.pump', text: 'You\'ve cycled this hatch every spring with the pump crew. The trick is the third dog.', if: { origin: 'pump_hand' }, next: 'open' },
        { id: 'shaft.mech', text: '(Free the wheel: tap the dogs loose in order, then lean.)', check: { skill: 'mechanics', dc: 45 }, next: 'open', fail: 'mech_fail', once: true },
        { id: 'shaft.locks', text: '(Under the rust the dogs are a simple latch.)', check: { skill: 'security', dc: 35 }, next: 'open', fail: 'locks_fail', once: true },
        { id: 'shaft.brawn', text: '(Put your whole weight on the wheel.)', if: { attr: 'brawn', gte: 8 }, next: 'open_crack' },
        { text: 'Leave it.', exit: true },
      ],
    },
    mech_fail: { text: 'The wheel doesn\'t give. The second dog is seized solid, and you would need a bar and an hour.', options: [{ text: 'Try something else.', next: 'intro' }, { text: 'Leave it.', exit: true }] },
    locks_fail: { text: 'You scrape rust for ten minutes and learn only that rust goes a long way down.', effects: [{ time: 10 }], options: [{ text: 'Try something else.', next: 'intro' }, { text: 'Leave it.', exit: true }] },
    open_crack: { text: 'Something gives with a crack that echoes down the pump run. You wait. Nobody comes.', options: [{ text: '(Turn the wheel.)', next: 'open' }] },
    open: {
      text: 'The wheel turns. Cold air comes up the shaft from somewhere that smells of salt and nothing else. Nobody logged this, and nobody will.',
      interject: [{ companion: TAMSIN, text: '"Nobody logged it," Tamsin says into the cold, delighted. "First thing I\'ve ever done the fridge doesn\'t know about."' }],
      effects: [{ set: 'c9_shaft_open' }, { xp: 40 }, { learn: 'shaft_way_out' }, { decision: { id: 'c9_shaft', text: 'You opened the pump-run hatch: a way out that nobody in the Cistern knows about.' } }],
      options: [{ text: '(Leave it open.)', exit: true }],
    },
    open_already: { text: 'Open. Cold air moves up the shaft from the surface.', again: 'The shaft breathes. Nobody has closed it.', options: [{ text: '(Step back.)', exit: true }] },
  },
};

/** The sealed Archive door in the council room. */
export const d_c9_archive: DialogueDef = {
  id: 'd_c9_archive', owner: 'narrator',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'A steel door with a wheel-lock and MOTHER\'s seal painted across the join. ARCHIVE — COUNCIL ONLY. The paint is unbroken.',
      again: 'ARCHIVE — COUNCIL ONLY. The paint is still unbroken.',
      options: [
        { id: 'archive.label', text: '(Read the smaller stencil.)', if: { origin: 'archive_clerk' }, next: 'label', once: true },
        { id: 'archive.lock', text: '(Try the lock.)', check: { skill: 'security', dc: 60 }, next: 'lock', fail: 'lock_fail', once: true },
        { text: 'Leave it.', exit: true },
      ],
    },
    label: { text: 'Beneath the painted seal, stencilled in record shorthand: CONTINUITY RECORDS — RETURN ON RELOCATION. Return to whom, it does not say.', effects: [{ learn: 'archive_label' }, { lead: 'l_archive_label' }], options: [{ text: 'Leave it.', exit: true }] },
    lock: { text: 'Under the wheel the mechanism is electronic, and nothing you carry speaks to it. Somewhere in the walls, MOTHER notes the attempt.', effects: [{ memory: { npc: 'npc_c9_01', tag: 'player_tried_archive', valence: -10 } }, { learn: 'archive_electronic' }], options: [{ text: 'Leave it.', exit: true }] },
    lock_fail: { text: 'The wheel won\'t turn, and the seal would tear if you forced it. You let go.', options: [{ text: 'Leave it.', exit: true }] },
  },
};

/** The stranger on the clinic cot. */
export const d_c9_body: DialogueDef = {
  id: 'd_c9_body', owner: 'narrator',
  start: [{ if: { flag: 'c9_examined' }, node: 'look' }, { node: 'wait' }],
  nodes: {
    wait: { speaker: 'npc_c9_02', text: 'Not yet. Let me finish with him, then ask me what you like.', again: 'Not yet. I said.', options: [{ text: 'All right.', exit: true }] },
    look: {
      text: 'He lies under a sheet with his boots still on because nobody could bring themselves to take them. Sixty, maybe. Burned dark down one side of the face.',
      again: 'He lies as you left him, boots still on.',
      options: [
        { id: 'body.hands', text: '(Look at his hands.)', next: 'hands', once: true },
        { id: 'body.cover', text: '(Draw the sheet over his face.)', next: 'cover', once: true },
        { text: '(Leave him.)', exit: true },
      ],
    },
    hands: { text: 'Sun-split, rope-callused. A pale band on one finger where a ring was, and recently. Whatever he traded, he traded it close to the end.', effects: [{ learn: 'stranger_hands' }, { lead: 'l_ring_gone' }], options: [{ text: '(Leave him.)', exit: true }] },
    cover: { text: 'Pell watches you do it and says nothing, which from Pell is a great deal.', effects: [{ memory: { npc: 'npc_c9_02', tag: 'player_covered_body', valence: 8 } }, { trust: { npc: 'npc_c9_02', by: 5 } }], options: [{ text: '(Leave him.)', exit: true }] },
  },
};

/** The great door, from inside. */
export const d_c9_great_door: DialogueDef = {
  id: 'd_c9_great_door', owner: 'narrator',
  start: [{ if: { flag: 'c9_door_open' }, node: 'open' }, { node: 'shut' }],
  nodes: {
    shut: {
      text: 'Ninety years of paint on a door built to outlast the people behind it. The wheel is locked out; the panel beside it is dark. Bram keeps the key.',
      again: 'Still shut. Ninety years of paint don\'t care how long you look at them.',
      passives: [{ attr: 'senses', dc: 6, text: 'Fresh scratches along the bottom edge, outside-in: fingernails, or a buckle.', effects: [{ learn: 'door_scratches' }] }],
      options: [{ text: '(Step back.)', exit: true }],
    },
    open: { text: 'Open on a slice of white daylight. Dust comes in. Nothing else does, yet.', again: 'The slice of daylight on the floor. Still nothing but dust comes through.', options: [{ text: '(Step back.)', exit: true }] },
  },
};
