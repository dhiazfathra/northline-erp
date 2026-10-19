import type { Db } from '../db';
export type ApprovalDoc = {
    type: string;
    number: string;
    date: string;
    requestedBy: string;
    status: string;
    steps: {
        approver: string;
        status: string;
        decidedOn: string | null;
    }[];
};
/**
 * Laporan Rincian Penyetuju Transaksi (ApprovalListReport), docs/reports/ApprovalListReport.md. Only documents that went
 * through approvers print (an auto-approved document has none, and Accurate prints nothing for it). With none, the
 * template header lines print empty: the only layout verified against Accurate.
 * shortcut: block layout for documents with approvers is unverified (one-user sandbox cannot create them); recapture when a second user exists.
 */
export declare function approvalList(docs: ApprovalDoc[], from: string, to: string): string[][];
export declare function loadApprovals(db: Db): Promise<ApprovalDoc[]>;
