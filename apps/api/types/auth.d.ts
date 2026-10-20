import { type MiddlewareHandler } from 'hono';
import type { Db } from './db';
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, stored: string): Promise<any>;
/** New users have no privileges (ADR-0040) unless fullAccess; grant them through an access group. */
export declare function createUser(db: Db, email: string, password: string, fullAccess?: boolean): Promise<void>;
export type AuthEnv = {
    Variables: {
        userId: number;
    };
};
export declare function authRoutes(db: Db): import("hono/hono-base").HonoBase<AuthEnv, {
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
                error: string;
            };
            outputFormat: "json";
            status: 429;
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
}, "/", "/logout">;
export declare const requireSession: (db: Db) => MiddlewareHandler<AuthEnv>;
