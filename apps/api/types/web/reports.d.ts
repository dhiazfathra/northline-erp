import type { AuthEnv } from '../auth';
import type { Db } from '../db';
/** Web-app state for the report screens (ADR-0049): the signed-in user's favourites and saved layouts, and account drill-down. */
export declare function webReportRoutes(db: Db): import("hono/hono-base").HonoBase<AuthEnv, {
    "/favourites": {
        $get: {
            output: string[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/favourites/:id": {
        $post: {
            output: {
                id: string;
                starred: boolean;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    id: string;
                };
            };
        };
    };
} & {
    "/layouts/:id": {
        $get: {
            output: {
                layout: {
                    [x: string]: import("hono/utils/types").JSONValue;
                } | null;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    id: string;
                };
            };
        };
    };
} & {
    "/layouts/:id": {
        $put: {
            output: {
                layout: {
                    [x: string]: import("hono/utils/types").JSONValue;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    id: string;
                };
            };
        };
    };
} & {
    "/drill": {
        $get: {
            output: {
                no: string;
                date: string;
                source: string;
                desc: string;
                debit: number;
                credit: number;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
}, "/", "/drill">;
