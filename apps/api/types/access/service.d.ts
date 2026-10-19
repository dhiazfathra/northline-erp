import { z } from 'zod';
import type { Db } from '../db';
export declare const ACTIONS: readonly ['enable', 'create', 'edit', 'delete', 'view'];
export declare const PRIVILEGES: Map<string, string>;
declare const groupInput: z.ZodObject<{
    name: z.ZodString;
    users: z.ZodDefault<z.ZodArray<z.ZodString>>;
    restrictionDayType: z.ZodDefault<z.ZodEnum<{
        MONDAYFRIDAY: "MONDAYFRIDAY";
    }>>;
    privileges: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodEnum<{
        create: "create";
        delete: "delete";
        edit: "edit";
        enable: "enable";
        view: "view";
    }>>>>;
}, z.core.$strip>;
/** Akses Grup: creates or replaces a group, its members and its privileges (catalog keys, applicable actions only). */
export declare function upsertAccessGroup(db: Db, raw: z.input<typeof groupInput>): Promise<void>;
declare const branchInput: z.ZodObject<{
    name: z.ZodString;
    allUsers: z.ZodDefault<z.ZodBoolean>;
    users: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
/** Which users a branch admits: everyone, or the listed emails. */
export declare function setBranchUsers(db: Db, raw: z.input<typeof branchInput>): Promise<void>;
export {};
