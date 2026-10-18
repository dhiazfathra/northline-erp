import type { Tx } from '../db';
export interface Layer {
    date: string;
    qty: number;
    unitCost: number;
}
/** Remaining FIFO layers from movements in (date, id) order. */
export declare function layers(moves: {
    date: string;
    quantity: number;
    value: number;
}[]): Layer[];
/** Cost (cents) of taking `qty` from the layers, oldest first; rounded per layer to whole cents. */
export declare function fifoCost(ls: Layer[], qty: number): number;
export declare function loadMoves(tx: Tx, item: string, upTo: string): Promise<{
    date: string;
    quantity: number;
    value: number;
}[]>;
export declare function addMove(tx: Tx, m: {
    item: string;
    date: string;
    docType: string;
    docNumber: string;
    description: string;
    quantity: number;
    value: number;
    warehouse?: string;
}): Promise<void>;
