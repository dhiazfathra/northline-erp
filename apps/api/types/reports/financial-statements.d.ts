import { type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance';
export declare const MONTHS: string[];
export interface StatementLine {
    label: string;
    amount?: number;
    kind: 'heading' | 'account' | 'total';
}
export interface StatementOptions {
    showZeroBalance: boolean;
    showParentAccount: boolean;
}
export declare function profitLoss(accounts: TbAccount[], balances: DailyBalance[], from: string, to: string, o: StatementOptions): StatementLine[];
export declare function balanceSheet(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, asOf: string, o: StatementOptions): StatementLine[];
export declare const formatLine: (l: StatementLine) => string[];
/** Column header: `1 - 28 Feb 2031`, `1 Jan - 28 Feb 2031`, `1 Des 2030 - 31 Jan 2031`. */
export declare function periodLabel(from: string, to: string): string;
export interface MultiLine {
    label: string;
    kind: StatementLine['kind'];
    amounts: number[];
}
/** Builds each column with zero rows kept (so lines align), then hides account rows that are zero in every column. */
export declare function mergeColumns(columns: StatementLine[][], o: StatementOptions, total?: boolean): MultiLine[];
export declare function months(startYear: number, startMonth: number, endYear: number, endMonth: number): {
    from: string;
    to: string;
    label: string;
}[];
export declare function profitLossColumns(accounts: TbAccount[], balances: DailyBalance[], periods: {
    from: string;
    to: string;
}[], o: StatementOptions): MultiLine[];
export declare function balanceSheetColumns(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, dates: string[], o: StatementOptions): MultiLine[];
/** Perbandingan Periode: base, compare, variance (compare − base) and % of |base| (100 % when base is 0 and variance is not). */
export declare function compareColumns(base: StatementLine[], cmp: StatementLine[], o: StatementOptions): (MultiLine & {
    pct: (number | null)[];
})[];
export declare const formatMulti: (l: MultiLine & {
    pct?: (number | null)[];
}) => string[];
/** Kuartal columns of a calendar year (fiscal quarters unverified). */
export declare const quarters: (y: number) => {
    from: string;
    to: string;
    label: string;
}[];
export declare const perDateEn: (iso: string) => string;
