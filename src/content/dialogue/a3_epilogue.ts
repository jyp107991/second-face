import type { DialogueDef } from '../../engine/dialogue/dialogue';
import { epilogueTree, type SlideSpec } from './a3_epilogue_kit';
import { SLIDES_OPEN } from './a3_epilogue_open';

/**
 * The epilogue (B6s): one narrator tree, `d_a3_epilogue`, opened by each end's climax (B6r) once `a3_end` is set, built
 * from the slides below by `epilogueTree()` (`a3_epilogue_kit.ts`, which says how it runs). Each slice adds its slides as data
 * in its own file and one spread line here; the builder puts them in EP_SLIDES order (a3_conds.ts), so the order of the
 * spreads does not matter. B6s: slides 1–6 (`a3_epilogue_open.ts`). B6t (7–12), B6u (13–19) and B6v (20–27) follow.
 * Story notes: story/B6_NOTES_SECRET.md §6 and "As built" → B6s.
 */
export const EP_SPECS: SlideSpec[] = [
  ...SLIDES_OPEN,
];

/** The closing page, after the last slide (or a skip): its one option rolls the credits, then the title. */
export const EP_CLOSE = 'That is how it went, as near as anyone can tell it.';

export const d_a3_epilogue: DialogueDef = epilogueTree(EP_SPECS, EP_CLOSE);

export const A3_EPILOGUE_DIALOGUES: DialogueDef[] = [d_a3_epilogue];
