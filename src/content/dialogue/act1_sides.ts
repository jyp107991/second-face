import type { DialogueDef } from '../../engine/dialogue/dialogue';

/** Act 1 side lines: the Dry Well's books, the three in the Choir tent, and Edda Vale's daughter. */

export const d_mags_books: DialogueDef = {
  id: 'd_mags_books', owner: 'narrator',
  start: [{ if: { any: [{ knows: 'mags_cooked' }, { knows: 'mags_books_clean' }] }, node: 'again' }, { node: 'read' }],
  nodes: {
    read: {
      text: 'Two ledgers. The first is the Dry Well as everyone sees it: water in by the barrel, water out by the cup, rooms, Dust stakes, the barman\'s wages, the barman\'s shortfalls circled twice. The second is thinner and newer, and the figures in it are the first ledger\'s figures with the air let out of them.',
      passives: [
        { skill: 'barter', dc: 30, text: 'The second set isn\'t a thief\'s work; it\'s a lender\'s. Interest against the deed, compounding; a buyout line, signed, dated two months ago; the margins initialled in the Tollmen\'s half-moon hand. On paper the Dry Well is Factor Pike\'s. The town drinks here and does not know.', effects: [{ learn: 'mags_cooked' }, { lead: 'l_mags_buyout' }] },
        { attr: 'wits', dc: 8, text: 'The numbers in the second book are the first book\'s numbers made smaller in the same places every month — not stolen, hidden. Hidden from whom?', effects: [{ learn: 'mags_hidden' }] },
      ],
      options: [
        { id: 'books.cooked', text: '(It is a buyout, and she is hiding it.)', if: { knows: 'mags_cooked' }, exit: true },
        { id: 'books.clean', text: '(Water in, water out. Nothing here.)', if: { not: { knows: 'mags_cooked' } }, effects: [{ learn: 'mags_books_clean' }], exit: true },
      ],
    },
    again: { text: 'The books, as before. You know what is in them.', options: [{ text: '(Close them.)', exit: true }] },
  },
};

const tentBye = { text: 'Rest.', exit: true };

