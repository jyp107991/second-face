import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, BAG, DEC, ILYA, KES, LOW_WATER, NEWS, NIGHT, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, diveOptions, leave } from './ds_stilts';

/**
 * The Drowned Shore (B5b), offshore and on the road: the Rigs (Hum's keeper and crew, the board, the moonpool hatch, Lean's
 * lamp, Stump's deep dives, the launch), Hum's north-east leg (the gauges, the export valve), Blackcap (the guild's pump, the
 * tank, the night barge), and the dike road's encounters. Gull Stilts is in ds_stilts.ts. Story notes:
 * story/B5b_NOTES_SECRET.md.
 */

const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const NOT = (c: Cond): Cond => ({ not: c });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
/** Hum's crew will let the player down Stump's deep hatch. */
const RIG_LEAVE: Cond = F('ds_rig_leave');
/** The court gave Hum to the Stilts and the Stilts' boats are coming. */
const TAKING: Cond = ALL(F('ds_rig_taking'), NOT(F('ds_hamid')));
const HUM_LEFT: Cond = ANY(F('ds_hamid', 'left'), F('ds_hamid', 'dead'));

export const d_ds_hamid: DialogueDef = {
  id: 'd_ds_hamid', owner: 'npc_ds_10',
  start: [{ if: TAKING, node: 'taking' }, { if: F('ds_hamid_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A grey man in the control room with his hand flat on a steel desk, feeling it the way a doctor feels a wrist. The whole room trembles faintly; he trembles with it and does not notice. "Hamid Farouk. I keep Hum." He looks you over for oil on your boots and finds it. "Nobody comes out to Hum to visit. You want lamp oil, tar, or work? Leila sells; I don\'t."',
      again: 'Hamid keeps his hand on the desk.',
      effects: [{ set: 'ds_hamid_met' }, { learn: 'ds_hamid' }],
      interject: [
        { companion: KES, text: 'Kes has gone straight past him to the board, which is a wall of dials and switches older than anyone\'s grandmother. "Oh, you beauty," she says to it. "Pre-war production controller. Not networked. Dumb as a brick and twice as stubborn." Hamid looks at her with the first warmth you have seen in him. "She is," he says.', effects: [A(KES, 3)] },
        { companion: NINE, text: '"A private platform," Nine says. "Never municipal. The record has nothing on it at all after R minus forty." Hamid: "Good."' },
      ],
      options: [
        { id: 'ham.kai', text: 'A boy drowned at Gull Stilts in your oil. His mother has called the court on the Rigs.', next: 'kai' },
        { id: 'ham.hum', text: 'Tell me about Hum.', next: 'hum' },
        bye,
      ],
    },
    again: {
      text: [
        { if: F('ds_claim', 'guild'), text: 'Hamid at the board. The pressure needle stands where it stood in his father\'s day. "She\'s not tired," he says. "She never was."' },
        { if: NIGHT, text: 'Hamid in the mess with a mug of something, listening to the hull. "She sounds better at night," he says. "Everything does."' },
        { text: 'Hamid at the board, hand flat on the desk. "Yes?"' },
      ],
      again: 'Hamid keeps his hand on the desk.',
      options: [
        { id: 'ham.kai2', text: 'A boy drowned at Gull Stilts in your oil.', if: NOT({ seen: 'ham.kai' }), next: 'kai' },
        { id: 'ham.hum2', text: 'Tell me about Hum.', if: NOT({ seen: 'ham.hum' }), next: 'hum' },
        { id: 'ham.line', text: 'Your board reads the export line to Blackcap open.', if: ALL({ knows: 'ds_line_open' }, NOT({ seen: 'ham.line' })), next: 'line' },
        { id: 'ham.seal', text: 'There\'s a guild seal on your export valve, under the sea. TOLLMEN — LINE ACCOUNT.', if: ALL(ANY({ knows: 'ds_guild_seal' }, { item: 'k_ds_seal' }), NOT(F('ds_hamid_told'))), next: 'seal' },
        { id: 'ham.dive', text: 'Let me dive Stump.', if: NOT(RIG_LEAVE), check: { skill: 'speech', dc: 40, mods: [{ if: { standing: { settlement: 'rigs', gte: 10 } }, dc: -10, why: 'the crew speak well of you' }] }, effects: [{ set: 'ds_rig_leave' }], next: 'dive_yes', fail: 'dive_no' },
        { id: 'ham.terms', text: 'Blackcap\'s line is sleeved. The tank could be half Hum\'s, half the Stilts\', and the guild buys from your deck at the old price.', if: ALL(F('ds_valve', 'sleeved'), F('ds_claim', 'guild'), NOT(F('ds_hamid_terms'))), next: 'terms' },
        bye,
      ],
    },
    kai: { text: 'Something goes over his face and is put away. "Not my oil." Flat. "My oil goes in my tanks, on my deck, and into the guild\'s tanker once a month. Hum\'s line to the shore was cut at the riser before I was born; my father cut it." He taps the desk. "The Stilts say the Rig because they\'ve said the Rig for thirty years. When a gull dies, it\'s the Rig."', again: '"Not my oil. The line was cut before I was born."', effects: [{ learn: 'ds_hamid_denies' }], options: [{ text: 'Something else.', next: 'again' }] },
    hum: { text: '"Saltire Bravo, on the plates. Hum, since my grandfather climbed her leg with a knife in his teeth." He looks up at the ceiling as if he could see through it. "She burns the gas she lifts to lift the oil, and she has done it for ninety years, and if she ever stops she will not start again; there\'s no black-start left in her. So we don\'t let her stop. Forty people, lamp oil, rig diesel, tar, a tanker a month for the guild\'s Line." He shrugs. "Nothing grows out here. Everything we eat, we buy with her."', again: '"Don\'t let her stop. That\'s the whole of it."', effects: [{ learn: 'ds_hum_known' }], options: [{ text: 'Something else.', next: 'again' }] },
    line: { text: '"It reads open." He does not look at the dial. "It has read open since the thaw. The board\'s ninety years old; it reads what it likes." Then he does look. "Pressure\'s falling. Eleven points. She\'s tired, that\'s all. Things get tired." He says it like a man who has been saying it to himself every night.', again: '"She\'s tired, that\'s all."', effects: [{ learn: 'ds_hamid_tired' }], options: [{ text: 'Something else.', next: 'again' }] },
    seal: {
      text: 'He goes still, in the way the platform never does. If you have the seal, you put it on his desk, and he picks it up and reads it and puts it down very carefully, as if it might go off. "Thorne asked for two tankers in the winter," he says. "I said she can\'t give two. He said nobody has to be unreasonable." The trembling desk; his hand flat on it. "So he went down my leg in the night and took the second one himself. Through the old line. Under the Stilts." He does the sum in his head and you watch it arrive. "Under the Stilts."',
      again: '"Under the Stilts," he says again.',
      effects: [{ set: 'ds_hamid_told' }, { set: 'ds_rig_leave' }, { learn: 'ds_hamid_knows' }],
      options: [
        { id: 'ham.seal.court', text: 'Stand up for Lua at the Stilt Court. With me.', next: 'seal_court' },
        { id: 'ham.seal.shut', text: 'Shut the line.', next: 'seal_shut' },
      ],
    },
    seal_court: { text: '"On the Greta." He laughs, without any pleasure in it. "In front of the Stilts. They\'ll spit." He takes his hand off the desk for the first time since you came in. "I\'ll come on the launch. Tell the old woman to save me a bench at the back, by the guild."', again: '"Save me a bench. By the guild."', options: [{ text: 'Something else.', next: 'again' }] },
    seal_shut: { text: '"The wheel\'s down the north-east leg, under the water, where the guild\'s diver turned it. Sun-hee can go down. You can go down; you\'ve been." He looks at the pressure dial. "Shut it, and she gets her breath back, and the guild gets one tanker and screams. Leila\'s got some idea about a sleeve. Ask her. She\'s cleverer than me; she\'s told me so."', again: '"The wheel\'s down the north-east leg."', options: [{ text: 'Something else.', next: 'again' }] },
    dive_yes: { text: '"Stump\'s hatch. Sun-hee runs it; she\'ll take your fare and your life in her hands, and she\'s better with the second." He goes back to the board.', again: '"Stump. Sun-hee."', options: [{ text: 'Something else.', next: 'again' }] },
    dive_no: { text: '"Stump\'s for crew." Not unkind. "Strangers drown down there and we have to fish them out, and then the Stilts say the Rig."', again: '"Stump\'s for crew."', options: [{ text: 'Something else.', next: 'again' }] },
    terms: {
      text: '"Half a tank." He tries the idea on like a coat. "The Stilts holding half of Hum\'s oil. The Stilts, who spit when our launch comes in." He looks at the dial, steady now. "And the guild buying from my deck at the old price, one tanker, and not a drop more, and whatever\'s in Blackcap ours and theirs to sell in the city." A long breath. "Leila would stay. For that, Leila would stay."',
      again: '"Half a tank. The Stilts."',
      options: [
        { id: 'ham.terms.yes', text: 'Then shake on it, before the guild finds a way back in.', if: F('ds_oona_terms'), check: { skill: 'speech', dc: 45, mods: [{ if: F('ds_hamid_told'), dc: -10, why: 'he knows what the guild did' }, { if: { item: 'k_ds_sleeve' }, dc: 5, why: 'the sleeve is not fitted yet' }] }, effects: [{ set: 'ds_hamid_terms' }, { set: 'ds_rig', value: 'shared' }, { set: 'ds_leila_stays' }, DEC('ds_rig_shared', 'Blackcap\'s tank is Gull Stilts\' and Hum\'s, half each, with its line sleeved and clean.'), NEWS('ds_rig_shared', 'Gull Stilts and the Rigs\' crew struck terms over the old tank at Blackcap: half each, and the guild buys at the old price', 5, 6, 'rigs'), { xp: 150 }, A(ODILE, 5), A(KES, 3)], next: 'terms_yes', fail: 'terms_no' },
        { id: 'ham.terms.first', text: 'Then shake on it, before the guild finds a way back in.', if: NOT(F('ds_oona_terms')), check: { skill: 'speech', dc: 45, mods: [{ if: F('ds_hamid_told'), dc: -10, why: 'he knows what the guild did' }] }, effects: [{ set: 'ds_hamid_terms' }, { set: 'ds_leila_stays' }, A(KES, 2)], next: 'terms_yes', fail: 'terms_no' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    terms_yes: { text: 'He puts his hand out, and it is shaking a little, and that is the platform. "Half," he says. "Tell the old woman Hum\'s word is on her book. She knows what that\'s worth."', again: '"Half. Hum\'s word."', options: [{ text: 'Something else.', next: 'again' }] },
    terms_no: { text: '"No." He turns back to the board. "The Stilts would sell their half to the guild by the spring, and then I\'d have Thorne\'s seal on my own tank." He is probably wrong about the Stilts. He is not wrong about Thorne.', again: '"No. They\'d sell it by spring."', options: [{ text: 'Something else.', next: 'again' }] },
    taking: {
      text: 'Hamid at the board with every man and woman of his crew behind him in the control room and out on the deck, and through the window, coming across the bay from the Stilts, a line of boats. "The court says she\'s theirs," he says. "For the boy." He does not take his hand off the desk. "She\'s never floated in her life. Page three. Anything that floats and works." He laughs. "Forty people, and a turbine that\'ll never start again if it stops, and the Stilts can\'t keep a pump going on a fishing boat."',
      again: 'The boats come on across the bay.',
      interject: [{ companion: KES, text: 'Kes looks at the board, and then at you, and does not say what she is thinking, loudly.' }],
      options: [
        { id: 'ham.go', text: 'Take your crew and go before they get here. The Line runs east from the city; there\'s work at the Skirts.', check: { skill: 'speech', dc: 55, mods: [{ if: { standing: { settlement: 'rigs', gte: 10 } }, dc: -10, why: 'the crew speak well of you' }, { if: { knows: 'ds_leila_city' }, dc: -10, why: 'Leila has wanted to go for years' }, { if: F('ds_hamid_told'), dc: 10, why: 'he knows it was the guild, and you let the court say Hum' }] }, effects: [{ set: 'ds_hamid', value: 'left' }, { set: 'ds_rig', value: 'stilts' }, DEC('ds_rig_stilts', 'Hamid Farouk took Hum\'s crew off the platform before the Stilts\' boats came; Hum is Gull Stilts\' now.'), NEWS('ds_rig_left', 'the Rigs\' crew left Hum to Gull Stilts without a fight and went up the delta for the Line', 0, 6, 'rigs'), { xp: 150 }], next: 'gone', fail: 'stays' },
        { id: 'ham.stay', text: '(Say nothing.)', next: 'stays' },
      ],
    },
    stays: {
      text: '"No." He says it to the board. "My father kept her forty years. I\'ve kept her twenty-two. The Stilts can come and take her off me." Behind him somebody racks a shotgun. The boats are close enough now to hear the oars.',
      again: 'The boats are close enough to hear the oars.',
      options: [
        { id: 'ham.fight', text: '(Then the Stilts will take her. Stand with them.)', effects: [{ set: 'ds_rig_fight' }, A(KES, -10), A(TAMSIN, -10), A(ASH, -10), DEC('ds_rig_fight', 'You went onto Hum with the Stilts\' boats when Hamid Farouk would not give her up.'), { event: 'combat' }], exit: true },
        { id: 'ham.walk', text: '(Leave. This isn\'t yours.)', exit: true },
      ],
    },
    gone: { text: 'He looks at the board for a long time. Then he takes his hand off the desk. "Leila," he says, not loudly, and she is already there. He goes out to the launch with forty people behind him and a bag each, and he does not look back at Hum, and Hum hums. The Stilts\' boats come alongside an hour later and their men climb up her legs, and somebody finds the chalk on the turbine and reads it out loud: DON\'T LET HER STOP. Nobody laughs.', options: [{ text: '(Leave him to it.)', exit: true }] },
  },
};

export const d_ds_leila: DialogueDef = {
  id: 'd_ds_leila', owner: 'npc_ds_11',
  start: [{ if: F('ds_leila_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young woman in the turbine hall with ear defenders round her neck and a wrench in her back pocket, reading a gauge with her nose almost on the glass. She shouts over the noise without turning: "Leila Farouk. Engineer. If you want to buy, I sell; if you want to talk, outside." Outside, on the deck, she pulls the defenders off and her ears ring in the quiet. "Pressure\'s down eleven since the thaw," she says, as if you had asked. "Hum isn\'t tired. My father says she\'s tired. Something\'s drinking."',
      again: 'Leila wipes the gauge glass with her thumb.',
      effects: [{ set: 'ds_leila_met' }, { learn: 'ds_pressure' }, { lead: 'l_ds_pressure' }],
      options: [
        { id: 'lei.trade', text: 'What do you sell?', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'lei.drinking', text: 'What\'s drinking?', next: 'drinking' },
        { id: 'lei.you', text: 'What do you want, out here?', next: 'you' },
        bye,
      ],
    },
    again: {
      text: 'Leila on the deck with the defenders round her neck. "What?"',
      again: 'Leila waits.',
      options: [
        { id: 'lei.trade2', text: 'What do you sell?', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'lei.drinking2', text: 'What\'s drinking?', if: NOT({ seen: 'lei.drinking' }), next: 'drinking' },
        { id: 'lei.you2', text: 'What do you want, out here?', if: NOT({ seen: 'lei.you' }), next: 'you' },
        { id: 'lei.sleeve', text: 'If the old line to Blackcap stays open, could it be made not to leak?', if: ALL({ knows: 'ds_line_open' }, NOT({ item: 'k_ds_sleeve' }), NOT(F('ds_sleeve_given'))), next: 'sleeve' },
        bye,
      ],
    },
    drinking: { text: '"The export line reads open. Father says the board lies." She shrugs. "The board doesn\'t lie, it\'s too stupid to lie. If the line\'s open, Hum\'s oil is going down it under the Stilts to that tank at Blackcap, and the line was laid ninety years ago and every joint on it\'s rotten." She looks east. "So some of it\'s getting to Blackcap. And some of it isn\'t."', again: '"Some of it\'s getting to Blackcap. Some of it isn\'t."', effects: [{ learn: 'ds_line_open' }, { learn: 'ds_old_line' }], options: [{ text: 'Something else.', next: 'again' }] },
    you: { text: '"A city." She says it without any shame. "Streets you can walk on that don\'t move. A room that isn\'t a container. I hear the Precinct has a library you can sit in all day." She looks at the turbine house. "I\'d stay if Hum had a future that wasn\'t one tanker a month for the guild until she stops. She hasn\'t."', again: '"A city. Or a future for Hum. One or the other."', effects: [{ learn: 'ds_leila_city' }], options: [{ text: 'Something else.', next: 'again' }] },
    sleeve: { text: 'She grins for the first time. "I\'ve had it made since the thaw. Nobody asked." She goes into a container and comes out with a split steel sleeve, its bolts in a bag, gaskets cut from a tyre and a tin of Hum\'s own pitch. "At the valve, round the riser where the old joint\'s weakest. Takes the strain off the line so it runs clean all the way. Then Blackcap\'s a real tank, for whoever holds it." She hands it over. "It\'s a two-hand job under water. Somebody with good hands."', again: '"At the valve. Good hands."', effects: [{ give: 'k_ds_sleeve' }, { set: 'ds_sleeve_given' }], interject: [{ companion: KES, text: '"Obviously that works," Kes says, turning the sleeve over. "Obviously nobody\'s done it. That\'s the whole history of the world, that sentence."' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_ds_ewan: DialogueDef = {
  id: 'd_ds_ewan', owner: 'npc_ds_12',
  start: [{ if: F('ds_ewan_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old man in the lamp room on Lean\'s derrick with a bottle he hides badly behind a coil of hose. The lamp burns behind him, a great lens with a gas flame in it, and the whole listing room is gold. "Tulloch. Ewan. The light." He gestures at it as if introducing a wife. "Lit every night for thirty-one years. Mostly." He looks at you sideways. "You\'re not the guild, are you? You don\'t smell like the guild."',
      again: 'Ewan keeps the bottle behind the hose.',
      effects: [{ set: 'ds_ewan_met' }],
      options: [
        { id: 'ew.mostly', text: 'Mostly?', next: 'mostly' },
        { id: 'ew.light', text: 'What does the light do?', next: 'light' },
        bye,
      ],
    },
    again: { text: 'Ewan in the gold of the lamp room. "Back. Have you a drop? No? No."', again: 'Ewan waits.', options: [{ id: 'ew.mostly2', text: 'Mostly?', if: NOT({ seen: 'ew.mostly' }), next: 'mostly' }, { id: 'ew.light2', text: 'What does the light do?', if: NOT({ seen: 'ew.light' }), next: 'light' }, bye] },
    light: { text: '"Brings the Stilts\' boats home in fog. They steer on her from the west and she puts them in the channel past the Jesty, safe." He pats the lens\'s brass. "If she\'s dark, you steer on the Stilts\' own lamps, and the Stilts\' lamps are behind the Jesty from the west. Then you\'re on the roof." He shakes his head. "Then you\'re on the roof."', again: '"If she\'s dark, you\'re on the roof."', effects: [{ learn: 'ds_light_how' }], options: [{ text: 'Something else.', next: 'again' }] },
    mostly: { text: '"Five nights since the thaw she\'s been dark. Foggy nights, every one. Gas line cut." He holds up the end of a hose. The cut is clean and square. "Cut. I know perished, and that isn\'t perished. Somebody comes up Lean\'s leg in the fog with a knife and cuts my line, and in the morning I splice it, and nobody believes me because I\'m Ewan." He drinks, not hiding it now. "The guild\'s factor came out and asked me about it. Asked me very nicely. I didn\'t like how nicely."', again: '"Cut. Not perished. Nobody believes Ewan."', effects: [{ lead: 'l_ds_lamp_cut' }, { learn: 'ds_lamp_cut' }], interject: [{ companion: ILYA, text: 'Ilya takes the cut end from him and turns it to the lamp. "Knife. Right-handed. Sharp." He gives it back. "He\'s not lying."' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_ds_sunhee: DialogueDef = {
  id: 'd_ds_sunhee', owner: 'npc_ds_13',
  start: [{ if: F('ds_sunhee_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A small woman in a cut-down survival suit on Stump\'s grate, wringing out a hood. "Sun-hee. I dive for Hum." She looks at your chest, judging your lungs, and does not say what she thinks. "Stump goes down sixty feet and then it goes down some more. If Hamid says you can, I\'ll take you. Ten Tolls and you do exactly what I say."',
      again: 'Sun-hee wrings out her hood.',
      effects: [{ set: 'ds_sunhee_met' }],
      options: [
        { id: 'sun.night', text: 'Have you seen anyone at Hum\'s legs who shouldn\'t be?', next: 'night' },
        bye,
      ],
    },
    again: {
      text: 'Sun-hee on Stump\'s grate. "Diving?"',
      again: 'Sun-hee waits.',
      options: [
        { id: 'sun.night2', text: 'Have you seen anyone at Hum\'s legs who shouldn\'t be?', if: NOT({ seen: 'sun.night' }), next: 'night' },
        bye,
      ],
    },
    night: {
      text: 'She stops wringing. "Ninety-odd nights back. A boat at the north-east leg with no lamps, low in the water, and bubbles in the moonpool that weren\'t ours. Two hours, then gone." She looks across at the control room. "I told Hamid. Hamid didn\'t want told. The guild\'s tanker is how we eat."',
      again: '"No lamps. Bubbles that weren\'t ours. Hamid didn\'t want told."',
      effects: [{ lead: 'l_ds_barge' }, { learn: 'ds_sunhee_saw' }],
      options: [
        { id: 'sun.court', text: 'Will you say that at the Stilt Court?', check: { skill: 'speech', dc: 30, mods: [{ if: F('ds_hamid_told'), dc: -15, why: 'Hamid knows now' }] }, effects: [{ set: 'ds_sunhee_word' }], next: 'court_yes', fail: 'court_no' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    court_yes: { text: '"On the Greta." She considers the Stilts on the horizon. "They\'ll hate it. Good." She goes back to the hood.', again: '"On the Greta. Good."', options: [{ text: 'Something else.', next: 'again' }] },
    court_no: { text: '"And have Hamid lose the tanker?" She shakes her head. "Not on your word. Show me something."', again: '"Show me something."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

// ---------------------------------------------------------------- the platform's props
export const d_ds_board: DialogueDef = {
  id: 'd_ds_board', owner: 'narrator', start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'Hum\'s board: a wall of dials and switches behind glass gone yellow, a mimic panel of the platform in enamel with little lamps where the wells and pumps are. Most of the lamps are dark. A row near the bottom still lights: TURBINE B — RUN. LIFT PUMPS 1, 2 — RUN. And on the line that leaves the platform\'s outline and runs off the panel\'s edge toward the shore: EXPORT — OPEN, with a pressure dial beside it whose needle has a pencil mark under it from some better year.',
      again: 'EXPORT — OPEN, and the needle under the pencil mark.',
      effects: [{ learn: 'ds_line_open' }, { learn: 'ds_board_read' }],
      interject: [{ companion: KES, text: 'Kes has the panel\'s side cover off before anyone can stop her and is reading a strip of paper that comes out of it on a spool, inch by inch. "Event log. It prints." She taps a line. "EXPORT VALVE — MANUAL — OPEN. Ninety-four days. Not the controller. Somebody\'s hands, down there." She looks at you. "This thing\'s too stupid to lie."', effects: [{ learn: 'ds_manual' }, A(KES, 2)] }],
      options: [
        { id: 'board.log', text: '(Read the pressure log in the drawer.)', next: 'log' },
        { id: 'board.printer', text: '(Find the event log.)', if: NOT({ knows: 'ds_manual' }), check: { skill: 'science', dc: 45 }, effects: [{ learn: 'ds_manual' }], next: 'printer', fail: 'printer_fail' },
        leave,
      ],
    },
    log: { text: 'A ledger in two hands, father and daughter, a line a day: EXPORT PRESS. — and a number. Steady for years. Then from the thaw, falling every week, a point here, a point there, eleven in all. Beside the latest entry, in the father\'s hand: TIRED. Beside it, in the daughter\'s: DRINKING.', again: 'The log: eleven points since the thaw.', effects: [{ learn: 'ds_pressure' }, { lead: 'l_ds_pressure' }], options: [{ text: '(Back to the board.)', next: 'board' }] },
    printer: { text: 'Behind a side cover, a printer older than anyone\'s grandmother still feeding a strip of paper an inch at a time. You run it back. EXPORT VALVE — MANUAL — OPEN. Ninety-four days ago, at night. Not the controller: somebody\'s hands, down there, on the wheel.', again: 'MANUAL — OPEN. Ninety-four days.', options: [{ text: '(Back to the board.)', next: 'board' }] },
    printer_fail: { text: 'There must be a log somewhere; boards like this kept one. You do not find it.', options: [{ text: '(Back to the board.)', next: 'board' }] },
  },
};

export const d_ds_leg_hatch: DialogueDef = {
  id: 'd_ds_leg_hatch', owner: 'narrator', start: [{ node: 'hatch' }],
  nodes: {
    hatch: {
      text: 'A hatch in the grate over the north-east leg, a yard across, with a ladder going down into a steel well and the sound of the sea breathing at the bottom of it. Cold comes up out of it like a hand. A board on the hatch rim, in old stencil: MOONPOOL — DIVERS ONLY — LINE AND LAMP.',
      again: 'The moonpool hatch, breathing.',
      options: [
        { id: 'hatch.bag', text: '(Go down with your own bag.)', if: BAG, effects: [{ event: 'goto', data: { location: 'ds_rig_leg', spawn: 'hatch', minutes: 10 } }], exit: true, repeat: true },
        { id: 'hatch.down', text: '(Go down on a line and a held breath.)', if: NOT(BAG), check: { skill: 'survival', dc: 40, mods: [{ if: { attr: 'grit', gte: 8 }, dc: -5, why: 'your lungs' }] }, effects: [{ event: 'goto', data: { location: 'ds_rig_leg', spawn: 'hatch', minutes: 10 } }], next: 'down', fail: 'cold', repeat: true },
        leave,
      ],
    },
    down: { text: 'Down the ladder into the cold.', options: [{ text: '(Go on.)', exit: true }] },
    cold: { text: 'Ten rungs down the cold takes the breath out of you like a fist, and you are back on the grate before you decide to be, gasping. Sun-hee, passing, says without stopping: "Bag. Or better lungs."', options: [leave] },
  },
};

export const d_ds_launch: DialogueDef = {
  id: 'd_ds_launch', owner: 'narrator', start: [{ node: 'l' }],
  nodes: {
    l: {
      text: [{ if: F('ds_hamid', 'left'), text: 'The Stilts\' boat at Hum\'s landing stage now, with a Stilts boy at the tiller who looks as if he cannot believe where he is.' }, { text: 'Hum\'s launch at the landing stage: a steel lifeboat from before the Burn with its canopy cut off, running on Hum\'s own diesel. A crewman at the tiller.' }],
      again: 'The launch, waiting.',
      options: [
        { id: 'launch.stilts', text: '(Back to Gull Stilts. 3 Tolls)', if: TOLLS(3), effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'ds_stilts', spawn: 'jetty', minutes: 80 } }], exit: true, repeat: true },
        leave,
      ],
    },
  },
};

export const d_ds_lean_lamp: DialogueDef = {
  id: 'd_ds_lean_lamp', owner: 'narrator', start: [{ node: 'lamp' }],
  nodes: {
    lamp: {
      text: 'Lean\'s lamp: a lighthouse lens the size of a man, salvaged from somewhere and hauled up the dead derrick, with a gas flame in it fed by a hose of Hum\'s gas that comes across the catwalk in a sling. A spliced joint in the hose, fresh tape over old.',
      again: 'The lamp and its spliced hose.',
      passives: [{ skill: 'mechanics', dc: 30, text: 'The hose has been spliced in five places in the last few months, each one at the same reach from the deck, each one a clean square cut. Not perished. Cut.', effects: [{ lead: 'l_ds_lamp_cut' }, { learn: 'ds_lamp_cut' }] }],
      options: [leave],
    },
  },
};

const LEGS_FINDS: Effect[][] = [
  [{ give: 'j_electronics', count: 3 }, { give: 'u_powercell', count: 1 }],
  [{ give: 'j_controller', count: 1 }],
  [{ give: 'j_electronics', count: 2 }, { give: 'u_powercell', count: 2 }, { give: 'tolls', count: 40 }],
];
const LEGS_BASE: Effect[] = [{ give: 'j_electronics', count: 2 }];

export const d_ds_stump: DialogueDef = {
  id: 'd_ds_stump', owner: 'npc_ds_13',
  start: [{ if: NOT(RIG_LEAVE), node: 'crew' }, { if: NOT(LOW_WATER), node: 'tide' }, { if: HUM_LEFT, node: 'gone' }, { node: 'hatch' }],
  nodes: {
    crew: { text: 'Stump\'s deep hatch: a square of black water inside the leg-tops, with a winch over it and a stencil: CREW ONLY. Sun-hee looks up from her hood. "Hamid says who goes down Stump. Ask him."', options: [leave] },
    tide: { text: 'Stump\'s hatch, and the water in it moving, sucking at the leg-tops. "Not on this tide," Sun-hee says. "Slack, or never."', options: [leave] },
    gone: { text: 'Stump\'s hatch, with nobody at the winch. Whoever dives Hum\'s legs now, it is not anyone who knows them.', options: [leave] },
    hatch: {
      text: 'Sun-hee at the winch over Stump\'s black square, with a lamp on a line. "Down the leg-tops to the old pump deck at thirty feet, then the control room at sixty. Boards, cells, and if you\'re lucky a controller nobody\'s pulled. Ten Tolls. You come up when I pull."',
      again: '"Ten Tolls. Up when I pull."',
      options: [...diveOptions('legs', '(Down Stump\'s legs.)', 10, 55, LEGS_FINDS, LEGS_BASE, { next: 'legs_up', fail: 'legs_fail' }), leave],
    },
    legs_up: {
      text: [
        { if: { flag: 'ds_legs_n', eq: 1 }, text: 'Down through black water lit by Sun-hee\'s lamp, past ninety years of mussels on the legs, to a pump deck where the sea has kept everything exactly as the last crew left it. A rack of boards in a sealed cabinet, and a cell still in its wrapper. You come up shaking with cold and with something else.' },
        { if: { flag: 'ds_legs_n', eq: 2 }, text: 'Down to sixty feet, to the control room the platform\'s builders put underwater on purpose, and in its sealed rack, one controller still in its potting, pins bright. Sun-hee looks at it in your hand on the grate and says nothing for a long time. "That\'s a rifle," she says. "That\'s two rifles. Don\'t tell the guild you have it."' },
        { if: { flag: 'ds_legs_n', eq: 3 }, text: 'Down to the control room again, into a cabinet you had not tried, and in it a cash box some pre-war engineer kept his card money in, and two cells, and two boards. Sun-hee pulls before you are ready and you come up whether you like it or not.' },
        { text: 'Down Stump\'s legs. Hum\'s crew have been diving these for thirty years; you find what they left, which is not much. A board.' },
      ],
      again: 'You sit on Stump\'s grate, shaking.',
      options: [{ text: '(Climb out.)', exit: true }],
    },
    legs_fail: { text: 'At forty feet the black closes in and the pressure is a hand on your head, and you lose the line, and then Sun-hee is hauling and you are coming up whether you want to or not. On the grate she holds your head and says, very calmly, "Next slack. Or never. Your choice."', options: [{ text: '(Climb out.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- Hum's north-east leg
export const d_ds_leg_ladder: DialogueDef = {
  id: 'd_ds_leg_ladder', owner: 'narrator', start: [{ node: 'l' }],
  nodes: { l: { text: 'The moonpool ladder going up into the hum and the light.', options: [{ id: 'leg.up', text: '(Climb up.)', effects: [{ event: 'goto', data: { location: 'ds_rigs', spawn: 'hatch', minutes: 10 } }], exit: true, repeat: true }, leave] } },
};

export const d_ds_leg_gauge: DialogueDef = {
  id: 'd_ds_leg_gauge', owner: 'narrator', start: [{ node: 'g' }],
  nodes: {
    g: {
      text: [{ if: F('ds_valve', 'shut'), text: 'The gauges in the pump room\'s air pocket, dripping. EXPORT FLOW — nothing. The needle lies against its pin.' }, { text: 'The gauges in the pump room\'s air pocket, dripping. EXPORT FLOW, and a needle trembling well off its pin: Hum\'s oil going out along the sea bed toward the shore, steady, the way a vein goes.' }],
      effects: [{ learn: 'ds_pressure' }, { learn: 'ds_line_open' }, { lead: 'l_ds_pressure' }],
      options: [leave],
    },
  },
};

export const d_ds_valve: DialogueDef = {
  id: 'd_ds_valve', owner: 'narrator', start: [{ if: F('ds_valve'), node: 'done' }, { node: 'valve' }],
  nodes: {
    valve: {
      text: 'The export valve: a manifold rising out of the floor of the leg in the waist-deep black water, and a wheel on it as wide as your arms, its spindle bright where it has been turned. Round the wheel\'s rim, through a hole drilled for it, a twist of wire and a lead seal, new and dull: TOLLMEN — LINE ACCOUNT. The guild seals what it means to bill.',
      again: 'The wheel, and the guild\'s seal on it.',
      effects: [{ set: 'ds_valve_seen' }, { learn: 'ds_guild_seal' }, { lead: 'l_ds_seal' }, { learn: 'ds_line_open' }],
      interject: [
        { companion: ODILE, text: 'Odile reads the seal by your lamp and laughs, short and not happy. "LINE ACCOUNT. That\'s the Line\'s fuel book on the Ninebridge floor. My dear, they\'ve billed the railway for this man\'s oil." She touches the lead. "Cyprian always did like a spread."', effects: [A(ODILE, 2)] },
        { companion: NINE, text: '"A municipal valve would have a register number," Nine says, its lens close to the seal. "This has an account." It sounds as if that were the worse of the two.' },
        { companion: WREN, text: 'Wren, waist-deep and miserable in the black water, looks at the seal and then at the wheel\'s bright spindle. "Turned at night. From a boat. Somebody who knew where." She does not like the sea, but she can read a track in it.' },
      ],
      options: [
        { id: 'valve.seal', text: '(Cut the seal off and keep it.)', if: NOT({ item: 'k_ds_seal' }), once: true, effects: [{ give: 'k_ds_seal' }], next: 'sealed' },
        { id: 'valve.shut', text: '(Turn the wheel shut.)', check: { skill: 'mechanics', dc: 35, mods: [{ if: { attr: 'brawn', gte: 7 }, dc: -10, why: 'your back' }] }, effects: [{ set: 'ds_valve', value: 'shut' }, { xp: 150 }, A(ASH, 3), A(TAMSIN, 3), DEC('ds_valve', 'You shut Hum\'s export valve under the sea. Nothing goes down the old line to Blackcap now.'), NEWS('ds_valve_shut', 'somebody went down Hum\'s leg and shut the old export line to Blackcap', 3, 4, 'rigs')], next: 'shut', fail: 'stuck' },
        { id: 'valve.sleeve', text: '(Fit Leila\'s sleeve round the riser, and leave the line open to run clean.)', if: { item: 'k_ds_sleeve' }, check: { skill: 'mechanics', dc: 50, mods: [{ if: { inParty: KES }, dc: -10, why: 'Kes holds the bolts' }, { if: BAG, dc: -5, why: 'your own air' }] }, effects: [{ take: 'k_ds_sleeve' }, { set: 'ds_valve', value: 'sleeved' }, { xp: 200 }, A(KES, 3), A(ODILE, 3), DEC('ds_valve', 'You fitted Leila Farouk\'s sleeve on Hum\'s export riser: the old line runs clean to Blackcap now, and the tank fills without a leak.'), NEWS('ds_valve_sleeved', 'Hum\'s old line to Blackcap was sleeved under the sea and runs clean', 3, 4, 'rigs')], next: 'sleeved', fail: 'sleeve_fail' },
        leave,
      ],
    },
    sealed: { text: 'Your knife through the wire, and the seal comes away in your glove: a disc of lead the size of a coin, the guild\'s neat letters pressed into it. You put it somewhere dry.', again: 'The seal is in your pack.', options: [{ text: '(Back to the wheel.)', next: 'valve' }] },
    shut: { text: 'You get your shoulder under the rim and turn it. It fights you for the first quarter, and then the gear catches, and you turn it until you cannot turn it any more. Somewhere in the steel round you something changes note. The needle on the pump room\'s gauge lies down against its pin. Out under the Stilts, a long way off, the old line stops breathing.', options: [{ text: '(Leave the chamber.)', exit: true }] },
    stuck: { text: 'You get your shoulder under the rim and heave, and the wheel does not move, and your feet go out from under you in the black water. You come up spitting oil. The wheel has not moved a hair.', options: [{ text: '(Back to the wheel.)', next: 'valve' }] },
    sleeved: { text: 'It takes an hour in the black water by lamp, bolt by bolt, gasket by gasket, the pitch tin warm in your hand from the leg\'s own heat. When the last bolt is home, the riser stops weeping. The needle on the pump room\'s gauge comes up, a little, and stays up. The line runs clean to Blackcap now: whoever holds that tank holds Hum\'s oil, without a drop under the Stilts.', options: [{ text: '(Leave the chamber.)', exit: true }] },
    sleeve_fail: { text: 'Under the black water the sleeve\'s halves will not meet, and a bolt goes out of your fingers into the dark and is gone. You come up for air and look at what is left. Not this time.', options: [{ text: '(Back to the wheel.)', next: 'valve' }] },
    done: {
      text: [
        { if: F('ds_valve', 'shut'), text: 'The export wheel, turned shut, the water round it going slowly clear.' },
        { if: F('ds_valve', 'sleeved'), text: 'The export riser with Leila\'s sleeve bolted round it, tight and dry, and the line beyond it running clean.' },
        { text: 'The export wheel, turned open again, a fresh guild seal through its rim.' },
      ],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Blackcap
export const d_ds_hose: DialogueDef = {
  id: 'd_ds_hose', owner: 'narrator', start: [{ node: 'h' }],
  nodes: {
    h: {
      text: 'A pump on the tank\'s north rim, new as nothing on the shore is new: steel hose with brass couplings, clamps that still shine, a guild padlock on the drive, and the guild\'s mark stencilled on the housing over a number. The hose goes over the rim and down into the black.',
      again: 'The guild\'s pump on the rim.',
      effects: [{ learn: 'ds_guild_pump' }, { lead: 'l_ds_blackcap' }],
      passives: [{ skill: 'survival', dc: 35, text: 'On the water on the tank\'s west side, a line of bubbles comes up every few seconds, out of the bottom, going west toward the Stilts and the Rigs. Something under the bay is carrying something into this tank and breathing out as it goes.', effects: [{ learn: 'ds_old_line' }] }],
      options: [leave],
    },
  },
};

export const d_ds_cap: DialogueDef = {
  id: 'd_ds_cap', owner: 'narrator', start: [{ node: 'c' }],
  nodes: {
    c: {
      text: [{ if: F('ds_valve', 'shut'), text: 'The tank\'s roof hatch. The oil inside stands a long way down now, and falling: the guild\'s pump drawing, and nothing coming in.' }, { text: 'The tank\'s roof hatch, a square of steel on a hinge. Lift it and the smell comes up like a blow: the oil inside stands a hand under the roof, full to the brim, warm.' }],
      effects: [{ learn: 'ds_tank_full' }],
      options: [leave],
    },
  },
};

const BARGE_OPEN: Cond = NOT(F('ds_barge'));

export const d_ds_barge: DialogueDef = {
  id: 'd_ds_barge', owner: 'narrator',
  start: [
    { if: ALL(F('ds_barge_fight'), { dead: 'npc_ds_g1' }, BARGE_OPEN), node: 'after' },
    { if: F('ds_barge', 'burned'), node: 'burned' },
    { if: F('ds_barge'), node: 'gone' },
    { if: NIGHT, node: 'night' },
    { node: 'day' },
  ],
  nodes: {
    day: { text: 'The guild\'s barge at Blackcap\'s jetty: a steel tank barge, low and broad, with the guild\'s colours under the rust and a hose coiled on deck. One man on watch with a revolver, bored. At night, they say on the Stilts, she loads.', options: [leave] },
    night: {
      text: 'The barge at night with no lamps, low in the water and getting lower, the guild\'s pump on the tank\'s rim chugging softly and the hose across the jetty to her deck. Three men on her. A big man with a shotgun on the deck-house roof watches you come along the jetty and does not move.',
      again: 'The barge loads in the dark.',
      interject: [{ companion: ILYA, text: 'Ilya, very low: "Three. Shotgun on the roof, revolver by the hose, the third\'s got a knife and no stomach for it." He counts again. "Right."' }],
      options: [
        { id: 'barge.fight', text: '(Come at the barge.)', effects: [{ set: 'ds_barge_fight' }, { rep: { faction: 'tollmen', respect: -15, fear: 10 } }, DEC('ds_barge_fight', 'You came at the guild\'s night barge at Blackcap.'), { event: 'combat' }], exit: true },
        leave,
      ],
    },
    after: {
      text: 'The barge at Blackcap\'s jetty with nobody alive on her deck, the hose still running, the tank\'s oil going into her belly in the dark. She is low enough now that a match would do.',
      again: 'The barge, low and loaded.',
      options: [
        { id: 'barge.burn', text: '(Fire the barge.)', effects: [{ set: 'ds_barge', value: 'burned' }, { rep: { faction: 'tollmen', respect: -20, fear: 15 } }, { xp: 150 }, A(KES, 3), A(TAMSIN, -3), A(ODILE, -5), DEC('ds_barge', 'You burned the guild\'s night barge at Blackcap with her load in her.'), NEWS('ds_barge_burned', 'the guild\'s night barge at Blackcap burned to the waterline with a load of crude in her', -3, 7)], next: 'burning' },
        leave,
      ],
    },
    burning: { text: 'She goes up slowly and then all at once, a column of black smoke with fire at its root that the Stilts will see from every boardwalk and Hum from its flare stack. The jetty\'s boards catch at the end and you get off them. By dawn there is a black hull on the bottom by the tank with the sea in it, and an oil fire on the water that burns itself out on its own.', options: [leave] },
    burned: { text: 'At the jetty\'s end, a black hull settled on the bottom with the sea in her, and a ring of scorched boards.', options: [leave] },
    gone: { text: 'An empty mooring at Blackcap\'s jetty where the guild\'s barge used to load.', options: [leave] },
  },
};

export const d_ds_silas: DialogueDef = {
  id: 'd_ds_silas', owner: 'npc_ds_g1',
  start: [{ node: 'off' }],
  nodes: {
    off: {
      text: 'The big man on the deck-house roof, with a shotgun across his knees and his face shaved to the skull. "Silas Venn. Bargemaster. Guild\'s business." He does not get up. "No lamps on the water. You didn\'t see a barge. Off my jetty."',
      again: '"Off my jetty."',
      options: [
        { id: 'silas.load', text: 'Whose oil is that?', next: 'load' },
        { id: 'silas.bribe', text: 'Twenty Tolls to look at your manifest.', if: TOLLS(20), check: { skill: 'barter', dc: 50 }, effects: [{ take: 'tolls', count: 20 }, { give: 'k_ds_manifest' }], next: 'bribed', fail: 'no' },
        leave,
      ],
    },
    load: { text: '"The guild\'s." He says it without interest. "Two loads a fortnight off this tank, entered at Ninebridge. Who\'s counting?" He settles the shotgun. "Not you."', again: '"Not you."', effects: [{ lead: 'l_ds_barge' }], options: [{ text: '(Back.)', next: 'off' }] },
    bribed: { text: 'He considers the money and the dark and the long way to the next man who might care. Then he takes the twenty and tosses you a sheaf of paper from inside the deck-house without getting up. "Copy. Keep it dry. You never saw it."', options: [leave] },
    no: { text: '"Off my jetty," he says again, exactly as before, and keeps your twenty.', options: [leave] },
  },
};

export const d_ds_marek: DialogueDef = {
  id: 'd_ds_marek', owner: 'npc_ds_g2',
  start: [{ if: F('ds_marek_word'), node: 'said' }, { if: F('ds_marek_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A diver in a guild jersey with salt in his stubble and a bottle he is not drinking from. "Zielinski. Marek." He does not look at you; he looks at the water. "I dive for whoever pays. That\'s diving." Then, before you ask: "Don\'t talk to me about the boy."',
      again: 'Marek looks at the water.',
      effects: [{ set: 'ds_marek_met' }],
      options: [{ id: 'mar.boy', text: 'The boy.', next: 'boy' }, bye],
    },
    again: {
      text: 'Marek with his bottle, looking at the water.',
      again: 'Marek turns the bottle in his hands.',
      options: [
        { id: 'mar.boy2', text: 'The boy.', if: NOT({ seen: 'mar.boy' }), next: 'boy' },
        {
          id: 'mar.wheel', text: 'You went down Hum\'s leg at night and turned the export wheel open. And sealed it.',
          check: { skill: 'speech', dc: 50, mods: [{ if: { item: 'k_ds_seal' }, dc: -15, why: 'the seal he pressed, in your hand' }, { if: { item: 'k_ds_net' }, dc: -10, why: 'a child\'s net with the joint in it' }, { if: { inParty: WREN }, dc: -5, why: 'Wren reads him like a road' }] },
          effects: [{ set: 'ds_marek_word' }, { learn: 'ds_marek_turned' }, { lead: 'l_ds_seal' }], next: 'confess', fail: 'shut',
        },
        bye,
      ],
    },
    boy: { text: '"I said don\'t." He drinks, finally. "I knew about the joints. Everybody who\'s been down that line knows about the joints. I didn\'t know a boy would be stupid enough to go under the Gut in black water for a net." He stops. "That\'s not what I meant. That\'s what I said, but it\'s not what I meant."', again: '"That\'s not what I meant."', options: [{ text: 'Something else.', next: 'again' }] },
    confess: { text: 'He looks at the thing in your hand, or at nothing, for a long time. "On the factor\'s word. At night, off the barge, down the moonpool on a line. I turned it a long way." He puts the bottle down. "If the old woman calls me, I\'ll stand up. Not for the guild. Not for you." He does not say who for.', again: '"If she calls me, I\'ll stand up."', options: [bye] },
    shut: { text: '"I dive for whoever pays," he says again, and turns his back.', again: 'Marek\'s back.', options: [bye] },
    said: { text: 'Marek, sober, looking at the water. "I said I\'d stand up. I will."', options: [bye] },
  },
};

export const d_ds_guildhand: DialogueDef = {
  id: 'd_ds_guildhand', owner: 'npc_ds_g3',
  start: [{ node: 'n' }],
  nodes: { n: { text: '"Guild barge. Keep off." He has the look of a man who has been told to say exactly that and nothing else, and is relieved to have been told.', options: [leave] } },
};

export const d_ds_wall_end: DialogueDef = {
  id: 'd_ds_wall_end', owner: 'narrator', start: [{ if: LOW_WATER, node: 'low' }, { node: 'high' }],
  nodes: {
    high: { text: 'The old sea wall going west into the water toward the Stilts. The tide is over it; only the posts show. The skiff at the jetty, if you can row.', options: [leave] },
    low: { text: 'Low water, and the sea wall stands clear going west, a grey road of slabs to the Stilts\' posts on the horizon.', again: 'The wall stands clear.', options: [{ id: 'wallend.walk', text: '(Walk the wall back to Gull Stilts.)', effects: [{ event: 'goto', data: { location: 'ds_stilts', spawn: 'seawall', minutes: 50 } }], exit: true, repeat: true }, leave] },
  },
};

export const d_ds_skiff: DialogueDef = {
  id: 'd_ds_skiff', owner: 'narrator', start: [{ node: 's' }],
  nodes: { s: { text: 'A skiff tied at the jetty with a pair of oars in her and a painted board nailed to her thwart: BORROW HER, BRING HER BACK — M. TUI.', again: 'Moana\'s skiff.', options: [{ id: 'skiff.row', text: '(Row back to Gull Stilts.)', effects: [{ event: 'goto', data: { location: 'ds_stilts', spawn: 'jetty', minutes: 45 } }], exit: true, repeat: true }, leave] } },
};

export const d_ds_x_crew: DialogueDef = {
  id: 'd_ds_x_crew', owner: 'narrator', start: [{ node: 'hello' }],
  nodes: {
    hello: {
      text: [{ if: { standing: { settlement: 'rigs', gte: 15 } }, text: '"You again." A crewman with tar to the elbows nods at you as if you were nearly crew. "Don\'t let her stop."' }, { if: F('ds_claim', 'rig'), text: 'A crewman looks at you and then at the Stilts on the horizon, and spits in the sea.' }, { text: '"Off the boat?" A crewman with tar to the elbows. "Mind the steam line. Mind the gas line. Mind everything; it all bites."' }],
      again: '"Something else?"',
      options: [
        { id: 'crew.0', text: 'What do you do out here?', once: true, next: 'a0' },
        { id: 'crew.1', text: 'What do you think of the Stilts?', once: true, next: 'a1' },
        { text: 'Take care.', exit: true },
      ],
    },
    a0: { text: '"Cook her oil. Lamp oil off the top of the still, rig diesel off the middle, tar off the bottom for the Stilts\' hulls." A shrug. "Keep the turbine fed. Don\'t let her stop. That\'s the job."', again: '"Don\'t let her stop. That\'s the job."', options: [{ text: 'Thanks.', next: 'hello' }] },
    a1: { text: '"They buy our tar and spit when the launch comes in. We buy their fish and complain it tastes of us." A grin with gaps in it. "My mother was a Stilts girl. Don\'t tell anyone."', again: '"Don\'t tell anyone."', options: [{ text: 'Thanks.', next: 'hello' }] },
  },
};

// ---------------------------------------------------------------- the dike road
export const d_re_ds_eelers: DialogueDef = {
  id: 'd_re_ds_eelers', owner: 'npc_ds_w_eeler',
  start: [{ node: 'hi' }],
  nodes: {
    hi: {
      text: 'An old woman on the dike\'s edge in waders to her chest, hauling a wicker trap up out of the reeds hand over hand, with a fire going on the dike behind her and a pot on it. Eels in the trap, knotting. "Winona Crabbe. Eels." She looks you over. "You\'ve walked from the city. You\'ve the look. Sit, if you want; the pot\'s for anybody who doesn\'t steal the trap."',
      again: 'Winona hauls another trap.',
      options: [
        { id: 'eel.trade', text: 'I\'ll buy some eels.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'eel.news', text: 'What\'s the news on the water?', once: true, next: 'news' },
        { id: 'eel.sit', text: '(Sit by the pot a while.)', once: true, effects: [{ time: 60 }, { give: 'c_smoked_fish', count: 1 }], next: 'sit' },
        { text: '(Walk on.)', exit: true },
      ],
    },
    news: { text: '"The eels taste of the Rig up as far as the third channel now. Never used to past the Stilts." She guts one with her thumb. "And a guild barge goes down past here three nights in four with no lamps, low in the water, toward the city\'s far bank. Doesn\'t wave." She flings the gut to a gull. "I wave at everybody."', again: '"No lamps. Doesn\'t wave."', effects: [{ lead: 'l_ds_barge' }, { learn: 'ds_eeler_news' }], options: [{ text: '(Back.)', next: 'hi' }] },
    sit: { text: 'You sit on the dike by her fire with the reeds hissing on both sides and the sea a grey line to the west, and she gives you an eel off the pot and tells you, unasked, about every person she has ever buried, by the place on the dike where she buried them. It is a long dike.', again: 'Winona\'s fire, and her dead.', options: [{ text: '(Back.)', next: 'hi' }] },
  },
};

export const d_re_ds_press: DialogueDef = {
  id: 'd_re_ds_press', owner: 'npc_ds_w_press_a',
  start: [{ node: 'stop' }],
  nodes: {
    stop: {
      text: 'Two men in the guild\'s colours on the dike road with a boy of fifteen between them on a rope, his wrists tied in front and a sack over one of the men\'s shoulders that you understand, after a moment, is meant for his head. The older one holds up a paper without letting go of it. "Guild paper. A debt collected, for the barges. Stand aside, friend, and nobody has to be unreasonable."',
      again: '"Stand aside, friend."',
      interject: [{ companion: WREN, text: 'Wren has stopped walking. Her burned hand has gone to the knife at her back and she has taken it away again, deliberately. "Look at me," she says to you, quietly, "and tell me we\'re walking past."' }],
      options: [
        { id: 'press.boy', text: '(To the boy.) Whose debt?', next: 'boy' },
        { id: 'press.buy', text: 'What\'s the paper for? I\'ll buy it. (40 Tolls)', if: TOLLS(40), effects: [{ take: 'tolls', count: 40 }, { set: 'ds_press_boy', value: 'freed' }, { set: 'ds_press_how', value: 'bought' }, A(WREN, 10), A(TAMSIN, 5), A(ASH, 5), { xp: 75 }, DEC('ds_press_boy', 'You bought a Sink boy\'s paper off the guild\'s press on the dike road and sent him to Gull Stilts.')], next: 'bought' },
        { id: 'press.talk', text: 'That paper\'s in his mother\'s name. It doesn\'t bind him. Show me his mark on it.', check: { skill: 'speech', dc: 50, mods: [{ if: { inParty: ODILE }, dc: -10, why: 'Odile reads the paper over your shoulder' }, { if: { inParty: WREN }, dc: -5, why: 'Wren knows the block\'s paper' }] }, effects: [{ set: 'ds_press_boy', value: 'freed' }, { set: 'ds_press_how', value: 'talked' }, A(WREN, 10), A(TAMSIN, 5), A(ODILE, 3), { xp: 100 }, DEC('ds_press_boy', 'You talked the guild\'s press off a Sink boy on the dike road: the paper was his mother\'s.')], next: 'talked', fail: 'no' },
        { id: 'press.fight', text: '(Cut the rope.)', effects: [{ set: 'ds_press_fight' }, { set: 'ds_press_boy', value: 'freed' }, { set: 'ds_press_how', value: 'fought' }, { rep: { faction: 'tollmen', respect: -10, fear: 5 } }, A(WREN, 10), DEC('ds_press_boy', 'You cut a Sink boy loose from the guild\'s press on the dike road.'), { event: 'combat' }], exit: true },
        { id: 'press.walk', text: '(Stand aside.)', effects: [{ set: 'ds_press_boy', value: 'pressed' }, A(WREN, -5), A(TAMSIN, -5)], next: 'walked' },
      ],
    },
    boy: { text: 'The boy looks at you as if you might be another one of them. "My mam\'s," he says. "Not mine. She owes the post at the Sink for medicine. They came for her and she was sick, so." He shrugs, and the rope pulls. "Ishmael," he says, though you did not ask, as if somebody ought to know.', again: '"My mam\'s. Not mine."', effects: [{ learn: 'ds_ishmael' }], options: [{ text: '(Back to the men.)', next: 'stop' }] },
    bought: { text: 'The older man counts it twice and hands you the paper and cuts the rope himself, with a care that is almost courtesy. "The guild\'s obliged." To the boy: "You\'re lucky." The boy does not look lucky; he looks at you. "Gull Stilts," you tell him. "Down the dike. Ask for Paz at the Netlofts." He goes, running, then walking, then running.', options: [{ text: '(Walk on.)', exit: true }] },
    talked: { text: 'The younger one looks at the paper again, properly this time, and then at the older one, and the older one swears softly and folds it away. "Mother\'s name," he says. "Should\'ve been the mother." He cuts the rope. The boy stands there rubbing his wrists until you tell him: Gull Stilts, down the dike, ask for Paz at the Netlofts. He goes.', options: [{ text: '(Walk on.)', exit: true }] },
    no: { text: '"His mark\'s his mother\'s mark. That\'s debt." The older man puts the paper away. "Stand aside."', again: '"Stand aside."', options: [{ id: 'press.buy2', text: 'Then I\'ll buy it. (40 Tolls)', if: TOLLS(40), effects: [{ take: 'tolls', count: 40 }, { set: 'ds_press_boy', value: 'freed' }, { set: 'ds_press_how', value: 'bought' }, A(WREN, 10), A(TAMSIN, 5), { xp: 75 }, DEC('ds_press_boy', 'You bought a Sink boy\'s paper off the guild\'s press on the dike road and sent him to Gull Stilts.')], next: 'bought' }, { id: 'press.fight2', text: '(Cut the rope.)', effects: [{ set: 'ds_press_fight' }, { set: 'ds_press_boy', value: 'freed' }, { set: 'ds_press_how', value: 'fought' }, { rep: { faction: 'tollmen', respect: -10, fear: 5 } }, A(WREN, 10), DEC('ds_press_boy', 'You cut a Sink boy loose from the guild\'s press on the dike road.'), { event: 'combat' }], exit: true }, { id: 'press.walk2', text: '(Stand aside.)', effects: [{ set: 'ds_press_boy', value: 'pressed' }, A(WREN, -5), A(TAMSIN, -5)], next: 'walked' }] },
    walked: { text: 'You stand aside. They go past you along the dike toward the city, the boy between them, and at the bend the older one puts the sack over his head, gently, like a man putting a hood on a falcon.', options: [{ text: '(Walk on.)', exit: true }] },
  },
};

export const RIGS_DIALOGUES: DialogueDef[] = [
  d_ds_hamid, d_ds_leila, d_ds_ewan, d_ds_sunhee, d_ds_board, d_ds_leg_hatch, d_ds_launch, d_ds_lean_lamp, d_ds_stump,
  d_ds_leg_ladder, d_ds_leg_gauge, d_ds_valve, d_ds_hose, d_ds_cap, d_ds_barge, d_ds_silas, d_ds_marek, d_ds_guildhand, d_ds_wall_end, d_ds_skiff, d_ds_x_crew,
  d_re_ds_eelers, d_re_ds_press,
];
