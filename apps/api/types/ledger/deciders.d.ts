import type { JournalLine, LedgerEvent } from '@northline/schemas/ledger-es';
import type { Decider } from '../es/store';
export declare class DomainError extends Error {
}
type PostCmd = {
    type: 'Post';
    journalId: string;
    number?: string;
    sourceType?: 'JV' | 'SI' | 'SR';
    date: string;
    description: string;
    lines: JournalLine[];
    reverses?: string;
    periodClosed: boolean;
};
type ReverseCmd = {
    type: 'Reverse';
    reversalJournalId: string;
    date: string;
    reason: string;
};
export type JournalState = {
    status: 'none';
} | {
    status: 'posted' | 'reversed';
    journalId: string;
    date: string;
    lines: JournalLine[];
};
export declare const journalDecider: Decider<JournalState, PostCmd | ReverseCmd, LedgerEvent>;
export type PeriodState = {
    closed: boolean;
};
export declare const periodDecider: Decider<PeriodState, {
    type: 'Close' | 'Reopen';
    period: string;
}, LedgerEvent>;
/** Lines that undo `lines`: same accounts and amounts, sides swapped. */
export declare const reverseLines: (lines: JournalLine[]) => JournalLine[];
export declare const journalStream: (id: string) => string;
export declare const periodStream: (period: string) => string;
type AccountCmd = {
    type: 'Open';
    no: string;
    name: string;
    accountType: string;
    parentNo?: string;
    parentExists: boolean;
} | {
    type: 'Rename';
    name: string;
} | {
    type: 'Suspend';
};
export type AccountState = {
    status: 'none';
} | {
    status: 'open' | 'suspended';
    no: string;
    name: string;
};
export declare const accountDecider: Decider<AccountState, AccountCmd, LedgerEvent>;
export declare const accountStream: (no: string) => string;
export {};
