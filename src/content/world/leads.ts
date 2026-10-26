import type { ConclusionDef, LeadDef } from '../../engine/world/frontier';

/** Clues for the notebook's leads board, and the conclusions they support. */
export const LEADS: Record<string, LeadDef> = Object.fromEntries(([
  { id: 'l_walked_west', label: 'Walked west', text: 'The stranger walked a long way west on a bad wound, into the afternoon sun.' },
  { id: 'l_sealed_wound', label: 'Machine-sealed wound', text: 'His old wound was sealed by a machine, not stitched — real hospital work.' },
  { id: 'l_burned_mark', label: 'Burned-off mark', text: 'He deliberately burned a printed mark off his forearm.' },
  { id: 'l_crate_print', label: 'Crate print', text: 'The marks at the burn\'s edge match the print on MOTHER\'s old crates.' },
  { id: 'l_record_hand', label: 'Record shorthand', text: 'His notebook is written in the same shorthand as the Cistern\'s records.' },
  { id: 'l_sigil', label: 'Half-sun sign', text: 'His mask bears a painted sign: half a sun with no ground, or an open hand.' },
  { id: 'l_photo_light', label: 'Wrong shadows', text: 'In the photograph the shadows on your face and on the towers fall different ways.' },
  { id: 'l_photo_grain', label: 'No grain', text: 'The photograph has no grain at all. The dust in it is drawn, not caught.' },
  { id: 'l_mother_city', label: '"There is no city"', text: 'Asked whether the stranger came from a city, MOTHER said there is no city — and said it like a thing decided.' },
  { id: 'l_mother_sealed', label: 'Outbound entries', text: 'MOTHER\'s log holds three sealed entries marked OUTBOUND, years apart, each saying "population variance unchanged".' },
  { id: 'l_pressure', label: 'Constant pressure', text: 'The reservoir pressure has not changed in years. Reservoirs drop. This one is being fed.' },
  { id: 'l_archive_label', label: 'Return on relocation', text: 'The Archive door is stencilled CONTINUITY RECORDS — RETURN ON RELOCATION.' },
  { id: 'l_ring_gone', label: 'Missing ring', text: 'The stranger had worn a ring until shortly before he died. He traded or lost it near the end.' },
] as LeadDef[]).map((l) => [l.id, l]));

export const CONCLUSIONS: Record<string, ConclusionDef> = Object.fromEntries(([
  { id: 'c_from_a_city', from: ['l_walked_west', 'l_sealed_wound'], text: 'He came from the east, from somewhere with a working hospital — a city that still runs.' },
  { id: 'c_same_makers', from: ['l_burned_mark', 'l_crate_print', 'l_record_hand'], text: 'Whoever marked him also made our crates and our records. Cistern 9 and his city share an owner.' },
  { id: 'c_photo_made', from: ['l_photo_light', 'l_photo_grain'], text: 'The photograph was never taken. Something made it — and made it of me.' },
  { id: 'c_mother_answers', from: ['l_mother_sealed', 'l_mother_city'], text: 'MOTHER has been answering someone outside for years — and the answer has always been no.' },
  { id: 'c_fed_from_outside', from: ['l_pressure', 'l_archive_label'], text: 'The Cistern was built to be collected. Its water comes from outside, and so, one day, will its people\'s orders.' },
] as ConclusionDef[]).map((c) => [c.id, c]));
