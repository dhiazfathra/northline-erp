import type { BalanceSheetQuery, TrialBalanceQuery } from '@northline/schemas/ledger-es';
import type { Db } from '../db';
import { type AccountType } from './trial-balance';
import { type Journal } from './general-ledger';
/** Reads only projections + master data, never the event store. */
export declare function loadLedger(db: Db, to: string): Promise<{
    accounts: {
        no: string;
        name: string;
        type: AccountType;
        parentNo: string;
    }[];
    balances: {
        account: string;
        date: string;
        debit: number;
        credit: number;
    }[];
    settings: {
        retainedEarningsAccount: string;
        fiscalYearStartMonth: number;
    };
}>;
export declare function queryTrialBalance(db: Db, q: TrialBalanceQuery): Promise<{
    no: string;
    name: string;
    depth: number;
    isParent: boolean;
    openingDebit: number;
    openingCredit: number;
    debit: number;
    credit: number;
    closingDebit: number;
    closingCredit: number;
}[]>;
export declare function queryProfitLoss(db: Db, q: TrialBalanceQuery): Promise<import("./financial-statements").StatementLine[]>;
export declare function queryBalanceSheet(db: Db, q: BalanceSheetQuery): Promise<import("./financial-statements").StatementLine[]>;
/** `accounts` keeps only lines on those accounts (and journals with one). */
export declare function loadJournals(db: Db, from: string, to: string, accounts?: string[]): Promise<Journal[]>;
export type GlReport = 'journal-list' | 'all-journals' | 'history' | 'summary' | 'detail' | 'account-journal-detail' | 'account-list';
export declare function queryGeneralLedger(db: Db, report: GlReport, q: TrialBalanceQuery): Promise<string[][]>;
export declare function queryRetainedEarnings(db: Db, year: number): Promise<string[][]>;
export declare function queryOwnerEquityChange(db: Db, q: TrialBalanceQuery): Promise<string[][]>;
export type CashFlowReport = 'direct' | 'indirect' | 'indirect-detail';
/** `monthly` splits [from, to] into calendar-month columns (the Multi Period variants). */
export declare function queryCashFlow(db: Db, report: CashFlowReport, q: TrialBalanceQuery, monthly?: boolean): Promise<string[][]>;
export declare function queryFinancialRatios(db: Db, year: number, month?: number): Promise<string[][]>;
export declare function queryFinancialFocus(db: Db, year: number): Promise<string[][]>;
export declare function queryBankBook(db: Db, banks: string[], q: TrialBalanceQuery): Promise<string[][]>;
export declare function queryCashFlowByAccount(db: Db, banks: string[], q: TrialBalanceQuery): Promise<string[][]>;
export declare function queryCashAccountList(db: Db, asOf: string): Promise<string[][]>;
export declare function loadSales(db: Db): Promise<import('./receivables').SalesData>;
/** Purchases in the shape the shared receivable/payable report functions use (parties = vendors, AP labels). */
export declare function loadPurchases(db: Db): Promise<import('./receivables').SalesData>;
export declare function loadInventory(db: Db): Promise<import('./inventory').InventoryData>;
/** FIFO cost of goods per sales invoice (cents), from stock_moves. */
export declare function cogsByInvoice(db: Db): Promise<(invoice: string) => number>;
export declare function loadFixedAssets(db: Db): Promise<import('./fixed-assets').Asset[]>;
/** Finance charts over calendar months [from, to], from our own Neraca / Laba-Rugi totals. */
export declare function queryFinanceChart(db: Db, chart: 'net-worth' | 'liquidity' | 'roa' | 'roe' | 'revenue-vs-expense', from: string, to: string): Promise<{
    labels: string[];
    series: {
        'Total Aset': string[];
        'Total Kewajiban': string[];
        'Harta Bersih': string[];
    } | {
        'Kas & Bank': string[];
        'Utang Usaha': string[];
    } | {
        'Laba/Rugi': string[];
        'Total Aset': string[];
    } | {
        'Laba/Rugi': string[];
        'Harta Bersih': string[];
    } | {
        'Total Pendapatan': string[];
        'Total Biaya': string[];
    };
}>;
export declare function loadOrders(db: Db): Promise<import('./payables').OrderData>;
export declare function loadAdjustments(db: Db): Promise<{
    number: string;
    date: string;
    description: string;
    lines: {
        item: string;
        name: string;
        unit: string;
        qty: number;
    }[];
}[]>;
export declare function loadRequisitions(db: Db): Promise<import('./payables').Requisition[]>;
export declare function loadDeliveries(db: Db): Promise<import('./receivables').Delivery[]>;
export declare function loadTransfers(db: Db): Promise<{
    number: string;
    date: string;
    direction: 'OUT' | 'IN';
    warehouse: string;
    reference: string;
    from: string | undefined;
    lines: {
        item: string;
        itemName: string;
        unit: string;
        qty: number;
    }[];
}[]>;
export declare function loadWarehouses(db: Db): Promise<import('./inventory').Warehouse[]>;
export declare function loadExchanges(db: Db): Promise<{
    number: string;
    date: string;
    collectDate: string;
    dueDate: string;
    invoices: string[];
}[]>;
export declare function loadCashDocs(db: Db): Promise<import('./cash-bank').CashDoc[]>;
/** Items in creation order (first audit insert) and raw stock moves, for Daftar Barang dan Jasa. */
export declare function loadItemList(db: Db): Promise<{
    items: {
        no: string;
        name: string;
        type: string;
        unit: string;
    }[];
    moves: {
        item: string;
        date: string;
        quantity: number;
        warehouse: string;
        docType: string;
    }[];
}>;
export declare const loadCreditLimits: (db: Db) => Promise<Map<string, number>>;
export declare function loadCheques(db: Db): Promise<import('./cash-bank').Cheque[]>;
/** Installments with what receipts paid on them and the last payment date. */
export declare function loadInstallments(db: Db): Promise<import('./receivables').Installment[]>;
export declare function loadReconciliations(db: Db): Promise<import('./cash-bank').Reconciliation[]>;
export declare function loadPurchaseExpenses(db: Db): Promise<{
    date: string;
    account: string;
    accountName: string;
    amount: number;
}[]>;
export declare function loadExpenseAccruals(db: Db): Promise<import('./expense-accrual').ExpenseAccrual[]>;
export declare function loadVendorPrices(db: Db): Promise<{
    number: string;
    vendorName: string;
    date: string;
    endDate: string | undefined;
    item: string;
    itemName: string;
    unit: string;
    price: number;
}[]>;
export declare function loadRealizedReceipts(db: Db): Promise<{
    receipt: string;
    date: string;
    currency: string;
    atInvoice: number;
    atReceipt: number;
}[]>;
export declare function loadItemGroups(db: Db): Promise<{
    no: string;
    name: string;
    unit: string;
    components: {
        no: string;
        name: string;
        qty: number;
        unit: string;
    }[];
}[]>;
export declare function loadSerialMoves(db: Db): Promise<import('./serial-numbers').SerialMove[]>;
/** Foreign invoices with their IDR owing at `asOf` (receipts dated by then). */
export declare function loadForeignOwing(db: Db, asOf: string): Promise<{
    account: string;
    accountName: string;
    currency: string;
    rate: number;
    owing: number;
}[]>;
