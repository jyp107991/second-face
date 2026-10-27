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
