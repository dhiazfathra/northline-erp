import type { Db } from '../db';
export interface JobLine {
    kind: 'ITEM' | 'EXPENSE';
    code: string;
    name: string;
    unit: string;
    qty: number;
    amount: number;
}
export interface Adjustment {
    number: string;
    date: string;
    type: 'ITEM_PICK' | 'ITEM_RETURN';
    description: string;
    lines: {
        item: string;
        name: string;
        unit: string;
        qty: number;
        amount: number;
    }[];
}
export interface Job {
    number: string;
    date: string;
    description: string;
    total: number;
    lines: JobLine[];
    customer: string;
    adjustments: Adjustment[];
    rollOver?: {
        number: string;
        date: string;
        type: 'ITEM' | 'ACCOUNT';
        description: string;
        lines: {
            item: string;
            name: string;
            unit: string;
            qty: number;
            portion: number;
            amount: number;
        }[];
    };
    journal: {
        account: string;
        name: string;
        debit: number;
        credit: number;
    }[];
}
export declare function loadJobs(db: Db): Promise<Job[]>;
/** Bahan dan Biaya Pekerjaan per Bulan: materials (by item name) and expenses (by expense name, quantity 1) of job orders dated in range. */
export declare function jobCostingByMonth(jobs: Job[], from: string, to: string): string[][];
/** Penyelesaian Barang/Biaya per Bulan: finished items of roll-overs dated in range, at their allocated value. */
export declare function finishedJobCostByMonth(jobs: Job[], from: string, to: string): string[][];
/** Histori Pekerjaan Pesanan: one block (one page) per job order dated in range; expense lines, then materials, then the finished items. */
export declare function jobCostingHistory(jobs: Job[], from: string, to: string): string[][];
/** Rincian Jurnal Pekerjaan Pesanan: every job order's journal (no date parameter), lines in posting order, then the debit/credit totals twice. */
export declare function jobCostingJournalDetail(jobs: Job[]): string[][];
/** Job total with its material picks added and returns taken back. */
export declare const jobTotal: (j: Job) => number;
/** Daftar Pekerjaan Pesanan: job orders dated in range; Total includes material picks/returns. */
export declare function jobOrderList(jobs: Job[], from: string, to: string): string[][];
/** Daftar Penambahan Bahan Baku: one row per adjustment dated in range. */
export declare function materialAdjustmentList(jobs: Job[], from: string, to: string): string[][];
/** Rincian Penambahan Bahan Baku: one block per adjustment (quantities unsigned, no cost). */
export declare function materialAdjustmentDetail(jobs: Job[], from: string, to: string): string[][];
/** Daftar Penyelesaian Pesanan: one row per roll-over dated in range. */
export declare function rollOverList(jobs: Job[], from: string, to: string): string[][];
/** Rincian Barang Penyelesaian Pesanan: roll-overs to items, one block each. */
export declare const rollOverItemDetail: (jobs: Job[], from: string, to: string) => string[][];
/** Rincian Akun Penyelesaian Pesanan: roll-overs to accounts; the portion prints with a % sign. */
export declare const rollOverAccountDetail: (jobs: Job[], from: string, to: string) => string[][];
