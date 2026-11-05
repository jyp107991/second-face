import type { DialogueDef } from '../../engine/dialogue/dialogue';

/** Knock: the opening (a hatch day, a night watch, the morning after). Flags kn_*; the old opening's flags the later
 * chapters read (c9_examined, c9_council_done, c9_tamsin_*, pell_met) are set here where their meaning still holds. */

const bye = { text: 'Later.', exit: true };

// ---- Maud Ferrow, the hatch-keeper, who raised you ------------------------------------------------------------------
export const d_kn_maud: DialogueDef = {
  id: 'd_kn_maud', owner: 'npc_kn_maud',
  start: [
    { if: { flag: 'kn_free_to_leave' }, node: 'farewell' },
    { if: { all: [{ flag: 'kn_outriders_gone' }, { flag: 'kn_mother_decided' }, { not: { flag: 'kn_maud_spoke_after' } }] }, node: 'after' },
    { if: { all: [{ flag: 'kn_outriders_gone' }, { not: { flag: 'kn_mother_decided' } }] }, node: 'hurt' },
    { if: { flag: 'kn_maud_spoke_after' }, node: 'farewell' },
    { if: { flag: 'kn_outriders' }, node: 'morning2' },
    { if: { flag: 'kn_night' }, node: 'night' },
    { if: { all: [{ flag: 'kn_linnet_home' }, { not: { flag: 'kn_supper' } }] }, node: 'supper' },
    { if: { all: [{ flag: 'kn_linnet_away' }, { not: { flag: 'kn_linnet_home' } }] }, node: 'linnet_gone' },
    { if: { all: [{ flag: 'kn_rib_done' }, { flag: 'kn_corin_done' }, { not: { flag: 'kn_linnet_away' } }] }, node: 'chores_done' },
    { if: { flag: 'kn_post_done' }, node: 'chores' },
    { if: { flag: 'kn_post_collected' }, node: 'post_back' },
    { if: { flag: 'kn_maud_woke' }, node: 'hatch_again' },
    { node: 'wake' },
  ],
  nodes: {
    wake: {
      text: [
        { if: { origin: 'pump_hand' }, text: 'Up. Up, love, the wool won\'t carry itself and MOTHER opens at seven whether we\'re there or not. Bale\'s by the door. Knock\'s post is in the satchel — mind Hesper\'s, she\'s sealed it with goat fat again.' },
        { if: { origin: 'clinic_aide' }, text: 'You were up with Hesper\'s boy half the night, I know. Doesn\'t matter. Hatch day. Bale\'s by the door, the post\'s in the satchel, and Pell will want to hear about that chest of his through the Grille.' },
        { if: { origin: 'door_watch' }, text: 'Off the watch and straight into the hatch line — that\'s Knock for you. Bale\'s by the door, the post\'s in the satchel. Eat something first. You\'re grey.' },
        { if: { origin: 'archive_clerk' }, text: 'The factor\'s already at the stand, so you\'ll want your book after the hatch. First things first: bale\'s by the door, the post\'s in the satchel, and I want the Cistern\'s letters back before Ruth starts asking.' },
        { text: 'Up, love. Hatch day. Bale\'s by the door, Knock\'s post is in the satchel, and MOTHER opens at seven whether we\'re there or not.' },
      ],
      effects: [{ give: 'k_kn_wool' }, { give: 'k_kn_post' }, { set: 'kn_maud_woke' }],
      options: [
        { id: 'maud.wake.how', text: 'How do you want it done?', next: 'how' },
        { id: 'maud.wake.linnet', text: 'Where\'s Linnet?', next: 'linnet_where', once: true },
        { text: 'On my way.', exit: true },
      ],
    },
    how: {
      text: 'Same as every week. Wool and post in the tray. MOTHER weighs it, MOTHER says thank you for your continuity, and she pushes out what the week buys — water first, always water. If there\'s medicine going, Hesper\'s boy needs it more than we need extra. You decide; you\'ve watched me do it often enough. Then bring me the Cistern\'s post. I\'ll want to sort it before the factor sniffs at it.',
      options: [{ text: 'Water first, medicine if it\'s going, post back to you.', next: 'how_ok' }],
    },
    how_ok: { text: 'Good. And talk to Tamsin at the Grille if she\'s there. She sulks if you don\'t, and when she sulks she sends riddles.', options: [{ text: 'On my way.', exit: true }] },
    linnet_where: { text: 'Out. Since before light. She says she\'s "walking". Seventeen and walking.' + ' She\'ll be back for food, she always is.', effects: [{ learn: 'kn_linnet_walks' }], options: [{ text: 'I\'ll keep an eye out.', next: 'wake' }] },
    hatch_again: {
      text: [{ if: { flag: 'kn_hatch_traded' }, text: 'Traded? Then where\'s the Cistern\'s post? MOTHER puts it in the tray after the goods.' }, { text: 'The hatch, love. Wool and post in the tray before MOTHER closes.' }],
      options: [{ id: 'maud.trade', text: 'Let me see what you\'ve got. (Trade)', effects: [{ event: 'barter' }], exit: true }, bye],
    },
    post_back: {
      text: 'She hands you nothing, holds out her hand. You give her the Cistern\'s post and she weighs it like MOTHER weighs the wool. "Nine letters. Ines writes like she\'s paying by the word. Thank you, love."',
      passives: [{ attr: 'senses', dc: 6, text: 'Maud\'s thumb stops on one envelope, the one in Pell\'s hand, and moves on.', effects: [{ learn: 'kn_maud_pell_letter' }] }],
      effects: [{ take: 'k_kn_cistern_post' }, { set: 'kn_post_done' }, { xp: 25 }, { memory: { npc: 'npc_kn_maud', tag: 'brought_post', valence: 5 } }],
      options: [{ text: 'What now?', next: 'chores' }],
    },
    chores: {
      text: 'Now? Dace has been at the Rib gate since dawn wanting a second pair of hands — there\'s copper still on the mast and the Rusks have been at it. And Corin\'s windpump is coughing again; he won\'t ask, so I\'m asking for him. Do both before dark and you\'ve earned your supper.',
      options: [
        { id: 'maud.chores.dace', text: 'Dace still owes the Guild, doesn\'t he?', next: 'dace_debt', once: true },
        { id: 'maud.chores.corin', text: 'Corin never asks for anything.', next: 'corin_ask', once: true },
        { id: 'maud.trade2', text: 'Let me see the stores. (Trade)', effects: [{ event: 'barter' }], exit: true },
        { text: 'Rib, then the windpump.', exit: true },
      ],
    },
    dace_debt: { text: 'Dace owes everyone. Dace owes the air he breathes. He\'s a good boy with bad sums. Don\'t lend him anything you want back.', effects: [{ learn: 'kn_dace_debt' }], options: [{ text: 'Noted.', next: 'chores' }] },
    corin_ask: { text: 'That\'s why I ask for him. A man who never asks dies of it in the end. Mind his rifle; it\'s the only one on the slope and he knows it.', options: [{ text: 'Noted.', next: 'chores' }] },
    chores_done: {
      text: 'You\'re back. Good. Have you seen Linnet? She hasn\'t come for food. She always comes for food.',
      passives: [{ attr: 'wits', dc: 6, text: 'Maud\'s spare water skins are not on their peg. Three of them.', effects: [{ learn: 'kn_skins_missing' }] }],
      effects: [{ set: 'kn_linnet_away' }],
      options: [
        { id: 'maud.linnet.skins', text: 'Your spare skins are gone too.', if: { knows: 'kn_skins_missing' }, next: 'skins' },
        { text: 'I\'ll find her.', next: 'find_her' },
      ],
    },
    skins: { text: 'She goes very still. "The road," she says. "She\'s taken them to the road. To the stand." She puts a hand on the table as if the floor moved. "Bring her home. Whatever she\'s done. Bring her home first."', effects: [{ learn: 'kn_linnet_at_stand' }], options: [{ text: 'I will.', exit: true }] },
    find_her: { text: 'Try the square, then the road. If she\'s on the road — bring her home first. Shout at her after.', options: [{ text: 'I will.', exit: true }] },
    linnet_gone: {
      text: 'Is she...? No. Go. The stand on the road, if she isn\'t in the square.',
      options: [{ text: 'Going.', exit: true }],
    },
    supper: {
      text: [
        { if: { flag: 'kn_linnet_beaten' }, text: 'Linnet is on her cot with a wet cloth over her eye and her face to the wall. Maud ladles barley without looking at either of you. "Sit." The fire spits.' },
        { if: { flag: 'kn_linnet_paid' }, text: 'Linnet eats like she\'s been starved, which she hasn\'t, and won\'t look at you, because you paid. Maud ladles barley. "Sit."' },
        { text: 'Linnet eats with her elbows on the table, which Maud allows tonight. "Sit," Maud says. "Eat. You did well."' },
      ],
      options: [
        { id: 'maud.door', text: 'Tell me about the door again.', next: 'door_story' },
        { id: 'maud.supper.linnet', text: 'Linnet wants to leave, Maud.', next: 'supper_linnet', once: true },
        { text: '(Eat in silence.)', next: 'watch' },
      ],
    },
    door_story: {
      text: 'You\'ve heard it a hundred times. Fine. Sixty years ago my mother came up that road with forty others, nobody\'s water, nobody\'s land. They found the door. They knocked. Nobody answered for a day and a night, and then the hatch opened and a voice said "Thank you for your continuity" and pushed out a bottle of water clean enough to see through. My mother said it was the first clean thing she\'d seen in her life. We\'ve been knocking ever since. Knock. That\'s the joke. Nobody\'s laughed at it in years.',
      passives: [{ skill: 'science', dc: 35, text: 'Sixty years of clean water from a door that has never opened. Somewhere behind the rock, a pump that has never failed.', effects: [{ learn: 'c9_pressure_constant' }] }],
      effects: [{ learn: 'kn_door_story' }],
      options: [{ id: 'maud.door.faces', text: 'And in sixty years nobody\'s seen their faces.', next: 'faces' }, { text: 'Thank you.', next: 'watch' }],
    },
    faces: { text: 'Not one. Tamsin\'s voice is the closest thing I know to a granddaughter I\'ve never looked at. Strange world. Eat.', options: [{ text: '(Eat.)', next: 'watch' }] },
    supper_linnet: { text: 'Linnet\'s fork stops. Maud doesn\'t look up. "Everyone wants to leave at seventeen. I wanted to. I stayed because somebody had to keep the hatch honest." She looks up. "Somebody still does."', effects: [{ memory: { npc: 'npc_kn_linnet', tag: 'spoke_for_her', valence: 10 } }], options: [{ text: '(Eat.)', next: 'watch' }] },
    watch: {
      text: 'Maud wipes the bowl with bread. "You\'re on the watch tonight; Abel\'s chest won\'t take the cold. Lamp\'s filled. If anyone comes up the road, you ring and you don\'t go down to them alone." She smiles a little. "Nobody comes up the road."',
      effects: [{ set: 'kn_supper' }, { xp: 25 }],
      options: [
        { id: 'maud.postbook', text: 'I\'ll write in the post-book first.', if: { not: { flag: 'kn_wrote_post' } }, exit: true },
        { id: 'maud.towatch', text: 'I\'ll take the lamp. (Go to the watch at the hatch)', effects: [{ until: 22 }, { set: 'kn_night' }], exit: true },
      ],
    },
    night: {
      text: [{ if: { flag: 'kn_stranger_dead' }, text: 'She comes down in her nightdress with a blanket and doesn\'t say anything for a long time. Then: "Bed. All of it can wait till light. Bed, love."' }, { text: 'Maud is asleep, or pretending to be. The lamp is at the hatch.' }],
      options: [
        { id: 'maud.sleep', text: '(Sleep until morning.)', if: { flag: 'kn_stranger_dead' }, effects: [{ until: 7 }, { set: 'kn_outriders' }], exit: true },
        bye,
      ],
    },
    hurt: {
      text: 'Maud on Sim\'s door, laid across two trestles, her leg wrong below the knee and her hands still black from the post-book. "Pell," she says, through her teeth. "Get Pell. They\'ll have to open for Pell." Everyone in the square has the same thought, and nobody says it: they never have.',
      options: [{ text: '(Go to the Grille.)', exit: true }, { text: '(Try the hatch.)', exit: true }],
    },
    morning2: {
      text: 'Horses on the road. She\'s at the window before you\'re awake. "Guild colours," she says. "Outriders. They don\'t come up the slope for water." She looks at the pack on the table, the stranger\'s pack. "Whatever you\'re going to do, do it before they reach the square."',
      options: [{ text: 'I\'ll talk to them.', exit: true }],
    },
    after: {
      text: [
        { if: { flag: 'kn_maud_saved' }, text: 'Maud is propped on the cot with a bandage round her ribs that came out of the hatch an hour ago, out of turn, for the first time in sixty years. Her voice is thin. "The post-house," she says. "Sixty years of letters." Then: "MOTHER opened for me. Ines didn\'t. Remember which."' },
        { text: 'Maud lies on the cot with her leg splinted and her face grey, and the smell of burnt paper over everything. The post-house is a black frame. "Sixty years of letters," she says, and then nothing for a while. "Ines wouldn\'t open the door. I heard her say it. I\'ll walk crooked now. Doesn\'t matter."' },
      ],
      effects: [{ set: 'kn_maud_spoke_after' }],
      options: [{ text: 'They came for the stranger\'s things. For me.', next: 'why_go' }],
    },
    why_go: {
      text: 'They came for that photograph. They\'ll come again while it\'s here, and while you are. He walked a long way with a bullet in him to put that in your hands, love. Find out who he was. Find out who did this — and why your face. Before they come back for you.' + ' She takes your wrist, hard. "Then come home."',
      effects: [{ set: 'kn_told_to_go' }, { memory: { npc: 'npc_kn_maud', tag: 'sent_you', valence: 20, strength: 90 } }],
      options: [{ text: 'I\'ll come home.', next: 'farewell' }],
    },
    farewell: {
      text: [
        { if: { flag: 'kn_linnet_to_shale' }, text: '"Shale. Mags at the saloon will give her work if you ask nicely and pay her a little. Write. Both of you. Write every week or I\'ll walk to Shale on this leg and you\'ll feel bad." Her eyes are wet and her voice isn\'t.' },
        { text: '"Shale\'s north. A day, if your water holds. Write. The post goes with any caravan for a needle or two." Her eyes are wet and her voice isn\'t. "Go on, then."' },
      ],
      options: [
        { id: 'maud.letters', text: 'I\'ll write.', effects: [{ set: 'kn_promised_write' }], exit: true },
        { id: 'maud.trade3', text: 'Before I go — what can you spare? (Trade)', effects: [{ event: 'barter' }], exit: true },
      ],
    },
  },
};

