import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';

/**
 * The Crown: the lift lobby and its lens (four ways in and one through), the terraces, House Vane's Masque and the
 * Committee's Chair, House Ashby-Crane's salon and its daughter, the portrait studio, the kitchens and the service lift.
 * The Masque, The Kidnapping, Photographer's Studio.
 */

const bye = { text: 'That\'s all.', exit: true };
/** Past the lens, by whatever door. */
const IN: Cond = { flag: 'cr_entry' };
/** No bell ringing. */
const QUIET: Cond = { not: { flag: 'cr_alarm' } };
/** The Chair is not yet decided. */
const OPEN: Cond = { not: { flag: 'cr_chair' } };
const ALIVE: Cond = { not: { flag: 'cr_celestine_dead' } };
const SIGN = (id: string, text: string, learn: string): DialogueDef => ({ id, owner: 'narrator', start: [{ node: 'read' }], nodes: { read: { text, effects: [{ learn }], options: [{ text: '(Leave it.)', exit: true }] } } });

// ---------------------------------------------------------------- the lift lobby: the lens and the sergeant

export const d_cr_lift: DialogueDef = {
  id: 'd_cr_lift', owner: 'narrator', start: [{ node: 'car' }],
  nodes: {
    car: {
      text: 'The invitation car: brass, glass, a bench nobody sits on, and no fare box. It costs nothing. That is how you know what it costs.',
      options: [
        { id: 'lift.down', text: 'Down. The Precinct platform.', effects: [{ event: 'goto', data: { location: 'md_precinct', spawn: 'loop', minutes: 10 } }], exit: true },
        { text: '(Stay.)', exit: true },
      ],
    },
  },
};

export const d_cr_lens = SIGN('d_cr_lens', 'The lens: a glass eye on a brass post with a green light under it, cleaner than the one at the gate and the same eye. It looks at everyone who comes out of the car and decides, and the sergeant says aloud what it has decided. It does not look at the help.', 'cr_lens_seen');
export const d_cr_lobby_sign = SIGN('d_cr_lobby_sign', 'BY INVITATION — CHIT, PASS OR STANDING — THE HELP ROUND THE BACK — THIS SEASON: HOUSE VANE. Under it, smaller, in the lens\'s own print: ALL FACES ARE FILED.', 'cr_lobby_sign');

