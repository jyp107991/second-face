import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * The Wheel's camp. Guests are fed first; road-kin are trusted. The caravan-mother holds the ring; her son wants a
 * town; the horse-master counts horses; the trader sells what walked here. The escort job starts here or at Shale.
 */
const bye = { text: 'Travel well.', exit: true };

export const d_wh_sefa: DialogueDef = {
  id: 'd_wh_sefa', owner: 'npc_wh_01',
  start: [{ if: { knows: 'sefa_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'She does not get up. She looks at your boots, then your hands, then your face, in that order, and nods at the fire as if it were a chair. "Sit. You\'re a guest till you\'re not. Sefa Oduya; this is my wheel. Eat first; then tell me what you want from it."',
      effects: [{ learn: 'sefa_met' }, { rep: { faction: 'wheel', respect: 4 } }, { enlist: 'wheel', rank: 'guest' }],
      options: [
        { id: 'sefa.wheel', text: 'What is the Wheel?', next: 'wheel', once: true },
        { id: 'sefa.turn', text: 'Where do you go next?', next: 'turn' },
        { id: 'sefa.job', text: 'Is there work on the road?', if: { not: { quest: 'q_a1_escort', status: 'done' } }, next: 'job' },
        { id: 'sefa.son', text: 'Your son wants a town.', if: { knows: 'dario_town' }, next: 'son', once: true },
        bye,
      ],
    },
    again: {
      text: [
        { if: { member: 'wheel', rank: 'roadkin' }, text: '"Road-kin." She moves her stick so there is room by the fire. "Sit. What have you brought us from the places that don\'t move?"' },
        { text: '"Guest." The nod again. "Sit. The water\'s been paid for."' },
      ],
      options: [
        { id: 'sefa.wheel2', text: 'What is the Wheel?', if: { not: { knows: 'sefa_wheel' } }, next: 'wheel' },
        { id: 'sefa.turn2', text: 'Where do you go next?', next: 'turn' },
        { id: 'sefa.job2', text: 'Is there work on the road?', if: { not: { quest: 'q_a1_escort', status: 'done' } }, next: 'job' },
        { id: 'sefa.son2', text: 'Your son wants a town.', if: { all: [{ knows: 'dario_town' }, { not: { knows: 'sefa_son' } }] }, next: 'son' },
        bye,
      ],
    },
    wheel: {
      text: '"Nine families, seven wagons, four horses, no address." She counts it on her fingers like a thing she has said a thousand times, because she has. "We carry what towns want between towns that don\'t talk. Salt east, water west, letters both ways, people sometimes. We stop four days and move. Anyone who stops longer than four days is a town, and towns get taxed, and towns get Dogs. We don\'t."',
      effects: [{ learn: 'sefa_wheel' }],
      options: [
        { text: 'And the Tollmen let you?', next: 'tollmen' },
        { text: 'How does one join?', next: 'join' },
        bye,
      ],
    },
    tollmen: { text: '"The Tollmen tax a road. We are not on a road; we are beside one. Pike pretends not to see the difference and we pretend not to see Pike." A thin smile. "That is the whole treaty. It has held thirty years."', options: [{ text: 'I see.', next: 'again' }] },
    join: { text: '"You don\'t. You ride with us until somebody says kin and nobody says no." She shrugs. "Share a road. Pay a debt. Don\'t steal. It isn\'t a secret; it\'s just slow."', options: [{ text: 'Slow is fine.', next: 'again' }] },
    turn: {
      text: [
        { if: { flag: 'wheel_near', eq: 'shale' }, text: '"East, toward the Dry Wells pans, on the fourth morning. Then north under the orchard, then the overpass side, then back here by Shale. A ring. It\'s in the name."' },
        { if: { flag: 'wheel_near', eq: 'drywells' }, text: '"North, under the orchard, on the fourth morning. Then the overpass side, then Shale, then back to these pans. A ring. It\'s in the name."' },
        { if: { flag: 'wheel_near', eq: 'orchard' }, text: '"West, the overpass side, on the fourth morning. We don\'t go under it; we camp where the Dogs can see us and count us. Then Shale, then the Dry Wells pans, then back here. A ring."' },
        { text: '"Shale, on the fourth morning. Then the Dry Wells pans, then under the orchard, then back here where the Dogs can count us. A ring. It\'s in the name."' },
      ],
      options: [{ text: 'Thanks.', next: 'again' }],
    },
    job: {
      text: '"There\'s always work on the road, and most of it is walking next to a wagon with a gun and not shooting it." She looks you over again. "We\'ve a wagon of salt going to Tollhouse 9 with the Tollmen\'s caravan. The guild\'s guards guard the guild\'s wagons. Ours needs its own. Sixty Tolls at the gate, and the Wheel remembers who rode."',
      options: [
        { id: 'sefa.job.yes', text: 'I\'ll ride with it.', if: { not: { quest: 'q_a1_escort', status: 'active' } }, effects: [{ quest: 'q_a1_escort', start: true }, { set: 'escort_active', value: 'wheel' }], next: 'job_yes' },
        { id: 'sefa.job.have', text: 'I\'m already riding for it.', if: { quest: 'q_a1_escort', status: 'active' }, next: 'job_have' },
        { text: 'Not now.', next: 'again' },
      ],
    },
    job_yes: { text: '"Then it leaves when you do. Walk the Tollhouse road from Shale and keep the wagon in your eye. If the road asks you for something, remember it\'s asking the Wheel."', options: [bye] },
    job_have: { text: '"Then ride. Tollhouse 9. The gate pays."', options: [bye] },
    son: {
      text: '"He does." She lets the fire have a moment. "He\'s right that a well that doesn\'t dry is worth more than a road that doesn\'t end. He\'s wrong that you can own one without owing somebody. I had a town once. It is under the salt now." She looks at you. "Don\'t tell him I said he was right."',
      effects: [{ learn: 'sefa_son' }, { trust: { npc: 'npc_wh_01', by: 5 } }],
      options: [{ text: 'I won\'t.', next: 'again' }],
    },
  },
};

export const d_wh_dario: DialogueDef = {
  id: 'd_wh_dario', owner: 'npc_wh_02',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: '"You\'re the one from Shale." He has been watching the camp the way a man watches a room he wants to leave. "Dario. Hers." A nod at the fire. "Is it true the well there runs all year?"',
      options: [
        { id: 'dario.well', text: 'It runs. The town fights over it.', next: 'well', once: true },
        { id: 'dario.why', text: 'You want to settle.', next: 'town', once: true },
        { id: 'dario.escort', text: 'Your mother\'s salt wagon. Tell me about the road.', if: { quest: 'q_a1_escort', status: 'active' }, next: 'road', once: true },
        { text: 'Later.', exit: true },
      ],
    },
    well: { text: '"Everybody fights over everything. At least a well is worth it." He turns a cartridge over in his fingers. "We fight over which pan to stop on."', options: [{ text: 'Fair.', next: 'intro' }] },
    town: {
      text: '"I want a door. One that shuts." He says it quietly, because the ring has ears. "She thinks a door is a cage. She\'s not wrong about the old towns. But the old towns are gone and the salt took them, and Shale is still there." He looks at you. "You\'ve lived in a place with a door. Is it a cage?"',
      effects: [{ learn: 'dario_town' }],
      options: [
        { id: 'dario.town.door', text: 'A door is a door. What you do behind it is yours.', effects: [{ trust: { npc: 'npc_wh_02', by: 6 } }, { learn: 'dario_told_door' }], next: 'door' },
        { id: 'dario.town.road', text: 'Your mother kept nine families alive without one.', effects: [{ trust: { npc: 'npc_wh_02', by: -2 } }, { trust: { npc: 'npc_wh_01', by: 3 } }, { learn: 'dario_told_road' }], next: 'road_answer' },
        { text: 'Not my call.', next: 'intro' },
      ],
    },
    door: { text: '"That\'s what I think." He almost smiles. "Don\'t tell her you said so."', options: [{ text: 'Of course not.', next: 'intro' }] },
    road_answer: { text: '"She did." He puts the cartridge away. "And she\'s tired, and nobody says so, and the Wheel will turn until it doesn\'t." He looks at the horses. "Four, now."', options: [{ text: 'I\'m sorry.', next: 'intro' }] },
    road: { text: '"Dogs on the road sometimes, when the tribute\'s late. A ford that isn\'t a ford after rain. And the Tollmen\'s own guards, who\'ll help you with a wheel and charge the Wheel for the help." He shrugs. "Keep the wagon in your eye. That\'s the whole job."', options: [{ text: 'Noted.', next: 'intro' }] },
  },
};

