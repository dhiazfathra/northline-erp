import { type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance';
/** Assumes a January fiscal year (the only start verified against Accurate). */
export declare function retainedEarnings(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, year: number): string[][];
export declare function ownerEquityChange(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, from: string, to: string): string[][];
