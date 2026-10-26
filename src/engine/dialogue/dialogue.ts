import type { GameState } from '../core/state';
import { attr, skill } from '../stats/sheet';
import { ATTRIBUTE_INFO, SKILL_INFO, type AttributeId, type SkillId } from '../stats/rules';
import { effectiveSkill } from '../stats/checks';
import { apply, test, type Cond, type Effect, type LogicHost } from '../world/logic';

/**
 * Dialogue trees and the runner. Checks are deterministic and shown up front ([Speech 50]); choosing an
 * option whose check is not met follows its `fail` branch — failure is content, never a dead end.
 * Passive checks (Senses/Wits…) interject automatically. Options remember being chosen.
 */

export type Text = string | { if?: Cond; text: string }[];

export interface CheckDef {
  skill?: SkillId;
  attr?: AttributeId;
  dc: number;
  /** Situational DC changes, shown to the player when they apply (e.g. knowledge, evidence). */
  mods?: { if: Cond; dc: number; why: string }[];
}

export interface OptionDef {
  /** Stable id (for "asked before" memory). Defaults to `${tree}.${node}.${index}`. */
  id?: string;
  text: Text;
  if?: Cond;
  /** Hide (rather than omit) options whose condition fails? Default: omit. */
  showLocked?: boolean;
  check?: CheckDef;
  effects?: Effect[];
  next?: string;
  /** Branch when the check fails (defaults to `next` with no success effects). */
  fail?: string;
  failEffects?: Effect[];
  /** Only offer once. */
  once?: boolean;
  /** Ends the conversation. */
  exit?: boolean;
}

export interface PassiveDef {
  skill?: SkillId;
  attr?: AttributeId;
  dc: number;
  text: Text;
  effects?: Effect[];
}

export interface NodeDef {
  /** Speaker id: an NPC id, 'pc', or 'narrator'. Defaults to the tree's owner. */
  speaker?: string;
  text: Text;
  effects?: Effect[];
  passives?: PassiveDef[];
  options: OptionDef[];
}

export interface DialogueDef {
  id: string;
  /** NPC who owns the conversation (default speaker). */
  owner: string;
  /** Entry points tried in order; first whose condition passes wins. */
  start: { if?: Cond; node: string }[];
  nodes: Record<string, NodeDef>;
}

export interface OptionView {
  id: string;
  text: string;
  /** e.g. "Speech 50"; empty when there is no check. */
  checkLabel: string;
  checkMet: boolean;
  /** Why the DC changed, if it did. */
  checkNotes: string[];
  locked: boolean;
  seen: boolean;
}

export interface NodeView {
  speaker: string;
  text: string;
  /** Passive interjections that fired: label + text. */
  passives: { label: string; text: string }[];
  options: OptionView[];
}

/** Pronoun and name substitution: {name}, {they} {them} {their} {theirs} {themself}, capitalised forms. */
export function render(t: Text, g: GameState): string {
  const raw = typeof t === 'string' ? t : (t.find((v) => test(v.if, g))?.text ?? '');
  const p = g.pc.pronouns;
  const P: Record<string, string> = p === 'he' ? { they: 'he', them: 'him', their: 'his', theirs: 'his', themself: 'himself' }
    : p === 'she' ? { they: 'she', them: 'her', their: 'her', theirs: 'hers', themself: 'herself' }
      : { they: 'they', them: 'them', their: 'their', theirs: 'theirs', themself: 'themself' };
  return raw.replace(/\{(\w+)\}/g, (m, k: string) => {
    if (k === 'name') return g.pc.sheet.name || 'stranger';
    const low = k.toLowerCase();
    if (P[low]) return k[0] === k[0].toUpperCase() ? P[low][0].toUpperCase() + P[low].slice(1) : P[low];
    return m;
  });
}

function checkValue(c: CheckDef, g: GameState): number {
  return c.skill ? effectiveSkill(g.pc.sheet, g.pc.inventory, c.skill) : attr(g.pc.sheet, c.attr!);
}

