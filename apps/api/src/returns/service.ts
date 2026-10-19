import { sql } from 'drizzle-orm'
import { returnInput, type ReturnInput } from '@northline/schemas/sales'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { addMove, costingMethod, fifoCost, layers, loadMoves } from '../inventory/fifo'
import { merge, nextNumber, period } from '../sales/service'

// Retur Penjualan / Retur Pembelian against one invoice, as posted by the sandbox (fixtures/returns-t6.json):
// sales return  Dr item sales-return account / Cr receivable; stock back at the latest purchase unit cost (Dr Persediaan / Cr HPP).
// purchase return Dr payable at the invoice price / Cr Persediaan at FIFO cost / Cr (or Dr) HPP for the difference.

const rupiah = (c: number) => (c / 100).toFixed(2)
type Line = { account: string; side: 'DEBIT' | 'CREDIT'; amount: number }
const lines = (ls: Line[]) => ls.filter(l => l.amount).map(l => ({ account: l.account, side: l.side, amount: rupiah(l.amount) }))

async function returned(tx: Tx, table: 'sales_return_lines' | 'purchase_return_lines', parent: 'sales_returns' | 'purchase_returns', invoice: string, item: string) {
  const [r] = await tx.execute(sql`SELECT COALESCE(SUM(l.quantity), 0) AS q FROM ${sql.raw(table)} l JOIN ${sql.raw(parent)} p ON p.number = l.return_number
    WHERE p.invoice_number = ${invoice} AND l.item_no = ${item}`)
  return Number(r!.q)
}

/** Latest purchase unit cost (cents) of an item up to `date` — the sandbox's cost for goods coming back from a customer. */
async function latestPurchaseCost(tx: Tx, item: string, date: string) {
  const [r] = await tx.execute(sql`SELECT value, quantity FROM stock_moves WHERE item_no = ${item} AND doc_type = 'PI' AND date <= ${date} ORDER BY date DESC, id DESC LIMIT 1`)
  if (!r) throw new DomainError(`Barang ${item} belum pernah dibeli; harga pokok retur tidak diketahui`)
  return Number(r.value) / Number(r.quantity)
}

export async function createSalesReturn(db: Db, input: ReturnInput) {
  const rt = returnInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${rt.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [inv] = await tx.execute(sql`SELECT i.customer_no, c.ar_account FROM sales_invoices i JOIN customers c ON c.no = i.customer_no WHERE i.number = ${rt.invoice}`)
    if (!inv) throw new DomainError(`Faktur ${rt.invoice} tidak ditemukan`)
    const number = rt.number ?? await nextNumber(tx, `SRT.${period(rt.date)}`)
    const posting: Line[] = [], stockLines: Line[] = []
    let total = 0
    for (const l of rt.lines) {
      const [sold] = await tx.execute(sql`SELECT COALESCE(SUM(quantity), 0) AS q FROM sales_invoice_lines WHERE invoice_number = ${rt.invoice} AND item_no = ${l.item}`)
      if (l.qty + await returned(tx, 'sales_return_lines', 'sales_returns', rt.invoice, l.item) > Number(sold!.q)) throw new DomainError(`Retur ${l.item} melebihi kuantitas faktur`)
      const [it] = await tx.execute(sql`SELECT type, sales_return_account, sales_account, inventory_account, cogs_account FROM items WHERE no = ${l.item}`)
      const t = Math.round(l.qty * l.price); total += t
      posting.push({ account: (it!.sales_return_account ?? it!.sales_account) as string, side: 'DEBIT', amount: t })
      if (it!.type === 'INVENTORY') {
        const cost = Math.round(l.qty * await latestPurchaseCost(tx, l.item, rt.date))
        stockLines.push({ account: it!.inventory_account as string, side: 'DEBIT', amount: cost }, { account: it!.cogs_account as string, side: 'CREDIT', amount: cost })
        await addMove(tx, { item: l.item, date: rt.date, docType: 'SRT', docNumber: number, description: rt.description, quantity: l.qty, value: cost })
      }
    }
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${rt.idempotencyKey}:journal`, journalId, number, sourceType: 'SRT', date: rt.date, description: rt.description,
      lines: lines([...merge(posting.map(p => ({ account: p.account, amount: p.amount }))).map(p => ({ ...p, side: 'DEBIT' as const })),
        { account: inv.ar_account as string, side: 'CREDIT', amount: total }, ...stockLines]),
    })
    await tx.execute(sql`INSERT INTO sales_returns (number, customer_no, invoice_number, date, description, total, journal_id)
      VALUES (${number}, ${inv.customer_no}, ${rt.invoice}, ${rt.date}, ${rt.description}, ${total}, ${journalId})`)
    for (const [i, l] of rt.lines.entries())
      await tx.execute(sql`INSERT INTO sales_return_lines (return_number, seq, item_no, quantity, unit_price, total, invoice_seq) VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty}, ${l.price}, ${Math.round(l.qty * l.price)}, ${l.invoiceSeq ?? null})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${rt.idempotencyKey}, 'CreateSalesReturn', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

