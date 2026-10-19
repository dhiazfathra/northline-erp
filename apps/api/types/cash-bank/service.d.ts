import type { Db, Tx } from '../db';
type CashDocument = {
    idempotencyKey: string;
    kind: 'PAY' | 'DEP';
    number?: string;
    bank: string;
    date: string;
    chequeNo?: string;
    description?: string;
    lines: {
        account: string;
        amount: number;
        notes?: string;
    }[];
};
export declare function createCashDocument(db: Db | Tx, d: CashDocument): Promise<{
    number: string;
}>;
export declare function deleteCashDocument(db: Db, number: string, idempotencyKey: string): Promise<{
    number: string;
}>;
/** Accurate edits in place: the old document is taken back and the new content saved under the same number. */
export declare function editCashDocument(db: Db, number: string, d: CashDocument): Promise<{
    number: string;
}>;
export declare function createExpenseAccrual(db: Db, d: {
    idempotencyKey: string;
    number?: string;
    date: string;
    dueDate: string;
    description?: string;
    payableAccount: string;
    lines: {
        account: string;
        amount: number;
    }[];
}): Promise<{
    number: string;
}>;
export {};
