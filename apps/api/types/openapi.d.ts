import type { Hono } from 'hono';
/**
 * OpenAPI 3.1 document derived from the live route table (ADR-0020), so it can never list a route that doesn't exist.
 * Paths and methods only: request/response schemas live in @northline/schemas and are not mirrored here.
 */
export declare function openApiSpec(app: Hono<any>, prefix?: string): {
    openapi: string;
    info: {
        title: string;
        version: string;
    };
    paths: Record<string, Record<string, object>>;
};
