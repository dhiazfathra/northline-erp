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
/** Rekening Koran: statement lines of one bank (only lines created by manual reconciliation exist); empty header when none. */
export declare function bankStatement(rs?: Reconciliation[], bank?: {
    no: string;
    name: string;
}, from?: string, to?: string): string[][];
/**
 * Giro Mundur (Belum Jatuh Tempo) (docs/reports/OutstandingChequeReport.md): cheque receipts whose cheque date is after
 * the as-of date, per selected bank account (name order). The transaction date does not matter: a cheque received
 * on 30 Nov shows as of 29 Nov too. Terima = received amount; Bayar (cheque payments) is not modelled.
 */
export interface Cheque {
    customer: string;
    bank: string;
    bankName: string;
    date: string;
    chequeDate: string;
    chequeNo: string;
    party: string;
    amount: number;
}
export declare function outstandingCheques(cheques: Cheque[], banks: string[], asOf: string): string[][];
export interface Reconciliation {
    bank: string;
    bankName: string;
    docDate: string;
    docType: string;
    docNumber: string;
    side: 'Dr' | 'Cr';
    amount: number;
    docDescription: string;
    statementDate: string;
    statementDescription: string;
    by: string;
    reconciledAt?: string;
    party?: string;
}
/** Rekonsiliasi Bank (Jurnal terhadap Rekening Koran): reconciled book entries dated in range, per bank, with their statement line. */
export declare const reconcileBookToStatement: (rs: Reconciliation[], banks: string[], from: string, to: string) => string[][];
/** Rekonsiliasi Bank (Rekening Koran terhadap Jurnal): the same pairs, statement side first. */
export declare const reconcileStatementToBook: (rs: Reconciliation[], banks: string[], from: string, to: string) => string[][];
/**
 * Transaksi Bank Terekonsiliasi (docs/reports/ReconciledBankReport.md): per bank, entries grouped under the day they were
 * reconciled, the window filtering on that day (not the transaction or statement date). Referensi = the party.
 */
export declare function reconciledBank(rs: Reconciliation[], bank: {
    no: string;
    name: string;
}, from: string, to: string): string[][];
