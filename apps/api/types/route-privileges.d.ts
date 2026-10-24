import type { MiddlewareHandler } from 'hono';
import type { AuthEnv } from './auth';
import type { Db } from './db';
import { ACTIONS } from './access/service';
/** No session needed. */
export declare const PUBLIC_ROUTES: string[];
/** Any signed-in user: who am I, and the API reference (ADR-0020). */
export declare const SESSION_ROUTES: string[];
/** Not in the privilege catalog (Manufaktur Demo has no such menu): only users with full access. */
export declare const FULL_ACCESS = "full_access";
type Action = (typeof ACTIONS)[number];
/** A catalog key, or per `{a|b}` path value (joined with '/' when a route has two) a catalog key. */
type Entry = string | Record<string, string>;
export declare const ROUTE_PRIVILEGES: Record<string, Entry>;
/** The key and action a request needs: the method's action when the key has it, else Aktif (else Buat for a GET). Undefined = not mapped (deny). */
export declare function requiredPrivilege(method: string, route: string, path: string): {
    key: string;
    action: Action;
} | undefined;
/** 403 unless the user has full access or one of their groups grants the route's key and action. */
export declare const requirePrivilege: (db: Db) => MiddlewareHandler<AuthEnv>;
export {};
