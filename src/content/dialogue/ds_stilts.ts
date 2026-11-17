import type { DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';

/**
 * Gull Stilts on the Drowned Shore (B5b): the village, the Stilt Court on the Greta (Oil on the Water, the man the sea took,
 * the false light), the tide post, the dives off Coker's stage, the tide boat, the smokehouse. The Rigs, Hum's leg,
 * Blackcap and the road are in ds_rigs.ts. Story notes: story/B5b_NOTES_SECRET.md.
 */

export const TAMSIN = 'npc_c9_03';
export const WREN = 'npc_rd_03';
export const ILYA = 'npc_sh_17';
export const ODILE = 'npc_nb_03';
export const ASH = 'npc_of_03';
export const NINE = 'npc_md_nine';
export const KES = 'npc_hs_01';

export const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
export const bye: OptionDef = { text: 'That\'s all.', exit: true };
export const leave: OptionDef = { text: '(Leave it.)', exit: true };
export const NIGHT: Cond = { hour: { from: 21, to: 6 } };
export const DAY: Cond = { hour: { from: 6, to: 21 } };
/** Low water and slack: twice a day, as the city's printed table says. The old sea wall walks, the bottom is still. */
export const LOW_WATER: Cond = { any: [{ hour: { from: 3, to: 7 } }, { hour: { from: 15, to: 19 } }] };
export const DAWN: Cond = { hour: { from: 4, to: 8 } };
export const TOLLS = (n: number): Cond => ({ item: 'tolls', count: n });
export const BAG: Cond = { item: 't_rebreather' };
export const NEWS = (tag: string, text: string, valence: number, size = 5, at = 'hamlet_shore'): Effect => ({ news: { tag, text, valence, size, at } });
export const DEC = (id: string, text: string): Effect => ({ decision: { id, text } });
const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const NOT = (c: Cond): Cond => ({ not: c });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });

/** Lua's claim is still before the court. */
export const SHEEN_OPEN: Cond = NOT(F('ds_claim'));
/** Hum's export line is closed or sleeved: the sheen thins and the fish come back. */
export const FISH_BACK: Cond = ANY(F('ds_valve', 'shut'), F('ds_valve', 'sleeved'));
/** Yewande is gone from the stage (hanged, or put off the stilts): Ade runs the dives. */
export const ADE_RUNS: Cond = ANY(F('ds_coker_dead'), F('ds_coker_off'));
/** Anything that tells a reader the guild opened Hum's line. */
export const GUILD_PROOF: Cond = ANY({ item: 'k_ds_seal' }, { item: 'k_ds_tally' }, { item: 'k_ds_manifest' }, F('ds_marek_word'), { concluded: 'c_ds_guild_line' }, { knows: 'ds_guild_seal' });
/** The player knows who hangs the false light. */
export const KNOWS_WRECKER: Cond = { knows: 'ds_coker_wrecker' };
const KNOWS_WRECKERS: Cond = ANY({ concluded: 'c_ds_false_light' }, KNOWS_WRECKER);
const LIGHT_OPEN: Cond = NOT(F('ds_light'));

/** The court rules for Lua against the guild (the claim upheld): the Stilts owe the player; Hum's crew keep Hum. */
const CLAIM_GUILD = (how: string, text: string): Effect[] => [
  { set: 'ds_claim', value: 'guild' }, { set: 'ds_claim_how', value: how }, { set: 'ds_boats_owed' }, { set: 'ds_rig', value: 'crew' }, { set: 'ds_marek_gone' }, { set: 'ds_rig_leave' },
  { rep: { faction: 'tollmen', respect: -10 } }, { trust: { npc: 'npc_ds_02', by: 30 } }, { memory: { npc: 'npc_ds_02', tag: 'stood_for_kai', valence: 40, strength: 90 } },
  A(WREN, 5), A(TAMSIN, 5), A(ASH, 5), A(KES, 5), A(NINE, 3), { xp: 300 }, DEC('ds_claim', text),
  NEWS('ds_claim_guild', 'the Stilt Court at Gull Stilts found the guild had opened the Rigs\' old line and drowned a boy in its leak', 8, 8),
];
/** An open valve is closed by Hum's own divers once the guild's seal is off it. */
const CREW_SHUTS: Effect[] = [{ set: 'ds_valve', value: 'shut' }];

