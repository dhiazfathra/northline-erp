import { type DailyBalance, type TbAccount } from './trial-balance';
import type { Journal } from './general-ledger';
export interface Period {
    from: string;
    to: string;
}
type Row = [string, ...number[]] | [string];
export declare function cashFlowIndirect(accounts: TbAccount[], balances: DailyBalance[], periods: Period[]): Row[];
/** Rincian Arus Kas (Tak Langsung): the indirect method with account rows instead of type rows. */
export declare function cashFlowIndirectDetail(accounts: TbAccount[], balances: DailyBalance[], periods: Period[]): Row[];
/**
 * Direct method: only journals with a cash line count; each non-cash line contributes −(D − C) to its account.
 * Accruals without a cash line never appear.
 */
export declare function cashFlowDirect(accounts: TbAccount[], balances: DailyBalance[], journals: Journal[], periods: Period[]): Row[];
/** Printed table: header (`Nilai`, or `Des 2030 | Jan 2031 …` for multi-period) then formatted rows. */
export declare function formatCashFlow(rows: Row[], periods: Period[]): string[][];
/** Sandbox-wide inputs the ERP does not hold: opening cash and cheque clearings per column (docs/reports/CashProjectionReport.md). */
export interface CashProjectionBase {
    opening: number;
    chequesIn: number[];
    chequesOut: number[];
}
/**
 * Proyeksi Kas per Bulan: five columns from today (today..end of month, then four calendar months). Piutang / Utang Jatuh
 * Tempo = open invoice balances bucketed by due date; each column's Saldo Kas is the previous column's
 * Perkiraan Lebih/Kurang Kas = Saldo + Total Sumber - Total Penggunaan.
 */
export declare function cashProjection(today: string, base: CashProjectionBase, receivables: {
    due: string;
    owing: number;
}[], payables: {
    due: string;
    owing: number;
}[]): string[][];
/**
 * Proyeksi Ketersediaan Kas (chart): points where projected cash changes. Future points are open receivables (+) and
 * payables (-) by due date in [from, to], the same items Proyeksi Kas per Bulan buckets by month (ADR-0011).
 */
export declare function cashAvailabilityEvents(receivables: {
    due: string;
    owing: number;
}[], payables: {
    due: string;
    owing: number;
}[], from: string, to: string): {
    date: string;
    delta: number;
}[];
export {};
