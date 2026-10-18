import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { nextNumber, period } from '../sales/service'

// Pembayaran / Penerimaan (fixtures/cash-bank-t18.json): number <bank>.yyyy.mm.nnnnn; payment Dr accounts / Cr bank, deposit Dr bank / Cr accounts.
export async function createCashDocument(db: Db, d: { idempotencyKey: string; kind: 'PAY' | 'DEP'; number?: string; bank: string; date: string; chequeNo?: string; description?: string; lines: { account: string; amount: number; notes?: string }[] }) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [bank] = await tx.execute(sql`SELECT type FROM accounts WHERE no = ${d.bank}`)
    if (bank?.type !== 'CASH_BANK') throw new DomainError(`${d.bank} bukan akun Kas & Bank`)
    const lines = d.lines.map(l => ({ ...l, cents: Math.round(l.amount * 100) })), total = lines.reduce((s, l) => s + l.cents, 0)
    const number = d.number ?? await nextNumber(tx, `${d.bank}.${period(d.date)}`)
    const rp = (c: number) => (c / 100).toFixed(2), pay = d.kind === 'PAY'
    const journalId = crypto.randomUUID()
    const bankLine = { account: d.bank, side: (pay ? 'CREDIT' : 'DEBIT') as 'CREDIT' | 'DEBIT', amount: rp(total) }
    const others = lines.map(l => ({ account: l.account, side: (pay ? 'DEBIT' : 'CREDIT') as 'CREDIT' | 'DEBIT', amount: rp(l.cents) }))
    await handleTx(tx, { type: 'PostJournal', idempotencyKey: `${d.idempotencyKey}:journal`, journalId, number, sourceType: pay ? 'OP' : 'OD', date: d.date, description: d.description ?? '',
      lines: pay ? [...others, bankLine] : [bankLine, ...others] })
    await tx.execute(sql`INSERT INTO cash_documents VALUES (${number}, ${d.kind}, ${d.bank}, ${d.date}, ${d.chequeNo ?? ''}, ${d.description ?? ''}, ${total}, ${journalId})`)
    for (const [i, l] of lines.entries()) await tx.execute(sql`INSERT INTO cash_document_lines VALUES (${number}, ${i + 1}, ${l.account}, ${l.cents}, ${l.notes ?? ''})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${d.idempotencyKey}, 'CreateCashDocument', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
