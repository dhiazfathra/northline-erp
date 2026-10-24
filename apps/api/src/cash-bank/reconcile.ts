import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'

/**
 * Manual bank reconciliation of one book entry (a sales receipt into a cash/bank account): Accurate creates the
 * rekening-koran line from the book entry and marks both reconciled (docs/reports/BankReconcileBookToStatementReport.md).
 */
export async function reconcileBankEntry(db: Db, r: { bank: string; document: string; statementDate: string; statementDescription: string; by: string; /** day the reconciliation was done (default now) */ reconciledAt?: string }) {
  const [doc] = await db.execute(sql`SELECT bank_no FROM sales_receipts WHERE number = ${r.document}`)
  // any other document: its journal must post to the bank account (Rekonsiliasi Bank screen, ADR-0049)
  const banks = doc ? [doc.bank_no] : (await db.execute(sql`SELECT l.account_no FROM journals j JOIN journal_lines l USING (journal_id) WHERE j.number = ${r.document}`)).map(l => l.account_no)
  if (!banks.length) throw new DomainError(`Transaksi ${r.document} tidak ditemukan`)
  if (!banks.includes(r.bank)) throw new DomainError(`${r.document} bukan transaksi akun ${r.bank}`)
  // doc_number is UNIQUE: the conflict target makes a concurrent double reconcile a 409, not a 500
  const [ins] = await db.execute(sql`INSERT INTO bank_reconciliations (bank_no, doc_number, statement_date, statement_description, reconciled_by, created_at)
    VALUES (${r.bank}, ${r.document}, ${r.statementDate}, ${r.statementDescription}, ${r.by}, COALESCE(${r.reconciledAt ?? null}::timestamptz, now()))
    ON CONFLICT (doc_number) DO NOTHING RETURNING 1`)
  if (!ins) throw new DomainError(`${r.document} sudah direkonsiliasi`)
}
