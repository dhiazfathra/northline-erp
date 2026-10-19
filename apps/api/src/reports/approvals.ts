import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { fmtDate, fmtHeaderDate } from './general-ledger'

export type ApprovalDoc = { type: string; number: string; date: string; requestedBy: string; status: string; steps: { approver: string; status: string; decidedOn: string | null }[] }
const STATUS: Record<string, string> = { UNAPPROVED: 'Belum Disetujui', APPROVED: 'Disetujui', REJECTED: 'Ditolak' }

/**
 * Laporan Rincian Penyetuju Transaksi (ApprovalListReport), docs/reports/ApprovalListReport.md. Only documents that went
 * through approvers print (an auto-approved document has none, and Accurate prints nothing for it). With none, the
 * template header lines print empty: the only layout verified against Accurate.
 * shortcut: block layout for documents with approvers is unverified (one-user sandbox cannot create them); recapture when a second user exists.
 */
export function approvalList(docs: ApprovalDoc[], from: string, to: string): string[][] {
  const shown = docs.filter(d => d.steps.length > 0 && d.date >= from && d.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number))
  const head = [['Laporan Rincian Penyetuju Transaksi'], [`Dari ${fmtHeaderDate(from)} s/d ${fmtHeaderDate(to)}`]]
  if (shown.length === 0) return [...head, ['Transaksi', ':', 'Status', ':'], ['Pemohon', ':'], ['Penyetuju', 'Status', 'Tgl Disetujui']]
  return [...head, ...shown.flatMap(d => [
    ['Transaksi', ':', d.number, 'Status', ':', STATUS[d.status]!], ['Pemohon', ':', d.requestedBy], ['Penyetuju', 'Status', 'Tgl Disetujui'],
    ...d.steps.map(s => [s.approver, STATUS[s.status]!, ...(s.decidedOn ? [fmtDate(s.decidedOn)] : [])]),
  ])]
}

export async function loadApprovals(db: Db): Promise<ApprovalDoc[]> {
  const docs = await db.execute(sql`SELECT transaction_type, number, to_char(date, 'YYYY-MM-DD') AS date, requested_by, status FROM document_approvals`)
  const steps = await db.execute(sql`SELECT transaction_type, number, approver, status, to_char(decided_on, 'YYYY-MM-DD') AS decided_on FROM approval_steps ORDER BY approver`)
  return docs.map(d => ({ type: d.transaction_type as string, number: d.number as string, date: d.date as string, requestedBy: d.requested_by as string, status: d.status as string,
    steps: steps.filter(s => s.transaction_type === d.transaction_type && s.number === d.number)
      .map(s => ({ approver: s.approver as string, status: s.status as string, decidedOn: (s.decided_on as string | null) ?? null })) }))
}
