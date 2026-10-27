import type { DialogueDef } from '../../engine/dialogue/dialogue';

/** The Sallow's landmarks: the windpump graveyard and the scavenger who lives under it. */

const bye = { text: 'That\'s all.', exit: true };

export const d_wp_marit: DialogueDef = {
  id: 'd_wp_marit', owner: 'npc_wp_01',
  start: [{ if: { flag: 'wp_marit_fight' }, node: 'hostile' }, { if: { flag: 'wp_marit_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman with a burn down one side of her face and a coil of green wire over her shoulder, halfway up the last tower with a pair of cutters. She looks down at you the way the towers do. "Copper\'s mine. Say what you\'re here for from down there; I\'m not coming down for a face."',
      effects: [{ set: 'wp_marit_met' }, { learn: 'marit_met' }],
      passives: [{ skill: 'mechanics', dc: 30, text: 'She is stripping the wind-generator coils, not the pump wire. Somebody is paying for coil copper, which means somebody is winding motors.', effects: [{ learn: 'marit_coils' }] }],
      options: [
        { id: 'marit.pumps', text: 'What killed the pumps?', next: 'pumps', once: true },
        { id: 'marit.wheel', text: 'The ruts going east. The Wheel?', if: { knows: 'wheel_tracks' }, next: 'wheel', once: true },
        { id: 'marit.copper', text: 'Who buys the copper?', if: { knows: 'marit_coils' }, next: 'copper', once: true },
        { id: 'marit.kite', text: 'A drifter on the road said a kite came down on the pan.', if: { knows: 'drifter_kite' }, next: 'kite', once: true },
        { id: 'marit.trade', text: 'Trade.', effects: [{ event: 'barter' }], exit: true },
        bye,
      ],
    },
    again: {
      text: '"Still here. Still copper."',
      options: [
        { id: 'marit.pumps.again', text: 'What killed the pumps?', if: { not: { seen: 'marit.pumps' } }, next: 'pumps' },
        { id: 'marit.wheel.again', text: 'The ruts going east. The Wheel?', if: { all: [{ knows: 'wheel_tracks' }, { not: { seen: 'marit.wheel' } }] }, next: 'wheel' },
        { id: 'marit.copper.again', text: 'Who buys the copper?', if: { all: [{ knows: 'marit_coils' }, { not: { seen: 'marit.copper' } }] }, next: 'copper' },
        { id: 'marit.kite.again', text: 'A drifter said a kite came down on the pan.', if: { all: [{ knows: 'drifter_kite' }, { not: { seen: 'marit.kite' } }] }, next: 'kite' },
        { id: 'marit.trade.again', text: 'Trade.', effects: [{ event: 'barter' }], exit: true },
        bye,
      ],
    },
    pumps: { text: '"Nothing killed them. Somebody turned them off." She taps the tower with the cutters. "Vanes are locked, not seized. Brakes set from the valve house, all six, same day. Water went down the pipe to somewhere that mattered more, and the troughs went dry, and the farm that was here walked to Shale and became Shale." A shrug. "Sixty years. The game still comes at dusk. Habit."', effects: [{ learn: 'wp_pumps_locked' }, { lead: 'l_windpumps_locked' }], options: [{ text: 'Noted.', next: 'again' }] },
    wheel: { text: '"Forty-one wagons and a woman called Sefa who could sell sand to the pan. They camp east, in the lee of the hill, a week at a time, and they buy my copper and sell me back the horseshoes it came from." She almost smiles. "Go with something to trade. Go without the guild\'s paper. And don\'t touch the horses."', effects: [{ learn: 'wheel_sefa' }, { learn: 'wheel_near_windpumps' }, { lead: 'l_wheel_where' }], options: [{ text: 'Noted.', next: 'again' }] },
    copper: { text: '"The Wheel, for the shoes. And a man at Tollhouse 9 who doesn\'t write it down, for Tolls, and he sends it east, and east of that I don\'t ask." She winds the coil tighter. "Someone\'s building motors. Someone always is."', effects: [{ learn: 'copper_goes_east' }, { lead: 'l_copper_east' }], options: [{ text: 'Noted.', next: 'again' }] },
    kite: { text: 'She stops cutting. "South. On the white. I saw it come down." She comes down the tower after all, slowly. "It sat two days and then it went up again, and where it sat there\'s a truck now that wasn\'t there before, and I don\'t go near it, and nor does the game." She points, south and west, across the pan.', effects: [{ learn: 'loc_lm_sallow_01' }, { lead: 'l_kite_on_the_pan' }, { xp: 30 }], options: [{ text: 'Noted.', next: 'again' }] },
    hostile: { text: 'She is behind the tower with the zip gun.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

export const d_wp_pump: DialogueDef = {
  id: 'd_wp_pump', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A windpump: a lattice tower, a vane the size of a door locked side-on to the wind, a rod down the middle that has not moved in sixty years. At the foot, a pump head with its brake set and a brass plate: NETWORK 4 — FIELD 2 — No. 3.',
      passives: [{ skill: 'mechanics', dc: 25, text: 'The brake is a remote one. There is no handle. It was set from somewhere else.', effects: [{ learn: 'wp_pumps_locked' }, { lead: 'l_windpumps_locked' }] }],
      effects: [{ learn: 'wp_plate_seen' }],
      options: [{ id: 'pump.climb', text: '(Climb it.)', check: { attr: 'brawn', dc: 5 }, next: 'view', fail: 'fall' }, { text: '(Leave it.)', exit: true }],
    },
    view: { text: 'From the top the pan is a sheet of hammered tin, and the hill east has a smudge of smoke in its lee, and south-west, far out on the white, something square that throws a shadow the wrong colour.', effects: [{ learn: 'loc_lm_sallow_01' }, { learn: 'wheel_near_windpumps' }, { lead: 'l_wheel_where' }, { xp: 30 }], options: [{ text: '(Come down.)', exit: true }] },
    fall: { text: 'A rung lets go and you learn the height of the second one from the ground.', effects: [{ time: 15 }], options: [{ text: '(Come down.)', exit: true }] },
  },
};

export const d_wp_valvehouse: DialogueDef = {
  id: 'd_wp_valvehouse', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A valve bank in a concrete box: six levers, all set the same way, each wired to a solenoid, and the solenoids wired to a cable that goes out through the wall and under the pan. A stencil above them: FIELD 2 — BRAKE — REMOTE.',
      passives: [{ skill: 'science', dc: 30, text: 'The cable runs east along the pipe line, toward the pump station at Dry Wells and whatever is upstream of that. This field was switched off by the same hand that sets Shale\'s schedule.', effects: [{ learn: 'wp_same_network' }, { lead: 'l_windpumps_network' }] }],
      effects: [{ learn: 'wp_valvehouse_seen' }, { lead: 'l_windpumps_locked' }],
      options: [
        { id: 'valve.release', text: '(Release the brakes by hand.)', check: { skill: 'mechanics', dc: 40, mods: [{ if: { origin: 'pump_hand' }, dc: -15, why: 'you have freed worse' }] }, next: 'released', fail: 'release_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    released: { text: 'Six levers, six solenoids forced, and outside, one after another, the vanes come round into the wind with a noise like a town waking up. The rods move. Nothing comes up the pipes; the water went somewhere else sixty years ago. But the troughs fill, slowly, from what is left in the ground, and by evening there will be game at them.', effects: [{ set: 'wp_pumps_freed' }, { decision: { id: 'wp_pumps_freed', text: 'You freed the windpumps on the pan; the troughs fill again.' } }, { news: { tag: 'windpumps_turn', text: 'the dead windpumps on the pan are turning again', valence: 8, size: 4, at: 'shale' } }, { xp: 80 }], options: [{ text: '(Step back.)', exit: true }] },
    release_no: { text: 'The solenoids are stronger than you are. One lever moves a hand\'s width and goes back.', effects: [{ time: 30 }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};
