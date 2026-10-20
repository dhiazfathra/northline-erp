import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { merge, nextNumber, period } from '../sales/service'
import { addMove, costingMethod, costOut, layers, loadMoves } from './fifo'

// Penyesuaian Persediaan (fixtures/adjustment-t10.json): increases at the given unit cost, decreases at FIFO cost,
// offset to the chosen adjustment account. Journal type "Penyesuaian Persediaan", number IA.yyyy.mm.nnnnn.
const input = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), date: z.string(), description: z.string().default(''), account: z.string(),
  lines: z.array(z.object({ item: z.string(), direction: z.enum(['IN', 'OUT']), qty: z.number().positive(), unitCost: z.number().nonnegative().default(0) })).min(1, 'Detail dari transaksi belum diisi!'), // Accurate's text
})
const rp = (c: number) => (c / 100).toFixed(2)

export async function createItemAdjustment(db: Db | Tx, raw: z.input<typeof input>) {
  const a = input.parse(raw)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${a.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const number = a.number ?? await nextNumber(tx, `IA.${period(a.date)}`)
    const costed: { item: string; dir: 'IN' | 'OUT'; qty: number; cost: number; exact: number; inv: string }[] = []
    for (const l of a.lines) {
      const [it] = await tx.execute(sql`SELECT inventory_account FROM items WHERE no = ${l.item} AND type = 'INVENTORY'`)
      if (!it) throw new Error(`Barang persediaan ${l.item} tidak ditemukan`)
      const m = await costingMethod(tx)
      const exact = l.direction === 'IN' ? Math.round(l.qty * l.unitCost * 100) : costOut(layers(await loadMoves(tx, l.item, a.date), m), l.qty, m)
      costed.push({ item: l.item, dir: l.direction, qty: l.qty, cost: Math.round(exact), exact, inv: it.inventory_account as string })
    }
    const ins = costed.filter(c => c.dir === 'IN'), outs = costed.filter(c => c.dir === 'OUT')
    const sum = (xs: typeof costed) => xs.reduce((s, c) => s + c.cost, 0)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${a.idempotencyKey}:journal`, journalId, number, sourceType: 'IA', date: a.date, description: a.description,
      lines: [
        ...merge(ins.map(c => ({ account: c.inv, amount: c.cost }))).map(l => ({ account: l.account, side: 'DEBIT' as const, amount: rp(l.amount) })),
        ...(sum(ins) ? [{ account: a.account, side: 'CREDIT' as const, amount: rp(sum(ins)) }] : []),
        ...(sum(outs) ? [{ account: a.account, side: 'DEBIT' as const, amount: rp(sum(outs)) }] : []),
        ...merge(outs.map(c => ({ account: c.inv, amount: c.cost }))).map(l => ({ account: l.account, side: 'CREDIT' as const, amount: rp(l.amount) })),
      ],
    })
    await tx.execute(sql`INSERT INTO item_adjustments VALUES (${number}, ${a.date}, ${a.description}, ${a.account}, ${sum(costed)}, ${journalId})`)
    for (const [i, c] of costed.entries()) {
      await tx.execute(sql`INSERT INTO item_adjustment_lines VALUES (${number}, ${i + 1}, ${c.item}, ${c.dir}, ${c.qty}, ${c.cost})`)
      await addMove(tx, { item: c.item, date: a.date, docType: 'IA', docNumber: number, description: a.description, quantity: c.dir === 'IN' ? c.qty : -c.qty, value: c.dir === 'IN' ? c.exact : -c.exact })
    }
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${a.idempotencyKey}, 'CreateItemAdjustment', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

async function removeItemAdjustment(tx: Tx, number: string, idempotencyKey: string) {
  const [ia] = await tx.execute(sql`SELECT journal_id FROM item_adjustments WHERE number = ${number} FOR UPDATE`)
  if (!ia) throw new DomainError(`Penyesuaian ${number} tidak ditemukan`)
  await tx.execute(sql`DELETE FROM item_adjustment_lines WHERE adjustment_number = ${number}`)
  await tx.execute(sql`DELETE FROM stock_moves WHERE doc_type = 'IA' AND doc_number = ${number}`)
  await tx.execute(sql`DELETE FROM item_adjustments WHERE number = ${number}`)
  await handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${idempotencyKey}:unpost`, journalId: ia.journal_id as string })
}

export async function deleteItemAdjustment(db: Db, number: string, idempotencyKey: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeItemAdjustment(tx, number, idempotencyKey)
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, 'DeleteItemAdjustment', ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}

/** Edited in place under the same number, as Accurate does: taken back and saved again. */
export async function editItemAdjustment(db: Db, number: string, raw: z.input<typeof input>) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${raw.idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeItemAdjustment(tx, number, raw.idempotencyKey)
    return createItemAdjustment(tx, { ...raw, number: raw.number ?? number })
  })
}

