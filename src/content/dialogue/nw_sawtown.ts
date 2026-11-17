import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, IN, ILYA, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave } from './nw_river';

/**
 * Sawtown (B5c): Marks at the Boom (`q_nw_feud`: the marks cut over at the boom, the Ridge and the Bottoms, a dead faller,
 * and its four ends), the boom-keeper, the crews, the cookhouse and its room, the mill, the drive (an activity). The landing
 * and the railhead boards are in nw_river.ts. Story notes: story/B5c_NOTES_SECRET.md.
 */

const DECIDED: Cond = { flag: 'nw_feud' };
const UNDECIDED: Cond = { not: DECIDED };
const MARKER: Cond = { knows: 'nw_marker_known' };
const WHYM: Cond = { knows: 'nw_why_marks' };
const FAULT: Cond = { knows: 'nw_fault_known' };
const F = (v: string): Cond => ({ flag: 'nw_feud', eq: v });

// ---------------------------------------------------------------- the ends of the feud

const FEUD = (v: string, text: string, extra: Effect[]): Effect[] => [{ quest: 'q_nw_feud', start: true }, { set: 'nw_feud', value: v }, ...extra, { decision: { id: `nw_feud_${v}`, text } }];
export const FEUD_TRUTH: Effect[] = FEUD('truth', 'At the crews\' meeting in Sawtown\'s mill, Mikkel Brandvold\'s death was said aloud for what it was: his father sent him up in the rain. Arvid Brandvold gave the Ridge to Cillian Moss and went up the hill alone. The marks stopped. Mikkel\'s child eats at the Ridge\'s table.', [
  { set: 'nw_marks_end' }, { set: 'nw_arvid_gone' }, { set: 'nw_wayra_ridge' }, { set: 'nw_barges_owed' }, { xp: 240 },
  A(ASH, 5), A(TAMSIN, 3), A(WREN, 2), A(ILYA, 2),
  { news: { tag: 'nw_feud_truth', text: 'Sawtown\'s two crews have ended their feud; the Ridge\'s foreman gave up his crew and went up the hill', valence: 5, size: 5, at: 'sawtown' } },
]);
export const FEUD_QUIET: Effect[] = FEUD('quiet', 'I told Arvid Brandvold alone what I knew about the morning his son died. He walked down to the cookhouse and asked to hold the child. The feud ended, and nobody else in Sawtown knows why.', [
  { set: 'nw_marks_end' }, { set: 'nw_arvid_knows' }, { xp: 220 }, A(ASH, 5), A(TAMSIN, 2),
  { news: { tag: 'nw_feud_quiet', text: 'Sawtown\'s Ridge and Bottoms are cutting side by side again, and nobody will say why', valence: 3, size: 3, at: 'sawtown' } },
]);
export const FEUD_CAUGHT: Effect[] = FEUD('caught', 'I gave the boom-keeper the mark-cutter, Sigrun Brandvold, and not the reason. Sawtown\'s law is the Water.', [
  { give: 'tolls', count: 60 }, { xp: 60 }, A(ASH, -5), A(TAMSIN, -5), A(WREN, -5),
]);
export const FEUD_BURNED: Effect[] = FEUD('burned', 'I kept watch while Cillian Moss went down to the Bottoms\' skid camp with a can of the Rigs\' oil.', [
  { set: 'nw_cillian_lit' }, { xp: 40 }, A(ASH, -10), A(TAMSIN, -10), A(WREN, -5), A(NINE, -3),
]);

// ---------------------------------------------------------------- the boom

export const d_nw_notice: DialogueDef = {
  id: 'd_nw_notice', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'nw_marks_end' }, text: 'The boom\'s notice, MARKS CUT, with a line through it in fresh chalk, and under it in Berit\'s hand: TALLY GOOD.' },
        { text: 'A board at the head of the boom\'s walkways, the chalk rained on and renewed: MARKS CUT. THE BOOM PAYS WHAT THE MARK SAYS. WHOEVER IS CUTTING THEM, THE WATER IS WIDE. Under it a scratched crow\'s foot, and a hook beside it, and a line drawn hard through the hook.' },
      ],
      again: 'The boom\'s notice.',
      effects: [{ quest: 'q_nw_feud', start: true }, { learn: 'nw_boom_seen' }],
      options: [leave],
    },
  },
};

