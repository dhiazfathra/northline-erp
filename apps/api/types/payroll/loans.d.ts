import type { Db, Tx } from '../db';
export declare function upsertEmployee(db: Db, e: {
    no: string;
    name: string;
    taxStatus?: string;
}): Promise<void>;
type LoanInput = {
    number?: string;
    employee: string;
    date: string;
    amount: number;
    interestRate?: number;
    description?: string;
    receivableAccount?: string;
};
/** Pinjaman Karyawan: no journal (Accurate posts on Pencairan Pinjaman). Number omitted → EPL.yyyy.mm.nnnnn. */
export declare function createEmployeeLoan(db: Db | Tx, l: LoanInput): Promise<{
    number: string;
}>;
/** Edited in place; a disbursed loan is read-only in Accurate. */
export declare function editEmployeeLoan(db: Db, number: string, l: LoanInput): Promise<{
    number: string;
}>;
export declare function deleteEmployeeLoan(db: Db, number: string): Promise<{
    number: string;
}>;
type DisbursementInput = {
    idempotencyKey: string;
    number?: string;
    loan?: string;
    bank: string;
    date: string;
    description?: string;
};
/** Pencairan Pinjaman: pays the whole loan out, Dr the loan's Piutang Karyawan / Cr the bank; number ELD.yyyy.mm.nnnnn. */
export declare function createLoanDisbursement(db: Db | Tx, d: DisbursementInput): Promise<{
    number: string;
}>;
export declare function deleteLoanDisbursement(db: Db, number: string, idempotencyKey: string): Promise<{
    number: string;
}>;
/** Edited in place under the same number. */
export declare function editLoanDisbursement(db: Db, number: string, d: DisbursementInput): Promise<{
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
