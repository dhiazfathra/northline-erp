import type { TrialBalanceQuery, TrialBalanceRow } from '@northline/schemas/ledger-es';
export type AccountType = 'CASH_BANK' | 'ACCOUNT_RECEIVABLE' | 'INVENTORY' | 'OTHER_CURRENT_ASSET' | 'FIXED_ASSET' | 'ACCUMULATED_DEPRECIATION' | 'OTHER_ASSET' | 'ACCOUNT_PAYABLE' | 'OTHER_CURRENT_LIABILITY' | 'LONG_TERM_LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE';
export declare const PROFIT_LOSS_TYPES: ReadonlySet<AccountType>;
export interface TbAccount {
    no: string;
    name: string;
    type: AccountType;
    parentNo: string | null;
}
/** Debit/credit cents per account per day (the `account_daily_balances` read model). */
export interface DailyBalance {
    account: string;
    date: string;
    debit: number;
    credit: number;
}
export interface LedgerSettings {
    retainedEarningsAccount: string;
    fiscalYearStartMonth: number;
}
export declare function fiscalYearStart(date: string, startMonth: number): string;
export declare function trialBalance(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, q: TrialBalanceQuery): TrialBalanceRow[];
/** Accurate's id-ID number style: `1.250.000,5`, `0` (rule 10). */
export declare function formatIdr(cents: number): string;
export declare const formatRow: (r: TrialBalanceRow) => string[];
