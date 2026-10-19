import type { Db } from '../db';
import { type StatementLine, type StatementOptions } from './financial-statements';
import type { TbAccount } from './trial-balance';
/** One journal line with its dimensions; branch null = the default branch. */
export interface DimLine {
    account: string;
    date: string;
    debit: number;
    credit: number;
    branch: string | null;
    department: string | null;
    project: string | null;
}
export declare function loadDimLines(db: Db): Promise<DimLine[]>;
/** en-US grouping, up to 2 decimals with trailing zeros dropped: `1,650,000.5`. */
export declare function formatEn(cents: number): string;
/** The standard Laba/Rugi over a subset of lines, with Retail's two LABA BERSIH rows. */
export declare function pl(accounts: TbAccount[], lines: DimLine[], from: string, to: string, o: StatementOptions): StatementLine[];
/** Laba/Rugi Cabang: one column per branch, then Total. */
export declare function profitLossByBranch(accounts: TbAccount[], lines: DimLine[], branches: string[], defaultBranch: string, from: string, to: string, o: StatementOptions): string[][];
/** Laba/Rugi Departemen: one column per selected department, then Total. Lines without a department are left out. */
export declare function profitLossByDepartment(accounts: TbAccount[], lines: DimLine[], departments: string[], from: string, to: string, o: StatementOptions): string[][];
/** Laba/Rugi Departemen (Multi Periode): one department, one column per month (full month name), then Total. */
export declare function profitLossDepartmentMultiPeriod(accounts: TbAccount[], lines: DimLine[], department: string, sy: number, sm: number, ey: number, em: number, o: StatementOptions): string[][];
/** Laba/Rugi Departemen / Proyek (Perbandingan Periode): base, compare, variance, % var. over one dimension value. */
export declare function profitLossComparePeriodBy(accounts: TbAccount[], lines: DimLine[], dim: 'department' | 'project', value: string, base: {
    from: string;
    to: string;
}, cmp: {
    from: string;
    to: string;
}, o: StatementOptions): string[][];
/**
 * Analisa Laba/Rugi Departemen: per department with activity (by name), then `[Tanpa Departement]`, then the total.
 * Pendapatan = revenue + other income, BPP = COGS, Beban = operating + non-operating expense; Laba/Rugi = P − BPP − B.
 */
export declare function analysisProfitLossDepartment(accounts: TbAccount[], lines: DimLine[], from: string, to: string): string[][];
/** Daftar Departemen: by name; an empty description prints nothing. */
export declare const departmentList: (db: Db) => Promise<string[][]>;
