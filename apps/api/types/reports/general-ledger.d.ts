import { type AccountType, type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance';
export interface Journal {
    number: string;
    date: string;
    description: string;
    lines: {
        account: string;
        debit: number;
        credit: number;
        memo: string | null;
    }[];
}
export declare const fmtDate: (iso: string) => string;
/** Jurnal Umum: one row per journal; Nilai = total debit. */
export declare function journalList(journals: Journal[]): string[][];
/** Keseluruhan Jurnal: a block per journal with its lines and totals. */
export declare function allJournals(journals: Journal[], accounts: TbAccount[]): string[][];
/** Histori Buku Besar: lines grouped under a date row. */
export declare function glHistory(journals: Journal[], accounts: TbAccount[]): string[][];
/** Ringkasan Buku Besar: trial balance with normalized single-column opening/closing. */
export declare function glSummary(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, from: string, to: string, showZeroBalance: boolean): string[][];
/** Rincian Buku Besar: per account with transactions, opening "Saldo per" row, lines with running balance, totals. */
export declare function glDetail(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, journals: Journal[], from: string, to: string): string[][];
export declare const ACCOUNT_TYPE_LABEL: Record<AccountType, string>;
/** Rincian Jurnal Akun: per account with lines in range, each line's normalized amount, then the block total. */
export declare function journalDetailList(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, journals: Journal[], from: string, to: string): string[][];
/** Daftar Akun Perkiraan: every account (zero included) with its normalized balance at `asOf`. */
export declare function glAccountList(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, asOf: string): string[][];
