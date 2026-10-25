import type { MapDef } from '../engine/data/types';
import { dev_bunker } from './maps/dev_bunker';
import { dev_yard } from './maps/dev_yard';

/** Content registry: the engine looks everything up through here. */
export const MAPS: Record<string, MapDef> = {
  dev_yard,
  dev_bunker,
};