export const d_cr_ambrose: DialogueDef = {
  id: 'd_cr_ambrose', owner: 'npc_cr_08',
  start: [{ if: { flag: 'cr_fight_wardens' }, node: 'fight' }, { if: IN, node: 'in' }, { if: { flag: 'ambrose_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A sergeant in grey that has been pressed, with a carbine he has never fired up here and a face that has turned back better people than you with the same courtesy. "Face to the lens." You do. The green light thinks. "Sergeant Ambrose. The lens decides; I say it aloud. Chit, pass, or standing. The help goes round the back."',
      effects: [{ set: 'ambrose_met' }, { learn: 'ambrose_seen' }],
      options: [
        { id: 'ambrose.chit', text: '(Show the chit.) House Lorne\'s guest.', if: { item: 'k_masque_chit' }, effects: [{ set: 'cr_entry', value: 'chit' }, { learn: 'cr_entered' }, { decision: { id: 'cr_entry', text: 'You went up to the Crown on a Masque chit that was not yours.' } }], next: 'chit_in' },
        { id: 'ambrose.pass', text: '(Show the service pass.) Kitchens.', if: { item: 'k_cr_service_pass' }, effects: [{ set: 'cr_entry', value: 'contract' }, { learn: 'cr_entered' }, { decision: { id: 'cr_entry', text: 'You went up to the Crown as the help, on a kitchen pass.' } }], next: 'pass_in' },
        { id: 'ambrose.card', text: '(Show the plain card.)', if: { item: 'k_latch_card' }, effects: [{ set: 'cr_entry', value: 'contract' }, { learn: 'cr_entered' }, { decision: { id: 'cr_entry', text: 'You went up to the Crown on the Concern\'s card.' } }], next: 'card_in' },
        { id: 'ambrose.exchange', text: 'Exchange business. Factor\'s hand.', if: { member: 'tollmen', rank: 'hand' }, effects: [{ set: 'cr_entry', value: 'contract' }, { learn: 'cr_entered' }], next: 'exchange_in' },
        { id: 'ambrose.standing', text: 'Client of a house.', if: { member: 'tenured' }, effects: [{ set: 'cr_entry', value: 'standing' }, { learn: 'cr_entered' }], next: 'standing_in' },
        { id: 'ambrose.lens', text: '(Face the lens, and wait.)', if: { knows: 'md_magistrate_designate' }, effects: [{ set: 'cr_entry', value: 'lens' }, { learn: 'cr_entered' }, { learn: 'cr_magistrate_known' }, { decision: { id: 'cr_entry', text: 'The Crown\'s lens admitted you on sight, and said why, aloud.' } }], next: 'lens_in' },
        { id: 'ambrose.belong', text: '(Walk past him like you belong.)', if: { wearing: 'r_velvet' }, check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'masque_velvet' }, dc: -10, why: 'the Madame told you the only thing they check' }] }, next: 'belong_in', fail: 'belong_no' },
        { id: 'ambrose.force', text: '(Go through them.)', next: 'force' },
        bye,
      ],
    },
    again: {
      text: '"Chit, pass, or standing."',
      options: [
        { id: 'ambrose.chit.again', text: '(Show the chit.) House Lorne\'s guest.', if: { item: 'k_masque_chit' }, effects: [{ set: 'cr_entry', value: 'chit' }, { learn: 'cr_entered' }, { decision: { id: 'cr_entry', text: 'You went up to the Crown on a Masque chit that was not yours.' } }], next: 'chit_in' },
        { id: 'ambrose.pass.again', text: '(Show the service pass.) Kitchens.', if: { item: 'k_cr_service_pass' }, effects: [{ set: 'cr_entry', value: 'contract' }, { learn: 'cr_entered' }, { decision: { id: 'cr_entry', text: 'You went up to the Crown as the help, on a kitchen pass.' } }], next: 'pass_in' },
        { id: 'ambrose.card.again', text: '(Show the plain card.)', if: { item: 'k_latch_card' }, effects: [{ set: 'cr_entry', value: 'contract' }, { learn: 'cr_entered' }, { decision: { id: 'cr_entry', text: 'You went up to the Crown on the Concern\'s card.' } }], next: 'card_in' },
        { id: 'ambrose.exchange.again', text: 'Exchange business. Factor\'s hand.', if: { member: 'tollmen', rank: 'hand' }, effects: [{ set: 'cr_entry', value: 'contract' }, { learn: 'cr_entered' }], next: 'exchange_in' },
        { id: 'ambrose.standing.again', text: 'Client of a house.', if: { member: 'tenured' }, effects: [{ set: 'cr_entry', value: 'standing' }, { learn: 'cr_entered' }], next: 'standing_in' },
        { id: 'ambrose.lens.again', text: '(Face the lens, and wait.)', if: { knows: 'md_magistrate_designate' }, effects: [{ set: 'cr_entry', value: 'lens' }, { learn: 'cr_entered' }, { learn: 'cr_magistrate_known' }, { decision: { id: 'cr_entry', text: 'The Crown\'s lens admitted you on sight, and said why, aloud.' } }], next: 'lens_in' },
        { id: 'ambrose.belong.again', text: '(Walk past him like you belong.)', if: { wearing: 'r_velvet' }, check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'masque_velvet' }, dc: -10, why: 'the Madame told you the only thing they check' }] }, next: 'belong_in', fail: 'belong_no' },
        { id: 'ambrose.force.again', text: '(Go through them.)', next: 'force' },
        bye,
      ],
    },
    chit_in: { text: 'He reads it without touching it. "Lorne. One guest." He looks at the lens; the lens looks at you; nobody says that House Lorne\'s guest was going to be somebody else. "The hall is straight on. Dace keeps the door."', options: [{ text: '(Through the gate.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'terraces', minutes: 2 } }], exit: true }] },
    pass_in: { text: '"Kitchens." He does not look at the pass, or at you; that is what a pass is for. "Round the back. Brisk. Don\'t come out the front."', options: [{ text: '(Round the back.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'service', minutes: 2 } }], exit: true }] },
    card_in: { text: 'He looks at the card and something goes out of his shoulders. "The Concern\'s people are expected." He says it to the lens, not to you. "Straight on."', options: [{ text: '(Through the gate.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'terraces', minutes: 2 } }], exit: true }] },
    exchange_in: { text: '"The Exchange." He has a list and you are on it in a hand that is not his. "Straight on. Mind the lens; it has you now."', options: [{ text: '(Through the gate.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'terraces', minutes: 2 } }], exit: true }] },
    standing_in: { text: '"A house\'s client." The lens agrees, which is the only agreement that counts. "Straight on."', options: [{ text: '(Through the gate.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'terraces', minutes: 2 } }], exit: true }] },
    lens_in: { text: 'The green light thinks for a long time, and clicks twice, and the sergeant reads the screen in his booth and reads it again. "ADMIT ON SIGHT." He says it as the lens says it, flat, and then, to you, with something else in it: "Magistrate-designate." The other warden has heard. By the time you reach the gate the terraces have heard.', effects: [{ news: { tag: 'cr_designate', text: 'the Crown\'s lens admitted a stranger on sight and called them Magistrate-designate, aloud', valence: 2, size: 6, at: 'meridian' } }], options: [{ text: '(Through the gate.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'terraces', minutes: 2 } }], exit: true }] },
    belong_in: { text: 'You walk the way the Madame walked you across her room three times, with the clothes doing the talking. The lens looks. The sergeant looks at the lens, and the lens does not disagree, because the lens has never been asked to disagree with bottle-green. "Straight on."', effects: [{ set: 'cr_entry', value: 'disguise' }, { learn: 'cr_entered' }, { xp: 60 }, { decision: { id: 'cr_entry', text: 'You walked into the Crown in the Velvet\'s clothes, and the lens let bottle-green through.' } }], options: [{ text: '(Through the gate.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'terraces', minutes: 2 } }], exit: true }] },
    belong_no: { text: 'You walk. The lens looks, and thinks, and the sergeant reads the screen. "The lens disagrees." He is almost kind. "The car is behind you. Take it, and nobody files anything."', options: [{ text: '(Back down.)', effects: [{ event: 'goto', data: { location: 'md_precinct', spawn: 'loop', minutes: 10 } }], exit: true }, { text: '(Go through them.)', next: 'force' }] },
    force: { text: 'He sees it before you move, which is what he is for. The carbine comes up. "Nobody forces the Crown." The other two come off the wall.', effects: [{ set: 'cr_fight_wardens' }, { decision: { id: 'cr_force', text: 'You went for the Crown\'s lift wardens.' } }], options: [{ text: '(Go.)', effects: [{ event: 'combat' }], exit: true }, { text: '(Stand down.)', effects: [{ set: 'cr_fight_wardens', value: false }], exit: true }] },
    in: { text: '"You\'re in. Mind the lens."', options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the terraces

export const d_cr_glass_table: DialogueDef = {
  id: 'd_cr_glass_table', owner: 'narrator', start: [{ node: 'table' }],
  nodes: { table: { text: [{ if: { knows: 'crown_seen_reverie' }, text: 'A glass table by the pool, with a cup on it. You have stood here. You have stood exactly here, holding a tray, with hands that were not yours, while a woman in grey silk did not look at you. The cup is the same cup. The hands, this time, are your own.' }, { text: 'A glass table by the pool with a cup on it and a woman beside it who sees everything from here, which is what here is for.' }], effects: [{ learn: 'cr_table_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};
export const d_cr_hall_sign = SIGN('d_cr_hall_sign', 'THE MASQUE — HOUSE VANE — THE COMMITTEE SITS AT THE TOAST. Over the doors a lens, bigger than the lobby\'s, with a green light that does not blink. Everyone who goes in looks up at it, and smiles, because they have been taught to.', 'cr_hall_sign_seen');
export const d_cr_salon_sign = SIGN('d_cr_salon_sign', 'A crane, in old brass, over a door: ASHBY-CRANE. The brass is older than the hall\'s gilt and has been polished more often, by people who were paid less.', 'cr_salon_sign_seen');
export const d_cr_studio_sign = SIGN('d_cr_studio_sign', 'HALDEN — PORTRAITS — AS YOU WILL BE. Under it, a smaller card: SITTINGS BY APPOINTMENT. FORECAST SHEETS TO BE SUPPLIED BY THE CLIENT.', 'cr_studio_sign_seen');
export const d_cr_kitchen_sign = SIGN('d_cr_kitchen_sign', 'STAFF. The door is metal and the terraces\' side of it is painted to look like the terraces. The kitchens\' side is not painted at all.', 'cr_kitchen_sign_seen');
export const d_cr_view = SIGN('d_cr_view', 'The parapet. All of Meridian under it in haze: the Precinct a grid, Old Market a stain, the canal a bright thread, the Stacks a wall with lights in it, the broken bridge a finger pointing at the Docks. You cannot see the Sink at all. That is the point of up here.', 'crown_view');

// ---------------------------------------------------------------- the hall door: House Vane's duellist

export const d_cr_dace: DialogueDef = {
  id: 'd_cr_dace', owner: 'npc_cr_03',
  start: [{ if: { flag: 'cr_alarm' }, node: 'alarm' }, { if: { flag: 'cr_duel' }, node: 'after_duel' }, { if: { flag: 'cr_hall_open' }, node: 'open' }, { if: { flag: 'dace_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man at the hall doors in House Vane\'s green with a sabre on his hip that is not for show and a scar on his cheek that was. "Aurel Dace. The house\'s door." He looks at your shoes, which is where he looks at everyone. "Chit, name, or face. The help goes round the back."',
      effects: [{ set: 'dace_met' }, { learn: 'dace_seen' }],
      options: [
        { id: 'dace.chit', text: '(The chit.) House Lorne\'s guest.', if: { flag: 'cr_entry', eq: 'chit' }, effects: [{ set: 'cr_hall_open' }], next: 'admit' },
        { id: 'dace.standing', text: 'Client of a house.', if: { any: [{ member: 'tenured' }, { flag: 'cr_entry', eq: 'standing' }] }, effects: [{ set: 'cr_hall_open' }], next: 'admit' },
        { id: 'dace.lens', text: 'The lens admitted me on sight. Ask it.', if: { flag: 'cr_entry', eq: 'lens' }, effects: [{ set: 'cr_hall_open' }], next: 'admit_lens' },
        { id: 'dace.disguise', text: '(Say nothing. Belong.)', if: { flag: 'cr_entry', eq: 'disguise' }, check: { skill: 'speech', dc: 30 }, next: 'admit_quiet', fail: 'shoes' },
        { id: 'dace.contract', text: 'Kitchens.', if: { flag: 'cr_entry', eq: 'contract' }, next: 'help' },
        { id: 'dace.duel', text: 'I stand for House Ashby-Crane. Draw.', if: { all: [{ knows: 'cr_honora_champion' }, { not: { flag: 'cr_duel' } }, QUIET, OPEN] }, next: 'draw' },
        { id: 'dace.who', text: 'What are you to the house?', next: 'who', once: true },
        bye,
      ],
    },
    again: { text: '"Chit, name, or face."', options: [{ id: 'dace.chit.again', text: '(The chit.) House Lorne\'s guest.', if: { flag: 'cr_entry', eq: 'chit' }, effects: [{ set: 'cr_hall_open' }], next: 'admit' }, { id: 'dace.standing.again', text: 'Client of a house.', if: { any: [{ member: 'tenured' }, { flag: 'cr_entry', eq: 'standing' }] }, effects: [{ set: 'cr_hall_open' }], next: 'admit' }, { id: 'dace.lens.again', text: 'The lens admitted me on sight.', if: { flag: 'cr_entry', eq: 'lens' }, effects: [{ set: 'cr_hall_open' }], next: 'admit_lens' }, { id: 'dace.disguise.again', text: '(Say nothing. Belong.)', if: { flag: 'cr_entry', eq: 'disguise' }, check: { skill: 'speech', dc: 30 }, next: 'admit_quiet', fail: 'shoes' }, { id: 'dace.contract.again', text: 'Kitchens.', if: { flag: 'cr_entry', eq: 'contract' }, next: 'help' }, { id: 'dace.duel.again', text: 'I stand for House Ashby-Crane. Draw.', if: { all: [{ knows: 'cr_honora_champion' }, { not: { flag: 'cr_duel' } }, QUIET, OPEN] }, next: 'draw' }, { id: 'dace.who.again', text: 'What are you to the house?', if: { not: { seen: 'dace.who' } }, next: 'who' }, bye] },
    open: { text: '"Go in." He does not move his eyes from the promenade.', options: [{ id: 'dace.duel.open', text: 'I stand for House Ashby-Crane. Draw.', if: { all: [{ knows: 'cr_honora_champion' }, { not: { flag: 'cr_duel' } }, QUIET, OPEN] }, next: 'draw' }, { id: 'dace.who.open', text: 'What are you to the house?', if: { not: { seen: 'dace.who' } }, next: 'who' }, bye] },
    admit: { text: '"Go in." He steps aside exactly as far as he has to.', options: [{ text: '(In.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'hall', minutes: 1 } }], exit: true }] },
    admit_lens: { text: 'He does not ask it. He has heard; the terraces have heard. He steps aside a full pace, which from Dace is a bow. "Designate."', effects: [{ learn: 'cr_magistrate_known' }], options: [{ text: '(In.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'hall', minutes: 1 } }], exit: true }] },
    admit_quiet: { text: 'He looks at your shoes. The Madame did the shoes. He steps aside.', effects: [{ set: 'cr_hall_open' }, { xp: 40 }], options: [{ text: '(In.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'hall', minutes: 1 } }], exit: true }] },
    shoes: { text: 'He looks at your shoes for a second longer than he looked at anyone else\'s. "The help goes round the back." He does not raise his voice; he does not need to; he has said it to the lens.', options: [bye] },
    help: { text: '"Round the back. Brisk." He has already stopped looking at you.', options: [bye] },
    who: { text: '"The house\'s blade. Vane has not fought in two seasons; a house that has a Dace does not need to." He almost smiles. "Honora\'s man took the Concern\'s coin and the lift. She has a bravo from the Row in borrowed shoes. One can tell by the shoes."', effects: [{ learn: 'cr_dace_who' }], options: [bye] },
    draw: { text: 'He looks at you properly for the first time, at your hands and your feet and the blade. "For Ashby-Crane." The hall has gone quiet behind him. "A duel is a vote with the arithmetic shown. The Chair follows it; that is the one rule up here older than the lens." The sabre comes out as if it had been waiting. "To the floor. Not to the death; we are not the Row."', options: [{ text: '(Draw.)', effects: [{ event: 'fight', data: { pit: { win: [{ set: 'cr_duel', value: 'ashby' }, { set: 'cr_duel_won' }, { xp: 150 }, { rep: { faction: 'tenured', respect: 12 } }, { decision: { id: 'cr_duel', text: 'You stood for House Ashby-Crane at the Masque and put Vane\'s duellist on the floor.' } }, { news: { tag: 'cr_duel', text: 'a stranger put Aurel Dace on the floor at Vane\'s Masque, for Ashby-Crane', valence: 3, size: 7, at: 'meridian' } }], lose: [{ set: 'cr_duel_lost' }, { xp: 30 }, { decision: { id: 'cr_duel', text: 'You stood for House Ashby-Crane at the Masque and went down to Vane\'s duellist.' } }] } } }], exit: true }, { text: '(Not yet.)', exit: true }] },
    after_duel: { text: [{ if: { flag: 'cr_duel', eq: 'ashby' }, text: 'He is on his feet again, with his arm bound, and he bows to you a quarter of an inch. "Well struck." He means it; it is the only thing up here anyone has meant all night.' }, { if: { flag: 'cr_duel', eq: 'vane' }, text: '"The Row\'s man went down. The house notes it." He looks at your blade the way he looked at your shoes. "Vane will remember you. That is not always good."' }, { text: '"You stood." He says it the way other people say well done. "Few do, up here. Go in; the house does not refuse the floor to someone who has been on it."' }], effects: [{ set: 'cr_hall_open' }], options: [{ text: '(In.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'hall', minutes: 1 } }], exit: true }, bye] },
    alarm: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- House Vane

export const d_cr_celestine: DialogueDef = {
  id: 'd_cr_celestine', owner: 'npc_cr_01',
  start: [{ if: { flag: 'cr_alarm' }, node: 'alarm' }, { if: { flag: 'cr_chair' }, node: 'after' }, { if: { flag: 'celestine_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { knows: 'cr_magistrate_known' }, text: 'A woman in grey silk at a table with one cup on it, who has been looking at you since you came in because everyone has. "Celestine Vane. The house\'s." She does not offer a hand; she offers the chair beside her, which up here is more. "The lens said a word in my lobby tonight that it has not said in thirty years. Sit. Houses collect the future; it is the only thing we still make."' },
        { if: { flag: 'cr_entry', eq: 'chit' }, text: 'A woman in grey silk at a table with one cup on it. "Celestine Vane. The house\'s." She looks at the chit in your hand without appearing to. "Marguerite Lorne has no guest. Marguerite has a son at the Row. You are, then, a story, and I collect those." The chair beside her.' },
        { text: 'A woman in grey silk at a table with one cup on it, who looks at you the way the lens did and arrives at an answer faster. "Celestine Vane. The house\'s. It is my season." The chair beside her. "Sit. Everyone sits eventually; the ones who do it early are remembered."' },
      ],
      effects: [{ set: 'celestine_met' }, { learn: 'celestine_seen' }],
      options: [
        { id: 'cel.chair', text: 'What is the Chair?', next: 'chair', once: true },
        { id: 'cel.client', text: 'Houses take clients. Take me.', if: { all: [{ knows: 'cr_magistrate_known' }, { not: { member: 'tenured' } }] }, next: 'client' },
        { id: 'cel.champion', text: 'Honora has a bravo from the Row. Who stands for Vane?', if: { all: [OPEN, QUIET, { not: { flag: 'cr_duel' } }, { not: { knows: 'cr_celestine_champion' } }] }, next: 'champion' },
        { id: 'cel.render', text: '(Show her the studio\'s print: her, in the Chair.)', if: { item: 'k_cr_render_vane' }, next: 'render' },
        { id: 'cel.reel', text: '(Put the reel on the table.) A sitting, this season. Recorded as art.', if: { item: 'k_cr_reel' }, next: 'reel' },
        { id: 'cel.concern', text: 'The Concern sent a man. The Concern never sends a man.', if: { knows: 'cr_quill_seen' }, next: 'concern', once: true },
        bye,
      ],
    },
    again: { text: '"Sit."', options: [{ id: 'cel.chair.again', text: 'What is the Chair?', if: { not: { seen: 'cel.chair' } }, next: 'chair' }, { id: 'cel.client.again', text: 'Houses take clients. Take me.', if: { all: [{ knows: 'cr_magistrate_known' }, { not: { member: 'tenured' } }] }, next: 'client' }, { id: 'cel.champion.again', text: 'Who stands for Vane?', if: { all: [OPEN, QUIET, { not: { flag: 'cr_duel' } }, { not: { knows: 'cr_celestine_champion' } }] }, next: 'champion' }, { id: 'cel.render.again', text: '(Show her the studio\'s print: her, in the Chair.)', if: { item: 'k_cr_render_vane' }, next: 'render' }, { id: 'cel.reel.again', text: '(Put the reel on the table.)', if: { item: 'k_cr_reel' }, next: 'reel' }, { id: 'cel.concern.again', text: 'The Concern sent a man.', if: { all: [{ knows: 'cr_quill_seen' }, { not: { seen: 'cel.concern' } }] }, next: 'concern' }, bye] },
    chair: { text: '"The Committee of the Terraces has a Chair. The Chair signs." She turns the cup a quarter turn. "The road to the Docks. The bridge\'s near end. The water the Precinct lets up. And the Committee\'s forecasts, which the Exchange sells us by the sheet and which the Chair may sell on." A small smile. "The vote is at the toast. The file is not in doubt. Only the room."', effects: [{ learn: 'cr_chair_heard' }, { lead: 'l_bw_tenured_road' }], options: [bye] },
    client: { text: '"Done." She says it before you have finished. "A client of House Vane: a chit of your own, next season; a chair in this hall; the house\'s name on your trouble, if you have trouble." She looks at you with the whole file behind her eyes. "A designate should have a house. The house would rather it were this one."', effects: [{ enlist: 'tenured', rank: 'client' }, { set: 'cr_client', value: 'vane' }, { xp: 60 }, { rep: { faction: 'tenured', respect: 8 } }, { decision: { id: 'cr_client', text: 'You took House Vane as your house.' } }], options: [bye] },
    champion: { text: '"Dace keeps the door. A door is not a Chair." She does not look at the salon across the terrace. "Honora will call it, because Honora buys and the Row\'s man is cheap. If she calls it, the Chair follows the floor; that is the one rule up here older than the lens." She looks at your hands. "Stand for Vane. There is a blade on the wall behind you. The house remembers who stands."', effects: [{ learn: 'cr_celestine_champion' }], options: [{ id: 'champion.blade', text: '(Take the blade.)', if: { not: { item: 'w_sabre' } }, effects: [{ give: 'w_sabre' }], exit: true }, bye] },
    render: { text: 'She looks at it for a long moment, at herself in a chair she has not sat in, dated this season. "Halden\'s machine." She does not give it back. "A hundred, for not showing it to Honora. The file is not in doubt; the room would be, if it saw this, because rooms are perverse."', options: [{ id: 'render.sell', text: '(Take the hundred.)', effects: [{ take: 'k_cr_render_vane' }, { give: 'tolls', count: 100 }, { learn: 'cr_vane_bought_render' }, { trust: { npc: 'npc_cr_01', by: 10 } }], exit: true }, { id: 'render.keep', text: '(Take it back.)', exit: true }] },
    reel: { text: 'She does not touch it. She looks at the sleeve, which is her house\'s, and at you, and the cup stops turning. "Art." A long breath. "Two hundred. And the house\'s hand, which is worth more than two hundred and will be worth more than that after the toast." She does not say what is on it. She does not need to; you both know, and the room does not.', options: [{ id: 'reel.sell', text: '(Slide it across.)', effects: [{ take: 'k_cr_reel' }, { give: 'tolls', count: 200 }, { set: 'cr_reel_sold' }, { set: 'cr_concern', value: 'kept' }, { enlist: 'tenured', rank: 'retainer' }, { rep: { faction: 'tenured', respect: 15 } }, { xp: 100 }, { decision: { id: 'cr_reel', text: 'You sold House Vane its own reel, and its secret with it.' } }], next: 'retainer' }, { id: 'reel.keep', text: '(Keep it.)', exit: true }] },
    retainer: { text: '"Retainer." She says it to the room, lightly, and the room hears. The reel goes under the table and does not come out. "The house\'s hand. You will find the lens kinder."', options: [bye] },
    concern: { text: '"Mr Quill is a guest." The cup turns. "The Concern buys futures; everyone buys futures; the Exchange sells them to anyone with a sleeve. If the Concern has sent a man to a Masque, it is because the Concern has manners, late in life." She looks at you until you understand that is all you will get, and that she knows you know.', effects: [{ learn: 'cr_vane_evasive' }], options: [bye] },
    after: { text: [
      { if: { flag: 'cr_concern', eq: 'exposed' }, text: 'She is still at the table. Nobody is near it. The cup has not been touched and the room has turned its back on her the way a room up here does, all at once, politely. She looks at you once. It is enough.' },
      { if: { flag: 'cr_chair', eq: 'vane' }, text: '"The Chair." She says it the way other people say good morning. "The file was not in doubt. The room, briefly, was. You were in the room." The cup. "The house remembers."' },
      { text: '"Ashby-Crane." She turns the cup a quarter turn. "A season. There will be another; there is always another, up here; that is what up here is." She looks at you. "You were in the room. I remember rooms."' },
    ], options: [bye] },
    alarm: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_cr_cup: DialogueDef = {
  id: 'd_cr_cup', owner: 'narrator', start: [{ if: { flag: 'cr_celestine_dead' }, node: 'after' }, { node: 'cup' }],
  nodes: {
    cup: {
      text: 'The hostess\'s table: one cup, grey glass, hers, for the toast. Nobody up here asks what was in a cup. The room is looking at the lectern.',
      options: [
        { id: 'cup.pour', text: '(Tip the vial into the cup.)', if: { all: [{ item: 'k_cr_vial' }, ALIVE, QUIET] }, check: { skill: 'stealth', dc: 40, mods: [{ if: { skill: 'medicine', gte: 40 }, dc: -10, why: 'you know the dose and the moment' }, { if: { flag: 'cr_entry', eq: 'contract' }, dc: -10, why: 'nobody looks at the help' }] }, next: 'poured', fail: 'seen' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    poured: { text: 'A finger of clear into grey glass, and the vial into your sleeve, and the room still looking at the lectern. The toast comes an hour later. She drinks, and speaks, and sits, and is ill in the quiet way the Crown is ill, and by the time the car goes down she is not in it. Lawful, the wardens will say in the morning, because nobody up here asks what was in a cup.', effects: [{ take: 'k_cr_vial' }, { set: 'cr_celestine_dead' }, { set: 'cr_chair', value: 'ashby' }, { set: 'cr_concern', value: 'kept' }, { set: 'cr_poisoned' }, { time: 90 }, { xp: 150 }, { rep: { faction: 'tenured', respect: -5, fear: 10 } }, { decision: { id: 'cr_poison', text: 'You put Steward Pell\'s vial in Celestine Vane\'s cup at the toast.' } }, { news: { tag: 'cr_vane_dead', text: 'Celestine Vane took ill at her own Masque and was dead before the car went down; the Chair went to Ashby-Crane', valence: -9, size: 9, at: 'meridian' } }], options: [{ text: '(Walk away from the table.)', exit: true }] },
    seen: { text: 'The vial is out and over the cup and a girl in the house\'s green has seen it, because girls in the house\'s green are paid to see. She does not scream. She says, "Dace," in an ordinary voice, and the bell starts that is not for dinner.', effects: [{ set: 'cr_alarm' }, { set: 'cr_poison_seen' }, { rep: { faction: 'tenured', respect: -25, fear: 5 } }, { decision: { id: 'cr_poison', text: 'You were seen at Celestine Vane\'s cup with a vial.' } }, { news: { tag: 'cr_poison_seen', text: 'somebody was caught at Celestine Vane\'s cup at the Masque with a vial', valence: -8, size: 8, at: 'meridian' } }], options: [{ text: '(Run.)', exit: true }] },
    after: { text: 'The hostess\'s table. One cup, grey glass, empty, and the chair beside it that nobody sits in.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_cr_osric: DialogueDef = {
  id: 'd_cr_osric', owner: 'npc_cr_10',
  start: [{ if: { flag: 'osric_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young man in House Vane\'s green at the edge of his mother\'s hall, looking at the lift the way a boy at the Row looks at a glass. "Osric Vane. The son." He says it like a sentence he has been given. "You came up the car. What is it like, down? Fenwick says it hurts and you can taste things."',
      effects: [{ set: 'osric_met' }, { learn: 'osric_seen' }],
      options: [
        { id: 'osric.mother', text: 'Your mother sold the Chair before she had it. Everyone says.', next: 'mother', once: true },
        { id: 'osric.reel', text: 'The reel. Give it to me.', if: { all: [{ knows: 'cr_reel_where' }, { not: { item: 'k_cr_reel' } }, { not: { flag: 'cr_reel_given' } }, { any: [{ flag: 'cr_tillie', eq: 'row' }, { flag: 'cr_tillie', eq: 'stays' }] }] }, next: 'reel_yes' },
        { id: 'osric.reel_no', text: 'The reel. Give it to me.', if: { all: [{ knows: 'cr_reel_where' }, { not: { item: 'k_cr_reel' } }, { not: { flag: 'cr_reel_given' } }, { not: { any: [{ flag: 'cr_tillie', eq: 'row' }, { flag: 'cr_tillie', eq: 'stays' }] } }] }, next: 'reel_no' },
        { id: 'osric.tillie', text: 'Ottilie Ashby-Crane.', next: 'tillie', once: true },
        bye,
      ],
    },
    again: { text: '"What is it like, down?"', options: [{ id: 'osric.mother.again', text: 'Your mother sold the Chair before she had it.', if: { not: { seen: 'osric.mother' } }, next: 'mother' }, { id: 'osric.reel.again', text: 'The reel.', if: { all: [{ knows: 'cr_reel_where' }, { not: { item: 'k_cr_reel' } }, { not: { flag: 'cr_reel_given' } }, { any: [{ flag: 'cr_tillie', eq: 'row' }, { flag: 'cr_tillie', eq: 'stays' }] }] }, next: 'reel_yes' }, { id: 'osric.reel_no.again', text: 'The reel.', if: { all: [{ knows: 'cr_reel_where' }, { not: { item: 'k_cr_reel' } }, { not: { flag: 'cr_reel_given' } }, { not: { any: [{ flag: 'cr_tillie', eq: 'row' }, { flag: 'cr_tillie', eq: 'stays' }] } }] }, next: 'reel_no' }, { id: 'osric.tillie.again', text: 'Ottilie Ashby-Crane.', if: { not: { seen: 'osric.tillie' } }, next: 'tillie' }, bye] },
    mother: { text: '"I was in the room." He says it to the lift. "Quill, and Mother, and a sheet with the Committee\'s crest, and a word I had not heard her use: *terms*. The Committee\'s forecasts, by the season, to the Concern, once she signs." He turns. "The house records its sittings. Art, she calls it. There is a cabinet by the lectern and a reel in it with this season on it, and she does not know the room was listening, because it is her room."', effects: [{ learn: 'cr_osric_room' }, { learn: 'cr_reel_where' }, { lead: 'l_cr_concern_chair' }], options: [bye] },
    reel_yes: { text: 'He looks at the salon across the terrace, where a window is empty, and something in his shoulders lets go. "She\'s out of it. Then so am I." He is gone four minutes and comes back with a sleeve in his coat, House Vane\'s green, and puts it in your hand without looking at it. "Art. Do what you like with it. I have never wanted anything less than I want the Chair."', effects: [{ give: 'k_cr_reel' }, { set: 'cr_reel_given' }, { xp: 60 }, { trust: { npc: 'npc_cr_10', by: 20 } }], options: [bye] },
    reel_no: { text: '"Get Tillie out of this." He says it fast, as if he has been waiting to. "The marriage. The Chair sealed with the two of us, like a sheet with two stamps. She looks at the window; I look at the lift. Get her out of it, and I will get the reel out of the cabinet, and Mother can have her season without either of us in it."', effects: [{ learn: 'cr_osric_deal' }], options: [bye] },
    tillie: { text: '"Kind. She is kind and I am kind and the Committee thought that was a match." He looks at the salon. "She paid somebody down there to take her away. I know because she told me, because she is kind. I gave her the money."', effects: [{ learn: 'cr_osric_paid' }], options: [bye] },
  },
};

export const d_cr_quill: DialogueDef = {
  id: 'd_cr_quill', owner: 'npc_cr_11',
  start: [{ if: { flag: 'quill_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man at the back of the hall in a coat that is the only thing in the room not trying to be noticed, which is how you notice it. "Quill. The Concern\'s." He does not say which Concern. There is one. "We do not usually attend. This season warranted it."',
      effects: [{ set: 'quill_met' }, { learn: 'cr_quill_seen' }],
      options: [
        { id: 'quill.card', text: '(Show the plain card.)', if: { item: 'k_latch_card' }, next: 'card', once: true },
        { id: 'quill.why', text: 'The Concern never comes to a Masque.', next: 'why', once: true },
        { id: 'quill.reel', text: '(Show him the reel.) A sitting, this season.', if: { item: 'k_cr_reel' }, next: 'reel' },
        bye,
      ],
    },
    again: { text: '"Nobody has to decide anything tonight."', options: [{ id: 'quill.card.again', text: '(Show the plain card.)', if: { all: [{ item: 'k_latch_card' }, { not: { seen: 'quill.card' } }] }, next: 'card' }, { id: 'quill.why.again', text: 'The Concern never comes to a Masque.', if: { not: { seen: 'quill.why' } }, next: 'why' }, { id: 'quill.reel.again', text: '(Show him the reel.)', if: { item: 'k_cr_reel' }, next: 'reel' }, bye] },
    card: { text: 'He looks at it the way the lens looks at a face. "Latch\'s." He gives it back. "The Docks expect you. The Crown is a sideshow; it is a pleasant sideshow, and it signs things." He almost smiles. "Nobody has to decide anything tonight."', effects: [{ learn: 'concern_masque' }], options: [bye] },
    why: { text: '"Futures are the only thing the Crown still makes." He says it kindly. "The Exchange sells them by the sheet. The Committee buys by the season, and the Chair may sell on, and a Chair that sells on is worth attending." He looks at the lectern. "We buy what is made. We always have."', effects: [{ lead: 'l_cr_concern_chair' }], options: [bye] },
    reel: { text: 'He does not reach for it. "Art." A pause the length of a figure being arrived at. "Three hundred, and it goes down the lift in my coat and nobody up here hears a word that was said in a room they were not in." He waits. He is very good at waiting.', options: [{ id: 'quill.sell', text: '(Take the three hundred.)', effects: [{ take: 'k_cr_reel' }, { give: 'tolls', count: 300 }, { set: 'cr_reel_sold' }, { set: 'cr_concern', value: 'kept' }, { learn: 'concern_favour' }, { xp: 80 }, { decision: { id: 'cr_reel', text: 'You sold the Concern\'s man the reel of House Vane\'s terms.' } }], next: 'sold' }, { id: 'quill.no', text: '(Put it away.)', exit: true }] },
    sold: { text: 'The reel goes into the coat and the coat does not change shape. "The Concern remembers a settled thing." He says it the way Latch said it. "Nobody has to decide anything tonight."', options: [bye] },
  },
};

export const d_cr_lorne: DialogueDef = {
  id: 'd_cr_lorne', owner: 'npc_cr_06',
  start: [{ if: { flag: 'lorne_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [{ if: { flag: 'cr_entry', eq: 'chit' }, text: 'A woman at a glass table by the pool who has seen you since the gate, because she sees everything from here. "Marguerite Lorne." She looks at the chit in your coat without looking. "My son\'s. He lost it at a Dust table to feel something. Sit; you are my guest, apparently, and I should like to know what I am hosting."' }, { text: 'A woman at a glass table by the pool with a cup she has not drunk from, who sees everything from here because that is what here is for. "Marguerite Lorne. House Lorne; it used to mean something; it still means a chair by the pool." The chair. "Sit. Everyone sits eventually."' }],
      effects: [{ set: 'lorne_met' }, { learn: 'lorne_seen' }],
      options: [
        { id: 'lorne.fenwick', text: 'He\'s at the Row, drinking to feel something. He\'s well. He\'s going to be ill, and it\'s going to be wonderful.', if: { all: [{ flag: 'cr_entry', eq: 'chit' }, { not: { flag: 'cr_lorne_word' } }] }, next: 'fenwick' },
        { id: 'lorne.gossip', text: 'What does the Crown say about the Chair?', next: 'gossip', once: true },
        bye,
      ],
    },
    again: { text: '"Sit."', options: [{ id: 'lorne.fenwick.again', text: 'Your son is at the Row. He\'s well.', if: { all: [{ flag: 'cr_entry', eq: 'chit' }, { not: { flag: 'cr_lorne_word' } }] }, next: 'fenwick' }, { id: 'lorne.gossip.again', text: 'What does the Crown say about the Chair?', if: { not: { seen: 'lorne.gossip' } }, next: 'gossip' }, bye] },
    fenwick: { text: 'She does not move for a moment, and then she drinks from the cup, which she has not done all evening. "Wonderful." She puts it down. "House Lorne has one vote on the Committee and two silences, which are worth more. They are yours tonight, for whichever house you like. Say so at the lectern; the clerk knows my hand."', effects: [{ set: 'cr_lorne_word' }, { trust: { npc: 'npc_cr_06', by: 20 } }, { xp: 40 }, { rep: { faction: 'tenured', respect: 6 } }], options: [bye] },
    gossip: { text: '"That the file has decided, and the room is pretending it hasn\'t. That Honora has a bravo from the Row and nobody to stand with him. That Celestine has a man at the back of her hall in a coat that is not trying, from a company that never comes." She looks at the hall. "Quill never comes. He came. That is the whole of the gossip, and it is enough."', effects: [{ learn: 'cr_lorne_gossip' }, { learn: 'cr_quill_seen' }], options: [bye] },
  },
};

// ---------------------------------------------------------------- House Ashby-Crane

export const d_cr_honora: DialogueDef = {
  id: 'd_cr_honora', owner: 'npc_cr_02',
  start: [{ if: { flag: 'cr_alarm' }, node: 'alarm' }, { if: { flag: 'cr_chair' }, node: 'after' }, { if: { flag: 'honora_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in the salon in a chair older than the hall, with a crane in old brass over the door and a daughter at the window. "Honora Ashby-Crane." She looks at you once, all of you, and files it. "You are not Vane\'s. Vane\'s people smile. Sit down and tell me what you are, and I will tell you what you are worth to a house that does not sell."',
      effects: [{ set: 'honora_met' }, { learn: 'honora_seen' }],
      options: [
        { id: 'hon.why', text: 'Why does Ashby-Crane want the Chair?', next: 'why', once: true },
        { id: 'hon.champion', text: 'Who stands for the house tonight?', if: { all: [OPEN, QUIET, { not: { flag: 'cr_duel' } }, { not: { knows: 'cr_honora_champion' } }] }, next: 'champion' },
        { id: 'hon.client', text: 'Houses take clients. Take me.', if: { all: [{ knows: 'cr_magistrate_known' }, { not: { member: 'tenured' } }] }, next: 'client' },
        { id: 'hon.tillie', text: 'Your daughter paid a Broker to be taken out of this house.', if: { all: [{ quest: 'q_cr_kidnap' }, { knows: 'cr_tillie_met' }, { not: { flag: 'cr_tillie' } }] }, next: 'tillie' },
        { id: 'hon.render', text: '(Show her the studio\'s print: Vane, in the Chair.)', if: { item: 'k_cr_render_vane' }, next: 'render', once: true },
        bye,
      ],
    },
    again: { text: '"Sit down."', options: [{ id: 'hon.why.again', text: 'Why does Ashby-Crane want the Chair?', if: { not: { seen: 'hon.why' } }, next: 'why' }, { id: 'hon.champion.again', text: 'Who stands for the house tonight?', if: { all: [OPEN, QUIET, { not: { flag: 'cr_duel' } }, { not: { knows: 'cr_honora_champion' } }] }, next: 'champion' }, { id: 'hon.client.again', text: 'Houses take clients. Take me.', if: { all: [{ knows: 'cr_magistrate_known' }, { not: { member: 'tenured' } }] }, next: 'client' }, { id: 'hon.tillie.again', text: 'Your daughter paid a Broker to be taken out of this house.', if: { all: [{ quest: 'q_cr_kidnap' }, { knows: 'cr_tillie_met' }, { not: { flag: 'cr_tillie' } }] }, next: 'tillie' }, { id: 'hon.render.again', text: '(Show her the studio\'s print.)', if: { all: [{ item: 'k_cr_render_vane' }, { not: { seen: 'hon.render' } }] }, next: 'render' }, bye] },
    why: { text: '"Because Vane will sell it." She says it without heat. "The Chair signs the Committee\'s forecasts on to whoever the Chair likes, and Celestine has a man from the Concern at the back of her hall, and the Concern has never attended anything it was not about to own." The crane over the door. "This house has held a seat on that Committee for ninety years and sold nothing. That is not virtue. It is the only thing we have left that is ours."', effects: [{ learn: 'cr_honora_claim' }, { lead: 'l_cr_concern_chair' }], options: [bye] },
    champion: { text: '"Nobody." She says it flat. "My man took the Concern\'s coin and the lift last month. I have a bravo from the Row in borrowed shoes, whom Dace will cut in half for the hall\'s amusement." She looks at your hands. "A duel is a vote with the arithmetic shown; the Chair follows the floor; it is the one rule up here older than the lens. Stand for the house, against Dace, and the house will stand for you for as long as there is a house."', effects: [{ learn: 'cr_honora_champion' }], options: [{ id: 'hon.blade', text: '(Take a blade from the wall.)', if: { not: { item: 'w_sabre' } }, effects: [{ give: 'w_sabre' }], exit: true }, bye] },
    client: { text: '"Yes." She has thought about it since the lobby. "A client of Ashby-Crane. No chit; you will not need one; a chair in this room, which is older than the hall and will be here when the hall is a dome over nothing." She looks at the window. "A designate should have a house. Have one that does not sell."', effects: [{ enlist: 'tenured', rank: 'client' }, { set: 'cr_client', value: 'ashby' }, { xp: 60 }, { rep: { faction: 'tenured', respect: 8 } }, { decision: { id: 'cr_client', text: 'You took House Ashby-Crane as your house.' } }], options: [bye] },
    tillie: { text: 'She does not look at the window. "I know." A breath. "She told Osric, and Osric is kind, and kind people are very bad at secrets. Three hundred, to whoever brings me the Broker\'s name and the lift she means to use; the house pays better than the hatch." A pause. "Or tell me why I should let her go. I am listening. I have been listening since she was nine."', options: [{ id: 'tillie.sell', text: 'The hatch at Old Market. The service lift, at four, with the rubbish.', effects: [{ give: 'tolls', count: 300 }, { set: 'cr_tillie', value: 'sold' }, { set: 'cr_tillie_gone' }, { rep: { faction: 'tenured', respect: 10 } }, { xp: 60 }, { decision: { id: 'cr_tillie', text: 'You sold Honora Ashby-Crane her daughter\'s escape for three hundred.' } }], next: 'tillie_sold' }, { id: 'tillie.free', text: 'Because she will go anyway, and the next time she will not pay anyone to be careful about it. Call the marriage off.', check: { skill: 'speech', dc: 40, mods: [{ if: { flag: 'cr_tillie_together' }, dc: -15, why: 'she asked you to stand beside her, and you are standing' }, { if: { knows: 'cr_osric_paid' }, dc: -10, why: 'you know Osric gave her the money' }] }, next: 'tillie_free', fail: 'tillie_no' }, { text: 'I haven\'t decided.', exit: true }] },
    tillie_sold: { text: '"Four." She writes it on nothing. "The lift will be watched, and she will be in her room by five, and she will not know who told me, which is the only mercy up here." Three hundred, Crown-counted. "The hatch will not pay you. The hatch pays for results."', options: [bye] },
    tillie_free: { text: 'She looks at the window for the first time since you came in, and the girl at it does not turn round, and the woman in the old chair is suddenly sixty-one. "Off." She says it quietly. "The marriage. Tell Celestine the house declines; she will enjoy that. Tell my daughter —" She stops. "I will tell my daughter."', effects: [{ set: 'cr_tillie', value: 'stays' }, { set: 'cr_honora_favour' }, { xp: 100 }, { rep: { faction: 'tenured', respect: 6 } }, { decision: { id: 'cr_tillie', text: 'You talked Honora Ashby-Crane into calling off her daughter\'s marriage.' } }], options: [bye] },
    tillie_no: { text: '"Everyone goes anyway." The chair creaks. "That is what the lift is for. She will go with a house behind her or without one, and I have seen what the Row does to people without one." She looks at you. "Three hundred, or get out of my salon."', options: [bye] },
    render: { text: 'She looks at it for a long time, at Celestine Vane in a chair this house has wanted for ninety years, dated this season, by a machine that has never been wrong about a face. "The file\'s opinion." She gives it back. "I have been told what the file thinks since I was nine. It did not think I would live. Keep the picture; I should like to see it again, afterwards."', effects: [{ learn: 'cr_honora_render' }], options: [bye] },
    after: { text: [
      { if: { flag: 'cr_celestine_dead' }, text: '"The Chair." She does not say it as a victory. "Celestine took ill at her own toast and the Committee met in the morning with the chair beside her table empty, and voted the way frightened people vote." She looks at you. "I did not ask. I will not ask. The house does not sell; it does not always ask, either."' },
      { if: { flag: 'cr_chair', eq: 'ashby' }, text: '"The Chair." She lets the crane over the door hear it. "Ninety years. Nothing sold." She looks at you. "The house remembers who stood. Sit; you have a chair here, which is more than you have anywhere else in this city."' },
      { text: '"Vane." She says it the way other people say rain. "A season. There will be another; this house has outlived better seasons than Celestine\'s." She looks at the window. "You were in the room. The room was not yours. Rooms seldom are, up here."' },
    ], options: [bye] },
    alarm: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_cr_pell: DialogueDef = {
  id: 'd_cr_pell', owner: 'npc_cr_07',
  start: [{ if: { flag: 'pell_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The house\'s steward, by the shelves, with a ledger and the manner of a man who has arranged everything the house has ever been grateful for and nothing it has ever thanked him for. "Pell. The house\'s hands." He does not look up. "The house would rather not look at its hands. That is what a steward is."',
      effects: [{ set: 'pell_met' }, { learn: 'pell_seen' }],
      options: [
        { id: 'pell.cup', text: 'What would the house pay for the Chair, if nobody had to vote?', if: { all: [OPEN, ALIVE, { not: { item: 'k_cr_vial' } }, { not: { flag: 'cr_vial_taken' } }, { not: { flag: 'cr_vial_refused' } }] }, next: 'cup' },
        { id: 'pell.house', text: 'What does the house keep on those shelves?', next: 'house', once: true },
        bye,
      ],
    },
    again: { text: '"The house\'s hands."', options: [{ id: 'pell.cup.again', text: 'What would the house pay for the Chair, if nobody had to vote?', if: { all: [OPEN, ALIVE, { not: { item: 'k_cr_vial' } }, { not: { flag: 'cr_vial_taken' } }, { not: { flag: 'cr_vial_refused' } }] }, next: 'cup' }, { id: 'pell.house.again', text: 'What does the house keep on those shelves?', if: { not: { seen: 'pell.house' } }, next: 'house' }, bye] },
    cup: { text: 'He closes the ledger. From under it, without hurry, a vial: glass, a cork, a finger of something clear. "The Crown\'s way, since before the lens. A cup, at the toast. Nobody up here asks what was in a cup." He puts it on the shelf between you and does not look at it. "The house did not give you this. The house does not know you. The house would be very grateful in the morning."', options: [{ id: 'cup.take', text: '(Take the vial.)', effects: [{ give: 'k_cr_vial' }, { set: 'cr_vial_taken' }, { learn: 'cr_poison_offer' }], exit: true }, { id: 'cup.no', text: '(Leave it on the shelf.)', effects: [{ set: 'cr_vial_refused' }, { learn: 'cr_poison_offer' }], exit: true }] },
    house: { text: '"Ninety years of the Committee\'s minutes, and nothing sold." He almost smiles. "And the things a house keeps for the nights it would rather not have had, which are not on the shelves, and which you will not find, because I keep them."', effects: [{ learn: 'cr_pell_keeps' }], options: [bye] },
  },
};

export const d_cr_tillie: DialogueDef = {
  id: 'd_cr_tillie', owner: 'npc_cr_04',
  start: [{ if: { at: 'md_lantern' }, node: 'row' }, { if: { flag: 'cr_tillie' }, node: 'after' }, { if: { knows: 'cr_tillie_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A girl at the salon window in a dress that cost a Stacks flat, looking at the canal, which from here is a bright thread. "Ottilie. Tillie." She does not turn. "You came up the car. I watched you come up. I watch everyone come up; it\'s the only thing that moves."',
      effects: [{ learn: 'cr_tillie_met' }, { learn: 'tillie_seen' }],
      options: [
        { id: 'tillie.broker', text: 'The Broker sent me. The service lift, at four.', if: { quest: 'q_cr_kidnap' }, next: 'broker' },
        { id: 'tillie.why', text: 'Why pay to be taken?', next: 'why', once: true },
        bye,
      ],
    },
    again: { text: '"It\'s the only thing that moves."', options: [{ id: 'tillie.broker.again', text: 'The Broker sent me. The service lift, at four.', if: { quest: 'q_cr_kidnap' }, next: 'broker' }, { id: 'tillie.why.again', text: 'Why pay to be taken?', if: { not: { seen: 'tillie.why' } }, next: 'why' }, bye] },
    broker: { text: 'Now she turns. Nineteen, and frightened, and more decided than anyone in the hall. "I paid. Did they tell you I paid? Osric gave me the money; he\'s kind; that\'s the worst of it." She looks at the door. "Mother will pay more to keep me. Everyone up here knows what everyone else will pay. That\'s what the lens is for."', options: [{ id: 'broker.take', text: '(Take her down. The lift, now.)', effects: [{ set: 'cr_tillie', value: 'row' }, { set: 'cr_tillie_gone' }, { xp: 80 }, { decision: { id: 'cr_tillie', text: 'You took Ottilie Ashby-Crane down the service lift to the Row, as she had paid for.' } }, { news: { tag: 'cr_tillie_gone', text: 'a Tenured daughter went missing from the Crown on the night of the Masque', valence: -2, size: 6, at: 'meridian' } }, { event: 'goto', data: { location: 'md_lantern', spawn: 'loop', minutes: 60 } }], exit: true }, { id: 'broker.price', text: 'Your mother would pay more to keep you.', next: 'price' }, { id: 'broker.together', text: 'Tell her yourself. I\'ll stand beside you while you do.', effects: [{ set: 'cr_tillie_together' }, { learn: 'cr_tillie_together' }], next: 'together' }, { text: 'Not yet.', exit: true }] },
    price: { text: '"Then sell me." She turns back to the window. "Everyone up here does. I thought somebody from down there might not." The canal, a bright thread.', options: [bye] },
    together: { text: 'She looks at you as if you had said something in a language she had been taught as a child and forgotten. "Beside me." A breath. "She\'s in the chair. She\'s always in the chair." She does not move yet; but she has stopped looking at the window.', options: [bye] },
    why: { text: '"Because the Chair is sealed with a marriage, and the marriage is me and Osric, and Osric is kind, and I would rather be rubbish in a lift than kind for sixty years under glass." She says it like a thing rehearsed in front of a window. "The Broker takes you down. That\'s what the hatch does. It takes things down."', effects: [{ learn: 'cr_tillie_why' }], options: [bye] },
    after: { text: [{ if: { flag: 'cr_tillie', eq: 'stays' }, text: 'She is at the window, but she is sitting, and the dress is a different dress, plainer, and when she sees you she almost smiles. "Off. She said off. She\'s never said a thing like it." The canal. "I might go down anyway. But I\'d go down with a house. That\'s different, apparently."' }, { if: { flag: 'cr_tillie', eq: 'sold' }, text: 'The window is empty. A girl in the house\'s livery says Miss Ottilie is in her room, and will be in her room, and that is all a girl in livery is paid to say.' }, { text: 'The window.' }], options: [bye] },
    row: { text: 'A girl at a table in the Velvet in a Row dress that fits her badly and that she will not take off, with a cup of something that costs two. "Tillie." She does not say the rest of the name any more. "It hurts. You can taste things. Fenwick was right; I never thought I\'d say that." She looks at the door, where the Row is. "Mother knows where I am. Mother knows everything. She hasn\'t sent anyone. That\'s the kindest thing she\'s ever done."', effects: [{ learn: 'cr_tillie_row' }], options: [bye] },
  },
};

export const d_cr_mabe: DialogueDef = {
  id: 'd_cr_mabe', owner: 'npc_cr_12',
  start: [{ if: { flag: 'cr_duel' }, node: 'after' }, { if: { flag: 'mabe_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A big man in the corner of the salon in a coat that fits and shoes that do not, with a machete under the coat that nobody has asked him about. "Cutter Mabe. Lantern Row." He says it the way people up here say a house. "Honora pays by the bout. I\'ve never been paid by anybody who said *bout*."',
      effects: [{ set: 'mabe_met' }, { learn: 'mabe_seen' }],
      options: [
        { id: 'mabe.duel', text: 'I stand for Vane. Draw.', if: { all: [{ knows: 'cr_celestine_champion' }, { not: { flag: 'cr_duel' } }, QUIET, OPEN] }, next: 'draw' },
        { id: 'mabe.row', text: 'What are you doing up here?', next: 'row', once: true },
        bye,
      ],
    },
    again: { text: '"Shoes pinch like a debt."', options: [{ id: 'mabe.duel.again', text: 'I stand for Vane. Draw.', if: { all: [{ knows: 'cr_celestine_champion' }, { not: { flag: 'cr_duel' } }, QUIET, OPEN] }, next: 'draw' }, { id: 'mabe.row.again', text: 'What are you doing up here?', if: { not: { seen: 'mabe.row' } }, next: 'row' }, bye] },
    row: { text: '"Dace." He grins. "Never been hit by anybody who meant it. Honora wants him on the floor and I want to see his face when it happens, and she\'s paying, which is more than Mab ever did." He looks at the window. "The girl keeps looking out of it. Down there we look up. Funny."', effects: [{ learn: 'cr_mabe_why' }], options: [bye] },
    draw: { text: 'He stands up, and the salon gets smaller. "For Vane." He is pleased; a bout is a bout. "To the floor, they say up here. Down there we say till you stop." The machete comes out of the coat. "I\'ll say it their way. Once."', options: [{ text: '(Draw.)', effects: [{ event: 'fight', data: { pit: { win: [{ set: 'cr_duel', value: 'vane' }, { set: 'cr_duel_won' }, { xp: 150 }, { rep: { faction: 'tenured', respect: 12 } }, { decision: { id: 'cr_duel', text: 'You stood for House Vane at the Masque and put the Row\'s bravo on the floor.' } }, { news: { tag: 'cr_duel', text: 'a stranger stood for House Vane at the Masque and put a Lantern Row pit man on the floor', valence: 2, size: 6, at: 'meridian' } }], lose: [{ set: 'cr_duel_lost' }, { xp: 30 }, { decision: { id: 'cr_duel', text: 'You stood for House Vane at the Masque and went down to the Row\'s bravo.' } }] } } }], exit: true }, { text: '(Not yet.)', exit: true }] },
    after: { text: [{ if: { flag: 'cr_duel', eq: 'vane' }, text: 'He is sitting with his arm bound, grinning. "Meant it." He says it like a compliment. "Come down to the pit some night and mean it where it pays."' }, { if: { flag: 'cr_duel', eq: 'ashby' }, text: '"You put Dace down." He is delighted; he was not paid for it and does not care. "I\'d have paid to see that. I think I did."' }, { text: '"You stood." He shrugs. "Nobody up here does."' }], options: [bye] },
  },
};

// ---------------------------------------------------------------- the lectern: the Chair

export const d_cr_lectern: DialogueDef = {
  id: 'd_cr_lectern', owner: 'narrator',
  start: [{ if: { flag: 'cr_alarm' }, node: 'alarm' }, { if: { flag: 'cr_chair' }, node: 'after' }, { node: 'vote' }],
  nodes: {
    vote: {
      text: 'The Committee\'s lectern, with the crest on it and the clerk behind it with the book. The toast is called. Celestine Vane at her table with the cup; Honora Ashby-Crane in the door of the hall, come across the terrace for this and for nothing else; Marguerite Lorne by the wall; Quill at the back, not trying. The clerk reads the question. The houses look at one another, and then, because the lens has made a habit of it, at you.',
      options: [
        { id: 'vote.duel_ashby', text: 'The floor decided it. Ashby-Crane.', if: { flag: 'cr_duel', eq: 'ashby' }, next: 'chair_ashby' },
        { id: 'vote.duel_vane', text: 'The floor decided it. Vane.', if: { flag: 'cr_duel', eq: 'vane' }, next: 'chair_vane' },
        { id: 'vote.reel', text: '(Put the reel on the clerk\'s machine, and let the room hear it.)', if: { item: 'k_cr_reel' }, next: 'exposed' },
        { id: 'vote.vane', text: 'Speak for House Vane.', if: { not: { flag: 'cr_vote_failed' } }, check: { skill: 'speech', dc: 50, mods: [{ if: { knows: 'cr_magistrate_known' }, dc: -20, why: 'the lens called you Magistrate-designate in front of them' }, { if: { flag: 'cr_client', eq: 'vane' }, dc: -10, why: 'the house\'s client' }, { if: { flag: 'cr_lorne_word' }, dc: -10, why: 'House Lorne\'s vote and two silences' }, { if: { flag: 'cr_reel_sold' }, dc: -5, why: 'Vane\'s hand is on your shoulder' }] }, next: 'chair_vane', fail: 'no_room' },
        { id: 'vote.ashby', text: 'Speak for House Ashby-Crane.', if: { not: { flag: 'cr_vote_failed' } }, check: { skill: 'speech', dc: 50, mods: [{ if: { knows: 'cr_magistrate_known' }, dc: -20, why: 'the lens called you Magistrate-designate in front of them' }, { if: { flag: 'cr_client', eq: 'ashby' }, dc: -10, why: 'the house\'s client' }, { if: { flag: 'cr_lorne_word' }, dc: -10, why: 'House Lorne\'s vote and two silences' }, { if: { flag: 'cr_honora_favour' }, dc: -10, why: 'Honora owes you a daughter' }, { if: { knows: 'cr_honora_claim' }, dc: -5, why: 'you can say what Vane means to sell' }] }, next: 'chair_ashby', fail: 'no_room' },
        { id: 'vote.silent', text: '(Say nothing. Let the houses vote.)', next: 'forecast' },
        { text: '(Not yet.)', exit: true },
      ],
    },
    chair_vane: { text: 'The clerk writes. Celestine Vane does not smile, which is how you know. Honora Ashby-Crane goes back across the terrace without a word, and Quill, at the back, puts on his coat, which was already on. The toast is drunk. "The Chair," the clerk says, "House Vane," and the lens over the door files every face in the room, yours among them.', effects: [{ set: 'cr_chair', value: 'vane' }, { set: 'cr_concern', value: 'kept' }, { xp: 150 }, { rep: { faction: 'tenured', respect: 10 } }, { decision: { id: 'cr_chair', text: 'The Committee\'s Chair went to House Vane, and you were in the room.' } }, { news: { tag: 'cr_chair', text: 'the Committee\'s Chair went to House Vane at the Masque', valence: 0, size: 7, at: 'meridian' } }], options: [{ text: '(Step back.)', exit: true }] },
    chair_ashby: { text: 'The clerk writes. Honora Ashby-Crane does not come further into the hall; she does not need to. Celestine Vane turns the cup a quarter turn and looks at nobody. Quill, at the back, puts on his coat and goes to the lift without the toast. "The Chair," the clerk says, "House Ashby-Crane," and somewhere in the room somebody laughs once, too loud, and is filed.', effects: [{ set: 'cr_chair', value: 'ashby' }, { set: 'cr_concern', value: 'kept' }, { xp: 150 }, { rep: { faction: 'tenured', respect: 10 } }, { decision: { id: 'cr_chair', text: 'The Committee\'s Chair went to House Ashby-Crane, and you were in the room.' } }, { news: { tag: 'cr_chair', text: 'the Committee\'s Chair went to House Ashby-Crane at Vane\'s own Masque', valence: 2, size: 7, at: 'meridian' } }], options: [{ text: '(Step back.)', exit: true }] },
    forecast: { text: 'The houses vote. The file was not in doubt and the room, it turns out, was not either; rooms up here have had ninety years of practice. "The Chair," the clerk says, "House Vane." Celestine Vane turns the cup a quarter turn. Nobody looks at you, which, after the lens, is almost a kindness.', effects: [{ set: 'cr_chair', value: 'vane' }, { set: 'cr_concern', value: 'kept' }, { set: 'cr_vote_silent' }, { xp: 60 }, { decision: { id: 'cr_chair', text: 'You let the Committee vote, and the Chair went to House Vane as the file expected.' } }, { news: { tag: 'cr_chair', text: 'the Committee\'s Chair went to House Vane at the Masque', valence: 0, size: 7, at: 'meridian' } }], options: [{ text: '(Step back.)', exit: true }] },
    exposed: { text: 'The clerk\'s machine takes the reel because it takes anything with a house\'s sleeve on it. The hall hears a room it was not in: Celestine Vane\'s voice, and Quill\'s, and the word *terms*, and the Committee\'s forecasts by the season, and a figure. Nobody moves. Then Honora Ashby-Crane says, from the door, "Vote," and they do, and the lens over the door files every face in the room, and every face in the room is looking at yours. Quill is already gone. Celestine has not moved. The Crown has turned, all at once, politely, and it has turned on you as much as on her, because you were the one who made it look.', effects: [{ take: 'k_cr_reel' }, { set: 'cr_concern', value: 'exposed' }, { set: 'cr_chair', value: 'ashby' }, { set: 'cr_crown_hostile' }, { learn: 'cr_reel_heard' }, { lead: 'l_cr_concern_chair' }, { xp: 200 }, { rep: { faction: 'tenured', respect: -30, fear: 10 } }, { rep: { faction: 'wardens', respect: 5 } }, { decision: { id: 'cr_exposed', text: 'You played House Vane\'s reel to the Committee: the Concern\'s terms, aloud, at the Masque.' } }, { news: { tag: 'cr_exposed', text: 'a reel played at the Masque had Celestine Vane selling the Committee\'s forecasts to the Concern; the Chair went to Ashby-Crane and the Crown turned on the stranger who played it', valence: -4, size: 9, at: 'meridian' } }], options: [{ text: '(Step back.)', exit: true }] },
    no_room: { text: 'You speak. They listen, because the lens has made a habit of it, and when you finish there is the small silence a room makes when it has decided you are not one of the things it has to count. The clerk reads the question again, to the houses.', effects: [{ set: 'cr_vote_failed' }], options: [{ text: '(Step back.)', exit: true }] },
    after: { text: [{ if: { flag: 'cr_concern', eq: 'exposed' }, text: 'The lectern, and the clerk\'s book open at a line with two names in it and a third that is yours.' }, { if: { flag: 'cr_chair', eq: 'vane' }, text: 'The lectern. THE CHAIR — HOUSE VANE, in the clerk\'s hand, and the toast drunk.' }, { text: 'The lectern. THE CHAIR — HOUSE ASHBY-CRANE, in the clerk\'s hand, and the crane over a door across the terrace that has not been polished so hard in ninety years.' }], options: [{ text: '(Leave it.)', exit: true }] },
    alarm: { text: 'The lectern, and nobody at it, and the bell.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the studio

export const d_cr_halden: DialogueDef = {
  id: 'd_cr_halden', owner: 'npc_cr_05',
  start: [{ if: { flag: 'halden_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in a studio full of good light and finished faces, with ink on his cuffs that is not ink. "Halden. Portraits. As you will be." He looks at your face the way the lens does and the way Petrov looks at a car. "The Crown sits for me with a sheet from the Exchange in its hand and I give it the person the sheet expects. They hang them in the hall and grow into them. Sit; the light is good."',
      effects: [{ set: 'halden_met' }, { learn: 'halden_seen' }],
      options: [
        { id: 'halden.what', text: 'A sheet from the Exchange?', next: 'what', once: true },
        { id: 'halden.render', text: 'Render me. (50 Tolls)', if: { all: [{ item: 'tolls', count: 50 }, { not: { flag: 'cr_render' } }, { not: { item: 'k_cr_render' } }] }, next: 'render' },
        { id: 'halden.photo', text: '(Show him the photograph.)', if: { all: [{ item: 'k_photo' }, { not: { knows: 'cr_halden_photo' } }] }, next: 'photo' },
        bye,
      ],
    },
    again: { text: '"Sit. The light is good."', options: [{ id: 'halden.what.again', text: 'A sheet from the Exchange?', if: { not: { seen: 'halden.what' } }, next: 'what' }, { id: 'halden.render.again', text: 'Render me. (50 Tolls)', if: { all: [{ item: 'tolls', count: 50 }, { not: { flag: 'cr_render' } }, { not: { item: 'k_cr_render' } }] }, next: 'render' }, { id: 'halden.photo.again', text: '(Show him the photograph.)', if: { all: [{ item: 'k_photo' }, { not: { knows: 'cr_halden_photo' } }] }, next: 'photo' }, bye] },
    what: { text: '"A forecast. The Exchange sells them sealed; the Crown buys its own." He taps the machine. "This is on the city\'s wire. I give it a face and a sheet and it gives me the person the file expects: older, finished, in the chair the sheet says. No grain. Real light has grain in it." He looks at the wall of faces. "They are never wrong. That is the thing nobody up here says aloud."', effects: [{ learn: 'cr_renderer_how' }, { learn: 'cr_halden_what' }], options: [bye] },
    render: { text: 'You sit. The light is good. The machine hums for longer than it hummed for anyone on the wall, and Halden looks at the screen, and looks at it again, and does not print at once. "I did not feed it a sheet." He prints. A print, warm: you, older, on the steps of a restored tower, in a sash, with a date under it that has not happened yet. "It had you already." He says it quietly. "It had you the day you came through the gate. I printed this once then, for nobody, because the machine told me to, and put it in a drawer."', effects: [{ take: 'tolls', count: 50 }, { give: 'k_cr_render' }, { learn: 'cr_render_seen' }, { lead: 'l_studio_render' }, { xp: 80 }], options: [{ id: 'render.photo', text: '(Hold it beside the photograph.)', if: { item: 'k_photo' }, next: 'match' }, { id: 'render.keep', text: '(Keep it.)', effects: [{ set: 'cr_render', value: 'kept' }], exit: true }, { id: 'render.burn', text: '(Burn it in his stove.)', effects: [{ take: 'k_cr_render' }, { set: 'cr_render', value: 'burned' }, { decision: { id: 'cr_render', text: 'You burned the studio\'s print of what the file expects you to become.' } }], next: 'burned' }, { id: 'render.hang', text: 'Hang it. In the hall, with the others.', effects: [{ take: 'k_cr_render' }, { set: 'cr_render', value: 'hung' }, { learn: 'cr_magistrate_known' }, { decision: { id: 'cr_render', text: 'You let the studio hang the print of you in the sash in the Crown\'s hall.' } }, { news: { tag: 'cr_render_hung', text: 'a new portrait went up in the Crown\'s hall: a stranger on the Spire steps in a magistrate\'s sash', valence: 1, size: 7, at: 'meridian' } }], next: 'hung' }] },
    match: { text: 'The same picture. Not alike: the same, to the dust mote on the third step, which is in both and in neither twice by accident. Halden looks from one to the other and does not touch the photograph. "Not mine. Mine is a copy of the one upstairs; the city\'s own; the wire\'s. That is the original." He looks at you. "Somebody carried the file\'s opinion of you across a desert in his coat."', effects: [{ learn: 'cr_photo_match' }, { lead: 'l_photo_grain' }, { lead: 'l_photo_light' }, { xp: 40 }], options: [{ id: 'match.keep', text: '(Keep the print.)', effects: [{ set: 'cr_render', value: 'kept' }], exit: true }, { id: 'match.burn', text: '(Burn the print in his stove.)', effects: [{ take: 'k_cr_render' }, { set: 'cr_render', value: 'burned' }, { decision: { id: 'cr_render', text: 'You burned the studio\'s print of what the file expects you to become.' } }], next: 'burned' }, { id: 'match.hang', text: 'Hang it. In the hall, with the others.', effects: [{ take: 'k_cr_render' }, { set: 'cr_render', value: 'hung' }, { learn: 'cr_magistrate_known' }, { decision: { id: 'cr_render', text: 'You let the studio hang the print of you in the sash in the Crown\'s hall.' } }, { news: { tag: 'cr_render_hung', text: 'a new portrait went up in the Crown\'s hall: a stranger on the Spire steps in a magistrate\'s sash', valence: 1, size: 7, at: 'meridian' } }], next: 'hung' }] },
    burned: { text: 'It burns like paper, which is what it is. Halden watches it go without expression. "It will print again. It always does. But not in my drawer." He looks at the machine. "I shall tell it I ran out of paper."', options: [bye] },
    hung: { text: 'He hangs it himself, at the end of the wall, with the others: the Crown as it will be, and you in the sash among them. People stop in front of it on their way to the toast. By the time the car goes down, the terraces know your face the way the lens does, and the houses have begun to think about what a designate is worth.', options: [bye] },
    photo: { text: 'He does not touch it. He looks at it the way he looks at his own prints: the steps, the sash, the dust. "Not mine." He is quite sure. "Mine is a copy of the one upstairs. This is the original; the wire\'s; the city\'s own hand." He turns it over and reads the date and does not comment on it. "There is no grain in it because there was no light. Nobody took this. It was *expected*."', effects: [{ learn: 'cr_halden_photo' }, { lead: 'l_studio_render' }, { lead: 'l_photo_grain' }, { xp: 60 }], options: [bye] },
  },
};

export const d_cr_renderer: DialogueDef = {
  id: 'd_cr_renderer', owner: 'narrator', start: [{ node: 'machine' }],
  nodes: {
    machine: { text: 'The renderer: a pre-Burn cabinet with a lens of its own, a slot for a sheet, a tray for prints, and a hum that is not the hall\'s. On its screen, a queue of names in the Crown\'s season, each with a sheet number beside it. At the top of the queue, unrequested, with no sheet number, dated the day you came through the gate: your name.', effects: [{ learn: 'cr_queue_seen' }, { lead: 'l_studio_render' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the kitchens and the service lift

export const d_cr_brisk: DialogueDef = {
  id: 'd_cr_brisk', owner: 'npc_cr_09',
  start: [{ if: { flag: 'brisk_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in white with forearms like a hauler\'s and a voice that reaches the far end of forty covers. "Brisk. The kitchens. Nobody goes up the back stair I haven\'t fed." She looks at you and files you faster than the lens did. "You\'re not kitchens. Pass, or a reason, or out."',
      effects: [{ set: 'brisk_met' }, { learn: 'brisk_seen' }],
      options: [
        { id: 'brisk.pass', text: '(The service pass.) Where do you want me?', if: { all: [{ item: 'k_cr_service_pass' }, { not: { flag: 'cr_hall_open' } }] }, next: 'pass' },
        { id: 'brisk.stair', text: 'I need the back stair into the hall.', if: { all: [{ not: { item: 'k_cr_service_pass' } }, { not: { flag: 'cr_hall_open' } }] }, check: { skill: 'speech', dc: 35, mods: [{ if: { flag: 'cr_entry', eq: 'contract' }, dc: -15, why: 'you came in as the help' }, { if: { member: 'rustmouths' }, dc: -5, why: 'she knows a hauler\'s hands' }] }, next: 'stair_ok', fail: 'stair_no' },
        { id: 'brisk.tillie', text: 'A girl from the salon needs the lift down, quietly.', if: { all: [{ quest: 'q_cr_kidnap' }, { not: { flag: 'cr_tillie' } }] }, next: 'tillie', once: true },
        bye,
      ],
    },
    again: { text: '"Pass, or a reason, or out."', options: [{ id: 'brisk.pass.again', text: '(The service pass.) Where do you want me?', if: { all: [{ item: 'k_cr_service_pass' }, { not: { flag: 'cr_hall_open' } }] }, next: 'pass' }, { id: 'brisk.stair.again', text: 'I need the back stair into the hall.', if: { all: [{ not: { item: 'k_cr_service_pass' } }, { not: { flag: 'cr_hall_open' } }] }, check: { skill: 'speech', dc: 35, mods: [{ if: { flag: 'cr_entry', eq: 'contract' }, dc: -15, why: 'you came in as the help' }] }, next: 'stair_ok', fail: 'stair_no' }, { id: 'brisk.tillie.again', text: 'A girl from the salon needs the lift down, quietly.', if: { all: [{ quest: 'q_cr_kidnap' }, { not: { flag: 'cr_tillie' } }, { not: { seen: 'brisk.tillie' } }] }, next: 'tillie' }, bye] },
    pass: { text: '"Trays." She puts one in your hands with six glasses on it. "Up the back stair, round the hall once, don\'t look at them, they don\'t look at you. That\'s the help\'s one advantage up here; use it."', effects: [{ set: 'cr_hall_open' }, { learn: 'cr_back_stair' }], options: [{ text: '(Up the back stair.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'hall_back', minutes: 5 } }], exit: true }] },
    stair_ok: { text: 'She looks at your hands, which have done something in their life, and at the hall\'s side of the door, which has not. "Trays." Six glasses. "Round the hall once. Don\'t look at them."', effects: [{ set: 'cr_hall_open' }, { learn: 'cr_back_stair' }, { xp: 40 }], options: [{ text: '(Up the back stair.)', effects: [{ event: 'goto', data: { location: 'md_crown', spawn: 'hall_back', minutes: 5 } }], exit: true }] },
    stair_no: { text: '"Out." She has already turned back to the stove. "Forty covers. Out."', options: [bye] },
    tillie: { text: 'She does not stop moving. "Four. The rubbish goes down at four, and the help, and anything in a kitchen coat with its head down." A tray. "She can be rubbish. Everybody is, in a lift. Tell her to leave the dress."', effects: [{ learn: 'cr_brisk_lift' }], options: [bye] },
  },
};

export const d_cr_service_lift: DialogueDef = {
  id: 'd_cr_service_lift', owner: 'narrator', start: [{ node: 'lift' }],
  nodes: {
    lift: {
      text: 'The service lift: a cage that smells of the day\'s rubbish and the night\'s help, with a lever and no lens. It goes down to Old Market\'s works, where the Loop is, and comes back up at four with the morning.',
      options: [
        { id: 'service.down', text: 'Down. Old Market.', if: { any: [{ item: 'k_cr_service_pass' }, IN] }, effects: [{ learn: 'cr_service_lift_used' }, { event: 'goto', data: { location: 'md_market', spawn: 'loop', minutes: 15 } }], exit: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
  },
};

// ---------------------------------------------------------------- the reel, played

export const d_cr_rev_board: DialogueDef = {
  id: 'd_cr_rev_board', owner: 'narrator', start: [{ node: 'room' }],
  nodes: {
    room: { text: 'A room under glass with the light coming in sideways. You are sitting; the hands on the table are a woman\'s, ringed, still. Across the table a man in a coat that is not trying, with a sheet between you that has the Committee\'s crest on it. He says, "Terms," as if it were the name of a dish. The hands turn a cup a quarter turn.', effects: [{ learn: 'cr_reel_heard' }], options: [{ text: '(Listen.)', next: 'terms' }, { text: '(Wake.)', exit: true }] },
    terms: { text: '"The Committee\'s forecasts, by the season, sealed, to the Concern, from the date the Chair signs. In return the Concern\'s backing on the vote, and the road, and the near end of a bridge." The hands do not move. A voice that is yours and is not says, "Done," and the man in the coat does not smile, because men like him do not need to. The reel ends on the cup, and the sound of a room that did not know it was listening.', effects: [{ lead: 'l_cr_concern_chair' }, { xp: 40 }], options: [{ text: '(Wake.)', exit: true }] },
  },
};

export const CROWN_DIALOGUES: DialogueDef[] = [
  d_cr_lift, d_cr_lens, d_cr_lobby_sign, d_cr_ambrose, d_cr_glass_table, d_cr_hall_sign, d_cr_salon_sign, d_cr_studio_sign, d_cr_kitchen_sign, d_cr_view,
  d_cr_dace, d_cr_celestine, d_cr_cup, d_cr_osric, d_cr_quill, d_cr_lorne, d_cr_honora, d_cr_pell, d_cr_tillie, d_cr_mabe, d_cr_lectern,
  d_cr_halden, d_cr_renderer, d_cr_brisk, d_cr_service_lift, d_cr_rev_board,
];
