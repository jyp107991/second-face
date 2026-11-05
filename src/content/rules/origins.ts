import type { AttributeId, SkillId } from '../../engine/stats/rules';

/** Ready-made lives in Knock (the hamlet above Cistern 9's door) for players who want to jump in: four of its trades. Fully editable after picking. */
export interface OriginPreset {
  id: string;
  name: string;
  blurb: string;
  attrs: Record<AttributeId, number>;
  tagged: SkillId[];
  traits: string[];
  appearanceSeed: number;
  frame: 'broad' | 'narrow';
}

export const ORIGINS: OriginPreset[] = [
  { id: 'pump_hand', name: 'Hatch Hand', blurb: 'You work the drop-hatch with Maud and keep Knock\'s pumps drawing. Strong back, good hands, few words.',
    attrs: { brawn: 7, senses: 5, grit: 6, presence: 3, wits: 4, reflex: 5, fortune: 3 }, tagged: ['mechanics', 'melee', 'survival'], traits: ['heavy_handed'], appearanceSeed: 101, frame: 'broad' },
  { id: 'clinic_aide', name: 'Bonesetter', blurb: 'Pell taught you medicine through the Grille, word by word, without ever seeing your hands. Calm under pressure.',
    attrs: { brawn: 4, senses: 6, grit: 5, presence: 5, wits: 7, reflex: 4, fortune: 2 }, tagged: ['medicine', 'science', 'speech'], traits: ['bookish'], appearanceSeed: 202, frame: 'narrow' },
  { id: 'door_watch', name: 'Night Watch', blurb: 'You keep Knock\'s watch at the hatch lamp, and you know every stone of the Rib in the dark. Nobody comes up the road. Until now.',
    attrs: { brawn: 5, senses: 7, grit: 5, presence: 4, wits: 4, reflex: 7, fortune: 1 }, tagged: ['firearms', 'stealth', 'security'], traits: ['steady'], appearanceSeed: 303, frame: 'broad' },
  { id: 'archive_clerk', name: 'Road Clerk', blurb: 'You keep the toll stand\'s book on hatch days and read the Guild\'s shorthand. You know how to talk to people, and to the Guild.',
    attrs: { brawn: 3, senses: 5, grit: 4, presence: 7, wits: 7, reflex: 4, fortune: 3 }, tagged: ['speech', 'science', 'barter'], traits: ['sweet_talker'], appearanceSeed: 404, frame: 'narrow' },
];
