export interface BsTotals {
    cash: number;
    receivable: number;
    inventory: number;
    currentAssets: number;
    fixedAssets: number;
    assets: number;
    payable: number;
    currentLiabilities: number;
    longTermLiabilities: number;
    equity: number;
}
export interface PlTotals {
    revenue: number;
    cogs: number;
    operating: number;
    net: number;
}
/** One ratio column: balances at the start and end of the period, P&L for the period. */
export interface RatioInput {
    start: BsTotals;
    end: BsTotals;
    pl: PlTotals;
}
/** `current` and `previous` are the report period and the one before it (previous month, or previous year). */
export declare function financialRatios(current: RatioInput, previous: RatioInput, monthly: boolean): string[][];
import type { StatementLine } from './financial-statements';
/** Totals from our own Neraca (Standar) lines, in rupiah. */
export declare const bsTotals: (l: StatementLine[]) => BsTotals;
/** Totals from our own Laba/Rugi (Standar) lines, in rupiah. */
export declare const plTotals: (l: StatementLine[]) => PlTotals;
