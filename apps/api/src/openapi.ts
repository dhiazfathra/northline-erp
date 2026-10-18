import type { Hono } from 'hono'
import { inspectRoutes } from 'hono/dev'

/**
 * OpenAPI 3.1 document derived from the live route table (ADR-0020), so it can never list a route that doesn't exist.
 * Paths and methods only: request/response schemas live in @northline/schemas and are not mirrored here.
 */
export function openApiSpec(app: Hono<any>, prefix = '') {
  const paths: Record<string, Record<string, object>> = {}
  for (const r of inspectRoutes(app)) {
    if (r.isMiddleware || r.method === 'ALL') continue
    const params: string[] = []
    // Hono `:name{regex}` → OpenAPI `{name}`; the regex alternatives become an enum
    const path = prefix + r.path.replace(/:(\w+)(\{([^}]*)\})?/g, (_, name: string) => (params.push(name), `{${name}}`))
    const enums = [...r.path.matchAll(/:(\w+)\{([^}]*)\}/g)].reduce<Record<string, string[]>>((m, [, n, re]) => (m[n!] = re!.split('|'), m), {})
    ;(paths[path] ??= {})[r.method.toLowerCase()] = {
      tags: [r.path.split('/')[1] ?? 'api'],
      parameters: params.map(name => ({ name, in: 'path', required: true, schema: enums[name] ? { type: 'string', enum: enums[name] } : { type: 'string' } })),
      responses: { 200: { description: 'OK' }, 401: { description: 'unauthenticated' }, 422: { description: 'validation' } },
    }
  }
  return { openapi: '3.1.0', info: { title: 'Northline ERP API', version: '1.0.0' }, paths }
}
