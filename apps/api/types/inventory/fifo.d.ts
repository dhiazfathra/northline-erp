import type { Tx } from '../db';
export interface Layer {
    date: string;
    qty: number;
    unitCost: number;
}
export type CostingMethod = 'FIFO' | 'AVERAGE';
/** Remaining layers from movements in (date, id) order. AVERAGE (moving average, ADR-0031) keeps one layer at
 * (value on hand) / (qty on hand); outbound moves carry their booked cost, so the value nets exactly. */
export declare function layers(moves: {
    date: string;
    quantity: number;
    value: number;
}[], method?: CostingMethod): Layer[];
/** Cost (cents) of taking `qty` from the layers, oldest first; rounded per layer to whole cents. */
export declare function fifoCost(ls: Layer[], qty: number): number;
/** Cost (cents) of taking `qty` out. FIFO: whole cents per layer. AVERAGE: exact (fractions of a cent kept on the
 * stock move, as Accurate does); journals post Math.round of it. */
export declare function costOut(ls: Layer[], qty: number, method: CostingMethod): number;
export declare function costingMethod(tx: Tx): Promise<CostingMethod>;
/** Accurate allows a method change only before any stock movement; history is never re-costed. */
export declare function setCostingMethod(tx: Tx, method: CostingMethod): Promise<void>;
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