export const d_wh_mirren: DialogueDef = {
  id: 'd_wh_mirren', owner: 'npc_wh_03',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: '"Not behind her." Mirren Kade doesn\'t look away from the horse. "Front, slow, hand out. There. Now she knows you." A nod. "Horse-master. I\'m not selling."',
      options: [
        { id: 'mirren.horses', text: 'Four horses for seven wagons?', next: 'horses', once: true },
        { id: 'mirren.ride', text: 'Could I ride one, if I needed to be somewhere fast?', next: 'ride', once: true },
        bye,
      ],
    },
    horses: { text: '"Two pull, two rest, one dies every winter and I don\'t replace it, because there\'s nothing to replace it with. The Tollmen have mules. Mules eat less and think less. I\'d rather have horses and think."', options: [{ text: 'Fair.', next: 'intro' }] },
    ride: { text: '"When you\'re kin, maybe. A horse is a road that carries you. We don\'t lend roads." She finally looks at you. "Ride with the wagon first. Then ask again."', effects: [{ learn: 'mirren_ride' }], options: [{ text: 'I will.', next: 'intro' }] },
  },
};

export const d_wh_tulla: DialogueDef = {
  id: 'd_wh_tulla', owner: 'npc_wh_04',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: '"Everything on the blanket walked here." Tulla Oduya spreads her hands over it: water, jerky, cartridges in paper, a lamp, strips of Holdfast. "So did the price. Looking or buying?"',
      options: [
        { id: 'tulla.trade', text: 'Show me.', effects: [{ event: 'barter' }], exit: true },
        { id: 'tulla.letters', text: 'Do you carry letters?', next: 'letters', once: true },
        bye,
      ],
    },
    letters: { text: '"To anywhere the Wheel stops and most places the Tollmen do. Write it at a caravan post; it rides with the next wagon. Replies come back the same way, when they come."', options: [{ text: 'Good to know.', next: 'intro' }] },
  },
};

export const WHEEL_DIALOGUES = [d_wh_sefa, d_wh_dario, d_wh_mirren, d_wh_tulla];
