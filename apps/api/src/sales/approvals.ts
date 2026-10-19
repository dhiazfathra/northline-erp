import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'

export type TxType = 'SI' | 'SQ' | 'DO' | 'SO'
export type Mode = 'ONEOFUSER' | 'TWOOFUSER' | 'ALLUSER' | 'ALLUSERRANDOM'

export async function saveApprovalRule(db: Db, r: { transactionType: TxType; minAmount: number; approvers: string[]; mode?: Mode }) {
  const [row] = await db.execute(sql`INSERT INTO approval_rules (transaction_type, min_amount, approvers, mode)
    VALUES (${r.transactionType}, ${Math.round(r.minAmount * 100)}, ARRAY[${sql.join(r.approvers.map(a => sql`${a}`), sql`, `)}]::text[], ${r.mode ?? 'ONEOFUSER'}) RETURNING id`)
  return { id: Number(row!.id) }
}

/**
 * Submits a saved document for approval (Accurate's saveAsStatusType UNAPPROVED). No matching rule (amount below every
 * rule's minimum) or a requester who is one of the approvers: approved at once with no approver steps, as Retail Demo does.
 */
export async function submitForApproval(db: Db, d: { transactionType: TxType; number: string; date: string; amount: number; requestedBy: string }) {
  return db.transaction(async tx => {
    const rules = await tx.execute(sql`SELECT approvers FROM approval_rules WHERE transaction_type = ${d.transactionType} AND min_amount <= ${Math.round(d.amount * 100)} ORDER BY min_amount DESC LIMIT 1`)
    const approvers = (rules[0]?.approvers as string[] | undefined) ?? []
    const status = approvers.length === 0 || approvers.includes(d.requestedBy) ? 'APPROVED' : 'UNAPPROVED'
    await tx.execute(sql`INSERT INTO document_approvals VALUES (${d.transactionType}, ${d.number}, ${d.date}, ${d.requestedBy}, ${status})`)
    if (status === 'UNAPPROVED') for (const a of approvers) await tx.execute(sql`INSERT INTO approval_steps (transaction_type, number, approver) VALUES (${d.transactionType}, ${d.number}, ${a})`)
    return { status }
  })
}

/** One approver's decision. Rejection by any approver rejects the document; approval completes it once the rule's mode is met. */
export async function decide(db: Db, d: { transactionType: TxType; number: string; approver: string; approve: boolean; date: string; reason?: string }) {
  return db.transaction(async tx => {
    const [doc] = await tx.execute(sql`SELECT status FROM document_approvals WHERE transaction_type = ${d.transactionType} AND number = ${d.number} FOR UPDATE`)
    if (!doc || doc.status !== 'UNAPPROVED') throw new DomainError(`${d.number} tidak menunggu persetujuan`)
    const upd = await tx.execute(sql`UPDATE approval_steps SET status = ${d.approve ? 'APPROVED' : 'REJECTED'}, decided_on = ${d.date}, reason = ${d.reason ?? ''}
      WHERE transaction_type = ${d.transactionType} AND number = ${d.number} AND approver = ${d.approver} AND status = 'UNAPPROVED' RETURNING 1`)
    if (upd.length === 0) throw new DomainError(`${d.approver} bukan penyetuju ${d.number}`)
    const steps = await tx.execute(sql`SELECT status FROM approval_steps WHERE transaction_type = ${d.transactionType} AND number = ${d.number}`)
    const [rule] = await tx.execute(sql`SELECT mode FROM approval_rules WHERE transaction_type = ${d.transactionType} ORDER BY min_amount DESC LIMIT 1`)
    const approved = steps.filter(s => s.status === 'APPROVED').length
    const need = { ONEOFUSER: 1, TWOOFUSER: 2, ALLUSER: steps.length, ALLUSERRANDOM: steps.length }[(rule?.mode as Mode) ?? 'ONEOFUSER']
    const status = !d.approve ? 'REJECTED' : approved >= Math.min(need, steps.length) ? 'APPROVED' : 'UNAPPROVED'
    await tx.execute(sql`UPDATE document_approvals SET status = ${status} WHERE transaction_type = ${d.transactionType} AND number = ${d.number}`)
    return { status }
  })
}
