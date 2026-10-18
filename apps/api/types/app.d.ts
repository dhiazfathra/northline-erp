import type { Db } from './db';
export declare function createApp(db: Db): import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, (import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<(((((((({
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
