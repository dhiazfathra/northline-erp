import { type DailyBalance, type TbAccount } from './trial-balance';
import type { Journal } from './general-ledger';
export declare function cashFlowIndirect(accounts: TbAccount[], balances: DailyBalance[], from: string, to: string): string[][];
/**
 * Direct method: only journals that move cash count; each non-cash line contributes its cash effect −(D − C),
 * listed under its account. Accruals without a cash line (fixture J6) never appear.
 */
export declare function cashFlowDirect(accounts: TbAccount[], balances: DailyBalance[], journals: Journal[], from: string, to: string): string[][];
