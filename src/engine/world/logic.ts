import type { GameState } from '../core/state';
import { dayOf } from '../core/state';
import { addItem, countItem, makeItem, removeItem } from '../inventory/inventory';
import { attr, addXp, hasFlag, skill } from '../stats/sheet';
import type { AttributeId, SkillId } from '../stats/rules';
import { clamp100, relation, rep, type Memory } from './world';
import { addNews, heard, standing } from './frontier';
import { enlist, expel, factionDefs, isMember, setRank, syncMembership, type MembershipStatus } from './factions';

/**
 * Conditions and effects: the shared data language of dialogue, quests and triggers.
 * Content is plain objects, so writers never touch engine code.
 */

export type Cond =
  | { all: Cond[] } | { any: Cond[] } | { not: Cond }
  | { flag: string; eq?: number | string | boolean; gte?: number; lte?: number }
  | { quest: string; stage?: string | string[]; status?: 'active' | 'done' | 'failed' | 'none' }
  | { attr: AttributeId; gte?: number; lte?: number }
  | { skill: SkillId; gte: number }
  | { trait: string } | { perk: string } | { ability: string }
  | { item: string; count?: number }
  | { knows: string }
  | { remembers: { npc: string; tag: string } }
  | { trust: { npc: string; gte?: number; lte?: number } }
  | { affection: { npc: string; gte?: number; lte?: number } }
  | { approval: { companion: string; gte?: number; lte?: number } }
  | { inParty: string }
  | { rep: { faction: string; respect?: number; fear?: number } }
  | { origin: string }
  | { pronouns: 'he' | 'she' | 'they' }
  | { seen: string }
  | { dead: string }
  | { hour: { from: number; to: number } }
  | { lead: string }
  | { concluded: string }
  | { heard: { settlement: string; tag: string } }
  | { standing: { settlement: string; gte?: number; lte?: number } }
  | { event: string; is?: 'happened' | 'prevented' }
  | { masked: boolean }
  /** Has this chrome piece installed (working or not), or anything in this slot. */
  | { chrome: string } | { chromeSlot: string }
  | { drift: { gte?: number; lte?: number } }
  /** Live member of a faction (at `rank` or higher); or a past member with the given status. */
  | { member: string; rank?: string; status?: MembershipStatus };

export type Effect =
  | { set: string; value?: number | string | boolean }
  | { inc: string; by?: number }
  | { learn: string }
  | { memory: { npc: string; tag: string; valence?: number; strength?: number } }
  | { trust: { npc: string; by: number } }
  | { affection: { npc: string; by: number } }
  | { approval: { companion: string; by: number } }
  | { rep: { faction: string; respect?: number; fear?: number } }
  | { give: string; count?: number }
  | { take: string; count?: number }
  | { xp: number }
  | { lead: string }
  | { news: { tag: string; text?: string; valence: number; size?: number; at: string } }
  | { quest: string; start?: boolean; stage?: string; done?: boolean; fail?: boolean }
  | { decision: { id: string; text: string } }
  | { after: { minutes: number; id: string; effects: Effect[] } }
  | { join: string } | { leave: string }
  | { time: number }
  | { event: string; data?: unknown }
  /** Join a faction (expels conflicting memberships unless `cover` names the faction you really serve). */
  | { enlist: string; rank?: string; cover?: string }
  | { promote: { faction: string; rank: string } }
  | { expel: string; status?: MembershipStatus }
  /** Mail arrives (letters.ts schedules replies through this). */
  | { post: { from: string; text: string } };

/** Hooks the game provides for effects that reach outside world data (quests, combat, UI). */
export interface LogicHost {
  questStart?(id: string): void;
  questStage?(id: string, stage: string): void;
  questEnd?(id: string, status: 'done' | 'failed'): void;
  event?(name: string, data?: unknown): void;
  /** Called after XP is granted (UI toasts). */
  xp?(amount: number, levels: number): void;
  /** A companion's approval changed (UI reactions). */
  approval?(npc: string, by: number): void;
}

const inRange = (v: number, gte?: number, lte?: number) => (gte === undefined || v >= gte) && (lte === undefined || v <= lte);

