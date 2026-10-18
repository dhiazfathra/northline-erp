import type { Db } from '../db';
export declare function upsertEmployee(db: Db, e: {
    no: string;
    name: string;
}): Promise<void>;
export declare function createEmployeeLoan(db: Db, l: {
    number: string;
    employee: string;
    date: string;
    amount: number;
    interestRate?: number;
    description?: string;
}): Promise<{
    number: string;
}>;
type Loan = {
    number: string;
    date: string;
    employee: string;
    name: string;
    amount: number;
    rate: number;
};
export declare function loadLoans(db: Db): Promise<Loan[]>;
/** Daftar Piutang Karyawan: per branch; amount columns stay empty while a loan has no installment schedule. */
export declare const loanList: (ls: Loan[]) => string[][];
/** Angsuran Pinjaman per Karyawan: header only while there is no schedule. */
export declare const loanInstallments: (l: Loan) => string[][];
/** History Peminjaman per Karyawan */
export declare const loanHistory: (l: Loan) => string[][];
export {};
