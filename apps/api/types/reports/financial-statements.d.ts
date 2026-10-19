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
/**
 * Neraca (Induk Skontro): the standard Neraca rows in two columns, ASET on the left and LIABILITAS DAN EKUITAS on the
 * right, zipped row by row. Each side keeps Accurate's blank spacer rows (after a "Jumlah ..." row unless the next row is
 * another "Jumlah ..."), which decide the pairing; rows blank on both sides drop out (docs/reports/BalanceSheetParentScontroReport.md).
 */
export declare function skontro(standardRows: string[][]): string[][];
/**
 * Grafik Perbandingan Nilai Akun (unlabeled line chart, ADR-0011): one point per month with profit-and-loss activity,
 * value = sum over revenue/expense accounts of |net movement in the month| (Feb 2031: revenue 2.000.000 + expense
 * 1.000.000 = 3.000.000). Same movements the Laba/Rugi reports verify.
 */
export declare function accountValueCompareChart(accounts: TbAccount[], balances: DailyBalance[], from: string, to: string): {
    month: string;
    value: number;
}[];
