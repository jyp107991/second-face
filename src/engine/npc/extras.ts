import { Rng } from '../core/rng';
import { randomAppearance, type Lifestyle } from '../data/appearance';
import type { OutfitRole } from '../data/outfits';
import type { Cond } from '../world/logic';
import type { NpcDef } from './defs';

/**
 * Background people: a place says how many of what kind stand, work, sit and wander where, and they are generated
 * when the map loads (the same faces every time, from the map's seed). They have a first name, a line or two of
 * shallow talk, and barks; they do not go in the notebook. Named people are content; extras are atmosphere.
 */

export interface ExtrasDef {
  /** How many. */
  count: number;
  /** Roles to draw from (clothes, build, grime); default settlers and labourers. */
  roles?: OutfitRole[];
  life?: Lifestyle;
  faction?: string;
  team?: string;
  hostileIf?: Cond;
  /** Ages drawn from this range (children and the old included where a place has them). */
  ages?: [number, number];
  /** Where they wander: a rectangle of tiles, and/or named spots. A spot's name says what is done there:
   *  `*_work` a work loop, `*_sit` sitting, `*_lean` leaning, `*_pair_a`/`*_pair_b` two people talking. */
  area?: { x: number; y: number; w: number; h: number };
  spots?: string[];
  /** Present only during these hours (wraps past midnight). */
  hours?: { from: number; to: number };
  barks?: string[];
  /** Generic talk tree (default by role: `d_x_<role>`). */
  talk?: string;
}

const NAMES: Record<string, { m: string[]; f: string[] }> = {
  west_african: { m: ['Kofi', 'Sekou', 'Abel', 'Tunde', 'Ezra', 'Femi', 'Jonah', 'Obi'], f: ['Ama', 'Nia', 'Efua', 'Adaeze', 'Sade', 'Mabel', 'Tiwa', 'Ruth'] },
  east_african: { m: ['Dawit', 'Tesfa', 'Abram', 'Yonas', 'Kal', 'Samuel', 'Biruk', 'Eli'], f: ['Hana', 'Sena', 'Marta', 'Liya', 'Rahel', 'Tigist', 'Adina', 'Selam'] },
  north_european: { m: ['Lars', 'Tom', 'Piet', 'Arne', 'Jory', 'Bram', 'Cal', 'Wil'], f: ['Greta', 'Ida', 'Ann', 'Lotte', 'Maren', 'Edda', 'Jen', 'Sig'] },
  mediterranean: { m: ['Luca', 'Dario', 'Tomas', 'Elio', 'Nico', 'Sal', 'Marco', 'Rafe'], f: ['Lena', 'Rosa', 'Mira', 'Ines', 'Carla', 'Bea', 'Noor', 'Pia'] },
  south_asian: { m: ['Arjun', 'Ravi', 'Dev', 'Kiran', 'Sam', 'Vik', 'Anil', 'Raj'], f: ['Priya', 'Asha', 'Meera', 'Nila', 'Tara', 'Riya', 'Suni', 'Veda'] },
  east_asian: { m: ['Jin', 'Hiro', 'Wen', 'Taeo', 'Kenji', 'Min', 'Bo', 'Ren'], f: ['Mei', 'Yuki', 'Hana', 'Lin', 'Sora', 'Ji', 'Aya', 'Rin'] },
  southeast_asian: { m: ['Bayu', 'Arif', 'Tono', 'Kai', 'Dion', 'Nam', 'Rizal', 'Teo'], f: ['Sari', 'Dewi', 'Mai', 'Lia', 'Ana', 'Nita', 'Thuy', 'Kim'] },
  indigenous_american: { m: ['Tahoma', 'Niko', 'Ahanu', 'Cal', 'Mato', 'Eli', 'Ren', 'Sol'], f: ['Ayla', 'Nita', 'Kaya', 'Wren', 'Tala', 'Mina', 'Sora', 'Ona'] },
  latin_american: { m: ['Mateo', 'Luis', 'Javi', 'Tomas', 'Rafa', 'Nico', 'Emilio', 'Cruz'], f: ['Lucia', 'Ana', 'Sol', 'Marisol', 'Paz', 'Ines', 'Vera', 'Rocio'] },
};

const ROLE_BARKS: Partial<Record<OutfitRole, string[]>> = {
  settler: ['Mind yourself.', 'Dust\'s up again.', 'Water\'s dear this month.', 'You\'re not from here.'],
  labourer: ['Back\'s gone. Don\'t get old.', 'Two more loads and I\'m done.', 'Mind the rope.'],
  trader: ['Looking or buying?', 'Prices are posted. Don\'t ask twice.', 'Guild scrip\'s good here. Mostly.'],
  drifter: ['Don\'t.', 'Spare a water?', 'I was somewhere once.'],
  pilgrim: ['The sky is open.', 'Bless you, friend.', 'We bury under the sky.'],
  raider: ['What are you looking at.', 'Keep walking.', 'Kessler counts us.'],
  guard: ['Move along.', 'Nothing to see.', 'Papers, if you\'re asked.'],
  nomad: ['Horses first.', 'The Wheel turns.', 'Trade or go.'],
  street: ['Got a light?', 'Not here. Not tonight.', 'Everyone\'s got a price.'],
  medic: ['Wash it. Then come back.', 'Don\'t pick at it.'],
};

const EXTRA_DEFS: Record<string, NpcDef> = {};

/** A generated person's definition (looked up by `spawnNpc` when a map's placement names it). */
export function extraDef(id: string): NpcDef | undefined { return EXTRA_DEFS[id]; }

/** Generate the extras for one definition on a map: definitions registered, placements returned (positions set later). */
export function makeExtras(mapId: string, mapSeed: number, index: number, def: ExtrasDef): NpcDef[] {
  const rng = new Rng((mapSeed * 7919 + index * 104729) >>> 0);
  const roles = def.roles?.length ? def.roles : (['settler', 'settler', 'labourer', 'trader'] as OutfitRole[]);
  const out: NpcDef[] = [];
  for (let k = 0; k < def.count; k++) {
    const id = `x_${mapId}_${index}_${k}`;
    const seed = 50000 + ((mapSeed * 131 + index * 977 + k * 7) % 40000);
    const role = rng.pick(roles);
    const age = def.ages ? Math.round(rng.range(def.ages[0], def.ages[1])) : undefined;
    const app = randomAppearance(seed, { age, life: def.life });
    const masc = app.shape.gender > 0.5;
    const pool = NAMES[(app.ancestry ?? 'latin_american').split('+')[0]] ?? NAMES.latin_american;
    const name = rng.pick(masc ? pool.m : pool.f);
    const d: NpcDef = {
      id, name, look: { seed, frame: masc ? 'broad' : 'narrow', age }, role, level: 1, team: def.team ?? 'neutral', faction: def.faction,
      hostileIf: def.hostileIf, courage: 25, minor: true, dialogue: def.talk ?? `d_x_${role}`,
      barks: def.barks ?? ROLE_BARKS[role] ?? ROLE_BARKS.settler,
    };
    EXTRA_DEFS[id] = d;
    out.push(d);
  }
  return out;
}

/** What a spot's name says a body does there. */
export function spotIdle(spot: string | undefined): 'work' | 'sit' | 'lean' | 'talk' | 'stand' {
  if (!spot) return 'stand';
  if (spot.endsWith('_work')) return 'work';
  if (spot.endsWith('_sit')) return 'sit';
  if (spot.endsWith('_lean')) return 'lean';
  if (/_pair_[ab]$/.test(spot)) return 'talk';
  return 'stand';
}
