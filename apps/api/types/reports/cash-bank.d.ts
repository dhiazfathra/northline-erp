import { type Journal } from './general-ledger';
import { type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance';
/** Histori Bank: one block per selected cash account with opening, lines and running balance. */
export declare function bankBook(accounts: TbAccount[], balances: DailyBalance[], journals: Journal[], banks: string[], from: string, to: string): string[][];
/**
 * Arus Kas per Akun: for each selected cash account, its movements grouped by counter-account (in order of first
 * appearance), each line valued at the cash effect, a subtotal per counter-account and a total per cash account.
 */
export declare function cashFlowByAccount(accounts: TbAccount[], journals: Journal[], banks: string[], from: string, to: string): string[][];
/** Daftar Kas: every CASH_BANK account (zero included, parents summed) under its currency, then the currency total over leaves. */
export declare function cashAccountList(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, asOf: string): string[][];
