import { type ReturnInput } from '@northline/schemas/sales';
import type { Db } from '../db';
export declare function createSalesReturn(db: Db, input: ReturnInput): Promise<{
    number: string;
}>;
export declare function createPurchaseReturn(db: Db, input: ReturnInput): Promise<{
    number: string;
}>;
