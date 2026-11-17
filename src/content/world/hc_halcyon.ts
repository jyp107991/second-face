import type { ConclusionDef, LeadDef } from '../../engine/world/frontier';

/**
 * Halcyon (B4b): the arcology's leads and conclusions, for the notebook's board. Registered in leads.ts. Story notes:
 * story/STORY_PLAN_SECRET.md, Build notes — B4 (B4b).
 */

export const HC_LEADS: LeadDef[] = [
  // floor nine
  { id: 'l_hc_service', label: 'The service ward', text: 'Behind the SERVICE door on Halcyon\'s floor nine: twenty-three cots, a sleeper on each with a Weighhouse number on the wrist and a line in the arm, and a board of what has been drawn from each.' },
  { id: 'l_hc_recipients', label: 'Recovery good', text: 'The charts in the Clinic floors\' recovery ward: a Board member\'s name on each, a procedure, and a donor number. Every donor number is a Weighhouse number.' },
  { id: 'l_hc_cold', label: 'HELD', text: 'The cold store on floor nine: steel cabinets labelled with Weighhouse numbers and letters, K, L, C, H, and the word HELD.' },
  { id: 'l_hc_renewal', label: 'Before the ball', text: 'Dr Qadir\'s list for the season\'s renewals: Board names against donor numbers. Against the Chair\'s: WHOLE — BEFORE THE BALL.' },
  { id: 'l_hc_dawit', label: 'Bed seven', text: 'Dawit Mekonnen, 9-1182, alive on the service ward with an eye and a kidney gone, humming his wife\'s song.' },
  // the Board
  { id: 'l_hc_portrait', label: 'The winter meeting', text: 'A photograph in the Board\'s gallery: the Board of the Halverson Concern at a ski lodge with snow on the roof, the year of the Charter, before the Burn. Every face is a face from the hall.' },
  { id: 'l_hc_minutes', label: 'As before', text: 'Ten years of the Board\'s minutes. Six years ago the clerk stopped writing out what the Chair says, because it is the same every time, and writes THE CHAIR\'S COURTESY, AS BEFORE.' },
  // the works
  { id: 'l_hc_keeper', label: 'A man in a chair', text: 'In the grid core under Halcyon\'s gardens, every cable runs to one chair, and a man sits in it with the cables going into his spine.' },
  // the terraces
  { id: 'l_hc_linh', label: 'None down', text: 'Linh Hoang, nineteen, citizen-born, counts the car from inside the arch: it comes up full and goes down empty. Her pass down was refused without a reason.' },
  { id: 'l_hc_reserve', label: 'Reserve', text: 'The registry\'s grounds for Linh Hoang\'s refused pass: RESERVE — NOT FOR TRANSFER. Children born on the terraces are typed at birth.' },
];

export const HC_CONCLUSIONS: ConclusionDef[] = [
  { id: 'c_hc_bank', from: ['l_hc_service', 'l_hc_recipients', 'l_hc_cold'], text: 'Clinic service is a long sleep. The debtors the Weighhouse sends up are kept alive on floor nine and drawn on, a part at a time, for the Board\'s renewals, until there is nothing left worth keeping.', effects: [{ learn: 'hc_recipients' }, { learn: 'hc_bank_known' }] },
  { id: 'c_hc_board', from: ['l_hc_portrait', 'l_hc_minutes'], text: 'Halcyon\'s Board is the Board of the Halverson Concern from before the Burn: the same people, renewed for over a century. Their Chair is two hundred and forty years old, and his courtesy is most of what is left of him.', effects: [{ learn: 'hc_ages' }, { learn: 'hc_chair_drift' }] },
  { id: 'c_hc_reserve', from: ['l_hc_linh', 'l_hc_reserve'], text: 'The children born on Halcyon\'s terraces who match a member of the Board are kept on the hill as reserves, fed and schooled and never let down, in case the Board member needs them.', effects: [{ learn: 'hc_linh_reserve' }] },
];
