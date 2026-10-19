import type { Db } from '../db';
export interface TransferOrder {
    number: string;
    date: string;
    bank: string;
    method: string;
    status: string;
    paid: number;
}
export declare function loadTransferOrders(db: Db): Promise<TransferOrder[]>;
/** One row per payment order dated in range; Faktur Dibayar is the sum of its invoice payments. */
export declare function transferOrderList(orders: TransferOrder[], from: string, to: string): string[][];
