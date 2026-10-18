import type { Db } from './db';
export declare function createApp(db: Db): import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, (import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<((((((((((((((((((((((((((((((((((((((((((((((((((((((({
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
} | (import("hono/types").MergeSchemaPath<{
    "/login": {
        $post: {
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
}, "/auth"> & {
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
})) & {
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
    "/reports/profit-loss": {
        $get: {
            output: {
                label: string;
                amount?: number;
                kind: 'heading' | 'account' | 'total';
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
    "/reports/receivables/:report{invoice-list|sales-by-customer|receipt-list|ar-ledger|ar-history|customer-statement|outstanding}": {
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
    "/reports/inventory/:report{valuation|stock-card|valuation-detail|aging|profitability-by-item}": {
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
