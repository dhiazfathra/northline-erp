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
export {};
