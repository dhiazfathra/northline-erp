# Business briefs

Two versions of the Northline go-to-market plan. Each one is a self-contained page (`.html`) with a canonical Markdown
copy (`.md`). Both date from 2026-10-19 and assume Rp 18,000 per US$.

| Version | Folder | Buyer | Price | First revenue target |
|---|---|---|---|---|
| v1 Mid-market SaaS | [`v1-mid-market-saas/`](v1-mid-market-saas/northline-business-brief.md) | Companies with 20–300 staff leaving Accurate | Rp 15–35M setup + Rp 2.5–7.5M/month | Setup fee paid by 31 Jan 2027 |
| v2 Enterprise custom | [`v2-enterprise-custom/`](v2-enterprise-custom/northline-enterprise-brief.md) | Groups with 200–3,000 staff needing a tailor-made, AI-native ERP | Rp 290M–1B+ per project + 15–20%/year | Paid blueprint by 31 Jan 2027; project by 30 Apr 2027 |

Both share the same week 0 gate: employer consent, your own tools and a legal entity. They can also be combined: sell v2
projects and use v1's zero-diff Parallel Close as the migration step inside them.

Related decisions:
- [ADR-0032](../decisions/0032-dedicated-instance-per-customer.md): dedicated instance per customer (both versions)
- [ADR-0033](../decisions/0033-core-and-client-extensions.md): core and client extensions (v2)
