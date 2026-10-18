import type { BalanceSheetQuery, TrialBalanceQuery } from '@northline/schemas/ledger-es';
import type { Db } from '../db';
import { type Journal } from './general-ledger';
export declare function queryTrialBalance(db: Db, q: TrialBalanceQuery): Promise<{
    no: string;
    name: string;
    depth: number;
    isParent: boolean;
    openingDebit: number;
    openingCredit: number;
    debit: number;
    credit: number;
    closingDebit: number;
    closingCredit: number;
}[]>;
export declare function queryProfitLoss(db: Db, q: TrialBalanceQuery): Promise<import("./financial-statements").StatementLine[]>;
export declare function queryBalanceSheet(db: Db, q: BalanceSheetQuery): Promise<import("./financial-statements").StatementLine[]>;
export declare function loadJournals(db: Db, from: string, to: string): Promise<Journal[]>;
export type GlReport = 'journal-list' | 'all-journals' | 'history' | 'summary' | 'detail' | 'account-journal-detail' | 'account-list';
export declare function queryGeneralLedger(db: Db, report: GlReport, q: TrialBalanceQuery): Promise<string[][]>;
export declare function queryRetainedEarnings(db: Db, year: number): Promise<string[][]>;
export declare function queryOwnerEquityChange(db: Db, q: TrialBalanceQuery): Promise<string[][]>;
export type CashFlowReport = 'direct' | 'indirect' | 'indirect-detail';
/** `monthly` splits [from, to] into calendar-month columns (the Multi Period variants). */
export declare function queryCashFlow(db: Db, report: CashFlowReport, q: TrialBalanceQuery, monthly?: boolean): Promise<string[][]>;
/** Rasio Keuangan: `month` given → per month (vs previous month), else per year (vs previous year). */
export declare function queryFinancialRatios(db: Db, year: number, month?: number): Promise<string[][]>;
export declare function queryBankBook(db: Db, banks: string[], q: TrialBalanceQuery): Promise<string[][]>;
export declare function queryCashFlowByAccount(db: Db, banks: string[], q: TrialBalanceQuery): Promise<string[][]>;
export declare function queryCashAccountList(db: Db, asOf: string): Promise<string[][]>;
export declare function loadSales(db: Db): Promise<import('./receivables').SalesData>;
/** Purchases in the shape the shared receivable/payable report functions use (parties = vendors, AP labels). */
export declare function loadPurchases(db: Db): Promise<import('./receivables').SalesData>;
export declare function loadInventory(db: Db): Promise<import('./inventory').InventoryData>;
/** FIFO cost of goods per sales invoice (cents), from stock_moves. */
export declare function cogsByInvoice(db: Db): Promise<(invoice: string) => number>;
