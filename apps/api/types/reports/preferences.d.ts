import type { Tx } from '../db';
import type { AgingBasis } from './receivables';
export type ReportStyle = 'RETAIL' | 'STANDARD';
export type ReportPreferences = {
    agingBasis: AgingBasis;
    reportStyle: ReportStyle;
};
/** Per-company report preferences (ADR-0037); defaults match Manufaktur/Retail Demo. */
export declare function reportPreferences(tx: Tx): Promise<ReportPreferences>;
export declare function setReportPreferences(tx: Tx, p: ReportPreferences): Promise<void>;
