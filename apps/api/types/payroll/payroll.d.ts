import type { Db } from '../db';
/** Monthly PPh 21 (rupiah) by TER on the month's gross. */
export declare const terPph: (taxStatus: string, gross: number) => number;
type Fees = Record<string, number>;
/** Annual PPh 21 for December: Pasal 17 on the year's neto less PTKP, minus what Jan-Nov withheld. */
export declare function decemberPph(taxStatus: string, year: Fees[], withheld: number): number;
/** Income (Accurate incomeAmount), cash paid (amount) and signed PPh of one payroll line. */
export declare function payLine(f: Fees, pph: number): {
    income: number;
    paid: number;
    pph: number;
};
export type PayrollRun = {
    number: string;
    date: string;
    year: number;
    month: number;
    lines: {
        employee: string;
        fees: Fees;
        pph?: number;
    }[];
};
/** Saves a monthly run; `pph` on a line is a manual PPh (Accurate's manualEditPphAmount), otherwise TER or the December true-up. */
export declare function createPayrollRun(db: Db, r: PayrollRun): Promise<{
    number: string;
    lines: {
        income: number;
        paid: number;
        pph: number;
        employee: string;
    }[];
}>;
type Line = {
    year: number;
    month: number;
    name: string;
    fees: Fees;
    income: number;
    paid: number;
    pph: number;
};
export declare function loadPayroll(db: Db): Promise<Line[]>;
/** Rincian Gaji Karyawan per Bulan (EmployeePaymentByEmployeeReport) */
export declare const monthlyPayroll: (ls: Line[], year: number, month: number) => string[][];
/** Rincian Gaji Karyawan per Tahun (EmployeePaymentYearlyByEmployeeReport) */
export declare const yearlyPayroll: (ls: Line[], year: number) => string[][];
/** Pajak Penghasilan Karyawan (EmployeePphReport): signed PPh per employee and paid month. */
export declare function pphByMonth(ls: Line[], year: number): string[][];
/** Porsi Gaji Karyawan (EmployeeSalaryProportionReport, pie): legend `<employee> - <income> (<pct>%)` by name. */
export declare function salaryShareChart(ls: Line[], year: number): string[];
/** Gaji Karyawan per Tahun (EmployeeSalaryPerYearReport, bars): Gaji dibayarkan per year. */
export declare const salaryPerYearChart: (ls: Line[]) => string[][];
export {};
