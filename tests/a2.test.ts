import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { addItem, countItem, makeItem } from '../src/engine/inventory/inventory';
import { QuestEngine } from '../src/engine/quest/quest';
import { test as cond } from '../src/engine/world/logic';

/** Play a conversation by choosing options whose text starts with the given prefixes, in order. */
function talk(id: string, g: ReturnType<typeof newGameState>, q: QuestEngine, picks: string[]): DialogueRunner {
  const r = new DialogueRunner(DIALOGUES[id], g, q);
  for (const p of picks) {
    const v = r.view();
    if (!v) throw new Error(`${id}: ended before "${p}"`);
    const o = v.options.find((x) => x.text.startsWith(p));
    if (!o) throw new Error(`${id}: no option "${p}" in [${v.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    q.update();
  }
  return r;
}

function atNinebridge(hour = 12) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 20 * 1440 + hour * 60;
  g.locationId = 'ninebridge';
  g.flags.visited_ninebridge = true;
  g.flags.ch1_done = true;
  const q = new QuestEngine(QUESTS, g);
  q.questStart('q_a2_ninebridge');
  return { g, q };
}

describe('Act 2 opens from the water clock', () => {
  it('every Act 1 finale outcome starts the road to Ninebridge', () => {
    const dw = QUESTS.q_a1_drywells;
    const enders = Object.values(dw.stages).filter((s) => s.end === 'done');
    expect(enders.length).toBeGreaterThan(2);
    for (const s of enders) expect(s.onEnter?.some((e) => 'quest' in e && e.quest === 'q_a2_ninebridge' && e.start)).toBe(true);
    const { g } = atNinebridge();
    expect(g.world.quests.q_a2_ninebridge.stage).toBe('road');
    expect(g.world.knowledge.loc_ninebridge).toBe(true);
  });
});

describe('Ninebridge: the toll, the floor, the Grand Factor', () => {
  it('pays twelve at the sandbags', () => {
    const { g, q } = atNinebridge();
    g.pc.inventory.tolls = 60;
    talk('d_nb_toll', g, q, ['(Pay. 12 Tolls)', '(Cross.)']);
    expect(g.pc.inventory.tolls).toBe(48);
    expect(g.flags.nb_toll_paid).toBe(true);
  });

  it('a sealed packet opens the floor and the office, and the Grand Factor pays for it unopened', () => {
    const { g, q } = atNinebridge();
    addItem(g.pc.inventory, makeItem('k_packet'));
    talk('d_nb_floor_door', g, q, ['(Show the sealed packet.)', '(In.)']);
    expect(g.flags.nb_floor_ok).toBe(true);
    expect(g.flags.nb_office_ok).toBe(true);
    g.pc.inventory.tolls = 0;
    talk('d_nb_sarr', g, q, ['(Put the packet on the desk.) From Tollhouse 9. Sealed.', 'Water.', 'That\'s all.']);
    expect(countItem(g.pc.inventory, 'k_packet')).toBe(0);
    expect(g.pc.inventory.tolls).toBe(40);
    expect(g.flags.nb_packet_delivered).toBe(true);
    expect(cond({ member: 'tollmen' }, g)).toBe(true);
    expect(g.world.knowledge.packet_water).toBe(true);
  });

  it('an opened packet puts the bearer in the floor\'s debt', () => {
    const { g, q } = atNinebridge();
    addItem(g.pc.inventory, makeItem('k_packet'));
    talk('d_packet_read', g, q, ['(Break the seal.)', '(Fold it.)']);
    expect(g.flags.packet_opened).toBe(true);
    g.flags.nb_office_ok = true;
    talk('d_nb_sarr', g, q, ['(Put the packet on the desk.)', 'What service?', 'That\'s all.']);
    expect(g.flags.nb_packet_debt).toBe(true);
    expect(g.world.quests.q_nb_strike?.stage).toBe('camp');
  });

  it('buys the protection line from the Grand Factor and the beat ends', () => {
    const { g, q } = atNinebridge();
    g.flags.nb_office_ok = true;
    g.pc.inventory.tolls = 250;
    talk('d_nb_sarr', g, q, ['Who paid for the riders who shot a man at Tollhouse 9?', '(Pay. 200 Tolls)', 'That\'s all.']);
    expect(g.pc.inventory.tolls).toBe(50);
    expect(countItem(g.pc.inventory, 'k_exchange_line')).toBe(1);
    expect(g.world.knowledge.nb_paid_truth).toBe(true);
    expect(g.world.quests.q_a2_ninebridge.status).toBe('done');
    expect(g.world.quests.q_a2_ninebridge.stage).toBe('paid');
  });

  it('the night ledgers tell the same line (stealth)', () => {
    const { g, q } = atNinebridge(2);
    g.pc.sheet.skillBought.stealth = 90;
    talk('d_nb_ledgers', g, q, ['(Ease the lower one out', '(Put it back.)']);
    expect(countItem(g.pc.inventory, 'k_exchange_line')).toBe(1);
    expect(g.world.quests.q_a2_ninebridge.status).toBe('done');
  });
});

describe('Ninebridge: Odile', () => {
  it('joins from the Span and reads two names by firelight', () => {
    const { g, q } = atNinebridge();
    addItem(g.pc.inventory, makeItem('k_map'));
    talk('d_nb_odile', g, q, ['Who are you?', 'What trade?', 'It\'s still there.', 'Come with me.', '(Go.)']);
    expect(g.world.party).toContain('npc_nb_03');
    expect(g.flags.odile_joined).toBe(true);
    expect(countItem(g.pc.inventory, 'k_odile_note')).toBe(1);
    g.flags.at_camp = true;
    talk('d_nb_odile', g, q, ['(Read two blocks with her.)', '(Fold it.)']);
    expect(g.world.knowledge.name2_decoded).toBe(true);
    expect(g.world.knowledge.name3_decoded).toBe(true);
    g.flags.at_camp = false;
    talk('d_nb_odile', g, q, ['Who paid for the riders at Tollhouse 9?', 'I\'ll take your word.']);
    expect(g.world.knowledge.nb_paid_truth).toBe(true);
    expect(g.world.quests.q_a2_ninebridge.status).toBe('done');
  });
});

describe('Ninebridge: the block and the ramp', () => {
  it('buys lot four at the block and puts the paper in her hands', () => {
    const { g, q } = atNinebridge();
    g.pc.inventory.tolls = 120;
    talk('d_nb_fen', g, q, ['Lot four.', 'That\'s all.']);
    expect(g.world.quests.q_nb_auction?.stage).toBe('block');
    talk('d_nb_fen', g, q, ['(Bid.) Sixty.', 'Ninety.', 'That\'s all.']);
    expect(g.pc.inventory.tolls).toBe(30);
    expect(countItem(g.pc.inventory, 'k_sable_contract')).toBe(1);
    talk('d_nb_sable', g, q, ['(Give her the contract.)', '(Let her go.)']);
    expect(g.flags.nb_sable_outcome).toBe('freed');
    expect(g.world.quests.q_nb_auction.status).toBe('done');
    expect(g.world.quests.q_nb_auction.stage).toBe('freed');
  });

  it('the guild\'s own forecast, in the porters\' hands, wins the strike', () => {
    const { g, q } = atNinebridge();
    addItem(g.pc.inventory, makeItem('k_strike_sheet'));
    talk('d_nb_voss', g, q, ['(Give him the guild\'s sheet.)', '(Watch them sit.)', 'That\'s all.']);
    expect(g.flags.nb_strike_outcome).toBe('won');
    expect(g.world.quests.q_nb_strike.status).toBe('done');
    expect(g.flags.nb_toll_rate).toBe('fair');
    expect(countItem(g.pc.inventory, 'k_strike_sheet')).toBe(0);
  });

  it('breaking the strike for the guild pays eighty at the post', () => {
    const { g, q } = atNinebridge();
    g.pc.sheet.skillBought.speech = 90;
    talk('d_nb_voss', g, q, ['You\'ll lose.', '(Go and collect from the warden.)']);
    expect(g.flags.nb_strike_outcome).toBe('broken');
    g.pc.inventory.tolls = 0;
    talk('d_nb_toll_warden', g, q, ['That\'s all.']);
    expect(g.pc.inventory.tolls).toBe(80);
    expect(g.flags.nb_toll_rate).toBe('high');
  });
});

function atOpenfield(hour = 12) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 24 * 1440 + hour * 60;
  g.locationId = 'openfield';
  g.flags.visited_openfield = true;
  g.flags.ch1_done = true;
  const q = new QuestEngine(QUESTS, g);
  q.questStart('q_a2_openfield');
  return { g, q };
}

describe('Openfield: every third row', () => {
  it('the Exchange beat ending starts the road to Openfield', () => {
    const { g, q } = atNinebridge();
    g.world.knowledge.nb_paid_truth = true;
    q.update();
    expect(g.world.quests.q_a2_ninebridge.status).toBe('done');
    expect(g.world.quests.q_a2_openfield?.stage).toBe('rows');
    expect(g.world.knowledge.loc_openfield).toBe(true);
  });

  it('the healer and the well both point at a dosed trough; the son confesses and the Elder is told', () => {
    const { g, q } = atOpenfield();
    talk('d_of_mason', g, q, ['What\'s killing them?', 'I\'ll look at the well.']);
    expect(g.flags.of_blight_told).toBe(true);
    g.pc.sheet.skillBought.medicine = 90;
    talk('d_of_imre', g, q, ['What is it, then?', '(Look at the child\'s hands and gums.)', 'That\'s all.']);
    expect(g.world.knowledge.of_well_dosed).toBe(true);
    g.pc.sheet.skillBought.speech = 90;
    talk('d_of_tobias', g, q, ['It\'s not blight. The north trough is dosed.', 'What now?', 'Your father hears it. From you, or from me.', '(Leave them to it.)']);
    expect(g.world.knowledge.of_poisoner_known).toBe(true);
    expect(countItem(g.pc.inventory, 'k_tobias_sheet')).toBe(1);
    expect(g.flags.of_blight_outcome).toBe('exposed');
    expect(g.world.quests.q_a2_openfield.status).toBe('done');
    expect(g.world.quests.q_a2_openfield.stage).toBe('exposed');
    expect(g.flags.of_well_clean).toBe(true);
  });

  it('the night stake-out at the well catches him; mercy keeps the secret', () => {
    const { g, q } = atOpenfield(2);
    g.pc.sheet.skillBought.stealth = 90;
    talk('d_of_well', g, q, ['(Wait in the dark by the north trough.)', 'Why.', 'Stop. Give me the pouch and the paper.', '(Go.)']);
    expect(g.flags.of_blight_outcome).toBe('mercy');
    expect(g.world.quests.q_a2_openfield.stage).toBe('mercy');
    expect(countItem(g.pc.inventory, 'k_tobias_sheet')).toBe(1);
  });

  it('the tracks at the well read straight to the hut', () => {
    const { g, q } = atOpenfield();
    g.pc.sheet.skillBought.survival = 90;
    talk('d_of_well', g, q, ['(Read the ground round the north trough.)', '(The son.)']);
    expect(g.world.knowledge.of_poisoner_known).toBe(true);
    expect(g.world.quests.q_a2_openfield.stage).toBe('found');
  });

  it('the word opens the hatch and the cellar names the stranger', () => {
    const { g, q } = atOpenfield();
    g.world.knowledge.word_larkspur = true;
    addItem(g.pc.inventory, makeItem('k_photo'));
    talk('d_of_cellar', g, q, ['(Say it to the iron.) "Larkspur."', '(Go down.)', 'There\'s a photograph of me. Older. In a city.', 'Not a kind one, you said.', '(Go up.)']);
    expect(g.flags.unwritten_met).toBe(true);
    expect(g.world.knowledge.stranger_name).toBe(true);
    expect(cond({ lead: 'l_stranger_unwritten' }, g)).toBe(true);
    expect(g.world.knowledge.unwritten_kill).toBe(true);
  });

  it('the Sky Rite makes a sibling of the Open Sky, and the brother at the grave joins', () => {
    const { g, q } = atOpenfield();
    talk('d_of_petra', g, q, ['The Choir\'s door is a burial, your father says.', 'The man who died at my door.', '(Keep the stone.)']);
    expect(g.flags.sky_rite).toBe(true);
    expect(cond({ member: 'choir', rank: 'sibling' }, g)).toBe(true);
    expect(countItem(g.pc.inventory, 'k_sky_token')).toBe(1);
    expect(g.world.quests.q_of_rite.status).toBe('done');
    g.flags.a2_openfield_done = true;
    talk('d_of_ash', g, q, ['Whose grave?', 'That\'s all.']);
    talk('d_of_ash', g, q, ['Come east.', '(Go.)']);
    expect(g.world.party).toContain('npc_of_03');
    expect(g.flags.ash_joined).toBe(true);
  });

  it('a crate a night: the guild\'s hand admits it and can be sent packing', () => {
    const { g, q } = atOpenfield();
    talk('d_of_doria', g, q, ['Who has keys?', 'That\'s all.']);
    expect(g.world.quests.q_of_seed?.stage).toBe('count');
    g.pc.sheet.skillBought.barter = 90;
    g.pc.sheet.skillBought.speech = 90;
    talk('d_of_corso', g, q, ['You\'re buying seed by night. A crate a time.', 'Pack the tent. Tonight.', 'That\'s all.']);
    expect(g.world.knowledge.of_seed_hollin).toBe(true);
    expect(g.flags.of_seed_outcome).toBe('corso_gone');
    expect(g.world.quests.q_of_seed.status).toBe('done');
  });

  it('dead seed, sold to the guild at a living price', () => {
    const { g, q } = atOpenfield();
    g.world.knowledge.of_seed_hollin = true;
    g.pc.sheet.skillBought.science = 90;
    talk('d_of_doria', g, q, ['Let them keep stealing. Give them dead seed.', '(Boil and dry a crate of last year\'s seed with her.)', 'I\'ll sell it to him myself.']);
    expect(countItem(g.pc.inventory, 'k_chaff')).toBe(1);
    g.pc.inventory.tolls = 0;
    talk('d_of_corso', g, q, ['I\'ve a crate for you. Choir seed, the good rows.', 'That\'s all.']);
    expect(g.pc.inventory.tolls).toBe(60);
    expect(g.world.quests.q_of_seed.stage).toBe('chaff');
  });
});
