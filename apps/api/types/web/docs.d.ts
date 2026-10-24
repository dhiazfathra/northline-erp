import { type DocRow, type DocType } from '@northline/schemas/docs';
import type { AuthEnv } from '../auth';
import type { Db } from '../db';
export declare function docRows(db: Db, type: DocType): Promise<DocRow[]>;
export declare function webDocRoutes(db: Db): import("hono/hono-base").HonoBase<AuthEnv, {
    [x: `/:type${string}`]: {
        $get: {
            output: {
                id: string;
                type: DocType | null;
                no: string;
                jv: string;
                date: string;
                party: string;
                description: string;
                source: string;
                total: number;
                lines: {
                    account: string;
                    debit: number;
                    credit: number;
                    memo?: string;
                }[];
                values?: import("@northline/schemas/docs").DocValues;
                status?: import("@northline/schemas/docs").DocStatus;
                paid: number;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    [x: `type${string}`]: string;
                };
            };
        };
    };
} & {
    [x: `/:type${string}`]: {
        $post: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: 201;
            input: {
                param: {
                    [x: `type${string}`]: string;
                };
            };
        };
    };
} & {
    [x: `/:type${string}/:id`]: {
        $put: {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    [x: `type${string}`]: string;
                } & {
                    id: string;
                };
            };
        };
    };
} & {
    [x: `/:type${string}/:id`]: {
        $delete: {
            output: {
                error: string;
                code: string;
            };
            outputFormat: "json";
            status: 409;
            input: {
                param: {
                    [x: `type${string}`]: string;
                } & {
                    id: string;
                };
            };
        } | {
            output: {
                number: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    [x: `type${string}`]: string;
                } & {
                    id: string;
                };
            };
        };
    };
}, "/", `/:type${string}/:id`>;
