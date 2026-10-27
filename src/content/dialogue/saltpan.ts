import type { DialogueDef } from '../../engine/dialogue/dialogue';

/** The salt-pan wreck: a guild convoy truck on the white, and the thing that sat down beside it. */

export const d_sp_truck: DialogueDef = {
  id: 'd_sp_truck', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A guild truck on its side, the half-moon on the door, the cab crushed where it rolled and the trailer split. The skid behind it runs half a mile straight: it was going fast, in a straight line, away from something, and then it was not going at all. No bodies. Drag marks, two, toward the ring.',
      effects: [{ learn: 'sp_truck_seen' }, { lead: 'l_wreck_skid' }],
      passives: [
        { skill: 'mechanics', dc: 25, text: 'The engine is whole; the cab is not. The truck did not fail. Something stopped it the way a hand stops a toy.', effects: [{ learn: 'sp_truck_stopped' }] },
        { attr: 'senses', dc: 7, text: 'The drag marks go toward the ring and do not come back. In the crust beside them, prints: four-toed, each the size of your spread hand, pressed deep.', effects: [{ learn: 'sp_prints' }] },
      ],
      options: [{ text: '(Step back.)', exit: true }],
    },
  },
};

export const d_sp_hound: DialogueDef = {
  id: 'd_sp_hound', owner: 'narrator',
  start: [{ if: { flag: 'hound_outcome' }, node: 'after' }, { if: { knows: 'sp_hound_seen' }, node: 'again' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'In the middle of the ring: a machine the size of a big dog, sitting the way a dog sits, grey plates over a frame that is all angles, four legs folded under it, a head that is one lens and no mouth. Salt has drifted against its flank. It is not moving. It is not rusting either.',
      effects: [{ learn: 'sp_hound_seen' }, { lead: 'l_hound_dormant' }, { xp: 30 }],
      passives: [
        { attr: 'senses', dc: 8, text: 'The lens is not dark. Deep in it, something the colour of a pilot light is on, and has been on for a long time. It is not dead. It is waiting.', effects: [{ learn: 'sp_hound_waiting' }] },
        { skill: 'science', dc: 35, text: 'Pre-Burn, and not city work: a maker\'s mark on the shoulder plate, a crown over a gear. Military or something that bought from the military. The folded legs are a rest state: it sat down on an instruction, and it will stand on one.', effects: [{ learn: 'sp_hound_make' }, { lead: 'l_hound_make' }] },
      ],
      options: [
        { id: 'hound.touch', text: '(Put a hand on it.)', next: 'touch' },
        { id: 'hound.controller', text: '(Hold up the controller.)', if: { item: 'k_hound_controller' }, next: 'controller' },
        { text: '(Step back.)', exit: true },
      ],
    },
    again: {
      text: 'The machine sits in its ring. The lens is on you now, and was not before.',
      options: [
        { id: 'hound.controller2', text: '(Hold up the controller.)', if: { item: 'k_hound_controller' }, next: 'controller' },
        { id: 'hound.touch2', text: '(Put a hand on it.)', if: { not: { knows: 'sp_hound_touched' } }, next: 'touch' },
        { text: '(Step back.)', exit: true },
      ],
    },
    touch: { text: 'Warm. Not sun-warm: warm from inside, like a sleeping animal. Under your palm something in the plates shifts the width of a hair and settles, and the lens, which was looking at the truck, is looking at you.', effects: [{ learn: 'sp_hound_touched' }, { learn: 'sp_hound_waiting' }], options: [{ id: 'hound.touch.controller', text: '(Hold up the controller.)', if: { item: 'k_hound_controller' }, next: 'controller' }, { text: '(Take your hand away.)', exit: true }] },
    controller: {
      text: 'The slab warms in your hand the moment it is in the lens\'s line, and a single point of light comes up under its surface and holds. The machine\'s head lifts an inch. It is listening to the thing you are holding, and through it, to you.',
      effects: [{ learn: 'sp_controller_pairs' }, { lead: 'l_hound_controller' }],
      options: [
        { id: 'hound.wake', text: '(Tell it to stand, and follow, and keep Shale.)', check: { skill: 'science', dc: 40, mods: [{ if: { item: 'k_convoy_manifest' }, dc: -10, why: 'the manifest names what it is' }, { if: { knows: 'sp_hound_make' }, dc: -5, why: 'you know whose it was' }] }, next: 'woken', fail: 'wake_no' },
        { id: 'hound.sleep', text: '(Tell it to stay. Keep the controller.)', effects: [{ set: 'hound_outcome', value: 'kept' }, { set: 'hound_kept' }, { decision: { id: 'hound_kept', text: 'You left the machine on the pan sleeping and kept its controller.' } }, { xp: 60 }], next: 'kept' },
        { text: '(Put it away.)', exit: true },
      ],
    },
    woken: {
      text: 'It stands. Four legs unfold with a sound like a gate, salt pouring off the plates, and it is taller than you expected and quieter, and the lens turns once around the whole horizon and comes back to the slab in your hand. It takes a step toward you and stops, exactly where a dog stops. It will walk at your heel to Shale and sit in the sheriff\'s yard and nothing will come into that town at night that it does not look at first.',
      effects: [{ set: 'hound_outcome', value: 'shale' }, { set: 'hound_for_shale' }, { set: 'hound_awake' }, { take: 'k_hound_controller' }, { decision: { id: 'hound_for_shale', text: 'You woke the machine on the pan and sent it to keep Shale.' } }, { news: { tag: 'hound_in_shale', text: 'a grey machine the size of a dog walked into Shale at the salt-cut stranger\'s heel and sat down in the sheriff\'s yard', valence: 10, size: 9, at: 'shale' } }, { rep: { faction: 'shale_militia', respect: 15 } }, { xp: 150 }],
      options: [{ text: '(Walk.)', exit: true }],
    },
    wake_no: { text: 'The slab goes dark in your hand. The head lowers the inch it had lifted. Whatever you said, it was not the word, and it has gone back to waiting for someone who knows it.', effects: [{ time: 20 }], options: [{ text: '(Put it away.)', exit: true }] },
    kept: { text: 'The head settles. The light in the slab goes down to a point and stays. Somewhere east, you think, somebody has a slab like this one and is not using it, and does not know that you are.', options: [{ text: '(Put it away.)', exit: true }] },
    after: {
      text: [
        { if: { flag: 'hound_for_shale' }, text: 'The ring in the crust, empty. The salt is already drifting into the shape it sat in.' },
        { if: { flag: 'hound_sold' }, text: 'It sits in its ring, and will, until the guild\'s engineer comes with the slab you sold and says the word. You feel the lens on your back all the way to the edge of the pan.' },
        { text: 'It sits. The lens follows you. The slab in your pack is warm.' },
      ],
      options: [{ text: '(Step back.)', exit: true }],
    },
  },
};
