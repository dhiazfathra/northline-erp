import type { Db } from '../db';
import type { StatementOptions } from './financial-statements';
import { type TbAccount } from './trial-balance';
export interface Resource {
    id: number;
    name: string;
    unit: string;
    qty: number;
    plan: number;
}
export interface Task {
    id: number;
    group: string;
    groupName: string;
    name: string;
    volume: number;
    unit: string;
    unitCost: number;
    unitPrice: number;
    start: string | null;
    end: string | null;
    resources: Resource[];
}
export interface Rab {
    number: string;
    date: string;
    feePct: number;
    description: string;
    tasks: Task[];
}
export interface Project {
    no: string;
    name: string;
    targetStart: string;
    finishDate: string | null;
    description: string;
    wip: string;
    rab?: Rab;
    usages: {
        number: string;
        date: string;
        description: string;
        lines: {
            task: number;
            resource: number | null;
            name: string;
            qty: number;
            unit: string;
            warehouse: string;
            amount: number;
        }[];
    }[];
    costs: {
        resource: number | null;
        name: string;
        qty: number;
        amount: number;
    }[];
    returns: {
        name: string;
        qty: number;
        amount: number;
    }[];
    surveys: {
        number: string;
        date: string;
        surveyor: string;
        description: string;
        lines: {
            task: number;
            qty: number;
            pct: number;
        }[];
    }[];
    billings: {
        invoice: string;
        group: string;
        date: string;
    }[];
    journal: {
        number: string;
        date: string;
        sourceType: string;
        description: string;
        account: string;
        accountName: string;
        accountType: string;
        debit: number;
        credit: number;
    }[];
}
export declare function loadContractor(db: Db): Promise<Project[]>;
export declare function byNo(ps: Project[], no: string): Project;
/** RAB totals (ADR-0038): work = Σ volume × unit cost; selling = Σ volume × unit price; fee = selling × fee %; Total RAB = selling + fee. */
export declare function rabTotals(r: Rab): {
    work: number;
    buffer: number;
    selling: number;
    fee: number;
    grand: number;
};
/** Daftar Proyek Kontraktor: projects whose Target Mulai is in range (inferred filter column). */
export declare const projectContractorList: (ps: Project[], from: string, to: string) => string[][];
/** Daftar Anggaran: one row per RAB dated in range; Progress and Keterangan print empty. */
export declare const contractorBudgetPlan: (ps: Project[], from: string, to: string) => string[][];
/** Anggaran & Realisasi Proyek: plan (resource qty × cost) vs actual (MEQ + project cost lines) per resource; then out-of-budget lines. */
export declare function projectBudgetComparison(p: Project): string[][];
/** Jurnal Proyek Dalam Proses: the project's lines on its WIP account, grouped per document (date, number order), subtotal each, grand total. */
export declare function projectContractorJournal(p: Project): string[][];
/** Daftar Bahan Baku Terpakai: one row per MEQ dated in range. */
export declare const materialEquipmentList: (ps: Project[], from: string, to: string) => string[][];
/** Rincian Bahan Baku Terpakai: one block (page) per MEQ; lines under their RAB task heading. */
export declare function materialEquipmentDetail(ps: Project[], from: string, to: string): string[][];
/** Daftar Survei Proyek. */
export declare const surveyList: (ps: Project[], from: string, to: string) => string[][];
/** Rincian Survei Proyek: one block (page) per survey; lines under their RAB group name (no Roman numeral). */
export declare function contractorSurveyDetail(ps: Project[], from: string, to: string): string[][];
/** Progres Proyek as of a date. Rencana % = share of the task's schedule elapsed (inferred; captured only at 100);
 * Realisasi % = latest survey portion up to the date; groups weighted by task cost. Tertagih = an invoice billed the task's group. */
export declare function projectContractorProgress(p: Project, asOf: string): string[][];
/** Mutasi Bank per Proyek: the project's cash/bank lines, date order, running Saldo; totals of Masuk and Keluar. */
export declare function bankMutationByProjectContractor(p: Project): string[][];
/** Laba/Rugi Proyek Kontraktor: the standard statement over the selected projects' lines, one column each, then Total.
 * Accurate refuses an empty selection ("Proyek harus diisi", the only capture). */
export declare function profitLossByProjectContractor(accounts: TbAccount[], ps: Project[], selected: string[], from: string, to: string, o: StatementOptions): string[][];
