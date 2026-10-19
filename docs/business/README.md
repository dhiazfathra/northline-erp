# Business briefs

Three versions of the Northline go-to-market plan. Each one is a self-contained page (`.html`) with a canonical Markdown
copy (`.md`). Both date from 2026-10-19 and assume Rp 18,000 per US$.

| Version | Folder | Buyer | Price | First revenue target |
|---|---|---|---|---|
| v1 Mid-market SaaS | [`v1-mid-market-saas/`](v1-mid-market-saas/northline-business-brief.md) | Companies with 20–300 staff leaving Accurate | Rp 15–35M setup + Rp 2.5–7.5M/month | Setup fee paid by 31 Jan 2027 |
| v2 Enterprise custom | [`v2-enterprise-custom/`](v2-enterprise-custom/northline-enterprise-brief.md) | Groups with 200–3,000 staff needing a tailor-made, AI-native ERP | Rp 290M–1B+ per project + 15–20%/year | Paid blueprint by 31 Jan 2027; project by 30 Apr 2027 |
| v3 Forward deployed engineer | [`v3-ai-fde/`](v3-ai-fde/northline-fde-brief.md) | Companies with 100–2,000 staff and lots of manual executor work | Rp 75–180M sprints, Rp 20–60M/month retainer, SaaS replacement at 50% of the cancelled bill | Workshop or diagnostic paid by 15 Dec 2026; sprint by 31 Jan 2027 |

All three share the same week 0 gate: employer consent, your own tools and a legal entity. They can also be combined.
Sell v2 projects and use v1's zero-diff Parallel Close as the migration step inside them. Or start with v3, which
earns soonest, and sell v2 ERP projects into its clients. v3 is based on two videos; timestamped notes are in
[`v3-ai-fde/video-notes.md`](v3-ai-fde/video-notes.md).

Related decisions:
- [ADR-0032](../decisions/0032-dedicated-instance-per-customer.md): dedicated instance per customer (all versions)
- [ADR-0033](../decisions/0033-core-and-client-extensions.md): core and client extensions (v2 co-builds, v3 agent and tool library)