// ---- the drop-hatch and MOTHER ----------------------------------------------------------------------------------------
export const d_kn_hatch: DialogueDef = {
  id: 'd_kn_hatch', owner: 'npc_c9_05',
  start: [
    { if: { all: [{ flag: 'kn_maud_hurt' }, { not: { flag: 'kn_mother_decided' } }] }, node: 'plea' },
    { if: { flag: 'kn_hatch_traded' }, node: 'closed' },
    { if: { item: 'k_kn_wool' }, node: 'open' },
    { node: 'closed' },
  ],
  nodes: {
    open: {
      speaker: 'npc_c9_05',
      text: 'A panel lights behind a grime-dull window, and the steel tray under it slides out with a sound Knock has heard every week for sixty years. "Good morning, Knock. Thank you for your continuity. Please place this week\'s exchange in the tray."',
      options: [{ text: '(Put the wool bale and Knock\'s post in the tray.)', effects: [{ take: 'k_kn_wool' }, { take: 'k_kn_post' }], next: 'weighed' }],
    },
    weighed: {
      speaker: 'npc_c9_05',
      text: 'The tray slides in. A hum, a weighing. "Wool, eleven kilograms, moisture within tolerance. Correspondence, fourteen pieces. This week\'s exchange is valued at four units. Water is one unit per measure. Medical stores are two units. Seed is unavailable this week. Please indicate your selection."',
      passives: [
        { skill: 'barter', dc: 30, text: 'Four units. Last month the same bale was valued at five. Nothing about the wool has changed.', effects: [{ learn: 'kn_hatch_cheaper' }] },
        { if: { origin: 'pump_hand' }, label: 'Hatch Hand', text: 'You have worked this hatch a hundred times. The weighing hum is the same length as always; the valuation is not.', effects: [{ learn: 'kn_hatch_cheaper' }] },
      ],
      options: [
        { id: 'hatch.water', text: 'Four measures of water.', effects: [{ give: 'c_water', count: 4 }, { set: 'kn_hatch_traded' }, { set: 'kn_hatch_water' }], next: 'post' },
        { id: 'hatch.meds', text: 'Two of water and the medicine, for Hesper\'s boy.', effects: [{ give: 'c_water', count: 2 }, { give: 'c_knitkit' }, { set: 'kn_hatch_traded' }, { set: 'kn_hatch_meds' }, { memory: { npc: 'npc_kn_r1', tag: 'medicine_for_boy', valence: 20 } }], next: 'post' },
        { id: 'hatch.haggle', text: 'Last month this bale was worth five. Recheck the valuation.', if: { knows: 'kn_hatch_cheaper' }, check: { skill: 'barter', dc: 35, mods: [{ if: { origin: 'pump_hand' }, dc: -15, why: 'you know this hatch' }] }, next: 'haggled', fail: 'haggle_fail' },
      ],
    },
    haggled: {
      speaker: 'npc_c9_05',
      text: 'A pause long enough to hear the wind. "Revaluation complete. A calibration variance has been corrected. Thank you for your diligence, Knock. This week\'s exchange is valued at five units." The tray offers three measures of water and a sealed blue box.',
      effects: [{ give: 'c_water', count: 3 }, { give: 'c_knitkit' }, { set: 'kn_hatch_traded' }, { set: 'kn_hatch_meds' }, { set: 'kn_hatch_haggled' }, { xp: 25 }, { memory: { npc: 'npc_kn_r1', tag: 'medicine_for_boy', valence: 20 } }],
      options: [{ text: '(Take it.)', next: 'post' }],
    },
    haggle_fail: {
      speaker: 'npc_c9_05',
      text: '"The valuation is correct. Please indicate your selection." The voice does not change, which is somehow worse.',
      options: [
        { text: 'Four measures of water.', effects: [{ give: 'c_water', count: 4 }, { set: 'kn_hatch_traded' }, { set: 'kn_hatch_water' }], next: 'post' },
        { text: 'Two of water and the medicine.', effects: [{ give: 'c_water', count: 2 }, { give: 'c_knitkit' }, { set: 'kn_hatch_traded' }, { set: 'kn_hatch_meds' }, { memory: { npc: 'npc_kn_r1', tag: 'medicine_for_boy', valence: 20 } }], next: 'post' },
      ],
    },
    post: {
      speaker: 'npc_c9_05',
      text: '"Outgoing correspondence: nine pieces." A bundle of envelopes tied with blue fibre. "Thank you for your continuity, Knock. The hatch will next open in seven days." The tray slides home. The panel dims.',
      effects: [{ give: 'k_kn_cistern_post' }, { set: 'kn_post_collected' }, { xp: 25 }],
      options: [
        { id: 'hatch.ask', text: 'MOTHER — is anyone in there sick? You never say.', next: 'ask', once: true },
        { text: '(Step back.)', exit: true },
      ],
    },
    ask: { speaker: 'npc_c9_05', text: 'The panel lights again, briefly. "The welfare of the Cistern population is within tolerance. Variance is unchanged." Dark.', effects: [{ learn: 'mother_variance' }], options: [{ text: '(Step back.)', exit: true }] },
    closed: {
      speaker: 'narrator',
      text: [{ if: { flag: 'kn_mother_opened' }, text: 'The tray is shut, scorched along one edge where the outriders put a boot to it. It opened out of turn once. It may never again.' }, { text: 'The tray is shut. The panel is dark. Seven days, MOTHER said. It is always seven days.' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
    plea: {
      speaker: 'npc_c9_05',
      text: 'You hit the panel with the flat of your hand until it lights. "The hatch is not scheduled to open. Thank you for your continuity, Knock."',
      options: [
        { id: 'hatch.plea.speech', text: 'Maud Ferrow has kept your hatch honest for forty years. She is bleeding. Open out of turn.', check: { skill: 'speech', dc: 45, mods: [{ if: { flag: 'kn_hatch_haggled' }, dc: -10, why: 'MOTHER logged your diligence' }, { if: { origin: 'pump_hand' }, dc: -10, why: 'MOTHER knows the Hatch Hand' }] }, next: 'opened', fail: 'refused' },
        { id: 'hatch.plea.science', text: 'Your continuity depends on Knock. Knock depends on its hatch-keeper. Losing her is a variance you can\'t correct.', check: { skill: 'science', dc: 40, mods: [{ if: { origin: 'clinic_aide' }, dc: -10, why: 'you speak Pell\'s language' }] }, next: 'opened', fail: 'refused' },
        { text: 'Please.', next: 'refused' },
      ],
    },
    opened: {
      speaker: 'npc_c9_05',
      text: 'A long hum, longer than any weighing. "Schedule variance authorised. Continuity of the exchange is a Cistern interest." The tray slides out, out of turn for the first time in sixty years, with a box of the blue tablets, a roll of real bandage, a bottle of something clear. "Thank you for your continuity, Knock." It sounds, for once, as if it means a person.',
      effects: [{ set: 'kn_mother_opened' }, { set: 'kn_maud_saved' }, { set: 'kn_mother_decided' }, { xp: 75 }, { decision: { id: 'kn_mother_opened', text: 'MOTHER opened the hatch out of turn for Maud.' } }],
      options: [{ text: '(Run it to Maud.)', exit: true }],
    },
    refused: {
      speaker: 'npc_c9_05',
      text: '"The hatch will next open in six days. Thank you for your continuity, Knock." Dark.',
      effects: [{ set: 'kn_maud_scarred' }, { set: 'kn_mother_decided' }, { decision: { id: 'kn_mother_refused', text: 'The hatch stayed shut. Maud will walk crooked.' } }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

// ---- the Grille: Tamsin, Pell, Ines, Bram, by voice ----------------------------------------------------------------
export const d_kn_grille: DialogueDef = {
  id: 'd_kn_grille', owner: 'npc_c9_03',
  start: [
    { if: { all: [{ flag: 'kn_free_to_leave' }, { not: { flag: 'kn_tamsin_farewell' } }] }, node: 'farewell' },
    { if: { all: [{ flag: 'kn_maud_hurt' }, { not: { flag: 'kn_ines_refused' } }] }, node: 'ines_plea' },
    { if: { flag: 'kn_free_to_leave' }, node: 'later' },
    { if: { flag: 'kn_night' }, node: 'night' },
    { node: 'morning' },
  ],
  nodes: {
    morning: {
      text: [
        { if: { flag: 'kn_tamsin_morning' }, text: 'Still here? I\'ve run out of riddles. That\'s a lie. I never run out of riddles.' },
        { text: 'The Grille is a plate of steel the size of a door\'s window, drilled with holes, worn smooth by sixty years of hands. Behind it, the dark, and a voice you have known since you were six: "There you are. Tell me what the sky is doing. Don\'t say blue. You always say blue."' },
      ],
      options: [
        { id: 'tam.sky', text: 'White at the edges. Dust coming up from the south. A hawk.', if: { not: { flag: 'kn_tamsin_morning' } }, next: 'sky' },
        { id: 'tam.riddle', text: 'Give me a riddle, then.', if: { not: { seen: 'tam.riddle' } }, next: 'riddle' },
        { id: 'tam.inside', text: 'How is it in there? Really?', next: 'inside', once: true },
        { id: 'tam.pell', text: 'Is Pell there? I need to ask about Hesper\'s boy.', if: { not: { flag: 'pell_met' } }, next: 'pell_boy' },
        { text: 'I\'ve the hatch to do. Later, Tam.', exit: true },
      ],
    },
    sky: {
      text: 'A hawk. I\'ve read about hawks. Do they look down at you? I\'d look down at you. I\'d circle you for an hour and then go eat a lizard.' + ' She laughs; somebody behind her tells her to keep it down. "That was Teague. Teague says a hawk is a bird that hasn\'t learned its place."',
      effects: [{ set: 'kn_tamsin_morning' }, { approval: { companion: 'npc_c9_03', by: 5 } }, { learn: 'tamsin_restless' }],
      options: [{ text: 'Your turn. Riddle.', next: 'riddle' }, { text: 'Later, Tam.', exit: true }],
    },
    riddle: {
      text: '"Right. I have no face and everyone knows my voice. I keep you alive and you thank me every week and you have never seen me. What am I?" A pause. "And before you say MOTHER — I\'m lying about one of those things. Which one?"',
      passives: [{ attr: 'wits', dc: 6, text: 'She has been telling you riddles through this Grille for eighteen years. The lie is never in the answer. It\'s in the question.' }],
      options: [
        { id: 'tam.riddle.mother', text: 'MOTHER. And the lie is "everyone knows my voice" — half of Knock has never spoken to her.', next: 'riddle_close' },
        { id: 'tam.riddle.you', text: 'You. And the lie is "you have never seen me" — I\'ve seen your hands through the holes.', check: { attr: 'senses', dc: 6 }, next: 'riddle_you', fail: 'riddle_close' },
        { id: 'tam.riddle.knock', text: 'Knock. To you, we\'re a voice with no face. The lie is "I keep you alive" — you keep us alive.', check: { attr: 'wits', dc: 7 }, next: 'riddle_knock', fail: 'riddle_close' },
      ],
    },
    riddle_close: { text: 'Close. Wrong, but close. You always go for the obvious one first. It\'s sweet. It\'s why you\'d be terrible in here.', effects: [{ set: 'kn_tamsin_morning' }], options: [{ text: 'Later, Tam.', exit: true }] },
    riddle_you: { text: 'A long silence. Then, quietly: "Fingertips. Twice. When we were eleven." Another silence. "That one wasn\'t a riddle, was it."', effects: [{ set: 'kn_tamsin_morning' }, { approval: { companion: 'npc_c9_03', by: 10 } }, { affection: { npc: 'npc_c9_03', by: 5 } }, { xp: 15 }], options: [{ text: 'No.', exit: true }] },
    riddle_knock: { text: '"...Huh." You can hear her grin. "That\'s the right answer to a question I didn\'t ask. Which is the best kind. Ines says the Cistern feeds Knock. Pell says Knock feeds the Cistern. Nobody asks MOTHER."', effects: [{ set: 'kn_tamsin_morning' }, { approval: { companion: 'npc_c9_03', by: 10 }, }, { learn: 'tamsin_feeds_question' }, { xp: 15 }], options: [{ text: 'Later, Tam.', exit: true }] },
    inside: { text: 'Same as always. Algae, the hum, sixty people pretending sixty people is a world. Ines says the door stays shut because of what\'s out there. I say what\'s out there is you and Hesper\'s goats. Nobody laughs. Nobody\'s laughed at that in years either.', options: [{ text: 'I\'m sorry.', next: 'morning' }] },
    pell_boy: {
      speaker: 'npc_c9_02',
      text: 'A man\'s voice, close to the holes, dry and tired: "Hesper\'s boy. The cough is wet or dry? ... Wet. Then the blue tablets, one at night, and keep him off the goats\' straw. If MOTHER has them this week. Tell Hesper I asked after him. Tell her I\'m sorry I can\'t see him." He means it.',
      effects: [{ set: 'pell_met' }, { learn: 'pell_seen' }],
      options: [{ text: 'I\'ll tell her.', next: 'morning' }],
    },
    night: {
      text: [
        { if: { flag: 'kn_stranger_dead' }, text: 'The Grille is quiet now. Somewhere behind it, people are awake and pretending not to be.' },
        { text: 'You hammer on the Grille with the lamp\'s base until a light comes on far behind the holes.' },
      ],
      options: [
        { id: 'grille.night.pell', text: 'Pell! A man at the door — he\'s been shot, he\'s dying!', if: { all: [{ not: { flag: 'kn_stranger_dead' } }, { not: { flag: 'pell_night' } }] }, next: 'pell_night' },
        { id: 'grille.night.after', text: 'He\'s dead, Pell. He had a photograph. Of me.', if: { all: [{ flag: 'kn_stranger_dead' }, { not: { seen: 'grille.night.after' } }] }, next: 'pell_after' },
        { text: '(Step back.)', exit: true },
      ],
    },
    pell_night: {
      speaker: 'npc_c9_02',
      text: 'Pell, half awake and then all the way awake: "Shot? Where — no. Listen. I can\'t come out. You know I can\'t. You\'ll be my hands. Is he breathing? Go to him and tell me what you see."',
      effects: [{ set: 'pell_night' }, { set: 'pell_met' }],
      options: [{ text: '(Go back to him.)', exit: true }],
    },
    pell_after: {
      speaker: 'npc_c9_02',
      text: 'A long breath through the holes. "Of you." Another. "Bring it here. Hold it to the holes; the lamp, too." You do, and hear him breathe out slowly. "It\'s you. Older. A city behind you, a broken one. I won\'t ask how; you can\'t answer and neither can I. Keep it safe. Keep it out of sight. People who carry a thing like that a long way don\'t do it for nothing, and the people who shoot them don\'t either."',
      passives: [
        { attr: 'senses', dc: 8, text: 'In the photograph, the shadow under your chin falls to the left. The towers\' shadows fall to the right.', effects: [{ lead: 'l_photo_light' }, { learn: 'photo_shadows' }] },
        { skill: 'science', dc: 45, text: 'Every print you have seen has grain. This has none; the dust in the air is drawn, not caught.', effects: [{ lead: 'l_photo_grain' }, { learn: 'photo_no_grain' }] },
      ],
      effects: [{ learn: 'photo_seen' }, { set: 'c9_examined' }],
      options: [{ text: 'I will.', exit: true }],
    },
    ines_plea: {
      speaker: 'npc_c9_01',
      text: 'An older woman\'s voice, steady as a plumb line: "This is Ines Halloran. I know what you\'re going to ask. The door has not opened in ninety years, and it does not open now. Not for Maud Ferrow, whom I have loved by voice for forty years. Not for anyone."',
      options: [
        { id: 'ines.plea.pell', text: 'Pell can save her. Let him out for one hour.', next: 'ines_no' },
        { id: 'ines.plea.why', text: 'Why? What\'s worth more than her?', check: { skill: 'speech', dc: 50 }, next: 'ines_why', fail: 'ines_no' },
        { id: 'ines.plea.rage', text: 'Sixty years we\'ve fed you. You owe us one hour.', next: 'ines_no' },
      ],
    },
    ines_no: {
      speaker: 'npc_c9_01',
      text: '"Open the door to save one life, and the next time it is two, and the next time the door does not close." A pause. "Try the hatch. MOTHER keeps the schedule. Not me." The light goes out behind the holes.',
      effects: [{ set: 'kn_ines_refused' }, { set: 'c9_council_done' }, { decision: { id: 'kn_ines_refused', text: 'Ines would not open the door for Maud.' } }, { memory: { npc: 'npc_c9_01', tag: 'refused_maud', valence: -20, strength: 90 } }],
      options: [{ text: '(Leave the Grille.)', exit: true }],
    },
    ines_why: {
      speaker: 'npc_c9_01',
      text: 'For a long time, nothing. Then, quietly: "Because the last time anyone asked that door to open, the people who answered were not ours. I was nine. I watched my mother weld it." The voice steadies. "Try the hatch. MOTHER keeps the schedule. Not me." The light goes out.',
      effects: [{ set: 'kn_ines_refused' }, { set: 'c9_council_done' }, { learn: 'ines_welded' }, { decision: { id: 'kn_ines_refused', text: 'Ines would not open the door for Maud. She told you why.' } }],
      options: [{ text: '(Leave the Grille.)', exit: true }],
    },
    farewell: {
      text: 'Tamsin, close to the holes: "Maud told the whole slope you\'re going. Through the vent, which is how we hear everything." A breath. "Write to me. Tell me what the sky looks like over Shale. Not blue." Her fingertips come through two of the holes.',
      options: [
        { id: 'tam.fare.touch', text: '(Touch her fingertips.)', effects: [{ affection: { npc: 'npc_c9_03', by: 10 } }, { approval: { companion: 'npc_c9_03', by: 10 } }], next: 'farewell2' },
        { id: 'tam.fare.promise', text: 'Every week. And one day I\'ll see your face.', next: 'farewell2' },
      ],
    },
    farewell2: {
      text: '"One day I\'ll see yours. Older, probably. I hear you get older." She laughs, badly. "Go on. Before Ines hears me crying through the vent."',
      effects: [{ set: 'kn_tamsin_farewell' }, { set: 'c9_tamsin_decided' }, { set: 'c9_tamsin_inside' }, { decision: { id: 'kn_tamsin_grille', text: 'You promised Tamsin letters through the Grille.' } }],
      options: [{ text: 'Not blue. I promise.', exit: true }],
    },
    later: {
      text: 'Tamsin\'s voice, then: "Is that you? Tell me something about the road."',
      options: [
        { id: 'grille.bram', text: 'Is Bram there? Anything he wants carried out?', if: { quest: 'q_a1_bram', status: 'none' }, next: 'bram' },
        { id: 'grille.seed', text: 'Ines — Shale\'s factor would pay for viable seed. The Cistern keeps a bank.', if: { all: [{ quest: 'q_a1_seed', status: 'active' }, { not: { item: 'k_seed_case' } }] }, next: 'seed' },
        { text: '(Step back.)', exit: true },
      ],
    },
    bram: {
      speaker: 'npc_c9_04',
      text: 'A heavy man\'s voice: "Coyle. Door-keeper, for what that\'s worth to a door that doesn\'t move." A pause. "There\'s a woman. Hesper. Not Knock\'s Hesper — another. Went up the road forty years back. If you\'re going that way." An envelope comes through the hatch\'s slot, folded small.',
      effects: [{ give: 'k_bram_letter' }, { quest: 'q_a1_bram', start: true }, { learn: 'bram_letter' }],
      options: [{ text: 'I\'ll find her.', exit: true }],
    },
    seed: {
      speaker: 'npc_c9_01',
      text: 'Ines, after a long silence: "Seed is for the sky. Not for a ledger." Another silence. "Tell me which you\'ll use it for, and I\'ll believe you, because I have no way not to."',
      options: [
        { id: 'grille.seed.sky', text: 'For the sky. Someone will plant it.', effects: [{ give: 'k_seed_case' }, { learn: 'seed_from_ines' }, { trust: { npc: 'npc_c9_01', by: 5 } }], next: 'seed_given' },
        { text: 'For the factor. Knock needs the Tolls.', next: 'seed_refused' },
      ],
    },
    seed_given: { speaker: 'npc_c9_01', text: 'The hatch\'s slot opens and a cold case slides into your hands. "Tomato, bean, squash, millet. I am trusting you with the difference."', options: [{ text: 'For the sky.', exit: true }] },
    seed_refused: { speaker: 'npc_c9_01', text: '"Then no." The light goes out.', options: [{ text: '(Step back.)', exit: true }] },
  },
};

// ---- Linnet ---------------------------------------------------------------------------------------------------------
export const d_kn_linnet: DialogueDef = {
  id: 'd_kn_linnet', owner: 'npc_kn_linnet',
  start: [
    { if: { all: [{ flag: 'kn_told_to_go' }, { not: { flag: 'kn_linnet_decided' } }] }, node: 'ask_come' },
    { if: { all: [{ flag: 'kn_linnet_away' }, { not: { flag: 'kn_linnet_home' } }] }, node: 'caught' },
    { if: { flag: 'kn_linnet_home' }, node: 'home' },
    { node: 'square' },
  ],
  nodes: {
    square: {
      text: 'Your sister, sitting on the edge of the tank with her boots on the rim, which Maud has told her not to do since she was four. "Have you seen the print? The new one, over my cot. The Spire. It\'s got lights all night. All night!" She doesn\'t wait for an answer. "One day."',
      options: [
        { id: 'lin.print', text: 'Where did you get a print of Meridian?', next: 'print', once: true },
        { id: 'lin.walk', text: 'Maud says you go "walking".', next: 'walk', once: true },
        { text: 'Get off the tank before Maud sees.', exit: true },
      ],
    },
    print: { text: 'A trader. Never mind which. It\'s the Spire, the big steps in front of it — see the people? They\'re so small. Everybody in Meridian has somewhere to be.', effects: [{ learn: 'linnet_print' }], options: [{ text: 'Everybody in Knock has somewhere to be too.', next: 'square' }] },
    walk: { text: '"I walk. People walk. Is it a crime now?" She swings her boots. "You walked at my age. Maud said."', options: [{ text: 'Not to the road.', next: 'square' }] },
    caught: {
      text: 'Linnet at the toll stand with Maud\'s three water skins at her feet and a road buyer\'s hand round her wrist. She sees you and goes white, then red. "Don\'t," she says. "Don\'t you dare tell her."',
      options: [{ text: 'Talk to the buyer.', exit: true }],
    },
    home: {
      text: [
        { if: { flag: 'kn_linnet_beaten' }, text: 'She won\'t look at you. One eye is swelling shut. "You let him," she says. "You stood there and let him."' },
        { if: { flag: 'kn_linnet_paid' }, text: '"I\'ll pay you back. Every Toll." She means it, and she can\'t.' },
        { text: '"You talked him down. Like it was nothing." She looks at you as if you\'re someone else. "Teach me that."' },
      ],
      options: [{ id: 'lin.home.why', text: 'Why, Lin? Maud\'s water?', next: 'why', once: true }, bye],
    },
    why: { text: 'Because the Guild pays in Tolls and Tolls buy a seat on a caravan and a caravan goes to Meridian, and Maud will keep the hatch until she dies and then I\'ll keep it until I die. I\'m not dying in Knock.', effects: [{ learn: 'linnet_wants_out' }], options: [{ text: 'I know.', exit: true }] },
    ask_come: {
      text: 'She has a bag packed. Of course she has. "Take me with you. Just to Shale. I\'ll find work. I\'m not a child, I\'m — take me with you."',
      options: [
        { id: 'lin.come', text: 'To Shale. Not one step further without telling me.', effects: [{ set: 'kn_linnet_to_shale' }, { set: 'kn_linnet_decided' }, { memory: { npc: 'npc_kn_linnet', tag: 'took_her', valence: 30, strength: 90 } }, { decision: { id: 'kn_linnet_came', text: 'You took Linnet as far as Shale.' } }], next: 'come' },
        { id: 'lin.stay', text: 'Maud needs you. Stay with her.', check: { skill: 'speech', dc: 35, mods: [{ if: { flag: 'kn_linnet_paid' }, dc: -10, why: 'you paid her debt' }] }, effects: [{ set: 'kn_linnet_stays' }, { set: 'kn_linnet_decided' }, { decision: { id: 'kn_linnet_stayed', text: 'Linnet stayed with Maud, for now.' } }], next: 'stay', fail: 'stay_angry' },
      ],
    },
    come: { text: 'She hugs you so hard your ribs creak. "I\'ll write to Maud every week," she says, and you both know she won\'t.', options: [{ text: 'Get your bag.', exit: true }] },
    stay: { text: '"For now." She puts the bag down. "For Maud." She doesn\'t say anything else, and doesn\'t need to.', options: [{ text: 'For Maud.', exit: true }] },
    stay_angry: { text: '"Right." She picks the bag up again. "Then I\'ll go on my own. Not today. But I will."', effects: [{ set: 'kn_linnet_stays' }, { set: 'kn_linnet_decided' }, { set: 'kn_linnet_will_run' }, { decision: { id: 'kn_linnet_will_run', text: 'Linnet stayed, angry; she will go on her own one day.' } }], options: [{ text: 'Lin—', exit: true }] },
  },
};

// ---- the road buyer at the toll stand -----------------------------------------------------------------------------
export const d_kn_buyer: DialogueDef = {
  id: 'd_kn_buyer', owner: 'npc_kn_buyer',
  start: [{ if: { flag: 'kn_linnet_settled' }, node: 'done' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"This yours?" The buyer lifts Linnet\'s wrist like a rabbit by the ears. "She sold me six measures of clean water at the Guild\'s price, took the Tolls, brought me three. Three. I\'m a patient man. I\'ve been patient since sunup."',
      passives: [{ attr: 'senses', dc: 6, text: 'His other hand is on a length of pipe hooked through his belt, and his boots are good boots. A road man, not a Guild man.' }],
      options: [
        { id: 'buy.pay', text: 'What does she owe? I\'ll pay it. (15 Tolls)', if: { item: 'tolls', count: 15 }, effects: [{ take: 'tolls', count: 15 }], next: 'paid' },
        { id: 'buy.pay_water', text: 'Three more measures. Here. (Give 3 water)', if: { item: 'c_water', count: 3 }, effects: [{ take: 'c_water', count: 3 }], next: 'paid' },
        { id: 'buy.talk', text: 'You bought clean water at a third of the road price. You\'ve done well out of a girl. Let go of her.', check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'kn_factor_rate' }, dc: -10, why: 'you know the road price' }] }, next: 'talked', fail: 'talk_fail' },
        { id: 'buy.factor', text: 'Factor Orme — is this how the Guild does business on its own road?', check: { skill: 'barter', dc: 40, mods: [{ if: { origin: 'archive_clerk' }, dc: -15, why: 'you keep the stand\'s book' }] }, next: 'factor', fail: 'talk_fail' },
        { id: 'buy.leave', text: 'She made the deal. She can take what comes. (Walk away.)', next: 'beaten' },
        { id: 'buy.fight', text: 'Let go of her or I\'ll make you.', effects: [{ set: 'kn_buyer_fight' }], next: 'fight' },
      ],
    },
    paid: {
      text: 'He lets go. "There. Somebody in this family can count." Linnet rubs her wrist and won\'t look at you.',
      effects: [{ set: 'kn_linnet_paid' }, { set: 'kn_linnet_settled' }, { set: 'kn_linnet_home' }, { set: 'kn_linnet_choice', value: 'paid' }, { xp: 25 }, { decision: { id: 'kn_linnet_paid', text: 'You paid Linnet\'s debt on the road.' } }, { memory: { npc: 'npc_kn_linnet', tag: 'paid_debt', valence: 10 } }],
      options: [{ text: 'Home, Lin.', exit: true }],
    },
    talked: {
      text: 'He looks at you a long time, then at the factor, who has become very interested in her ledger. He lets go. "Three measures, then. Call it a lesson. Hers." He spits. "Or mine."',
      effects: [{ set: 'kn_linnet_talked' }, { set: 'kn_linnet_settled' }, { set: 'kn_linnet_home' }, { set: 'kn_linnet_choice', value: 'talked' }, { xp: 50 }, { decision: { id: 'kn_linnet_talked', text: 'You talked the road buyer out of Linnet\'s debt.' } }, { memory: { npc: 'npc_kn_linnet', tag: 'talked_him_down', valence: 20 } }],
      options: [{ text: 'Home, Lin.', exit: true }],
    },
    factor: {
      speaker: 'npc_kn_factor',
      text: 'Orme closes her ledger with one finger. "No, it isn\'t. Varro, the Guild buys Knock water at a fair rate and sells it at a fair rate, and men who buy girls\' grandmothers\' water at a third of it don\'t trade at my stand. Let go." He does. Orme looks at you over her glasses. "You owe me for that. Not today."',
      effects: [{ set: 'kn_linnet_talked' }, { set: 'kn_linnet_settled' }, { set: 'kn_linnet_home' }, { set: 'kn_linnet_choice', value: 'factor' }, { set: 'kn_owes_orme' }, { xp: 50 }, { decision: { id: 'kn_linnet_factor', text: 'Factor Orme took Linnet\'s side, and you owe her for it.' } }, { memory: { npc: 'npc_kn_linnet', tag: 'talked_him_down', valence: 15 } }],
      options: [{ text: 'Home, Lin.', exit: true }],
    },
    talk_fail: {
      text: '"Clever." His grip tightens; Linnet makes a small sound. "Clever doesn\'t pour, friend. Three measures or three teeth."',
      options: [
        { text: 'What does she owe? (15 Tolls)', if: { item: 'tolls', count: 15 }, effects: [{ take: 'tolls', count: 15 }], next: 'paid' },
        { text: 'Three measures. Here. (Give 3 water)', if: { item: 'c_water', count: 3 }, effects: [{ take: 'c_water', count: 3 }], next: 'paid' },
        { text: '(Walk away.)', next: 'beaten' },
        { text: 'Then teeth. Yours.', effects: [{ set: 'kn_buyer_fight' }], next: 'fight' },
      ],
    },
    beaten: {
      speaker: 'narrator',
      text: 'You turn your back. Behind you, one short sound and then a longer one. When you look round, Linnet is sitting in the dust holding her face and the buyer is walking north with three skins over his shoulder. "Lesson," he calls back. Linnet gets up on her own. She walks home past you.',
      effects: [{ set: 'kn_linnet_beaten' }, { set: 'kn_linnet_settled' }, { set: 'kn_linnet_home' }, { set: 'kn_linnet_choice', value: 'beaten' }, { decision: { id: 'kn_linnet_beaten', text: 'You let Linnet take the beating she had earned.' } }, { memory: { npc: 'npc_kn_linnet', tag: 'let_beaten', valence: -30, strength: 90 } }],
      options: [{ text: '(Follow her home.)', exit: true }],
    },
    fight: { text: 'He shoves Linnet away and the pipe comes out of his belt. "Your choice, friend."', options: [{ text: '(Fight.)', exit: true }] },
    done: { text: '"We\'re square. Don\'t make me sorry."', options: [bye] },
  },
};

// ---- the factor --------------------------------------------------------------------------------------------------------
export const d_kn_factor: DialogueDef = {
  id: 'd_kn_factor', owner: 'npc_kn_factor',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { origin: 'archive_clerk' }, text: 'Orme slides the stand\'s ledger across without looking up. "You\'re late. Three caravans north, two south, one water buyer I didn\'t like. Write them in. Then we\'ll see about your card."' },
        { text: '"Card." Factor Orme holds out her hand without looking up. Your toll card: a stiff square with your name, Knock, and a printed likeness of your face at fourteen, scowling. "Still you. Pass." She hands it back.' },
      ],
      effects: [{ give: 'k_kn_toll_card' }, { learn: 'kn_toll_cards' }],
      options: [
        { id: 'fac.card', text: 'Why does the Guild need our faces on the cards?', next: 'card', once: true },
        { id: 'fac.rate', text: 'What\'s water worth on the road these days?', next: 'rate', once: true },
        { id: 'fac.ledger', text: 'The caravans this week — anything odd?', if: { origin: 'archive_clerk' }, next: 'ledger', once: true },
        { id: 'fac.trade', text: 'What are you selling? (Trade)', effects: [{ event: 'barter' }], exit: true },
        bye,
      ],
    },
    card: { text: '"So the road knows who walks it. Nobody walks the toll road the Guild doesn\'t know." She taps the card. "Faces are cheap to copy and hard to fake. The Guild sends copies south with the forecasts. Everybody wants to know who\'s coming."', effects: [{ learn: 'kn_cards_copied' }, { lead: 'l_toll_faces' }], options: [{ text: 'South? To whom?', next: 'card_who' }] },
    card_who: { text: '"Whoever pays for forecasts." She returns to her ledger. "Not my end of it, love."', options: [{ text: 'Right.', next: 'intro' }] },
    rate: { text: '"On the road? Two Tolls the measure in a good week, four in a bad one. Here, one. Knock\'s water is the cleanest on the Sallow and the Guild pays Knock a fair price for it." She says "fair" as if she has heard it argued.', effects: [{ learn: 'kn_factor_rate' }], options: [{ text: 'Right.', next: 'intro' }] },
    ledger: { text: 'You read down the week\'s lines in the Guild shorthand you learned at this stand. Three caravans north, two south. And a note in another hand: "Outriders north from the Tollhouse, asking after an old man, wounded, masked." Dated four days ago.', effects: [{ learn: 'kn_outriders_asking' }, { lead: 'l_outriders_asking' }, { xp: 15 }], options: [{ text: '(Close the book.)', next: 'intro' }] },
  },
};

