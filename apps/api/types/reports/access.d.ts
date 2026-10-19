import type { Db } from '../db';
export interface AccessGroup {
    name: string;
    days: string;
    from: string;
    to: string;
    privileges: Record<string, string[]>;
    users: {
        id: number;
        name: string;
    }[];
}
export declare function loadAccessGroups(db: Db): Promise<AccessGroup[]>;
export declare const accessGroupList: (groups: AccessGroup[]) => string[][];
/** Per user (selected ids, or all) of every group they belong to; users in no group (administrators) are not listed. */
export declare function accessPrivilegeByUser(groups: AccessGroup[], selected?: number[]): string[][];
/** Branches by name; a branch open to everyone prints Semua Pengguna, otherwise its users (empty cells print nothing). */
export declare function userByBranchList(db: Db): Promise<string[][]>;
