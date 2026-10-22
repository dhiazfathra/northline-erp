import type { Db } from '../db';
/** OUT = PPN Keluaran (sales invoices), IN = PPN Masukan (purchase invoices). */
export interface TaxLine {
    side: 'OUT' | 'IN';
    number: string;
    date: string;
    taxDate: string;
    taxNumber: string;
    tax: string;
    rate: number;
    amount: number;
    /** party name, tax document code (DIGUNGGUNG / CTAS_INVOICE), transaction type, reported in an SPT Masa */
    party?: string;
    documentCode?: string;
    taxType?: string;
    reported?: boolean;
}
export declare function loadTaxLines(db: Db): Promise<TaxLine[]>;
/** A posting on a tax account that is not a tax line of a taxed invoice ("Transaksi Lainnya"); amount on the tax side's sign. */
export interface TaxAccountPosting {
    date: string;
    number: string;
    taxNumber: string;
    kind: string;
    amount: number;
}
/** One section per tax account: its name, balance before `from`, the taxes posting to it, and its other postings. */
export interface TaxSection {
    title: string;
    opening: number;
    taxes: string[];
    others: TaxAccountPosting[];
}
/** Daftar PPN/PPnBM Keluaran / Masukan by tax account (rules: docs/reports/TaxationOutReport.md, Trade Portal variation). */
export declare function taxationListBySection(lines: TaxLine[], side: 'OUT' | 'IN', from: string, to: string, sections: TaxSection[]): string[][];
/** Sections from the ledger: each tax's sales (OUT) or purchase (IN) account; opening and other postings signed credit − debit for OUT, debit − credit for IN. */
export declare function loadTaxSections(db: Db, side: 'OUT' | 'IN', from: string): Promise<TaxSection[]>;
export declare const taxationOut: (lines: TaxLine[], from: string, to: string) => string[][];
export declare const taxationIn: (lines: TaxLine[], from: string, to: string) => string[][];
/**
 * Rekonsiliasi PPN Lebih/Kurang Bayar: Keluaran − Masukan over tax-account sections (Masukan = purchase accounts, Keluaran =
 * sales accounts). Accurate streams entries and prints a side heading ("Pajak Masukan"/"Pajak Keluaran") whenever the side
 * changes and an account heading whenever the account changes, closing each run with its own totals:
 *   1. every account's Saldo Awal (Masukan accounts, then Keluaran), each followed by its sales-invoice Transaksi Lainnya;
 *   2. per tax (name order) its Keluaran block, then its Masukan block;
 *   3. the remaining Transaksi Lainnya, Masukan accounts then Keluaran, in a run of their own (headings repeat).
 * Masukan amounts print positive per row, negative in totals. Verified: Manufaktur Demo (one tax, both sides) and Trade Portal
 * Demo (two accounts per side, JV/PI/SI postings; fixtures/trade/trade-tp.json `tax`).
 */
export declare function taxationInOutBySection(lines: TaxLine[], from: string, to: string, sections: {
    IN: TaxSection[];
    OUT: TaxSection[];
}): string[][];
/** One account per side (named PPN Masukan / PPN Keluaran) built from tax lines only. */
export declare function taxationInOut(lines: TaxLine[], from: string, to: string): string[][];
export declare const salesInvoiceSpt: (lines: TaxLine[], from: string, to: string) => string[][];
export declare const purchaseInvoiceSpt: (lines: TaxLine[], from: string, to: string) => string[][];