export const d_ds_oona: DialogueDef = {
  id: 'd_ds_oona', owner: 'npc_ds_01',
  start: [{ if: F('ds_oona_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old woman at a chart table on the Greta\'s car deck, a book in front of her as thick as a brick with a pen tied to it on a string. Her hair is cut short with shears, white as the gulls on the stilts. "Oona Brack. I keep the Book." She lays two fingers on it. "Every boat in Gull Stilts is written in here, and every boat\'s law, and every soul the water took. You came in on the road. You\'ll have seen the Ebb Steps." She lets that sit. "Lua Tanoa\'s boy went out on the ebb this morning. She\'s called the court on the Rigs. Page nine: a life for a life, or a boat for a life. The court sits when somebody stands up with what the water knows. Grief isn\'t evidence; I\'m sorry for it, but it isn\'t."',
      again: 'Oona waits, a finger keeping her page.',
      effects: [{ set: 'ds_oona_met' }, { learn: 'ds_oona' }, { learn: 'ds_claim_called' }],
      interject: [
        { companion: TAMSIN, text: '"It\'s the sky lying down," Tamsin says, to nobody, looking past the Greta\'s rail at the water. Oona looks at her. "First time?" "First time anything," Tamsin says.' },
        { companion: NINE, text: '"This was diked land," Nine says. "Lower delta, polders four to eleven, pumped by the city\'s stations until R minus forty. The record has it as farmland." Oona does not look up. "The record can come and plough it."' },
        { companion: ASH, text: '"You give them to the sea," Ash says. "We give ours to the sky." Oona considers him. "Same thing, from underneath."' },
      ],
      options: [
        { id: 'oona.need', text: 'What does the court need to hear?', next: 'need' },
        { id: 'oona.book', text: 'Tell me about the Book.', next: 'book' },
        { id: 'oona.rigs', text: 'Who are the Rigs?', next: 'rigs' },
        { id: 'oona.post', text: 'And the guild\'s post at your stern?', next: 'post' },
        bye,
      ],
    },
    again: {
      text: [
        { if: F('ds_claim', 'guild'), text: 'Oona at the Book with the pen in her fingers. A page near the back is newer than the rest, and the ink on it is still blue. "The Stilts are quieter. Not better. Quieter. That\'s what a true thing does."' },
        { if: F('ds_claim', 'sea'), text: 'Oona at the Book. She does not open it while you are standing there. "The sea\'s," she says. "It\'s written."' },
        { if: NIGHT, text: 'The Greta\'s lamps, and Oona under them with the Book shut and her hands on it. "Court doesn\'t sit at night. I do."' },
        { text: 'Oona looks up from the Book. "You\'re back aboard."' },
      ],
      again: 'Oona waits, a finger keeping her page.',
      options: [
        { id: 'oona.need2', text: 'What does the court need to hear?', if: NOT({ seen: 'oona.need' }), next: 'need' },
        { id: 'oona.book2', text: 'Tell me about the Book.', if: NOT({ seen: 'oona.book' }), next: 'book' },
        { id: 'oona.rigs2', text: 'Who are the Rigs?', if: NOT({ seen: 'oona.rigs' }), next: 'rigs' },
        { id: 'oona.post2', text: 'And the guild\'s post at your stern?', if: NOT({ seen: 'oona.post' }), next: 'post' },
        { id: 'oona.anchorage', text: 'The guild\'s anchorage is half your widows\' fund. The court eats from the guild\'s hand.', if: ALL({ knows: 'ds_anchorage' }, NOT(F('ds_anchorage_named')), SHEEN_OPEN), next: 'anchorage' },
        { id: 'oona.call', text: 'I\'m ready. Call the court on Lua\'s claim.', if: ALL(SHEEN_OPEN, F('ds_lua_met')), next: 'call_sheen' },
        { id: 'oona.mateo', text: 'There\'s a man at the Landing your Book says drowned. Mateo Ibarra.', if: ALL(F('ds_mateo_here'), NOT(F('ds_court')), NOT({ seen: 'oona.mateo' })), next: 'mateo' },
        { id: 'oona.mateo.call', text: 'Call the court for Mateo Ibarra.', if: ALL(F('ds_mateo_heard'), NOT(F('ds_court'))), next: 'mateo_call' },
        { id: 'oona.light', text: 'The salt barge on the Jesty didn\'t wreck itself. I know who hung the light.', if: ALL(KNOWS_WRECKER, LIGHT_OPEN), next: 'light' },
        { id: 'oona.terms', text: 'Blackcap\'s line is sleeved and runs clean. The tank could be half the Stilts\', half Hum\'s.', if: ALL(F('ds_valve', 'sleeved'), F('ds_claim', 'guild'), NOT(F('ds_oona_terms'))), next: 'terms' },
        { id: 'oona.page', text: 'Read me the new page.', if: ALL(F('ds_prec_living'), NOT({ seen: 'oona.page' })), next: 'page' },
        bye,
      ],
    },
    need: { text: '"Who fouled the water, and that they knew it." She ticks it on the Book\'s edge. "Something the court can hold in its hand: a thing, a name, a witness who isn\'t drunk. The Stilts all say the Rig. The Stilts always say the Rig. Saying is cheap." She looks at the water past the rail. "And find the net, if you\'re a diver. Lua won\'t ask. I will."', again: '"A thing, a name, a witness. And the net."', effects: [{ learn: 'ds_need' }, { lead: 'l_ds_kai' }], options: [{ text: 'Something else.', next: 'again' }] },
    book: {
      text: '"Sixty years of it. My mother started it in the Greta\'s logbook because the logbook was the only paper on the shore that would stay dry." She turns pages without looking at them. "Page one: the Book doesn\'t get wet. Page three: anything that floats and works is a boat. Page four: a false light is a life for a life. Page nine you know. Page twelve: what the water takes is the water\'s, and a boat found on the water is the finder\'s." A dry look. "The rest is who owns which mooring. Everyone reads the rest."',
      again: '"Page one: it doesn\'t get wet. The rest follows."',
      effects: [{ learn: 'ds_book_pages' }],
      interject: [{ companion: NINE, text: 'Nine\'s lens holds on the Book for a long moment. "A register kept by hand, by one family, for sixty years," it says. "The Court of Accounts would call that a precedent. I would call it a record." Oona: "I call it the Book."' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    rigs: { text: '"Hum. A steel island that\'s burned its own breath for ninety years and lifts oil with it. Forty people on it who\'d sell their mothers for a yard of soil. They cook the oil into lamp oil and rig diesel and sell a tanker a month to the guild for the Line." She shrugs. "We buy their tar for our hulls. We sell them our fish. We don\'t marry them. The light on Lean is theirs too, and it brings our boats home, so we don\'t say that last part loud."', again: '"Hum lifts. Lean lights. Stump\'s legs. That\'s the Rigs."', effects: [{ learn: 'ds_rigs_known' }, { learn: 'loc_rigs' }], options: [{ text: 'Something else.', next: 'again' }] },
    post: { text: '"The tide post. The guild buys our fish by the weight and sells us salt and twine and medicine by the measure, and its scale is honest; Cyprian Thorne will tell you so." She does not smile. "It pays anchorage to the court for the mooring. The anchorage feeds the widows." She says how much with her silence, and then she says it with her eyes on the Book. "Write that down, if you\'re the writing kind. I already have."', again: '"The post buys, the post sells, the post pays the mooring."', effects: [{ learn: 'ds_post_known' }], options: [{ text: 'Something else.', next: 'again' }] },
    anchorage: { text: 'She does not deny it, which is its own answer. "Half. And the widows eat." She dips the pen and writes a line at the foot of the day\'s page, slowly, so you can watch it. "There. Written that a stranger said it on the Greta. If the court sits, it sits knowing what it eats." She puts the pen down. "Don\'t think I\'ll thank you."', again: '"Written. Don\'t wait for thanks."', effects: [{ set: 'ds_anchorage_named' }, A(TAMSIN, 3), A(ODILE, 2)], options: [{ text: 'Something else.', next: 'again' }] },
    page: { text: '"Page twelve, the second half." She reads it in the voice the Book gets. "What the water gives back is not the water\'s. A soul the Book has written drowned who walks in on the road is a soul, and a boat. Written in the year a man came home." She closes it. "My mother would have spat. Then she\'d have written it smaller under mine."', again: '"What the water gives back is not the water\'s."', options: [{ text: 'Something else.', next: 'again' }] },
    mateo: { text: [{ if: F('prec_unrecorded', 'yields'), text: '"I know." She has not looked up. "Somebody ran down the Gut an hour ago shouting it. IBARRA, MATEO — THE CURLEW — TAKEN BY THE WATER. I wrote it myself." Now she looks up. "Mele brought word down the delta this spring that the city\'s own court ruled a record must yield to the living. The city." She says it as if it were the tide table. "Page twelve is still page twelve. If he wants his boat he can stand up on this deck and ask. The court will also hear Rui Sousa, who found the Curlew adrift, and Paz, who said the words over an empty coat. Nobody\'s going to like this, stranger. That\'s how you know it\'s law."' }, { text: '"I know." She has not looked up. "Somebody ran down the Gut an hour ago shouting it. IBARRA, MATEO — THE CURLEW — TAKEN BY THE WATER. I wrote it myself." Now she looks up. "Page twelve is page twelve. If he wants his boat he can stand up on this deck and ask the court, and the court will hear him. The court will also hear Rui Sousa, who found the Curlew adrift, and Paz, who said the words over an empty coat." The pen goes down. "Nobody\'s going to like this, stranger. That\'s how you know it\'s law."' }], again: '"Page twelve. Let him stand up and ask."', effects: [{ learn: 'ds_oona_mateo' }], options: [{ text: 'Something else.', next: 'again' }] },
    terms: {
      text: '"Half." She says it the way she says page numbers. "The Stilts never owned anything that wasn\'t a boat." She looks east, toward a tank you cannot see from here. "Hum\'s oil in a tank the Stilts hold half of, and Hamid\'s crew selling the guild one tanker from their own deck at the old price, and the rest ours to sell where we like." A long breath. "That\'s a lot of oil for a village that can\'t keep its children off the bottom."',
      again: '"Half. A lot of oil for a village like this."',
      options: [
        { id: 'oona.terms.yes', text: 'It\'s the only thing out here worth more than fish. Hold it, or somebody else will.', if: F('ds_hamid_terms'), check: { skill: 'speech', dc: 45, mods: [{ if: { standing: { settlement: 'hamlet_shore', gte: 15 } }, dc: -10, why: 'the Stilts trust you' }, { if: { inParty: ODILE }, dc: -5, why: 'Odile prices it for her' }] }, effects: [{ set: 'ds_oona_terms' }, { set: 'ds_rig', value: 'shared' }, DEC('ds_rig_shared', 'Blackcap\'s tank is Gull Stilts\' and Hum\'s, half each, with its line sleeved and clean.'), NEWS('ds_rig_shared', 'Gull Stilts and the Rigs\' crew struck terms over the old tank at Blackcap: half each, and the guild buys at the old price', 5, 6), { xp: 150 }, A(ODILE, 5), A(KES, 3)], next: 'terms_yes', fail: 'terms_no' },
        { id: 'oona.terms.yes.first', text: 'It\'s the only thing out here worth more than fish. Hold it, or somebody else will.', if: NOT(F('ds_hamid_terms')), check: { skill: 'speech', dc: 45, mods: [{ if: { standing: { settlement: 'hamlet_shore', gte: 15 } }, dc: -10, why: 'the Stilts trust you' }, { if: { inParty: ODILE }, dc: -5, why: 'Odile prices it for her' }] }, effects: [{ set: 'ds_oona_terms' }, A(ODILE, 3)], next: 'terms_yes', fail: 'terms_no' },
        { text: 'Something else.', next: 'again' },
      ],
      interject: [{ companion: ODILE, text: '"A tank of fuel is a short position on everyone who hasn\'t got one," Odile says gently. "My dear, you\'d be the only seller between here and the Line. Charge for that." Oona looks at her as if she had been waiting sixty years for someone to say it.' }],
    },
    terms_yes: { text: '"Half, then." She writes it. "Tell Hamid Farouk the Stilts\' word is on the Book. He knows what that\'s worth: more than his, and less than the guild\'s money." She caps the pen.', again: '"Half. It\'s written."', options: [{ text: 'Something else.', next: 'again' }] },
    terms_no: { text: '"No." Not hard; finished. "Oil\'s a thing people come for with boats. I\'ve buried enough people who had something worth coming for." She goes back to the Book.', again: '"No. Let Hum keep its oil."', options: [{ text: 'Something else.', next: 'again' }] },

    // ---------------------------------------------------------------- the court: Lua's claim
    call_sheen: { text: 'She closes the Book on her finger. "At the turn of the tide, then. That\'s when the court sits; the hull talks when the water turns, and people listen better to a hull." She says it to the deck, and somebody at the rail goes off at a run down the Gut to say it to everyone else.', again: '"At the turn of the tide."', effects: [{ until: 18 }], options: [{ text: '(The turn of the tide.)', next: 's_open' }] },
    s_open: {
      text: [
        { if: F('ds_thorne', 'fled'), text: 'The Greta\'s car deck at the turn of the tide, with the lamps lit and all Gull Stilts on the benches where the cars stood. Lua Tanoa standing at the chart table with her hands at her sides. At the back, where the guild sits with the court because it pays the mooring, an empty bench: the factor went up the delta the morning after Blackcap burned. Oona opens the Book. "Lua Tanoa says the Rigs fouled the water and her boy died of it. Page nine. Who stands up with what the water knows?"' },
        { if: F('ds_hamid_told'), text: 'The Greta\'s car deck at the turn of the tide, with the lamps lit and all Gull Stilts on the benches where the cars stood. Lua Tanoa standing at the chart table with her hands at her sides. Factor Thorne in his good coat at the back, where the guild sits with the court because it pays the mooring. And, to a murmur that goes all round the hull, Hamid Farouk off the launch from Hum, standing alone by the rail. Oona opens the Book. "Lua Tanoa says the Rigs fouled the water and her boy died of it. Page nine. Who stands up with what the water knows?"' },
        { text: 'The Greta\'s car deck at the turn of the tide, with the lamps lit and all Gull Stilts on the benches where the cars stood. Lua Tanoa standing at the chart table with her hands at her sides. Factor Thorne in his good coat at the back, where the guild sits with the court because it pays the mooring. Oona opens the Book. "Lua Tanoa says the Rigs fouled the water and her boy died of it. Page nine. Who stands up with what the water knows?"' },
      ],
      again: 'The deck waits. The tide is turning under the hull; you can feel it in the benches.',
      interject: [
        { companion: WREN, text: 'Wren leans to your ear without looking away from Thorne. "Man at the back\'s the only one in here who\'s not watching the woman. He\'s watching the door."' },
        { companion: ILYA, text: 'Ilya, under his breath: "Forty-one on the benches. Three at the rail. One coat." He does not say whose.' },
      ],
      options: [
        { id: 'sh.net', text: '(Lay Kai\'s net on the Book.)', if: { item: 'k_ds_net' }, once: true, effects: [{ set: 'ds_ev_net' }], next: 's_ev_net' },
        { id: 'sh.seal', text: '(Lay the guild\'s seal from Hum\'s valve on the Book.)', if: { item: 'k_ds_seal' }, once: true, effects: [{ set: 'ds_ev_seal' }], next: 's_ev_seal' },
        { id: 'sh.tally', text: '(Put the tide post\'s tally on the Book, open at the back.)', if: { item: 'k_ds_tally' }, once: true, effects: [{ set: 'ds_ev_tally' }], next: 's_ev_tally' },
        { id: 'sh.manifest', text: '(Put the barge\'s manifest on the Book.)', if: { item: 'k_ds_manifest' }, once: true, effects: [{ set: 'ds_ev_manifest' }], next: 's_ev_manifest' },
        { id: 'sh.marek', text: '(Call Marek Zielinski, the guild\'s diver.)', if: F('ds_marek_word'), once: true, effects: [{ set: 'ds_ev_marek' }], next: 's_ev_marek' },
        { id: 'sh.sunhee', text: '(Call Sun-hee Park from Hum.)', if: F('ds_sunhee_word'), once: true, effects: [{ set: 'ds_ev_sunhee' }], next: 's_ev_sunhee' },
        { id: 'sh.pressure', text: '(Read out Hum\'s pressure log.)', if: { knows: 'ds_pressure' }, once: true, effects: [{ set: 'ds_ev_pressure' }], next: 's_ev_pressure' },
        {
          id: 'sh.guild', text: 'The guild opened Hum\'s old line to Blackcap, and Kai drowned in what it leaks.',
          check: { skill: 'speech', dc: 50, mods: [
            { if: F('ds_ev_seal'), dc: -15, why: 'the guild\'s own seal on Hum\'s valve' }, { if: F('ds_ev_tally'), dc: -15, why: 'the post\'s tally: two loads for one, and SHRINKAGE' },
            { if: F('ds_ev_manifest'), dc: -10, why: 'the barge\'s manifest' }, { if: F('ds_ev_marek'), dc: -10, why: 'the guild\'s diver says he turned the wheel' },
            { if: F('ds_ev_sunhee'), dc: -5, why: 'Hum\'s diver saw the guild\'s boat at the leg' }, { if: F('ds_ev_pressure'), dc: -5, why: 'Hum\'s pressure falling since the thaw' },
            { if: F('ds_ev_net'), dc: -5, why: 'the joint in Kai\'s net' }, { if: { concluded: 'c_ds_guild_line' }, dc: -10, why: 'you can lay it out end to end' },
            { if: { knows: 'ds_manual' }, dc: -5, why: 'Hum\'s board logged the valve turned by hand' }, { if: F('ds_hamid_told'), dc: -5, why: 'Hum\'s keeper stands with the claim' },
            { if: NOT(F('ds_anchorage_named')), dc: 10, why: 'the court eats from the guild\'s hand' }, { if: F('ds_thorne_paid'), dc: 10, why: 'you took his money' },
          ] },
          next: 's_guild', fail: 's_adjourn',
        },
        { id: 'sh.rig', text: 'It was the Rig. Hum\'s line weeps under the Gut, and Hum\'s oil killed him.', if: { knows: 'ds_joint' }, effects: [{ set: 'ds_rig_blamed' }], next: 's_rig' },
        { id: 'sh.rig.say', text: 'It was the Rig. Everybody here knows it was the Rig.', if: NOT({ knows: 'ds_joint' }), check: { skill: 'speech', dc: 40, mods: [{ if: { standing: { settlement: 'hamlet_shore', gte: 15 } }, dc: -10, why: 'the Stilts want to hear it' }] }, effects: [{ set: 'ds_rig_blamed' }], next: 's_rig', fail: 's_adjourn' },
        { id: 'sh.sea', text: 'The sea took him. Nobody did this.', next: 's_sea' },
        { id: 'sh.silent', text: '(Say nothing.)', next: 's_silent' },
      ],
    },
    s_ev_net: { text: 'You lay the small green net on the open Book, black to its corks. Lua makes a sound and stops it. Oona turns the brass collar knotted in the mesh to the lamp and reads it aloud: "SALTIRE — EXPORT — JOINT FOURTEEN." The benches go very quiet. Everybody on this deck knows the old line runs under the Gut. Nobody has said so in thirty years.', again: 'The net lies on the Book. Nobody touches it.', options: [{ text: '(Go on.)', next: 's_open' }] },
    s_ev_seal: { text: 'The lead seal on its twist of wire, on the Book. Oona holds it under the lamp a long time. "TOLLMEN — LINE ACCOUNT." At the back, Thorne\'s face does nothing at all, which is what a face does when it is working hard. "Off Hum\'s export valve, under the sea," you say. "Not three months old."', again: 'The seal on the Book, catching the lamp.', options: [{ text: '(Go on.)', next: 's_open' }] },
    s_ev_tally: { text: 'Thorne\'s day-book open at the back, on the Book of Water, on the Greta. Oona reads the columns out in the Book\'s voice: BLACKCAP — LINE ACCOUNT — TWO LOADS — HUM PAID ONE. SHRINKAGE. She reads the last word twice. "Shrinkage," she says, "is what the guild calls a boy."', again: 'The tally lies open on the Book.', interject: [{ companion: ODILE, text: 'Odile, not quietly: "LINE ACCOUNT is the Line\'s fuel book on the Ninebridge floor. Two loads bought for one is a spread, and Cyprian Thorne always did like a spread." Thorne, at the back, inclines his head to her as if to an old colleague.' }], options: [{ text: '(Go on.)', next: 's_open' }] },
    s_ev_manifest: { text: 'The barge\'s manifest: BLACKCAP — CRUDE — LINE ACCOUNT — A LOAD A FORTNIGHT — C. THORNE. Oona sets it beside the Book rather than on it, as if it were something that might stain.', again: 'The manifest beside the Book.', options: [{ text: '(Go on.)', next: 's_open' }] },
    s_ev_marek: { text: 'Marek Zielinski stands up from the back bench, where he has been sitting with his hands between his knees. He does not look at Thorne. "Three months back, at night, I went down Hum\'s north leg on a line from the guild\'s boat and turned the export wheel open, and sealed it. On the factor\'s word." He sits down. Then he stands up again. "I didn\'t know about the boy. I knew about the joints."', again: 'Marek sits with his hands between his knees.', options: [{ text: '(Go on.)', next: 's_open' }] },
    s_ev_sunhee: { text: 'Sun-hee Park, Hum\'s diver, in a borrowed coat: "Ninety-odd nights back I saw a boat at our north leg with no lamps, and bubbles in the moonpool that weren\'t ours. I told Hamid." She does not look at him. "Hamid didn\'t want told."', again: 'Sun-hee stands with her arms folded.', options: [{ text: '(Go on.)', next: 's_open' }] },
    s_ev_pressure: { text: 'You read Hum\'s log: export pressure falling every week since the thaw, eleven points, as if something far off were drinking. Oona writes the number down. "Hum\'s tired, they say on the Rigs." "Hum\'s being drunk," you say.', again: 'Oona\'s pen waits over the number.', options: [{ text: '(Go on.)', next: 's_open' }] },
    s_guild: {
      text: [{ if: F('ds_thorne', 'fled'), text: 'Oona reads the page aloud, every line of it, to the empty bench at the back as much as to anyone, and then she writes under it for a long time while the hull talks. "The court finds the guild opened Hum\'s old line to its tank at Blackcap for its own account, and knew the line leaked, and Kai Tanoa died of what it leaked." She looks up. "Page nine. A boat for a life." The deck waits. "Which boat?"' }, { text: 'Thorne stands. "The guild—" "The guild sits," Oona says, without raising her voice, and he sits. She reads the page aloud, every line of it, and then she writes under it for a long time while the hull talks. "The court finds the guild opened Hum\'s old line to its tank at Blackcap for its own account, and knew the line leaked, and Kai Tanoa died of what it leaked." She looks up. "Page nine. A boat for a life." The deck waits. "Which boat?"' }],
      again: '"A boat for a life," Oona says again. "Which boat?"',
      options: [
        { id: 'sg.barge', text: 'The guild\'s barge at Blackcap.', if: ALL(NOT(F('ds_valve')), NOT(F('ds_barge', 'burned'))), effects: [...CLAIM_GUILD('barge', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak, and took its barge for his life.'), ...CREW_SHUTS, { set: 'ds_barge', value: 'pyre' }, { set: 'ds_post', value: 'gone' }], next: 's_barge' },
        { id: 'sg.barge.v', text: 'The guild\'s barge at Blackcap.', if: ALL(F('ds_valve'), NOT(F('ds_barge', 'burned'))), effects: [...CLAIM_GUILD('barge', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak, and took its barge for his life.'), { set: 'ds_barge', value: 'pyre' }, { set: 'ds_post', value: 'gone' }], next: 's_barge' },
        { id: 'sg.price', text: 'The price of the barge, paid to the widows\' fund, and the guild\'s seal off Hum\'s valve. And the post stays, humbled.', if: ALL(NOT(F('ds_valve')), NOT(F('ds_barge', 'burned')), NOT(F('ds_thorne', 'fled'))), check: { skill: 'barter', dc: 45, mods: [{ if: { inParty: ODILE }, dc: -10, why: 'Odile names the figure before he can' }] }, effects: [...CLAIM_GUILD('price', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak. The guild paid the price of a barge to the widows and took its seal off Hum.'), ...CREW_SHUTS, { set: 'ds_barge', value: 'kept' }, { set: 'ds_post', value: 'stays' }, A(ODILE, 3)], failEffects: [...CLAIM_GUILD('barge', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak, and took its barge for his life.'), ...CREW_SHUTS, { set: 'ds_barge', value: 'pyre' }, { set: 'ds_post', value: 'gone' }], next: 's_price', fail: 's_barge' },
        { id: 'sg.price.v', text: 'The price of the barge, paid to the widows\' fund, and the guild\'s seal off Hum\'s valve. And the post stays, humbled.', if: ALL(F('ds_valve'), NOT(F('ds_barge', 'burned')), NOT(F('ds_thorne', 'fled'))), check: { skill: 'barter', dc: 45, mods: [{ if: { inParty: ODILE }, dc: -10, why: 'Odile names the figure before he can' }] }, effects: [...CLAIM_GUILD('price', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak. The guild paid the price of a barge to the widows and took its seal off Hum.'), { set: 'ds_barge', value: 'kept' }, { set: 'ds_post', value: 'stays' }, A(ODILE, 3)], failEffects: [...CLAIM_GUILD('barge', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak, and took its barge for his life.'), { set: 'ds_barge', value: 'pyre' }, { set: 'ds_post', value: 'gone' }], next: 's_price', fail: 's_barge' },
        { id: 'sg.lua', text: 'Let Lua say.', if: NOT(F('ds_barge', 'burned')), next: 's_lua_says' },
        { id: 'sg.burned', text: 'The guild\'s barge is already on the bottom at Blackcap. Let the Book say whose boat it was.', if: ALL(F('ds_barge', 'burned'), NOT(F('ds_valve'))), effects: [...CLAIM_GUILD('burned', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak, and wrote the guild\'s burned barge down as his boat.'), ...CREW_SHUTS], next: 's_burned' },
        { id: 'sg.burned.v', text: 'The guild\'s barge is already on the bottom at Blackcap. Let the Book say whose boat it was.', if: ALL(F('ds_barge', 'burned'), F('ds_valve')), effects: [...CLAIM_GUILD('burned', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak, and wrote the guild\'s burned barge down as his boat.')], next: 's_burned' },
      ],
    },
    s_lua_says: {
      text: 'Lua looks at the Book, not at anyone. "Their barge," she says. "I don\'t want it. I want it to burn."',
      again: '"Their barge. To burn."',
      options: [
        { id: 'sl.barge', text: '(Let it stand.)', if: NOT(F('ds_valve')), effects: [...CLAIM_GUILD('barge', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak, and took its barge for his life.'), ...CREW_SHUTS, { set: 'ds_barge', value: 'pyre' }, { set: 'ds_post', value: 'gone' }], next: 's_barge' },
        { id: 'sl.barge.v', text: '(Let it stand.)', if: F('ds_valve'), effects: [...CLAIM_GUILD('barge', 'The Stilt Court found the guild had opened Hum\'s line and drowned Kai Tanoa in its leak, and took its barge for his life.'), { set: 'ds_barge', value: 'pyre' }, { set: 'ds_post', value: 'gone' }], next: 's_barge' },
      ],
    },
    s_barge: { text: 'The court\'s boats go out to Blackcap at dawn and bring the guild\'s barge in on the flood with nobody aboard her. Lua Tanoa pours Hum\'s lamp oil over the deck herself, and the village pushes her off the Ebb Steps on the ebb, burning, with a small green net tied to her bow. She goes out a long way before she goes down. In the morning the tide post\'s mooring at the Greta\'s stern is empty; the guild has cast off, and the salt will come up the delta by the tide boat now, dearer. Nobody on the Stilts says that last part loud, either.', effects: [NEWS('ds_barge_pyre', 'Gull Stilts burned the guild\'s barge on the ebb for a drowned boy, and the guild pulled its tide post off the shore', 4, 7)], options: [{ text: '(Leave the Greta.)', exit: true }] },
    s_burned: { text: 'Oona writes it: the guild\'s barge, burned at its own tank at Blackcap with Hum\'s oil in her, for the life of Kai Tanoa, eleven. She reads it back. Lua listens with her eyes shut. "Then that was his boat," she says. "He\'d have liked a fire." Nobody on the benches says who lit it. Everybody on the benches knows.', effects: [NEWS('ds_claim_burned', 'the Stilt Court wrote the guild\'s burned barge down as a drowned boy\'s boat', 4, 6)], options: [{ text: '(Leave the Greta.)', exit: true }] },
    s_price: { text: 'Thorne does the sum in front of the whole village, which costs him more than the money: three hundred Tolls to the court\'s widows, and a diver of Hum\'s own to cut the guild\'s seal off the export wheel. Lua says, to the Book, "Write that they paid. Don\'t write what." Oona writes it. In the morning the tide post is still at the Greta\'s stern, and Cyprian Thorne buys fish by the weight and sells salt by the measure and does not look anyone in the face for a week.', effects: [NEWS('ds_claim_price', 'the guild paid the Stilt Court the price of a barge for a drowned boy at Gull Stilts, and kept its post', 2, 6)], options: [{ text: '(Leave the Greta.)', exit: true }] },
    s_adjourn: { text: 'Oona hears you out. Then she closes the Book. "That\'s a story," she says, "and I believe some of it. The court can\'t hang a boat on what I believe." She looks at Lua, then at you. "Bring me what the water knows and I\'ll sit again. The water\'s not going anywhere." The benches empty slowly, the way they do after a burial.', effects: [{ inc: 'ds_adjourned' }], options: [{ text: '(Leave the Greta.)', exit: true }] },
    s_rig: {
      text: 'The deck likes it; you can hear the deck liking it. Oona writes. "Page nine and page three: anything that floats and works is a boat. Hum floats. Hum works." She looks up. "The court finds Hum\'s oil killed Kai Tanoa, and Hum is forfeit to Gull Stilts, for his life." Lua looks at you as if she believes you, which is the worst thing anyone has looked at you with in some time. At the back, Thorne lets out a breath and folds his hands.',
      interject: [{ companion: KES, if: { knows: 'ds_guild_seal' }, text: 'Kes says nothing at all until you are off the deck. Then: "You know whose seal was on that wheel. Obviously you know. I was there." She walks ahead of you down the Gut.', effects: [A(KES, -10)] }],
      effects: [
        { set: 'ds_claim', value: 'rig' }, { set: 'ds_rig_taking' }, { set: 'ds_boats_owed' }, { trust: { npc: 'npc_ds_02', by: 20 } }, { xp: 150 },
        DEC('ds_claim', 'The Stilt Court found Hum\'s oil had killed Kai Tanoa and took the Rig for his life. The Stilts\' boats are going out to take it.'),
        NEWS('ds_claim_rig', 'the Stilt Court at Gull Stilts gave the Rigs to the village for a drowned boy; the Stilts\' boats are going out to take Hum', 0, 8),
      ],
      options: [{ text: '(Leave the Greta.)', exit: true }],
    },
    s_sea: {
      text: 'Oona looks at you for a long time. Then she writes. "The court finds the sea took Kai Tanoa." Lua does not make a sound. She walks down the middle of the deck between the benches and off the Greta\'s ramp, and nobody stops her, and nobody follows her. At the back, Thorne stands, and straightens his coat, and goes back to the post.',
      effects: [
        { set: 'ds_claim', value: 'sea' }, { set: 'ds_lua_gone' }, { set: 'ds_rig', value: 'guild' }, { trust: { npc: 'npc_ds_02', by: -50 } },
        A(TAMSIN, -10), A(WREN, -5), A(ASH, -5), A(KES, -5),
        DEC('ds_claim', 'The Stilt Court found the sea had taken Kai Tanoa. His mother left the shore.'),
        NEWS('ds_claim_sea', 'the Stilt Court at Gull Stilts found the sea drowned the Tanoa boy, on a stranger\'s word', -6, 6),
      ],
      options: [
        { id: 'ss.reopen', text: '(Leave the Greta.)', if: F('ds_valve', 'shut'), effects: [{ set: 'ds_valve', value: 'open' }, DEC('ds_valve_reopened', 'The guild\'s diver went down Hum\'s leg again and opened the export line.')], exit: true },
        { id: 'ss.leave', text: '(Leave the Greta.)', if: NOT(F('ds_valve', 'shut')), exit: true },
      ],
    },
    s_silent: { text: 'You say nothing. The deck waits, and then it understands, and something goes out of it. Oona writes. "The court has nobody who knows anything. The sea took him, then." Lua walks off the Greta without looking at anyone.', effects: [{ set: 'ds_claim', value: 'sea' }, { set: 'ds_claim_how', value: 'silence' }, { set: 'ds_lua_gone' }, { set: 'ds_rig', value: 'guild' }, A(TAMSIN, -5), DEC('ds_claim', 'Nobody spoke for Kai Tanoa at the Stilt Court; the court found the sea had taken him, and his mother left the shore.'), NEWS('ds_claim_sea', 'the Stilt Court at Gull Stilts found the sea drowned the Tanoa boy; nobody spoke', -2, 5)], options: [{ id: 'si.reopen', text: '(Leave the Greta.)', if: F('ds_valve', 'shut'), effects: [{ set: 'ds_valve', value: 'open' }], exit: true }, { id: 'si.leave', text: '(Leave the Greta.)', if: NOT(F('ds_valve', 'shut')), exit: true }] },

    // ---------------------------------------------------------------- the court: Mateo Ibarra
    mateo_call: { text: '"At the turn of the tide." She does not say it gladly. "Tell Rui Sousa. No. I\'ll tell him. It\'s my page."', again: '"At the turn of the tide."', effects: [{ until: 18 }], options: [{ text: '(The turn of the tide.)', next: 'm_open' }] },
    m_open: {
      text: 'The Greta at the turn of the tide, and more people on the benches than came for the boy, because this one is about the living. Mateo Ibarra at the chart table in somebody\'s borrowed jersey. Rui Sousa with his arms folded and his back to the rail. Paz on the back bench with the baby asleep against her, looking at neither of them. Oona reads from the Book: "IBARRA, MATEO — THE CURLEW — TAKEN BY THE WATER." She turns to page twelve and reads that too. "Who stands up?"',
      again: 'The benches wait. Paz has not moved.',
      interject: [{ companion: NINE, text: '"The record suggests," Nine says to you, very low, "that a record which cannot yield to the living is a grave with a filing system. I have read that sentence in a court before. It was a good court."' }],
      options: [
        { id: 'mo.brand', text: '(Show the court the brand on his wrist.)', if: { knows: 'ds_brand' }, once: true, effects: [{ set: 'ds_ev_brand' }], next: 'm_ev_brand' },
        { id: 'mo.oars', text: '(Ask Mele Tui how the Curlew\'s oars were found.)', if: { lead: 'l_ds_curlew_adrift' }, once: true, effects: [{ set: 'ds_ev_oars' }], next: 'm_ev_oars' },
        { id: 'mo.patch', text: '(Ask Mateo where he patched the Curlew\'s bow.)', if: { knows: 'ds_curlew_patch' }, once: true, effects: [{ set: 'ds_ev_patch' }], next: 'm_ev_patch' },
        { id: 'mo.living', text: 'The water gave him back. A man who walks in on the road isn\'t the water\'s.', check: { skill: 'speech', dc: 50, mods: [{ if: F('ds_ev_brand'), dc: -10, why: 'the block\'s brand: he was sold, not drowned' }, { if: F('ds_ev_oars'), dc: -5, why: 'a drowning man doesn\'t ship his oars' }, { if: F('ds_ev_patch'), dc: -5, why: 'he knows his own boat\'s patch' }, { if: { inParty: NINE }, dc: -5, why: 'Nine reads a record that yields to the living' }, { if: F('ds_prec_living'), dc: -20, why: 'it is already written' }, { if: F('prec_unrecorded', 'yields'), dc: -10, why: 'the city\'s own Court has ruled that the record yields to the living' }, { if: F('prec_unrecorded', 'property'), dc: 5, why: 'the city\'s Court ruled the unrecorded are property' }] }, next: 'm_living', fail: 'm_written_fail' },
        { id: 'mo.sold', text: 'He never went in the water. The guild\'s press took him off the Gut at night, on Rui Sousa\'s word, and paid Rui with his boat.', if: ANY(ALL({ item: 'k_ds_tally' }, { knows: 'ds_tally_press' }), F('ds_rui_confessed'), { concluded: 'c_ds_sold' }), next: 'm_sold' },
        { id: 'mo.written', text: 'The Book is the Book. Page twelve stands.', next: 'm_written' },
        { id: 'mo.silent', text: '(Say nothing.)', next: 'm_written' },
      ],
    },
    m_ev_brand: { text: 'Mateo pushes his sleeve back without being asked. The brand on the inside of his wrist is two years healed and still the colour of a burn: N-B 4471. "Ninebridge," somebody on the benches says, and the word goes round the hull like a cold draught. Everybody on the shore knows what the block at Ninebridge sells.', again: 'Mateo\'s sleeve is still pushed back.', options: [{ text: '(Go on.)', next: 'm_open' }] },
    m_ev_oars: { text: 'Mele Tui stands up on the benches. "I found the Curlew. Dawn, two years back, off the Jesty." She looks at Rui and then does not. "Her oars were shipped and lashed. Neat. A drowning man doesn\'t ship his oars. I said so at the time, to the Book." Oona turns back sixty pages and finds it, in her own hand. She reads it out, and her voice does something it does not usually do.', again: 'Mele sits down. Rui has not unfolded his arms.', options: [{ text: '(Go on.)', next: 'm_open' }] },
    m_ev_patch: { text: '"Starboard bow, a hand under the gunwale. Birch over tarred canvas, eleven copper tacks, and the ninth is bent because I hit my thumb." Mateo says it to Rui, not to the court. Rui says nothing. He has fished the Curlew for two years; he knows the bent tack.', again: 'Mateo still looks at Rui.', options: [{ text: '(Go on.)', next: 'm_open' }] },
    m_living: {
      text: 'Oona hears it all, and then she turns to the back of the Book, to a page nobody has written on, and writes for a long time while the hull talks. Then she reads it in the Book\'s voice: "What the water gives back is not the water\'s." The Curlew is Mateo Ibarra\'s. And then, because there is still a woman on the back bench, she does a thing the Book has never done. "Paz Ibarra. Stand up and say it yourself." Paz stands, with the baby. She looks at Mateo for a long time.',
      again: 'Paz stands with the baby against her shoulder.',
      interject: [{ companion: TAMSIN, text: 'Tamsin lets out a breath you did not know she was holding. "Somebody asked her," she says. "Somebody finally asked her."', effects: [A(TAMSIN, 5)] }],
      options: [
        { id: 'ml.knows', text: '(Wait for her.)', if: F('ds_paz_knows'), effects: [{ set: 'ds_court', value: 'living' }, { set: 'ds_prec_living' }, { set: 'ds_boats_owed' }, { set: 'ds_paz', value: 'alone' }, { set: 'ds_rui', value: 'left' }, A(NINE, 5), { xp: 200 }, DEC('ds_court', 'The Stilt Court wrote a new page for Mateo Ibarra: what the water gives back is not the water\'s. Paz, who knew what Rui had done, chose neither man.'), NEWS('ds_court_living', 'the Stilt Court at Gull Stilts wrote a new page: a man the Book had drowned walked home and got his boat back', 5, 6)], next: 'm_living_alone' },
        { id: 'ml.stays', text: '(Wait for her.)', if: NOT(F('ds_paz_knows')), effects: [{ set: 'ds_court', value: 'living' }, { set: 'ds_prec_living' }, { set: 'ds_boats_owed' }, { set: 'ds_paz', value: 'rui' }, A(NINE, 5), { xp: 200 }, DEC('ds_court', 'The Stilt Court wrote a new page for Mateo Ibarra: what the water gives back is not the water\'s. He has the Curlew; Paz stayed with Rui and the baby.'), NEWS('ds_court_living', 'the Stilt Court at Gull Stilts wrote a new page: a man the Book had drowned walked home and got his boat back', 5, 6)], next: 'm_living_stays' },
      ],
    },
    m_living_alone: { text: '"I said the words over your coat," Paz says to Mateo. "I meant them." To Rui she says nothing at all, and that is worse. She goes down the ramp with the baby. Rui goes after her and stops at the bottom, and stands there, and after a while takes his nets off the Curlew one by one and carries them to the net store. Mateo moors the Curlew under her loft that night, and sleeps in her.', options: [{ text: '(Leave the Greta.)', exit: true }] },
    m_living_stays: { text: '"I said the words over your coat," Paz says to Mateo. "I meant them. I\'ve a child now." She sits down beside Rui. Mateo nods, as if that were a thing he had walked two hundred miles expecting, and goes down the ramp to his boat. He moors her on the finger jetty by the Netlofts, where Paz can see her from the loft door. That is not an accident and everybody knows it.', options: [{ text: '(Leave the Greta.)', exit: true }] },
    m_written_fail: { text: 'Oona hears you, and the Book does not move. "Page twelve," she says. "My mother wrote it with her hand on a drowned man\'s coat. I won\'t unwrite it because a stranger talks well." She writes under the old entry: CAME BACK. STILL THE WATER\'S. Mateo looks at the Curlew a long time through the Greta\'s door, and then goes down the ramp and out along the Gut toward the Landing and Hum\'s launch, where they take anyone who can carry.', effects: [{ set: 'ds_court', value: 'written' }, { set: 'ds_court_how', value: 'failed' }, DEC('ds_court', 'The Stilt Court kept page twelve: Mateo Ibarra is still the water\'s. He went out to the Rigs.'), NEWS('ds_court_written', 'the Stilt Court at Gull Stilts kept its page: the man who walked home is still drowned, and his boat the finder\'s', -1, 5)], options: [{ text: '(Leave the Greta.)', exit: true }] },
    m_written: { text: '"Page twelve," Oona says, and writes under the old entry: CAME BACK. STILL THE WATER\'S. Rui unfolds his arms. Paz does not look up. Mateo looks at the Curlew a long time through the Greta\'s door, and then goes down the ramp and along the Gut toward the Landing and Hum\'s launch, where they take anyone who can carry.', effects: [{ set: 'ds_court', value: 'written' }, A(TAMSIN, -5), A(WREN, -3), DEC('ds_court', 'The Stilt Court kept page twelve: Mateo Ibarra is still the water\'s. He went out to the Rigs.'), NEWS('ds_court_written', 'the Stilt Court at Gull Stilts kept its page: the man who walked home is still drowned, and his boat the finder\'s', -1, 5)], options: [{ text: '(Leave the Greta.)', exit: true }] },
    m_sold: {
      text: [
        { if: ALL({ item: 'k_ds_tally' }, { knows: 'ds_tally_press' }), text: 'You put Thorne\'s day-book on the Book open at COLLECTIONS, and the deck goes still in a different way. Oona reads the entry out in the Book\'s voice: IBARRA, M. — TAKEN AT THE GUT, NIGHT — GIVEN BY J. SOUSA — FINDER\'S FEE: HIS BOAT. Paz stands up with the baby. She does not look at Mateo. She looks at Rui, and he cannot look back. Oona turns to the oldest page in the Book after page one. "A man who sells a neighbour to the press," she reads, "is put off the stilts." Nobody on the benches says anything, because there is nothing to say. Rui Sousa rows out of Gull Stilts that night in his father\'s old skiff, with nothing in it, and does not come back. Paz goes up to her loft alone with the baby. Mateo moors the Curlew under it, and waits.' },
        { text: 'You say it, and the deck goes still in a different way. Oona looks at Rui and asks him straight, and he has never lied to Oona in his life: he says it himself, to his boots, the press and the sack and the boat. Paz stands up with the baby. She does not look at Mateo. She looks at Rui, and he cannot look back. Oona turns to the oldest page in the Book after page one. "A man who sells a neighbour to the press," she reads, "is put off the stilts." Nobody on the benches says anything, because there is nothing to say. Rui Sousa rows out of Gull Stilts that night in his father\'s old skiff, with nothing in it, and does not come back. Paz goes up to her loft alone with the baby. Mateo moors the Curlew under it, and waits.' },
      ],
      interject: [{ companion: WREN, text: 'Wren watches the skiff go out past the Jesty until it is a mark on the water. "He sold a man to the barges for a boat," she says. "There\'s worse places than the sea to put him." It is the kindest thing she has said about the sea.', effects: [A(WREN, 5)] }],
      effects: [{ set: 'ds_court', value: 'sold' }, { set: 'ds_rui', value: 'put_off' }, { set: 'ds_paz', value: 'alone' }, { set: 'ds_paz_knows' }, { set: 'ds_prec_living' }, { set: 'ds_boats_owed' }, { xp: 200 }, DEC('ds_court', 'The Stilt Court heard that Rui Sousa sold Mateo Ibarra to the guild\'s press for his boat, and put him off the stilts. Paz lives alone with the baby; Mateo waits under her loft.'), NEWS('ds_court_sold', 'the Stilt Court at Gull Stilts put a man off the stilts for selling his neighbour to the guild\'s press', 3, 6)],
      options: [{ text: '(Leave the Greta.)', exit: true }],
    },

    // ---------------------------------------------------------------- the court: the false light
    light: {
      text: '"Who?"',
      again: '"Who hung it?"',
      options: [
        { id: 'ol.yewande', text: 'Yewande Coker. Since the fish died.', next: 'light_open' },
        { text: '(Not yet.)', next: 'again' },
      ],
    },
    light_open: {
      text: 'Oona does not call the court. She sends a boy down the Gut, and Yewande comes up the Greta\'s ramp in her diving jersey with her hair still wet, and Amara behind her. Oona reads from the Book before anyone says anything: the five barges on the Jesty\'s roof this season, and the eleven years before them with none. Then page four. "A false light is a life for a life," she says. "There are two lives, Yewande." Yewande says, "I know how many." The Greta is very quiet.',
      again: 'Yewande stands with her hands at her sides. Amara holds her jersey.',
      options: [
        { id: 'ol.mercy', text: 'The guild\'s line killed the fish and the guild\'s salt costs a child\'s weight. She fed the Stilts with it. Judge that too.', check: { skill: 'speech', dc: 45, mods: [{ if: FISH_BACK, dc: -5, why: 'the fish are coming back because somebody shut the line' }, { if: F('ds_claim', 'guild'), dc: -10, why: 'the court has already found the guild drowned a child' }, { if: { lead: 'l_ds_wrecks' }, dc: -5, why: 'only guild barges, only since the sheen' }, { if: { inParty: ASH }, dc: -5, why: 'Ash stands with her' }] }, next: 'light_mercy', fail: 'light_off' },
        { id: 'ol.book', text: 'Page four is page four.', next: 'light_off' },
      ],
    },
    light_mercy: {
      text: 'Oona writes, and the page is long. "The court finds Yewande Coker hung a false light and two guild men drowned of it. The court finds the guild\'s line killed the fish first." She looks up. "Two lives. The Sow, for one: the court takes her boat. Her salvage off every barge she brought down, for the other, to the drowned men\'s kin wherever the guild keeps them." Yewande closes her eyes. "And you\'ll teach off Ade Bankole\'s boat," Oona says, "because the Stilts can\'t spare your lungs, and nobody else on this shore can count."',
      effects: [{ set: 'ds_light', value: 'court' }, { set: 'ds_sow_taken' }, { set: 'ds_boats_owed' }, { rep: { faction: 'tollmen', respect: -5 } }, A(ASH, 5), A(NINE, 5), A(TAMSIN, 3), { xp: 200 }, DEC('ds_light', 'The Stilt Court judged Yewande Coker for the false light: it took her boat and her salvage for the two drowned bargemen, and kept her on the stage.'), NEWS('ds_light_court', 'the Stilt Court at Gull Stilts judged its own dive master for wrecking guild barges, and denied the guild its hanging', 3, 6)],
      options: [{ text: '(Leave the Greta.)', exit: true }],
    },
    light_off: {
      text: '"Page four." Oona writes without looking up. "The court doesn\'t hang; the Stilts never had the rope for it. Yewande Coker is put off the stilts, and her boat with her." Yewande nods once. That night the Sow goes out past the Jesty with two people in her, a woman at the oars and a girl in the bow with an unlit lamp in her lap, and the stage off the south walk belongs to Ade Bankole, who is nineteen.',
      effects: [{ set: 'ds_light', value: 'court' }, { set: 'ds_coker_off' }, { set: 'ds_boats_owed' }, { rep: { faction: 'tollmen', respect: -3 } }, A(ASH, -3), A(TAMSIN, -3), { xp: 150 }, DEC('ds_light', 'The Stilt Court put Yewande Coker off the stilts for the false light; Ade Bankole keeps the dive stage now.'), NEWS('ds_light_off', 'the Stilt Court at Gull Stilts put its dive master off the stilts for wrecking guild barges', 1, 5)],
      options: [{ text: '(Leave the Greta.)', exit: true }],
    },
  },
};

export const d_ds_lua: DialogueDef = {
  id: 'd_ds_lua', owner: 'npc_ds_02',
  start: [{ if: F('ds_claim', 'guild'), node: 'after_guild' }, { if: F('ds_claim', 'rig'), node: 'after_rig' }, { if: F('ds_lua_met'), node: 'again' }, { node: 'ebb' }],
  nodes: {
    ebb: {
      text: 'She does not look up from the net. Up close you can see it is a child, eleven or so, small for it, and that somebody has washed the black off his face and could not get it out of his hair. "Kai," she says, as if you had asked. "He went under the Gut for my net. I told him a net\'s a net." The tide goes out over his feet. "The Rig did this. The Rig and its oil. I\'ve called the court. Page nine." She looks at you, then: a stranger, off the road, with nothing to do with any of it. "The Stilts won\'t stand up. They need Hum\'s tar and they\'re scared of the guild\'s scale. Will you?"',
      again: 'Lua keeps her hands flat on the net.',
      effects: [{ set: 'ds_lua_met' }, { learn: 'ds_lua' }, { lead: 'l_ds_kai' }],
      interject: [
        { companion: ASH, text: 'Ash kneels on the step below her without being asked, so his head is lower than hers. "Water\'s a grave that doesn\'t hold still," he says. "I\'m a digger. I\'d dig him one if you\'d let me." "No," she says. "He\'s a Stilts boy. He goes out." Ash nods as if he had been told something holy.', effects: [A(ASH, 3)] },
        { companion: TAMSIN, text: 'Tamsin stands a step back with her arms wrapped round herself. She does not say anything at all, which for Tamsin is a lot.' },
      ],
      options: [
        { id: 'lua.yes', text: 'I\'ll find out what happened. Then I\'ll stand up.', effects: [{ trust: { npc: 'npc_ds_02', by: 10 } }, { set: 'ds_lua_promise' }], next: 'yes' },
        { id: 'lua.where', text: 'Where was your net?', next: 'where' },
        { id: 'lua.sea', text: 'Sometimes the sea just takes people.', effects: [{ trust: { npc: 'npc_ds_02', by: -10 } }], next: 'sea' },
        { text: '(Leave her with him.)', exit: true },
      ],
    },
    again: {
      text: [
        { if: F('ds_lua_gone'), text: 'Lua\'s loft, empty. Somebody has taken the nets down.' },
        { if: NIGHT, text: 'Lua at her loft door with a lamp, mending nothing. "Well?"' },
        { text: 'Lua at the table in her loft with a net across her knees she is not mending. "Well?"' },
      ],
      again: 'Lua waits.',
      options: [
        { id: 'lua.where2', text: 'Where was your net?', if: NOT({ seen: 'lua.where' }), next: 'where' },
        { id: 'lua.net', text: '(Show her Kai\'s net.)', if: ALL({ item: 'k_ds_net' }, NOT({ seen: 'lua.net' })), next: 'net' },
        { id: 'lua.guild', text: 'It wasn\'t the Rig. The guild opened Hum\'s line to its own tank.', if: ALL(GUILD_PROOF, SHEEN_OPEN, NOT({ seen: 'lua.guild' })), next: 'guild' },
        { id: 'lua.court', text: 'When I\'m ready, Oona will call the court.', if: SHEEN_OPEN, next: 'court' },
        bye,
      ],
    },
    yes: { text: 'She nods, once. "Then find his net. He was under the Gut, third pile from the Greta, where the old pipe goes. Everybody says don\'t swim there. Everybody swims there." She goes back to his face.', again: '"Third pile from the Greta. Find his net."', effects: [{ learn: 'ds_net_place' }], options: [{ text: '(Leave her with him.)', exit: true }] },
    where: { text: '"Under the Gut. Third pile from the Greta, where the old pipe runs along the bottom to Blackcap. It snagged on something and he went down for it, because he\'s eleven and it was his first net that was a net." She is quiet. "The water there\'s been black since the thaw. You can\'t see your hand. He couldn\'t see his."', again: '"Third pile from the Greta. Black since the thaw."', effects: [{ learn: 'ds_net_place' }, { learn: 'ds_old_line' }], options: [{ text: 'Something else.', next: 'again' }, { text: '(Leave her.)', exit: true }] },
    sea: { text: '"Don\'t." Not loud. "Don\'t say the sea to me. The sea\'s been taking people off this shore for sixty years and it never once came back black."', again: '"Don\'t say the sea to me."', options: [{ text: '(Leave her.)', exit: true }] },
    net: { text: 'She takes it and holds it and does not cry, which you would have preferred. Her thumb finds the brass collar knotted in the mesh. "Joint fourteen," she reads. "That\'s the old line." She gives it back. "Keep it. The court will want to hold it. I already have."', again: '"Keep it. The court will want it."', effects: [{ trust: { npc: 'npc_ds_02', by: 15 } }], options: [{ text: 'Something else.', next: 'again' }] },
    guild: { text: 'She takes it in slowly. "The guild." She looks out at the tide post at the Greta\'s stern, where Thorne is weighing fish. "Then it\'s the guild\'s boat I want." A pause. "Or it\'s the guild\'s boat I\'ll burn. I haven\'t decided which."', again: '"The guild\'s boat. One way or another."', effects: [{ learn: 'ds_lua_knows_guild' }], options: [{ text: 'Something else.', next: 'again' }] },
    court: { text: '"Then be ready." She goes back to the net on her knees.', again: '"Be ready."', options: [{ text: 'Something else.', next: 'again' }, { text: '(Leave her.)', exit: true }] },
    after_guild: { text: [{ if: F('ds_barge', 'burned'), text: 'Lua at her loft door with a net across her knees. "Oona wrote the guild\'s barge down as his boat," she says. "The one that burned at Blackcap." She looks at you a long moment. "I saw the smoke from here. I thought it was the tank." She does not ask. She goes back to the net.' }, { if: F('ds_barge', 'pyre'), text: 'Lua at her loft door. She has started a new net, small, green, the kind a child is given to learn on, and is not hiding it. "Kai\'s boat went out a long way," she says. "Longer than any of ours would."' }, { text: 'Lua at her loft door with a net across her knees, mending it. "They paid," she says. "Oona wrote that they paid. Not what." She bites the twine. "That\'s right. It\'s right."' }], again: 'Lua mends.', options: [{ id: 'lua.ag.thanks', text: 'How are you?', once: true, effects: [{ trust: { npc: 'npc_ds_02', by: 5 } }], next: 'after_how' }, bye] },
    after_how: { text: '"Breathing." She holds the net up to the light. "My mother said when the water takes one of yours you make something with your hands for a month or you go in after them." She almost smiles. "Twenty-nine days."', again: '"Breathing. Twenty-nine days."', options: [bye] },
    after_rig: { text: 'Lua at her loft door. "The Stilts\' boats went out to Hum," she says. "Kai\'s Rig." She looks at you as if you had given her something. "Thank you." You have never been thanked for anything worse.', again: 'Lua nods to you.', options: [bye] },
  },
};

export const d_ds_yewande: DialogueDef = {
  id: 'd_ds_yewande', owner: 'npc_ds_03',
  start: [{ if: F('ds_light', 'framed'), node: 'framed' }, { if: F('ds_yewande_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman on the stage with one hand on the air hose and her lips moving. "Thirty-eight. Thirty-nine. Forty." She tugs the line twice, and a long way down something tugs back, and she lets her breath out as if it were hers. "Yewande. Coker\'s stage." She looks you over: lungs, shoulders, hands. "You dive? I take people down to Ellery at slack water. Six for the roofs, eight for the high street, and you keep what you bring up, and I keep you alive. That\'s the whole bargain."',
      again: 'Yewande counts under her breath, one eye on the line.',
      effects: [{ set: 'ds_yewande_met' }, { learn: 'ds_dives_offered' }, { quest: 'q_ds_dives', start: true }],
      interject: [{ companion: WREN, text: '"Can\'t read water," Wren says, looking down at the green. "Doesn\'t keep tracks." Yewande does not look up. "It keeps every track, girl. It just keeps them at the bottom."' }],
      options: [
        { id: 'yew.ellery', text: 'Ellery?', next: 'ellery' },
        { id: 'yew.kai', text: 'Kai Tanoa.', next: 'kai' },
        { id: 'yew.bag', text: 'Do you sell diving gear?', next: 'bag' },
        bye,
      ],
    },
    again: {
      text: [
        { if: ADE_RUNS, text: 'Yewande is not here.' },
        { if: F('ds_light', 'court'), text: 'Yewande on Ade\'s boat, teaching him to read a line by its shiver. She nods at you, and it costs her something, and she pays it.' },
        { if: NIGHT, text: 'Yewande on the stage at night, with the hose coiled and her eyes on the fog coming in over the Jesty.' },
        { text: 'Yewande on the stage, one hand on the hose. "Slack at the turn. You going down?"' },
      ],
      again: 'Yewande counts under her breath.',
      options: [
        { id: 'yew.ellery2', text: 'Ellery?', if: NOT({ seen: 'yew.ellery' }), next: 'ellery' },
        { id: 'yew.kai2', text: 'Kai Tanoa.', if: NOT({ seen: 'yew.kai' }), next: 'kai' },
        { id: 'yew.trade', text: 'Let me see what you\'ve got.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'yew.light', text: 'You put out Lean\'s light, and hung your own on the Jesty.', if: ALL(ANY({ concluded: 'c_ds_false_light' }, ALL({ item: 'k_ds_salt' }, { knows: 'ds_amara_burns' })), NOT(KNOWS_WRECKER), LIGHT_OPEN), next: 'light' },
        { id: 'yew.stop', text: 'Stop it. Nobody needs to know.', if: ALL(KNOWS_WRECKER, LIGHT_OPEN), check: { skill: 'speech', dc: 50, mods: [{ if: FISH_BACK, dc: -20, why: 'the fish are coming back' }, { if: { knows: 'ds_amara_burns' }, dc: -5, why: 'Amara\'s fingers' }, { if: { inParty: TAMSIN }, dc: -5, why: 'Tamsin asks her for the girl' }] }, effects: [{ set: 'ds_light', value: 'stopped' }, A(TAMSIN, 5), A(ASH, 3), { xp: 150 }, DEC('ds_light', 'Yewande Coker put the false light away for good, and nobody but you knows she ever hung it.')], next: 'stopped', fail: 'not_stopping' },
        bye,
      ],
    },
    ellery: { text: '"The town. Port Ellery, before." She points down with her chin. "That\'s the Strand under the Gut, that\'s the high street under Low Row, that\'s the Majestic, the Jesty, where you see the roof. Shops, flats, a clinic, a bank with its door open and nothing in it. Ninety years in the dark and she still gives, if you ask her nicely and come up when I pull." She tugs the line again. "Most people don\'t come up when I pull."', again: '"Ellery. She gives, if you come up when I pull."', effects: [{ learn: 'ds_ellery' }], options: [{ text: 'Something else.', next: 'again' }] },
    kai: { text: 'The counting stops. "I didn\'t take him down. I don\'t take children down. I never have." She looks at the water. "He went on his own, under the Gut, in black water, for a net. I was on this stage. I heard them shouting." The hose shivers in her hand and she starts counting again, from one.', again: 'Yewande counts from one.', options: [{ text: 'Something else.', next: 'again' }] },
    bag: { text: '"One. A bag: a rebreather off a dead man at the bank\'s door, glued more times than it\'s been filled. A hundred and twenty, and you don\'t pay me for the hose again." She shrugs. "It makes you cleverer than you are down there, which kills more people than it saves. Your choice."', again: '"One bag. A hundred and twenty."', options: [{ id: 'yew.bag.trade', text: 'Show me.', effects: [{ event: 'barter' }], exit: true, repeat: true }, { text: 'Something else.', next: 'again' }] },
    light: {
      text: 'She does not stop counting, which is how you know. She gets to forty and pulls the line twice and the diver comes up, and she helps him onto the stage and sends him to the smokehouse with a word. Then: "Since the thaw." Very quiet. "The fish went black, and the guild\'s salt went up, and the twine, and a child in Low Row died of the cough because the post\'s medicine was eleven Tolls a bottle. So in the fog I put Lean\'s light out, and I hang ours on the Jesty, and the guild\'s barges steer for it like they\'re coming home." She looks at the broken barge on the roof. "Five. Five barges of salt and twine and medicine, and Gull Stilts has eaten this season. And this time two men drowned." She says the number like a diver. "Two."',
      again: '"Two," she says again.',
      effects: [{ learn: 'ds_coker_wrecker' }, { set: 'ds_light_turn' }],
      interject: [
        { companion: ASH, text: 'Ash is quiet for a long time. "You fed them," he says. "And two men are in the water for it, with families somewhere upriver that don\'t know yet." "I know," she says. "I can count."' },
        { companion: ILYA, text: '"Right," Ilya says. Just that, as if he were agreeing with the fog.' },
      ],
      options: [
        { id: 'yew.l.amara', text: 'And Amara carries the lamp.', next: 'light_amara' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    light_amara: { text: '"She rows. I hang it." Too fast. Then slower, because she is an honest woman who has decided to lie and cannot keep it up: "She rows it out. I can\'t row and count the fog at once." She looks at you properly. "If the guild comes for it, it comes for me. Whatever you do with it, it comes for me."', again: '"It comes for me. Not her."', options: [{ text: 'Something else.', next: 'again' }] },
    stopped: { text: 'She looks at the water for a long time. "All right." She unhooks a lamp from under the stage, an old ship\'s lamp with its glass blacked on one side, and drops it off the edge. It goes down slowly, turning, until the green takes it. "All right," she says again, to Ellery.', again: 'Yewande watches the place where the lamp went down.', options: [bye] },
    not_stopping: { text: '"Not while the water\'s black." She does not raise her voice. "You want it to stop, shut the line that\'s killing the fish. Then come and ask me again."', again: '"Shut the line. Then ask me again."', options: [{ text: 'Something else.', next: 'again' }] },
    framed: { text: 'Yewande on the stage. She does not look at you. She has not looked at you since the morning Ewan Tulloch hung from the tide post, and she is not going to start. When you speak, she counts over you, out loud, until you stop.', options: [{ text: '(Leave her.)', exit: true }] },
  },
};

export const d_ds_thorne: DialogueDef = {
  id: 'd_ds_thorne', owner: 'npc_ds_04',
  start: [{ if: F('ds_thorne_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in the shore\'s one good coat, writing in a day-book behind a counter in a steel container, with a scale beside him whose brass has been polished so long it has gone soft at the edges. "Cyprian Thorne. The tide post." He finishes his line before he looks up, and when he does he is pleasant. "Fish bought by the weight, salt sold by the measure, medicine at the guild\'s price, which is the only price on the shore. The scale is honest. Check it, if you like. Everyone does once."',
      again: 'Thorne finishes his line before he looks up.',
      effects: [{ set: 'ds_thorne_met' }],
      interject: [{ companion: ODILE, text: '"Cyprian." Odile says it the way you say the name of a dish you once sent back. He sets his pen down. "Marchetti. The floor misses you." "The floor misses my commission," she says. They smile at each other like two knives in a drawer.' }],
      options: [
        { id: 'th.trade', text: 'Let me see your prices.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'th.sheen', text: 'What do you make of the oil on the water?', next: 'sheen' },
        { id: 'th.anchorage', text: 'You pay the court anchorage.', next: 'anchorage' },
        bye,
      ],
    },
    again: {
      text: [
        { if: F('ds_claim', 'guild'), text: 'Thorne behind the counter, writing, his scale polished. He looks up and is pleasant, and it costs him more than it used to. "The guild bears no grudge. The guild keeps a book."' },
        { if: F('ds_claim', 'sea'), text: 'Thorne behind the counter, writing. "A sad business," he says, without looking up. "The sea is a hard neighbour."' },
        { text: 'Thorne finishes his line. "Yes?"' },
      ],
      again: 'Thorne waits, pen raised.',
      options: [
        { id: 'th.trade2', text: 'Let me see your prices.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'th.sheen2', text: 'What do you make of the oil on the water?', if: NOT({ seen: 'th.sheen' }), next: 'sheen' },
        { id: 'th.anchorage2', text: 'You pay the court anchorage.', if: NOT({ seen: 'th.anchorage' }), next: 'anchorage' },
        { id: 'th.know', text: 'I know what\'s in your barge at Blackcap, and whose oil it is.', if: ALL(GUILD_PROOF, SHEEN_OPEN, NOT(F('ds_thorne_offer'))), next: 'offer' },
        { id: 'th.press', text: 'You sold Mateo Ibarra to the press, on Rui Sousa\'s word.', if: ALL({ knows: 'ds_tally_press' }, NOT({ seen: 'th.press' })), next: 'press' },
        { id: 'th.bounty', text: 'Your notice. The wreckers.', if: ALL({ knows: 'ds_bounty' }, LIGHT_OPEN, NOT({ seen: 'th.bounty' })), next: 'bounty' },
        { id: 'th.name.yew', text: 'Your wrecker is Yewande Coker, the dive master.', if: ALL(KNOWS_WRECKER, LIGHT_OPEN), next: 'name_yewande' },
        { id: 'th.name.ewan', text: 'Your wrecker is Ewan Tulloch. Lean\'s lamp-keeper. His light was dark that night.', if: ALL(KNOWS_WRECKERS, { lead: 'l_ds_lamp_cut' }, LIGHT_OPEN), next: 'name_ewan' },
        bye,
      ],
    },
    sheen: { text: '"The Rigs." He says it with real regret, like a doctor. "Hum is ninety years old, and so are its pipes. The guild has said to Mr Farouk, more than once, that a line kept open past its life is a liability. He keeps it open; the guild buys what he sells." He makes a small note. "It would be a mercy, frankly, if somebody shut it. Mr Farouk will not."', again: '"Hum\'s pipes are ninety years old."', effects: [{ learn: 'ds_thorne_blames_hum' }], options: [{ text: 'Something else.', next: 'again' }] },
    anchorage: { text: '"For the mooring, yes. A courtesy." He turns the day-book so you can see the figure, because he is a man who wants you to know he has nothing to hide, and the figure is large. "The court\'s widows eat on it. The guild is glad to be a neighbour." He turns the book back. "Nobody has to be unreasonable."', again: '"A courtesy. The widows eat on it."', effects: [{ learn: 'ds_anchorage' }], options: [{ text: 'Something else.', next: 'again' }] },
    offer: {
      text: [{ if: F('rc_line', 'guild'), text: 'He caps his pen. For the first time he looks at you as if you were a column rather than a customer. "The guild holds the Line from Meridian to the Skirts now, end to end, and the Line runs on Hum\'s oil. You will understand that this is not a small matter." He lets that sit. "You also know that the guild\'s post is the only buyer of fish on this shore, and the only seller of salt and twine and medicine, and half the widows\' bread. If the court hangs a barge on the guild, the guild will not be unreasonable. It will simply go." He takes a purse out of a drawer and sets it on the scale, where the needle moves. "A hundred and fifty. For a widow\'s grief to find the sea, which is where grief on this shore usually goes."' }, { text: 'He caps his pen. For the first time he looks at you as if you were a column rather than a customer. "Then you also know," he says pleasantly, "that the guild\'s post is the only buyer of fish on this shore, and the only seller of salt and twine and medicine, and half the widows\' bread. If the court hangs a barge on the guild, the guild will not be unreasonable. It will simply go." He takes a purse out of a drawer and sets it on the scale, where the needle moves. "A hundred and fifty. For a widow\'s grief to find the sea, which is where grief on this shore usually goes. Nobody has to decide anything at once."' }],
      again: 'The purse sits on the scale. The needle has not moved back.',
      effects: [{ set: 'ds_thorne_offer' }],
      interject: [{ companion: WREN, text: 'Wren looks at the purse and then at him. "Man\'s weighing a boy," she says. "On a scale. In front of me." She does not say anything else, and does not need to.' }],
      options: [
        { id: 'th.take', text: '(Take the purse.)', effects: [{ give: 'tolls', count: 150 }, { set: 'ds_thorne_paid' }, { rep: { faction: 'tollmen', respect: 10 } }, A(WREN, -10), A(TAMSIN, -10), A(ASH, -10), A(KES, -10), DEC('ds_thorne_paid', 'You took Factor Thorne\'s hundred and fifty to let Kai Tanoa\'s death find the sea.')], next: 'taken' },
        { id: 'th.refuse', text: 'Keep it. The court will hear what the water knows.', effects: [A(WREN, 3), A(TAMSIN, 3)], next: 'refused' },
      ],
    },
    taken: { text: 'He makes a note. "The guild remembers its friends," he says, and means it as a kindness, which is the worst of it.', again: '"The guild remembers its friends."', options: [{ text: 'Something else.', next: 'again' }, bye] },
    refused: { text: 'He puts the purse back in the drawer without any change in his face. "Then the court will hear it," he says, "and the guild will listen. I hope the widows like fish."', again: '"I hope the widows like fish."', options: [{ text: 'Something else.', next: 'again' }, bye] },
    press: { text: '"The guild bought a debt." Not offended; correcting. "Three hundred Tolls of salt and twine on credit, and a debtor who would not pay and could not. The guild does not sell people, whatever they say in the Sink. It collects them." He writes a line. "Mr Sousa was helpful. The guild pays for help. A boat is a fair fee for a boat\'s worth of help."', again: '"The guild collects. It does not sell."', interject: [{ companion: WREN, text: 'Wren\'s burned hand closes. "Collects," she says. "That\'s the word they use at the block too."', effects: [A(WREN, 2)] }], options: [{ text: 'Something else.', next: 'again' }] },
    bounty: { text: '"A false light on the Jesty in the fog, where no lamp should be, and Lean\'s light out the same night. The guild\'s salt barge steered for it and broke her back. Two of the guild\'s men drowned." He does not look at the barge on the roof; he has looked at it enough. "The Stilts call what the water wrecks salvage. The guild calls it theft, and the men murder. A hundred for a name the guild can hang."', again: '"A hundred for a name the guild can hang."', options: [{ text: 'Something else.', next: 'again' }] },
    name_yewande: {
      text: 'He writes the name down. "The dive master." He is not surprised; he is never surprised. "Thank you. The guild will want her at the post at dawn." A purse, on the scale: a hundred. "If there is a girl," he says, as if mentioning the weather, "the guild is not interested in girls. Mrs Coker will see to that herself, I expect."',
      again: 'The purse on the scale.',
      options: [{ id: 'th.yew.take', text: '(Take the hundred.)', effects: [{ give: 'tolls', count: 100 }, { set: 'ds_light', value: 'exposed' }, { rep: { faction: 'tollmen', respect: 10 } }, A(TAMSIN, -10), A(ASH, -10), A(KES, -10), A(WREN, -5), DEC('ds_light', 'You gave Yewande Coker to the guild for the false light.'), NEWS('ds_light_exposed', 'a stranger gave Gull Stilts\' dive master to the guild for wrecking its barges', -10, 7)], next: 'taken_yew' }],
    },
    taken_yew: { text: '"Dawn," he says. "The guild is grateful."', again: '"Dawn."', options: [bye] },
    name_ewan: {
      text: 'He writes it down. "The lamp-keeper." He considers the name the way he considers fish. "A drunk, whose light was dark the night the barge struck. That will satisfy the guild\'s men." He looks up. "Whether it satisfies anyone else is not the guild\'s concern." A purse, on the scale: a hundred.',
      again: 'The purse on the scale.',
      options: [{ id: 'th.ewan.take', text: '(Take the hundred.)', effects: [{ give: 'tolls', count: 100 }, { set: 'ds_light', value: 'framed' }, { rep: { faction: 'tollmen', respect: 5 } }, A(TAMSIN, -20), A(ASH, -20), A(WREN, -15), A(KES, -15), A(ILYA, -10), A(NINE, -10), A(ODILE, -10), DEC('ds_light', 'You gave the guild Ewan Tulloch, Lean\'s lamp-keeper, for the false light he did not hang.'), NEWS('ds_light_framed', 'the guild took the Rigs\' old lamp-keeper for the wrecks on the Jesty', -4, 5)], next: 'taken_ewan' }],
    },
    taken_ewan: { text: '"Dawn," he says, and blots the line.', again: '"Dawn."', options: [bye] },
  },
};

export const d_ds_mateo: DialogueDef = {
  id: 'd_ds_mateo', owner: 'npc_ds_05',
  start: [{ if: F('ds_court', 'written'), node: 'rig' }, { if: ANY(F('ds_court', 'living'), F('ds_court', 'sold')), node: 'curlew' }, { if: F('ds_mateo_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man sitting on a crate at the Landing with his back to the village, too thin for his frame, with a beard he has not had long enough to know what to do with. "You\'re not from the Stilts." He seems glad of it. "Nobody from the Stilts will look at me. I\'m in the Book." He laughs, once, at nothing. "Mateo Ibarra. Taken by the water, two years back. Ask the old woman; she wrote it. My boat\'s the Curlew. My wife\'s Paz." He looks along the Gut toward the Netlofts. "I hear the Curlew\'s Rui Sousa\'s now. I hear Paz is too."',
      again: 'Mateo looks along the Gut toward the Netlofts.',
      effects: [{ set: 'ds_mateo_met' }, { learn: 'ds_mateo' }],
      passives: [{ skill: 'medicine', dc: 35, text: 'Under his cuff, on the inside of the left wrist: a brand, healed two years, the colour of a burn. Letters and a number.', effects: [{ learn: 'ds_brand_seen' }] }],
      interject: [{ companion: ILYA, text: 'Ilya looks at the man\'s hands, which are a labourer\'s hands now and were a fisherman\'s once. "Two years," he says. "On a winch. Right." Mateo looks at him. "How\'d you know?" "Counted," Ilya says.' }],
      options: [
        { id: 'mat.where', text: 'Where have you been?', next: 'where' },
        { id: 'mat.want', text: 'What do you want?', next: 'want' },
        bye,
      ],
    },
    again: {
      text: [{ if: NIGHT, text: 'Mateo on his crate at the Landing in the dark, not sleeping.' }, { text: 'Mateo on his crate. "Well?"' }],
      again: 'Mateo waits.',
      options: [
        { id: 'mat.where2', text: 'Where have you been?', if: NOT({ seen: 'mat.where' }), next: 'where' },
        { id: 'mat.want2', text: 'What do you want?', if: NOT({ seen: 'mat.want' }), next: 'want' },
        { id: 'mat.brand', text: 'That\'s a Ninebridge block brand on your wrist.', if: ALL({ knows: 'ds_brand_seen' }, NOT({ knows: 'ds_brand' })), next: 'brand' },
        { id: 'mat.court', text: 'Stand up on the Greta and ask the court. I\'ll stand up with you.', if: NOT(F('ds_mateo_heard')), effects: [{ set: 'ds_mateo_heard' }, { trust: { npc: 'npc_ds_05', by: 15 } }], next: 'court' },
        { id: 'mat.quiet', text: 'Take a boat and go up the delta. Leave her be. Mele\'s old skiff, eighty Tolls; I\'ll pay.', if: ALL(TOLLS(80), NOT(F('ds_court'))), effects: [{ take: 'tolls', count: 80 }, { set: 'ds_court', value: 'quiet' }, { set: 'ds_mateo_gone' }, A(TAMSIN, -5), A(NINE, -3), { xp: 100 }, DEC('ds_court', 'You paid for Mateo Ibarra to row up the delta and leave Paz be. She never knew what Rui did.'), NEWS('ds_court_quiet', 'the man the Stilts\' Book had drowned rowed up the delta again in a bought skiff', 0, 3)], next: 'quiet' },
        bye,
      ],
    },
    where: {
      text: '"On the water." He means to leave it there, and does not. "On the guild\'s barges, upriver. Two years on a winch at Low Landing for three hundred Tolls I owed the post for salt and twine, the winter the mackerel didn\'t come. They took me off the Gut at night, two of them, with a sack, and they knew where I slept." He turns his left wrist up and pushes the cuff back. N-B 4471. "Lot four thousand four hundred and seventy-one at the Ninebridge block. Bought by the guild\'s own barges, from the guild\'s own block, for the guild\'s own debt." He pulls the cuff down. "I walked off at Low Landing when the paper ran out. Nobody told me I\'d drowned."',
      again: '"On the guild\'s barges. Two years."',
      effects: [{ learn: 'ds_mateo_where' }, { learn: 'ds_brand' }, { lead: 'l_ds_brand' }],
      interject: [{ companion: WREN, text: 'Wren has gone still in the particular way she goes still. "Lot four thousand," she says. "They had the girl at four hundred and something." She does not say whose girl.', effects: [A(WREN, 2)] }],
      options: [
        { id: 'mat.who', text: 'Who told them where you slept?', next: 'who' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    who: { text: '"I don\'t know." He has thought about nothing else for two years, and it shows. "Somebody on the Stilts. Everybody on the Stilts knew where I slept. I slept on the Curlew." He looks at the Netlofts again.', again: '"Somebody on the Stilts."', options: [{ text: 'Something else.', next: 'again' }] },
    brand: { text: 'He pushes the cuff back and shows you properly. "N-B 4471. You know the block." He covers it. "Don\'t tell the Stilts. No. Tell them. Tell them all."', again: '"N-B 4471."', effects: [{ learn: 'ds_brand' }, { lead: 'l_ds_brand' }], options: [{ text: 'Something else.', next: 'again' }] },
    want: { text: '"My boat." No pause. Then a long one. "And my wife. If she wants me. I don\'t know which of those I can ask the court for. The Book says a drowned man\'s got no claim to either." He picks at a splinter on the crate. "I didn\'t drown. I keep saying it. It doesn\'t get any truer."', again: '"My boat. My wife, if she wants me."', effects: [{ learn: 'ds_mateo_wants' }], options: [{ text: 'Something else.', next: 'again' }] },
    court: { text: '"On the Greta." He breathes out. "In front of all of them. In front of her." He stands up, and is taller than you thought. "All right. Tell the old woman. I\'ll be here."', again: '"Tell the old woman. I\'ll be here."', options: [bye] },
    quiet: { text: 'He looks at the purse for a long time. "She\'d never know," he says. "Would she." It is not a question. In the morning Mele\'s old skiff is gone from the Landing, and so is Mateo Ibarra, up the delta on the flood, and the Book still says what it said.', options: [{ text: '(Leave it.)', exit: true }] },
    rig: { text: 'Mateo on Hum\'s deck in a crew jersey, carrying a drum of tar he does not need both arms for. "They take anyone who can carry," he says. "I can carry." He looks east, where the Stilts are a line of posts on the water. "You can see the Curlew from the flare stack. If you know where to look."', again: 'Mateo shifts the drum.', options: [bye] },
    curlew: { text: [{ if: F('ds_paz', 'rui'), text: 'Mateo in the Curlew at the finger jetty, mending a net with his back to the Netlofts. "She\'s got a child," he says, before you can say anything. "Two years is a long time to be drowned." He bites the twine. "The Curlew still pulls left. Rui never fixed it."' }, { text: 'Mateo in the Curlew under Paz\'s loft, mending a net. He does not look up at the loft. He has not looked up at it all day, which means he has looked at nothing else. "She says good morning," he says. "Yesterday she didn\'t."' }], again: 'Mateo mends.', options: [bye] },
  },
};

export const d_ds_paz: DialogueDef = {
  id: 'd_ds_paz', owner: 'npc_ds_06',
  start: [{ if: F('ds_paz_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: F('ds_mateo_here'), text: 'A woman at a loft door with a baby on her hip, who knows exactly who you have been talking to. "You were at the Landing." Low, so the baby does not wake. "He\'s thin." It is the first thing she says about him and you can see she hates herself for it. "Paz. I said the words for him at the Ebb Steps over his coat. I meant them. I didn\'t have anything else to say them over."' },
        { text: 'A woman at a loft door with a baby on her hip, mending a net one-handed. "Paz. Talk quiet or go; she\'s only just down."' },
      ],
      again: 'Paz shifts the baby to her other hip.',
      effects: [{ set: 'ds_paz_met' }],
      options: [
        { id: 'paz.rui', text: 'Rui found the Curlew?', next: 'rui' },
        { id: 'paz.want', text: 'What do you want?', if: F('ds_mateo_here'), next: 'want' },
        bye,
      ],
    },
    again: {
      text: [{ if: F('ds_paz', 'alone'), text: 'Paz at the loft door with the baby. Below her, in the Curlew, a man mending a net looks up and then down. "Morning," she says to him. Then, to you: "Well?"' }, { text: 'Paz at the loft door with the baby. "Well?"' }],
      again: 'Paz waits.',
      options: [
        { id: 'paz.rui2', text: 'Rui found the Curlew?', if: NOT({ seen: 'paz.rui' }), next: 'rui' },
        { id: 'paz.want2', text: 'What do you want?', if: ALL(F('ds_mateo_here'), NOT({ seen: 'paz.want' }), NOT(F('ds_court'))), next: 'want' },
        { id: 'paz.tell', text: 'Rui told the guild\'s press where Mateo slept. The Curlew was his fee.', if: ALL(ANY({ knows: 'ds_tally_press' }, F('ds_rui_confessed'), { concluded: 'c_ds_sold' }), NOT(F('ds_paz_knows')), NOT(F('ds_court'))), effects: [{ set: 'ds_paz_knows' }, A(TAMSIN, 3)], next: 'told' },
        bye,
      ],
    },
    rui: { text: '"At dawn, off the Jesty, a week after. Adrift, with his coat in the bow." She says it like a thing she has said many times to herself. "Page twelve: a boat found on the water is the finder\'s. Rui brought me the coat. He brought me fish all that winter. He didn\'t ask for anything. Then he asked." She looks at the baby. "I said yes. I\'d say it again. I think."', again: '"He brought me the coat. He brought me fish."', effects: [{ learn: 'ds_paz_story' }], options: [{ text: 'Something else.', next: 'again' }] },
    want: { text: 'She laughs, very quietly, so as not to wake the baby. "Nobody\'s asked me that. Oona asked who found the boat. The guild asked who\'d pay the debt. Rui asked if I\'d have him." She looks down the Gut toward the Landing. "I want it to have been the sea," she says. "That\'s what I want. I can live with the sea."', again: '"I want it to have been the sea."', interject: [{ companion: TAMSIN, text: 'Tamsin is looking at the baby. "Nobody asked her," she says to you, afterwards, on the Gut. "Everybody\'s going to decide what she is, and nobody asked her."' }], options: [{ text: 'Something else.', next: 'again' }] },
    told: { text: 'She does not say anything for a long time. The baby wakes and she rocks it without looking at it. "Get off my loft," she says at last, and it is not to you; she is looking past you, at the net store, where Rui keeps his gear. Then it is to you. "Get off my loft." She goes in and shuts the door, and you hear her not crying through it.', options: [{ text: '(Go.)', exit: true }] },
  },
};

export const d_ds_rui: DialogueDef = {
  id: 'd_ds_rui', owner: 'npc_ds_07',
  start: [{ if: F('ds_rui_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man in the Curlew, or by her, coiling a line with hands that know it. "Rui." He does not offer anything else. "If it\'s about the Landing, I found her adrift. Found is found. Page twelve." He goes on coiling. "Good boat, the Curlew. Pulls left."',
      again: 'Rui coils the line.',
      effects: [{ set: 'ds_rui_met' }],
      options: [
        { id: 'jq.found', text: 'Where did you find her?', next: 'found' },
        bye,
      ],
    },
    again: {
      text: 'Rui coils a line that is already coiled. "What."',
      again: 'Rui waits, the coil in his fist.',
      options: [
        { id: 'jq.found2', text: 'Where did you find her?', if: NOT({ seen: 'jq.found' }), next: 'found' },
        {
          id: 'jq.press', text: 'You told the guild\'s press where Mateo slept.', if: ALL(F('ds_mateo_here'), NOT(F('ds_rui_confessed')), NOT(F('ds_court'))),
          check: { skill: 'speech', dc: 55, mods: [{ if: { knows: 'ds_tally_press' }, dc: -20, why: 'his name is in the guild\'s own tally' }, { if: { lead: 'l_ds_curlew_adrift' }, dc: -5, why: 'the oars were shipped and lashed' }, { if: { inParty: WREN }, dc: -5, why: 'Wren knows the block' }] },
          effects: [{ set: 'ds_rui_confessed' }, { learn: 'ds_rui_sold' }], next: 'confess', fail: 'deny',
        },
        bye,
      ],
    },
    found: { text: '"Off the Jesty. Dawn. A week after he went." He stops coiling. "His coat in her bow. Oars in." He starts again. "Mele found her first. I got a line on her first. That\'s finding."', again: '"Off the Jesty. Dawn."', options: [{ text: 'Something else.', next: 'again' }] },
    deny: { text: '"Get off my boat." He does not get up. "Mateo owed. Everybody knew he owed. The guild collects. I found a boat." His hands have stopped. "Get off my boat."', again: '"Get off my boat."', options: [{ text: '(Go.)', exit: true }] },
    confess: {
      text: 'The coil goes down in the bottom of the boat. He looks at it, not at you. "He owed three hundred. The factor said the guild would have it out of him or out of her. Out of her." His jaw works. "He said if I said where Mateo slept they\'d take him and not her, and the debt would go in the water with him, page whatever, and the guild would write me a boat for my trouble." He looks up at the Netlofts. "I\'d have married her anyway. I\'d have—" He stops. "I wanted the boat too. I always wanted his boat."',
      again: 'Rui looks at the coil in the bottom of the boat.',
      options: [
        { id: 'jq.court', text: 'Say it on the Greta.', next: 'court' },
        { id: 'jq.quiet', text: 'Then she never needs to know.', next: 'quiet' },
      ],
    },
    court: { text: '"On the Greta." He laughs, and it is not a laugh. "Page whatever: put off the stilts." He picks up the coil again. "If the old woman asks me straight, I won\'t lie to her. I never lied to Oona in my life. I\'d rather the sea."', again: '"If she asks me straight, I won\'t lie."', options: [bye] },
    quiet: { text: 'He nods, slowly, and you can see him decide to believe that you mean it. "She never needs to know," he repeats, as if that were a thing a person could keep in a boat.', again: '"She never needs to know."', options: [bye] },
  },
};

/** The tide boat's rides, from Mele and from the boat itself. */
const RIDES: OptionDef[] = [
  { id: 'ride.rigs', text: 'Out to the Rigs. (4 Tolls)', if: TOLLS(4), effects: [{ take: 'tolls', count: 4 }, { learn: 'loc_rigs' }, { event: 'goto', data: { location: 'ds_rigs', spawn: 'landing', minutes: 90 } }], exit: true, repeat: true },
  { id: 'ride.blackcap', text: 'Blackcap. (2 Tolls)', if: ALL(TOLLS(2), ANY({ knows: 'loc_lm_shore_01' }, { knows: 'ds_old_line' })), effects: [{ take: 'tolls', count: 2 }, { learn: 'loc_lm_shore_01' }, { event: 'goto', data: { location: 'ds_terminal', spawn: 'jetty', minutes: 40 } }], exit: true, repeat: true },
];

export const d_ds_mele: DialogueDef = {
  id: 'd_ds_mele', owner: 'npc_ds_08',
  start: [{ if: F('ds_mele_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman at the tiller of a flat delta boat with an outboard that runs on Hum\'s rig diesel and a mast for when it does not. She looks at the water before she looks at you, the way some people look at a sky. "Mele. The tide boat. Up the delta to the city at six every morning and back on the evening flood; out to the Rigs when there\'s a fare; Blackcap if you\'ve a reason, and I\'ll not ask it." She spits over the side, downwind. "Water keeps every track. You have to know how it writes."',
      again: 'Mele watches the water.',
      effects: [{ set: 'ds_mele_met' }, { learn: 'ds_tide_boat' }],
      interject: [{ companion: WREN, text: '"Every track?" Wren says, interested despite herself. Mele points at a line of foam going out across the bay at an angle to the wind. "That\'s the old line under the bottom. Warm. Oil\'s warm." Wren looks at it for a long time.', effects: [A(WREN, 2)] }],
      options: [
        ...RIDES,
        { id: 'mo.night', text: 'Who goes out at night?', next: 'night' },
        bye,
      ],
    },
    again: {
      text: [{ if: NIGHT, text: 'Mele\'s boat tied up for the night, and Mele asleep in the bottom of it under a tarp. She opens one eye. "Morning," she says, and shuts it.' }, { text: 'Mele at the tiller. "Where to?"' }],
      again: 'Mele waits at the tiller.',
      options: [
        ...RIDES.map((o) => ({ ...o, id: `${o.id}2`, if: ALL(o.if!, DAY) })),
        { id: 'mo.night2', text: 'Who goes out at night?', if: NOT({ seen: 'mo.night' }), next: 'night' },
        { id: 'mo.curlew', text: 'You found the Curlew adrift, two years back.', if: ALL({ quest: 'q_ds_court' }, NOT({ seen: 'mo.curlew' })), next: 'curlew' },
        bye,
      ],
    },
    night: { text: '"Nobody with an honest face." She considers. "The guild\'s barge, three nights in four, out to Blackcap with no lamps and back before light, low in the water. Coker\'s girl rows when there\'s fog." She looks at you. "You didn\'t hear the second thing from me."', again: '"The guild\'s barge. No lamps. You didn\'t hear the rest."', effects: [{ lead: 'l_ds_barge' }, { learn: 'ds_amara_rows' }], options: [{ text: 'Something else.', next: 'again' }] },
    curlew: { text: '"Off the Jesty at dawn, a week after he went." She does not have to think about it. "Oars shipped and lashed, neat as you like, his coat folded in the bow. A drowning man doesn\'t ship his oars. A drowning man doesn\'t fold his coat." She looks along the Gut at the Netlofts. "I said so to the Book. Oona wrote it. Then Rui put a line on her and towed her in, and the Book said what it says."', again: '"Oars shipped. Coat folded. I said so to the Book."', effects: [{ lead: 'l_ds_curlew_adrift' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_ds_tideboat: DialogueDef = {
  id: 'd_ds_tideboat', owner: 'npc_ds_08',
  start: [{ if: NIGHT, node: 'night' }, { node: 'boat' }],
  nodes: {
    night: { text: 'The tide boat, tied up at the jetty for the night, with someone asleep in the bottom of it under a tarp. Not tonight.', options: [leave] },
    boat: { text: 'The tide boat at the jetty: flat-bottomed, tarred, an outboard on the transom and a mast laid along the thwarts. Mele is at the tiller. "Where to?"', again: 'Mele waits at the tiller.', options: [...RIDES.map((o) => ({ ...o, id: `boat.${o.id}` })), leave] },
  },
};

export const d_ds_hassan: DialogueDef = {
  id: 'd_ds_hassan', owner: 'npc_ds_09',
  start: [{ if: F('ds_hassan_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: FISH_BACK, text: 'A big grey-bearded man in a smokehouse that smells of driftwood and fish and, faintly, less of anything else than it did. "Hassan. Smoked fish, water, twine, and a cabin under the old hull over the net store if you want a roof." He holds up a mackerel to the light like a jeweller. "Look at that. Clean. The water\'s thinning out east."' },
        { text: 'A big grey-bearded man in a smokehouse that smells of driftwood and fish and something under both that belongs in an engine. "Hassan. Smoked fish, water, twine, and a cabin under the old hull over the net store if you want a roof." He holds up a mackerel and sniffs it and puts it down. "Tastes of the Rig. Eat it anyway. Everybody does."' },
      ],
      again: 'Hassan turns a rack of fish in the smoke.',
      effects: [{ set: 'ds_hassan_met' }],
      options: [
        { id: 'ha.trade', text: 'Let me buy.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'ha.work', text: 'You need hands?', next: 'work' },
        { id: 'ha.salt', text: 'How\'s the trade?', next: 'salt' },
        bye,
      ],
    },
    again: {
      text: 'Hassan in the smoke. "What\'ll it be?"',
      again: 'Hassan turns the racks.',
      options: [
        { id: 'ha.trade2', text: 'Let me buy.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'ha.work2', text: 'You need hands?', if: NOT({ seen: 'ha.work' }), next: 'work' },
        { id: 'ha.salt2', text: 'How\'s the trade?', if: NOT({ seen: 'ha.salt' }), next: 'salt' },
        bye,
      ],
    },
    work: { text: '"At dawn. Out with the nets in my boat, three hours, and you get a fish and a wage when there\'s a catch to pay it from. The board\'s by the door." He shrugs. "Lately there\'s no catch to speak of. The ones we bring up taste of Hum."', again: '"At dawn. The board\'s by the door."', options: [{ text: 'Something else.', next: 'again' }] },
    salt: { text: [{ if: F('ds_post', 'gone'), text: '"Salt comes up the delta on Mele\'s boat now, at the city\'s price, which is the guild\'s price plus Mele." He laughs into his beard. "And I sell my fish in the city myself, at the city\'s price, which is twice the guild\'s. Swings and roundabouts. My father used to say that. I never knew what a roundabout was."' }, { text: '"The guild buys my fish at the guild\'s weight and sells me the salt to cure it at the guild\'s measure. The salt\'s dearer every season and the fish are worse." He shrugs. "Salt\'s up again. Twine too. A child in Low Row died of the cough in the winter because the post\'s medicine was eleven a bottle. Nobody\'s going to hang Thorne for a price."' }], again: '"Salt\'s up. It\'s always up."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_ds_nets: DialogueDef = {
  id: 'd_ds_nets', owner: 'narrator',
  start: [{ if: DAWN, node: 'dawn' }, { node: 'board' }],
  nodes: {
    board: { text: 'A board by the smokehouse door in chalk: HANDS AT DAWN — THE NETS — A FISH AND A SHARE. Below it, smaller: NO CHILDREN.', options: [leave] },
    dawn: {
      text: 'Hassan\'s boat at the smokehouse steps in the grey before dawn, nets heaped in the bow, two of his hands already at the oars. "Coming?"',
      again: '"Coming?"',
      options: [
        { id: 'nets.go.thin', text: '(Go out with the nets.)', if: NOT(FISH_BACK), effects: [{ time: 180 }, { give: 'c_smoked_fish', count: 1 }, { inc: 'ds_nets_days' }], next: 'thin', repeat: true },
        { id: 'nets.go.full', text: '(Go out with the nets.)', if: FISH_BACK, check: { skill: 'survival', dc: 30 }, effects: [{ time: 180 }, { give: 'c_smoked_fish', count: 3 }, { give: 'tolls', count: 6 }, { inc: 'ds_nets_days' }], failEffects: [{ time: 180 }, { give: 'c_smoked_fish', count: 2 }, { inc: 'ds_nets_days' }], next: 'full', fail: 'full_poor', repeat: true },
        leave,
      ],
    },
    thin: { text: 'Three hours on the grey water, hauling, and the nets come up with a skin of oil on every float and a few mackerel that smell of Hum. Hassan gives you one and nothing else, apologetically. "When there\'s a catch," he says.', options: [{ text: '(Back to the smokehouse.)', exit: true }] },
    full: { text: 'Three hours on the grey water, and the nets come up heavy and silver and clean, and Hassan laughs out loud at the first haul and does not stop for an hour. Three fish and six Tolls, and he would give you more if he had it.', options: [{ text: '(Back to the smokehouse.)', exit: true }] },
    full_poor: { text: 'Three hours on the grey water. You foul a net and lose half a haul over the side, and Hassan says nothing about it, which is worse. Two fish.', options: [{ text: '(Back to the smokehouse.)', exit: true }] },
  },
};

export const d_ds_amara: DialogueDef = {
  id: 'd_ds_amara', owner: 'npc_ds_14',
  start: [{ if: F('ds_coker_dead'), node: 'after' }, { if: F('ds_amara_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A girl of fourteen sitting on the edge of the stage with her feet in the water, sculling an oar for no reason. "Mam says don\'t talk to the guild." She looks you over. "You\'re not the guild. Guild wear coats." She sculls. "I row. I don\'t dive. Mam won\'t let me dive since Kai."',
      again: 'Amara sculls the oar.',
      effects: [{ set: 'ds_amara_met' }],
      passives: [{ skill: 'medicine', dc: 35, text: 'The tips of her right fingers are shiny and pink: small burns, a few days healed, the kind you get holding hot glass.', effects: [{ learn: 'ds_amara_burns' }] }],
      options: [
        { id: 'am.row', text: 'Where do you row?', next: 'row' },
        { id: 'am.hands', text: 'What happened to your fingers?', if: { knows: 'ds_amara_burns' }, next: 'hands' },
        bye,
      ],
    },
    again: {
      text: 'Amara on the stage\'s edge, sculling. "What."',
      again: 'Amara sculls.',
      options: [
        { id: 'am.row2', text: 'Where do you row?', if: NOT({ seen: 'am.row' }), next: 'row' },
        { id: 'am.hands2', text: 'What happened to your fingers?', if: ALL({ knows: 'ds_amara_burns' }, NOT({ seen: 'am.hands' })), next: 'hands' },
        bye,
      ],
    },
    row: { text: '"Places." She sculls harder. "The Sow, for Mam. Out to the wreck and back." She looks at the fog bank lying out past the Jesty. "You can smell the fog before it comes. Mam can\'t. I can."', again: '"Places."', options: [{ text: 'Something else.', next: 'again' }] },
    hands: { text: 'She puts the hand in her armpit. "The stove." She is a bad liar, like her mother, and knows it, and stops trying. "Don\'t tell Mam you saw."', again: '"The stove." She doesn\'t look at you.', effects: [{ learn: 'ds_amara_lamp' }], options: [{ text: 'Something else.', next: 'again' }] },
    after: { text: 'Amara on the stage\'s edge with her feet in the water. She does not scull the oar. She does not look at you. Ade Bankole stands behind her at the pump with his hand on her shoulder and looks at you instead.', options: [{ text: '(Leave her.)', exit: true }] },
  },
};

export const d_ds_ade: DialogueDef = {
  id: 'd_ds_ade', owner: 'npc_ds_15',
  start: [{ if: ADE_RUNS, node: 'runs' }, { node: 'pump' }],
  nodes: {
    pump: { text: 'A young man at the air pump\'s crank, turning it in a rhythm he does not have to think about. "Forty a minute," he says, without missing one. "Ade. I\'m hers. Talk to her about diving; I just keep you breathing."', again: 'Ade cranks the pump.', options: [{ id: 'ade.how', text: 'How long have you worked for her?', once: true, next: 'how' }, bye] },
    how: { text: '"Since I was nine. She pulled me off the bottom of the high street when I went down after a tin." He grins. "I owe her forty strokes a minute for the rest of my life. That\'s the rate."', again: '"Forty a minute. That\'s the rate."', options: [bye] },
    runs: { text: 'Ade on the stage alone, with the pump and the hose and the ladder, looking younger than nineteen. "It\'s mine now," he says. "I charge more. I\'m not her. I pay the pumpers more because I\'m not her." He looks at the water. "Slack at the turn, if you\'re going down."', again: 'Ade waits by the pump.', options: [bye] },
  },
};

export const d_ds_ishmael: DialogueDef = {
  id: 'd_ds_ishmael', owner: 'npc_ds_w_boy',
  start: [{ node: 'hi' }],
  nodes: {
    hi: { text: 'The boy off the dike, at the Netlofts with a net in his lap and a mending needle he is holding wrong. "It\'s you." He holds up the net. "Paz is teaching me. I\'m bad at it." He does not stop. "My mam doesn\'t know where I am. I\'ll write. Somebody here can write."', again: 'Ishmael mends, badly.', options: [{ id: 'ish.ok', text: 'You\'re all right here?', once: true, next: 'ok' }, bye] },
    ok: { text: '"They feed you if you mend. Nobody\'s got a sack." He says it as if that were the whole of what a place could offer, and for him it is.', again: '"Nobody\'s got a sack."', options: [bye] },
  },
};

// ---------------------------------------------------------------- the dives off Coker's stage
/** One band's dive as a repeatable option: three finds in order, then a thin base yield; the bag makes the hose free and
 * lowers the DC. Cost is paid whether you come up with anything or not. */
export function diveOptions(band: string, label: string, cost: number, dc: number, finds: Effect[][], base: Effect[], extra: { if?: Cond; next: string; fail: string; bagMod?: number; who?: string }): OptionDef[] {
  const n = `ds_${band}_n`;
  const counts: Cond[] = [NOT(F(n)), F(n, 1), F(n, 2), { flag: n, gte: 3 }];
  const out: OptionDef[] = [];
  for (const withBag of [false, true]) {
    const pay: Effect[] = withBag || cost === 0 ? [] : [{ take: 'tolls', count: cost }];
    const costLabel = withBag || cost === 0 ? 'your own bag' : `${cost} Tolls`;
    counts.forEach((c, i) => {
      out.push({
        id: `dive.${extra.who ?? 'stage'}.${band}.${i}.${withBag ? 'bag' : 'hose'}`,
        text: `${label} (${costLabel})`,
        if: ALL(c, withBag ? BAG : NOT(BAG), ...(withBag || cost === 0 ? [] : [TOLLS(cost)]), ...(extra.if ? [extra.if] : [])),
        check: { skill: 'survival', dc, mods: [{ if: BAG, dc: -(extra.bagMod ?? 15), why: 'your own bag' }, { if: { attr: 'grit', gte: 8 }, dc: -5, why: 'your lungs' }] },
        effects: [...pay, { time: 180 }, { inc: n }, { set: `ds_dived_${band}` }, ...(i < 3 ? finds[i] : base)],
        failEffects: [...pay, { time: 120 }],
        next: extra.next, fail: extra.fail, repeat: true,
      });
    });
  }
  return out;
}

const ROOFS_FINDS: Effect[][] = [
  [{ give: 'j_scrap', count: 2 }, { give: 'c_tin', count: 1 }],
  [{ give: 'j_cloth', count: 2 }, { give: 'j_glass', count: 2 }],
  [{ give: 'tolls', count: 25 }, { learn: 'ds_purse' }],
];
const ROOFS_BASE: Effect[] = [{ give: 'j_scrap', count: 1 }, { give: 'j_cloth', count: 1 }];
const STREET_FINDS: Effect[][] = [
  [{ give: 'j_electronics', count: 1 }, { give: 'c_bandage', count: 2 }],
  [{ give: 't_repair', count: 1 }, { give: 'j_wiring', count: 2 }],
  [{ give: 'u_holdfast', count: 2 }, { give: 'tolls', count: 20 }],
];
const STREET_BASE: Effect[] = [{ give: 'j_electronics', count: 1 }, { give: 'j_wiring', count: 1 }];

const ROOFS_UP = [
  { if: { flag: 'ds_roofs_n', eq: 1 }, text: 'Down the hose into green light, along roofs of slate and tar paper with weed growing on them like hair, past a chimney with a gull\'s skull in it. A gutter full of iron; a tin with its label long gone, sealed. Forty strokes a minute, and then two tugs, and up.' },
  { if: { flag: 'ds_roofs_n', eq: 2 }, text: 'Down among the roofs again. A skylight, its glass still in, and under it a room nobody has been in for ninety years: a bed, a chair, a coat on a hook moving in the water like someone just turned round. You take the curtains and two bottles off the sill and you do not look at the bed.' },
  { if: { flag: 'ds_roofs_n', eq: 3 }, text: 'Down to a roof you have not tried, and in its gutter, wedged, a leather purse gone hard as wood. Inside, pre-Burn coins nobody spends any more and somebody always buys: copper and nickel and one in silver with a woman\'s face on it. You come up grinning. Yewande does not.' },
  { text: 'Down among the roofs. Ellery gives less every time; the easy gutters are picked clean. A strip of lead, a rag of something. Up.' },
];
const STREET_UP = [
  { if: { flag: 'ds_street_n', eq: 1 }, text: 'Down past the roofs to the street, eight fathoms, where the light goes brown. A pharmacy\'s window with its shutters rusted half up. You go in on your belly. A drawer of boiled bandages in a sealed tin, and a till with a board in it that the water never reached.' },
  { if: { flag: 'ds_street_n', eq: 2 }, text: 'Down to the high street again, to a hardware shop with its door open and its stock still on the walls in the dark, furred with growth. A repair kit in a box that had its lid on, and copper wire on a drum that will not stop coming. You come up with your lungs on fire and the wire round your arm.' },
  { if: { flag: 'ds_street_n', eq: 3 }, text: 'Down to the street\'s far end, to the clinic with the red cross gone brown over its door. Behind the counter a steel fridge, sealed, its door gasket still holding after ninety years under the sea. Two boxes of holdfast inside, dry, and a cash tin. Yewande looks at the holdfast for a long time when you surface. "That\'s a winter," she says.' },
  { text: 'Down to the high street. The shops are open and empty; somebody has been everywhere you go, and so have you. A board out of a dead till, a twist of wire. Up.' },
];

export const d_ds_dive: DialogueDef = {
  id: 'd_ds_dive', owner: 'narrator',
  start: [{ if: NOT(LOW_WATER), node: 'tide' }, { if: ADE_RUNS, node: 'ade' }, { node: 'stage' }],
  nodes: {
    tide: { text: 'The ladder going down into the green, and the water moving past it hard, carrying weed. Not on this tide. The city\'s table on the Landing says when the water is slack: before dawn and late in the afternoon.', options: [leave] },
    stage: {
      text: [{ if: F('ds_light', 'court'), text: 'Ade Bankole\'s boat at the stage, and Yewande in it, teaching. "Slack water," she says. "Where?"' }, { text: 'Yewande at the pump with the hose coiled ready. "Slack water," she says. "Where?"' }],
      again: '"Where?"',
      options: [
        ...diveOptions('roofs', '(The roofs of Ellery.)', 6, 25, ROOFS_FINDS, ROOFS_BASE, { next: 'roofs_up', fail: 'down_fail' }),
        ...diveOptions('street', '(The high street, eight fathoms.)', 8, 40, STREET_FINDS, STREET_BASE, { if: F('ds_dived_roofs'), next: 'street_up', fail: 'down_fail' }),
        { id: 'dive.net', text: '(Kai\'s net. Under the Gut, the third pile from the Greta.)', if: ALL({ knows: 'ds_net_place' }, NOT({ item: 'k_ds_net' }), NOT(F('ds_net_up'))), check: { skill: 'survival', dc: 35, mods: [{ if: BAG, dc: -15, why: 'your own bag' }] }, effects: [{ time: 120 }, { give: 'k_ds_net' }, { set: 'ds_net_up' }, { learn: 'ds_joint' }, { lead: 'l_ds_joint' }, { xp: 100 }, A(ASH, 3), A(TAMSIN, 3)], failEffects: [{ time: 60 }], next: 'net_up', fail: 'net_fail' },
        { id: 'dive.buy', text: 'About that bag.', if: NOT(BAG), effects: [{ event: 'barter' }], exit: true, repeat: true },
        leave,
      ],
    },
    ade: {
      text: 'Ade Bankole at the pump, alone on the stage. "Slack water. Ten for the roofs, twelve for the street. I pay the pumpers more." He swallows. "Where?"',
      again: '"Where?"',
      options: [
        ...diveOptions('roofs', '(The roofs of Ellery.)', 10, 25, ROOFS_FINDS, ROOFS_BASE, { next: 'roofs_up', fail: 'down_fail', who: 'ade' }),
        ...diveOptions('street', '(The high street, eight fathoms.)', 12, 40, STREET_FINDS, STREET_BASE, { if: F('ds_dived_roofs'), next: 'street_up', fail: 'down_fail', who: 'ade' }),
        { id: 'dive.ade.net', text: '(Kai\'s net. Under the Gut, the third pile from the Greta.)', if: ALL({ knows: 'ds_net_place' }, NOT({ item: 'k_ds_net' }), NOT(F('ds_net_up'))), check: { skill: 'survival', dc: 40, mods: [{ if: BAG, dc: -15, why: 'your own bag' }] }, effects: [{ time: 120 }, { give: 'k_ds_net' }, { set: 'ds_net_up' }, { learn: 'ds_joint' }, { lead: 'l_ds_joint' }, { xp: 100 }], failEffects: [{ time: 60 }], next: 'net_up', fail: 'net_fail' },
        leave,
      ],
    },
    roofs_up: { text: ROOFS_UP, again: 'You sit on the stage, dripping, and count your breath.', options: [{ text: '(Climb out.)', exit: true }] },
    street_up: { text: STREET_UP, again: 'You sit on the stage, dripping, and count your breath.', options: [{ text: '(Climb out.)', exit: true }] },
    down_fail: { text: 'Down into the green, and at three fathoms your ears go, and at four the cold gets into your chest and squeezes, and you are already climbing the hose hand over hand when the two tugs come. You surface with nothing and your heart going like a fist on a door. "Next slack," she says. "Breathe slow. Nobody does."', options: [{ text: '(Climb out.)', exit: true }] },
    net_up: { text: 'Under the Gut the water is black, not green: you cannot see your hand, so you go down the third pile by feel, and at the bottom the old line runs along the mud as thick as a man, warm through your gloves. At a joint where its collar has split, the black comes out of it in slow breaths, and in the black, caught on the collar\'s lip, a small net. You work it free by touch. The brass collar comes with it, still knotted in the mesh. You think about an eleven-year-old doing this in the dark, and then you stop thinking and climb.', options: [{ text: '(Climb out.)', exit: true }] },
    net_fail: { text: 'Under the Gut the water is black and you cannot see your hand. You go down the pile by feel until something warm moves against your face, and then you are going up, fast, faster than you meant to, with your lungs screaming and the taste of the rig in your mouth. "Not like that," she says, holding your head while you cough. "Again at the next slack, or not at all."', options: [{ text: '(Climb out.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the village's props
export const d_ds_tides: DialogueDef = {
  id: 'd_ds_tides', owner: 'narrator', start: [{ node: 'table' }],
  nodes: {
    table: {
      text: 'A printed sheet under glass in a frame at the head of the Landing, salt-bleached to the colour of tea: TIDE TABLE — LOWER DELTA — RESTORATION YEAR 30 — ISSUED BY THE PRECINCT. Two low waters a day, every day of the season, to the minute: before dawn, and late in the afternoon. Somebody has written under it in pencil, in a careful hand: NEVER WRONG YET.',
      again: 'The city\'s tide table: slack before dawn and late in the afternoon.',
      effects: [{ learn: 'ds_tide_table' }, { lead: 'l_ds_tide_table' }],
      interject: [
        { companion: NINE, text: '"The lower delta table," Nine says, with something in its voice that in a person would be fondness. "Hydrography was the Ledger\'s third department. It has never been wrong because water is the one thing in the basin that does what the record says." It considers the pencilled line. "They are grateful. That is rare."' },
        { companion: TAMSIN, text: 'Tamsin reads it twice. "So the city knows when the sea\'s going to do it," she says. "And nobody minds." She sounds as if she would like to mind and cannot find the way in.' },
      ],
      options: [leave],
    },
  },
};

export const d_ds_book: DialogueDef = {
  id: 'd_ds_book', owner: 'narrator', start: [{ node: 'book' }],
  nodes: {
    book: {
      text: 'The Book of Water on the Greta\'s chart table: a ferry\'s logbook swollen to the size of a brick with sixty years of pages sewn in, in three hands, the first two dead. A pen on a string. Nobody stops you reading it; on the Stilts, everybody reads the Book.',
      again: 'The Book lies open where Oona left it.',
      options: [
        { id: 'book.wrecks', text: '(The wrecks.)', next: 'wrecks' },
        { id: 'book.anchorage', text: '(The anchorage.)', next: 'anchorage' },
        { id: 'book.drowned', text: '(The drowned.)', next: 'drowned' },
        leave,
      ],
    },
    wrecks: { text: 'WRECKED ON THE JESTY, and under it, in Oona\'s hand, this season: a guild salt barge in the fog of the first thaw; a guild twine barge; another; a medicine barge; the salt barge on the roof now, TWO DROWNED. And before them, going back eleven years, nothing. Not one wreck on the Jesty in eleven years, while Lean\'s light burned. Five since the fish went black.', again: 'Five guild barges on the Jesty since the thaw. None in eleven years before.', effects: [{ lead: 'l_ds_wrecks' }, { learn: 'ds_wrecks_read' }], options: [{ text: '(Another page.)', next: 'book' }] },
    anchorage: { text: 'ANCHORAGE — THE GUILD — FOR THE TIDE POST\'S MOORING, a figure every month in Oona\'s hand, and beside each one, WIDOWS. The widows\' column is twice as long as the anchorage column. Half of everything in it is guild money.', again: 'The anchorage: half the widows\' fund.', effects: [{ learn: 'ds_anchorage' }], options: [{ text: '(Another page.)', next: 'book' }] },
    drowned: { text: [{ if: F('ds_prec_living'), text: 'TAKEN BY THE WATER, the long list, sixty years of it. Near the end: IBARRA, MATEO — THE CURLEW, and through it a single line, and in the margin, in fresh blue ink: CAME BACK. SEE PAGE TWELVE, THE SECOND HALF. And at the very end: TANOA, KAI — ELEVEN — UNDER THE GUT.' }, { text: 'TAKEN BY THE WATER, the long list, sixty years of it in three hands. Near the end: IBARRA, MATEO — THE CURLEW — FOUND ADRIFT OFF THE JESTY — OARS SHIPPED (M. TUI SAYS SO). And at the very end, the ink still wet: TANOA, KAI — ELEVEN — UNDER THE GUT.' }], again: 'The long list of the drowned.', effects: [{ learn: 'ds_drowned_read' }], options: [{ text: '(Another page.)', next: 'book' }] },
  },
};

export const d_ds_notice: DialogueDef = {
  id: 'd_ds_notice', owner: 'narrator', start: [{ node: 'n' }],
  nodes: {
    n: {
      text: [{ if: NOT(LIGHT_OPEN), text: 'The tide post\'s notice board: prices, the scale\'s last inspection, and a paper that has been taken down, leaving four clean corners in the salt.' }, { text: 'A paper on the tide post\'s board, in a clerk\'s hand: A FALSE LIGHT WAS HUNG ON THE JESTY IN THE FOG OF THE NINTH, WHERE NO LAMP IS, AND LEAN\'S LIGHT PUT OUT. THE GUILD\'S BARGE SALT 3 WRECKED. TWO MEN DROWNED. ONE HUNDRED TOLLS FOR THE NAME OF THE WRECKERS. — C. THORNE, FACTOR. Somebody has scratched under it with a nail: WHAT THE WATER WRECKS, THE WATER GIVES.' }],
      again: 'A hundred for the wreckers.',
      effects: [{ learn: 'ds_bounty' }, { quest: 'q_ds_light', start: true }],
      options: [leave],
    },
  },
};

export const d_ds_kai: DialogueDef = {
  id: 'd_ds_kai', owner: 'narrator', start: [{ node: 'cot' }],
  nodes: { cot: { text: 'A small cot made up neatly with a blanket somebody has knitted out of net-twine, and on it a boy\'s things laid out in a row: a knife with a cork handle, a gull\'s feather, a pre-Burn coin with a hole in it on a string, a hand line wound on a stick. Nothing has been moved in a long time, and it has only been since this morning.', options: [leave] } },
};

export const d_ds_curlew: DialogueDef = {
  id: 'd_ds_curlew', owner: 'narrator', start: [{ node: 'boat' }],
  nodes: {
    boat: {
      text: 'The Curlew at the finger jetty: a clinker-built boat, old and much loved, tarred black, with a name painted on the transom in a hand that has gone over it every spring. On the starboard bow, a hand under the gunwale, a patch: birch over tarred canvas, eleven copper tacks, one of them bent.',
      again: 'The Curlew, with her bent tack.',
      effects: [{ learn: 'ds_curlew_seen' }],
      passives: [{ skill: 'survival', dc: 30, text: 'Somebody very particular put that patch on, and has not been back to it: the tar round it is older than the tar round everything else. Whoever fishes her now has never touched it.', effects: [{ learn: 'ds_curlew_patch' }] }],
      options: [leave],
    },
  },
};

export const d_ds_loft: DialogueDef = {
  id: 'd_ds_loft', owner: 'narrator', start: [{ if: F('ds_loft_rented'), node: 'mine' }, { node: 'let' }],
  nodes: {
    let: {
      text: 'A trawler\'s hull turned keel-up on the stilts over Hassan\'s net store, with a door cut in her side and a ladder to it: a cabin under her ribs, a bed of nets and blankets, a locker, a porthole over the water. A card on the ladder: TO LET — ASK HASSAN — 20. Somebody has written under it: BRING YOUR OWN SMELL.',
      again: 'TO LET. Twenty Tolls.',
      options: [{ id: 'loft.rent', text: '(Pay Hassan twenty Tolls.)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }, { set: 'ds_loft_rented' }, DEC('ds_loft', 'You rented the cabin under the upturned hull over Hassan\'s net store at Gull Stilts.')], next: 'mine' }, leave],
    },
    mine: { text: 'Your cabin under the upturned hull: the bed of nets, the locker, the porthole over the water, the Stilts\' lamps coming on one by one along the Gut, and Lean\'s light out west on the horizon.', again: 'Your cabin under the hull at Gull Stilts.', options: [{ id: 'loft.rest', text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true, repeat: true }, leave] },
  },
};

export const d_ds_ebb: DialogueDef = {
  id: 'd_ds_ebb', owner: 'narrator', start: [{ node: 'steps' }],
  nodes: {
    steps: {
      text: [
        { if: F('ds_barge', 'pyre'), text: 'The Ebb Steps at low water, and at their foot, black in the green, the ribs of a burned barge settled on the bottom, with weed beginning on them. Somebody has tied a strip of green twine to the highest rib that shows.' },
        { if: F('ds_lua_met'), text: 'The Ebb Steps, going down into the water: some drowned hall\'s steps, broad and shallow, worn into dips by sixty years of people carrying their dead down them. A strip of green twine on the bottom step, where a net was.' },
        { text: 'The Ebb Steps, going down into the water, and half the village on them.' },
      ],
      options: [leave],
    },
  },
};

export const d_ds_jesty: DialogueDef = {
  id: 'd_ds_jesty', owner: 'narrator', start: [{ node: 'p' }],
  nodes: {
    p: {
      text: 'The Jesty\'s parapet on its seaward corner, the highest point of the drowned hotel\'s roof, where you would hang a lamp if you wanted a ship coming in from the west to think it was the Stilts.',
      again: 'The seaward corner of the parapet.',
      passives: [{ attr: 'senses', dc: 6, text: 'An iron hook driven into the parapet, new, with soot above it in a fan on the old concrete, the kind a lamp leaves.', effects: [{ lead: 'l_ds_soot' }, { learn: 'ds_soot' }] }],
      options: [
        { id: 'jesty.look', text: '(Search the parapet.)', if: NOT({ knows: 'ds_soot' }), check: { skill: 'survival', dc: 35 }, effects: [{ lead: 'l_ds_soot' }, { learn: 'ds_soot' }], next: 'found', fail: 'nothing' },
        leave,
      ],
    },
    found: { text: 'Under a loose slab, an iron hook driven into the parapet, new, and above it a fan of soot on the old concrete, the kind a lamp leaves hanging in the wet for hours. Nobody lights a lamp on the Jesty. There is nothing on the Jesty to light.', options: [leave] },
    nothing: { text: 'Salt, gull droppings, a broken bottle. Nothing you can read.', options: [leave] },
  },
};

export const d_ds_wreck: DialogueDef = {
  id: 'd_ds_wreck', owner: 'narrator', start: [{ node: 'w' }],
  nodes: {
    w: {
      text: 'The guild\'s salt barge, SALT 3 on her bow in the guild\'s stencil, broken across the Jesty\'s parapet with her stern in the water and her hold open to the sky. The Stilts\' divers have had most of what was in her; the hold smells of brine and tar and, faintly, of the men who were in it. A clerk\'s chalk on a bulkhead, from the guild\'s salvage: TWO LOST. Coker\'s divers have chalked under it: WHAT THE WATER WRECKS.',
      again: 'SALT 3, broken on the roof.',
      effects: [{ learn: 'ds_wreck_seen' }],
      passives: [{ skill: 'survival', dc: 30, text: 'She struck steering south-east, hard over, as if she had seen the Stilts\' lights dead ahead where only the Jesty is. A ship making for Lean\'s light from the west would never come in on this heading.', effects: [{ learn: 'ds_wreck_heading' }] }],
      options: [leave],
    },
  },
};

export const d_ds_seawall: DialogueDef = {
  id: 'd_ds_seawall', owner: 'narrator', start: [{ if: LOW_WATER, node: 'low' }, { node: 'high' }],
  nodes: {
    high: { text: 'The old sea wall, going east out of the village into open water. A yard of it shows; then the tide covers it. At low water, they say, you can walk it all the way to Blackcap.', options: [leave] },
    low: { text: 'Low water, and the old sea wall stands clear of the bay all the way east, a grey road of slabs with weed on it and the sea on both sides, to a black shape on the water that must be Blackcap.', again: 'The wall stands clear at low water.', options: [{ id: 'wall.walk', text: '(Walk the wall east to Blackcap.)', effects: [{ learn: 'loc_lm_shore_01' }, { event: 'goto', data: { location: 'ds_terminal', spawn: 'seawall', minutes: 50 } }], exit: true, repeat: true }, leave] },
  },
};

export const d_ds_tally: DialogueDef = {
  id: 'd_ds_tally', owner: 'narrator', start: [{ node: 'book' }],
  nodes: {
    book: {
      text: 'Factor Thorne\'s day-book from the tide post, in a neat hand that never hurries: fish bought, salt sold, anchorage paid to the court. The back pages are ruled differently.',
      again: 'Thorne\'s day-book.',
      options: [{ id: 'tally.fuel', text: '(BLACKCAP — LINE ACCOUNT.)', next: 'fuel' }, { id: 'tally.press', text: '(The pages headed COLLECTIONS.)', next: 'press' }, leave],
    },
    fuel: { text: 'BLACKCAP — LINE ACCOUNT. A load a fortnight off the tank at Blackcap since the thaw, entered to the Line\'s fuel book at the Ninebridge floor at market. Beside it: HUM — PAID — ONE TANKER A MONTH, AT CONTRACT. And a third column, small, totalled at the foot of each page with a little flourish: SHRINKAGE.', again: 'Two loads a month off Blackcap, one paid to Hum. SHRINKAGE.', effects: [{ learn: 'ds_two_for_one' }, { lead: 'l_ds_two_tankers' }], interject: [{ companion: ODILE, text: '"Shrinkage," Odile reads over your shoulder. "The guild\'s word for what falls off a cart between the field and the floor. On a crude line it means a leak. Cyprian costed the leak." She sounds almost admiring, and then she does not. "He priced it, and booked it, and a boy swam into it."' }], options: [{ text: '(Another page.)', next: 'book' }] },
    press: { text: 'COLLECTIONS: names, debts, dates, a column headed GIVEN BY. Most of the shore is in it somewhere. Two winters back: IBARRA, M. — 300 — TAKEN AT THE GUT, NIGHT — GIVEN BY J. SOUSA — FINDER\'S FEE: HIS BOAT (THE CURLEW) — LOT 4471, NINEBRIDGE. And under it, in the same unhurried hand: VESSEL SET ADRIFT OFF THE JESTY, COAT ABOARD. DEBT WRITTEN OFF TO THE WATER, PER LOCAL CUSTOM.', again: 'IBARRA, M. — GIVEN BY J. SOUSA — FINDER\'S FEE: HIS BOAT.', effects: [{ learn: 'ds_tally_press' }, { lead: 'l_ds_finders_fee' }], interject: [{ companion: WREN, text: 'Wren reads it and does not say anything for a long time. "They wrote the debt off to the water," she says. "So the widow wouldn\'t owe it. Kind of them." Her burned hand is shaking and she puts it in her pocket.', effects: [A(WREN, 2)] }], options: [{ text: '(Another page.)', next: 'book' }] },
  },
};

// ---------------------------------------------------------------- background people
function tree(id: string, owner: string, lines: { if?: Cond; text: string }[], asks: { text: string; reply: string }[], again: string): DialogueDef {
  const nodes: DialogueDef['nodes'] = {
    hello: { text: lines, again, options: [...asks.map((a, i) => ({ id: `${id}.${i}`, text: a.text, next: `a${i}`, once: true })), { text: 'Take care.', exit: true }] },
  };
  asks.forEach((a, i) => { nodes[`a${i}`] = { text: a.reply, again: a.reply, options: [{ text: 'Thanks.', next: 'hello' }] }; });
  return { id, owner, start: [{ node: 'hello' }], nodes };
}

export const d_ds_x_fisher = tree('d_ds_x_fisher', 'narrator', [
  { if: { standing: { settlement: 'hamlet_shore', gte: 15 } }, text: '"It\'s you." A nod from somebody mending a float. "Mind the boards by the Greta. Rotten since the spring."' },
  { if: { standing: { settlement: 'hamlet_shore', lte: -15 } }, text: 'They look at you, and then at the water, and go on with what they were doing.' },
  { if: FISH_BACK, text: '"Mackerel came in clean this morning." Said as if it were the weather, which on the Stilts it is.' },
  { text: '"Off the road?" Not unfriendly. "Mind your feet. The Gut\'s slippy when the tide\'s been over it."' },
], [
  { text: 'Where do I sleep?', reply: '"Hassan\'s got a cabin under the old hull over the net store, twenty. Or the Greta\'s deck, if Oona doesn\'t catch you."' },
  { text: 'What\'s the oil?', reply: '"The Rig." They spit. "Or it isn\'t, and everybody says it is because it\'s easier. Ask Oona; she\'s the one who writes it down."' },
  { text: 'Who\'s in charge?', reply: '"Nobody. The Book. Oona, when the Book needs a mouth." A shrug. "And the guild, when it\'s buying."' },
], '"Something else?"');

export const STILTS_DIALOGUES: DialogueDef[] = [
  d_ds_oona, d_ds_lua, d_ds_yewande, d_ds_thorne, d_ds_mateo, d_ds_paz, d_ds_rui, d_ds_mele, d_ds_tideboat, d_ds_hassan, d_ds_nets, d_ds_amara, d_ds_ade, d_ds_ishmael,
  d_ds_dive, d_ds_tides, d_ds_book, d_ds_notice, d_ds_kai, d_ds_curlew, d_ds_loft, d_ds_ebb, d_ds_jesty, d_ds_wreck, d_ds_seawall, d_ds_tally, d_ds_x_fisher,
];