export const d_nw_berit: DialogueDef = {
  id: 'd_nw_berit', owner: 'npc_nw_05',
  start: [{ if: { flag: 'nw_berit_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A grey-braided woman in an oilskin at a desk by the boom office\'s window, with a tally book open in front of her and a pike pole leaning by her chair. "Solberg. The boom." She does not get up. "Every log that comes down to Sawtown comes into my pens with a mark on its butt, and I sort it by the mark and pay by the mark. That\'s the boom. That\'s the law here, too, near enough." She closes the book on her pencil. "The boom pays what the mark says."',
      again: 'Berit, at the tally book.',
      effects: [{ set: 'nw_berit_met' }, { quest: 'q_nw_feud', start: true }],
      options: [
        { id: 'berit.notice', text: 'Your notice says marks are being cut.', next: 'notice' },
        { id: 'berit.feud', text: 'The Ridge and the Bottoms.', next: 'feud' },
        bye,
      ],
    },
    again: {
      text: [
        { if: F('truth'), text: '"One table at the cookhouse," Berit says. "Ridge on one side, Bottoms on the other, a baby in the middle. I never thought I\'d see it." She opens the tally. "Good marks, all week."' },
        { if: F('caught'), text: '"Tally\'s good," Berit says. She does not look at the Water.' },
        { if: F('burned'), text: '"Half the Water\'s hooks are gone down the river with the Bottoms." Berit closes the tally book. "Ridge marks, now, all of them. And no Ridge to speak of without its foreman\'s boy." She looks at you a long time. "Don\'t bring me any more help."' },
        { text: '"Mm?" Berit does not look up from the tally.' },
      ],
      again: 'Berit, at the tally.',
      options: [
        { id: 'berit.notice2', text: 'Your notice says marks are being cut.', if: { not: { seen: 'berit.notice' } }, next: 'notice' },
        { id: 'berit.feud2', text: 'The Ridge and the Bottoms.', if: { not: { seen: 'berit.feud' } }, next: 'feud' },
        { id: 'berit.give', text: 'I know who\'s cutting your marks.', if: { all: [MARKER, UNDECIDED] }, next: 'give' },
        { id: 'berit.meeting', text: 'Call both crews to the mill tonight. There\'s something they need to hear.', if: { all: [FAULT, MARKER, UNDECIDED] }, next: 'meeting' },
        { id: 'berit.work', text: '(Work a day on the boom. 8 Tolls.)', check: { attr: 'brawn', dc: 6 }, effects: [{ time: 240 }, { give: 'tolls', count: 8 }, { inc: 'nw_boom_days' }], failEffects: [{ time: 240 }, { give: 'tolls', count: 3 }], next: 'worked', fail: 'wet', repeat: true },
        bye,
      ],
    },
    notice: {
      text: '"All season." She opens the book again and turns it to you: columns of marks, a crow\'s foot or a hook, and a count. "The Ridge are short. Not a lot. A log a night, two. Somebody goes out to my north pen in the dark and takes their crow\'s foot off the butt and cuts a hook over it, and in the morning I pay the Bottoms for Ridge timber." She shuts it. "The Ridge say it\'s the Bottoms. The Bottoms say nothing, which the Ridge say is the same. Cillian Moss has a can of oil in his bunk. Find me the cutter before the Ridge finds them for me."',
      again: '"Find me the cutter before the Ridge does."',
      effects: [{ set: 'nw_berit_asked' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    feud: {
      text: '"Two years." She looks out at the Water. "Mikkel Brandvold, Arvid\'s boy, was killed felling on the boundary between their ground and the Bottoms\' flats: a widowmaker, a big leaner that split and came back on him. Arvid said the Bottoms dropped it. The Bottoms said they were on the flats eating breakfast. Since then a shed burned, a man\'s been beaten half blind, and now the marks." She taps the pole. "In the old days the boom put a mark-cutter on the Water with one oar and let the lake decide. I\'d like the old days to stay old."',
      again: '"I\'d like the old days to stay old."',
      effects: [{ learn: 'nw_mikkel_known' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    give: {
      text: '"Who?" She has the pencil in her hand, ready to write a name. You can give her the girl. You can give her the reason too, or not.',
      again: '"Who?"',
      options: [
        { id: 'berit.give.name', text: 'Sigrun Brandvold. Just that.', effects: FEUD_CAUGHT, next: 'caught' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    caught: {
      text: 'Berit writes it in the book, and sits looking at it. "His girl." She puts the pencil down. "Well. The Water is wide." She counts sixty Tolls out of a tin and pushes them over. "That\'s the boom\'s, for the marks. It\'ll be at dawn." She does not ask why. Nobody in Sawtown will ask why.',
      again: '"It\'ll be at dawn."',
      interject: [{ companion: TAMSIN, text: '"One oar," Tamsin says outside, very quietly. "They give her one oar and a lake." She looks at you. "You didn\'t ask why she did it. I would have asked why."' }],
      options: [bye],
    },
    meeting: {
      speaker: 'narrator',
      text: 'Berit rings the mill bell at dusk, and they come, because she has never rung it before: the Ridge down the hill in a body with Arvid at their front, the Bottoms up the shore with Rufino, the mill hands, the cookhouse, a dozen children, and Wayra Huaman at the back with a bundle in her arms. Two crews and a gap between them on the sawdust floor exactly as wide as a felled tree. Everybody is looking at you.',
      again: 'The two crews on the sawdust, and the gap between them.',
      options: [
        { id: 'berit.meeting.say', text: '(Say it all: the marks, where the money goes, and the morning in the rain.)', check: { skill: 'speech', dc: 50, mods: [
          { if: FAULT, dc: -15, why: 'you know what happened on the boundary' }, { if: { flag: 'nw_sigrun_stands' }, dc: -10, why: 'Sigrun stands up beside you' },
          { if: { lead: 'l_nw_tally' }, dc: -5, why: 'the tally in Berit\'s hand' }, { if: IN(ASH), dc: -5, why: 'Ash, who says the dead\'s names' },
        ] }, effects: FEUD_TRUTH, next: 'said', fail: 'shouted' },
        { text: '(Say nothing, after all.)', next: 'again' },
      ],
    },
    said: {
      speaker: 'narrator',
      text: 'You tell it, and Sigrun Brandvold stands up beside you and tells the part that is hers, and the mill is so quiet you can hear the race under the floor. When you come to the morning in the rain, Arvid Brandvold does not argue. He looks at the bundle in Wayra\'s arms for the first time in two years, and says, "Yes." Just that. Then he takes his axe off his shoulder and gives it to Cillian Moss, haft first, and walks out of the mill and up the hill in the dark, and Rufino Huaman, after a long moment, walks across the gap and puts the baby into Sigrun\'s arms.',
      again: 'The axe given haft first.',
      interject: [
        { companion: ASH, text: '"Mikkel Brandvold," Ash says, aloud, to the mill, the way the Choir says a name at a burial. Nobody tells him not to.', effects: [A(ASH, 2)] },
        { companion: ILYA, text: 'Ilya watches the old man go up the hill until his lamp is gone. "Right," he says, and nothing else, and it is not the word he usually means by it.' },
      ],
      options: [{ text: '(Leave them to it.)', exit: true }],
    },
    shouted: { speaker: 'narrator', text: 'You start, and the Ridge start shouting before you are halfway, and Arvid Brandvold walks out with his crew behind him before you can come to the morning in the rain. The gap on the sawdust is wider when they have gone.', again: 'The gap on the sawdust, wider.', options: [{ text: 'Something else.', next: 'again' }] },
    worked: { speaker: 'narrator', text: 'Four hours on the walkways with a pike pole, walking logs into their pens by the marks on their butts while Berit calls them: crow\'s foot, hook, crow\'s foot. Your arms ache and your boots are full of the Water.', again: 'A day on the boom.', options: [bye] },
    wet: { speaker: 'narrator', text: 'A log rolls under your pole on the second hour, and you go into the pen after it, and the sorters fish you out laughing. Berit pays you three for the morning and tells you the Water does that to everyone once.', again: 'Into the pen, once.', options: [bye] },
  },
};

export const d_nw_tally: DialogueDef = {
  id: 'd_nw_tally', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The boom\'s tally book open on the desk by the window: a column of crow\'s feet and a column of hooks, a count a day, and the boom\'s pay beside each.',
      again: 'The tally book.',
      interject: [{ companion: ODILE, if: { not: { lead: 'l_nw_tally' } }, text: 'Odile turns three pages and runs a finger down the hooks. "Four saws on the flats, my dear, if I read the payroll. They are being paid for six." She closes it. "Somebody is cutting hooks, yes. But somebody on the Bottoms is also not asking why they are suddenly rich."', effects: [{ lead: 'l_nw_tally' }, A(ODILE, 2)] }],
      options: [
        { id: 'tally.read', text: '(Add up the Bottoms\' season.)', if: { not: { lead: 'l_nw_tally' } }, check: { skill: 'barter', dc: 35, mods: [{ if: { attr: 'wits', gte: 7 }, dc: -10, why: 'quick with numbers' }] }, effects: [{ lead: 'l_nw_tally' }], next: 'sum', fail: 'muddle' },
        leave,
      ],
    },
    sum: { text: 'The Bottoms have four saws on the flats and the flats are slow ground. This season the boom has paid them for half again what four saws can fell, a log or two a night more than they can have cut, every night, for months. Whoever is cutting hooks over crow\'s feet, the money is real, and it is going somewhere.', again: 'Half again what four saws can fell.', options: [leave] },
    muddle: { text: 'Crow\'s feet, hooks, and numbers. It comes out different each time you add it.', again: 'Crow\'s feet and hooks.', options: [leave] },
  },
};

export const d_nw_pen: DialogueDef = {
  id: 'd_nw_pen', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The north pen: logs afloat shoulder to shoulder in black water, their butts toward the walkway, each with a mark cut into its end grain. Crow\'s foot, crow\'s foot, hook.',
      again: 'The north pen, crow\'s feet and hooks.',
      interject: [{ companion: WREN, if: { not: { lead: 'l_nw_marks' } }, text: 'Wren crouches on the walkway and runs her thumb round the hook on a butt. "Fresh. And under it—" she tilts the log to the light, "—a crow\'s foot, shaved off with a knife. Somebody with a punt and a lamp, at night." She looks along the pen. "Seven like it. Same hand."', effects: [{ lead: 'l_nw_marks' }] }],
      options: [
        { id: 'pen.look', text: '(Look closely at the hooks.)', if: { not: { lead: 'l_nw_marks' } }, check: { attr: 'senses', dc: 6, mods: [{ if: { skill: 'survival', gte: 30 }, dc: -2, why: 'you know a fresh cut' }] }, effects: [{ lead: 'l_nw_marks' }], next: 'marks', fail: 'logs' },
        leave,
      ],
    },
    marks: { text: 'On a dozen butts in the north pen the hook is new, pale wood, cut with a scribe\'s bent blade; and round it, if you tilt the log, the ghost of a crow\'s foot shaved away with a knife. All in the pen nearest the dark end of the walkway, where nobody stands at night.', again: 'The new hooks over shaved crow\'s feet.', options: [leave] },
    logs: { text: 'Logs, water, marks. They all look alike to you, which is presumably the point.', again: 'Logs.', options: [leave] },
  },
};

export const d_nw_punt: DialogueDef = {
  id: 'd_nw_punt', owner: 'npc_nw_07',
  start: [{ node: 'caught' }],
  nodes: {
    caught: {
      text: 'A punt in the north pen, nosed in among the logs, a lamp with its shutter almost closed, and a young woman kneeling in it over a log\'s butt with a scribe in her fist. She freezes in your light. Then she sits back on her heels and does not try to run. "Well," says Sigrun Brandvold. "Now somebody knows."',
      again: 'Sigrun in the punt, the scribe in her fist.',
      effects: [{ lead: 'l_nw_punt' }],
      options: [
        { id: 'punt.why', text: 'Why cut your own family\'s marks?', next: 'why' },
        { id: 'punt.scribe', text: '(Hold out your hand for the scribe.)', if: { not: { item: 'k_nw_scribe' } }, effects: [{ give: 'k_nw_scribe' }], next: 'scribe' },
        { text: '(Let her go on.)', exit: true },
      ],
    },
    why: {
      text: '"Because my father won\'t." She puts the scribe in her lap. "Mikkel was going to marry Wayra Huaman. My father said a Brandvold doesn\'t marry hooks. Then Mikkel was dead, and Wayra had his baby, and my father has never looked at either of them." She looks at the hooks. "Ridge timber. Ridge money. A log a night to Rufino, and Rufino gives it to Dorit for Wayra\'s board and the baby\'s milk." She laughs, shakily. "It\'s the only thing the Ridge has ever given Mikkel\'s child. It just doesn\'t know."',
      again: '"It\'s the only thing the Ridge has ever given Mikkel\'s child."',
      effects: [{ lead: 'l_nw_baby' }, { learn: 'nw_sigrun_why' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin sits down on the walkway with her boots over the water. "You\'re stealing from your dad to feed your brother\'s baby," she says. "Rust it, I like you."', effects: [A(TAMSIN, 2)] }],
      options: [{ text: 'Something else.', next: 'caught' }],
    },
    scribe: { text: 'She looks at your hand, and at the Water, and puts the scribe in it, handle first: a bent marking knife with a crow\'s foot burned into the handle. "It was his," she says. "Mikkel\'s."', again: 'Mikkel\'s scribe, in your hand.', options: [{ text: 'Something else.', next: 'caught' }] },
  },
};

// ---------------------------------------------------------------- the people of Sawtown

export const d_nw_sigrun: DialogueDef = {
  id: 'd_nw_sigrun', owner: 'npc_nw_07',
  start: [{ if: { flag: 'nw_sigrun_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young faller with a sun-bleached braid, sharpening a saw chain on her knee outside the Ridge\'s bunkhouse. "I\'m busy." She does not look up. "Ask my father. Everyone asks my father."',
      again: 'Sigrun, at the saw chain.',
      effects: [{ set: 'nw_sigrun_met' }],
      options: [bye],
    },
    again: {
      text: [
        { if: F('truth'), text: 'Sigrun with a baby on her hip and a saw chain in her other hand, looking like someone who has not slept and does not mind. "She bites," she says. "Like Mikkel did."' },
        { if: F('quiet'), text: '"My father went to the cookhouse," Sigrun says. "He sat with her an hour. He hasn\'t said a word to me about it." She almost smiles. "I stopped cutting."' },
        { text: '"I\'m busy," Sigrun says again.' },
      ],
      again: 'Sigrun.',
      options: [
        { id: 'sigrun.marks', text: 'You\'re the one cutting your own family\'s marks.', if: { all: [MARKER, UNDECIDED, { not: { knows: 'nw_sigrun_why' } }] }, effects: [{ learn: 'nw_sigrun_why' }, { lead: 'l_nw_baby' }], next: 'why' },
        { id: 'sigrun.stand', text: 'Will you stand up at the mill and say it, if I say the rest?', if: { all: [{ knows: 'nw_sigrun_why' }, UNDECIDED, { not: { flag: 'nw_sigrun_stands' } }] }, effects: [{ set: 'nw_sigrun_stands' }], next: 'stand' },
        bye,
      ],
    },
    why: { text: 'She stops sharpening. "For Wayra Huaman, and my brother\'s baby. My father won\'t look at them. The Ridge won\'t feed them. So the Ridge feeds them anyway, a log a night, and doesn\'t know it." She starts sharpening again, harder. "Tell Berit if you want. The Water\'s wide."', again: '"The Ridge feeds them anyway."', options: [{ text: 'Something else.', next: 'again' }] },
    stand: { text: '"If you\'ve got the rest of it." She looks up the hill at her father\'s house. "If you can make him hear it. He never hears it from me." She puts the chain down. "I\'ll stand."', again: '"I\'ll stand."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_nw_arvid: DialogueDef = {
  id: 'd_nw_arvid', owner: 'npc_nw_06',
  start: [{ if: { flag: 'nw_arvid_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A big grey-bearded man with a scar down one cheek, sitting on the step of the foreman\'s house with an axe across his knees, honing it with long strokes. "Brandvold." He does not stop. "The Ridge cuts the Ridge. The Bottoms cut mud. If you\'re here to buy timber, see Berit."',
      again: 'Arvid, honing the axe.',
      effects: [{ set: 'nw_arvid_met' }],
      options: [
        { id: 'arvid.mikkel', text: 'I heard about your son.', next: 'mikkel' },
        { id: 'arvid.bottoms', text: 'The Bottoms.', next: 'bottoms' },
        bye,
      ],
    },
    again: {
      text: [
        { if: F('quiet'), text: 'Arvid on the step, the axe across his knees, not honing it. "I sat with her," he says, before you can speak. "She has his chin." He says nothing else.' },
        { if: F('burned'), text: '"They\'re gone," Arvid says. "Down the river. All of them." He hones the axe. "The Ridge cuts the Ridge."' },
        { text: '"Mm." Arvid does not stop honing.' },
      ],
      again: 'Arvid, on the step.',
      options: [
        { id: 'arvid.mikkel2', text: 'I heard about your son.', if: { not: { seen: 'arvid.mikkel' } }, next: 'mikkel' },
        { id: 'arvid.bottoms2', text: 'The Bottoms.', if: { not: { seen: 'arvid.bottoms' } }, next: 'bottoms' },
        { id: 'arvid.rain', text: 'You sent him up to fell that leaner in the rain.', if: { all: [FAULT, UNDECIDED] }, check: { skill: 'speech', dc: 45, mods: [
          { if: { flag: 'nw_sigrun_stands' }, dc: -5, why: 'his daughter has said she will stand' }, { if: { item: 'k_nw_scribe' }, dc: -10, why: 'Mikkel\'s scribe, in your hand' },
          { if: IN(ASH), dc: -5, why: 'Ash, gently' }, { if: WHYM, dc: -5, why: 'you know where the money goes' },
        ] }, effects: FEUD_QUIET, next: 'quiet', fail: 'out' },
        bye,
      ],
    },
    mikkel: { text: 'The honing stops for one stroke, and starts again. "Don\'t say his name in my house." He is not in his house; he is on its step. You do not point this out.', again: '"Don\'t say his name."', options: [{ text: 'Something else.', next: 'again' }] },
    bottoms: { text: '"They dropped a tree on my boy." He says it flat, the way you say a thing you have said every day for two years so you would not have to hear yourself think anything else. "From the flats. A big leaner on the boundary. They wanted it before we got to it. They got it." The axe goes on. "Mud and money, the Bottoms. Always were."', again: '"They dropped a tree on my boy."', options: [{ text: 'Something else.', next: 'again' }] },
    quiet: {
      text: 'The axe stops. For a long time he only sits, looking at the stumps on the hill. "I told him the Bottoms would have it by noon," he says. "It was raining. He said it was leaning wrong. I told him to fell it anyway." He puts the axe down on the step, carefully, as if it might break. "I\'ve been saying it was them for two years so I wouldn\'t have to hear that." He stands up. He goes down the hill, not fast, to the cookhouse, and through the cookhouse door. Through the window you see him stop in front of Wayra Huaman, and hold out his hands.',
      again: 'Arvid, holding out his hands.',
      interject: [{ companion: ASH, text: 'Ash watches through the cookhouse window and does not say anything at all. When he turns away he is smiling, which he does not do often.' }],
      options: [{ text: '(Leave him to it.)', exit: true }],
    },
    out: { text: 'He is on his feet with the axe in his hand before you have finished, and you are off his step without being entirely sure how. "Get off the Ridge," he says. "Get off it before I forget I\'m a foreman."', again: '"Get off the Ridge."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_nw_cillian: DialogueDef = {
  id: 'd_nw_cillian', owner: 'npc_nw_08',
  start: [{ if: { flag: 'nw_cillian_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A red-headed faller with a black eye a week old, kicking a stump on the Ridge path as if it had done something. "Somebody should do something," he says, to you, to the stump, to the hill. "Mikkel was my friend. And they cut hooks on our timber and Berit pays them for it, and Arvid just hones that axe." He kicks the stump. "Somebody should do something."',
      again: 'Cillian, kicking the stump.',
      effects: [{ set: 'nw_cillian_met' }],
      options: [
        { id: 'cillian.what', text: 'Do what?', next: 'what' },
        bye,
      ],
    },
    again: {
      text: [
        { if: F('truth'), text: 'Cillian with Arvid\'s axe on his shoulder, looking as if it is far too heavy. "Foreman," he says. "Me." He shakes his head. "I\'d have burned them. I\'d have burned them, and it was him."' },
        { text: '"Well?" says Cillian.' },
      ],
      again: 'Cillian, on the Ridge path.',
      options: [
        { id: 'cillian.what2', text: 'Do what?', if: { not: { seen: 'cillian.what' } }, next: 'what' },
        { id: 'cillian.morning', text: 'Who sent Mikkel up to fell that leaner?', if: { all: [{ not: { lead: 'l_nw_order' } }, { any: [{ seen: 'cillian.what' }, { seen: 'cillian.what2' }] }] }, check: { skill: 'speech', dc: 40, mods: [{ if: { lead: 'l_nw_stump' }, dc: -10, why: 'you have read the stump' }] }, effects: [{ lead: 'l_nw_order' }], next: 'morning', fail: 'shut' },
        { id: 'cillian.burn', text: 'Do it, then. I\'ll keep watch.', if: UNDECIDED, effects: FEUD_BURNED, next: 'burn' },
        { id: 'cillian.calm', text: 'Put the oil can back under your bunk, Cillian.', if: { all: [UNDECIDED, { not: { flag: 'nw_cillian_calm' } }] }, check: { skill: 'speech', dc: 35 }, effects: [{ set: 'nw_cillian_calm' }], next: 'calm', fail: 'shut' },
        bye,
      ],
    },
    what: { text: '"Their skid camp\'s all dry tarp and old oil." He says it fast, as if he has been saying it to himself all week. "One can. Two in the morning. Nobody hurt; they sleep in the tents, not the shed. Then they\'d know." He looks at you sideways. "I\'d need somebody to watch the path."', again: '"One can. Two in the morning."', options: [{ text: 'Something else.', next: 'again' }] },
    morning: {
      text: 'He stops kicking the stump. "Arvid," he says. "Who else. I was there, I held the wedge. It was pissing down and the leaner was wrong, you could see it was wrong, and Mikkel said so, and Arvid said the Bottoms\'ll have it by noon, fell it." He wipes his face with his sleeve. "It split. It came back on him." He looks at you, horrified, as if you had made him say it. "It\'s the Bottoms\' fault. They\'d have had it by noon."',
      again: '"I held the wedge."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    burn: { text: 'He grins, a terrible bright grin. "Two in the morning," he says. "Watch the shore path." He goes off up to the bunkhouse at a run, and you hear him laughing.', again: '"Two in the morning."', interject: [{ companion: ASH, text: 'Ash puts his hand on your arm, very hard. "There\'s a baby in that camp," he says. "Did you know that? There\'s a baby."' }], options: [bye] },
    calm: { text: 'He glares at you, and at the hill, and then all the fight goes out of him at once and he sits down on the stump. "Fine," he says. "Fine. It\'s under my bunk." He puts his face in his hands. "He was my friend."', again: '"He was my friend."', options: [{ text: 'Something else.', next: 'again' }] },
    shut: { text: '"What do you care?" He kicks the stump again and walks off up the hill.', again: '"What do you care?"', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_nw_rufino: DialogueDef = {
  id: 'd_nw_rufino', owner: 'npc_nw_09',
  start: [{ if: { flag: 'nw_rufino_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man with a weathered face and cropped black hair, splitting kindling at the Bottoms\' fire on the shore with neat, unhurried strokes. "Huaman. The Bottoms." He nods at the flats. "Slow ground. Slow ground never killed anybody." He splits another stick. "Whatever the Ridge told you, it was before breakfast, and we were at breakfast."',
      again: 'Rufino, splitting kindling.',
      effects: [{ set: 'nw_rufino_met' }],
      options: [
        { id: 'rufino.morning', text: 'The morning Mikkel Brandvold died.', next: 'morning' },
        bye,
      ],
    },
    again: {
      text: [
        { if: F('truth'), text: 'Rufino at the fire, not splitting anything. "My granddaughter eats at the Ridge\'s table," he says. "I never thought I\'d say that sentence." He laughs. "I\'ll have to get used to it."' },
        { text: '"Mm?" Rufino splits another stick.' },
      ],
      again: 'Rufino, at the fire.',
      options: [
        { id: 'rufino.morning2', text: 'The morning Mikkel Brandvold died.', if: { not: { seen: 'rufino.morning' } }, next: 'morning' },
        { id: 'rufino.money', text: 'The boom\'s paid you for half again what you can fell this season.', if: { all: [{ lead: 'l_nw_tally' }, { not: { lead: 'l_nw_baby' } }] }, effects: [{ lead: 'l_nw_baby' }], next: 'money' },
        bye,
      ],
    },
    morning: { text: '"We were on the flats, all twelve of us, eating, when we heard it go." He puts the hatchet down. "I ran up. The tree had split up the middle and come back over its own stump. Mikkel was under it." He picks the hatchet up again. "He was a good boy. He used to come down to our fire and eat with us, when his father wasn\'t looking. He was going to marry my girl." He splits a stick. "Arvid doesn\'t know that. Or he does, and it\'s why."', again: '"He was going to marry my girl."', options: [{ text: 'Something else.', next: 'again' }] },
    money: {
      text: 'He looks at you for a long moment, and then he looks up the hill at the Ridge, and something in his face gives. "I don\'t ask where it comes from," he says. "I know where it comes from. I give every Toll of it to Dorit at the cookhouse, for my girl\'s board and the baby\'s milk, because that\'s whose it is." He goes back to the kindling. "Mikkel\'s child. Ridge timber. The Ridge just doesn\'t know it\'s being generous."',
      again: '"The Ridge just doesn\'t know it\'s being generous."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_nw_wayra: DialogueDef = {
  id: 'd_nw_wayra', owner: 'npc_nw_10',
  start: [{ if: { flag: 'nw_wayra_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young woman at the end of the cookhouse table with a baby asleep in a sling on her chest and a bowl of potatoes she is peeling round it. "Shh." She does not look up. "She\'s only just gone down. Mika." The baby has a fist up by her face. "If you\'re from the Ridge, you can go back up it."',
      again: 'Wayra, peeling round the baby.',
      effects: [{ set: 'nw_wayra_met' }],
      interject: [{ companion: ASH, text: 'Ash sits down across the table, a long way from the baby, and looks at her the way he looks at seedlings. "Mika," he says. "That\'s a good name." Wayra looks at him, and after a moment, nearly smiles.', effects: [A(ASH, 2)] }],
      options: [
        { id: 'wayra.mikkel', text: 'Mikkel\'s?', next: 'mikkel' },
        bye,
      ],
    },
    again: {
      text: [
        { if: F('quiet'), text: '"He came in and held out his hands," Wayra says, astonished, still. "Arvid Brandvold. I gave her to him. He held her an hour and didn\'t say anything and gave her back." She looks down at the baby. "He comes every evening now."' },
        { if: F('truth'), text: '"Sigrun says I\'m to eat at the Ridge now." Wayra shakes her head. "Ridge on one side, Bottoms on the other, and me in the middle with the baby." She smiles. "Like a wedding nobody had."' },
        { text: 'Wayra glances up from the potatoes, and down again.' },
      ],
      again: 'Wayra, at the end of the table.',
      options: [
        { id: 'wayra.mikkel2', text: 'Mikkel\'s?', if: { not: { seen: 'wayra.mikkel' } }, next: 'mikkel' },
        bye,
      ],
    },
    mikkel: { text: '"Mikkel\'s." She peels. "We were going to tell his father at the midsummer fire. Then he was dead, and I was showing, and his father looked at me in the street like I was a hook on the wrong log." The knife stops. "Dorit lets me work for the board. My father pays the rest. I don\'t ask where he gets it." She starts peeling again. "I\'d rather not know."', again: '"I\'d rather not know."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_nw_dorit: DialogueDef = {
  id: 'd_nw_dorit', owner: 'npc_nw_11',
  start: [{ if: { flag: 'nw_dorit_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A dark-haired woman with her sleeves rolled at a range the size of a cart, stirring three pots at once. "Avraham. The cookhouse." She points with the spoon. "Ridge on the left, Bottoms on the right, and nobody in the middle. Eat, you look like the rain\'s been at you. The room upstairs is twenty-five a week, and dry, mostly."',
      again: 'Dorit, at the range.',
      effects: [{ set: 'nw_dorit_met' }],
      options: [
        { id: 'dorit.trade', text: '(Buy food.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dorit.room', text: 'The room.', next: 'room' },
        { id: 'dorit.wayra', text: 'The girl with the baby.', next: 'wayra' },
        bye,
      ],
    },
    again: {
      text: '"Eat," Dorit says, without turning round from the range.',
      again: 'Dorit, at the range.',
      options: [
        { id: 'dorit.trade2', text: '(Buy food.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dorit.room2', text: 'The room.', if: { not: { flag: 'nw_room_rented' } }, next: 'room' },
        { id: 'dorit.wayra2', text: 'The girl with the baby.', if: { not: { seen: 'dorit.wayra' } }, next: 'wayra' },
        bye,
      ],
    },
    room: {
      text: '"Twenty-five, the week. A bed, a locker with a key, a window on the Water, and you\'ll hear the mill all night." She shrugs. "You get used to it."',
      again: '"Twenty-five, the week."',
      options: [
        { id: 'dorit.room.pay', text: '(Pay twenty-five.)', if: TOLLS(25), effects: [{ take: 'tolls', count: 25 }, { set: 'nw_room_rented' }], next: 'rented' },
        { text: 'Not now.', next: 'again' },
      ],
    },
    rented: { text: 'She takes the money without counting it and gives you a key on a string. "Up the back stair. Don\'t bring your boots in."', again: 'The key on a string.', options: [{ text: 'Something else.', next: 'again' }] },
    wayra: {
      text: '"Wayra." She lowers her voice. "Mikkel Brandvold\'s girl, and his baby. She works for her board and Rufino pays the rest, every week, in Ridge money." She tastes the stew. "Don\'t ask me how I know it\'s Ridge money. Berit pays in marks, and I can count."',
      again: '"Ridge money. I can count."',
      effects: [{ lead: 'l_nw_baby' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_nw_room: DialogueDef = {
  id: 'd_nw_room', owner: 'narrator',
  start: [{ if: { flag: 'nw_room_rented' }, node: 'mine' }, { node: 'let' }],
  nodes: {
    let: { text: 'A bed under the cookhouse eaves, a locker, a window over the Water. Dorit\'s, to let.', again: 'Dorit\'s room, to let.', options: [leave] },
    mine: { text: 'Your room under the cookhouse eaves: the bed, the locker, the mill thudding through the floor, the rain on the shingles, and the boom\'s lamps on the Water.', again: 'Your room at Sawtown.', options: [{ id: 'room.rest', text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true, repeat: true }, leave] },
  },
};

// ---------------------------------------------------------------- the town as a place

export const d_nw_stump: DialogueDef = {
  id: 'd_nw_stump', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'On the boundary between the Ridge\'s ground and the flats, a stump as wide as a table, grey with two years\' weather, and beside it the split trunk, still lying where it came down, moss on it now. Somebody has driven a stake into the ground at its foot and tied a faded strip of cloth to it.',
      again: 'The stump on the boundary, the cloth on its stake.',
      interject: [{ companion: ILYA, if: { not: { lead: 'l_nw_stump' } }, text: 'Ilya walks round the stump once, and kneels at its uphill side. "Cut from here," he says. "The Ridge side. Back-cut too low. Hurried." He touches the split. "Wet wood. Rain." He stands up. "Nobody dropped this on him. He was under his own tree."', effects: [{ lead: 'l_nw_stump' }, A(ILYA, 2)] }],
      options: [
        { id: 'stump.read', text: '(Read the stump.)', if: { not: { lead: 'l_nw_stump' } }, check: { skill: 'survival', dc: 40 }, effects: [{ lead: 'l_nw_stump' }], next: 'read', fail: 'wood' },
        leave,
      ],
    },
    read: { text: 'The face cut on the uphill side, the Ridge\'s side; the back-cut far too low under it, the hinge too thin; and the trunk split up its middle where it went over, the way a tree splits when it is felled leaning wrong in wet weather by someone in a hurry. Nobody on the flats felled this. It came back over its own stump onto whoever was standing at it.', again: 'A barber chair, felled from the Ridge.', options: [leave] },
    wood: { text: 'A stump, a split trunk, two years of moss. You are not a faller.', again: 'A stump.', options: [leave] },
  },
};

export const d_nw_skid: DialogueDef = {
  id: 'd_nw_skid', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'nw_bottoms_gone' }, text: 'Where the Bottoms\' skid camp stood: a black square on the shore, the shed\'s iron roof crumpled in the ash, a child\'s shoe, and the tents\' poles standing in a row with nothing on them.' },
        { text: 'The Bottoms\' skid camp: a shed of scrap iron and tarp full of old oil and dry timber, tents in a row on the shore, a fire, and children\'s washing. A hook painted on the shed door, very large.' },
      ],
      again: 'The Bottoms\' camp.',
      options: [leave],
    },
  },
};

export const d_nw_saw: DialogueDef = {
  id: 'd_nw_saw', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'nw_river', eq: 'even' }, text: 'The great saw in the mill, running fast on a race that comes in full and loud now, the turbine under the floor singing. The mill hands say the Water has never run so steady.' },
        { text: 'The great saw in the mill: a pre-war band saw the height of a house, driven off a turbine under the floor by the race from the lake. It runs slow. "Race is half what it should be," a mill hand shouts over it. "The dam keeps the Water low, and the city keeps the dam."' },
      ],
      again: 'The great saw.',
      options: [leave],
    },
  },
};

export const d_nw_drive: DialogueDef = {
  id: 'd_nw_drive', owner: 'narrator', start: [{ if: { hour: { from: 6, to: 18 } }, node: 'drive' }, { node: 'night' }],
  nodes: {
    drive: {
      text: 'The drive: where the race comes out under the mill, logs that have been through the saw\'s pen go out down a chute into the Water in a long rush, and the young ones ride them, standing, from the chute\'s foot to the boom, for a bet. Twenty Tolls to anyone who rides one all the way in without going under.',
      again: 'The drive, logs going out down the chute.',
      options: [
        { id: 'drive.ride', text: '(Ride a log down the drive. 20 Tolls if you stay up.)', check: { attr: 'reflex', dc: 7 }, effects: [{ time: 60 }, { give: 'tolls', count: 20 }, { inc: 'nw_drives' }], failEffects: [{ time: 60 }, { give: 'tolls', count: 5 }], next: 'up', fail: 'under', repeat: true },
        leave,
      ],
    },
    up: { speaker: 'narrator', text: 'Down the chute, the log rolling under your boots, the Water coming up white, a moment of flying, and you stay up all the way into the boom with your arms out like a fool and the whole bank cheering. Berit pays the bet out of the boom\'s tin without comment.', again: 'Up all the way in.', options: [leave] },
    under: { speaker: 'narrator', text: 'Halfway down, the log rolls, and you do not. The Water is colder than anything you have ever felt. They fish you out with a pike pole, and give you five for the entertainment.', again: 'Under, halfway down.', options: [leave] },
    night: { text: 'The drive\'s chute, still, the race running under the mill in the dark.', again: 'The drive, still.', options: [leave] },
  },
};

export const SAWTOWN_DIALOGUES: DialogueDef[] = [d_nw_notice, d_nw_berit, d_nw_tally, d_nw_pen, d_nw_punt, d_nw_sigrun, d_nw_arvid, d_nw_cillian, d_nw_rufino, d_nw_wayra, d_nw_dorit, d_nw_room, d_nw_stump, d_nw_skid, d_nw_saw, d_nw_drive];
