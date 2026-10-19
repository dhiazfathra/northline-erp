# ADR-0033: Generic modules in core, client-specific code in per-client extensions

## Status
Proposed (2026-10-19), awaiting the owner's review. Driven by the co-build model in
`docs/business/v2-enterprise-custom/northline-enterprise-brief.md`.

## Date
2026-10-19

## Context
The enterprise plan sells co-builds. A client pays a discounted price for a new module, Northline keeps the generic
module's copyright, and Northline resells it as a catalog pack to the next company in that industry. The client keeps its
data, configuration and client-specific extensions.

That promise only holds if the code keeps the two apart. If a client's rules, names or fixtures sit in core, resale leaks
them to a competitor. Per-client forks avoid the leak, but a fix then has to be merged into every fork.

ADR-0031 already separates "what a company is" (a business profile plus settings the code reads) from the code itself.
ADR-0032 already gives each client its own deployment.

## Decision
- **Generic behaviour goes into core** (`apps/api/src/<module>`), switched on by a business-profile feature setting
  (ADR-0031). It has no client names, client data or production-derived fixtures. Test fixtures are synthetic.
- **Client-specific behaviour lives in a per-client extension**, kept in a separate private repository per client. That
  covers configuration, chart-of-accounts and report-layout templates, integrations, and hooks registered through
  defined extension points. Core never imports from an extension.
- **Every co-build ends with a generalization pass** before it counts as done:
  1. Strip client specifics.
  2. Add the profile setting.
  3. Add synthetic acceptance tests.
  4. Add a catalog entry.

  Estimates include this pass.
- **Each client instance (ADR-0032) deploys a core version plus that client's extension.**

## Alternatives Considered

### Fork the repository per client
- Pros: total freedom per client, no extension design needed
- Cons: every fix and migration is merged N times; resale means extracting code from a fork
- Rejected: turns the product into a software house's archive of one-offs

### Everything in core, branching on client
- Pros: simplest to write
- Cons: client rules ship to every other client; the IP line in the contract can't be shown in the code
- Rejected: breaks the co-build terms and the "none of your data enters the product" promise

### Runtime plugin marketplace
- Pros: clean isolation, third parties could build modules
- Cons: a plugin API, sandboxing and versioning before there is a second client
- Rejected for now: revisit once there are several extensions to learn the extension points from

## Consequences
- Extension points don't exist yet. The first co-build has to define the few it needs (posting hooks, report
  layouts, import mappings) instead of designing a general system up front.
- Co-build estimates grow by the generalization pass (assume 15–20% more hours). The co-build discount pays for it.
- The co-build MSA can point to a concrete boundary: core belongs to Northline, `clients/<code>` belongs to the client.
- Resale becomes a configuration change (enable the profile setting), not a code extraction.
