import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'

/**
 * Manual bank reconciliation of one book entry (a sales receipt into a cash/bank account): Accurate creates the
 * rekening-koran line from the book entry and marks both reconciled (docs/reports/BankReconcileBookToStatementReport.md).
 */
export async function reconcileBankEntry(db: Db, r: { bank: string; document: string; statementDate: string; statementDescription: string; by: string; /** day the reconciliation was done (default now) */ reconciledAt?: string }) {
  const [doc] = await db.execute(sql`SELECT bank_no FROM sales_receipts WHERE number = ${r.document}`)
  if (!doc) throw new DomainError(`Transaksi ${r.document} tidak ditemukan`)
  if (doc.bank_no !== r.bank) throw new DomainError(`${r.document} bukan transaksi akun ${r.bank}`)
  await db.execute(sql`INSERT INTO bank_reconciliations (bank_no, doc_number, statement_date, statement_description, reconciled_by, created_at)
    VALUES (${r.bank}, ${r.document}, ${r.statementDate}, ${r.statementDescription}, ${r.by}, COALESCE(${r.reconciledAt ?? null}::timestamptz, now()))`)
}
