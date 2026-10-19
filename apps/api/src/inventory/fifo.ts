import { sql } from 'drizzle-orm'
import type { Tx } from '../db'
import { logActivity } from '../activity/log'
import { DomainError } from '../ledger/deciders'

// FIFO costing as the sandbox does it (fixtures/inventory-t4.json: S2 cost 2×10.000 + 5×13.000).
// shortcut: assumes documents are posted in date order; a back-dated movement would need re-costing later outs — add a re-cost job when edits/back-dating are allowed.

export interface Layer { date: string; qty: number; unitCost: number }

export type CostingMethod = 'FIFO' | 'AVERAGE'

/** Remaining layers from movements in (date, id) order. AVERAGE (moving average, ADR-0031) keeps one layer at
 * (value on hand) / (qty on hand); outbound moves carry their booked cost, so the value nets exactly. */
export function layers(moves: { date: string; quantity: number; value: number }[], method: CostingMethod = 'FIFO'): Layer[] {
  if (method === 'AVERAGE') {
    let q = 0, v = 0, date = ''
    for (const m of moves) { q += m.quantity; v += m.value; if (m.quantity > 0) date = m.date }
    return q > 1e-9 ? [{ date, qty: q, unitCost: v / q }] : []
  }
  const ls: Layer[] = []
  for (const m of moves) {
    if (m.quantity > 0) { ls.push({ date: m.date, qty: m.quantity, unitCost: m.value / m.quantity }); continue }
    let out = -m.quantity
    while (out > 1e-9) {
      const l = ls[0]
      if (!l) break
      const take = Math.min(l.qty, out)
      l.qty -= take; out -= take
      if (l.qty <= 1e-9) ls.shift()
    }
  }
  return ls
}

/** Cost (cents) of taking `qty` from the layers, oldest first; rounded per layer to whole cents. */
export function fifoCost(ls: Layer[], qty: number): number {
  let left = qty, cost = 0
  for (const l of ls) {
    if (left <= 1e-9) break
    const take = Math.min(l.qty, left)
    cost += Math.round(take * l.unitCost); left -= take
  }
  if (left > 1e-9) throw new DomainError(`Stok tidak cukup (kurang ${left})`)
  return cost
}

/** Cost (cents) of taking `qty` out. FIFO: whole cents per layer. AVERAGE: exact (fractions of a cent kept on the
 * stock move, as Accurate does); journals post Math.round of it. */
export function costOut(ls: Layer[], qty: number, method: CostingMethod): number {
  if (method === 'FIFO') return fifoCost(ls, qty)
  const l = ls[0]
  if (!l || l.qty < qty - 1e-9) throw new DomainError(`Stok tidak cukup (kurang ${qty - (l?.qty ?? 0)})`)
  return qty * l.unitCost
}

export async function costingMethod(tx: Tx): Promise<CostingMethod> {
  const [r] = await tx.execute(sql`SELECT costing_method FROM ledger_settings`)
  return (r?.costing_method as CostingMethod | undefined) ?? 'FIFO'
}

/** Accurate allows a method change only before any stock movement; history is never re-costed. */
export async function setCostingMethod(tx: Tx, method: CostingMethod) {
  const [m] = await tx.execute(sql`SELECT 1 FROM stock_moves LIMIT 1`)
  if (m) throw new DomainError('Metode persediaan tidak dapat diubah setelah ada transaksi persediaan')
  const r = await tx.execute(sql`UPDATE ledger_settings SET costing_method = ${method} RETURNING 1`)
  if (!r.length) throw new DomainError('ledger_settings not configured')
  await logActivity(tx, { action: 'UPDATE', entity: 'PRF', reference: `Metode persediaan ${method}` })
}

export async function loadMoves(tx: Tx, item: string, upTo: string) {
  return (await tx.execute(sql`SELECT to_char(date,'YYYY-MM-DD') AS date, quantity, value FROM stock_moves WHERE item_no = ${item} AND date <= ${upTo} AND doc_type <> 'IT' ORDER BY date, id`))
    .map(r => ({ date: r.date as string, quantity: Number(r.quantity), value: Number(r.value) }))
}

export async function addMove(tx: Tx, m: { item: string; date: string; docType: string; docNumber: string; description: string; quantity: number; value: number; warehouse?: string }) {
  await tx.execute(sql`INSERT INTO stock_moves (item_no, date, doc_type, doc_number, description, quantity, value, warehouse)
    VALUES (${m.item}, ${m.date}, ${m.docType}, ${m.docNumber}, ${m.description}, ${m.quantity}, ${m.value}, ${m.warehouse ?? 'Utama'})`)
}
