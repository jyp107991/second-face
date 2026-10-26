import { Rng } from '../core/rng';
import type { OutfitRole } from '../data/outfits';

/**
 * Settlement types (DESIGN §13b): each sets a layout grammar, building kits, who lives there (outfit roles,
 * so a rail halt *looks* different from a commune), services and the kind of law. Named places are
 * handcrafted on top of their type; minor places are generated from type + seed.
 */

export type SettlementType =
  | 'shelter' | 'well_town' | 'raider_camp' | 'toll_fort' | 'rail_halt' | 'trade_town' | 'commune' | 'nomad_camp'
  | 'salvage_camp' | 'stilt_village' | 'dead_town' | 'bastion';

export type BuildKit = 'concrete' | 'adobe' | 'scrap' | 'containers' | 'timber' | 'stilts' | 'wagons' | 'wreck' | 'arcology';

export type Layout =
  | 'rings' | 'main_street' | 'compound' | 'walled_gate' | 'along_track' | 'vertical' | 'fields_halls' | 'wagon_ring'
  | 'spoil_yard' | 'water_lanes' | 'ruin' | 'districts';

export type Service =
  | 'store' | 'saloon' | 'inn' | 'mender' | 'clinic' | 'healer' | 'smith' | 'stable' | 'garage' | 'station' | 'dock'
  | 'market' | 'bank' | 'broker' | 'shrine' | 'pit' | 'jail' | 'company_store' | 'safehouse' | 'notice_board';

export type Law = 'council' | 'sheriff' | 'chief' | 'contract' | 'timetable' | 'communal' | 'honour' | 'foreman' | 'boat' | 'none' | 'bought';

export type Crisis = 'drought' | 'raid' | 'plague' | 'feud' | 'flood' | 'strike' | 'famine' | 'debt';

export interface SettlementTypeDef {
  name: string;
  layout: Layout;
  kits: BuildKit[];
  /** Typical population range. */
  size: [number, number];
  law: Law;
  /** Services and the chance each is present in a generated place. */
  services: Partial<Record<Service, number>>;
  /** Who you meet: outfit-role weights for residents. */
  roles: Partial<Record<OutfitRole, number>>;
  /** Prosperity range (0 = starving, 1 = rich). */
  prosperity: [number, number];
  /** Crises it is prone to. */
  crises: Crisis[];
  /** Moves across the world map over days. */
  moves?: boolean;
}

