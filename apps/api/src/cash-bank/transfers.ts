import { sql } from 'drizzle-orm'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { nextNumber, period } from '../sales/service'

// Transfer Bank (docs/parity/kas-bank/transfer-bank): Dr the destination / Cr the source, same currency only.
// shortcut: no foreign-currency rates or difference account; add them with a multi-currency bank transfer scenario.
type TransferInput = { idempotencyKey: string; number?: string; date: string; from?: string; to?: string; amount?: number; description?: string }
const isBank = async (tx: Tx, no: string) => (await tx.execute(sql`SELECT type FROM accounts WHERE no = ${no}`))[0]?.type === 'CASH_BANK'

export async function createBankTransfer(db: Db | Tx, d: TransferInput) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    // Accurate's texts, in the form's order (docs/parity/kas-bank/transfer-bank)
    if (!d.from) throw new DomainError('Dari Kas/Bank harus diisi')
    if (!d.to) throw new DomainError('Ke Kas/Bank harus diisi')
    if (!d.amount || d.amount <= 0) throw new DomainError('Nilai Transfer harus diisi')
    for (const b of [d.from, d.to]) if (!(await isBank(tx, b))) throw new DomainError(`${b} bukan akun Kas & Bank`)
    const number = d.number ?? await nextNumber(tx, `BT.${period(d.date)}`)
    const journalId = crypto.randomUUID(), cents = Math.round(d.amount * 100), rp = (cents / 100).toFixed(2)
    await handleTx(tx, { type: 'PostJournal', idempotencyKey: `${d.idempotencyKey}:journal`, journalId, number, sourceType: 'BT', date: d.date, description: d.description ?? '',
      lines: [{ account: d.to, side: 'DEBIT', amount: rp }, { account: d.from, side: 'CREDIT', amount: rp }] })
    await tx.execute(sql`INSERT INTO bank_transfers VALUES (${number}, ${d.from}, ${d.to}, ${d.date}, ${cents}, ${d.description ?? ''}, ${journalId})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${d.idempotencyKey}, 'CreateBankTransfer', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
async function remove(tx: Tx, number: string, key: string) {
  const [t] = await tx.execute(sql`DELETE FROM bank_transfers WHERE number = ${number} RETURNING journal_id`)
  if (!t) throw new DomainError(`Transfer Bank ${number} tidak ditemukan`)
  await handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${key}:unpost`, journalId: t.journal_id as string })
}
export async function deleteBankTransfer(db: Db, number: string, key: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${key}`)
    if (done) return done.result as { number: string }
    await remove(tx, number, key)
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${key}, 'DeleteBankTransfer', ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}
/** Edited in place under the same number. */
export async function editBankTransfer(db: Db, number: string, d: TransferInput) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    await remove(tx, number, d.idempotencyKey)
    return createBankTransfer(tx, { ...d, number: d.number ?? number })
  })
}
