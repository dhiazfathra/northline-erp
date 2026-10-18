import type { Db } from '../db';
export declare function createCashDocument(db: Db, d: {
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
}): Promise<{
    number: string;
}>;