export const TRANSIT = 'Transit (AOL System)'
/** Pemindahan Barang: Kirim (OUT) moves stock into the transit warehouse, Terima (IN) out of it. No journal, no value.
 *  A receipt names its send (`from`); serial/batch numbers move with their line (ADR-0024). */
const transferInput = z.object({
  idempotencyKey: z.string().min(8).optional(), number: z.string().optional(), date: z.string(), direction: z.enum(['OUT', 'IN']), warehouse: z.string(), referenceWarehouse: z.string(),
  description: z.string().optional(), from: z.string().optional(),
  lines: z.array(z.object({ item: z.string(), qty: z.number().positive(), serials: z.array(z.object({ no: z.string(), qty: z.number() })).optional() })).min(1, 'Detail dari transaksi belum diisi!'), // Accurate's text
})
export async function createItemTransfer(db: Db | Tx, raw: z.input<typeof transferInput>) {
  const t = transferInput.parse(raw)
  return db.transaction(async tx => {
    if (t.idempotencyKey) { const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${t.idempotencyKey}`); if (done) return done.result as { number: string } }
    const number = t.number ?? await nextNumber(tx, `IT.${period(t.date)}`)
    await tx.execute(sql`INSERT INTO item_transfers (number, date, direction, warehouse, reference_warehouse, description, from_number)
      VALUES (${number}, ${t.date}, ${t.direction}, ${t.warehouse}, ${t.referenceWarehouse}, ${t.description ?? ''}, ${t.from ?? null})`)
    const desc = t.direction === 'OUT' ? `Kirim ke ${t.referenceWarehouse}` : `Terima dari ${t.referenceWarehouse}`
    const [from, to] = t.direction === 'OUT' ? [t.warehouse, TRANSIT] : [TRANSIT, t.warehouse]
    for (const [i, l] of t.lines.entries()) {
      await tx.execute(sql`INSERT INTO item_transfer_lines VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty})`)
      await addMove(tx, { item: l.item, date: t.date, docType: 'IT', docNumber: number, description: desc, quantity: -l.qty, value: 0, warehouse: from })
      await addMove(tx, { item: l.item, date: t.date, docType: 'IT', docNumber: number, description: desc, quantity: l.qty, value: 0, warehouse: to })
      for (const s of l.serials ?? []) for (const [w, q] of [[from, -s.qty], [to, s.qty]] as const)
        await tx.execute(sql`INSERT INTO serial_numbers (item_no, serial, date, doc_type, doc_number, quantity, warehouse) VALUES (${l.item}, ${s.no}, ${t.date}, 'IT', ${number}, ${q}, ${w})`)
    }
    if (t.idempotencyKey) await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${t.idempotencyKey}, 'CreateItemTransfer', ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}

async function removeItemTransfer(tx: Tx, number: string) {
  const [it] = await tx.execute(sql`SELECT 1 FROM item_transfers WHERE number = ${number} FOR UPDATE`)
  if (!it) throw new DomainError(`Pemindahan ${number} tidak ditemukan`)
  const [received] = await tx.execute(sql`SELECT 1 FROM item_transfers WHERE from_number = ${number} LIMIT 1`)
  if (received) throw new DomainError(`Pemindahan ${number} sudah dipakai transaksi lain`)
  await tx.execute(sql`DELETE FROM item_transfer_lines WHERE transfer_number = ${number}`)
  await tx.execute(sql`DELETE FROM serial_numbers WHERE doc_type = 'IT' AND doc_number = ${number}`)
  await tx.execute(sql`DELETE FROM stock_moves WHERE doc_type = 'IT' AND doc_number = ${number}`)
  await tx.execute(sql`DELETE FROM item_transfers WHERE number = ${number}`)
}

export async function deleteItemTransfer(db: Db, number: string, idempotencyKey: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeItemTransfer(tx, number)
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, 'DeleteItemTransfer', ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}

/** Edited in place under the same number, as Accurate does: taken back and saved again. */
export async function editItemTransfer(db: Db, number: string, raw: z.input<typeof transferInput> & { idempotencyKey: string }) {
  const t = transferInput.parse(raw)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${raw.idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeItemTransfer(tx, number)
    return createItemTransfer(tx, { ...t, number: t.number ?? number })
  })
}

/** Gudang master (Daftar Gudang). */
export async function upsertWarehouse(db: Db, w: { name: string; description?: string; street?: string; city?: string; province?: string; zipCode?: string; country?: string }) {
  await db.execute(sql`INSERT INTO warehouses VALUES (${w.name}, ${w.description ?? ''}, ${w.street ?? ''}, ${w.city ?? ''}, ${w.province ?? ''}, ${w.zipCode ?? ''}, ${w.country ?? ''})
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, street = EXCLUDED.street, city = EXCLUDED.city, province = EXCLUDED.province, zip_code = EXCLUDED.zip_code, country = EXCLUDED.country`)
}