export function test(c: Cond | undefined, g: GameState): boolean {
  if (!c) return true;
  const w = g.world, sh = g.pc.sheet;
  if ('all' in c) return c.all.every((x) => test(x, g));
  if ('any' in c) return c.any.some((x) => test(x, g));
  if ('not' in c) return !test(c.not, g);
  if ('flag' in c) {
    const v = g.flags[c.flag];
    if (c.eq !== undefined) return v === c.eq;
    if (c.gte !== undefined || c.lte !== undefined) return typeof v === 'number' && inRange(v, c.gte, c.lte);
    return !!v;
  }
  if ('quest' in c) {
    const q = w.quests[c.quest];
    if (c.status === 'none') return !q;
    if (!q) return false;
    if (c.status && q.status !== c.status) return false;
    if (c.stage) return (Array.isArray(c.stage) ? c.stage : [c.stage]).includes(q.stage);
    return c.status ? true : q.status === 'active';
  }
  if ('attr' in c) return inRange(attr(sh, c.attr), c.gte, c.lte);
  if ('skill' in c) return skill(sh, c.skill) >= c.gte;
  if ('trait' in c) return sh.traits.includes(c.trait);
  if ('perk' in c) return (sh.perks[c.perk] ?? 0) > 0;
  if ('ability' in c) return hasFlag(sh, c.ability);
  if ('item' in c) return countItem(g.pc.inventory, c.item) >= (c.count ?? 1);
  if ('knows' in c) return !!w.knowledge[c.knows];
  if ('remembers' in c) return (w.memories[c.remembers.npc] ?? []).some((m) => m.tag === c.remembers.tag);
  if ('trust' in c) return inRange(w.relations[c.trust.npc]?.trust ?? 0, c.trust.gte, c.trust.lte);
  if ('affection' in c) return inRange(w.relations[c.affection.npc]?.affection ?? 0, c.affection.gte, c.affection.lte);
  if ('approval' in c) return inRange(w.approval[c.approval.companion] ?? 0, c.approval.gte, c.approval.lte);
  if ('inParty' in c) return w.party.includes(c.inParty);
  if ('rep' in c) { const r = w.reputation[c.rep.faction] ?? { respect: 0, fear: 0 }; return r.respect >= (c.rep.respect ?? -Infinity) && r.fear >= (c.rep.fear ?? -Infinity); }
  if ('origin' in c) return g.origin === c.origin;
  if ('pronouns' in c) return g.pc.pronouns === c.pronouns;
  if ('seen' in c) return !!w.seen[c.seen];
  // NPC state is keyed by map ("shale/npc_sh_02"); a bare id matches on any map.
  if ('dead' in c) return Object.entries(g.npcs).some(([k, v]) => (k === c.dead || k.endsWith('/' + c.dead)) && !!v.dead);
  if ('hour' in c) { const h = (g.minutes % 1440) / 60; return c.hour.from <= c.hour.to ? h >= c.hour.from && h < c.hour.to : h >= c.hour.from || h < c.hour.to; }
  if ('lead' in c) return !!w.leads[c.lead];
  if ('concluded' in c) return !!w.conclusions[c.concluded];
  if ('heard' in c) return heard(g, c.heard.settlement, c.heard.tag);
  if ('standing' in c) return inRange(standing(g, c.standing.settlement), c.standing.gte, c.standing.lte);
  if ('event' in c) return c.is ? w.events[c.event] === c.is : !!w.events[c.event];
  if ('masked' in c) return !!w.masked === c.masked;
  if ('chrome' in c) return Object.values(sh.chrome ?? {}).some((p) => p?.id === c.chrome);
  if ('chromeSlot' in c) return !!sh.chrome?.[c.chromeSlot as keyof typeof sh.chrome];
  if ('drift' in c) return inRange(sh.drift ?? 0, c.drift.gte, c.drift.lte);
  if ('member' in c) {
    if (c.status && c.status !== 'member') return w.membership[c.member]?.status === c.status;
    return isMember(g, factionDefs(), c.member, c.rank);
  }
  return false;
}

