import type { AuthEnv } from '../auth';
import type { Db } from '../db';
export declare function fixedAssetRoutes(db: Db): import("hono/hono-base").HonoBase<AuthEnv, {
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
}, "/", "/:number">;
