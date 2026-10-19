import type { Db } from '../db';
import { type StatementLine, type StatementOptions } from './financial-statements';
import { type TbAccount } from './trial-balance';
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
/** How a sandbox prints the dimension statements. */
export interface Style {
    pl: typeof pl;
    num: (cents: number) => string;
}
export declare const RETAIL: Style;
export declare const STANDARD: Style;
/** Laba/Rugi Cabang: one column per branch, then Total. */
export declare function profitLossByBranch(accounts: TbAccount[], lines: DimLine[], branches: string[], defaultBranch: string, from: string, to: string, o: StatementOptions): string[][];
type Dim = 'department' | 'project';
/** Laba/Rugi Departemen / Proyek: one column per selected value, then Total. Lines without that dimension are left out. */
export declare function profitLossByDim(accounts: TbAccount[], lines: DimLine[], dim: Dim, values: string[], from: string, to: string, o: StatementOptions, s?: Style): string[][];
export declare const profitLossByDepartment: (accounts: TbAccount[], lines: DimLine[], departments: string[], from: string, to: string, o: StatementOptions) => string[][];
/** Laba/Rugi Departemen / Proyek (Multi Periode): one value, one column per month (full month name), then Total. */
export declare function profitLossMultiPeriodBy(accounts: TbAccount[], lines: DimLine[], dim: Dim, value: string, sy: number, sm: number, ey: number, em: number, o: StatementOptions, s?: Style): string[][];
export declare const profitLossDepartmentMultiPeriod: (accounts: TbAccount[], lines: DimLine[], department: string, sy: number, sm: number, ey: number, em: number, o: StatementOptions) => string[][];
/** Laba/Rugi Departemen / Proyek (Perbandingan Periode): base, compare, variance, % var. over one dimension value. */
export declare function profitLossComparePeriodBy(accounts: TbAccount[], lines: DimLine[], dim: Dim, value: string, base: {
    from: string;
    to: string;
}, cmp: {
    from: string;
    to: string;
}, o: StatementOptions, s?: Style): string[][];
/**
 * Analisa Laba/Rugi Departemen / Proyek: per value with activity (by name), then `[Tanpa Departement]` / `[Tanpa Proyek]`, then the total.
 * Pendapatan = revenue + other income, BPP = COGS, Beban = operating + non-operating expense; Laba/Rugi = P − BPP − B.
 * The project variant (Kontraktor Demo) adds a Nomor Proyek column (`-` for no project) and prints id-ID numbers.
 */
export declare function analysisProfitLossDepartment(accounts: TbAccount[], lines: DimLine[], from: string, to: string): string[][];
export declare const analysisProfitLossProject: (accounts: TbAccount[], lines: DimLine[], projectNo: Map<string, string>, from: string, to: string) => string[][];
/** Daftar Departemen: by name; an empty description prints nothing. */
export declare const departmentList: (db: Db) => Promise<string[][]>;
/** Daftar Proyek: by name; an empty description prints nothing. */
export declare const projectList: (db: Db) => Promise<string[][]>;
export declare const loadProjectNos: (db: Db) => Promise<Map<string, string>>;
export {};
