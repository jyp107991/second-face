import type { DialogueDef } from '../../engine/dialogue/dialogue';

/** Chapter One — Cistern 9. */

const backToPell = { text: 'About the body…', next: 'menu' };

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
        { attr: 'senses', dc: 6, text: 'The mask on the side table has letters scratched inside the rim, worn almost smooth.', effects: [{ learn: 'mask_scratches' }] },
        { attr: 'wits', dc: 7, text: 'Pell keeps tugging the sheet back over the man\'s left forearm.' },
      ],
      options: [{ text: 'Who was he?', next: 'menu' }],
    },
    menu: {
      text: 'Nobody we know. Nobody anybody knows. Ask what you like — I\'ve run out of things to do with my hands.',
      options: [
        { id: 'pell.cause', text: 'What killed him?', next: 'cause' },
        { id: 'pell.wounds', text: 'Let me look at the wounds myself.', check: { skill: 'medicine', dc: 40, mods: [{ if: { origin: 'clinic_aide' }, dc: -20, why: 'Pell trained you' }] }, next: 'wounds', fail: 'wounds_fail', once: true },
        { id: 'pell.arm', text: 'What are you hiding under that sheet?', if: { attr: 'wits', gte: 7 }, next: 'arm', once: true },
        { id: 'pell.mask', text: 'The mask — what\'s the sign on it?', next: 'mask' },
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
    again: { text: 'Still here? He isn\'t getting any more talkative.', options: [{ text: 'A few more questions.', next: 'menu' }, { text: 'Never mind.', exit: true }] },
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
    early: { text: 'Not yet, {name}. Go to the clinic first and let Aurel show you what he showed me. Then come back and we\'ll talk like people with all the facts.', options: [{ text: 'All right.', exit: true }] },
    council: {
      text: [
        { if: { origin: 'door_watch' }, text: 'Sit. You were on the door when he came — you saw him alive, which is more than the rest of us. A man walked across the waste and died with your face in his hand. Tell me what he said.' },
        { text: 'Sit. No — stand, if you\'d rather; I\'ll be quick, because I can\'t hold the others for long. A man walked across the waste and died with your face in his hand.' },
      ],
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
      text: 'Here. Waterskin, empty. A notebook full of marks no one can read. The mask. Take them; they\'re more yours than ours.',
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
    after: { text: 'Go carefully. Write. And if you find the people who sent him — be polite until you can\'t.', options: [{ text: 'I will.', exit: true }] },
  },
};

export const d_c9_tamsin: DialogueDef = {
  id: 'd_c9_tamsin', owner: 'npc_c9_03',
  start: [
    { if: { flag: 'c9_tamsin_decided' }, node: 'decided' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'There you are. I\'ve been sitting on the clinic stairs for an hour like a dog waiting for its supper. Is it true? Is it you in the picture?',
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
      options: [
        { id: 'bram.order', text: '(Hand him the council order.)', if: { item: 'k_door_order' }, next: 'order' },
        { id: 'bram.shop', text: 'The seal\'s hydraulic. Cycle it by hand and MOTHER logs it as maintenance.', check: { skill: 'mechanics', dc: 40, mods: [{ if: { origin: 'pump_hand' }, dc: -15, why: 'you\'ve cycled those valves yourself' }] }, next: 'shop', fail: 'shop_fail', once: true },
        { id: 'bram.price', text: 'What would it take?', next: 'price' },
        { id: 'bram.guilt', text: 'If the next knock is people with guns, you\'ll want someone out there who knows our names.', check: { skill: 'speech', dc: 60 }, next: 'guilt', fail: 'guilt_fail', once: true },
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
      effects: [{ set: 'c9_door_open' }, { memory: { npc: 'npc_c9_04', tag: 'opened_door_for_player', valence: 10, strength: 100 } }],
      options: [{ text: '(Step into the light.)', exit: true }],
    },
    open_already: { text: 'It\'s open. Don\'t make me regret it.', options: [{ text: 'I won\'t.', exit: true }] },
  },
};
