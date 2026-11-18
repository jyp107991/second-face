export interface Verdict { set?: string; measures?: string; date?: string; byMeasure?: Record<string, number> }
export interface RatchetSpec { aliases?: Record<string, string>; remeasured?: Record<string, string> }
export declare const setOf: (k: string) => string;
export declare function fold(byMeasure: Record<string, number> | undefined, aliases?: Record<string, string>): Record<string, number>;
export declare function worse(before: Verdict | null | undefined, verdict: Verdict | null | undefined, spec?: RatchetSpec): { key: string; was: number; now: number }[];
export interface Waiver { key: string; before: number; after: number; cause: string; fix: string; since: string }
export declare function totals(folded: Record<string, number>, sets?: Set<string> | null): { all: number; everyday: number };
export declare function judge(before: Verdict | null | undefined, verdict: Verdict | null | undefined, spec?: RatchetSpec, waivers?: Waiver[], history?: string[]): { problems: string[]; worse: { key: string; was: number; now: number }[]; totals: { before: { all: number; everyday: number }; now: { all: number; everyday: number } } };
