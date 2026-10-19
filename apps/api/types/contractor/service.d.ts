import { z } from 'zod';
import type { Db } from '../db';
declare const projectInput: z.ZodObject<{
    no: z.ZodString;
    name: z.ZodString;
    customer: z.ZodOptional<z.ZodString>;
    manager: z.ZodDefault<z.ZodString>;
    targetStart: z.ZodString;
    finishDate: z.ZodOptional<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
    warehouse: z.ZodOptional<z.ZodString>;
    wipAccount: z.ZodString;
    cogsAccount: z.ZodString;
    incomeAccount: z.ZodString;
}, z.core.$strip>;
export declare function upsertContractorProject(db: Db, raw: z.input<typeof projectInput>): Promise<void>;
declare const rabInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    project: z.ZodString;
    date: z.ZodString;
    feePct: z.ZodDefault<z.ZodNumber>;
    description: z.ZodDefault<z.ZodString>;
    groups: z.ZodArray<z.ZodObject<{
        number: z.ZodString;
        name: z.ZodString;
        tasks: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            volume: z.ZodNumber;
            unit: z.ZodDefault<z.ZodString>;
            bufferPct: z.ZodDefault<z.ZodNumber>;
            startDate: z.ZodOptional<z.ZodString>;
            endDate: z.ZodOptional<z.ZodString>;
            resources: z.ZodArray<z.ZodObject<{
                item: z.ZodOptional<z.ZodString>;
                account: z.ZodOptional<z.ZodString>;
                name: z.ZodString;
                unit: z.ZodDefault<z.ZodString>;
                qty: z.ZodNumber;
                unitCost: z.ZodNumber;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** RAB (BGP): task unit cost = Σ resource cost / volume; selling unit price = unit cost + buffer %. */
export declare function createRab(db: Db, raw: z.input<typeof rabInput>): Promise<{
    number: string;
}>;
declare const usageInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    project: z.ZodString;
    date: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    lines: z.ZodArray<z.ZodObject<{
        task: z.ZodString;
        resource: z.ZodOptional<z.ZodString>;
        item: z.ZodString;
        qty: z.ZodNumber;
        warehouse: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** Bahan Baku Terpakai (MEQ): stock out at cost, Dr project-in-progress / Cr inventory per account. */
export declare function createMaterialUsage(db: Db, raw: z.input<typeof usageInput>): Promise<{
    number: string;
}>;
declare const surveyInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    project: z.ZodString;
    date: z.ZodString;
    surveyor: z.ZodDefault<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
    lines: z.ZodArray<z.ZodObject<{
        task: z.ZodString;
        progressQty: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** Survei Proyek (PSV): progress quantity per RAB task, portion = qty / volume; reporting only, no journal. */
export declare function createSurvey(db: Db, raw: z.input<typeof surveyInput>): Promise<{
    number: string;
}>;
declare const docInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodString;
    sourceType: z.ZodEnum<{
        JV: "JV";
        OD: "OD";
        OP: "OP";
        PI: "PI";
        PP: "PP";
        SDP: "SDP";
        SI: "SI";
        SR: "SR";
    }>;
    date: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    project: z.ZodString;
    lines: z.ZodArray<z.ZodObject<{
        account: z.ZodString;
        side: z.ZodEnum<{
            CREDIT: "CREDIT";
            DEBIT: "DEBIT";
        }>;
        amount: z.ZodNumber;
    }, z.core.$strip>>;
    costs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        task: z.ZodOptional<z.ZodString>;
        resource: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        qty: z.ZodOptional<z.ZodNumber>;
        amount: z.ZodNumber;
    }, z.core.$strip>>>;
    billing: z.ZodOptional<z.ZodObject<{
        groups: z.ZodArray<z.ZodString>;
        sharePct: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** A purchase invoice / payment / receipt / sales invoice booked to a contractor project: its journal with every line tagged. */
export declare function postProjectDocument(db: Db, raw: z.input<typeof docInput>): Promise<{
    number: string;
}>;
declare const completionInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    project: z.ZodString;
    date: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    returns: z.ZodDefault<z.ZodArray<z.ZodObject<{
        item: z.ZodString;
        qty: z.ZodNumber;
        warehouse: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
/** Penyelesaian Proyek (FPC): leftover stock back at the project's usage cost, then the remaining WIP balance closed to COGS. */
export declare function createProjectCompletion(db: Db, raw: z.input<typeof completionInput>): Promise<{
    number: string;
}>;
export {};
