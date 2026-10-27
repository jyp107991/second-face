import type { PropKind } from '../data/types';

/**
 * Which built box props are drawn as real models instead (the library's `p_*` entries and a few of the land's
 * rocks and dead trees). A kind lists the model keys it may use (picked by the map's seed), whether the built
 * version's features (a lamp's light, a fire) are kept, how many to stack, and a scale range.
 */
export interface PropModelRule { keys: string[]; features?: boolean; stack?: number; scale?: [number, number] }

export const PROP_MODELS: Partial<Record<PropKind, PropModelRule>> = {
  barrel: { keys: ['p_barrel', 'p_barrel', 'p_barrel_2'] },
  barrel_rust: { keys: ['p_barrel_rust'] },
  crate: { keys: ['p_crate', 'p_crate', 'p_box'] },
  chair: { keys: ['p_chair', 'p_chair', 'p_chair_wood'] },
  table: { keys: ['p_table'] },
  shelf: { keys: ['p_shelf'] },
  lamp_post: { keys: ['p_lamp', 'p_lamp', 'p_lamp_2'], features: true },
  car_wreck: { keys: ['p_car'] },
  tire_pile: { keys: ['p_tyre'], stack: 3 },
  campfire: { keys: ['p_firepit'], features: true },
  stove: { keys: ['p_stove'] },
  machine: { keys: ['p_machine'], scale: [1.4, 1.8] },
  rock: { keys: ['boulder_desert'], scale: [0.45, 0.75] },
  rock_small: { keys: ['rock_small'], scale: [0.9, 1.4] },
  dead_tree: { keys: ['dead_tree', 'dead_quiver'] },
};

/** A model prop placed in a map: local tile-centre position, yaw, scale, and which of the rule's keys it is. */
export interface ModelProp { key: string; x: number; z: number; ry: number; scale: number; /** 0..1: picks the variant once the model is loaded. */ pick: number; stack: number }
