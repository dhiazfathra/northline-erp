import { afterAll, beforeAll, expect, test } from 'bun:test'
import rf from '../../../docs/reports/fixtures/retail/approval-rf.json'
import { approvalList, loadApprovals } from '../src/reports/approvals'
import { decide, saveApprovalRule, submitForApproval } from '../src/sales/approvals'
import { fixtureDb } from './fixture-db'

// Retail Demo, NL-RF documents (fixtures/retail/approval-rf.json, ADR-0028). The sandbox has one user, so every NL-RF
// document was approved at once (requester = approver) and the report printed only its empty template.
let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('appr')
  await saveApprovalRule(f.db, rf.rule as any)
  for (const d of rf.documents) await submitForApproval(f.db, { transactionType: 'SO', number: d.number, date: d.date, amount: d.amount, requestedBy: d.requestedBy })
})
afterAll(() => f.close())

const chrome = (rows: string[][]) => rows.filter(r => !/^(ACCURATE Accounting|Tercetak pada|Halaman )/.test(r[0]!))

test('requester who is an approver: approved at once, no approver steps', async () => {
  const docs = await loadApprovals(f.db)
  expect(docs.map(d => [d.number, d.status, d.steps.length])).toEqual(rf.documents.map(d => [d.number, d.approvalStatus, d.approvalDetailList.length]))
})
test('ApprovalListReport 2046 (empty layout)', async () => {
  expect(approvalList(await loadApprovals(f.db), '2046-01-01', '2046-12-31')).toEqual(chrome(rf.reports.ApprovalListReport.rows))
})
test('approve, reject, pending (other requester; not verifiable in the one-user sandbox)', async () => {
  for (const [n, day] of [['NL-RF-T1', 13], ['NL-RF-T2', 14], ['NL-RF-T3', 15]] as const)
    expect((await submitForApproval(f.db, { transactionType: 'SO', number: n, date: `2046-01-${day}`, amount: 1e9, requestedBy: 'other' })).status).toBe('UNAPPROVED')
  expect((await decide(f.db, { transactionType: 'SO', number: 'NL-RF-T1', approver: 'nl-tester', approve: true, date: '2046-01-20' })).status).toBe('APPROVED')
  expect((await decide(f.db, { transactionType: 'SO', number: 'NL-RF-T2', approver: 'nl-tester', approve: false, date: '2046-01-21', reason: 'x' })).status).toBe('REJECTED')
  await expect(decide(f.db, { transactionType: 'SO', number: 'NL-RF-T1', approver: 'nl-tester', approve: true, date: '2046-01-22' })).rejects.toThrow()
  expect((await submitForApproval(f.db, { transactionType: 'SO', number: 'NL-RF-T4', date: '2046-01-16', amount: 1, requestedBy: 'other' })).status).toBe('APPROVED')
  expect(approvalList(await loadApprovals(f.db), '2046-01-01', '2046-12-31').slice(2)).toEqual([
    ['Transaksi', ':', 'NL-RF-T1', 'Status', ':', 'Disetujui'], ['Pemohon', ':', 'other'], ['Penyetuju', 'Status', 'Tgl Disetujui'], ['nl-tester', 'Disetujui', '20 Jan 2046'],
    ['Transaksi', ':', 'NL-RF-T2', 'Status', ':', 'Ditolak'], ['Pemohon', ':', 'other'], ['Penyetuju', 'Status', 'Tgl Disetujui'], ['nl-tester', 'Ditolak', '21 Jan 2046'],
    ['Transaksi', ':', 'NL-RF-T3', 'Status', ':', 'Belum Disetujui'], ['Pemohon', ':', 'other'], ['Penyetuju', 'Status', 'Tgl Disetujui'], ['nl-tester', 'Belum Disetujui'],
  ])
})
