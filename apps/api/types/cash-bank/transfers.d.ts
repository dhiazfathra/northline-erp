import type { Db, Tx } from '../db';
type TransferInput = {
    idempotencyKey: string;
    number?: string;
    date: string;
    from?: string;
    to?: string;
    amount?: number;
    description?: string;
};
export declare function createBankTransfer(db: Db | Tx, d: TransferInput): Promise<{
    number: string;
}>;
export declare function deleteBankTransfer(db: Db, number: string, key: string): Promise<{
    number: string;
}>;
/** Edited in place under the same number. */
export declare function editBankTransfer(db: Db, number: string, d: TransferInput): Promise<{
    number: string;
}>;
export {};
