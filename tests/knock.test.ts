import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { countItem } from '../src/engine/inventory/inventory';

/** Play a conversation by choosing options whose text starts with the given prefixes, in order. */
function talk(id: string, g: ReturnType<typeof newGameState>, q: QuestEngine, picks: string[]): string {
  const r = new DialogueRunner(DIALOGUES[id], g, q);
  let last = '';
  for (const p of picks) {
    const v = r.view();
    if (!v) throw new Error(`${id}: ended before "${p}"`);
    last = v.text;
    const o = v.options.find((x) => x.text.startsWith(p));
    if (!o) throw new Error(`${id}: no option "${p}" in [${v.options.map((x) => x.text).join(' | ')}] at "${v.text.slice(0, 60)}"`);
    r.choose(o.id);
    q.update();
  }
  return last;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function kill(g: ReturnType<typeof newGameState>, id: string) { (g.npcs as any)[id] = { ...((g.npcs as any)[id] ?? {}), dead: true }; }

function weakling(origin?: string) {
  const g = newGameState('c9_mouth', 9, 20);
  for (const k of Object.keys(g.pc.sheet.baseAttrs) as (keyof typeof g.pc.sheet.baseAttrs)[]) g.pc.sheet.baseAttrs[k] = 1;
  if (origin) g.origin = origin;
  g.minutes = 7 * 60;
  const q = new QuestEngine(QUESTS, g);
  q.questStart('q_ch1_knock');
  return { g, q };
}

/** The hatch day for anyone: no check needed to finish it. */
function hatchDay(g: ReturnType<typeof newGameState>, q: QuestEngine) {
  talk('d_kn_maud', g, q, ['On my way.']);
  expect(countItem(g.pc.inventory, 'k_kn_wool')).toBe(1);
  talk('d_kn_hatch', g, q, ['(Put the wool', 'Two of water and the medicine', '(Step back.)']);
  expect(g.flags.kn_hatch_traded).toBe(true);
  expect(countItem(g.pc.inventory, 'k_kn_cistern_post')).toBe(1);
  talk('d_kn_maud', g, q, ['What now?', 'Rib, then the windpump.']);
  expect(g.world.quests.q_ch1_knock.stage).toBe('chores');
}

function chores(g: ReturnType<typeof newGameState>, q: QuestEngine, rib: 'share' | 'back_off' | 'fight') {
  talk('d_kn_dace', g, q, ['What\'s the plan?', 'Lead on.']);
  if (rib === 'back_off') talk('d_kn_rib', g, q, ['Then share it', '(Back off.)']);
  else if (rib === 'share') { g.pc.sheet.skillBought.barter = 60; talk('d_kn_rib', g, q, ['Then share it', '(Go to the box.)']); talk('d_kn_mast', g, q, ['(Lever it open', '(Pack it.)']); }
  else { talk('d_kn_rib', g, q, ['Get off Knock']); kill(g, 'npc_kn_rib_a'); kill(g, 'npc_kn_rib_b'); talk('d_kn_mast', g, q, ['(Lever it open', '(Pack it.)']); }
  expect(g.flags.kn_rib_done).toBe(true);
  talk('d_kn_corin', g, q, ['Let me look at it.', 'I\'m no use with gears']);
  expect(g.flags.kn_corin_done).toBe(true);
  talk('d_kn_maud', g, q, ['I\'ll find her.']);
  expect(g.world.quests.q_ch1_knock.stage).toBe('linnet');
}

describe('The opening at Knock', () => {
  it('a character with no useful skills can get from hatch day to the road (the critical path is never gated)', () => {
    const { g, q } = weakling();
    hatchDay(g, q);
    chores(g, q, 'back_off');
    talk('d_kn_buyer', g, q, ['She made the deal']);
    expect(g.flags.kn_linnet_beaten).toBe(true);
    expect(g.world.quests.q_ch1_knock.stage).toBe('evening');
    talk('d_kn_maud', g, q, ['(Eat in silence.)', 'I\'ll take the lamp.']);
    expect(g.flags.kn_night).toBe(true);
    expect(Math.floor((g.minutes % 1440) / 60)).toBe(22);
    expect(g.world.quests.q_ch1_knock.stage).toBe('night');
    talk('d_kn_stranger', g, q, ['(Go to him.)', 'Who are you?', '(Look at the photograph.)', '(Search his pack.)', '(Leave him']);
    expect(countItem(g.pc.inventory, 'k_photo')).toBe(1);
    expect(countItem(g.pc.inventory, 'k_notebook')).toBe(1);
    expect(g.flags.c9_examined).toBe(true);
    talk('d_kn_maud', g, q, ['(Sleep until morning.)']);
    expect(Math.floor((g.minutes % 1440) / 60)).toBe(7);
    expect(g.world.quests.q_ch1_knock.status).toBe('done');
    expect(g.world.quests.q_ch1_outriders.stage).toBe('square');
    talk('d_kn_outriders', g, q, ['(Hand over the notebook.)', 'What due?', '(Go to Maud.)']);
    expect(g.flags.kn_maud_hurt).toBe(true);
    expect(countItem(g.pc.inventory, 'k_photo')).toBe(1);
    expect(countItem(g.pc.inventory, 'k_notebook')).toBe(0);
    expect(g.world.quests.q_ch1_outriders.stage).toBe('burned');
    talk('d_kn_grille', g, q, ['Pell can save her', '(Leave the Grille.)']);
    talk('d_kn_hatch', g, q, ['Please.', '(Leave it.)']);
    expect(g.flags.kn_maud_scarred).toBe(true);
    talk('d_kn_maud', g, q, ['They came for the stranger', 'I\'ll come home.', 'I\'ll write.']);
    expect(g.world.quests.q_ch1_outriders.stage).toBe('leave');
    expect(g.flags.kn_free_to_leave).toBe(true);
    g.flags.c9_left = true;
    q.update();
    expect(g.world.quests.q_ch1_outriders.status).toBe('done');
    expect(g.world.quests.q_ch1_shale?.status).toBe('active');
  });

  it('each origin has its own morning and its own way through', () => {
    for (const [origin, line] of [['pump_hand', 'wool won'], ['clinic_aide', 'Hesper\'s boy'], ['door_watch', 'Off the watch'], ['archive_clerk', 'factor\'s already']]) {
      const { g } = weakling(origin);
      const r = new DialogueRunner(DIALOGUES.d_kn_maud, g);
      expect(r.view()!.text, origin).toContain(line);
    }
    // the Night Watch hears the stranger's last word
    const { g, q } = weakling('door_watch');
    g.flags.kn_night = true;
    talk('d_kn_stranger', g, q, ['(Go to him.)', 'Who are you?']);
    expect(g.world.leads.l_larkspur).toBe(true);
  });

  it('the echoing choice: hide, lie or fight, and the hatch opens for Maud only if MOTHER is persuaded', () => {
    const { g, q } = weakling('pump_hand');
    hatchDay(g, q);
    chores(g, q, 'share');
    g.pc.sheet.skillBought.speech = 60;
    talk('d_kn_buyer', g, q, ['You bought clean water']);
    expect(g.flags.kn_linnet_talked).toBe(true);
    talk('d_kn_maud', g, q, ['(Eat in silence.)', 'I\'ll take the lamp.']);
    talk('d_kn_stranger', g, q, ['(Go to him.)', 'Who are you?', '(Look at the photograph.)', '(Search his pack.)', '(Leave him']);
    talk('d_kn_maud', g, q, ['(Sleep until morning.)']);
    talk('d_kn_outriders', g, q, ['He died in the night', 'What due?', '(Go to Maud.)']);
    expect(g.flags.kn_out_choice).toBe('lied');
    expect(countItem(g.pc.inventory, 'k_notebook')).toBe(1);
    talk('d_kn_hatch', g, q, ['Maud Ferrow has kept your hatch honest', '(Run it to Maud.)']);
    expect(g.flags.kn_maud_saved).toBe(true);
    expect(g.world.decisions.map((d) => d.id)).toEqual(expect.arrayContaining(['kn_linnet_talked', 'kn_lied_hale', 'kn_mother_opened']));
  });

  it('fighting the outriders beside Corin burns the post-house too, and the stage moves on when they are down', () => {
    const { g, q } = weakling();
    q.questStart('q_ch1_outriders');
    g.flags.kn_outriders = true;
    talk('d_kn_outriders', g, q, ['(Raise your arm to the rise.)', '(Fight.)']);
    expect(g.world.quests.q_ch1_outriders.stage).toBe('fight');
    for (const id of ['npc_kn_out_lead', 'npc_kn_out_a', 'npc_kn_out_b']) kill(g, id);
    q.update();
    expect(g.flags.kn_posthouse_burned).toBe(true);
    expect(g.world.quests.q_ch1_outriders.stage).toBe('burned');
  });
});