// ---- Dace and the Rib -------------------------------------------------------------------------------------------------
export const d_kn_dace: DialogueDef = {
  id: 'd_kn_dace', owner: 'npc_kn_dace',
  start: [
    { if: { flag: 'kn_outriders_gone' }, node: 'after' },
    { if: { flag: 'kn_rib_done' }, node: 'done' },
    { if: { flag: 'kn_rib_open' }, node: 'go' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'Dace Moro, leaning on the rock at the Rib\'s gap with a pry bar over his shoulders like a yoke. "There\'s my second pair of hands. The Rusks have been at the mast three days — Abner and Nell, road people. If they strip the last of the copper there\'s nothing left in the Rib worth the walk." He grins. "Mine was going to be the last load. I\'ve a debt to clear."',
      options: [
        { id: 'dace.debt', text: 'Who do you owe?', next: 'debt', once: true },
        { id: 'dace.plan', text: 'What\'s the plan?', next: 'plan' },
        bye,
      ],
    },
    debt: { text: '"The Guild. Who else?" He looks away. "It\'s nothing. I talk too much at the stand and Orme writes it down. One more load and I\'m square."', effects: [{ learn: 'kn_dace_owes_guild' }], options: [{ text: 'What\'s the plan?', next: 'plan' }] },
    plan: {
      text: '"The relay box at the mast head — the old electronics, worth more than the copper. Lockers and crates round it. Fill your pack, mind the weight — copper\'s heavy and you\'ve got a walk back. If the Rusks give us grief, we talk. If talking doesn\'t work..." He hefts the pry bar. "We don\'t talk."',
      effects: [{ set: 'kn_rib_open' }],
      options: [{ text: 'Lead on.', exit: true }],
    },
    go: { text: '"The mast head\'s at the back. Rusks are camped by it. Your call how we play it."', options: [bye] },
    done: {
      text: [
        { if: { flag: 'kn_rib_fight' }, text: 'Dace is shaking, a little, and grinning, a lot. "We did that. We actually — Maud\'s going to kill me." He splits the copper with you without being asked.' },
        { if: { flag: 'kn_rib_shared' }, text: '"Half a load\'s still a load." He shrugs. "And nobody bled. Maud would say that\'s worth the other half."' },
        { text: '"Not bad, for a first run." He stacks the copper. "You\'ve a better eye for a box than I have."' },
      ],
      options: [{ id: 'dace.done.debt', text: 'Are you square with the Guild now?', next: 'square', once: true }, bye],
    },
    square: { text: '"Nearly." He doesn\'t meet your eye. "Orme says there\'s other ways to pay. Information. Who comes up the road. That sort of thing." He laughs. "Nobody comes up the road."', effects: [{ learn: 'kn_dace_informs' }], options: [bye] },
    after: {
      text: [
        { if: { knows: 'kn_dace_told' }, text: 'Dace can\'t look at you. "I told Orme about the old man. Last night, at the stand, for two Tolls off. I didn\'t think — I didn\'t think they\'d ride." He is crying. "I didn\'t think."' },
        { text: 'Dace sits on the tank with his head in his hands. "They knew which house. Somebody told them which house."' },
      ],
      options: [
        { id: 'dace.after.ask', text: 'Did you tell the Guild about him, Dace?', if: { not: { knows: 'kn_dace_told' } }, check: { attr: 'wits', dc: 6 }, next: 'confess', fail: 'deny' },
        { id: 'dace.after.forgive', text: 'You didn\'t know. Help Maud. That\'s how you pay it back.', if: { knows: 'kn_dace_told' }, effects: [{ memory: { npc: 'npc_kn_dace', tag: 'forgiven', valence: 30, strength: 90 } }, { decision: { id: 'kn_dace_forgiven', text: 'You forgave Dace for bringing the outriders.' } }], exit: true },
        { id: 'dace.after.condemn', text: 'Maud will walk crooked because of you.', if: { knows: 'kn_dace_told' }, effects: [{ memory: { npc: 'npc_kn_dace', tag: 'condemned', valence: -30, strength: 90 } }, { decision: { id: 'kn_dace_condemned', text: 'You told Dace what he had done.' } }], exit: true },
        bye,
      ],
    },
    confess: { text: 'He goes white. "Two Tolls off," he says. "Two Tolls off my debt for who came up the road. I didn\'t think they\'d ride."', effects: [{ learn: 'kn_dace_told' }], options: [{ text: '...', next: 'after' }] },
    deny: { text: '"Me? No. No." He gets up and walks away too fast.', options: [bye] },
  },
};

