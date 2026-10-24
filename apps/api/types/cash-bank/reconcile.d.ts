import type { Db } from '../db';
/**
 * Manual bank reconciliation of one book entry (a sales receipt into a cash/bank account): Accurate creates the
 * rekening-koran line from the book entry and marks both reconciled (docs/reports/BankReconcileBookToStatementReport.md).
 */
export declare function reconcileBankEntry(db: Db, r: {
    bank: string;
    document: string;
    statementDate: string;
    statementDescription: string;
    by: string; /** day the reconciliation was done (default now) */
    reconciledAt?: string;
}): Promise<void>;
