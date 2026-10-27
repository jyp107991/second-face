import type { GameState } from '../core/state';
import { addItem, makeItem, type Inventory } from '../inventory/inventory';
import { itemDef } from '../inventory/items';
import type { NpcDef } from '../npc/defs';
import { chromeDef, installChrome, installedChrome, removeChrome, repairChrome, surgeryRisk, type ChromeDef, type ChromeSlot, type SurgeryOutcome } from '../stats/chrome';
import { attrs } from '../stats/sheet';

/**
 * A surgeon's table (rules; the screen is ui/surgery.ts). What a piece costs to fit here, what the risk is for this
 * patient, and the operation itself: pay, roll, fit or fail, box the old piece. Pure except for the state it is
 * handed.
 */

export interface SurgeryOffer {
  def: ChromeDef;
  /** Where the piece comes from: the surgeon's own stock (bought and fitted) or a boxed piece in the pack. */
  source: 'stock' | 'pack';
  /** Index of the boxed piece in the pack (source 'pack'). */
  packIndex?: number;
  price: number;
  fee: number;
  total: number;
  risk: number;
  hours: number;
  /** The piece in that slot now, if any (it is boxed and returned). */
  replaces?: ChromeDef;
}

export function surgeonMedicine(npc: NpcDef): number { return npc.skills?.medicine ?? 30; }

/** Base fee plus the piece's difficulty; repairs and removals are cheaper. */
export function fitFee(npc: NpcDef, def: ChromeDef): number { return (npc.surgeon?.fee ?? 40) + def.surgery.difficulty; }
export function repairFee(npc: NpcDef, condition: number): number { return Math.round((npc.surgeon?.fee ?? 40) * 0.5 + (1 - condition) * 80); }
export function removeFee(npc: NpcDef): number { return Math.round((npc.surgeon?.fee ?? 40) * 0.75); }

function stockKey(npcId: string, chromeId: string): string { return `surgery_sold_${npcId}_${chromeId}`; }

/** Everything this surgeon could fit into this patient today. */
export function surgeryOffers(g: GameState, npcId: string, npc: NpcDef): SurgeryOffer[] {
  const sheet = g.pc.sheet, a = attrs(sheet), med = surgeonMedicine(npc);
  const offer = (def: ChromeDef, source: SurgeryOffer['source'], packIndex?: number): SurgeryOffer => {
    const fee = fitFee(npc, def), price = source === 'stock' ? def.price : 0;
    const cur = sheet.chrome?.[def.slot];
    return { def, source, packIndex, price, fee, total: price + fee, risk: surgeryRisk(def, med, a.grit), hours: def.surgery.hours, replaces: cur ? chromeDef(cur.id) : undefined };
  };
  const out: SurgeryOffer[] = [];
  for (const id of npc.surgeon?.stock ?? []) {
    const def = chromeDef(id);
    if (def && !g.flags[stockKey(npcId, id)]) out.push(offer(def, 'stock'));
  }
  g.pc.inventory.items.forEach((it, i) => {
    const d = itemDef(it.def);
    const def = d.chrome ? chromeDef(d.chrome) : undefined;
    if (def) out.push(offer(def, 'pack', i));
  });
  return out;
}

export interface SurgeryResult { outcome: SurgeryOutcome | 'cannot_pay'; text: string; hours: number }

/** Box a piece back into the pack (every catalogue piece has a boxed item). */
function boxPiece(inv: Inventory, chromeId: string): void {
  const boxed = `ci_${chromeId}`;
  try { addItem(inv, makeItem(boxed, 1)); } catch { /* no boxed form: the piece is lost */ }
}

/** The operation. `roll` is 0..1 from the game's RNG. Time passes in the caller (returned hours). */
export function performSurgery(g: GameState, npcId: string, npc: NpcDef, o: SurgeryOffer, day: number, roll: number): SurgeryResult {
  const inv = g.pc.inventory, sheet = g.pc.sheet;
  if (inv.tolls < o.total) return { outcome: 'cannot_pay', text: `That is ${o.total} Tolls, and you have ${inv.tolls}.`, hours: 0 };
  inv.tolls -= o.total;
  if (o.source === 'pack' && o.packIndex !== undefined) {
    const it = inv.items[o.packIndex];
    if (it && it.qty > 1) it.qty--; else inv.items.splice(o.packIndex, 1);
  }
  const old = sheet.chrome?.[o.def.slot];
  const med = surgeonMedicine(npc), a = attrs(sheet);
  const outcome = installChrome(sheet, o.def.id, day, med, a.grit, roll);
  if (outcome === 'rejected') {
    // The body refused it: the fee is spent, the piece is not. A bought piece is refunded; a brought one is boxed again.
    if (o.source === 'stock') inv.tolls += o.price; else boxPiece(inv, o.def.id);
    return { outcome, text: `${npc.name} works for ${o.hours} hours and the body will not have it. The ${o.def.name} comes out again. The fee is spent.`, hours: o.hours };
  }
  if (o.source === 'stock') g.flags[stockKey(npcId, o.def.id)] = true;
  if (old && old.id !== o.def.id) boxPiece(inv, old.id);
  const replaced = old ? ` The ${chromeDef(old.id)?.name ?? 'old piece'} comes out and goes in a box.` : '';
  return outcome === 'clean'
    ? { outcome, text: `${o.hours} hours under the lamp. The ${o.def.name} is in and it is yours.${replaced}`, hours: o.hours }
    : { outcome, text: `${o.hours} hours, and a bad half hour in the middle of them. The ${o.def.name} is in, but it did not go in clean: it will need seeing to.${replaced}`, hours: o.hours };
}

export function performRepair(g: GameState, npc: NpcDef, slot: ChromeSlot): { ok: boolean; text: string } {
  const p = g.pc.sheet.chrome?.[slot];
  if (!p) return { ok: false, text: 'Nothing there.' };
  const fee = repairFee(npc, p.condition);
  if (g.pc.inventory.tolls < fee) return { ok: false, text: `${fee} Tolls for that, and you have ${g.pc.inventory.tolls}.` };
  g.pc.inventory.tolls -= fee;
  repairChrome(g.pc.sheet, slot, 1);
  return { ok: true, text: `${chromeDef(p.id)?.name ?? 'The piece'} seen to: ${fee} Tolls.` };
}

export function performRemoval(g: GameState, npc: NpcDef, slot: ChromeSlot): { ok: boolean; text: string } {
  const p = g.pc.sheet.chrome?.[slot];
  if (!p) return { ok: false, text: 'Nothing there.' };
  const fee = removeFee(npc);
  if (g.pc.inventory.tolls < fee) return { ok: false, text: `${fee} Tolls to take it out, and you have ${g.pc.inventory.tolls}.` };
  g.pc.inventory.tolls -= fee;
  const out = removeChrome(g.pc.sheet, slot);
  if (out) boxPiece(g.pc.inventory, out.id);
  return { ok: true, text: `${chromeDef(p.id)?.name ?? 'The piece'} out and boxed: ${fee} Tolls.` };
}

/** A line per installed piece for the screen. */
export function bodyLines(g: GameState): { slot: ChromeSlot; def: ChromeDef; condition: number; upkeepDue?: number }[] {
  return installedChrome(g.pc.sheet).map((c) => ({ slot: c.slot, def: c.def, condition: c.piece.condition, upkeepDue: c.piece.upkeepDue }));
}
