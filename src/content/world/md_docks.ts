import type { ConclusionDef, LeadDef, WorldEventDef } from '../../engine/world/frontier';

/**
 * Carrick, Meridian's docks across the dry river (B5b, the last piece): its leads and conclusions and the world events that
 * wait for the player. Registered in leads.ts and events.ts. Story notes: story/B5b_NOTES_SECRET.md (Carrick).
 */

export const DK_LEADS: LeadDef[] = [
  // Crane Six
  { id: 'l_dk_box', label: 'Thirty-one on fourteen', text: 'The box that fell from Crane Six is stencilled MACHINE PARTS — 14 T under a whole Concern seal. Through the split: cast copper ingots, thirty tonnes of them if it is one.' },
  { id: 'l_dk_tape', label: 'Key 6/N', text: 'Crane Six\'s load tape: a lift of 31.2 tonnes at six past two, the overload cutout tripped, then overridden a minute later with the night key, 6/N. At ten past, the spreader\'s lock let go.' },
  { id: 'l_dk_key', label: 'A key cut by hand', text: 'Dmytro Lysenko kept a crane key cut by hand from a blank, stamped 6/N, in a tin on his shelf, with a Bond night pass marked D.L.' },
  { id: 'l_dk_medicine', label: 'Blue caps', text: 'In the same tin: two blue-capped Concern inhalers, the medicine his daughter breathes through, that no docker\'s tallies could buy.' },
  { id: 'l_dk_slip', label: 'Two weights', text: 'The Concern\'s own loading slip says the box was 31.4 tonnes of copper. The guild\'s freight bill for the same seal says 14 tonnes of machine parts.' },
  { id: 'l_dk_unweighed', label: 'NOT WEIGHED', text: 'The weighbridge register: every box off the through for two years, NOT WEIGHED — THROUGH PATH, by order. The guild bills its freight by the ton.' },
  { id: 'l_dk_short', label: 'Five on eight', text: 'Gang Nine worked Crane Six five hands where the crane\'s complement is eight, by the Harbour Master\'s order, to turn the through in the four hours its contract allows.' },
  // Mirela's Paper
  { id: 'l_dk_returnable', label: 'A returnable lost', text: 'The Bond\'s notice on the guild floor\'s door: RETURNABLE LOST FROM BOND — ONE — REWARD 60 — APPLY THE BOND OFFICER.' },
  { id: 'l_dk_surety', label: 'Surety', text: 'Mirela Stan, fifteen, is the surety on her mother\'s Concern contract in the Skirts: returnable on default or flight. Her flight is the default.' },
  // Stakes on the Hulls
  { id: 'l_dk_lease', label: 'The berths leased', text: 'The Harbour Master has leased the river berths under the Hulls to House Vane for works. The occupiers are to quit on the commencement of works.' },
  { id: 'l_dk_act', label: 'Schedule three', text: 'The Harbour Act, Schedule 3: a vessel in port shall not be moved, broken or removed while she has a crew aboard, save by her master\'s leave or the court\'s order on proof of abandonment.' },
  { id: 'l_dk_crews', label: 'Crew books', text: 'Every hull on the dry bed has a master and a crew book, and the crews have signed them every Sunday for ninety years.' },
  { id: 'l_dk_signed', label: 'Three marks', text: 'Three of the nine hulls\' masters have put their marks to House Vane\'s papers of abandonment, at forty Tolls a hull.' },
  { id: 'l_dk_footing', label: 'A second footing', text: 'The pre-war survey plate on the river wall shows the old tram bridge\'s footing a hundred and twenty metres downstream: sound rock, under the edge of the Concern\'s Bond.' },
];

export const DK_CONCLUSIONS: ConclusionDef[] = [
  { id: 'c_dk_override', from: ['l_dk_box', 'l_dk_tape'], text: 'The box weighed more than twice its bill, and somebody overrode Crane Six\'s cutout with the night key to lift it. The spreader could not hold what the cutout was there to refuse.', effects: [{ learn: 'dk_override' }] },
  { id: 'c_dk_paid', from: ['l_dk_key', 'l_dk_medicine'], text: 'Dmytro Lysenko turned the cutout himself, with a key he had cut, on the Bond\'s night pass, and he was paid for it in medicine for his girl.', effects: [{ learn: 'dk_paid' }] },
  { id: 'c_dk_skim', from: ['l_dk_slip', 'l_dk_unweighed'], text: 'The Concern bills its boxes at half their weight and the guild never weighs the through. The Bond pays a night hand to lift what the crane\'s cutout would refuse, so that nothing ever shows.', effects: [{ learn: 'dk_skim' }] },
  { id: 'c_dk_crewed', from: ['l_dk_act', 'l_dk_crews'], text: 'Under the Harbour Act the Hulls are vessels in port, and every one of them has a crew aboard. A lease cannot move a crewed ship; only her master can, or the court on proof she is abandoned.', effects: [{ learn: 'dk_crewed' }] },
];

export const DK_EVENTS: Record<string, WorldEventDef> = {
  /** Mirela's Paper, returned: the Bond puts her on the through east at two in the morning, the next night the player is at Carrick. */
  dk_girl_taken: {
    id: 'dk_girl_taken', at: { hour: 2, where: 'md_docks' }, armedIf: { flag: 'dk_girl', eq: 'returned' },
    effects: [
      { set: 'dk_girl_gone' },
      { decision: { id: 'dk_girl_gone', text: 'The Bond put Mirela Stan back in a box on the through east, returnable, at two in the morning. Espe watched it go.' } },
      { news: { tag: 'dk_girl_taken', text: 'the Concern\'s Bond at the Docks shipped a girl back east on the through as a returnable', valence: -5, size: 5, at: 'meridian' } },
    ],
  },
  /** Stakes on the Hulls, cleared: the Harbour Master's men clear the abandoned berths at the next dawn the player is at Carrick. */
  dk_hulls_cleared: {
    id: 'dk_hulls_cleared', at: { hour: 6, where: 'md_docks' }, armedIf: { flag: 'dk_hulls', eq: 'cleared' },
    effects: [
      { set: 'dk_hulls_empty' }, { set: 'dk_cradle', value: 'cut' },
      { decision: { id: 'dk_hulls_empty', text: 'The Harbour Master\'s men cleared the Hulls at dawn for House Vane\'s bridge. Three hundred people carried what they had up the river stairs, and the cradle\'s cable was cut.' } },
      { news: { tag: 'dk_hulls_cleared', text: 'the guild cleared the old ships on the dry river at the Docks for a Crown bridge; three hundred people up the river stairs with their bedding', valence: -6, size: 7, at: 'meridian' } },
    ],
  },
};
