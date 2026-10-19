import type { StatementLine } from './financial-statements';
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
/** `otherIncome`: Pendapatan Non Operasional; `purchases`: net purchase invoices (less returns) of the period. */
export interface PlTotals {
    revenue: number;
    cogs: number;
    operating: number;
    net: number;
    otherIncome: number;
    purchases: number;
}
/** One ratio column: balances at the start and end of the period, P&L for the period. */
export interface RatioInput {
    start: BsTotals;
    end: BsTotals;
    pl: PlTotals;
}
/** `current` and `previous` are the report period and the one before it (previous month, or previous year). */
export declare function financialRatios(current: RatioInput, previous: RatioInput, monthly: boolean): string[][];
/** Totals from our own Neraca (Standar) lines, in rupiah. */
export declare const bsTotals: (l: StatementLine[]) => BsTotals;
/** Totals from our own Laba/Rugi (Standar) lines, in rupiah. */
export declare const plTotals: (l: StatementLine[], purchases?: number) => PlTotals;
/** Per period end: Total Aset, Total Kewajiban, Harta Bersih (Grafik Harta Bersih). */
export declare const netWorthChart: (ends: BsTotals[]) => {
    'Total Aset': string[];
    'Total Kewajiban': string[];
    'Harta Bersih': string[];
};
/** Grafik Rasio Likuiditas: cash and trade payables at each period end. */
export declare const liquidityChart: (ends: BsTotals[]) => {
    'Kas & Bank': string[];
    'Utang Usaha': string[];
};
/** Grafik Pengembalian Aset: the period's net income beside closing assets. */
export declare const returnOnAssetChart: (ends: BsTotals[], pls: PlTotals[]) => {
    'Laba/Rugi': string[];
    'Total Aset': string[];
};
/** Grafik Pengembalian pada Modal: the period's net income beside closing equity. */
export declare const returnOnEquityChart: (ends: BsTotals[], pls: PlTotals[]) => {
    'Laba/Rugi': string[];
    'Harta Bersih': string[];
};
/** Grafik Pendapatan berbanding Biaya: per period, revenue (incl. other income) and costs (COGS, expenses, other expenses). */
export declare const revenueVsExpenseChart: (pls: {
    revenue: number;
    expense: number;
}[]) => {
    'Total Pendapatan': string[];
    'Total Biaya': string[];
};
/**
 * Fokus Keuangan (docs/reports/FinancialFocusReport.md), this year vs last from statement totals at 31 Dec and the year's
 * P&L. Penambahan (%) = (this - last) / last x 100 (signed denominator: 750.000 vs -250.000,5 prints -400), 2 decimals,
 * on unrounded values; when last is 0: 100, or 0 if this is 0 too. Total Pendapatan includes Pendapatan Non Operasional,
 * and Rasio Lancar is 100 with no current liabilities (Trade Portal 2045).
 */
export declare function financialFocus(end: BsTotals, prevEnd: BsTotals, pl: PlTotals, prevPl: PlTotals): string[][];