export function apply(effects: Effect[] | undefined, g: GameState, host: LogicHost = {}): void {
  if (!effects) return;
  const w = g.world;
  for (const e of effects) {
    if ('set' in e) g.flags[e.set] = e.value ?? true;
    else if ('inc' in e) g.flags[e.inc] = (typeof g.flags[e.inc] === 'number' ? (g.flags[e.inc] as number) : 0) + (e.by ?? 1);
    else if ('learn' in e) w.knowledge[e.learn] = true;
    else if ('memory' in e) {
      const m: Memory = { tag: e.memory.tag, valence: e.memory.valence ?? 0, strength: e.memory.strength ?? 60, day: dayOf(g.minutes), source: 'witnessed' };
      const list = (w.memories[e.memory.npc] ??= []);
      const old = list.find((x) => x.tag === m.tag);
      if (old) Object.assign(old, m); else list.push(m);
    } else if ('trust' in e) { const r = relation(w, e.trust.npc); r.trust = clamp100(r.trust + e.trust.by); }
    else if ('affection' in e) { const r = relation(w, e.affection.npc); r.affection = clamp100(r.affection + e.affection.by); }
    else if ('approval' in e) { w.approval[e.approval.companion] = clamp100((w.approval[e.approval.companion] ?? 0) + e.approval.by); host.approval?.(e.approval.companion, e.approval.by); }
    else if ('rep' in e) { const r = rep(w, e.rep.faction); r.respect = clamp100(r.respect + (e.rep.respect ?? 0), 0); r.fear = clamp100(r.fear + (e.rep.fear ?? 0), 0); }
    else if ('give' in e) addItem(g.pc.inventory, makeItem(e.give, e.count ?? 1));
    else if ('take' in e) removeItem(g.pc.inventory, e.take, e.count ?? 1);
    else if ('xp' in e) { const lv = addXp(g.pc.sheet, e.xp); host.xp?.(e.xp, lv); }
    else if ('lead' in e) w.leads[e.lead] = true;
    else if ('news' in e) addNews(g, { tag: e.news.tag, text: e.news.text, valence: e.news.valence, size: e.news.size ?? 4, origin: e.news.at, about: w.masked ? 'masked' : 'player' });
    else if ('quest' in e) {
      if (e.start) host.questStart?.(e.quest);
      if (e.stage) host.questStage?.(e.quest, e.stage);
      if (e.done) host.questEnd?.(e.quest, 'done');
      if (e.fail) host.questEnd?.(e.quest, 'failed');
    } else if ('decision' in e) { if (!w.decisions.some((d) => d.id === e.decision.id)) w.decisions.push({ ...e.decision, minutes: g.minutes }); }
    else if ('after' in e) w.timers.push({ id: e.after.id, at: g.minutes + e.after.minutes, effects: e.after.effects });
    else if ('join' in e) { if (!w.party.includes(e.join)) w.party.push(e.join); }
    else if ('leave' in e) w.party = w.party.filter((p) => p !== e.leave);
    else if ('time' in e) g.minutes += e.time;
    else if ('event' in e) host.event?.(e.event, e.data);
    else if ('enlist' in e) {
      const defs = factionDefs();
      for (const out of enlist(g, defs, e.enlist, { rank: e.rank, cover: e.cover })) {
        w.decisions.push({ id: `expelled_${out}_for_${e.enlist}`, text: `Joining ${defs[e.enlist].name} cost you your place with ${defs[out].name}.`, minutes: g.minutes });
      }
      syncMembership(g, defs);
    } else if ('promote' in e) { setRank(g, factionDefs(), e.promote.faction, e.promote.rank); syncMembership(g, factionDefs()); }
    else if ('expel' in e) { expel(g, e.expel, e.status); syncMembership(g, factionDefs()); }
    else if ('post' in e) (w.post ??= []).push({ from: e.post.from, text: e.post.text, day: dayOf(g.minutes) });
  }
}

/** Fire timers that are due (call when the clock advances). Returns how many fired. */
export function runTimers(g: GameState, host: LogicHost = {}): number {
  const due = g.world.timers.filter((t) => t.at <= g.minutes);
  if (!due.length) return 0;
  g.world.timers = g.world.timers.filter((t) => t.at > g.minutes);
  for (const t of due) apply(t.effects as Effect[], g, host);
  return due.length;
}