export async function createPurchaseReturn(db: Db, input: ReturnInput) {
  const rt = returnInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${rt.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [inv] = await tx.execute(sql`SELECT i.vendor_no, v.ap_account FROM purchase_invoices i JOIN vendors v ON v.no = i.vendor_no WHERE i.number = ${rt.invoice}`)
    if (!inv) throw new DomainError(`Faktur ${rt.invoice} tidak ditemukan`)
    const number = rt.number ?? await nextNumber(tx, `PRT.${period(rt.date)}`)
    const credits: Line[] = []
    let total = 0
    for (const l of rt.lines) {
      const [bought] = await tx.execute(sql`SELECT COALESCE(SUM(quantity), 0) AS q FROM purchase_invoice_lines WHERE invoice_number = ${rt.invoice} AND item_no = ${l.item}`)
      if (l.qty + await returned(tx, 'purchase_return_lines', 'purchase_returns', rt.invoice, l.item) > Number(bought!.q)) throw new DomainError(`Retur ${l.item} melebihi kuantitas faktur`)
      const [it] = await tx.execute(sql`SELECT type, inventory_account, cogs_account, expense_account FROM items WHERE no = ${l.item}`)
      const t = Math.round(l.qty * l.price); total += t
      if (it!.type !== 'INVENTORY') { credits.push({ account: it!.expense_account as string, side: 'CREDIT', amount: t }); continue }
      const cost = fifoCost(layers(await loadMoves(tx, l.item, rt.date), await costingMethod(tx)), l.qty)
      credits.push({ account: it!.cogs_account as string, side: t >= cost ? 'CREDIT' : 'DEBIT', amount: Math.abs(t - cost) }, { account: it!.inventory_account as string, side: 'CREDIT', amount: cost })
      await addMove(tx, { item: l.item, date: rt.date, docType: 'PRT', docNumber: number, description: rt.description, quantity: -l.qty, value: -cost })
    }
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${rt.idempotencyKey}:journal`, journalId, number, sourceType: 'PRT', date: rt.date, description: rt.description,
      lines: lines([{ account: inv.ap_account as string, side: 'DEBIT', amount: total }, ...credits]),
    })
    await tx.execute(sql`INSERT INTO purchase_returns (number, vendor_no, invoice_number, date, description, total, journal_id)
      VALUES (${number}, ${inv.vendor_no}, ${rt.invoice}, ${rt.date}, ${rt.description}, ${total}, ${journalId})`)
    for (const [i, l] of rt.lines.entries())
      await tx.execute(sql`INSERT INTO purchase_return_lines (return_number, seq, item_no, quantity, unit_price, total) VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty}, ${l.price}, ${Math.round(l.qty * l.price)})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${rt.idempotencyKey}, 'CreatePurchaseReturn', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