function checkDc(c: CheckDef, g: GameState): { dc: number; notes: string[] } {
  let dc = c.dc;
  const notes: string[] = [];
  for (const m of c.mods ?? []) if (test(m.if, g)) { dc += m.dc; notes.push(`${m.dc > 0 ? '+' : '−'}${Math.abs(m.dc)}: ${m.why}`); }
  return { dc: Math.max(0, dc), notes };
}

function checkName(c: { skill?: SkillId; attr?: AttributeId }): string {
  return c.skill ? SKILL_INFO[c.skill].name : ATTRIBUTE_INFO[c.attr!].name;
}

export interface DialogueHost extends LogicHost {
  /** XP for passing a check (once per option). */
  checkXp?: number;
}

export class DialogueRunner {
  node: string | null;
  private passivesShown = new Set<string>();

  constructor(readonly def: DialogueDef, readonly g: GameState, readonly host: DialogueHost = {}) {
    this.node = def.start.find((s) => test(s.if, g))?.node ?? null;
    if (this.node) this.enter(this.node);
  }

  get ended(): boolean { return this.node === null; }

  private optionId(i: number, o: OptionDef): string { return o.id ?? `${this.def.id}.${this.node}.${i}`; }

  private enter(id: string): void {
    const n = this.def.nodes[id];
    if (!n) throw new Error(`Dialogue ${this.def.id}: unknown node ${id}`);
    apply(n.effects, this.g, this.host);
  }

  view(): NodeView | null {
    if (!this.node) return null;
    const n = this.def.nodes[this.node];
    const passives: NodeView['passives'] = [];
    (n.passives ?? []).forEach((p, i) => {
      const value = p.skill ? skill(this.g.pc.sheet, p.skill) : attr(this.g.pc.sheet, p.attr!);
      if (value < p.dc) return;
      const key = `${this.node}.${i}`;
      if (!this.passivesShown.has(key)) { this.passivesShown.add(key); apply(p.effects, this.g, this.host); }
      passives.push({ label: checkName(p).toUpperCase(), text: render(p.text, this.g) });
    });
    const options: OptionView[] = [];
    n.options.forEach((o, i) => {
      const id = this.optionId(i, o);
      const ok = test(o.if, this.g);
      if (!ok && !o.showLocked) return;
      if (o.once && this.g.world.seen[id]) return;
      let checkLabel = '', checkMet = true, checkNotes: string[] = [];
      if (o.check) {
        const { dc, notes } = checkDc(o.check, this.g);
        checkLabel = `${checkName(o.check)} ${dc}`;
        checkMet = checkValue(o.check, this.g) >= dc;
        checkNotes = notes;
      }
      options.push({ id, text: render(o.text, this.g), checkLabel, checkMet, checkNotes, locked: !ok, seen: !!this.g.world.seen[id] });
    });
    return { speaker: n.speaker ?? this.def.owner, text: render(n.text, this.g), passives, options };
  }

  /** Choose an option by id. Returns whether a check passed (true when there was none). */
  choose(optionId: string): boolean {
    if (!this.node) throw new Error('Dialogue has ended');
    const n = this.def.nodes[this.node];
    const i = n.options.findIndex((o, k) => this.optionId(k, o) === optionId);
    if (i < 0) throw new Error(`Dialogue ${this.def.id}: no option ${optionId} at ${this.node}`);
    const o = n.options[i];
    if (!test(o.if, this.g)) throw new Error(`Dialogue ${this.def.id}: option ${optionId} is locked`);
    const firstTime = !this.g.world.seen[optionId];
    this.g.world.seen[optionId] = (this.g.world.seen[optionId] ?? 0) + 1;
    let passed = true;
    if (o.check) {
      const { dc } = checkDc(o.check, this.g);
      passed = checkValue(o.check, this.g) >= dc;
    }
    if (passed) {
      apply(o.effects, this.g, this.host);
      if (o.check && firstTime && this.host.checkXp) apply([{ xp: this.host.checkXp }], this.g, this.host);
    } else apply(o.failEffects, this.g, this.host);
    const next = passed ? o.next : (o.fail ?? o.next);
    if (o.exit || !next) { this.node = null; return passed; }
    this.node = next;
    this.enter(next);
    return passed;
  }
}
