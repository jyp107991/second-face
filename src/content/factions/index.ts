import type { FactionDef } from '../../engine/world/factions';

/**
 * Joinable factions (DESIGN §2d). Ranks are ordered; perks accumulate. Initiation quest ids are filled in
 * as each faction's content lands (validated against QUESTS when set).
 */
const F: FactionDef[] = [
  { id: 'shale_militia', name: 'Shale Militia', desc: 'The sheriff\'s volunteers. Shale\'s only law and most of its courage.', home: 'shale',
    ranks: [
      { id: 'volunteer', title: 'Volunteer', priceMul: 0.95, access: ['shale_armoury'] },
      { id: 'deputy', title: 'Deputy', mods: [{ target: 'skill:firearms', add: 5 }], flags: ['militia_authority'], access: ['shale_cells'] },
      { id: 'hand', title: 'Sheriff\'s Hand', flags: ['frontier_justice'], priceMul: 0.9 },
    ], conflicts: ['rust_dogs'] },
  { id: 'rust_dogs', name: 'The Rust Dogs', desc: 'Raiders of the overpass. Hungry, loyal, and not the worst thing on the road.', home: 'rustdogs',
    ranks: [
      { id: 'prospect', title: 'Prospect', access: ['overpass_gate'] },
      { id: 'dog', title: 'Dog', mods: [{ target: 'skill:melee', add: 5 }], flags: ['dog_safe_passage'], priceMul: 0.9, access: ['overpass_pens'] },
      { id: 'lieutenant', title: 'Lieutenant', flags: ['dog_command'], access: ['overpass_bus'] },
    ], conflicts: ['shale_militia'] },
  { id: 'tollmen', name: 'The Tollmen', desc: 'The guild that owns the roads, the bridges, the Line\'s tickets and everyone\'s debt.', home: 'tollhouse',
    ranks: [
      { id: 'ticket', title: 'Ticket-holder', priceMul: 0.9, access: ['toll_gate'] },
      { id: 'hand', title: 'Factor\'s Hand', mods: [{ target: 'skill:barter', add: 5 }], flags: ['toll_exempt'], access: ['exchange_floor'] },
      { id: 'factor', title: 'Factor', flags: ['futures_access'], priceMul: 0.8, access: ['exchange_vault', 'line_firstclass'] },
      { id: 'circle', title: 'Grand Factor\'s Circle', flags: ['grand_factor_ear'] },
    ], conflicts: ['choir', 'the_shift'] },
  { id: 'choir', name: 'The Choir of the Open Sky', desc: 'Healers, farmers, masks at rites. The sky keeps no books.', home: 'openfield',
    ranks: [
      { id: 'lay', title: 'Lay Healer', mods: [{ target: 'skill:medicine', add: 5 }], access: ['choir_tent'] },
      { id: 'sibling', title: 'Sister / Brother', flags: ['sky_rite'], priceMul: 0.85, access: ['openfield_halls'] },
      { id: 'unwritten', title: 'Unwritten', flags: ['unwritten_mask'], access: ['unwritten_cellar'] },
    ], conflicts: ['tollmen', 'wardens'] },
  { id: 'wardens', name: 'The Ledger\'s Wardens', desc: 'Meridian\'s law in grey. Fair by rule; deaf to need.', home: 'meridian',
    ranks: [
      { id: 'citizen', title: 'Citizen', access: ['precinct_gate'] },
      { id: 'warden', title: 'Warden', flags: ['warden_authority'], access: ['precinct_station'] },
      { id: 'sergeant', title: 'Sergeant', mods: [{ target: 'skill:speech', add: 5 }], flags: ['warden_command'], access: ['precinct_armoury'] },
      { id: 'deputy_assessor', title: 'Assessor\'s Deputy', flags: ['court_standing'], access: ['court_of_accounts'] },
    ], conflicts: ['choir', 'gilt', 'saints', 'pale', 'rustmouths'] },
  { id: 'tenured', name: 'The Tenured', desc: 'The old families of the Crown: patrons, duellists, collectors.', home: 'meridian',
    ranks: [
      { id: 'client', title: 'Client', access: ['crown_lift'] },
      { id: 'retainer', title: 'Retainer', priceMul: 0.9, flags: ['crown_invitation'], access: ['crown_salons'] },
      { id: 'house', title: 'House Member', flags: ['tenured_standing'], access: ['crown_terraces'] },
    ] },
  { id: 'gilt', name: 'The Gilt', desc: 'Crown-born kids slumming in chrome.', home: 'meridian', group: 'meridian_gangs',
    ranks: [{ id: 'runner', title: 'Runner' }, { id: 'crew', title: 'Crew', priceMul: 0.9, flags: ['gilt_fence'] }, { id: 'captain', title: 'Captain', flags: ['gang_command'] }] },
  { id: 'saints', name: 'The Saints of Static', desc: 'They hear voices in dead radios. Some of the voices are true.', home: 'meridian', group: 'meridian_gangs',
    ranks: [{ id: 'runner', title: 'Listener' }, { id: 'crew', title: 'Voice', flags: ['saints_prophecy'] }, { id: 'captain', title: 'Choirmaster', flags: ['gang_command'] }] },
  { id: 'pale', name: 'The Pale', desc: 'No chrome. Ever. They remember what the Scald did.', home: 'meridian', group: 'meridian_gangs',
    ranks: [{ id: 'runner', title: 'Sworn' }, { id: 'crew', title: 'Kin', flags: ['pale_kin'] }, { id: 'captain', title: 'Elder', flags: ['gang_command'] }] },
  { id: 'rustmouths', name: 'The Rustmouths', desc: 'A salvage union that became a mob. Bridgeward is theirs.', home: 'meridian', group: 'meridian_gangs',
    ranks: [{ id: 'runner', title: 'Hauler' }, { id: 'crew', title: 'Mouth', priceMul: 0.9, flags: ['rustmouth_tolls'] }, { id: 'captain', title: 'Boss\'s Hand', flags: ['gang_command'] }] },
  { id: 'the_shift', name: 'The Shift', desc: 'The Skirts\' miners\' union, and the nearest thing the Skirts has to a gang.', home: 'skirts',
    ranks: [{ id: 'member', title: 'Member', access: ['shift_hall'] }, { id: 'steward', title: 'Shop Steward', flags: ['shift_voice'], priceMul: 0.9 }, { id: 'committee', title: 'Committee', flags: ['shift_command'] }],
    conflicts: ['concern', 'tollmen'] },
  { id: 'concern', name: 'The Concern', desc: 'The last corporation. A contract, a clinic, a leash.', home: 'halcyon',
    ranks: [{ id: 'probationary', title: 'Probationary', access: ['halcyon_gate'] }, { id: 'contract', title: 'Contract Citizen', priceMul: 0.85, access: ['halcyon_gardens', 'halcyon_clinic'] }, { id: 'tenure', title: 'Tenure', flags: ['board_audience'], access: ['halcyon_board'] }],
    conflicts: ['the_shift', 'choir'] },
  { id: 'wheel', name: 'The Wheel', desc: 'Nomad caravan families. Guests are fed; road-kin are trusted.',
    ranks: [{ id: 'guest', title: 'Guest' }, { id: 'roadkin', title: 'Road-kin', priceMul: 0.85, flags: ['wheel_passage'] }, { id: 'wheelborn', title: 'Wheel-born', flags: ['wheel_rite'] }] },
  { id: 'menders', name: 'The Menders\' Code', desc: 'Back-street surgeons and chrome-smiths. Fit only what the patient can bear.', home: 'shale',
    ranks: [{ id: 'apprentice', title: 'Apprentice', mods: [{ target: 'skill:medicine', add: 5 }] }, { id: 'mender', title: 'Mender', flags: ['mender_surgery'], priceMul: 0.8 }] },
];

export const FACTIONS: Record<string, FactionDef> = Object.fromEntries(F.map((f) => [f.id, f]));
