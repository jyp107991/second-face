import type { ConclusionDef, LeadDef } from '../../engine/world/frontier';

/** Clues for the notebook's leads board, and the conclusions they support. */
export const LEADS: Record<string, LeadDef> = Object.fromEntries(([
  { id: 'l_walked_west', label: 'Walked west', text: 'The stranger walked a long way west on a bad wound, into the afternoon sun.' },
  { id: 'l_sealed_wound', label: 'Machine-sealed wound', text: 'His old wound was sealed by a machine, not stitched — real hospital work.' },
  { id: 'l_burned_mark', label: 'Burned-off mark', text: 'He deliberately burned a printed mark off his forearm.' },
  { id: 'l_crate_print', label: 'Crate print', text: 'The marks at the burn\'s edge match the print on MOTHER\'s old crates.' },
  { id: 'l_record_hand', label: 'Record shorthand', text: 'His notebook is written in the same shorthand as the Cistern\'s records.' },
  { id: 'l_sigil', label: 'Half-sun sign', text: 'His mask bears a painted sign: half a sun with no ground, or an open hand.' },
] as LeadDef[]).map((l) => [l.id, l]));

export const CONCLUSIONS: Record<string, ConclusionDef> = Object.fromEntries(([
  { id: 'c_from_a_city', from: ['l_walked_west', 'l_sealed_wound'], text: 'He came from the east, from somewhere with a working hospital — a city that still runs.' },
  { id: 'c_same_makers', from: ['l_burned_mark', 'l_crate_print', 'l_record_hand'], text: 'Whoever marked him also made our crates and our records. Cistern 9 and his city share an owner.' },
] as ConclusionDef[]).map((c) => [c.id, c]));
