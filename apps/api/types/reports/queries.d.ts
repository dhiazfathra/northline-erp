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
