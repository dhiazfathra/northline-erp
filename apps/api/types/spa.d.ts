import type { Context } from 'hono';
/** Serves apps/web/dist embedded by scripts/embed-spa.ts; unknown paths get index.html for the client router. */
export declare function serveSpa(c: Context): Promise<Response>;
