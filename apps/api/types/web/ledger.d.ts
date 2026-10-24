import type { AuthEnv } from '../auth';
import type { Db } from '../db';
import type { AccountType } from '../reports/trial-balance';
export declare function ledgerWebRoutes(db: Db): import("hono/hono-base").HonoBase<AuthEnv, {
    "/accounts": {
        $get: {
            output: {
                no: string;
                name: string;
                type: AccountType;
                parentNo: string | null;
                suspended: boolean;
                note: string;
                bank: string;
                accNo: string;
                accName: string;
                allUsers: boolean;
                users: string[];
                balance: number;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/accounts/:no/details": {
        $put: {
            output: {
                note: string;
                bank: string;
                accNo: string;
                accName: string;
                allUsers: boolean;
                users: string[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    no: string;
                };
            };
        };
    };
} & {
    "/accounts/:no/lines": {
        $get: {
            output: {
                number: string;
                date: string;
                description: string;
                debit: number;
                credit: number;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    no: string;
                };
            };
        };
    };
} & {
    "/banks": {
        $get: {
            output: {
                no: string;
                name: string;
                balance: number;
                entries: {
                    id: string;
                    date: string;
                    side: "credit" | "debit";
                    amount: number;
                    type: string;
                    no: string;
                    party: string;
                    matched: boolean;
                }[];
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/banks/reconcile": {
        $post: {
            output: {
                ok: true;
            };
            outputFormat: "json";
            status: 201;
            input: {};
        };
    };
} & {
    "/period-ends": {
        $get: {
            output: {
                period: string;
                number: string;
                date: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/features": {
        $get: {
            output: {
                [x: string]: boolean;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/features": {
        $put: {
            output: {
                [x: string]: boolean;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/default-accounts": {
        $get: {
            output: {
                label: string;
                value: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}, "/", "/default-accounts">;
export type LedgerWebType = ReturnType<typeof ledgerWebRoutes>;
