# ADR-0028: Approval workflow (Penyetuju Transaksi) as approval state beside the document

## Status
Accepted 2026-10-19

## Context
`ApprovalListReport` (Laporan Rincian Penyetuju Transaksi) was blocked on an approval workflow. Probing the Retail Demo
sandbox (NL-RF, 2046, `docs/reports/fixtures/retail/approval-rf.json`) showed how Accurate models it:

- Rules live in Penyetuju Transaksi (`accurate__company__user-approval`, `save-user-approval.do`): transaction type
  (Retail Demo offers Faktur Penjualan SI, Penawaran SQ, Pengiriman DO, Pesanan SO), a minimum amount or discount,
  optional requesters and branches, approvers (users or access groups) and a mode: `ONEOFUSER`, `TWOOFUSER`,
  `ALLUSER` (in order), `ALLUSERRANDOM`.
- Documents carry `approvalStatus` (`DRAFT`, `UNAPPROVED`, `APPROVED`, `REJECTED`) and `approvalDetailList`. A form
  saves with `saveAsStatusType` `DRAFT` or `UNAPPROVED` (submit); approvers call `approve-<doc>.do {id}` or
  `reject-<doc>.do {id, rejectionReason}`.
- When the requester is one of the approvers the document is approved at once, with an empty `approvalDetailList`, and
  the report prints nothing for it. The sandbox has a single user, so every NL-RF document went straight to APPROVED:
  approve, reject and pending could not be observed.

## Decision
- `approval_rules` (type, min amount, approvers, mode), `document_approvals` keyed by (type, number) with date,
  requester and status, `approval_steps` per approver with status, decision date and reason. Migration 0046.
- Approval state sits beside the document, not in the ledger: approval does not post. Documents are referenced by
  (type, number) without foreign keys so any document type can join later.
- `submitForApproval` picks the rule with the highest minimum at or below the amount; no rule or requester-is-approver
  approves at once with no steps. `decide` rejects on any rejection and approves once the mode's count is met.
- Report `approvalList` (`apps/api/src/reports/approvals.ts`, `GET /reports/approvals`) prints documents with steps only.

## Consequences
- Verified against Accurate: rule matching, auto-approval of a requester-approver and the empty report layout.
- Unverified: the populated report block layout, status labels and date format; ALLUSER ordering is not enforced;
  discount-based rules, requester and branch filters are not modelled. Recapture when the sandbox has a second user.
- Not built: HTTP endpoints to submit/approve/reject and wiring into the sales document services.
