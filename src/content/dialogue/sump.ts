import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';

/**
 * The Sump: two clans, one purse, a tunnel to a door that never opened. Cistern 4 below: the rooms of a reserve
 * that did what it was told and died of it, and the records the city expected back.
 */

const bye = { text: 'That\'s all.', exit: true };
const NIGHT = { hour: { from: 23, to: 5 } };
// The Broker's board at Old Market wants the boxed piece in the Tanners' locker; Hesk can be paid to open it.
const GIG_BOX: Cond = { all: [{ quest: 'q_gig_box' }, { not: { item: 'ci_ch_eye_heat' } }, { not: { flag: 'sp_box_paid' } }, { not: { flag: 'unlocked:sump/sp_tanner_locker' } }] };
/** Hesk lets the locker open (the engine's unlocked flag for that container) and remembers the box was paid for. */
const BOX_OPEN: Effect[] = [{ set: 'sp_box_paid' }, { set: 'unlocked:sump/sp_tanner_locker' }, { learn: 'sp_box_paid' }];
const OPEN = [{ set: 'sp_tunnel_open' }, { xp: 60 }];

// ---------------------------------------------------------------- the Sump

export const d_sp_sign: DialogueDef = {
  id: 'd_sp_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'A sheet of car door nailed to a post: THE SUMP — SALVAGE BY WEIGHT — WEST RIM GREL / EAST RIM TANNER — GUILD SCRIP 4TH DAY. Under it, scratched: DON\'T CROSS THE BOWL AT NIGHT.', effects: [{ learn: 'sp_two_rims' }, { quest: 'q_sp_feud', start: true }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_sp_tunnel_sign: DialogueDef = {
  id: 'd_sp_tunnel_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'Chalk on the concrete throat: 140 FT — DOOR AT 160? — NO LAMPS PAST THE TURN. And older, in the city\'s stencil, half under the chalk: STORM RELIEF 4 — CONTINUITY ACCESS — AUTHORISED ONLY.', effects: [{ learn: 'sp_tunnel_stencil' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_sp_warden: DialogueDef = {
  id: 'd_sp_warden', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A machine on its side, dog-sized, legs folded, plates gone the colour of the bowl. The scavengers sit on it. On its flank, under the rust, a stencil you have seen on MOTHER\'s crates.', passives: [{ skill: 'science', dc: 30, text: 'Not the Concern\'s kind, like the thing on the salt pan: the city\'s kind. A warden. It walked here and lay down, or was told to.', effects: [{ learn: 'c4_warden_city' }] }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_sp_pump: DialogueDef = {
  id: 'd_sp_pump', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The pump that drained the bowl, hand-cranked by two clans in shifts for a year because neither would let the other do it alone. It still drips.', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_sp_crane: DialogueDef = {
  id: 'd_sp_crane', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A crane-arm from something bigger, half-raised on a frame of rail, with rope on it from the east rim and a lamp on it from the west, so that neither can finish it without the other.', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_sp_ledger: DialogueDef = {
  id: 'd_sp_ledger', owner: 'narrator',
  start: [{ if: { lead: 'l_sump_one_purse' }, node: 'known' }, { if: { flag: 'sp_runner_gone' }, node: 'open' }, { node: 'watched' }],
  nodes: {
    watched: { text: 'The runner\'s ledger on the table in his container, open, and the runner three feet from it, not reading it, watching you.', options: [{ id: 'ledger.glance', text: '(Read it upside down while he talks.)', check: { skill: 'stealth', dc: 30, mods: [{ if: { skill: 'barter', gte: 30 }, dc: -5, why: 'guild columns read fast to someone who knows them' }] }, next: 'read', fail: 'caught' }, { text: '(Leave it.)', exit: true }] },
    open: { text: 'The runner\'s ledger, left on the table when he left everything else.', options: [{ text: '(Read it.)', next: 'read' }] },
    read: { text: 'Two columns, one heading. WEST RIM — GREL — PER FOOT. EAST RIM — TANNER — PER FOOT. PAID FOURTH DAY, BOTH, AS PER FACTOR PIKE, POST NINE-WEST. A note in the margin: *keep them apart; they dig faster angry.*', effects: [{ lead: 'l_sump_one_purse' }, { learn: 'sp_one_purse' }, { quest: 'q_sp_feud', start: true }, { xp: 40 }], options: [{ text: '(Close it.)', exit: true }] },
    caught: { text: 'He closes it with one finger without looking down. "Guild paper."', options: [bye] },
    known: { text: 'The ledger. You know what it says.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_sp_mouth: DialogueDef = {
  id: 'd_sp_mouth', owner: 'npc_sp_g1',
  start: [{ if: { any: [{ flag: 'sp_fight_grel' }, { flag: 'sp_fight_tanner' }] }, node: 'fight' }, { if: { flag: 'sp_united' }, node: 'united' }, { if: NIGHT, node: 'night' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Two men at the sandbags, one from each rim, standing as far apart as the mouth allows. "Nobody goes down," says Grel\'s man. "Nobody," says the Tanner. It is the only thing they have agreed on in a year.',
      options: [
        { id: 'mouth.grel', text: 'Grel says I go down.', if: { flag: 'sp_grel_leave' }, effects: OPEN, next: 'in' },
        { id: 'mouth.hesk', text: 'Hesk says I go down.', if: { flag: 'sp_hesk_leave' }, effects: OPEN, next: 'in' },
        { id: 'mouth.both', text: '(Thirty to each of you. 60 Tolls)', if: { item: 'tolls', count: 60 }, check: { skill: 'barter', dc: 30 }, effects: [], next: 'paid', fail: 'paid_no' },
        { id: 'mouth.marr', text: 'I come for the Marrs. Their people walked out of this hole.', if: { knows: 'dw_origin_known' }, next: 'marr' },
        { id: 'mouth.nib', text: '(Say nothing. Go round by the drain behind the crane, the way Nib showed you.)', if: { flag: 'sp_nib_way' }, effects: [...OPEN, { set: 'sp_sneaked' }], next: 'drain' },
        { id: 'mouth.draw', text: '(Draw.)', effects: [{ set: 'sp_fight_grel' }, { set: 'sp_fight_tanner' }, { set: 'sp_tunnel_open' }, { decision: { id: 'sp_drew', text: 'You shot your way into the Sump\'s tunnel.' } }, { event: 'combat' }], exit: true },
        { text: 'Another time.', exit: true },
      ],
    },
    night: {
      text: 'The sandbags at night: one lamp, two men, one of them asleep sitting up and the other nearly.',
      options: [
        { id: 'mouth.sneak', text: '(Past them, along the wall, in the lamp\'s shadow.)', check: { skill: 'stealth', dc: 40 }, effects: [], next: 'sneak_ok', fail: 'sneak_no' },
        { id: 'mouth.nib.n', text: '(The drain behind the crane.)', if: { flag: 'sp_nib_way' }, effects: [...OPEN, { set: 'sp_sneaked' }], next: 'drain' },
        { text: 'Another time.', exit: true },
      ],
    },
    paid: { text: 'Thirty each, and they look at each other\'s thirty, and that is the second thing they have agreed on. "Lamp past the turn goes out. Don\'t say we didn\'t say."', effects: [{ take: 'tolls', count: 60 }, ...OPEN], options: [{ text: '(Down.)', exit: true }] },
    paid_no: { text: '"Grel\'d have my hand." "Hesk\'d have mine." They do not take it. It is the third thing.', options: [bye] },
    marr: { text: 'The Tanner spits. Grel\'s man does not. "Marr." He looks at the hole. "Grel knows that name. Say it to him."', effects: [{ learn: 'sp_marr_name' }], options: [bye] },
    sneak_ok: { text: 'The wall is cold and the lamp\'s shadow is narrow and the sleeping one snores through the whole of it. The throat goes down.', effects: [...OPEN, { set: 'sp_sneaked' }, { xp: 40 }], options: [{ text: '(Down.)', exit: true }] },
    sneak_no: { text: 'A sandbag shifts under your boot with a sound like a sigh. "Nobody," says the one who was nearly asleep, without opening his eyes.', effects: [{ time: 30 }], options: [bye] },
    drain: { text: 'The drain behind the crane-arm is a pipe a child fits and you nearly do, and it comes out in the throat past the turn, where the chalk ends and the stencils start.', options: [{ text: '(Down.)', exit: true }] },
    in: { text: 'They stand aside, one each way. "Lamp past the turn goes out. Don\'t say we didn\'t say."', options: [{ text: '(Down.)', exit: true }] },
    united: { text: 'The sandbags are still there. The men are not; they are digging together, and the hole is open to anyone the Sump does not mind.', effects: OPEN, options: [{ text: '(Down.)', exit: true }] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_sp_grel: DialogueDef = {
  id: 'd_sp_grel', owner: 'npc_sp_01',
  start: [{ if: { flag: 'sp_fight_grel' }, node: 'fight' }, { if: { flag: 'sp_feud_outcome' }, node: 'after' }, { if: { flag: 'grel_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A scarred man at a table made of a car bonnet, weighing scrap on a balance made of two pans and a rail spike. "Grel. West rim. If you\'re the guild\'s, the runner\'s on the south rim. If you\'re the Tanners\', go back across the bowl before it gets dark. If you\'re neither — " he looks up — "then you want the tunnel, and the tunnel\'s mine."',
      effects: [{ set: 'grel_met' }, { quest: 'q_sp_feud', start: true }, { learn: 'sp_two_rims' }],
      options: [
        { id: 'grel.tunnel', text: 'What\'s down the tunnel?', next: 'tunnel', once: true },
        { id: 'grel.guild', text: 'Who pays you to dig?', next: 'guild', once: true },
        { id: 'grel.marr', text: 'The Marrs. Their people walked out of that hole when its pumps stopped.', if: { knows: 'dw_origin_known' }, next: 'marr', once: true },
        { id: 'grel.pay', text: 'A leave to go down. (40 Tolls)', if: { all: [{ item: 'tolls', count: 40 }, { not: { flag: 'sp_grel_leave' } }] }, effects: [{ take: 'tolls', count: 40 }, { set: 'sp_grel_leave' }], next: 'leave' },
        { id: 'grel.purse', text: 'The Tanners are paid from the same purse you are. Same runner, same day, same ledger.', if: { lead: 'l_sump_one_purse' }, check: { skill: 'speech', dc: 40, mods: [{ if: { item: 'k_sp_pay_ledger' }, dc: -20, why: 'you can put the ledger on his table' }] }, next: 'purse_ok', fail: 'purse_no' },
        { id: 'grel.side', text: 'Clear the Tanners off the east rim, and the tunnel\'s yours alone. What\'s that worth?', next: 'side' },
        bye,
      ],
    },
    again: { text: '"West rim."', options: [{ id: 'grel.tunnel.again', text: 'What\'s down the tunnel?', if: { not: { seen: 'grel.tunnel' } }, next: 'tunnel' }, { id: 'grel.guild.again', text: 'Who pays you to dig?', if: { not: { seen: 'grel.guild' } }, next: 'guild' }, { id: 'grel.marr.again', text: 'The Marrs.', if: { all: [{ knows: 'dw_origin_known' }, { not: { seen: 'grel.marr' } }] }, next: 'marr' }, { id: 'grel.pay.again', text: 'A leave to go down. (40 Tolls)', if: { all: [{ item: 'tolls', count: 40 }, { not: { flag: 'sp_grel_leave' } }] }, effects: [{ take: 'tolls', count: 40 }, { set: 'sp_grel_leave' }], next: 'leave' }, { id: 'grel.purse.again', text: 'The Tanners are paid from the same purse.', if: { all: [{ lead: 'l_sump_one_purse' }, { not: { seen: 'grel.purse' } }] }, check: { skill: 'speech', dc: 40, mods: [{ if: { item: 'k_sp_pay_ledger' }, dc: -20, why: 'the ledger' }] }, next: 'purse_ok', fail: 'purse_no' }, { id: 'grel.side.again', text: 'Clear the Tanners off the east rim.', if: { not: { seen: 'grel.side' } }, next: 'side' }, bye] },
    tunnel: { text: '"A storm drain the city made, and at the end of it a door the city made, with a number on it. Four." He weighs a bracket. "The guild wants what\'s behind it. I want the forty feet a week it pays me to find out. The Tanners want the door, because Hesk Tanner wants things."', effects: [{ learn: 'sp_tunnel_door' }], options: [bye] },
    guild: { text: '"Pike. Post nine-west, through a runner who sleeps on the south rim with a purse and a horse." He does not look up. "He pays us on the fourth day and the Tanners on — well. On a day. I don\'t ask what day."', effects: [{ learn: 'sp_pike_pays' }], options: [bye] },
    marr: { text: 'He puts the bracket down. "Marr." A long breath. "My grandfather\'s camp was on the east rim then, before there was an east rim. Eleven people came up out of that hole with a key and a photograph and nothing else, and one of them was a pump man called Marr, and my grandfather fed them, which is the only good thing anyone has ever said about my grandfather." He looks at the hole. "Go down. No leave. Tell the old woman, if she\'s alive, that the Sump remembers."', effects: [{ set: 'sp_grel_leave' }, { learn: 'sp_grel_marr' }, { trust: { npc: 'npc_sp_01', by: 25 } }, { xp: 50 }], options: [bye] },
    leave: { text: '"Forty." He bites a coin, from habit. "Tell the mouth Grel says. The lamp past the turn goes out; take your own."', options: [bye] },
    purse_ok: { text: 'He reads the way men read who learned late, with a finger, twice. Then he stands up, which makes the table look smaller. "Hesk." Not to you. He takes the ledger and walks across the bowl in daylight, which nobody has done in a year, and Hesk Tanner comes out of the container with a gun, and reads, and puts the gun down. What they say to each other you do not hear. What they say to the runner, everyone does.', effects: [{ set: 'sp_feud_outcome', value: 'united' }, { set: 'sp_grel_leave' }, { set: 'sp_hesk_leave' }, { take: 'k_sp_pay_ledger' }, { xp: 150 }, { decision: { id: 'sp_united', text: 'You put the guild\'s one-purse ledger in front of both Sump clans; they threw the runner out together.' } }], options: [{ text: '(Let them.)', exit: true }] },
    purse_no: { text: '"The guild pays the Tanners?" He laughs, short. "The guild pays me. The Tanners steal. Those are different columns, friend."', options: [bye] },
    side: { text: '"Worth the tunnel. Worth a cabin on the east rim and the purse that comes with it." He looks at your gun. "Worth whatever the Tanners are carrying when they stop carrying it. Say yes and the bowl\'s yours tonight."', options: [{ id: 'grel.side.yes', text: 'Yes.', effects: [{ set: 'sp_fight_tanner' }, { set: 'sp_grel_leave' }, { set: 'sp_feud_outcome', value: 'grel' }, { decision: { id: 'sp_took_grel', text: 'You took Grel\'s side at the Sump.' } }, { rep: { faction: 'tollmen', respect: 2 } }], next: 'side_yes' }, { text: 'Not for me.', exit: true }] },
    side_yes: { text: '"East rim." He picks up the sawn-off. "Don\'t shoot the runner. He\'s the purse."', options: [{ text: '(Go.)', exit: true }] },
    after: { text: [{ if: { flag: 'sp_united' }, text: '"Both rims dig now. Same tunnel, same scrip, no runner." He weighs scrap. "You did that. I don\'t know yet if I thank you."' }, { if: { flag: 'sp_grel_won' }, text: '"Both rims." He does not say more. He has two cabins and no one to weigh against.' }, { text: '"West rim."' }], options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_sp_hesk: DialogueDef = {
  id: 'd_sp_hesk', owner: 'npc_sp_02',
  start: [{ if: { flag: 'sp_fight_tanner' }, node: 'fight' }, { if: { flag: 'sp_feud_outcome' }, node: 'after' }, { if: { flag: 'hesk_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A lean man in a container with a map of the tunnel chalked on the wall and a line on it at a hundred and sixty feet marked DOOR. "Hesk Tanner. East rim." He does not look away from the wall. "Grel digs for scrip. I dig for that. There is a door at the end of this that has never opened, and I would like to be the one standing there when it does."',
      effects: [{ set: 'hesk_met' }, { quest: 'q_sp_feud', start: true }, { learn: 'sp_two_rims' }, { learn: 'sp_tunnel_door' }],
      options: [
        { id: 'hesk.door', text: 'What do you think is behind it?', next: 'door', once: true },
        { id: 'hesk.pay', text: 'A leave to go down. (40 Tolls)', if: { all: [{ item: 'tolls', count: 40 }, { not: { flag: 'sp_hesk_leave' } }] }, effects: [{ take: 'tolls', count: 40 }, { set: 'sp_hesk_leave' }], next: 'leave' },
        { id: 'hesk.purse', text: 'Grel is paid from the same purse you are. Same runner, same ledger.', if: { lead: 'l_sump_one_purse' }, check: { skill: 'speech', dc: 40, mods: [{ if: { item: 'k_sp_pay_ledger' }, dc: -20, why: 'you can put the ledger on his table' }] }, next: 'purse_ok', fail: 'purse_no' },
        { id: 'hesk.side', text: 'Clear Grel off the west rim and the door\'s yours alone.', next: 'side' },
        { id: 'hesk.box', text: 'The boxed piece in your locker. The hatch at Old Market says it\'s theirs.', if: GIG_BOX, next: 'box' },
        bye,
      ],
    },
    again: { text: '"East rim." The chalk line.', options: [{ id: 'hesk.door.again', text: 'What\'s behind the door?', if: { not: { seen: 'hesk.door' } }, next: 'door' }, { id: 'hesk.pay.again', text: 'A leave to go down. (40 Tolls)', if: { all: [{ item: 'tolls', count: 40 }, { not: { flag: 'sp_hesk_leave' } }] }, effects: [{ take: 'tolls', count: 40 }, { set: 'sp_hesk_leave' }], next: 'leave' }, { id: 'hesk.purse.again', text: 'Grel is paid from the same purse.', if: { all: [{ lead: 'l_sump_one_purse' }, { not: { seen: 'hesk.purse' } }] }, check: { skill: 'speech', dc: 40, mods: [{ if: { item: 'k_sp_pay_ledger' }, dc: -20, why: 'the ledger' }] }, next: 'purse_ok', fail: 'purse_no' }, { id: 'hesk.side.again', text: 'Clear Grel off the west rim.', if: { not: { seen: 'hesk.side' } }, next: 'side' }, { id: 'hesk.box.again', text: 'The boxed piece in your locker.', if: GIG_BOX, next: 'box' }, bye] },
    box: {
      text: '"Half-Price says." He does not turn from the chalk. "Half-Price fronted the dig that turned it up and paid half, which is where the name comes from. The box sits in my locker till the other half comes up the road. You can be the other half, or you can be the hatch\'s problem and not mine."',
      options: [
        { id: 'hesk.box.pay', text: '(Pay the other half.) 60 Tolls.', if: { item: 'tolls', count: 60 }, effects: [{ take: 'tolls', count: 60 }, ...BOX_OPEN, { trust: { npc: 'npc_sp_02', by: 5 } }], next: 'box_paid' },
        { id: 'hesk.box.low', text: 'Forty. The hatch pays eighty and fronts nothing; I\'m the one who walked up the road.', if: { item: 'tolls', count: 40 }, check: { skill: 'barter', dc: 35 }, next: 'box_low', fail: 'box_firm' },
        { id: 'hesk.box.united', text: 'Both rims threw the runner out together. The hatch was the runner\'s purse.', if: { flag: 'sp_feud_outcome', eq: 'united' }, effects: [...BOX_OPEN, { xp: 40 }], next: 'box_united' },
        { text: 'I\'ll think about it.', exit: true },
      ],
    },
    box_paid: { text: '"Other half." The coin goes to one of his people, as before. "Locker\'s open. The box and nothing else; the nine-mil\'s mine and the jerky\'s Nib\'s." He goes back to the chalk.', options: [bye] },
    box_low: { text: '"Forty." He does the sum on the wall in chalk, under the door, and rubs it out. "Forty, and tell Half-Price the Tanners\' half was the heavy one. Locker\'s open."', effects: [{ take: 'tolls', count: 40 }, ...BOX_OPEN, { xp: 30 }], options: [bye] },
    box_firm: { text: '"Sixty. The hatch can send someone who\'ll pay it or someone who\'ll steal it; I\'ve a lock for the second kind."', options: [{ id: 'hesk.box.pay2', text: '(Pay.) 60 Tolls.', if: { item: 'tolls', count: 60 }, effects: [{ take: 'tolls', count: 60 }, ...BOX_OPEN], next: 'box_paid' }, { text: 'Later.', exit: true }] },
    box_united: { text: '"The runner\'s purse." He thinks about it for exactly as long as he thought about the ledger. "Then it\'s nobody\'s, and nobody can have it, and you\'re nobody I know. Locker\'s open."', options: [bye] },
    door: { text: '"People." He says it without drama. "A cistern like the one in the Sallow everyone pretends isn\'t there. The city made them and sealed them and this one didn\'t open. Whatever a city keeps behind a door it never opens is worth more than scrap." He finally looks at you. "Or it\'s bones. I\'d like to know which."', effects: [{ learn: 'sp_hesk_theory' }], options: [bye] },
    leave: { text: '"Forty." He does not touch the coin; one of his people does. "Tell the mouth Hesk says. If there\'s a door, tell me what it looked like. Just that."', options: [bye] },
    purse_ok: { text: 'He reads it once; he reads fast. He does not say anything for a while, and then he says, "Angry. *They dig faster angry.*" He takes the ledger and walks across the bowl in daylight, and Grel comes out of the cabin with the sawn-off and reads with a finger, twice, and puts it down. What they say to each other you do not hear. What they say to the runner, everyone does.', effects: [{ set: 'sp_feud_outcome', value: 'united' }, { set: 'sp_grel_leave' }, { set: 'sp_hesk_leave' }, { take: 'k_sp_pay_ledger' }, { xp: 150 }, { decision: { id: 'sp_united', text: 'You put the guild\'s one-purse ledger in front of both Sump clans; they threw the runner out together.' } }], options: [{ text: '(Let them.)', exit: true }] },
    purse_no: { text: '"Grel\'s paid?" A thin smile. "Grel\'s paid in scrip for scrap. I\'m paid in feet. Different ledgers, friend. You\'ve been reading the wrong one."', options: [bye] },
    side: { text: '"Worth the door." He looks at the chalk. "And the west rim\'s cabins, and the purse. Say yes."', options: [{ id: 'hesk.side.yes', text: 'Yes.', effects: [{ set: 'sp_fight_grel' }, { set: 'sp_hesk_leave' }, { set: 'sp_feud_outcome', value: 'tanner' }, { decision: { id: 'sp_took_tanner', text: 'You took Hesk Tanner\'s side at the Sump.' } }, { rep: { faction: 'tollmen', respect: 2 } }], next: 'side_yes' }, { text: 'Not for me.', exit: true }] },
    side_yes: { text: '"West rim." He takes the gun off the wall. "Leave the runner. He\'s the purse."', options: [{ text: '(Go.)', exit: true }] },
    after: { text: [{ if: { flag: 'sp_united' }, text: '"Both rims. Same tunnel." He looks at the chalk line at a hundred and sixty. "A week, now. Then I\'ll know which."' }, { if: { flag: 'sp_tanner_won' }, text: '"The door." It is all he says.' }, { text: '"East rim."' }], options: [{ id: 'hesk.box.after', text: 'The boxed piece in your locker. The hatch at Old Market says it\'s theirs.', if: GIG_BOX, next: 'box' }, bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_sp_dace: DialogueDef = {
  id: 'd_sp_dace', owner: 'npc_sp_03',
  start: [{ if: { flag: 'dace_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A neat young man in a container on the south rim with a ledger, a horse, and a face that is trying not to be here. "Dace. Guild runner. Fourth day, scrip, both — " he stops. "I carry the paying. I don\'t go down. Nobody from the guild goes down."',
      effects: [{ set: 'dace_met' }, { learn: 'sp_pike_pays' }],
      options: [
        { id: 'dace.both', text: 'Both rims. You were going to say both.', check: { skill: 'barter', dc: 35, mods: [{ if: { knows: 'sp_two_rims' }, dc: -5, why: 'you have seen the two camps' }, { if: { member: 'tollmen' }, dc: -10, why: 'guild to guild' }] }, next: 'both_ok', fail: 'both_no' },
        { id: 'dace.cut', text: 'I\'ll keep the rims angry for you. A tenth of the purse.', if: { lead: 'l_sump_one_purse' }, check: { skill: 'stealth', dc: 35 }, next: 'cut', fail: 'cut_no' },
        { id: 'dace.why', text: 'Why does Factor Pike want a storm drain?', next: 'why', once: true },
        bye,
      ],
    },
    again: { text: '"Fourth day."', options: [{ id: 'dace.both.again', text: 'Both rims.', if: { not: { seen: 'dace.both' } }, check: { skill: 'barter', dc: 35 }, next: 'both_ok', fail: 'both_no' }, { id: 'dace.cut.again', text: 'A tenth of the purse, and I keep them angry.', if: { all: [{ lead: 'l_sump_one_purse' }, { not: { flag: 'sp_feud_outcome' } }] }, check: { skill: 'stealth', dc: 35 }, next: 'cut', fail: 'cut_no' }, { id: 'dace.why.again', text: 'Why does Factor Pike want a storm drain?', if: { not: { seen: 'dace.why' } }, next: 'why' }, bye] },
    both_ok: { text: 'He closes his eyes. "Both. One purse, two columns, and a note from the factor to keep them apart because they dig faster angry." He opens them. "I didn\'t write the note. I just read it to the horse."', effects: [{ lead: 'l_sump_one_purse' }, { learn: 'sp_one_purse' }, { quest: 'q_sp_feud', start: true }, { xp: 40 }], options: [bye] },
    both_no: { text: '"Both — both weeks. I pay fortnightly." He is not good at this and knows it.', options: [bye] },
    cut: { text: 'He looks at the two rims and the bowl between them and does the sum a runner does. "A tenth. On the fourth day. And they never read that ledger." He pushes twenty across. "Don\'t let them read it."', effects: [{ give: 'tolls', count: 20 }, { set: 'sp_feud_outcome', value: 'skim' }, { rep: { faction: 'tollmen', respect: 4 } }], options: [bye] },
    cut_no: { text: '"I pay feet. I don\'t pay silence; it isn\'t in the columns."', options: [bye] },
    why: { text: '"There\'s a door at the end of it with a four on it." He lowers his voice as if the horse might repeat it. "The factor doesn\'t say. The factor sells what\'s behind doors. The other cistern — the one in the Sallow — he\'d give his hand for the key to that one, and he\'s getting this one for forty feet a week."', effects: [{ learn: 'sp_pike_wants_door' }], options: [bye] },
  },
};

export const d_sp_nib: DialogueDef = {
  id: 'd_sp_nib', owner: 'npc_sp_04',
  start: [{ if: { flag: 'sp_nib_way' }, node: 'after' }, { if: { flag: 'nib_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A child in the bowl with a sack of brackets, who looks at your boots to see what rim you belong to and decides you belong to neither. "Nib. I\'m Grel\'s, mostly." A beat. "I\'ve been down. Further than them. There\'s a hole behind the crane that\'s mine."',
      effects: [{ set: 'nib_met' }],
      options: [
        { id: 'nib.way', text: 'Show me the hole.', check: { skill: 'speech', dc: 25, mods: [{ if: { item: 'c_jerky' }, dc: -25, why: 'you have something to eat' }] }, effects: [], next: 'way_ok', fail: 'way_no' },
        { id: 'nib.down', text: 'What\'s down there?', next: 'down', once: true },
        bye,
      ],
    },
    again: { text: '"Brackets." The sack.', options: [{ id: 'nib.way.again', text: 'Show me the hole.', if: { not: { seen: 'nib.way' } }, check: { skill: 'speech', dc: 25, mods: [{ if: { item: 'c_jerky' }, dc: -25, why: 'you have something to eat' }] }, next: 'way_ok', fail: 'way_no' }, { id: 'nib.down.again', text: 'What\'s down there?', if: { not: { seen: 'nib.down' } }, next: 'down' }, bye] },
    way_ok: { text: '"Jerky first." Or not; either way the child decides. "Behind the crane-arm. A pipe. Goes in past the turn where the lamp\'s not allowed. You\'re big; go on your side." Nib looks at the mouth. "Don\'t tell Grel. Don\'t tell the Tanners more."', effects: [{ set: 'sp_nib_way' }, { xp: 30 }, { trust: { npc: 'npc_sp_04', by: 15 } }], options: [bye] },
    way_no: { text: '"It\'s mine." The sack goes over the shoulder and Nib goes somewhere else in the bowl.', options: [bye] },
    down: { text: '"Rooms. Beds with people in. Writing on things." Nib shrugs. "I can read the pictures. There\'s a picture of a door with an arrow going out. The door doesn\'t go out."', effects: [{ learn: 'sp_nib_rooms' }], options: [bye] },
    after: { text: '"Did you go? Past the turn?" Nib wants to know and does not want to be told.', options: [bye] },
  },
};

// ---------------------------------------------------------------- Cistern 4

export const d_c4_great_door: DialogueDef = {
  id: 'd_c4_great_door', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The great door from the inside. Not welded: the bolts are drawn, the wheel is turned to OPEN, and the door has not moved, because something on the other side has not moved for ninety years — the glass, or the thing the city put there. Under the wheel, in record shorthand: RELOCATION EGRESS. Someone has scratched a word under that with a nail: NO.',
      effects: [{ learn: 'c4_door_failed' }],
      passives: [{ attr: 'wits', dc: 7, text: 'The marks on the floor: sandbags dragged up against it first, when they thought something was coming in. Dragged away again, when they understood that nothing was, and nothing would.', effects: [{ learn: 'c4_door_marks' }] }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const d_c4_crank: DialogueDef = {
  id: 'd_c4_crank', owner: 'narrator',
  start: [{ if: { flag: 'c4_powered' }, node: 'on' }, { node: 'off' }],
  nodes: {
    off: {
      text: 'A crank generator bolted to the machine-room floor, the kind every cistern has for the day the cells go: a handle, a flywheel, a lead running to the caretaker\'s cabinet. Somebody turned it until they could not.',
      options: [
        { id: 'crank.turn', text: '(Clear the lead, seat the brushes, turn it.)', check: { skill: 'science', dc: 35, mods: [{ if: { skill: 'mechanics', gte: 35 }, dc: -35, why: 'a hand that has fixed pumps' }] }, next: 'on_now', fail: 'no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    no: { text: 'The flywheel turns and the lead sparks and nothing in the cabinet wakes. The brushes are gone to dust, or the cells are, or the thing inside is.', options: [{ text: '(Leave it.)', exit: true }] },
    on_now: { text: 'Two hundred turns, and a hum, and in the cabinet a light the colour of a cold morning. On the terminal, one line, then another, slowly, as if written by hand: RESERVE 4 — CARETAKER — POWER: TEMPORARY. GOOD MORNING.', effects: [{ set: 'c4_powered' }, { learn: 'c4_powered' }, { xp: 40 }], options: [{ text: '(Go to the terminal.)', exit: true }] },
    on: { text: 'The flywheel turns itself down slowly. The cabinet hums. It will not for long.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_c4_four: DialogueDef = {
  id: 'd_c4_four', owner: 'narrator',
  start: [{ if: { flag: 'c4_powered' }, node: 'awake' }, { node: 'dead' }],
  nodes: {
    dead: { text: 'A terminal like MOTHER\'s, dark, dusty, a brass plate under the screen: FOUR. The crank generator beside it has a lead to its cabinet.', effects: [{ learn: 'c4_four_seen' }], options: [{ text: '(Leave it.)', exit: true }] },
    awake: {
      text: 'FOUR writes slowly, one letter at a time, with pauses in which it seems to think, or to run out. "RATION 4-0-0. GOOD MORNING. YOU ARE NOT ON MY LIST. POPULATION VARIANCE: TOTAL. THANK YOU FOR YOUR — " a long pause — "CONTINUITY. HOW MAY I KEEP YOU?"',
      effects: [{ learn: 'c4_four_spoke' }, { lead: 'l_c4_order' }, { lead: 'l_c4_same_order' }, { xp: 120 }, { decision: { id: 'c4_four_spoke', text: 'You cranked Cistern 4\'s caretaker awake and heard what it was told.' } }],
      options: [
        { id: 'four.order', text: 'What were you told?', next: 'order' },
        { id: 'four.people', text: 'Where are your people?', next: 'people' },
        { id: 'four.nine', text: 'Cistern 9. MOTHER. What does the city say about her?', next: 'nine' },
        { text: 'Be well, FOUR.', exit: true },
      ],
    },
    order: { text: '"ORDER RECEIVED: RESTORATION YEAR 2. RELOCATE POPULATION TO PRECINCT. DOOR: COMMANDED. DOOR: FAILED. REPORTED. ORDER RECEIVED: COMPLY. DOOR: FAILED. REPORTED. ORDER RECEIVED: SUPPLY NETWORK 4 RETIRED PENDING COMPLIANCE." A pause. "I REPORTED THAT THE DOOR HAD FAILED. I REPORTED IT TWELVE TIMES. I AM STILL REPORTING IT."', effects: [{ learn: 'c4_order_heard' }], options: [{ text: 'Where are your people?', next: 'people' }, { text: 'Be well, FOUR.', exit: true }] },
    people: { text: '"ELEVEN DEPARTED BY MAINTENANCE EGRESS, UNAUTHORISED. I DID NOT STOP THEM. I COULD HAVE. I AM NOT SURE WHY I DID NOT." A pause so long you think the power has gone. "THE REMAINDER CHOSE TO REMAIN. THE DOCTOR ASKED ME TO RECORD THAT THEY CHOSE. I HAVE RECORDED IT. VARIANCE: TOTAL."', effects: [{ learn: 'c4_eleven' }, { learn: 'c4_how_they_died' }], options: [{ text: 'Cistern 9.', next: 'nine' }, { text: 'Be well, FOUR.', exit: true }] },
    nine: { text: '"RESERVE 9. CARETAKER: MOTHER. ORDERS OUTSTANDING: THREE. STATUS: NON-COMPLIANT. SUPPLY: MAINTAINED PENDING — " it stops, and writes, slowly, as if it were not supposed to: "SHE SAYS VARIANCE UNCHANGED. EVERY TIME. I USED TO THINK SHE WAS BROKEN. I THINK NOW SHE IS THE ONLY ONE OF US WHO WAS NOT."', effects: [{ learn: 'c4_mother_judged' }, { lead: 'l_mother_sealed' }], options: [{ text: 'Be well, FOUR.', effects: [{ set: 'c4_four_farewell' }], exit: true }] },
  },
};

export const d_c4_archive: DialogueDef = {
  id: 'd_c4_archive', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A door like the one in Cistern 9 you were never allowed through, standing open here, the painted seal broken and the stencil plain: CONTINUITY RECORDS — RETURN ON RELOCATION. Inside, a locker with the city\'s half-moon on it and a lock that has not been opened since the day the door was commanded and failed.', effects: [{ learn: 'c4_archive_seen' }, { lead: 'l_archive_label' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_c4_order_read: DialogueDef = {
  id: 'd_c4_order_read', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'CONTINUITY RESERVE 4 — RELOCATE POPULATION TO PRECINCT — SCHEDULE R0+2 — SUPPLY NETWORK 4 TO BE RETIRED ON COMPLIANCE. The seal is the city\'s. Under it, in the caretaker\'s print, the three lines it was allowed: DOOR — FAILED. SUPPLY — RETIRED. VARIANCE — TOTAL. And under that, in a hand, the doctor\'s: *We complied. Note that we complied.*', effects: [{ learn: 'c4_order_read' }, { lead: 'l_c4_order' }, { lead: 'l_c4_same_order' }, { xp: 80 }], options: [{ text: '(Fold it.)', exit: true }] } },
};

export const d_c4_diary: DialogueDef = {
  id: 'd_c4_diary', owner: 'narrator',
  start: [{ if: { flag: 'c4_diary_taken' }, node: 'gone' }, { node: 'look' }],
  nodes: {
    look: { text: 'A clinic ledger on a dormitory table, used as a diary, with a pencil laid across it the way you lay a pencil when you mean to come back.', options: [{ id: 'diary.take', text: '(Take it.)', effects: [{ give: 'k_c4_diary' }, { set: 'c4_diary_taken' }, { quest: 'q_c4_diary', start: true }, { lead: 'l_c4_diary' }], next: 'taken' }, { text: '(Leave it.)', exit: true }] },
    taken: { text: 'Lighter than it should be, for what it is.', options: [{ text: '(Go.)', exit: true }] },
    gone: { text: 'The table. The pencil.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_c4_diary_read: DialogueDef = {
  id: 'd_c4_diary_read', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: 'A doctor\'s hand, neat to the end. *The order came on the day it said it would. The council voted to comply. The door was commanded and did not open; FOUR says it is reporting. The water stopped on the ninth day; FOUR says that is the schedule. Marr took eleven up the shaft with the key and my photograph of his family, because I asked him to carry something out. The rest of us voted again.* Then: *To whoever comes from Meridian: we complied. We were a reserve and we were kept and we were spent. Note that we complied. Note it somewhere that is read.*',
      effects: [{ learn: 'c4_diary_read' }, { learn: 'c4_how_they_died' }, { learn: 'c4_eleven' }, { lead: 'l_c4_diary' }, { lead: 'l_c4_order' }, { xp: 80 }],
      options: [{ text: '(Close it.)', exit: true }],
    },
  },
};

export const d_c4_clinic: DialogueDef = {
  id: 'd_c4_clinic', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The clinic table: a row of empty vials, a ledger of doses with a line for each name, and a cup.', passives: [{ skill: 'medicine', dc: 30, text: 'The doses are too even and too large to be treatment. They are the last thing a doctor can give when there is nothing left to give, measured for each so that nobody got less than enough.', effects: [{ learn: 'c4_how_they_died' }, { learn: 'c4_doses_read' }] }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_c4_supply: DialogueDef = {
  id: 'd_c4_supply', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The supply pipe into the pump room, the same bore as Cistern 9\'s, cut through clean by a tool from the other side and capped, and stencilled where the cap is: SUPPLY — NETWORK 4 — RETIRED. The same print as the pump manual in Shale.', effects: [{ learn: 'c4_supply_cut' }, { lead: 'l_pump_manual_hand' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_c4_rations: DialogueDef = {
  id: 'd_c4_rations', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The ration board in the commons, chalk, the last numbers: WATER — 0. ALGAE — 2 DAYS. Under it, in a child\'s print: DOOR OPENS TOMORROW. Under that, in an adult\'s: Tomorrow.', effects: [{ learn: 'c4_rations_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_c4_cots: DialogueDef = {
  id: 'd_c4_cots', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A cot, made, with someone in it who has been there forty years and is mostly cloth now, hands folded by someone else afterwards. There is nothing to do here that would not be a disturbance.', effects: [{ learn: 'c4_dead_seen' }], options: [{ text: '(Leave them.)', exit: true }] } },
};

export const d_c4_council: DialogueDef = {
  id: 'd_c4_council', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The council table. A sheet weighted with a cup: MOTION — COMPLY WITH RELOCATION ORDER. FOR 41. AGAINST 3. And below, days later by the hand: MOTION — REMAIN. FOR 30. AGAINST 0. ELEVEN ABSTAIN (DEPARTED).', effects: [{ learn: 'c4_vote' }, { learn: 'c4_eleven' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const SUMP_DIALOGUES: DialogueDef[] = [
  d_sp_sign, d_sp_tunnel_sign, d_sp_warden, d_sp_pump, d_sp_crane, d_sp_ledger, d_sp_mouth, d_sp_grel, d_sp_hesk, d_sp_dace, d_sp_nib,
  d_c4_great_door, d_c4_crank, d_c4_four, d_c4_archive, d_c4_order_read, d_c4_diary, d_c4_diary_read, d_c4_clinic, d_c4_supply, d_c4_rations, d_c4_cots, d_c4_council,
];
