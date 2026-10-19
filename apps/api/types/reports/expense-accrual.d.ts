export interface ExpenseAccrual {
    number: string;
    date: string;
    dueDate: string;
    total: number;
    lines: {
        account: string;
        accountName: string;
        amount: number;
    }[];
}
/** Ringkasan Pencatatan Beban (docs/reports/ExpenseAccrualSummaryReport.md): accruals dated in the window, newest first. */
export declare function expenseAccrualSummary(all: ExpenseAccrual[], from: string, to: string): string[][];
/** Rincian Pencatatan Beban (docs/reports/ExpenseAccrualDetailReport.md): one block per accrual, oldest first; lines in entry order. */
export declare function expenseAccrualDetail(all: ExpenseAccrual[], from: string, to: string): string[][];
