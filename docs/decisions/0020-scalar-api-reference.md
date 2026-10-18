# ADR-0020: Scalar API reference generated from the live route table

## Status
Accepted

## Date
2026-10-19

## Context
The API (`apps/api/src/app.ts`) has ~60 routes and no reference: anyone integrating had to read the Hono chain.
The web app gets types through `AppType` (Hono RPC), so a reference is for humans and outside callers, not the SPA.
Request bodies are validated with Zod schemas in `@northline/schemas` and inside services, not at the route.

## Decision
- Serve a [Scalar](https://scalar.com) API reference at `GET /api/docs`, reading `GET /api/openapi.json`
  (`@scalar/hono-api-reference`).
- Build the OpenAPI 3.1 document from Hono's own route table (`inspectRoutes` from `hono/dev`, `src/openapi.ts`):
  paths, methods, path parameters, and `:param{a|b}` alternatives as enums. It is built once, on first request.
- Both routes sit behind `requireSession` like the rest of `/api`: the route list is internal to the ERP.

## Alternatives Considered

### `@hono/zod-openapi` (route-level schemas)
- Pros: full request/response schemas in the reference
- Cons: rewrite every route as `createRoute(...)`; validation today lives in services, so schemas would be duplicated
- Rejected for now: high cost for ~60 routes; can be adopted route by route later and merged into the same document

### Hand-written `openapi.yaml`
- Pros: complete control, rich descriptions
- Cons: drifts from the code on every new route
- Rejected: a reference that lies is worse than a thin one

### Public docs (outside the session)
- Rejected: exposes the full ERP surface to unauthenticated visitors

## Consequences
- The reference can never list a route that doesn't exist, and new routes appear automatically.
- It carries no body or response schemas; readers still look at `@northline/schemas` for shapes.
- The Scalar page loads its script from the jsDelivr CDN; a strict `Content-Security-Policy` added later must allow it.
