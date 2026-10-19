import { type ReturnInput } from '@northline/schemas/sales';
import type { Db, Tx } from '../db';
export declare function createSalesReturn(db: Db | Tx, input: ReturnInput): Promise<{
    number: string;
}>;
export declare function deleteSalesReturn(db: Db, number: string, idempotencyKey: string): Promise<{
    number: string;
}>;
/** Edited in place under the same number, as Accurate does: taken back and saved again. */
export declare function editSalesReturn(db: Db, number: string, input: ReturnInput): Promise<{
    number: string;
}>;
export declare function createPurchaseReturn(db: Db | Tx, input: ReturnInput): Promise<{
    number: string;
}>;
export declare function deletePurchaseReturn(db: Db, number: string, idempotencyKey: string): Promise<{
    number: string;
}>;
/** Edited in place under the same number, as Accurate does: taken back and saved again. */
export declare function editPurchaseReturn(db: Db, number: string, input: ReturnInput): Promise<{
    number: string;
}>;
