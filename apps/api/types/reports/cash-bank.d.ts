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
export interface CashDoc {
    number: string;
    kind: 'PAY' | 'DEP';
    bank: string;
    bankName: string;
    date: string;
    chequeNo: string;
    description: string;
    amount: number;
    lines: {
        account: string;
        accountName: string;
        amount: number;
        notes: string;
    }[];
}
/** Ringkasan Daftar Pembayaran / Penerimaan; empty cheque numbers print nothing. */
export declare const cashDocList: (ds: CashDoc[], kind: 'PAY' | 'DEP', from: string, to: string) => string[][];
/** Ringkasan Pembayaran/Penerimaan per Bank: per bank, totals per counter-account (by name). */
export declare function cashByBankSummary(ds: CashDoc[], kind: 'PAY' | 'DEP', banks: string[], from: string, to: string): string[][];
/** Rincian Pembayaran/Penerimaan per Bank: per bank and counter-account, the lines. Payments show the line notes,
 *  deposits the account code and name. */
export declare function cashByBankDetail(ds: CashDoc[], kind: 'PAY' | 'DEP', banks: string[], from: string, to: string): string[][];
/** Rincian Beban Pembayaran: one block per payment. */
export declare const paymentLoad: (ds: CashDoc[], banks: string[], from: string, to: string) => string[][];
/** Transaksi Bank belum Terekonsiliasi: per bank, all unreconciled Pembayaran/Penerimaan under "Histori Bank".
 *  shortcut: covers cash documents only; receipts/payments of invoices and bank reconciliation are not modelled yet. */
export declare function unreconciledBank(ds: CashDoc[], accounts: TbAccount[], banks: string[], from: string, to: string): string[][];
/** Rekening Koran: imported bank statements are not modelled; prints the empty header (verified when no statement exists). */
export declare const bankStatement: () => string[][];