export const d_kn_rib: DialogueDef = {
  id: 'd_kn_rib', owner: 'npc_kn_rib_a',
  start: [{ if: { flag: 'kn_rib_done' }, node: 'done' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Abner Rusk straightens from the mast with a coil of stripped copper over his arm. Behind him, Nell has a shiv out before you\'ve said anything. "Knock," Abner says, as if it were a smell. "This is a dead mast on dead ground. Copper don\'t belong to anybody."',
      passives: [{ attr: 'senses', dc: 6, text: 'The relay box at the mast head is still bolted shut. They haven\'t got into it.' }],
      options: [
        { id: 'rib.share', text: 'Then share it. You take the copper, we take the box. Nobody bleeds.', check: { skill: 'barter', dc: 30 }, next: 'share', fail: 'share_fail' },
        { id: 'rib.scare', text: 'Knock has one rifle, and its owner is on the rise watching you. Walk.', check: { attr: 'presence', dc: 6, mods: [{ if: { origin: 'door_watch' }, dc: -2, why: 'the watch\'s voice' }] }, next: 'scared', fail: 'share_fail' },
        { id: 'rib.sneak', text: '(Keep him talking while Dace distracts them; slip round the mast to the box.)', check: { skill: 'stealth', dc: 30, mods: [{ if: { origin: 'door_watch' }, dc: -10, why: 'you know every stone of the Rib' }] }, next: 'sneak', fail: 'sneak_fail' },
        { id: 'rib.fight', text: 'Get off Knock\'s mast.', effects: [{ set: 'kn_rib_fight' }], next: 'fight' },
      ],
    },
    share: { text: 'Abner looks at the box, then at the copper, then at Nell. "Box is welded. You\'ll want luck." He shrugs. "Copper\'s ours, then." They drag their coils off down the cut, arguing.', effects: [{ set: 'kn_rib_shared' }, { set: 'kn_rib_clear' }, { xp: 30 }, { decision: { id: 'kn_rib_shared', text: 'You split the Rib with the Rusks: their copper, Knock\'s box.' } }], options: [{ text: '(Go to the box.)', exit: true }] },
    scared: { text: 'Abner looks up at the rise. Nell already has. "Not worth a hole," she says, and they go, leaving half a coil behind them.', effects: [{ set: 'kn_rib_scared' }, { set: 'kn_rib_clear' }, { give: 'j_wiring', count: 2 }, { xp: 30 }], options: [{ text: '(Go to the box.)', exit: true }] },
    sneak: { text: 'Dace starts an argument about whose grandfather put the mast up. While Abner shouts, you are round the back, at the box, with your bar in its seam. By the time they look round the lid is off and you are gone.', effects: [{ set: 'kn_rib_sneak' }, { set: 'kn_rib_clear' }, { give: 'j_electronics', count: 1 }, { xp: 40 }], options: [{ text: '(Go.)', exit: true }] },
    share_fail: { text: '"No." Abner drops the copper. Nell steps round him. "Our mast now."', options: [{ text: 'Then we do this the other way.', effects: [{ set: 'kn_rib_fight' }], next: 'fight' }, { text: '(Back off.)', next: 'back_off' }] },
    sneak_fail: { text: 'A stone turns under your boot. Nell is between you and the box with her shiv out. "Thief," she says, delighted.', options: [{ text: '(Fight.)', effects: [{ set: 'kn_rib_fight' }], next: 'fight' }, { text: '(Back off.)', next: 'back_off' }] },
    back_off: { text: 'You back off. Dace swears quietly. "Fine. Their mast." You walk home with what the crates near the gap gave you.', effects: [{ set: 'kn_rib_done' }, { set: 'kn_rib_backed_off' }], options: [{ text: '(Leave.)', exit: true }] },
    fight: { text: 'Abner swings the coil off his arm. Dace steps up beside you with the pry bar. Nobody says anything else.', options: [{ text: '(Fight.)', exit: true }] },
    done: { text: 'The Rib is quiet.', options: [{ text: '(Leave.)', exit: true }] },
  },
};

