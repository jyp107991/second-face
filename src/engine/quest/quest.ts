import type { GameState } from '../core/state';
import { apply, test, type Cond, type Effect, type LogicHost } from '../world/logic';

/**
 * Quests: stages with state-based objectives. Objectives evaluate world state, so any method that
 * achieves the state completes them (talk, sneak, fight, bribe…). Stages advance automatically when a
 * transition's condition holds. `routes` document the intended solutions for build-coverage checks.
 */

export interface ObjectiveDef { id: string; text: string; done: Cond; optional?: boolean; hidden?: boolean }

export interface StageDef {
  journal: string;
  objectives?: ObjectiveDef[];
  onEnter?: Effect[];
  /** Automatic transitions, tried in order. */
  next?: { if: Cond; stage: string }[];
  /** Entering this stage ends the quest. */
  end?: 'done' | 'failed';
}

export type RouteKind = 'fight' | 'talk' | 'stealth' | 'tech' | 'barter' | 'knowledge' | 'survival' | 'medicine';

export interface RouteDef { id: string; kind: RouteKind; label: string; requires?: Cond }

export interface QuestDef {
  id: string;
  title: string;
  /** Act / chapter used by build-coverage checks (expected character level). */
  act: 'ch1' | 'a1' | 'a2' | 'a3';
  critical?: boolean;
  start: string;
  stages: Record<string, StageDef>;
  xp?: number;
  routes?: RouteDef[];
}

export class QuestEngine implements LogicHost {
  /** Called when journal text changes (UI notification). */
  onJournal?: (questId: string, line: string) => void;
  onEnd?: (questId: string, status: 'done' | 'failed') => void;

  constructor(readonly defs: Record<string, QuestDef>, readonly g: GameState, readonly outer: LogicHost = {}) {}

  questStart(id: string): void {
    if (this.g.world.quests[id]) return;
    const d = this.def(id);
    this.g.world.quests[id] = { stage: d.start, status: 'active', startedAt: this.g.minutes, log: [], done: [] };
    this.enterStage(id, d.start);
  }

  questStage(id: string, stage: string): void {
    if (!this.g.world.quests[id]) this.questStart(id);
    const q = this.g.world.quests[id];
    if (q.status !== 'active' || q.stage === stage) return;
    this.enterStage(id, stage);
  }

  questEnd(id: string, status: 'done' | 'failed'): void {
    const q = this.g.world.quests[id];
    if (!q || q.status !== 'active') return;
    q.status = status;
    if (status === 'done' && this.def(id).xp) apply([{ xp: this.def(id).xp! }], this.g, this.outer);
    this.onEnd?.(id, status);
  }

  event(name: string, data?: unknown): void { this.outer.event?.(name, data); }
  xp(amount: number, levels: number): void { this.outer.xp?.(amount, levels); }

  private def(id: string): QuestDef {
    const d = this.defs[id];
    if (!d) throw new Error(`Unknown quest ${id}`);
    return d;
  }

  private enterStage(id: string, stage: string): void {
    const q = this.g.world.quests[id], s = this.def(id).stages[stage];
    if (!s) throw new Error(`Quest ${id}: unknown stage ${stage}`);
    q.stage = stage;
    q.done = [];
    q.log.push(s.journal);
    this.onJournal?.(id, s.journal);
    apply(s.onEnter, this.g, this);
    if (s.end) this.questEnd(id, s.end);
  }

  /** Re-evaluate active quests against the world. Call after any batch of effects. */
  update(): void {
    for (let guard = 0; guard < 20; guard++) {
      let moved = false;
      for (const [id, q] of Object.entries(this.g.world.quests)) {
        if (q.status !== 'active') continue;
        const s = this.def(id).stages[q.stage];
        for (const o of s.objectives ?? []) if (!q.done.includes(o.id) && test(o.done, this.g)) q.done.push(o.id);
        const t = (s.next ?? []).find((x) => test(x.if, this.g));
        if (t) { this.enterStage(id, t.stage); moved = true; }
      }
      if (!moved) return;
    }
  }

  /** Journal view: active quests with current objectives. */
  journal(): { id: string; title: string; status: string; log: string[]; objectives: { text: string; done: boolean; optional: boolean }[] }[] {
    return Object.entries(this.g.world.quests).map(([id, q]) => {
      const d = this.def(id), s = d.stages[q.stage];
      return {
        id, title: d.title, status: q.status, log: q.log,
        objectives: (s.objectives ?? []).filter((o) => !o.hidden || q.done.includes(o.id)).map((o) => ({ text: o.text, done: q.done.includes(o.id), optional: !!o.optional })),
      };
    });
  }
}