export const d_sh_tent_a: DialogueDef = {
  id: 'd_sh_tent_a', owner: 'npc_sh_20',
  start: [{ if: { knows: 'tent_a_done' }, node: 'done' }, { node: 'cot' }],
  nodes: {
    cot: {
      text: 'An old man on a cot, breathing like a bellows with a hole in it. Each breath is a decision. "Dust," he says, when he can. "Forty years of it. Don\'t — don\'t fuss."',
      options: [
        { id: 'tent_a.med', text: '(Sit him up, open the tent flap for air, make him breathe slow with you.)', check: { skill: 'medicine', dc: 30 }, next: 'eased', fail: 'eased_no' },
        { id: 'tent_a.water', text: '(Give him water, a sip at a time.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }], next: 'watered' },
        tentBye,
      ],
    },
    eased: { text: 'It takes a quarter of an hour and all of your attention, and at the end of it he is breathing in the rhythm you gave him and not his own. "Where\'d you learn that." You don\'t answer. "Don\'t tell me. Keep it."', effects: [{ learn: 'tent_a_done' }, { learn: 'tent_a_medicine' }, { time: 20 }, { trust: { npc: 'npc_sh_05', by: 3 } }, { xp: 20 }], options: [tentBye] },
    eased_no: { text: 'You sit him up and the coughing gets worse before it gets better, and then it does not get better. Calla comes and does something with her hands to his back, and he sleeps. "Next time," she says, "ask me first."', effects: [{ learn: 'tent_a_done' }, { time: 30 }], options: [tentBye] },
    watered: { text: 'He drinks the way a wall drinks rain. It will not fix his lungs. It fixes the next hour. "Two a measure," he says, meaning the water, meaning thank you.', effects: [{ learn: 'tent_a_done' }, { time: 10 }, { trust: { npc: 'npc_sh_05', by: 2 } }, { xp: 10 }], options: [tentBye] },
    done: { text: 'He is asleep, or doing a good impression of it. His breath is slow.', options: [tentBye] },
  },
};

export const d_sh_tent_b: DialogueDef = {
  id: 'd_sh_tent_b', owner: 'npc_sh_21',
  start: [{ if: { knows: 'pip_reported' }, node: 'gone' }, { if: { knows: 'tent_b_done' }, node: 'done' }, { node: 'cot' }],
  nodes: {
    cot: {
      text: 'A girl of fifteen or so with her left arm strapped to a board, watching the tent flap and not you. "It\'s fine. It\'s fine. Calla did it. I don\'t need —" She stops when you sit down. "Who are you?"',
      passives: [{ attr: 'senses', dc: 7, text: 'The sleeve of her good arm has ridden up. On the forearm, in blue, badly: a dog\'s head with a bolt through it. The overpass puts that on its children.', effects: [{ learn: 'pip_is_dog' }] }],
      options: [
        { id: 'tent_b.med', text: '(Check the splint and re-tie it; the board has slipped.)', check: { skill: 'medicine', dc: 25 }, next: 'set', fail: 'set_no' },
        { id: 'tent_b.splint', text: '(Replace the board with a proper splint.)', if: { item: 'c_splint' }, effects: [{ take: 'c_splint' }], next: 'splinted' },
        { id: 'tent_b.dog', text: 'You\'re from the overpass.', if: { knows: 'pip_is_dog' }, next: 'dog', once: true },
        tentBye,
      ],
    },
    set: { text: 'The board had slipped a thumb\'s width; another day and the bone would have set wrong. You re-tie it the way Calla would, and the girl watches your hands the whole time instead of the flap. "You\'re good at that." Suspicious. "Who taught you?"', effects: [{ learn: 'tent_b_done' }, { time: 15 }, { trust: { npc: 'npc_sh_05', by: 3 } }, { xp: 20 }], options: [tentBye] },
    set_no: { text: 'You get the knot wrong twice and she hisses the second time. Calla takes over without comment. "Next one," she says.', effects: [{ learn: 'tent_b_done' }, { time: 20 }], options: [tentBye] },
    splinted: { text: 'A real splint, padded, buckled. She looks at it as if it were a bracelet. "That\'s a lot of a thing to waste on me."', effects: [{ learn: 'tent_b_done' }, { time: 10 }, { trust: { npc: 'npc_sh_05', by: 4 } }, { xp: 15 }], options: [tentBye] },
    dog: {
      text: 'She goes white, then red, then still. "Don\'t." Barely a whisper. "Calla knows. Calla doesn\'t care. The sheriff would. Kessler would." Her good hand has found the edge of the cot. "I fell off the deck. That\'s all. I fell off the deck and the Choir picked me up. Please."',
      options: [
        { id: 'tent_b.keep', text: 'I didn\'t see anything.', effects: [{ learn: 'pip_kept' }, { decision: { id: 'pip_kept', text: 'You kept a Rust Dog child\'s secret in the Choir tent.' } }, { memory: { npc: 'npc_sh_21', tag: 'kept', valence: 1, strength: 2 } }], next: 'kept' },
        { id: 'tent_b.warn', text: 'The sheriff will hear it from somebody. Better it\'s from me, with you ready.', next: 'warned' },
        { text: '(Say nothing.)', next: 'cot' },
      ],
    },
    kept: { text: '"Okay." She breathes. "Okay." The flap stops being the only thing in the tent.', options: [tentBye] },
    warned: { text: '"Then I\'ll be gone before you get there." She is already working at the strap with her teeth. Calla, from the other cot: "Pip. Lie down." Pip lies down. Nobody looks at you.', effects: [{ learn: 'pip_warned' }], options: [tentBye] },
    done: { text: 'She is watching the flap again, but less.', options: [{ id: 'tent_b.dog2', text: 'You\'re from the overpass.', if: { all: [{ knows: 'pip_is_dog' }, { not: { knows: 'pip_kept' } }, { not: { knows: 'pip_warned' } }] }, next: 'dog' }, tentBye] },
    gone: { text: 'The cot is empty and stripped. Calla has not said a word to you since.', options: [{ text: '(Leave.)', exit: true }] },
  },
};

export const d_sh_tent_c: DialogueDef = {
  id: 'd_sh_tent_c', owner: 'npc_sh_22',
  start: [{ if: { knows: 'tent_c_done' }, node: 'done' }, { node: 'cot' }],
  nodes: {
    cot: {
      text: 'A big man shaking under two blankets in the heat of the day, eyes wet and far. "Kit?" he says, to you. "Kit, the rope." Then, closer: "Sorry. Sorry. Thought you were —" The fever takes him back.',
      options: [
        { id: 'tent_c.med', text: '(Cool him: wet cloth, the blankets off, water by the spoon.)', check: { skill: 'medicine', dc: 35, mods: [{ if: { item: 'c_water' }, dc: -10, why: 'you have water to spare for it' }] }, next: 'cooled', fail: 'cooled_no' },
        { id: 'tent_c.sit', text: '(Sit with him an hour and keep him drinking.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }, { time: 60 }], next: 'sat' },
        tentBye,
      ],
    },
    cooled: { text: 'The blankets come off over his protests and the cloth goes on, and in half an hour the shaking is a shiver and the eyes are his own. "Who\'s Kit?" you ask. "Nobody," he says, and sleeps.', effects: [{ learn: 'tent_c_done' }, { time: 40 }, { trust: { npc: 'npc_sh_05', by: 3 } }, { xp: 20 }], options: [tentBye] },
    cooled_no: { text: 'He fights the cloth and wins, and the fever climbs, and Calla comes with something bitter in a cup and says nothing at all, which is her way of saying it.', effects: [{ learn: 'tent_c_done' }, { time: 40 }], options: [tentBye] },
    sat: { text: 'An hour of spoon and cup and the far side of a fever. Toward the end of it he knows where he is. "You\'re the one from the salt cut." Everyone is. "Thanks."', effects: [{ learn: 'tent_c_done' }, { trust: { npc: 'npc_sh_05', by: 2 } }, { xp: 10 }], options: [tentBye] },
    done: { text: 'Asleep, and not shaking.', options: [tentBye] },
  },
};

export const d_sh_hesper: DialogueDef = {
  id: 'd_sh_hesper', owner: 'npc_sh_14',
  start: [{ if: { knows: 'edda_found' }, node: 'after' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"Two cups a day." She says it before you have asked anything, the way the whole town says the price of water. "Hesper Vale. If you\'re selling, I\'m not buying, and if you\'re buying, it\'s two a measure like everyone."',
      options: [
        { id: 'hesper.letter', text: 'I\'ve a letter for Edda Vale.', if: { item: 'k_bram_letter' }, next: 'letter' },
        { text: 'Just passing.', exit: true },
      ],
    },
    after: {
      text: [
        { if: { knows: 'bram_reply_forged' }, text: 'She looks at you the way you look at a tool you have decided not to use again. "Did he read it?"' },
        { text: '"Did you take it back to him?" She does not ask what he said.' },
      ],
      options: [{ text: 'I did.', if: { any: [{ knows: 'bram_answered_truth' }, { knows: 'bram_answered_kind' }, { knows: 'bram_answered_told' }] }, exit: true }, { text: 'Not yet.', exit: true }],
    },
    letter: {
      text: 'The name stops her. She takes the letter and does not open it. "My mother." The salt wind moves the dust between you. "She\'s been under the pan six years. The lung." She opens it then, and reads it standing in the street, and when she has finished she folds it along its own creases and holds it against her stomach. "He thinks she\'s alive. He thinks she\'s been waiting."',
      effects: [{ learn: 'edda_found' }, { take: 'k_bram_letter' }],
      options: [
        { id: 'hesper.truth', text: 'Write him the truth. Kindly.', next: 'truth' },
        { id: 'hesper.kind', text: 'Write him what she would have written.', check: { skill: 'speech', dc: 30 }, next: 'kind', fail: 'kind_no' },
        { id: 'hesper.tell', text: 'I\'ll tell him myself.', next: 'tell' },
      ],
    },
    truth: { text: 'She sits down on the edge of the trough and writes on the back of his letter, slowly, stopping twice. "That she kept it. The thing he sent before. That she talked about the door." She gives you the sheet. "That she\'s gone, and I\'m here. He can do what he likes with the rest."', effects: [{ give: 'k_hesper_reply' }, { learn: 'bram_reply_truth' }, { trust: { npc: 'npc_sh_14', by: 8 } }], options: [{ text: 'I\'ll carry it.', exit: true }] },
    kind: { text: '"I won\'t lie in her hand." But she tells you, in pieces, what her mother used to say, and how she said it, and you write it down in a hand that is nobody\'s, and when you read it back to her she turns away. "Give him that, then. God help you both."', effects: [{ give: 'k_hesper_reply_forged' }, { learn: 'bram_reply_forged' }, { decision: { id: 'forged_edda', text: 'You wrote Bram a letter from a dead woman.' } }, { trust: { npc: 'npc_sh_14', by: -4 } }], options: [{ text: 'I\'ll carry it.', exit: true }] },
    kind_no: { text: '"No." Flat. "She\'s dead. Either tell him or tell him nothing. I won\'t help you make her say things."', options: [{ id: 'hesper.truth2', text: 'Then the truth. Kindly.', next: 'truth' }, { id: 'hesper.tell2', text: 'I\'ll tell him myself.', next: 'tell' }] },
    tell: { text: '"Then tell him." She keeps the letter. "Tell him she kept the other one. Tell him I\'m called Hesper. He\'ll know why."', effects: [{ learn: 'bram_tell' }, { trust: { npc: 'npc_sh_14', by: 4 } }], options: [{ text: 'I will.', exit: true }] },
  },
};

export const ACT1_SIDE_DIALOGUES = [d_mags_books, d_sh_tent_a, d_sh_tent_b, d_sh_tent_c, d_sh_hesper];