export const d_kn_mast: DialogueDef = {
  id: 'd_kn_mast', owner: 'npc_kn_dace',
  start: [{ if: { flag: 'kn_rib_done' }, node: 'empty' }, { if: { any: [{ flag: 'kn_rib_clear' }, { dead: 'npc_kn_rib_a' }] }, node: 'box' }, { node: 'busy' }],
  nodes: {
    busy: { speaker: 'narrator', text: 'The mast head: a drum of rusted steel with a relay box bolted to it. The Rusks are between you and it.', options: [{ text: '(Leave it.)', exit: true }] },
    box: {
      speaker: 'narrator',
      text: 'The relay box is welded at one seam and bolted at three. Inside, if you can get inside, the old electronics the mast was built to carry.',
      options: [
        { id: 'mast.mech', text: '(Unbolt it properly.)', check: { skill: 'mechanics', dc: 25 }, effects: [{ give: 'j_electronics', count: 2 }, { give: 'j_wiring', count: 1 }], next: 'opened', fail: 'forced' },
        { id: 'mast.force', text: '(Lever it open with the bar.)', effects: [{ give: 'j_electronics', count: 1 }], next: 'forced' },
      ],
    },
    opened: { speaker: 'narrator', text: 'Four bolts, the seam cracked with a tap, the lid off whole. Dace whistles. "Clean. Orme will pay double for clean."', effects: [{ set: 'kn_rib_done' }, { xp: 25 }], options: [{ text: '(Pack it.)', exit: true }] },
    forced: { speaker: 'narrator', text: 'The lid shrieks and folds. Half of what\'s inside cracks with it. What\'s left goes in your pack.', effects: [{ set: 'kn_rib_done' }, { xp: 10 }], options: [{ text: '(Pack it.)', exit: true }] },
    empty: { speaker: 'narrator', text: 'An empty box on a dead mast.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

// ---- Corin and the windpump; the snares -------------------------------------------------------------------------
export const d_kn_corin: DialogueDef = {
  id: 'd_kn_corin', owner: 'npc_kn_corin',
  start: [
    { if: { flag: 'kn_told_to_go' }, node: 'rifle' },
    { if: { flag: 'kn_outriders' }, node: 'outriders' },
    { if: { flag: 'kn_corin_done' }, node: 'done' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: [
        { if: { origin: 'door_watch' }, text: 'Corin doesn\'t turn round. "Watch. You\'re up early for someone off nights." He doesn\'t say anything else for a while. Then: "Pump\'s coughing."' },
        { text: 'Corin Asch, flat on his back under the windpump\'s gearbox, says without looking: "Maud sent you. Tell her the pump\'s fine." The pump coughs, shudders, and stops. "The pump is not fine."' },
      ],
      options: [
        { id: 'corin.help', text: 'Let me look at it.', next: 'pump' },
        { id: 'corin.rifle', text: 'Is that the rifle? The only one on the slope?', next: 'about_rifle', once: true },
        bye,
      ],
    },
    about_rifle: { text: '"Bolt-action, older than me. Shoots where you point it if you point it right." He wipes his hands. "I\'ll teach you one day. Not today. Today, the pump."', options: [{ text: 'The pump.', next: 'pump' }] },
    pump: {
      text: 'The tail vane\'s fine. The gearbox grinds. The pump rod jerks and stops on every stroke. "Leather in the cylinder\'s worn, or the check valve\'s sticking," Corin says. "One\'s a morning. The other\'s a week."',
      passives: [{ skill: 'mechanics', dc: 30, text: 'The rod stops at the bottom of the stroke, not the top. It\'s the valve, not the leather.', effects: [{ learn: 'kn_valve' }] }],
      options: [
        { id: 'corin.valve', text: 'It\'s the check valve. It sticks at the bottom of the stroke.', check: { skill: 'mechanics', dc: 30, mods: [{ if: { knows: 'kn_valve' }, dc: -10, why: 'you saw where it stops' }, { if: { origin: 'pump_hand' }, dc: -10, why: 'you\'ve fixed Knock\'s pumps since you were twelve' }] }, next: 'fixed', fail: 'leather' },
        { id: 'corin.leather', text: 'The leathers. Let\'s pull the cylinder.', next: 'leather' },
        { id: 'corin.snares', text: 'I\'m no use with gears. Can I check your snares instead?', next: 'snares' },
      ],
    },
    fixed: { text: 'You pull the valve, scrape the scale off its seat with your thumbnail, and seat it again. Corin puts the pump back in gear. It draws. Water comes, cold and steady. He looks at you for a long moment. "Your mother had good hands too."', effects: [{ set: 'kn_corin_done' }, { set: 'kn_corin_fixed' }, { xp: 50 }, { memory: { npc: 'npc_kn_corin', tag: 'fixed_pump', valence: 20 } }, { trust: { npc: 'npc_kn_corin', by: 10 } }], options: [{ text: 'You knew her?', next: 'mother' }, bye] },
    leather: { text: 'You and Corin pull the cylinder and replace leathers that weren\'t worn. The pump still coughs. Corin grunts, pulls the valve, scrapes it clean, and seats it. It draws. "Valve," he says. "Always look where it stops." It is the most he has said to you in a year.', effects: [{ set: 'kn_corin_done' }, { xp: 25 }, { learn: 'kn_valve' }], options: [bye] },
    snares: { text: '"Three on the scrub line, east, below the rise. Bring what\'s in them. Reset them if you know how. Don\'t if you don\'t." He goes back under the gearbox.', effects: [{ set: 'kn_snares_given' }, { set: 'kn_corin_done' }], options: [{ text: 'Right.', exit: true }] },
    mother: { text: 'He doesn\'t answer for a while. "Everybody knew everybody," he says. "Road fever took her and your father the same week. Maud took you. Took Linnet too, a baby." He goes back under the pump.', effects: [{ learn: 'kn_parents' }], options: [bye] },
    done: { text: 'The pump draws behind him, steady. "Road\'s for people with somewhere to be," Corin says, apropos of nothing. "Remember that."', options: [bye] },
    outriders: {
      text: 'Corin is at his door with the rifle across his arms, watching the square. "Guild outriders. Three. That\'s Hale in front, I\'d know him in the dark." He doesn\'t look at you. "I rode with him once. Twenty years ago. Whatever you do down there — if it goes bad, I\'ll be on the rise."',
      effects: [{ learn: 'corin_rode_with_hale' }, { lead: 'l_corin_outrider' }],
      options: [{ text: 'You rode with the Guild?', next: 'rode' }, { text: 'I\'ll remember.', exit: true }],
    },
    rode: { text: '"I said once." That\'s all. His thumb is on the bolt.', options: [{ text: '(Go down to the square.)', exit: true }] },
    rifle: {
      text: 'Corin holds out the rifle. "Take it. No — take it. I\'ve the snares and Hesper\'s goats and nobody I need to shoot." He presses a twist of rounds into your hand. "Point it right. And when you get to the Tollhouse, ask nobody about me."',
      effects: [{ give: 'w_bolt308' }, { give: 'a_308', count: 8 }, { set: 'kn_corin_rifle' }, { decision: { id: 'kn_corin_rifle', text: 'Corin gave you his rifle.' } }],
      options: [{ text: 'Thank you, Corin.', exit: true }],
    },
  },
};

export const d_kn_windpump: DialogueDef = {
  id: 'd_kn_windpump', owner: 'npc_kn_corin',
  start: [{ node: 'look' }],
  nodes: { look: { speaker: 'narrator', text: [{ if: { flag: 'kn_corin_done' }, text: 'The windpump turns into the wind and draws, steady, a sound like breathing.' }, { text: 'The windpump turns, coughs, shudders and stops. Corin is underneath it.' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_kn_snare: DialogueDef = {
  id: 'd_kn_snare', owner: 'npc_kn_corin',
  start: [{ if: { flag: 'kn_snares_done' }, node: 'empty' }, { if: { flag: 'kn_snares_given' }, node: 'check' }, { node: 'not_yours' }],
  nodes: {
    not_yours: { speaker: 'narrator', text: 'One of Corin\'s snares: a wire loop staked low on a run through the scrub. Not yours to check.', options: [{ text: '(Leave it.)', exit: true }] },
    check: {
      speaker: 'narrator',
      text: 'A wire loop on a run through the scrub. Something has been in it.',
      options: [
        { id: 'snare.reset', text: '(Take what\'s caught and reset the loop.)', check: { skill: 'survival', dc: 25 }, effects: [{ give: 'c_meat', count: 2 }, { give: 'j_hide', count: 1 }], next: 'reset', fail: 'botched' },
        { id: 'snare.take', text: '(Take what\'s caught.)', effects: [{ give: 'c_meat', count: 1 }], next: 'taken' },
      ],
    },
    reset: { speaker: 'narrator', text: 'Two hares from the three loops, and the loops reset low and true on the runs, where Corin sets them. He\'ll notice.', effects: [{ set: 'kn_snares_done' }, { xp: 30 }, { trust: { npc: 'npc_kn_corin', by: 5 } }], options: [{ text: '(Go.)', exit: true }] },
    botched: { speaker: 'narrator', text: 'You get one hare out and the wire kinks in your hands. The loop won\'t sit right. Corin will notice that too.', effects: [{ set: 'kn_snares_done' }, { give: 'c_meat', count: 1 }, { xp: 10 }], options: [{ text: '(Go.)', exit: true }] },
    taken: { speaker: 'narrator', text: 'One hare. The loops hang slack behind you.', effects: [{ set: 'kn_snares_done' }, { xp: 10 }], options: [{ text: '(Go.)', exit: true }] },
    empty: { speaker: 'narrator', text: 'An empty loop.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

// ---- the post-book, the door, the toll board, the watch ----------------------------------------------------------
export const d_kn_postbook: DialogueDef = {
  id: 'd_kn_postbook', owner: 'npc_kn_maud',
  start: [{ if: { flag: 'kn_posthouse_burned' }, node: 'burned' }, { node: 'book' }],
  nodes: {
    book: {
      speaker: 'narrator',
      text: 'The post-book: sixty years of Knock\'s letters in and out, in Maud\'s hand and her mother\'s before her. Every name, every date, every "thank you for your continuity". The last line is today\'s, in your hand.',
      options: [
        { id: 'post.write', text: '(Write a line of your own in the margin, as Maud lets you.)', if: { not: { flag: 'kn_wrote_post' } }, next: 'write' },
        { id: 'post.read', text: '(Read back through it.)', next: 'read', once: true },
        { text: '(Close it.)', exit: true },
      ],
    },
    write: {
      speaker: 'narrator',
      text: 'What do you write?',
      options: [
        { id: 'post.w.hawk', text: '"A hawk over the Rib. Tamsin wanted to know."', effects: [{ set: 'kn_wrote_post' }, { approval: { companion: 'npc_c9_03', by: 5 } }, { xp: 10 }], next: 'written' },
        { id: 'post.w.linnet', text: '"Linnet went to the road. I brought her home."', if: { flag: 'kn_linnet_home' }, effects: [{ set: 'kn_wrote_post' }, { xp: 10 }], next: 'written' },
        { id: 'post.w.mother', text: '"MOTHER valued the bale at four. Last month, five. Why?"', if: { knows: 'kn_hatch_cheaper' }, effects: [{ set: 'kn_wrote_post' }, { lead: 'l_hatch_value' }, { xp: 10 }], next: 'written' },
        { id: 'post.w.nothing', text: '"Hatch day. Nothing happened."', effects: [{ set: 'kn_wrote_post' }, { xp: 10 }], next: 'written' },
      ],
    },
    written: { speaker: 'narrator', text: 'The ink takes a while to dry. Maud will read it tonight, and pretend she didn\'t.', options: [{ text: '(Close it.)', exit: true }] },
    read: { speaker: 'narrator', text: 'Three times in sixty years a line reads only "Hatch closed." Three weeks, nine weeks, a winter. Then the lines begin again as if nothing had happened, and in the margin by the last, in Maud\'s hand at your age: "I sold a letter."', effects: [{ learn: 'kn_three_lockdowns' }, { learn: 'kn_maud_sold_letter' }], options: [{ text: '(Close it.)', exit: true }] },
    burned: { speaker: 'narrator', text: 'Ash, and the spine of a book, and a smell that will be in your clothes for a week.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_kn_door: DialogueDef = {
  id: 'd_kn_door', owner: 'npc_c9_05',
  start: [{ node: 'door' }],
  nodes: {
    door: {
      speaker: 'narrator',
      text: 'The Cistern door: a slab the colour of the rock, three times your height, without a handle on this side. Children put their ears to it for the hum. You did. Nobody alive in Knock has seen it move.',
      passives: [{ skill: 'mechanics', dc: 40, text: 'Along the seam, under ninety years of grime, a bead of weld. From the inside.', effects: [{ learn: 'kn_door_welded' }] }],
      options: [{ id: 'door.knock', text: '(Knock.)', next: 'knock', once: true }, { text: '(Leave it.)', exit: true }],
    },
    knock: { speaker: 'narrator', text: 'Your knuckles make no sound at all on it. Somewhere in Knock, someone laughs at you, kindly. Everyone does it once.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_kn_tollsign: DialogueDef = {
  id: 'd_kn_tollsign', owner: 'npc_kn_factor',
  start: [{ node: 'sign' }],
  nodes: { sign: { speaker: 'narrator', text: 'A painted board: TOLL ROAD — CARDS SHOWN — FACES UP. Under it, smaller, in a different paint: WATER 1 HERE. And under that, scratched: "the Guild remembers".', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_kn_watch: DialogueDef = {
  id: 'd_kn_watch', owner: 'npc_kn_maud',
  start: [{ if: { all: [{ flag: 'kn_supper' }, { not: { flag: 'kn_night' } }] }, node: 'take' }, { node: 'stool' }],
  nodes: {
    take: { speaker: 'narrator', text: 'The watch stool by the hatch lamp. Knock keeps one person awake at the door every night, for sixty years, for nothing.', options: [{ id: 'watch.sit', text: '(Take the night watch.)', effects: [{ until: 22 }, { set: 'kn_night' }], next: 'sat' }, { text: '(Not yet.)', exit: true }] },
    sat: { speaker: 'narrator', text: 'The lamp hisses. The wind drops. Stars, more than anyone could count, and the dark road coming down past the stand. Hours. Then, far up the road, something that is not the wind.', options: [{ text: '(Watch the road.)', exit: true }] },
    stool: { speaker: 'narrator', text: 'The watch stool, worn to the shape of sixty years of Knock.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

// ---- the night: the man at the door ---------------------------------------------------------------------------------
export const d_kn_stranger: DialogueDef = {
  id: 'd_kn_stranger', owner: 'npc_kn_stranger',
  start: [{ if: { flag: 'kn_stranger_dead' }, node: 'body' }, { if: { flag: 'kn_stranger_spoke' }, node: 'dying' }, { node: 'arrive' }],
  nodes: {
    arrive: {
      speaker: 'narrator',
      text: 'He comes down the road past the dark stand like a man walking into a wind, one hand on the rock, one leg dragging. A dust mask, leather and tin. He doesn\'t look at the shacks or the lamp. He goes straight to the Cistern door and beats on it with his fist, slow, the way you\'d knock on a door you\'d knocked on before, and slides down it to sit.',
      options: [{ text: '(Go to him.)', next: 'face' }],
    },
    face: {
      text: 'You bring the lamp. He turns his head. Above the mask his eyes find your face, and widen, and something in them gives way, relief or grief. "You," he says. Just that. "You."',
      passives: [
        { if: { origin: 'door_watch' }, label: 'Night Watch', text: 'Under his breath, under the wind, a word you almost don\'t hear and won\'t forget: "Larkspur."', effects: [{ learn: 'stranger_name' }, { lead: 'l_larkspur' }] },
        { attr: 'senses', dc: 7, text: 'Blood to the knee, old and new. A sunburn down one side of his face only.', effects: [{ learn: 'stranger_walked_west' }, { lead: 'l_walked_west' }] },
      ],
      effects: [{ set: 'kn_stranger_spoke' }],
      options: [
        { id: 'str.who', text: 'Who are you? How do you know me?', next: 'dying' },
        { id: 'str.pell', text: '(Run to the Grille for Pell.)', next: 'run_pell' },
        { id: 'str.help', text: 'Let me see the wound.', check: { skill: 'medicine', dc: 35, mods: [{ if: { origin: 'clinic_aide' }, dc: -20, why: 'Pell trained you through the Grille' }] }, next: 'wound', fail: 'wound_fail' },
      ],
    },
    run_pell: { speaker: 'narrator', text: 'You hammer the Grille until a light comes, shout for Pell, and run back. He hasn\'t moved.', effects: [{ set: 'pell_night' }, { set: 'pell_met' }], options: [{ text: '(Kneel by him.)', next: 'wound_pell' }] },
    wound_pell: {
      speaker: 'npc_c9_02',
      text: 'Pell\'s voice through the holes, a few steps away, steady: "Tell me what you see. Where\'s the blood coming from? ... The hip. Old wound, gone bad — smell it? Then there\'s nothing for it with what you have. Hold his hand. Hold his hand and listen to him."',
      options: [{ text: '(Hold his hand.)', next: 'dying' }],
    },
    wound: {
      text: 'A rifle wound in the hip, weeks old, gone bad under a field dressing. And above it a second scar, closed long ago, not stitched: sealed, with a clean line of something like glass melted into the skin. Machine work. You have only ever heard Pell describe it. There is nothing you can do with a needle and water, and you both know it.',
      effects: [{ learn: 'stranger_stitches' }, { lead: 'l_sealed_wound' }, { xp: 25 }],
      options: [{ text: '(Hold his hand.)', next: 'dying' }],
    },
    wound_fail: { speaker: 'narrator', text: 'Blood to the knee. You press where it seems to come from and he hisses, and it doesn\'t stop. It is not the kind of wound pressing stops.', options: [{ text: '(Hold his hand.)', next: 'dying' }] },
    dying: {
      text: 'His hand closes on yours with more strength than he should have. He presses something into it: a photograph, creased soft. "Don\'t let them—" A breath that doesn\'t finish. His eyes are still on your face. Then they aren\'t on anything.',
      effects: [{ give: 'k_photo' }, { set: 'kn_stranger_dead' }, { learn: 'photo_seen' }, { xp: 50 }],
      options: [{ text: '(Look at the photograph.)', next: 'photo' }],
    },
    photo: {
      speaker: 'narrator',
      text: 'It\'s you. Older — forty, forty-five — on the broad steps of a ruined city of towers, squinting into the wind. On the back, in pencil, a date forty-one years gone.',
      passives: [
        { attr: 'senses', dc: 8, text: 'The shadow under your chin falls to the left. The towers\' shadows fall to the right.', effects: [{ lead: 'l_photo_light' }, { learn: 'photo_shadows' }] },
        { if: { knows: 'linnet_print' }, label: 'Linnet\'s print', text: 'The steps. You know those steps: they are on the cheap print over Linnet\'s cot.', effects: [{ learn: 'kn_photo_steps_spire' }] },
      ],
      options: [{ text: '(Search his pack.)', next: 'body' }],
    },
    body: {
      speaker: 'narrator',
      text: [{ if: { flag: 'kn_body_searched' }, text: 'He sits against the door as if waiting for it to open. Someone has put a blanket over his knees.' }, { text: 'His pack is light: a notebook in tight marks that aren\'t quite letters, a tin cup, no map, no water. The dust mask, when you ease it off, has a sign painted on its brow with care: half a sun with no ground under it, or an open hand. On his left forearm, a neat square burn, old and deliberate.' }],
      passives: [{ attr: 'senses', dc: 6, text: 'Inside the mask\'s rim, scratched letters, worn almost smooth.', effects: [{ learn: 'mask_scratches' }] }],
      effects: [{ give: 'k_notebook' }, { give: 'k_mask' }, { set: 'kn_body_searched' }, { set: 'c9_examined' }, { set: 'c9_pack_given' }, { learn: 'sigil_seen' }, { learn: 'stranger_mark' }, { lead: 'l_sigil' }, { lead: 'l_burned_mark' }],
      options: [{ text: '(Leave him with Knock, and go to Maud.)', exit: true }],
    },
  },
};

// ---- the morning after: the outriders ------------------------------------------------------------------------------
export const d_kn_outriders: DialogueDef = {
  id: 'd_kn_outriders', owner: 'npc_kn_out_lead',
  start: [{ if: { flag: 'kn_outriders_met' }, node: 'again' }, { node: 'arrive' }],
  nodes: {
    arrive: {
      text: 'Three riders in the square on tired horses, Guild sashes faded to the colour of the road. The one in front is grey at the temples and polite about it. "Brannick Hale, outrider, the Tollmen\'s Guild. We\'re after an old man in a dust mask carrying stolen Guild property. He came this way. We know he came this way." He looks at you, and at your face, a moment too long. "You found him."',
      passives: [
        { attr: 'wits', dc: 6, text: 'He came straight to the post-house. He knew which house.', effects: [{ learn: 'kn_hale_knew_house' }] },
        { if: { knows: 'corin_rode_with_hale' }, label: 'Corin', text: 'Up on the rise, a glint: Corin, on his belly, with the rifle.' },
      ],
      effects: [{ set: 'kn_outriders_met' }],
      options: [
        { id: 'out.give', text: '(Hand over the notebook.) This is what he carried. Take it and go.', if: { item: 'k_notebook' }, next: 'give' },
        { id: 'out.lie', text: 'He died in the night. We buried him with his things.', check: { skill: 'speech', dc: 45, mods: [{ if: { origin: 'archive_clerk' }, dc: -10, why: 'you know how the Guild talks' }] }, next: 'lie', fail: 'lie_fail' },
        { id: 'out.hide', text: '(Say nothing; let him search. The photograph is in your boot.)', check: { skill: 'stealth', dc: 35, mods: [{ if: { origin: 'door_watch' }, dc: -10, why: 'you\'ve hidden from the watch-bell all your life' }] }, next: 'hide', fail: 'hide_fail' },
        { id: 'out.fight', text: '(Raise your arm to the rise.) Knock gives the Guild water. Not its dead.', effects: [{ set: 'kn_out_fight' }], next: 'fight' },
      ],
    },
    give: {
      text: 'Hale turns the notebook over, flicks it, frowns. "This is all?" He looks at you a long time. "This is all." He tucks it into his coat. "The Guild thanks Knock." Then, almost gently: "We\'ll be taking our due for the trouble."',
      effects: [{ take: 'k_notebook' }, { set: 'kn_out_choice', value: 'gave' }, { set: 'kn_gave_notebook' }, { decision: { id: 'kn_gave_notebook', text: 'You gave the outriders the stranger\'s notebook and kept the photograph.' } }],
      options: [{ text: 'What due?', next: 'due' }],
    },
    lie: {
      text: '"Buried." Hale weighs it. Weighs you. "With his things." He looks at the fresh earth by the door where Abel and Sim worked half the night. "Then the Guild will take its due for the trouble, and the dead can keep what they stole."',
      effects: [{ set: 'kn_out_choice', value: 'lied' }, { decision: { id: 'kn_lied_hale', text: 'You lied to the outriders: the stranger was buried with his things.' } }, { xp: 50 }],
      options: [{ text: 'What due?', next: 'due' }],
    },
    lie_fail: {
      text: '"Buried." Hale smiles for the first time. "With his things. Search the post-house," he says over his shoulder, and his riders go, and you hear Maud shouting, and then something breaking.',
      effects: [{ set: 'kn_out_choice', value: 'caught' }],
      options: [{ text: '(Run to the post-house.)', next: 'due' }],
    },
    hide: {
      text: 'They search the post-house, the shacks, you. The photograph is flat in your boot under your foot and nobody thinks to look at your boots, because nobody ever does. Hale stands in the square with his hands on his hips. "Knock," he says. "Sixty years of the Guild\'s good water, and this is the thanks."',
      effects: [{ set: 'kn_out_choice', value: 'hid' }, { decision: { id: 'kn_hid_it', text: 'You hid the stranger\'s things from the outriders.' } }, { xp: 50 }],
      options: [{ text: '...', next: 'due' }],
    },
    hide_fail: {
      text: 'They search the post-house, the shacks, and then you. Carrow finds the notebook. Nobody finds the photograph in your boot, because Hale is already shouting, because Maud has come at Carrow with the post-book.',
      effects: [{ take: 'k_notebook' }, { set: 'kn_out_choice', value: 'caught' }],
      options: [{ text: '(Run to her.)', next: 'due' }],
    },
    due: {
      speaker: 'narrator',
      text: 'Their due is the post-house. It goes up in the time it takes to say so: sixty years of letters, the shelf, the table, the cots. Maud goes in after the post-book before anyone can stop her and comes out with it, burning, and with her leg broken under a fallen beam. The outriders ride north without looking back. Knock stands in the square and watches its letters go up in the morning wind.',
      effects: [{ set: 'kn_posthouse_burned' }, { set: 'kn_maud_hurt' }, { set: 'kn_outriders_gone' }, { news: { tag: 'knock_burned', text: 'Guild outriders burned the post-house at Knock', valence: -10, size: 6, at: 'cistern9' } }],
      options: [{ text: '(Go to Maud.)', exit: true }],
    },
    fight: {
      text: 'Hale sees your arm, and looks up at the rise, and sighs like a man who expected nothing better. "Corin Asch," he says. "Twenty years." His hand goes to his revolver.',
      options: [{ text: '(Fight.)', exit: true }],
    },
    again: { text: '"We\'re done talking."', options: [{ text: '(Step back.)', exit: true }] },
  },
};
