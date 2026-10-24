import type { Db } from './db';
import * as R from './reports/receivables';
export declare function createApp(db: Db): import("hono/hono-base").HonoBase<{}, (import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<(((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
    "/login": {
        $post: {
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 429;
            input: {};
        } | {
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
            input: {};
        } | {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/logout": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}, "/auth"> | import("hono/types").MergeSchemaPath<{
    "/branches": {
        $get: {
            output: string[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/locations": {
        $get: {
            output: {
                name: string;
                address: string;
                qty: number;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/expenditures": {
        $get: {
            output: {
                id: string;
                number: string;
                date: string;
                description: string;
                qty: number;
                total: number;
                status: 'Draf' | 'Disetujui';
                branch: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/expenditures": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
} & {
    "/": {
        $get: {
            output: {
                number: string;
                description: string;
                category: string;
                date: string;
                usageDate: string;
                lifeMonths: number;
                assetAccount: string;
                accumulatedAccount: string;
                expenseAccount: string;
                location: string;
                department: string;
                note: string;
                tax: boolean;
                qty: number;
                salvage: number;
                status: "active" | "disposed";
                lastDep: string;
                expenditures: {
                    name: string;
                    date: string;
                    amount: number;
                    account: string;
                    expenditure: string | undefined;
                }[];
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/:number": {
        $get: {
            output: {
                number: string;
                description: string;
                category: string;
                date: string;
                usageDate: string;
                lifeMonths: number;
                assetAccount: string;
                accumulatedAccount: string;
                expenseAccount: string;
                location: string;
                department: string;
                note: string;
                tax: boolean;
                qty: number;
                salvage: number;
                status: "active" | "disposed";
                lastDep: string;
                expenditures: {
                    name: string;
                    date: string;
                    amount: number;
                    account: string;
                    expenditure: string | undefined;
                }[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    number: string;
                };
            };
        } | {
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
            input: {
                param: {
                    number: string;
                };
            };
        };
    };
}, "/fixed-assets">) & {
    "/me": {
        $get: {
            output: {
                userId: number;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/ledger/commands": {
        $post: {
            output: {
                globalPosition: number;
                streams: string[];
            };
            outputFormat: "json";
            status: 202;
            input: {};
        };
    };
}) & {
    "/reports/trial-balance": {
        $get: {
            output: {
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
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/activity-log": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/approvals": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/profit-loss": {
        $get: {
            output: {
                label: string;
                amount?: number;
                kind: 'heading' | 'account' | 'total';
                account?: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/general-ledger/:report{journal-list|all-journals|history|summary|detail|account-journal-detail|account-list}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/reports/retained-earnings": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/owner-equity-change": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/cash-flow/:report{direct|indirect|indirect-detail}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/reports/financial-ratios": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/cash-bank/:report{bank-book|cash-flow-by-account}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/reports/cash-bank/cash-list": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/settings/costing-method": {
        $get: {
            output: {
                method: import("./inventory/fifo").CostingMethod;
                locked: boolean;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/settings/costing-method": {
        $put: {
            output: {
                method: "AVERAGE" | "FIFO";
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/settings/report-preferences": {
        $get: {
            output: {
                agingBasis: R.AgingBasis;
                reportStyle: import("./reports/preferences").ReportStyle;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/settings/report-preferences": {
        $put: {
            output: {
                agingBasis: "DUE_DATE" | "INVOICE_DATE";
                reportStyle: "RETAIL" | "STANDARD";
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/sales/customers": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/sales/items": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/sales/:kind{customers|items}/:no": {
        $delete: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    kind: string;
                } & {
                    no: string;
                };
            };
        };
    };
}) & {
    "/sales/invoices": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/sales/invoices/:number": {
        $put: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    number: string;
                };
            };
        };
    };
}) & {
    "/sales/invoices/:number": {
        $delete: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    number: string;
                };
            };
        };
    };
}) & {
    "/sales/down-payments": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/sales/quotations": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/sales/orders": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/sales/deliveries": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/deliveries/:report{list|detail|history}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/sales/exchange-invoices": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/exchange-invoices": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/employees": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/employee-loans": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/payroll/runs": {
        $post: {
            output: {
                number: string;
                lines: {
                    income: number;
                    paid: number;
                    pph: number;
                    employee: string;
                }[];
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/payroll/:report{monthly|yearly|pph|share|per-year}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/reports/employee-loans/:report{list|installments|history}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        } | {
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/cash-bank/documents": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/cash-bank/:report{payment-list|deposit-list|payment-by-bank|deposit-by-bank|payment-by-bank-detail|deposit-by-bank-detail|payment-load|unreconciled|statement}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/master/:kind{branches|departments|projects}": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    kind: string;
                };
            };
        };
    };
}) & {
    "/reports/master/departments": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/master/projects": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/dimensions/:report{by-branch|by-department|by-project|department-multi-period|project-multi-period|compare-department|compare-project|analysis-department|analysis-project}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/job-costing/:kind{job-orders|material-adjustments|roll-overs}": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {
                param: {
                    kind: string;
                };
            };
        };
    };
}) & {
    "/reports/job-costing/:report{job-order-list|material-adjustment-list|material-adjustment-detail|roll-over-list|roll-over-item-detail|roll-over-account-detail}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/reports/manufacturing/:report{purchase-cogs|adjustment-cogs}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/purchases/transfer-orders": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/purchases/transfer-order-list": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/access/groups": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/access/branches": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/access/user-by-branch": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/access/group-privileges": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/access/privileges-by-user": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/tax/:report{sales-receipt-pph|purchase-payment-pph|purchase-invoice-pph-paid}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/reports/tax/ppn/:report{in-out|out|in}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/contractor/projects": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/contractor/:kind{rabs|material-usages|surveys|documents|completions}": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {
                param: {
                    kind: string;
                };
            };
        };
    };
}) & {
    "/reports/contractor/:report{project-list|budget-plan|budget-comparison|journal|material-usage|material-usage-detail|survey-list|survey-detail|progress|bank-mutation|profit-loss}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/reports/master/:list{currencies|fob|taxes|shipments|employees|fiscal-fa-types}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    list: string;
                };
            };
        };
    };
}) & {
    "/sales/receipts": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/receivables/:report{invoice-list|sales-by-customer|receipt-list|ar-ledger|ar-history|customer-statement|outstanding|aging|aging-detail|outstanding-per-customer|ar-ledger-detail|invoice-paid|receipt-detail|owing-collection|by-item|item-by-customer|customer-by-item|by-customer-detail|by-item-detail|by-branch|invoice-detail|down-payments|down-payment-usage}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/purchases/vendors": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/purchases/invoices": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/purchases/down-payments": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/purchases/orders": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/purchases/receive-items": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/orders/:report{order-list|order-detail|order-by-item|order-by-vendor|receive-list|receive-detail}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/inventory/adjustments": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/inventory/adjustments": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/purchases/requisitions": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/requisitions/:report{list|detail|by-item|order-status}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/inventory/transfers": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/inventory/transfers": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/purchases/payments": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/payables/:report{invoice-list|payment-list|ap-ledger|ap-history|vendor-statement|ap-ledger-detail|invoice-paid|by-vendor|outstanding|aging|outstanding-per-vendor|aging-detail|by-item|by-item-detail|by-vendor-detail|payment-detail|invoice-detail|per-month|down-payments|down-payment-usage}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/reports/parties/:report{customer-list|vendor-list|sales-flow|purchase-flow|selling-frequency|profitability-by-invoice|profitability-by-customer}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/reports/inventory/:report{valuation|stock-card|valuation-detail|aging|profitability-by-item|warehouse-summary}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/fixed-assets": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/fixed-assets/disposals": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/period-ends": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/fixed-assets/:report{list|by-category|history|journal|detail}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                };
            };
        } | {
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
            input: {
                param: {
                    report: string;
                };
            };
        };
    };
}) & {
    "/sales/returns": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/purchases/returns": {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
}) & {
    "/reports/returns/:side{sales|purchase}/:report{list|detail|by-item}": {
        $get: {
            output: string[][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    report: string;
                } & {
                    side: string;
                };
            };
        };
    };
}) & {
    "/reports/charts/:chart{ar-aging|ap-aging}": {
        $get: {
            output: [string, string][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    chart: string;
                };
            };
        };
    };
}) & {
    "/reports/charts/:chart{net-worth|liquidity|roa|roe|revenue-vs-expense}": {
        $get: {
            output: {
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
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    chart: string;
                };
            };
        };
    };
}) & {
    "/reports/charts/collection-days": {
        $get: {
            output: [string, string][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}) & {
    "/reports/charts/:chart{monthly-sales|customer-share|item-share}": {
        $get: {
            output: [string, string][];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    chart: string;
                };
            };
        };
    };
}) & {
    "/reports/balance-sheet": {
        $get: {
            output: {
                label: string;
                amount?: number;
                kind: 'heading' | 'account' | 'total';
                account?: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}, "/api">) & {
    "*": {
        $get: {
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
            input: {};
        };
    };
}, "/", "*">;
export type AppType = ReturnType<typeof createApp>;
