export interface Verdict { set?: string; measures?: string; date?: string; byMeasure?: Record<string, number> }
export interface RatchetSpec { aliases?: Record<string, string>; remeasured?: Record<string, string> }
export declare const setOf: (k: string) => string;
export declare function fold(byMeasure: Record<string, number> | undefined, aliases?: Record<string, string>): Record<string, number>;
export declare function worse(before: Verdict | null | undefined, verdict: Verdict | null | undefined, spec?: RatchetSpec): { key: string; was: number; now: number }[];