export const SETTLEMENT_TYPES: Record<SettlementType, SettlementTypeDef> = {
  shelter: { name: 'Shelter', layout: 'rings', kits: ['concrete'], size: [80, 400], law: 'council',
    services: { store: 1, clinic: 0.8, notice_board: 1 }, roles: { vault: 10, medic: 1, tech: 1 }, prosperity: [0.3, 0.6], crises: ['famine', 'plague', 'feud'] },
  well_town: { name: 'Well town', layout: 'main_street', kits: ['adobe', 'scrap', 'timber'], size: [60, 400], law: 'sheriff',
    services: { store: 1, saloon: 0.9, inn: 0.4, mender: 0.15, healer: 0.5, smith: 0.5, stable: 0.6, jail: 0.6, notice_board: 1, safehouse: 0.3 },
    roles: { settler: 8, labourer: 3, trader: 2, guard: 1, drifter: 1, pilgrim: 0.5 }, prosperity: [0.15, 0.5], crises: ['drought', 'raid', 'feud', 'debt'] },
  raider_camp: { name: 'Raider camp', layout: 'compound', kits: ['wreck', 'scrap'], size: [15, 80], law: 'chief',
    services: { pit: 0.6, smith: 0.4, market: 0.2 }, roles: { raider: 10, drifter: 2, labourer: 1 }, prosperity: [0.1, 0.4], crises: ['feud', 'famine', 'raid'] },
  toll_fort: { name: 'Toll fort', layout: 'walled_gate', kits: ['concrete', 'containers'], size: [30, 120], law: 'contract',
    services: { store: 1, bank: 0.7, inn: 0.6, garage: 0.4, jail: 0.8, notice_board: 1, broker: 0.3 },
    roles: { guard: 6, trader: 4, labourer: 2, drifter: 1 }, prosperity: [0.4, 0.7], crises: ['raid', 'debt', 'strike'] },
  rail_halt: { name: 'Rail halt', layout: 'along_track', kits: ['timber', 'containers', 'scrap'], size: [20, 200], law: 'timetable',
    services: { station: 1, store: 0.8, inn: 0.7, saloon: 0.5, garage: 0.3, notice_board: 1, safehouse: 0.3 },
    roles: { labourer: 5, trader: 3, settler: 2, drifter: 2, guard: 1, tech: 1 }, prosperity: [0.25, 0.6], crises: ['raid', 'strike', 'debt'] },
  trade_town: { name: 'Trade town', layout: 'vertical', kits: ['scrap', 'containers', 'wreck'], size: [300, 2000], law: 'contract',
    services: { market: 1, store: 1, bank: 0.9, broker: 0.7, inn: 1, saloon: 1, mender: 0.5, clinic: 0.3, garage: 0.6, dock: 0.4, jail: 0.7, notice_board: 1, safehouse: 0.8 },
    roles: { trader: 6, labourer: 4, guard: 3, street: 2, settler: 2, drifter: 2, tech: 1, medic: 1 }, prosperity: [0.4, 0.8], crises: ['feud', 'plague', 'strike', 'debt'] },
  commune: { name: 'Commune', layout: 'fields_halls', kits: ['timber', 'adobe'], size: [60, 300], law: 'communal',
    services: { healer: 1, shrine: 1, store: 0.5, inn: 0.4, notice_board: 0.6 }, roles: { pilgrim: 9, settler: 2, labourer: 1, medic: 1 },
    prosperity: [0.4, 0.7], crises: ['drought', 'plague', 'raid'] },
  nomad_camp: { name: 'Nomad camp', layout: 'wagon_ring', kits: ['wagons'], size: [25, 150], law: 'honour',
    services: { market: 0.9, garage: 0.7, stable: 0.6, healer: 0.4, pit: 0.3 }, roles: { nomad: 10, trader: 2, medic: 0.5 },
    prosperity: [0.3, 0.6], crises: ['feud', 'raid', 'famine'], moves: true },
  salvage_camp: { name: 'Salvage camp', layout: 'spoil_yard', kits: ['containers', 'scrap', 'timber'], size: [40, 300], law: 'foreman',
    services: { company_store: 1, saloon: 0.6, healer: 0.3, garage: 0.4, notice_board: 0.5 }, roles: { labourer: 9, guard: 2, drifter: 2, tech: 1 },
    prosperity: [0.1, 0.35], crises: ['strike', 'plague', 'debt', 'famine'] },
  stilt_village: { name: 'Stilt village', layout: 'water_lanes', kits: ['stilts', 'wreck', 'timber'], size: [30, 200], law: 'boat',
    services: { dock: 1, market: 0.6, healer: 0.5, inn: 0.3, shrine: 0.3 }, roles: { fisher: 9, settler: 2, trader: 1, drifter: 1 },
    prosperity: [0.15, 0.45], crises: ['flood', 'famine', 'plague', 'raid'] },
  dead_town: { name: 'Dead town', layout: 'ruin', kits: ['concrete', 'adobe', 'timber'], size: [0, 12], law: 'none',
    services: {}, roles: { drifter: 6, raider: 2, labourer: 1 }, prosperity: [0, 0.1], crises: [] },
  bastion: { name: 'Bastion city', layout: 'districts', kits: ['concrete', 'arcology', 'containers', 'scrap'], size: [20000, 400000], law: 'bought',
    services: { market: 1, store: 1, bank: 1, broker: 1, inn: 1, saloon: 1, mender: 1, clinic: 1, garage: 1, station: 1, dock: 1, jail: 1, pit: 1, shrine: 1, notice_board: 1, safehouse: 1 },
    roles: { street: 6, labourer: 5, trader: 3, drifter: 3, guard: 3, corp: 2, tech: 2, gilded: 1, medic: 1, pilgrim: 1 }, prosperity: [0.2, 0.9], crises: ['strike', 'plague', 'flood', 'feud'] },
};

/** A generated minor place's profile (named places set these by hand). */
export interface SettlementProfile {
  type: SettlementType;
  kit: BuildKit;
  population: number;
  prosperity: number;
  services: Service[];
  crisis?: Crisis;
}

/** Profile a minor settlement of a type from a seed. About a third of places are in some crisis. */
export function generateSettlement(type: SettlementType, seed: number): SettlementProfile {
  const T = SETTLEMENT_TYPES[type], r = new Rng(seed * 31 + 7);
  const prosperity = Math.round(r.range(...T.prosperity) * 100) / 100;
  const services = (Object.entries(T.services) as [Service, number][])
    // Richer places have more of what's optional.
    .filter(([, p]) => r.chance(Math.min(1, p * (0.7 + prosperity * 0.6))))
    .map(([s]) => s);
  return {
    type, kit: r.pick(T.kits), prosperity, services,
    population: Math.round(T.size[0] + (T.size[1] - T.size[0]) * Math.pow(r.next(), 1.6) * (0.6 + prosperity * 0.4)),
    crisis: T.crises.length && r.chance(0.33) ? r.pick(T.crises) : undefined,
  };
}

/**
 * Roles for `n` residents: drawn from the type's mix, shifted by prosperity (poor places have more drifters and
 * labourers, rich ones more traders and, in cities, the gilded). Deterministic per seed.
 */
export function residentRoles(type: SettlementType, prosperity: number, n: number, seed: number): OutfitRole[] {
  const r = new Rng(seed * 131 + 3);
  const mix = { ...SETTLEMENT_TYPES[type].roles };
  const shift = (role: OutfitRole, k: number) => { if (mix[role] !== undefined) mix[role] = Math.max(0, mix[role]! * k); };
  shift('drifter', 1.6 - prosperity);
  shift('labourer', 1.3 - prosperity * 0.5);
  shift('trader', 0.6 + prosperity);
  shift('gilded', prosperity * 1.5);
  shift('corp', 0.5 + prosperity);
  const entries = Object.entries(mix) as [OutfitRole, number][];
  const total = entries.reduce((t, [, w]) => t + w, 0);
  return Array.from({ length: n }, () => {
    let x = r.next() * total;
    for (const [role, w] of entries) if ((x -= w) < 0) return role;
    return entries[0][0];
  });
}
